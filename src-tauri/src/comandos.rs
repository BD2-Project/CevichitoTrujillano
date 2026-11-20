use std::collections::{HashMap, HashSet};

use rsoup::transaction_manager::TransactionManager;
use rsoup::{QueryResult, Value};
use serde::{Deserialize, Serialize};

const SEGUNDOS_POR_SEGMENTO: f64 = 5.0;
const HOST_PREDETERMINADO: &str = "127.0.0.1";
const PUERTO_PREDETERMINADO: u16 = 55432;

#[derive(Debug, Serialize)]
pub struct FilaSegmento {
    pub segment_id: i32,
    pub song_id: i32,
    pub segment_index: i32,
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub audio_ref: String,
}

#[derive(Debug, Serialize)]
pub struct FilaCancion {
    pub song_id: i32,
    pub title: String,
    pub artist: String,
    pub audio_path: String,
    pub duration_seconds: f64,
    pub segment_count: i32,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub collection: Option<String>,
    pub license: Option<String>,
    pub segments: Option<Vec<FilaSegmento>>,
}

#[derive(Debug, Serialize)]
pub struct FilaCoincidencia {
    pub match_order: i32,
    pub song_id: i32,
    pub title: String,
    pub artist: String,
    pub query_start: f64,
    pub query_end: f64,
    pub source_start: f64,
    pub source_end: f64,
    pub score: f64,
    pub segment_count: i32,
    pub min_score: f64,
    pub max_score: f64,
    pub alignment_offset_seconds: f64,
    pub is_best_run: bool,
}

#[derive(Debug, Serialize)]
pub struct FilaAnalisis {
    pub analysis_id: String,
    pub filename: String,
    pub created_at: String,
    pub segment_seconds: f64,
    pub matches: Vec<FilaCoincidencia>,
}

#[derive(Debug, Serialize)]
pub struct FilaAnalisisResumen {
    pub analysis_id: String,
    pub filename: String,
    pub created_at: String,
    pub segment_seconds: f64,
    pub match_count: i32,
    pub song_count: i32,
    pub best_score: Option<f64>,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct ResultadoImportacion {
    pub canciones: i32,
    pub segmentos: i32,
    pub omitidas: i32,
    pub nombres: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfiguracionAnalisis {
    pub id_catalogo: String,
    pub k_vecinos: i32,
    pub notas: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenciaNueva {
    pub titulo: String,
    pub artista: String,
    pub anio: i32,
    pub genero: String,
    pub coleccion: String,
    pub duracion_segundos: f64,
    pub ruta_audio: String,
    pub licencia: Option<String>,
}

fn configuracion_conexion() -> (String, u16) {
    let host = std::env::var("SOUPDB_HOST").unwrap_or_else(|_| HOST_PREDETERMINADO.to_string());
    let puerto = std::env::var("SOUPDB_PORT")
        .ok()
        .and_then(|valor| valor.parse::<u16>().ok())
        .unwrap_or(PUERTO_PREDETERMINADO);
    (host, puerto)
}

async fn conectar() -> Result<TransactionManager, String> {
    let (host, puerto) = configuracion_conexion();
    TransactionManager::connect(&host, puerto)
        .await
        .map_err(|error| format!("No se pudo conectar con SoupDB en {host}:{puerto}: {error}"))
}

async fn filas(manager: &mut TransactionManager, sql: &str) -> Result<Vec<Vec<Value>>, String> {
    match manager.query(sql).await.map_err(|error| error.to_string())? {
        QueryResult::ResultSet(resultado) => Ok(resultado.rows),
        QueryResult::Affected(_) => Ok(Vec::new()),
    }
}

fn entero(valor: &Value) -> Result<i32, String> {
    match valor {
        Value::Int(numero) => Ok(*numero),
        Value::Float(numero) => Ok(*numero as i32),
        Value::Text(texto) => texto
            .parse::<i32>()
            .map_err(|_| format!("Se esperaba un entero y llegó {texto:?}")),
        Value::Null => Err("Se esperaba un entero y llegó NULL".to_string()),
        otro => Err(format!("Se esperaba un entero y llegó {otro:?}")),
    }
}

fn flotante(valor: &Value) -> Result<f64, String> {
    match valor {
        Value::Float(numero) => Ok(*numero),
        Value::Int(numero) => Ok(f64::from(*numero)),
        Value::Text(texto) => texto
            .parse::<f64>()
            .map_err(|_| format!("Se esperaba un número y llegó {texto:?}")),
        Value::Null => Err("Se esperaba un número y llegó NULL".to_string()),
        otro => Err(format!("Se esperaba un número y llegó {otro:?}")),
    }
}

fn texto(valor: &Value) -> Result<String, String> {
    match valor {
        Value::Text(texto) => Ok(texto.clone()),
        Value::Null => Ok(String::new()),
        Value::Int(numero) => Ok(numero.to_string()),
        Value::Float(numero) => Ok(numero.to_string()),
        otro => Err(format!("Se esperaba un texto y llegó {otro:?}")),
    }
}

fn booleano(valor: &Value) -> Result<bool, String> {
    match valor {
        Value::Bool(valor) => Ok(*valor),
        Value::Int(numero) => Ok(*numero != 0),
        Value::Null => Ok(false),
        otro => Err(format!("Se esperaba un booleano y llegó {otro:?}")),
    }
}

fn escapar_texto(valor: &str) -> String {
    format!("'{}'", valor.replace('\'', "''"))
}

fn literal_numero(valor: f64) -> String {
    let texto = format!("{valor:.6}");
    let recortado = texto.trim_end_matches('0').trim_end_matches('.').to_string();
    if recortado.contains('.') {
        recortado
    } else {
        format!("{recortado}.0")
    }
}

fn validar_texto(campo: &str, valor: &str) -> Result<(), String> {
    if valor.trim().is_empty() {
        return Err(format!("{campo} no puede estar vacío"));
    }
    Ok(())
}

fn validar_ruta_audio(ruta: &str) -> Result<(), String> {
    let ruta = ruta.trim();
    if ruta.trim().is_empty() {
        return Err("La ruta del audio no puede estar vacía".to_string());
    }
    if ruta.starts_with('/') || ruta.contains('\\') || ruta.contains('#') || ruta.contains(':') {
        return Err(
            "La ruta del audio debe ser relativa POSIX, sin '#' ni '\\' (p. ej. tracks/001.mp3)"
                .to_string(),
        );
    }
    if ruta.split('/').any(|parte| parte.is_empty() || parte == "." || parte == "..") {
        return Err("La ruta del audio debe ser canónica, sin componentes vacíos, '.' ni '..'".to_string());
    }
    Ok(())
}

fn validar_id(campo: &str, id: i32) -> Result<(), String> {
    if id <= 0 {
        return Err(format!("{campo} debe ser un entero positivo"));
    }
    Ok(())
}

fn segmento_audio_ref(ruta_audio: &str, indice: i32) -> String {
    format!("{ruta_audio}#segment={indice:06}")
}

fn mapear_cancion(
    fila: &[Value],
    segment_count: i32,
    segments: Option<Vec<FilaSegmento>>,
    referencia: Option<&ReferenciaNueva>,
) -> Result<FilaCancion, String> {
    Ok(FilaCancion {
        song_id: entero(&fila[0])?,
        title: texto(&fila[1])?,
        artist: texto(&fila[2])?,
        audio_path: texto(&fila[3])?,
        duration_seconds: flotante(&fila[4])?,
        segment_count,
        genre: referencia.map(|item| item.genero.clone()),
        year: referencia.map(|item| item.anio),
        collection: referencia.map(|item| item.coleccion.clone()),
        license: referencia.and_then(|item| item.licencia.clone()),
        segments,
    })
}

fn mapear_segmento(fila: &[Value]) -> Result<FilaSegmento, String> {
    Ok(FilaSegmento {
        segment_id: entero(&fila[0])?,
        song_id: entero(&fila[1])?,
        segment_index: entero(&fila[2])?,
        start_seconds: flotante(&fila[3])?,
        end_seconds: flotante(&fila[4])?,
        audio_ref: texto(&fila[5])?,
    })
}

/// Comprueba que el gestor responde antes de mostrar la interfaz nativa.
#[tauri::command]
pub async fn ping_soupdb() -> Result<String, String> {
    let mut manager = conectar().await?;
    manager
        .ping()
        .await
        .map_err(|error| format!("SoupDB no respondió al ping: {error}"))?;
    let (host, puerto) = configuracion_conexion();
    Ok(format!("SoupDB disponible en {host}:{puerto}"))
}

/// `SELECT` de canciones + conteo de segmentos, sin JOIN ni GROUP BY.
#[tauri::command]
pub async fn listar_catalogo() -> Result<Vec<FilaCancion>, String> {
    let mut manager = conectar().await?;
    let filas_canciones = filas(
        &mut manager,
        "SELECT song_id, title, artist, audio_path, duration_seconds FROM songs ORDER BY song_id",
    )
    .await?;
    let filas_segmentos = filas(&mut manager, "SELECT song_id FROM audio_segments").await?;

    let mut conteos: HashMap<i32, i32> = HashMap::new();
    for fila in filas_segmentos {
        let song_id = entero(&fila[0])?;
        *conteos.entry(song_id).or_insert(0) += 1;
    }

    filas_canciones
        .iter()
        .map(|fila| {
            let song_id = entero(&fila[0])?;
            mapear_cancion(fila, *conteos.get(&song_id).unwrap_or(&0), None, None)
        })
        .collect()
}

#[tauri::command]
pub async fn obtener_cancion(id_cancion: i32) -> Result<Option<FilaCancion>, String> {
    validar_id("song_id", id_cancion)?;
    let mut manager = conectar().await?;
    let filas_cancion = filas(
        &mut manager,
        &format!(
            "SELECT song_id, title, artist, audio_path, duration_seconds FROM songs WHERE song_id = {id_cancion}"
        ),
    )
    .await?;

    let Some(fila) = filas_cancion.first() else {
        return Ok(None);
    };

    let filas_segmentos = filas(
        &mut manager,
        &format!(
            "SELECT segment_id, song_id, segment_index, start_seconds, end_seconds, audio_ref \
             FROM audio_segments WHERE song_id = {id_cancion} ORDER BY segment_index"
        ),
    )
    .await?;

    let segmentos = filas_segmentos
        .iter()
        .map(|segmento| mapear_segmento(segmento))
        .collect::<Result<Vec<_>, _>>()?;

    let cancion = mapear_cancion(fila, segmentos.len() as i32, Some(segmentos), None)?;
    Ok(Some(cancion))
}

#[tauri::command]
pub async fn listar_analisis() -> Result<Vec<FilaAnalisisResumen>, String> {
    let mut manager = conectar().await?;
    let filas_analisis = filas(
        &mut manager,
        "SELECT analysis_id, filename, created_at, segment_seconds, match_count \
         FROM analyses ORDER BY created_at DESC, analysis_id DESC",
    )
    .await?;
    let filas_matches = filas(
        &mut manager,
        "SELECT analysis_id, song_id, score FROM analysis_matches",
    )
    .await?;

    let mut canciones: HashMap<String, HashSet<i32>> = HashMap::new();
    let mut mejores: HashMap<String, f64> = HashMap::new();
    for fila in filas_matches {
        let analysis_id = texto(&fila[0])?;
        let song_id = entero(&fila[1])?;
        let score = flotante(&fila[2])?;
        canciones.entry(analysis_id.clone()).or_default().insert(song_id);
        let mejor = mejores.entry(analysis_id).or_insert(score);
        if score > *mejor {
            *mejor = score;
        }
    }

    filas_analisis
        .iter()
        .map(|fila| {
            let analysis_id = texto(&fila[0])?;
            let match_count = entero(&fila[4])?;
            Ok(FilaAnalisisResumen {
                analysis_id: analysis_id.clone(),
                filename: texto(&fila[1])?,
                created_at: texto(&fila[2])?,
                segment_seconds: flotante(&fila[3])?,
                match_count,
                song_count: canciones.get(&analysis_id).map_or(0, |item| item.len() as i32),
                best_score: mejores.get(&analysis_id).copied(),
                status: if match_count > 0 {
                    "con-evidencia".to_string()
                } else {
                    "sin-evidencia".to_string()
                },
            })
        })
        .collect()
}

#[tauri::command]
pub async fn obtener_analisis(id_analisis: String) -> Result<Option<FilaAnalisis>, String> {
    if id_analisis.len() != 32
        || !id_analisis.bytes().all(|caracter| caracter.is_ascii_digit() || (b'a'..=b'f').contains(&caracter))
    {
        return Err("analysis_id debe contener exactamente 32 caracteres hexadecimales en minúscula".to_string());
    }
    let mut manager = conectar().await?;
    let clave = escapar_texto(&id_analisis);
    let filas_analisis = filas(
        &mut manager,
        &format!(
            "SELECT analysis_id, filename, created_at, segment_seconds FROM analyses WHERE analysis_id = {clave}"
        ),
    )
    .await?;

    let Some(fila) = filas_analisis.first() else {
        return Ok(None);
    };

    let filas_matches = filas(
        &mut manager,
        &format!(
            "SELECT match_order, song_id, query_start, query_end, source_start, source_end, score, \
             segment_count, min_score, max_score, alignment_offset_seconds, is_best_run \
             FROM analysis_matches WHERE analysis_id = {clave} ORDER BY match_order"
        ),
    )
    .await?;

    let filas_canciones = filas(
        &mut manager,
        "SELECT song_id, title, artist FROM songs ORDER BY song_id",
    )
    .await?;
    let mut nombres: HashMap<i32, (String, String)> = HashMap::new();
    for cancion in filas_canciones {
        nombres.insert(entero(&cancion[0])?, (texto(&cancion[1])?, texto(&cancion[2])?));
    }

    let mut matches = Vec::with_capacity(filas_matches.len());
    for match_fila in filas_matches {
        let song_id = entero(&match_fila[1])?;
        let (title, artist) = nombres
            .get(&song_id)
            .cloned()
            .unwrap_or_else(|| ("Canción desconocida".to_string(), "—".to_string()));
        matches.push(FilaCoincidencia {
            match_order: entero(&match_fila[0])?,
            song_id,
            title,
            artist,
            query_start: flotante(&match_fila[2])?,
            query_end: flotante(&match_fila[3])?,
            source_start: flotante(&match_fila[4])?,
            source_end: flotante(&match_fila[5])?,
            score: flotante(&match_fila[6])?,
            segment_count: entero(&match_fila[7])?,
            min_score: flotante(&match_fila[8])?,
            max_score: flotante(&match_fila[9])?,
            alignment_offset_seconds: flotante(&match_fila[10])?,
            is_best_run: booleano(&match_fila[11])?,
        });
    }

    Ok(Some(FilaAnalisis {
        analysis_id: texto(&fila[0])?,
        filename: texto(&fila[1])?,
        created_at: texto(&fila[2])?,
        segment_seconds: flotante(&fila[3])?,
        matches,
    }))
}

/// El servicio Python de SoupDB-Copyright ejecuta el pipeline MFCC/HNSW.
#[tauri::command]
pub async fn analizar_audio(
    nombre_archivo: String,
    bytes: Vec<u8>,
    configuracion: ConfiguracionAnalisis,
) -> Result<FilaAnalisis, String> {
    let _ = (nombre_archivo, bytes, configuracion);
    Err(
        "El comando analizar_audio todavía no está enlazado. El pipeline de MFCC, HNSW y \
         alineación de runs vive en el servicio Python de copyright de SoupDB; este shell Tauri \
         solo prepara el contrato de lectura/escritura del catálogo y del historial."
            .to_string(),
    )
}

async fn siguiente_id(manager: &mut TransactionManager, tabla: &str, columna: &str) -> Result<i32, String> {
    let filas_ids = filas(manager, &format!("SELECT {columna} FROM {tabla}")).await?;
    let mut maximo = 0;
    for fila in filas_ids {
        maximo = maximo.max(entero(&fila[0])?);
    }
    maximo.checked_add(1).ok_or_else(|| format!("No quedan identificadores INT disponibles en {tabla}.{columna}"))
}

/// Ingesta previa al índice con autocommit y limpieza de mejor esfuerzo.
#[tauri::command]
pub async fn agregar_referencia(referencia: ReferenciaNueva) -> Result<FilaCancion, String> {
    validar_texto("titulo", &referencia.titulo)?;
    validar_texto("artista", &referencia.artista)?;
    validar_ruta_audio(&referencia.ruta_audio)?;
    if !referencia.duracion_segundos.is_finite() || referencia.duracion_segundos <= 0.0 {
        return Err("La duración debe ser un número finito mayor que cero".to_string());
    }

    let mut manager = conectar().await?;
    let song_id = siguiente_id(&mut manager, "songs", "song_id").await?;
    let primer_segmento = siguiente_id(&mut manager, "audio_segments", "segment_id").await?;
    let cantidad_float = (referencia.duracion_segundos / SEGUNDOS_POR_SEGMENTO).ceil();
    if cantidad_float > f64::from(i32::MAX - primer_segmento) {
        return Err("La duración excede el espacio de identificadores de segmentos disponible".to_string());
    }

    let insertar_cancion = format!(
        "INSERT INTO songs VALUES ({song_id}, {}, {}, {}, {})",
        escapar_texto(referencia.titulo.trim()),
        escapar_texto(referencia.artista.trim()),
        escapar_texto(referencia.ruta_audio.trim()),
        literal_numero(referencia.duracion_segundos)
    );
    manager
        .query(&insertar_cancion)
        .await
        .map_err(|error| format!("No se pudo insertar la canción: {error}"))?;

    let cantidad = (referencia.duracion_segundos / SEGUNDOS_POR_SEGMENTO).ceil() as i32;
    let mut segmentos = Vec::with_capacity(cantidad as usize);
    for indice in 0..cantidad {
        let inicio = f64::from(indice) * SEGUNDOS_POR_SEGMENTO;
        let fin = (f64::from(indice + 1) * SEGUNDOS_POR_SEGMENTO).min(referencia.duracion_segundos);
        if fin <= inicio {
            continue;
        }
        let segment_id = primer_segmento + indice;
        let audio_ref = segmento_audio_ref(referencia.ruta_audio.trim(), indice);
        let insertar_segmento = format!(
            "INSERT INTO audio_segments VALUES ({segment_id}, {song_id}, {indice}, {}, {}, {})",
            literal_numero(inicio),
            literal_numero(fin),
            escapar_texto(&audio_ref)
        );
        if let Err(error) = manager.query(&insertar_segmento).await {
            let _ = manager
                .query(&format!("DELETE FROM audio_segments WHERE song_id = {song_id}"))
                .await;
            let _ = manager
                .query(&format!("DELETE FROM songs WHERE song_id = {song_id}"))
                .await;
            return Err(format!("No se pudo insertar el segmento {indice}: {error}"));
        }
        segmentos.push(FilaSegmento {
            segment_id,
            song_id,
            segment_index: indice,
            start_seconds: inicio,
            end_seconds: fin,
            audio_ref,
        });
    }

    Ok(FilaCancion {
        song_id,
        title: referencia.titulo.trim().to_string(),
        artist: referencia.artista.trim().to_string(),
        audio_path: referencia.ruta_audio.trim().to_string(),
        duration_seconds: referencia.duracion_segundos,
        segment_count: segmentos.len() as i32,
        genre: Some(referencia.genero),
        year: Some(referencia.anio),
        collection: Some(referencia.coleccion),
        license: referencia.licencia,
        segments: Some(segmentos),
    })
}

#[tauri::command]
pub async fn importar_dataset(referencias: Vec<ReferenciaNueva>) -> Result<ResultadoImportacion, String> {
    let mut manager = conectar().await?;
    let existentes_filas = filas(&mut manager, "SELECT title, artist FROM songs").await?;
    let mut existentes: HashSet<String> = HashSet::new();
    for fila in existentes_filas {
        existentes.insert(format!(
            "{}|{}",
            texto(&fila[0])?.trim().to_lowercase(),
            texto(&fila[1])?.trim().to_lowercase()
        ));
    }

    let mut siguiente_cancion = siguiente_id(&mut manager, "songs", "song_id").await?;
    let mut siguiente_segmento = siguiente_id(&mut manager, "audio_segments", "segment_id").await?;
    let mut nombres = Vec::new();
    let mut segmentos_insertados = 0;
    let mut omitidas = 0;

    for referencia in referencias {
        let clave = format!(
            "{}|{}",
            referencia.titulo.trim().to_lowercase(),
            referencia.artista.trim().to_lowercase()
        );
        if referencia.titulo.trim().is_empty()
            || referencia.artista.trim().is_empty()
            || existentes.contains(&clave)
            || validar_ruta_audio(&referencia.ruta_audio).is_err()
            || !referencia.duracion_segundos.is_finite()
            || referencia.duracion_segundos <= 0.0
            || siguiente_cancion == i32::MAX
            || (referencia.duracion_segundos / SEGUNDOS_POR_SEGMENTO).ceil()
                > f64::from(i32::MAX - siguiente_segmento)
        {
            omitidas += 1;
            continue;
        }

        let song_id = siguiente_cancion;
        siguiente_cancion += 1;
        let insertar_cancion = format!(
            "INSERT INTO songs VALUES ({song_id}, {}, {}, {}, {})",
            escapar_texto(referencia.titulo.trim()),
            escapar_texto(referencia.artista.trim()),
            escapar_texto(referencia.ruta_audio.trim()),
            literal_numero(referencia.duracion_segundos)
        );
        if manager.query(&insertar_cancion).await.is_err() {
            omitidas += 1;
            continue;
        }

        let cantidad = (referencia.duracion_segundos / SEGUNDOS_POR_SEGMENTO).ceil() as i32;
        let mut segmentos_cancion = 0;
        let mut completo = true;
        for indice in 0..cantidad {
            let inicio = f64::from(indice) * SEGUNDOS_POR_SEGMENTO;
            let fin = (f64::from(indice + 1) * SEGUNDOS_POR_SEGMENTO)
                .min(referencia.duracion_segundos);
            if fin <= inicio {
                continue;
            }
            let segment_id = siguiente_segmento;
            let audio_ref = segmento_audio_ref(referencia.ruta_audio.trim(), indice);
            let insertar_segmento = format!(
                "INSERT INTO audio_segments VALUES ({segment_id}, {song_id}, {indice}, {}, {}, {})",
                literal_numero(inicio),
                literal_numero(fin),
                escapar_texto(&audio_ref)
            );
            if manager.query(&insertar_segmento).await.is_err() {
                completo = false;
                break;
            }
            siguiente_segmento += 1;
            segmentos_cancion += 1;
        }

        if completo {
            segmentos_insertados += segmentos_cancion;
            existentes.insert(clave);
            nombres.push(referencia.titulo.trim().to_string());
        } else {
            let _ = manager
                .query(&format!("DELETE FROM audio_segments WHERE song_id = {song_id}"))
                .await;
            let _ = manager
                .query(&format!("DELETE FROM songs WHERE song_id = {song_id}"))
                .await;
            omitidas += 1;
        }
    }

    Ok(ResultadoImportacion {
        canciones: nombres.len() as i32,
        segmentos: segmentos_insertados,
        omitidas,
        nombres,
    })
}

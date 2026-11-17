-- ============================================================================
-- AudioTrace · Esquema de persistencia sobre SoupDB
-- ----------------------------------------------------------------------------
-- Fuente de verdad: applications/copyright_detection/catalog.py e history.py
-- del repositorio SoupDB. Las cuatro tablas son tablas de aplicación creadas
-- con SQL de SoupDB y viven en la misma base que el catálogo.
--
-- Reglas del motor que condicionan este archivo:
--   * No existen UNIQUE, FOREIGN KEY, IF NOT EXISTS ni UPDATE ejecutable.
--   * PRIMARY KEY no impide duplicados; las invariantes se validan en la capa
--     de aplicación antes de cada INSERT.
--   * Los índices se declaran con TYPE BTREE (índice B+).
--   * Los literales de texto se escriben entre comillas simples; los float
--     siempre llevan punto decimal (el lexer no admite exponentes).
--
-- Orden de creación: primero songs y audio_segments (catálogo), después
-- analyses y analysis_matches (historial). El servicio Python es idempotente:
-- comprueba el esquema existente y solo crea lo que falta.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. songs · obras originales del catálogo de referencia
-- ----------------------------------------------------------------------------
CREATE TABLE songs (
    song_id INT,
    title TEXT,
    artist TEXT,
    audio_path TEXT,
    duration_seconds FLOAT
);

-- Búsqueda por identificador de canción.
CREATE INDEX songs_song_id ON songs (song_id) TYPE BTREE;


-- ----------------------------------------------------------------------------
-- 2. audio_segments · ventanas indexables de cada obra
-- ----------------------------------------------------------------------------
-- audio_ref sigue la convención del pipeline multimedia:
--   <audio_path>#segment=NNNNNN
-- donde NNNNNN es segment_index con seis dígitos.
CREATE TABLE audio_segments (
    segment_id INT,
    song_id INT,
    segment_index INT,
    start_seconds FLOAT,
    end_seconds FLOAT,
    audio_ref TEXT
);

-- Acceso directo al segmento y listado de todos los segmentos de una obra.
CREATE INDEX audio_segments_segment_id ON audio_segments (segment_id) TYPE BTREE;
CREATE INDEX audio_segments_song_id ON audio_segments (song_id) TYPE BTREE;


-- ----------------------------------------------------------------------------
-- 3. analyses · cabecera de cada análisis ejecutado
-- ----------------------------------------------------------------------------
-- analysis_id es uuid4().hex: 32 caracteres hexadecimales sin guiones.
-- created_at es ISO 8601 UTC de ancho fijo:
--   %Y-%m-%dT%H:%M:%S.%fZ
-- match_count debe coincidir con el número de filas de analysis_matches.
-- El audio subido NO se persiste: solo el resultado y sus metadatos.
CREATE TABLE analyses (
    analysis_id TEXT,
    filename TEXT,
    created_at TEXT,
    segment_seconds FLOAT,
    match_count INT
);

CREATE INDEX analyses_analysis_id ON analyses (analysis_id) TYPE BTREE;


-- ----------------------------------------------------------------------------
-- 4. analysis_matches · runs de evidencia de cada análisis
-- ----------------------------------------------------------------------------
-- Una fila por run alineado. match_order conserva el orden del resultado
-- (0..n-1). score, min_score y max_score son similitud acústica en [0, 1],
-- no probabilidad ni dictamen. alignment_offset_seconds = source_start -
-- query_start. is_best_run marca el run con más evidencia temporal de la obra.
-- title y artist no se duplican: se leen de songs al reconstruir el análisis.
CREATE TABLE analysis_matches (
    analysis_id TEXT,
    match_order INT,
    song_id INT,
    query_start FLOAT,
    query_end FLOAT,
    source_start FLOAT,
    source_end FLOAT,
    score FLOAT,
    segment_count INT,
    min_score FLOAT,
    max_score FLOAT,
    alignment_offset_seconds FLOAT,
    is_best_run BOOL
);

-- Todas las runs de un análisis, en orden de presentación.
CREATE INDEX analysis_matches_analysis_id ON analysis_matches (analysis_id) TYPE BTREE;


-- ----------------------------------------------------------------------------
-- 5. Índice vectorial HNSW (opcional, lo crea el servicio Python)
-- ----------------------------------------------------------------------------
-- No forma parte del bootstrap relacional. Se crea después de ingestar el
-- catálogo y entrenar el codebook K=128. Requiere abrir el Catalog con el
-- OnDiskVectorFactory y el perfil 'copyright-audio-v1'. Con el índice creado,
-- SoupDB bloquea INSERT/DELETE en audio_segments fuera de una sesión
-- transaccional con deshacer reversible, por lo que la ingesta debe completarse
-- antes de indexar.
--
-- CREATE INDEX copyright_audio_hnsw ON audio_segments (audio_ref)
--     USING HNSW
--     WITH METRIC=euclidean, DIMENSION=128, PROFILE='copyright-audio-v1';


-- ============================================================================
-- Invariantes que la aplicación valida antes de escribir (SoupDB no las impone)
-- ----------------------------------------------------------------------------
-- songs:
--   * song_id entero > 0 y único.
--   * title, artist y audio_path no vacíos.
--   * audio_path relativo, estilo POSIX, sin '\' ni '#'.
--   * duration_seconds finito y > 0.
--
-- audio_segments:
--   * segment_id entero > 0 y único.
--   * song_id debe existir en songs.
--   * segment_index entero >= 0 y único dentro de song_id.
--   * 0 <= start_seconds < end_seconds.
--   * audio_ref == '<audio_path>#segment=' + segment_index con seis dígitos.
--
-- analyses:
--   * analysis_id cumple ^[0-9a-f]{32}$ y es único.
--   * filename no vacío; segment_seconds > 0; match_count >= 0.
--   * match_count coincide con las filas de analysis_matches.
--
-- analysis_matches:
--   * analysis_id debe existir en analyses.
--   * song_id debe existir en songs.
--   * match_order es 0..match_count-1 sin huecos.
--   * 0 <= score, min_score, max_score <= 1.
--   * query_end > query_start; source_end > source_start; segment_count > 0.
--
-- Escritura del historial:
--   * Primero se insertan las runs y al final la cabecera de analyses, que
--     actúa como marca de commit. Las lecturas solo ven análisis con cabecera.
-- ============================================================================

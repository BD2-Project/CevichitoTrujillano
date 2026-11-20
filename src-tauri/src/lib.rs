mod comandos;

use comandos::{
    agregar_referencia, analizar_audio, importar_dataset, listar_analisis, listar_catalogo,
    obtener_analisis, obtener_cancion, ping_soupdb,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ping_soupdb,
            listar_catalogo,
            obtener_cancion,
            listar_analisis,
            obtener_analisis,
            analizar_audio,
            agregar_referencia,
            importar_dataset
        ])
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar CevichitoTrujillano");
}

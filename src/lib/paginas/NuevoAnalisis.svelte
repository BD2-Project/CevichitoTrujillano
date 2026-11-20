<script lang="ts">
  import EncabezadoPagina from '../componentes/ui/EncabezadoPagina.svelte';
  import Insignia from '../componentes/ui/Insignia.svelte';
  import ZonaCarga from './nuevo/ZonaCarga.svelte';
  import { app } from '../estado/aplicacion.svelte';
  import { enlace } from '../navegacion/enrutador.svelte';
  import { formatearNumero } from '../utilidades/formato';

  let cargandoMetadatos = $state(false);
  async function seleccionarArchivo(archivo: File) {
    if (cargandoMetadatos || app.trabajoActivo) return;
    cargandoMetadatos = true;
    try {
      await app.seleccionarArchivo(archivo);
    } catch (error) {
      app.notificar('peligro', 'No se pudo leer el audio', error instanceof Error ? error.message : 'Vuelve a seleccionar el archivo.');
    } finally {
      cargandoMetadatos = false;
    }
  }
</script>

<div class="space-y-6">
  <EncabezadoPagina
    etiqueta="Procesamiento espectral"
    titulo="Encuentra coincidencias en tu audio"
    descripcion="Compara una muestra con el catálogo de referencia y explora las similitudes acústicas."
  />
  <section class="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="referencias-acusticas-titulo">
    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined rounded-xl bg-primary/10 p-3 text-[28px] text-primary" aria-hidden="true">library_music</span>
      <div>
        <h2 id="referencias-acusticas-titulo" class="text-headline-md font-semibold">Referencias acústicas</h2>
        <p class="mt-1 font-code text-code-sm text-on-surface-variant">{formatearNumero(app.catalogo.length)} canciones · {formatearNumero(app.totalSegmentosCatalogo)} segmentos</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      {#if app.estadoConexion.etiqueta}
        <Insignia tono={app.estadoConexion.conectado ? 'exito' : 'advertencia'} punto>{app.estadoConexion.etiqueta}</Insignia>
      {/if}
      <a class="enlace-foco rounded-lg bg-surface-container-low px-3 py-2 text-label-md font-medium text-primary" href={enlace('catalogo')}>Explorar catálogo →</a>
    </div>
  </section>
  {#if app.trabajoActivo}
    <div class="rounded-xl border border-primary/25 bg-primary/5 p-4 text-body-md" role="status">Ya hay un análisis en curso. <a class="font-semibold text-primary underline" href={enlace('progreso')}>Volver al seguimiento</a></div>
  {/if}
  <ZonaCarga {cargandoMetadatos} onSeleccionar={seleccionarArchivo} />
  <div class="flex gap-3 rounded-xl bg-surface-container-low p-4 text-body-sm leading-relaxed text-on-surface-variant">
    <span class="material-symbols-outlined text-secondary" aria-hidden="true">info</span>
    <p>El análisis compara segmentos de audio de hasta 5 segundos. La puntuación de cada coincidencia resume la similitud de los segmentos alineados en una escala de 0 a 1. Cuanto más cerca de 1, mayor es la similitud. El resultado no determina una infracción.</p>
  </div>
</div>

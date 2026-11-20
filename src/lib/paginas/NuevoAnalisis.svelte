<script lang="ts">
  import EncabezadoPagina from '../componentes/ui/EncabezadoPagina.svelte';
  import Insignia from '../componentes/ui/Insignia.svelte';
  import ZonaCarga from './nuevo/ZonaCarga.svelte';
  import PanelConfiguracion from './nuevo/PanelConfiguracion.svelte';
  import ComoFunciona from './nuevo/ComoFunciona.svelte';
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
    etiqueta="Procesamiento espectral no destructivo"
    titulo="Encuentra coincidencias en tu audio"
    descripcion="Compara una muestra contra el catálogo de referencia. Explora similitudes acústicas y tramos alineados como evidencia técnica para revisión humana."
  />
  <section class="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Catálogo de referencia objetivo">
    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined rounded-xl bg-primary/10 p-3 text-[28px] text-primary" aria-hidden="true">library_music</span>
      <div><p class="etiqueta-micro text-on-surface-variant">Catálogo de referencia objetivo</p><h2 class="mt-1 text-headline-md font-semibold">Referencias acústicas de SoupDB</h2><p class="mt-1 font-code text-code-sm text-on-surface-variant">{formatearNumero(app.catalogo.length)} canciones · {formatearNumero(app.totalSegmentosCatalogo)} segmentos</p></div>
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
  <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
    <div class="space-y-5">
      <ZonaCarga {cargandoMetadatos} onSeleccionar={seleccionarArchivo} />
      <div class="flex gap-3 rounded-xl bg-surface-container-low p-4 text-body-sm leading-relaxed text-on-surface-variant"><span class="material-symbols-outlined text-secondary" aria-hidden="true">info</span><p>El resultado expresa similitud acústica en [0, 1]. No determina infracción ni aplica un umbral legal. {app.estadoConexion.modo === 'demo' ? 'Los audios de demostración no incluyen grabaciones del catálogo.' : 'Las referencias de audio se sirven desde el catálogo de SoupDB.'}</p></div>
    </div>
    <PanelConfiguracion {cargandoMetadatos} />
  </div>
  <ComoFunciona />
</div>

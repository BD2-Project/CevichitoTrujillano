<script lang="ts">
  import type { EstadoAnalisis, ResultadoAnalisis } from '../../datos/tipos';
  import { app } from '../../estado/aplicacion.svelte';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import { exportarCsvResultado } from '../../servicios/exportacion';
  import {
    etiquetaEstado,
    formatearDuracion,
    formatearFecha,
    tonoEstado
  } from '../../utilidades/formato';
  import Boton from '../../componentes/ui/Boton.svelte';
  import Insignia from '../../componentes/ui/Insignia.svelte';

  let { resultado }: { resultado: ResultadoAnalisis } = $props();

  const estado: EstadoAnalisis = $derived(
    resultado.coincidencias.length > 0 ? 'con-evidencia' : 'sin-evidencia'
  );
  const duracion = $derived(resultado.metadatos?.duracionSegundos ?? null);

  function reanalizar() {
    app.prepararReanalisis(resultado);
  }

  function exportarCsv() {
    exportarCsvResultado(resultado);
    app.notificar(
      'exito',
      'CSV generado',
      `${resultado.coincidencias.length} coincidencias exportadas como datos tabulares.`
    );
  }

</script>

<section
  class="animate-entrada relative overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-panel sm:p-5"
  aria-labelledby="titulo-expediente"
>
  <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-container to-tertiary" aria-hidden="true"></div>

  <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
    <div class="min-w-0 flex-1 space-y-2.5">
      <div class="flex items-center gap-2 text-primary">
        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1;" aria-hidden="true">graphic_eq</span>
        <span class="text-label-sm font-semibold uppercase tracking-[0.08em]">Expediente de similitud acústica</span>
      </div>

      <h1 id="titulo-expediente" class="texto-equilibrado break-words text-headline-lg-mobile font-semibold tracking-tight text-on-surface sm:text-headline-lg">
        {resultado.nombreArchivo}
      </h1>

      <div class="flex flex-wrap items-center gap-1.5">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-code text-code-sm font-medium text-primary">
          <span class="material-symbols-outlined text-[15px]" aria-hidden="true">audio_file</span>
          {resultado.nombreArchivo}
        </span>

        <span class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container-low px-2.5 py-1 font-code text-code-sm text-on-surface-variant">
          <span class="material-symbols-outlined text-[15px]" aria-hidden="true">timer</span>
          {#if duracion !== null}
            {formatearDuracion(duracion)}
          {:else}
            Duración no disponible
          {/if}
        </span>

        <span class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container-low px-2.5 py-1 font-code text-code-sm text-on-surface-variant">
          <span class="material-symbols-outlined text-[15px]" aria-hidden="true">calendar_today</span>
          {formatearFecha(resultado.creadoEn)}
        </span>

        <Insignia tono={tonoEstado(estado)} icono={estado === 'con-evidencia' ? 'verified' : 'search_off'} punto>
          {etiquetaEstado(estado)}
        </Insignia>
      </div>

    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2 xl:max-w-xs xl:justify-end">
      <Boton variante="terciario" icono="replay" onclick={reanalizar}>Reanalizar</Boton>
      <a
        href={enlace('resultados', { id: resultado.idAnalisis }, { modal: 'exportar' })}
        class="enlace-foco rounded-lg"
        title="Abrir las opciones de exportación del reporte"
      >
        <Boton variante="primario" icono="ios_share">Exportar reporte</Boton>
      </a>
      <Boton variante="secundario" icono="table_view" onclick={exportarCsv}>Exportar CSV</Boton>
    </div>
  </div>
</section>

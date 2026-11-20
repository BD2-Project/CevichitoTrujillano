<script lang="ts">
  import BarraSimilitud from '../../componentes/ui/BarraSimilitud.svelte';
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import { app } from '../../estado/aplicacion.svelte';
  import type { ResumenAnalisis } from '../../datos/tipos';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import {
    abreviarId,
    copiarTexto,
    etiquetaEstado,
    formatearFecha,
    formatearRelativo,
    formatearSimilitud,
    tonoEstado
  } from '../../utilidades/formato';
  import AccionesAnalisis from './AccionesAnalisis.svelte';
  import {
    detalleTecnico,
    iconoEstado,
    metadatosArchivo,
    textoCanciones,
    textoCoincidencias
  } from './presentacion';

  let { item }: { item: ResumenAnalisis } = $props();

  const idAbreviado = $derived(abreviarId(item.idAnalisis, 8));
  const detalle = $derived(detalleTecnico(item));
  const totalCatalogo = $derived(app.catalogo.length);

  async function copiarId() {
    const copiado = await copiarTexto(item.idAnalisis);
    app.notificar(
      copiado ? 'exito' : 'advertencia',
      copiado ? 'ID copiado' : 'No se pudo copiar el ID',
      copiado ? item.idAnalisis : 'El navegador bloqueó el acceso al portapapeles.'
    );
  }
</script>

<article class="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-panel">
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <div class="flex items-center gap-1.5">
        <a
          href={enlace('resultados', { id: item.idAnalisis })}
          class="enlace-foco rounded font-code text-code-timecode font-semibold text-primary hover:underline"
          title={`Abrir el análisis ${item.idAnalisis}`}
        >
          #{idAbreviado}
        </a>
        <button
          type="button"
          class="enlace-foco flex h-6 w-6 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          title="Copiar el ID completo"
          aria-label={`Copiar el ID del análisis ${idAbreviado}`}
          onclick={copiarId}
        >
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">content_copy</span>
        </button>
      </div>
      <p class="mt-0.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
        <span class="material-symbols-outlined text-[13px]" aria-hidden="true">schedule</span>
        {formatearRelativo(item.creadoEn)}
      </p>
      <p class="font-code text-[10px] text-on-surface-variant/80">
        {formatearFecha(item.creadoEn, true)}
      </p>
    </div>
    <Insignia tono={tonoEstado(item.estado)} icono={iconoEstado(item.estado)}>
      {etiquetaEstado(item.estado)}
    </Insignia>
  </div>

  <div class="mt-3 flex items-start gap-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low p-2.5">
    <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-fixed/40 text-primary">
      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">audio_file</span>
    </div>
    <div class="min-w-0">
      <p class="truncate text-label-md font-semibold text-on-surface" title={item.nombreArchivo}>
        {item.nombreArchivo}
      </p>
      <p class="font-code text-code-sm text-on-surface-variant">{metadatosArchivo(item)}</p>
      {#if detalle}
        <p class="text-label-sm text-on-surface-variant/80">{detalle}</p>
      {/if}
    </div>
  </div>

  <div class="mt-3 grid grid-cols-2 gap-2">
    <div class="rounded-lg border border-outline-variant/40 px-2.5 py-2">
      <p class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Canciones</p>
      <p class="mt-0.5 text-label-md font-semibold text-on-surface">{textoCanciones(item.cantidadCanciones)}</p>
      <p class="font-code text-[10px] text-tertiary">
        {totalCatalogo > 0 ? `${totalCatalogo} en el catálogo` : 'Catálogo no cargado'}
      </p>
    </div>
    <div class="rounded-lg border border-outline-variant/40 px-2.5 py-2">
      <p class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Coincidencias</p>
      <p class="mt-0.5 text-label-md font-semibold text-on-surface">{textoCoincidencias(item.cantidadCoincidencias)}</p>
    </div>
  </div>

  <div class="mt-3 space-y-1">
    <div class="flex items-center justify-between gap-2">
      <span class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">
        Mejor similitud
      </span>
      <span class="font-code text-code-sm font-semibold tabular text-on-surface">
        {formatearSimilitud(item.mejorSimilitud)}
      </span>
    </div>
    {#if item.mejorSimilitud !== null}
      <BarraSimilitud valor={item.mejorSimilitud} mostrarValor={false} />
    {:else}
      <p class="text-body-sm text-on-surface-variant">Sin coincidencias candidatas registradas.</p>
    {/if}
  </div>

  {#if item.nota}
    <p class="recorte-2 mt-2 text-body-sm text-on-surface-variant" title={item.nota}>{item.nota}</p>
  {/if}

  <div class="mt-3 border-t border-outline-variant/40 pt-3">
    <AccionesAnalisis {item} variante="tarjeta" />
  </div>
</article>

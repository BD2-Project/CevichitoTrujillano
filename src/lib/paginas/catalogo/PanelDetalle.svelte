<script lang="ts">
  import type { CancionCatalogo, DetalleCancion } from '../../datos/tipos';
  import Boton from '../../componentes/ui/Boton.svelte';
  import EstadoVacio from '../../componentes/ui/EstadoVacio.svelte';
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import Reproductor from '../../componentes/audio/Reproductor.svelte';
  import MiniEspectro from './MiniEspectro.svelte';
  import { picosSimulados } from '../../utilidades/audio';
  import { formatearCodigoTiempo, formatearDuracion, formatearNumero } from '../../utilidades/formato';

  let {
    cancion,
    detalle,
    cargando,
    error,
    onCerrar,
    onReintentar,
    onSolicitarAudio
  }: {
    cancion: CancionCatalogo;
    detalle: DetalleCancion | null;
    cargando: boolean;
    error: string | null;
    onCerrar: () => void;
    onReintentar: () => void;
    onSolicitarAudio: () => void;
  } = $props();

  const origen = $derived(cancion.origen ?? 'demo');
  const urlAudio = $derived(cancion.origen === 'persistido' || (cancion.origen === 'local' && /^https?:\/\//i.test(cancion.urlAudio)) ? cancion.urlAudio || null : null);
  const picos = $derived(picosSimulados(`${cancion.titulo}${cancion.idCancion}`, 140));
  const regiones = $derived(
    (detalle?.segmentos ?? []).map((segmento, indice) => ({
      inicio: segmento.inicioSegundos,
      fin: segmento.finSegundos,
      color: indice % 2 === 0 ? 'rgba(12, 166, 202, 0.16)' : 'rgba(75, 92, 146, 0.14)',
      borde: indice % 2 === 0 ? '#0ca6ca' : '#4b5c92'
    }))
  );
</script>

<aside
  class="animate-entrada flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-panel"
  aria-labelledby="detalle-referencia-titulo"
>
  <div class="flex items-start justify-between gap-2">
    <div class="flex min-w-0 items-start gap-2.5">
      <MiniEspectro semilla={`${cancion.titulo}${cancion.idCancion}`} clase="h-11 w-11" />
      <div class="min-w-0">
        <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-primary">
          Referencia #{cancion.idCancion}
        </p>
        <h2 id="detalle-referencia-titulo" class="texto-equilibrado break-words text-headline-sm font-semibold text-on-surface">
          {cancion.titulo}
        </h2>
        <p class="truncate text-body-sm text-on-surface-variant">{cancion.artista}</p>
      </div>
    </div>
    <button
      type="button"
      class="enlace-foco flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      title="Cerrar detalle"
      aria-label="Cerrar el detalle de la referencia"
      onclick={onCerrar}
    >
      <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
    </button>
  </div>

  <div class="flex flex-wrap items-center gap-1.5">
    <Insignia tono={origen === 'persistido' ? 'info' : origen === 'local' ? 'primario' : 'terciario'} icono={origen === 'demo' ? 'science' : 'database'}>
      {origen === 'persistido' ? 'SoupDB' : origen}
    </Insignia>
    <span class="inline-flex items-center gap-1 rounded-full border border-outline-variant/50 bg-surface-container-low px-2 py-0.5 text-label-sm text-on-surface-variant">
      <span class="material-symbols-outlined text-[13px] text-secondary" aria-hidden="true">folder_special</span>
      {cancion.coleccion}
    </span>
  </div>

  <dl class="grid grid-cols-2 gap-2 text-body-sm">
    <div class="rounded-lg border border-outline-variant/40 bg-surface-container-low/60 px-2 py-1.5">
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Duración</dt>
      <dd class="font-code text-code-sm tabular text-on-surface">{formatearDuracion(cancion.duracionSegundos)}</dd>
    </div>
    <div class="rounded-lg border border-outline-variant/40 bg-surface-container-low/60 px-2 py-1.5">
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Segmentos</dt>
      <dd class="font-code text-code-sm tabular text-on-surface">{formatearNumero(cancion.cantidadSegmentos)} × 5 s</dd>
    </div>
    <div class="rounded-lg border border-outline-variant/40 bg-surface-container-low/60 px-2 py-1.5">
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Género</dt>
      <dd class="truncate text-on-surface" title={cancion.genero}>{cancion.genero}</dd>
    </div>
    <div class="rounded-lg border border-outline-variant/40 bg-surface-container-low/60 px-2 py-1.5">
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Año</dt>
      <dd class="font-code text-code-sm tabular text-on-surface">{cancion.anio > 0 ? cancion.anio : 'No declarado'}</dd>
    </div>
    <div class="col-span-2 rounded-lg border border-outline-variant/40 bg-surface-container-low/60 px-2 py-1.5">
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Licencia</dt>
      <dd class="text-on-surface">{cancion.licencia ?? 'Sin licencia declarada'}</dd>
    </div>
  </dl>

  {#if cargando}
    <div class="space-y-2" aria-live="polite">
      <p class="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
        <span class="material-symbols-outlined animate-spin text-[16px]" aria-hidden="true">progress_activity</span>
        Cargando segmentos de la referencia…
      </p>
      <div class="h-24 animate-pulse rounded-lg bg-surface-container"></div>
      <div class="h-8 animate-pulse rounded-lg bg-surface-container"></div>
      <div class="h-8 animate-pulse rounded-lg bg-surface-container"></div>
    </div>
  {:else if error}
    <EstadoVacio compacto icono="error" titulo="No se pudo abrir la referencia" descripcion={error}>
      <Boton tamanio="sm" variante="secundario" icono="refresh" onclick={onReintentar}>Reintentar</Boton>
    </EstadoVacio>
  {:else if detalle}
    <div class="space-y-1.5">
      <Reproductor
        {urlAudio}
        titulo={cancion.titulo}
        picos={picos}
        duracionSegundos={cancion.duracionSegundos}
        {regiones}
        variante="claro"
        onSolicitarAudio={onSolicitarAudio}
      />
      <p class="flex items-start gap-1.5 rounded-lg bg-surface-container-low px-2 py-1.5 text-body-sm text-on-surface-variant">
        <span class="material-symbols-outlined text-[15px] text-on-surface-variant" aria-hidden="true">info</span>
        <span>
          {urlAudio ? 'Audio de la referencia disponible para reproducción. La forma de onda es decorativa y no representa un espectro medido.' : 'Sin archivo de audio accesible: la forma de onda es una previsualización esquemática de la referencia.'}
        </span>
      </p>
    </div>

    <div class="flex items-center justify-between gap-2 border-t border-outline-variant/50 pt-2">
      <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Segmentos del índice</p>
      <span class="font-code text-code-sm text-on-surface-variant">{formatearNumero(detalle.segmentos.length)} ventanas</span>
    </div>

    {#if detalle.segmentos.length > 0}
      <ol class="max-h-64 divide-y divide-outline-variant/40 overflow-y-auto rounded-lg border border-outline-variant/50">
        {#each detalle.segmentos as segmento (segmento.idSegmento)}
          <li class="bg-surface-container-lowest px-2.5 py-2 hover:bg-surface-container-low/60">
            <div class="flex items-center justify-between gap-2">
              <span class="rounded bg-surface-container px-1.5 py-0.5 font-code text-code-sm font-semibold text-primary">
                S{String(segmento.indiceSegmento + 1).padStart(2, '0')}
              </span>
              <span class="font-code text-[11px] tabular text-on-surface">
                {formatearCodigoTiempo(segmento.inicioSegundos)} – {formatearCodigoTiempo(segmento.finSegundos)}
              </span>
            </div>
            <p class="mt-1 truncate font-code text-[11px] text-on-surface-variant" title={segmento.referenciaAudio}>
              {segmento.referenciaAudio}
            </p>
          </li>
        {/each}
      </ol>
      <p class="text-body-sm text-on-surface-variant">
        <span class="font-code text-[11px]">audio_ref</span> es la referencia interna del segmento en
        <span class="font-code text-[11px]">audio_segments</span>; no enlaza una URL reproducible.
      </p>
    {:else}
      <EstadoVacio compacto icono="segment" titulo="Sin segmentos registrados" descripcion="La referencia no declara segmentos en el catálogo." />
    {/if}
  {/if}
</aside>

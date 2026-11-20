<script lang="ts">
  import type { CancionCatalogo, DetalleCancion } from '../../datos/tipos';
  import Boton from '../../componentes/ui/Boton.svelte';
  import EstadoVacio from '../../componentes/ui/EstadoVacio.svelte';
  import Reproductor from '../../componentes/audio/Reproductor.svelte';
  import MiniEspectro from './MiniEspectro.svelte';
  import { picosSimulados } from '../../utilidades/audio';
  import { formatearDuracion, formatearNumero } from '../../utilidades/formato';

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
        Cargando referencia…
      </p>
      <div class="h-24 animate-pulse rounded-lg bg-surface-container"></div>
    </div>
  {:else if error}
    <EstadoVacio compacto icono="error" titulo="No se pudo abrir la referencia" descripcion={error}>
      <Boton tamanio="sm" variante="secundario" icono="refresh" onclick={onReintentar}>Reintentar</Boton>
    </EstadoVacio>
  {:else if detalle}
    <Reproductor
      {urlAudio}
      titulo={cancion.titulo}
      picos={picos}
      duracionSegundos={cancion.duracionSegundos}
      {regiones}
      variante="claro"
      mostrarEncabezado={false}
      onSolicitarAudio={onSolicitarAudio}
    />
  {/if}
</aside>

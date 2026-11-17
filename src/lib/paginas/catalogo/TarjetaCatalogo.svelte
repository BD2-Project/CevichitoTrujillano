<script lang="ts">
  import type { CancionCatalogo } from '../../datos/tipos';
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import MiniEspectro from './MiniEspectro.svelte';
  import { formatearDuracion, formatearNumero } from '../../utilidades/formato';

  let {
    cancion,
    seleccionada = false,
    onSeleccionar
  }: {
    cancion: CancionCatalogo;
    seleccionada?: boolean;
    onSeleccionar: (cancion: CancionCatalogo) => void;
  } = $props();

  const origen = $derived(cancion.origen ?? 'demo');
</script>

<button
  type="button"
  class={[
    'enlace-foco group flex h-full w-full flex-col gap-3 rounded-xl border p-3 text-left shadow-panel transition-all',
    seleccionada
      ? 'border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20'
      : 'border-outline-variant/50 bg-surface-container-lowest hover:border-primary/30 hover:shadow-elevado'
  ].join(' ')}
  aria-pressed={seleccionada}
  aria-label={`Ver detalle de ${cancion.titulo}, ${cancion.artista}`}
  onclick={() => onSeleccionar(cancion)}
>
  <div class="flex items-start gap-2.5">
    <MiniEspectro semilla={`${cancion.titulo}${cancion.idCancion}`} clase="h-11 w-11" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-headline-sm font-semibold text-on-surface transition-colors group-hover:text-primary">{cancion.titulo}</p>
      <p class="truncate text-body-sm text-on-surface-variant">{cancion.artista}</p>
    </div>
    <Insignia tono={origen === 'persistido' ? 'info' : origen === 'local' ? 'primario' : 'terciario'} icono={origen === 'demo' ? 'science' : 'database'}>
      {origen === 'persistido' ? 'SoupDB' : origen}
    </Insignia>
  </div>

  <div class="flex flex-wrap items-center gap-1.5">
    <span class="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-surface-container-low px-2 py-0.5 text-body-sm text-on-surface" title={cancion.coleccion}>
      <span class="material-symbols-outlined text-[13px] text-secondary" aria-hidden="true">folder_special</span>
      <span class="truncate">{cancion.coleccion}</span>
    </span>
    <span class="rounded-md border border-outline-variant/40 px-2 py-0.5 text-body-sm text-on-surface-variant">{cancion.genero}</span>
    <span class="rounded-md border border-outline-variant/40 px-2 py-0.5 font-code text-code-sm tabular text-on-surface-variant">{cancion.anio > 0 ? cancion.anio : 'Año no declarado'}</span>
  </div>

  <dl class="grid grid-cols-3 gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-low/60 p-2">
    <div>
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Duración</dt>
      <dd class="font-code text-code-sm tabular text-on-surface">{formatearDuracion(cancion.duracionSegundos)}</dd>
    </div>
    <div>
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Segmentos</dt>
      <dd class="font-code text-code-sm tabular text-on-surface">{formatearNumero(cancion.cantidadSegmentos)}</dd>
    </div>
    <div class="min-w-0">
      <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Licencia</dt>
      <dd class="truncate text-body-sm text-on-surface" title={cancion.licencia ?? 'Sin licencia declarada'}>{cancion.licencia ?? '—'}</dd>
    </div>
  </dl>

  <div class="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/40 pt-2">
    <span class="font-code text-code-sm text-on-surface-variant">REF-{String(cancion.idCancion).padStart(3, '0')}</span>
    <span class="inline-flex items-center gap-1 text-label-md font-medium text-primary">
      Ver segmentos
      <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
    </span>
  </div>
</button>

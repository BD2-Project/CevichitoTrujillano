<script lang="ts">
  import type { CancionCatalogo } from '../../datos/tipos';
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

</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<tr
  class={[
    'group cursor-pointer border-b border-outline-variant/40 transition-colors last:border-0',
    seleccionada ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-low/60'
  ].join(' ')}
  onclick={() => onSeleccionar(cancion)}
>
  <td class="px-3 py-2.5 pl-4">
    <div class="flex items-center gap-2.5">
      <MiniEspectro semilla={`${cancion.titulo}${cancion.idCancion}`} />
      <div class="min-w-0">
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="enlace-foco max-w-[280px] truncate rounded text-left text-headline-sm font-semibold text-on-surface transition-colors group-hover:text-primary"
            aria-pressed={seleccionada}
            onclick={(evento) => {
              evento.stopPropagation();
              onSeleccionar(cancion);
            }}
          >
            {cancion.titulo}
          </button>
          {#if seleccionada}
            <span class="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">chevron_right</span>
          {/if}
        </div>
        <span class="block max-w-[280px] truncate text-body-sm text-on-surface-variant">{cancion.artista}</span>
      </div>
    </div>
  </td>

  <td class="px-3 py-2.5">
    <span class="inline-flex max-w-[190px] items-center gap-1 truncate rounded-md bg-surface-container-low px-2 py-0.5 text-body-sm text-on-surface" title={cancion.coleccion}>
      <span class="material-symbols-outlined text-[14px] text-secondary" aria-hidden="true">folder_special</span>
      <span class="truncate">{cancion.coleccion}</span>
    </span>
  </td>

  <td class="whitespace-nowrap px-3 py-2.5">
    <span class="font-code text-code-timecode tabular text-on-surface">{formatearDuracion(cancion.duracionSegundos)}</span>
  </td>

  <td class="whitespace-nowrap px-3 py-2.5">
    <span class="font-code text-code-sm tabular text-on-surface">{formatearNumero(cancion.cantidadSegmentos)}</span>
    <span class="ml-1 text-body-sm text-on-surface-variant">× 5 s</span>
  </td>

  <td class="px-3 py-2.5">
    <span class="inline-flex whitespace-nowrap rounded-md border border-outline-variant/40 px-2 py-0.5 text-body-sm text-on-surface-variant">
      {cancion.genero}
    </span>
  </td>

  <td class="whitespace-nowrap px-3 py-2.5">
    <span class="font-code text-code-sm tabular text-on-surface">{cancion.anio > 0 ? cancion.anio : 'No declarado'}</span>
  </td>

  <td class="px-3 py-2.5">
    <span class="inline-flex items-center gap-1 whitespace-nowrap text-body-sm text-on-surface-variant">
      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">copyright</span>
      {cancion.licencia ?? 'Sin licencia declarada'}
    </span>
  </td>

  <td class="px-3 py-2.5 pr-4 text-right">
    <button
      type="button"
      class="enlace-foco inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary hover:text-on-primary"
      title={`Ver detalle de ${cancion.titulo}`}
      aria-label={`Ver detalle de ${cancion.titulo}`}
      onclick={(evento) => {
        evento.stopPropagation();
        onSeleccionar(cancion);
      }}
    >
      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
    </button>
  </td>
</tr>

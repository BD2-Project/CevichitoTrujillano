<script lang="ts">
  import type { RegionOnda } from '../audio/tipos';

  let {
    picos,
    duracion,
    posicion = 0,
    regiones = [],
    colorBase = '#6d797e',
    colorActivo = '#5cd5fa',
    altura = 96,
    clase = '',
    onSeek,
    etiquetas = true
  }: {
    picos: number[];
    duracion: number;
    posicion?: number;
    regiones?: RegionOnda[];
    colorBase?: string;
    colorActivo?: string;
    altura?: number;
    clase?: string;
    onSeek?: (segundos: number) => void;
    etiquetas?: boolean;
  } = $props();

  const PUNTOS = 140;
  const datos = $derived(
    picos.length === PUNTOS ? picos : Array.from({ length: PUNTOS }, (_, indice) => picos[Math.floor((indice / PUNTOS) * picos.length)] ?? 0.1)
  );
  const fraccion = $derived(duracion > 0 ? Math.min(1, Math.max(0, posicion / duracion)) : 0);
  const duracionSegura = $derived(Math.max(0.001, duracion));

  let contenedor = $state<HTMLDivElement | null>(null);

  function calcularSegundos(evento: MouseEvent): number {
    if (!contenedor) return 0;
    const caja = contenedor.getBoundingClientRect();
    const proporcion = Math.min(1, Math.max(0, (evento.clientX - caja.left) / caja.width));
    return proporcion * duracionSegura;
  }

  function alHacerClic(evento: MouseEvent) {
    onSeek?.(calcularSegundos(evento));
  }

  function alTeclear(evento: KeyboardEvent) {
    if (!onSeek) return;
    const paso = duracionSegura * (evento.shiftKey ? 0.1 : 0.02);
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      onSeek(Math.min(duracionSegura, posicion + paso));
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowDown') {
      evento.preventDefault();
      onSeek(Math.max(0, posicion - paso));
    } else if (evento.key === 'Home') {
      evento.preventDefault();
      onSeek(0);
    } else if (evento.key === 'End') {
      evento.preventDefault();
      onSeek(duracionSegura);
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={contenedor}
  class={['group relative w-full overflow-hidden rounded-lg', clase].join(' ')}
  style={`height:${altura}px`}
  role={onSeek ? 'slider' : 'img'}
  tabindex={onSeek ? 0 : undefined}
  aria-label="Forma de onda del audio"
  aria-valuemin={onSeek ? 0 : undefined}
  aria-valuemax={onSeek ? Math.round(duracionSegura) : undefined}
  aria-valuenow={onSeek ? Math.round(posicion) : undefined}
  onclick={onSeek ? alHacerClic : undefined}
  onkeydown={onSeek ? alTeclear : undefined}
>
  <div class="absolute inset-0 grid grid-cols-8 divide-x divide-white/5 pointer-events-none">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
  </div>

  {#each regiones as region (region.inicio + '-' + region.fin + '-' + (region.etiqueta ?? ''))}
    {@const inicio = Math.min(1, Math.max(0, region.inicio / duracionSegura))}
    {@const fin = Math.min(1, Math.max(inicio, region.fin / duracionSegura))}
    <div
      class="pointer-events-none absolute inset-y-1 z-10 rounded-sm border-x-2"
      style={`left:${inicio * 100}%;width:${Math.max(0.4, (fin - inicio) * 100)}%;background:${region.color ?? 'rgba(75,92,146,0.22)'};border-color:${region.borde ?? '#6475ad'}`}
      title={region.etiqueta}
    >
      {#if etiquetas && fin - inicio > 0.05 && region.etiqueta}
        <span class="absolute left-1 top-1 max-w-[95%] truncate rounded bg-black/25 px-1 py-0.5 text-[10px] font-semibold text-white">
          {region.etiqueta}
        </span>
      {/if}
    </div>
  {/each}

  <svg
    class="absolute inset-0 h-full w-full"
    viewBox="0 0 1000 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {#each datos as pico, indice}
      {@const x = indice * (1000 / PUNTOS) + 1.4}
      {@const alto = Math.max(2, Math.min(94, pico * 90))}
      {@const activo = indice / PUNTOS <= fraccion}
      <rect
        x={x}
        y={50 - alto / 2}
        width={1000 / PUNTOS - 2.8}
        height={alto}
        rx="1.4"
        fill={activo ? colorActivo : colorBase}
        opacity={activo ? 0.95 : 0.34}
      />
    {/each}
  </svg>

  <div
    class="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.85)]"
    style={`left:${fraccion * 100}%`}
  >
    <div class="absolute -left-[5px] top-0 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-cyan-300"></div>
  </div>
</div>

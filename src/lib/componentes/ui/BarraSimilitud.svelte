<script lang="ts">
  import { formatearSimilitud, tonoSimilitud } from '../../utilidades/formato';

  let {
    valor,
    ancho = 'completo',
    mostrarValor = true,
    etiqueta
  }: {
    valor: number;
    ancho?: 'completo' | 'compacto';
    mostrarValor?: boolean;
    etiqueta?: string;
  } = $props();

  const tono = $derived(tonoSimilitud(valor));
  const colores: Record<string, string> = {
    exito: 'bg-exito',
    info: 'bg-secondary',
    advertencia: 'bg-advertencia',
    neutro: 'bg-outline',
    primario: 'bg-primary',
    terciario: 'bg-tertiary',
    peligro: 'bg-peligro'
  };
</script>

<div class={['flex items-center gap-2', ancho === 'compacto' ? 'w-24' : 'w-full'].join(' ')}>
  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
    <div
      class={['h-full rounded-full transition-[width] duration-500', colores[tono]].join(' ')}
      style={`width:${Math.min(100, Math.max(0, valor * 100))}%`}
    ></div>
  </div>
  {#if mostrarValor}
    <span class="shrink-0 text-code-sm font-semibold tabular text-on-surface">
      {etiqueta ?? formatearSimilitud(valor)}
    </span>
  {/if}
</div>

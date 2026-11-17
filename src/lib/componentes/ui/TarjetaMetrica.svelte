<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Tono } from '../../datos/tipos';

  let {
    etiqueta,
    valor,
    unidad,
    detalle,
    icono,
    tono = 'primario',
    mono = false,
    clase = '',
    pie
  }: {
    etiqueta: string;
    valor: string | number;
    unidad?: string;
    detalle?: string;
    icono?: string;
    tono?: Tono;
    mono?: boolean;
    clase?: string;
    pie?: Snippet;
  } = $props();

  const iconos: Record<Tono, string> = {
    neutro: 'bg-surface-container-high text-on-surface-variant',
    primario: 'bg-primary/10 text-primary',
    info: 'bg-secondary-container/60 text-secondary',
    exito: 'bg-exito-suave text-emerald-700',
    advertencia: 'bg-advertencia-suave text-amber-700',
    peligro: 'bg-peligro-suave text-red-700',
    terciario: 'bg-tertiary/10 text-tertiary'
  };

  const bordes: Record<Tono, string> = {
    neutro: 'from-outline/20 to-outline/10',
    primario: 'from-primary/40 to-primary-container/50',
    info: 'from-secondary to-secondary-container',
    exito: 'from-exito to-emerald-300',
    advertencia: 'from-advertencia to-amber-300',
    peligro: 'from-peligro to-red-300',
    terciario: 'from-tertiary to-tertiary-container'
  };
</script>

<div class={['relative flex flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-panel', clase].join(' ')}>
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <span class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">{etiqueta}</span>
      <div class="mt-1 flex flex-wrap items-baseline gap-1.5">
        <span class={['text-headline-lg font-semibold leading-none text-on-surface', mono ? 'font-code' : '', 'tabular'].join(' ')}>{valor}</span>
        {#if unidad}<span class="text-body-sm text-on-surface-variant">{unidad}</span>{/if}
      </div>
    </div>
    {#if icono}
      <div class={['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconos[tono]].join(' ')}>
        <span class="material-symbols-outlined text-[19px]" aria-hidden="true">{icono}</span>
      </div>
    {/if}
  </div>
  {#if detalle}
    <span class="text-label-sm text-on-surface-variant">{detalle}</span>
  {/if}
  {#if pie}{@render pie()}{/if}
  <div class={['absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r', bordes[tono]].join(' ')}></div>
</div>

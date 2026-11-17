<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variante = 'primario' | 'secundario' | 'terciario' | 'contorno' | 'peligro' | 'fantasma';
  type Tamanio = 'sm' | 'md' | 'lg' | 'icono';

  let {
    variante = 'secundario',
    tamanio = 'md',
    icono,
    iconoRelleno = false,
    tipo = 'button',
    deshabilitado = false,
    cargando = false,
    activo = false,
    clase = '',
    titulo,
    onclick,
    children
  }: {
    variante?: Variante;
    tamanio?: Tamanio;
    icono?: string;
    iconoRelleno?: boolean;
    tipo?: 'button' | 'submit' | 'reset';
    deshabilitado?: boolean;
    cargando?: boolean;
    activo?: boolean;
    clase?: string;
    titulo?: string;
    onclick?: (evento: MouseEvent) => void;
    children?: Snippet;
  } = $props();

  const variantes: Record<Variante, string> = {
    primario:
      'bg-primary text-on-primary shadow-sm hover:bg-primary-container active:bg-primary',
    secundario:
      'border border-outline-variant/60 bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low',
    terciario:
      'bg-surface-container text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest',
    contorno:
      'border border-outline-variant text-on-surface hover:border-primary-container hover:bg-surface-container-low',
    peligro:
      'bg-error text-on-error shadow-sm hover:bg-on-error-container',
    fantasma:
      'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  };

  const tamanios: Record<Tamanio, string> = {
    sm: 'h-8 gap-1.5 rounded-md px-2.5 text-label-md',
    md: 'h-9 gap-2 rounded-lg px-3.5 text-label-md',
    lg: 'h-11 gap-2 rounded-lg px-5 text-body-md',
    icono: 'h-9 w-9 justify-center rounded-lg'
  };
</script>

<button
  type={tipo}
  title={titulo}
  class={[
    'inline-flex shrink-0 select-none items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    variantes[variante],
    tamanios[tamanio],
    activo ? 'ring-2 ring-primary-container/40 ring-offset-1' : '',
    clase
  ].join(' ')}
  disabled={deshabilitado || cargando}
  aria-busy={cargando}
  onclick={onclick}
>
  {#if cargando}
    <span class="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
  {:else if icono}
    <span
      class="material-symbols-outlined text-[18px]"
      class:relleno={iconoRelleno}
      aria-hidden="true">{icono}</span
    >
  {/if}
  {#if children}{@render children()}{/if}
</button>

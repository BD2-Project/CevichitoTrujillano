<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Tono } from '../../datos/tipos';

  let {
    tono = 'neutro',
    icono,
    punto = false,
    clase = '',
    children
  }: {
    tono?: Tono;
    icono?: string;
    punto?: boolean;
    clase?: string;
    children?: Snippet;
  } = $props();

  const estilos: Record<Tono, string> = {
    neutro: 'bg-surface-container text-on-surface-variant border-outline-variant/50',
    primario: 'bg-primary/10 text-primary border-primary/20',
    info: 'bg-secondary-container/45 text-on-secondary-container border-secondary/20',
    exito: 'bg-exito-suave text-emerald-800 border-exito/25',
    advertencia: 'bg-advertencia-suave text-amber-800 border-advertencia/30',
    peligro: 'bg-peligro-suave text-red-800 border-peligro/25',
    terciario: 'bg-tertiary/10 text-tertiary border-tertiary/25'
  };

  const puntos: Record<Tono, string> = {
    neutro: 'bg-outline',
    primario: 'bg-primary',
    info: 'bg-secondary',
    exito: 'bg-exito',
    advertencia: 'bg-advertencia',
    peligro: 'bg-peligro',
    terciario: 'bg-tertiary'
  };
</script>

<span
  class={[
    'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-label-sm font-semibold whitespace-nowrap',
    estilos[tono],
    clase
  ].join(' ')}
>
  {#if punto}<span class="h-1.5 w-1.5 rounded-full {puntos[tono]}" aria-hidden="true"></span>{/if}
  {#if icono}
    <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{icono}</span>
  {/if}
  {#if children}{@render children()}{/if}
</span>

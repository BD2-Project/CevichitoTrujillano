<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    icono = 'inbox',
    titulo,
    descripcion,
    compacto = false,
    children
  }: {
    icono?: string;
    titulo: string;
    descripcion?: string;
    compacto?: boolean;
    children?: Snippet;
  } = $props();
</script>

<div class={['flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low/40 text-center', compacto ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12'].join(' ')}>
  <div class={['flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant', compacto ? 'h-9 w-9' : 'h-12 w-12'].join(' ')}>
    <span class={['material-symbols-outlined', compacto ? 'text-[20px]' : 'text-[26px]'].join(' ')} aria-hidden="true">{icono}</span>
  </div>
  <div class="space-y-1">
    <p class="text-headline-sm font-semibold text-on-surface">{titulo}</p>
    {#if descripcion}
      <p class="mx-auto max-w-md text-body-sm text-on-surface-variant">{descripcion}</p>
    {/if}
  </div>
  {#if children}<div class="mt-1 flex flex-wrap items-center justify-center gap-2">{@render children()}</div>{/if}
</div>

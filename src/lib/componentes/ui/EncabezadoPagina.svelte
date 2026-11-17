<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    etiqueta,
    titulo,
    descripcion,
    icono = 'graphic_eq',
    acciones
  }: {
    etiqueta?: string;
    titulo: string;
    descripcion?: string;
    icono?: string;
    acciones?: Snippet;
  } = $props();
</script>

<header class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
  <div class="max-w-3xl space-y-1.5">
    {#if etiqueta}
      <div class="flex items-center gap-2 text-primary">
        <span class="material-symbols-outlined text-[19px]" style="font-variation-settings:'FILL' 1;" aria-hidden="true">{icono}</span>
        <span class="text-label-sm font-semibold uppercase tracking-[0.08em]">{etiqueta}</span>
      </div>
    {/if}
    <h1 class="texto-equilibrado text-headline-lg-mobile font-semibold tracking-tight text-on-surface sm:text-headline-lg">
      {titulo}
    </h1>
    {#if descripcion}
      <p class="texto-pretty max-w-2xl text-body-md leading-relaxed text-on-surface-variant">
        {descripcion}
      </p>
    {/if}
  </div>
  {#if acciones}
    <div class="flex flex-wrap items-center gap-2">
      {@render acciones()}
    </div>
  {/if}
</header>

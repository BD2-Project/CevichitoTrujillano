<script lang="ts">
  import Boton from '../../componentes/ui/Boton.svelte';
  import { ETIQUETAS_ORDEN, ETIQUETAS_RANGO, UMBRALES_SIMILITUD } from '../../datos/constantes';
  import { formatearNumero } from '../../utilidades/formato';
  import type { ConteoEstados, FiltrosHistorialUI } from './tipos';

  let {
    filtros,
    total,
    visibles,
    conteoEstados,
    onLimpiar
  }: {
    filtros: FiltrosHistorialUI;
    total: number;
    visibles: number;
    conteoEstados: ConteoEstados;
    onLimpiar: () => void;
  } = $props();

  const hayFiltros = $derived(
    filtros.busqueda.trim() !== '' ||
      filtros.estado !== 'todos' ||
      filtros.rango !== 'todo' ||
      filtros.similitudMinima > 0 ||
      filtros.orden !== 'recientes'
  );
</script>

<section class="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-panel" aria-label="Filtros del historial">
  <div class="flex flex-col gap-3 xl:flex-row xl:items-end">
    <div class="min-w-0 flex-1">
      <label for="filtro-busqueda" class="sr-only">Buscar por nombre de archivo o ID de análisis</label>
      <div class="relative">
        <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-on-surface-variant" aria-hidden="true">search</span>
        <input
          id="filtro-busqueda"
          type="search"
          class="campo-entrada pl-10"
          placeholder="Buscar por archivo o ID de análisis…"
          autocomplete="off"
          spellcheck="false"
          bind:value={filtros.busqueda}
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-auto">
      <div class="relative">
        <label for="filtro-estado" class="sr-only">Filtrar por estado del análisis</label>
        <select id="filtro-estado" class="campo-selector py-2 text-label-md" bind:value={filtros.estado}>
          <option value="todos">Todos los estados ({formatearNumero(conteoEstados.todos)})</option>
          <option value="con-evidencia">Con evidencia ({formatearNumero(conteoEstados.conEvidencia)})</option>
          <option value="sin-evidencia">Sin evidencia ({formatearNumero(conteoEstados.sinEvidencia)})</option>
          <option value="error">Con error ({formatearNumero(conteoEstados.errores)})</option>
        </select>
        <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">expand_more</span>
      </div>

      <div class="relative">
        <label for="filtro-rango" class="sr-only">Filtrar por rango temporal</label>
        <select id="filtro-rango" class="campo-selector py-2 text-label-md" bind:value={filtros.rango}>
          {#each Object.entries(ETIQUETAS_RANGO) as [valor, etiqueta] (valor)}
            <option value={valor}>{etiqueta}</option>
          {/each}
        </select>
        <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">expand_more</span>
      </div>

      <div class="relative">
        <label for="filtro-similitud" class="sr-only">Filtrar por similitud mínima</label>
        <select id="filtro-similitud" class="campo-selector py-2 text-label-md" bind:value={filtros.similitudMinima}>
          {#each UMBRALES_SIMILITUD as umbral (umbral.valor)}
            <option value={umbral.valor}>{umbral.etiqueta}</option>
          {/each}
        </select>
        <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">expand_more</span>
      </div>

      <div class="relative">
        <label for="filtro-orden" class="sr-only">Ordenar expedientes</label>
        <select id="filtro-orden" class="campo-selector py-2 text-label-md" bind:value={filtros.orden}>
          {#each Object.entries(ETIQUETAS_ORDEN) as [valor, etiqueta] (valor)}
            <option value={valor}>{etiqueta}</option>
          {/each}
        </select>
        <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">sort</span>
      </div>
    </div>
  </div>

  <div class="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/50 pt-2.5">
    <p class="text-body-sm text-on-surface-variant" aria-live="polite">
      Mostrando <strong class="text-on-surface">{formatearNumero(visibles)}</strong> de
      <strong class="text-on-surface">{formatearNumero(total)}</strong>
      {total === 1 ? 'expediente' : 'expedientes'}
    </p>
    <Boton
      tamanio="sm"
      variante={hayFiltros ? 'contorno' : 'fantasma'}
      icono="filter_alt_off"
      deshabilitado={!hayFiltros}
      onclick={onLimpiar}
    >
      Limpiar filtros
    </Boton>
  </div>
</section>

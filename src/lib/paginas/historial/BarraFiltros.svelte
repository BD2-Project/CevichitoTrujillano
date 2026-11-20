<script lang="ts">
  import {
    ETIQUETAS_ESTADO,
    ETIQUETAS_ORDEN,
    ETIQUETAS_RANGO,
    UMBRALES_SIMILITUD
  } from '../../datos/constantes';
  import { formatearNumero, formatearSimilitud } from '../../utilidades/formato';
  import type {
    ConteoEstados,
    EstadoFiltro,
    FiltrosHistorialUI,
    OrdenFiltro,
    RangoFiltro
  } from './tipos';

  let {
    filtros,
    total,
    visibles,
    conteoEstados,
    tamanoPagina,
    onLimpiar
  }: {
    filtros: FiltrosHistorialUI;
    total: number;
    visibles: number;
    conteoEstados: ConteoEstados;
    tamanoPagina: number;
    onLimpiar: () => void;
  } = $props();

  type ClaveFiltro = 'busqueda' | 'estado' | 'rango' | 'similitudMinima';

  interface ChipFiltro {
    clave: ClaveFiltro;
    etiqueta: string;
  }

  const chips = $derived.by((): ChipFiltro[] => {
    const activos: ChipFiltro[] = [];
    const busqueda = filtros.busqueda.trim();
    if (busqueda) {
      activos.push({ clave: 'busqueda', etiqueta: `“${busqueda}”` });
    }
    if (filtros.estado !== 'todos') {
      activos.push({ clave: 'estado', etiqueta: ETIQUETAS_ESTADO[filtros.estado] });
    }
    if (filtros.rango !== 'todo') {
      activos.push({ clave: 'rango', etiqueta: ETIQUETAS_RANGO[filtros.rango] });
    }
    if (filtros.similitudMinima > 0) {
      activos.push({
        clave: 'similitudMinima',
        etiqueta: `Similitud mínima: ${formatearSimilitud(filtros.similitudMinima, 0)}`
      });
    }
    return activos;
  });

  function quitar(clave: ClaveFiltro) {
    switch (clave) {
      case 'busqueda':
        filtros.busqueda = '';
        break;
      case 'estado':
        filtros.estado = 'todos';
        break;
      case 'rango':
        filtros.rango = 'todo';
        break;
      case 'similitudMinima':
        filtros.similitudMinima = 0;
        break;
    }
  }
</script>

<section
  class="flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-panel sm:p-5"
  aria-label="Filtros del historial"
>
  <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
    <div class="relative flex-1 xl:max-w-md">
      <label for="filtro-busqueda" class="sr-only">Buscar por nombre de archivo o ID de análisis</label>
      <span
        class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
        aria-hidden="true">search</span
      >
      <input
        id="filtro-busqueda"
        type="search"
        class="campo-entrada py-2 pl-9 pr-9"
        placeholder="Buscar por archivo o ID de análisis…"
        autocomplete="off"
        bind:value={filtros.busqueda}
      />
      {#if filtros.busqueda}
        <button
          type="button"
          class="enlace-foco absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          aria-label="Borrar el texto de búsqueda"
          onclick={() => (filtros.busqueda = '')}
        >
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
        </button>
      {/if}
    </div>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap xl:items-center">
      <div class="relative">
        <label for="filtro-estado" class="sr-only">Filtrar por estado del análisis</label>
        <select
          id="filtro-estado"
          class="campo-selector py-2 pr-8 text-label-md xl:w-auto"
          value={filtros.estado}
          onchange={(evento) => (filtros.estado = evento.currentTarget.value as EstadoFiltro)}
        >
          <option value="todos">Todos los estados ({formatearNumero(conteoEstados.todos)})</option>
          <option value="con-evidencia">
            Con evidencia ({formatearNumero(conteoEstados.conEvidencia)})
          </option>
          <option value="sin-evidencia">
            Sin evidencia ({formatearNumero(conteoEstados.sinEvidencia)})
          </option>
          <option value="error">Con error ({formatearNumero(conteoEstados.errores)})</option>
        </select>
        <span
          class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
          aria-hidden="true">expand_more</span
        >
      </div>

      <div class="relative">
        <label for="filtro-rango" class="sr-only">Filtrar por rango temporal</label>
        <select
          id="filtro-rango"
          class="campo-selector py-2 pr-8 text-label-md xl:w-auto"
          value={filtros.rango}
          onchange={(evento) => (filtros.rango = evento.currentTarget.value as RangoFiltro)}
        >
          {#each Object.entries(ETIQUETAS_RANGO) as [valor, etiqueta] (valor)}
            <option value={valor}>{etiqueta}</option>
          {/each}
        </select>
        <span
          class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
          aria-hidden="true">expand_more</span
        >
      </div>

      <div class="relative">
        <label for="filtro-similitud" class="sr-only">Filtrar por similitud mínima</label>
        <select
          id="filtro-similitud"
          class="campo-selector py-2 pr-8 text-label-md xl:w-auto"
          value={filtros.similitudMinima}
          onchange={(evento) =>
            (filtros.similitudMinima = Number(evento.currentTarget.value))}
        >
          {#each UMBRALES_SIMILITUD as umbral (umbral.valor)}
            <option value={umbral.valor}>{umbral.etiqueta}</option>
          {/each}
        </select>
        <span
          class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
          aria-hidden="true">expand_more</span
        >
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <div class="flex min-w-0 flex-wrap items-center gap-1.5">
      <span class="mr-1 font-code text-code-sm uppercase tracking-[0.05em] text-on-surface-variant">
        Filtros activos:
      </span>
      {#if chips.length > 0}
        {#each chips as chip (chip.clave)}
          <span
            class="inline-flex max-w-full items-center gap-1 rounded-md border border-outline-variant/50 bg-surface-container px-2 py-0.5 text-label-sm text-on-surface"
          >
            <span class="truncate">{chip.etiqueta}</span>
            <button
              type="button"
              class="enlace-foco flex h-5 w-5 shrink-0 items-center justify-center rounded text-on-surface-variant transition-colors hover:text-error"
              aria-label={`Quitar filtro ${chip.etiqueta}`}
              onclick={() => quitar(chip.clave)}
            >
              <span class="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
            </button>
          </span>
        {/each}
      {:else}
        <span class="text-body-sm text-on-surface-variant">Ningún filtro adicional aplicado</span>
      {/if}
      <button
        type="button"
        class="enlace-foco ml-1 rounded text-label-sm font-semibold text-primary transition-colors hover:text-primary-container hover:underline disabled:pointer-events-none disabled:opacity-40"
        disabled={chips.length === 0}
        onclick={onLimpiar}
      >
        Limpiar filtros
      </button>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <label for="filtro-orden" class="text-label-md text-on-surface-variant">Orden</label>
      <div class="relative">
        <select
          id="filtro-orden"
          class="campo-selector py-1.5 pr-8 text-label-md"
          value={filtros.orden}
          onchange={(evento) => (filtros.orden = evento.currentTarget.value as OrdenFiltro)}
        >
          {#each Object.entries(ETIQUETAS_ORDEN) as [valor, etiqueta] (valor)}
            <option value={valor}>{etiqueta}</option>
          {/each}
        </select>
        <span
          class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
          aria-hidden="true">expand_more</span
        >
      </div>
    </div>
  </div>

  <div class="separador flex flex-wrap items-center justify-between gap-2 pt-2.5">
    <p class="flex items-center gap-1.5 text-body-sm text-on-surface-variant" aria-live="polite">
      <span class="material-symbols-outlined text-[15px]" aria-hidden="true">filter_alt</span>
      Mostrando
      <strong class="font-semibold tabular text-on-surface">{formatearNumero(visibles)}</strong>
      de
      <strong class="font-semibold tabular text-on-surface">{formatearNumero(total)}</strong>
      expedientes
    </p>
    <p class="font-code text-code-sm text-on-surface-variant">
      {formatearNumero(tamanoPagina)} por página
    </p>
  </div>
</section>

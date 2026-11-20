<script lang="ts">
  import { enlace, enrutador } from '../../navegacion/enrutador.svelte';
  import type { NombreRuta } from '../../navegacion/enrutador.svelte';
  import Boton from '../ui/Boton.svelte';
  import IndicadorConexion from './IndicadorConexion.svelte';

  let { onAbrirMenu }: { onAbrirMenu?: () => void } = $props();

  const migas: Record<NombreRuta, { grupo: string; titulo: string; icono: string }> = {
    nuevo: { grupo: 'Análisis', titulo: 'Nuevo cotejo', icono: 'add_circle' },
    progreso: { grupo: 'Análisis', titulo: 'Pipeline en progreso', icono: 'model_training' },
    resultados: { grupo: 'Expediente', titulo: 'Resultados del cotejo', icono: 'analytics' },
    historial: { grupo: 'Registro', titulo: 'Historial de análisis', icono: 'history' },
    catalogo: { grupo: 'Referencias', titulo: 'Catálogo acústico', icono: 'library_music' },
    error: { grupo: 'Diagnóstico', titulo: 'Fallo del análisis', icono: 'report' },
    'no-encontrado': { grupo: 'Sistema', titulo: 'Ruta no encontrada', icono: 'explore_off' }
  };

  const actual = $derived(migas[enrutador.actual.nombre]);
  const detalle = $derived(
    enrutador.actual.nombre === 'error'
      ? `HTTP ${enrutador.actual.parametros.codigo ?? '500'}`
      : enrutador.actual.nombre === 'resultados'
        ? enrutador.actual.parametros.id?.slice(0, 8).toUpperCase()
        : null
  );
</script>

<header class="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-outline-variant/50 bg-surface/90 px-3 backdrop-blur sm:px-5">
  <div class="flex min-w-0 items-center gap-2">
    <button
      type="button"
      class="enlace-foco flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container lg:hidden"
      aria-label="Abrir navegación"
      onclick={onAbrirMenu}
    >
      <span class="material-symbols-outlined text-[22px]">menu</span>
    </button>

    <div class="flex min-w-0 items-center gap-2">
      <span class="hidden items-center gap-1.5 text-body-sm text-on-surface-variant sm:flex">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">folder_open</span>
        <span class="hidden md:inline">{actual.grupo}</span>
        <span class="material-symbols-outlined text-[14px] text-outline-variant" aria-hidden="true">chevron_right</span>
      </span>
      <span class="flex min-w-0 items-center gap-1.5 text-label-md font-semibold text-on-surface">
        <span class="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">{actual.icono}</span>
        <span class="truncate">{actual.titulo}</span>
      </span>
      {#if detalle}
        <span class="hidden rounded bg-surface-container px-1.5 py-0.5 font-code text-[10px] text-on-surface-variant sm:inline">
          {detalle}
        </span>
      {/if}
    </div>
  </div>

  <div class="flex shrink-0 items-center gap-2">
    <div class="hidden sm:block"><IndicadorConexion /></div>
    <span class="hidden h-5 w-px bg-outline-variant/60 sm:block"></span>
    <div class="hidden md:block">
      <a href={enlace('nuevo')}>
        <Boton variante="primario" tamanio="sm" icono="add">Nuevo análisis</Boton>
      </a>
    </div>
    <div
      class="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container text-[11px] font-bold text-on-surface-variant"
      title="Sesión local · AudioTrace"
      aria-label="Sesión local"
    >
      AT
    </div>
  </div>
</header>

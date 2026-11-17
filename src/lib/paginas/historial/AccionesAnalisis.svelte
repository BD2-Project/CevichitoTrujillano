<script lang="ts">
  import { app } from '../../estado/aplicacion.svelte';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import type { ResumenAnalisis } from '../../datos/tipos';
  import { abreviarId } from '../../utilidades/formato';

  let {
    item,
    variante = 'tabla'
  }: {
    item: ResumenAnalisis;
    variante?: 'tabla' | 'tarjeta';
  } = $props();

  let reanalizando = $state(false);

  const idAbreviado = $derived(abreviarId(item.idAnalisis, 8));

  async function reanalizar() {
    if (reanalizando) return;
    reanalizando = true;
    try {
      const resultado = await app.cargarResultado(item.idAnalisis);
      if (resultado) {
        app.prepararReanalisis(resultado);
      } else {
        app.notificar(
          'advertencia',
          'No se pudo preparar el reanálisis',
          `El expediente ${idAbreviado} no está disponible en esta sesión.`
        );
      }
    } finally {
      reanalizando = false;
    }
  }
</script>

{#if variante === 'tabla'}
  <div class="flex items-center justify-end gap-1.5">
    <a
      href={enlace('resultados', { id: item.idAnalisis })}
      class="enlace-foco inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-label-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
      title={`Abrir el análisis ${item.nombreArchivo}`}
    >
      Abrir
      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
    </a>
    <a
      href={enlace('resultados', { id: item.idAnalisis }, { modal: 'exportar' })}
      class="enlace-foco flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      title="Exportar los resultados de este análisis"
      aria-label={`Exportar resultados de ${item.nombreArchivo}`}
    >
      <span class="material-symbols-outlined text-[17px]" aria-hidden="true">file_download</span>
    </a>
    <button
      type="button"
      class="enlace-foco flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
      title="Reanalizar: vuelve a cargar el archivo original"
      aria-label={`Reanalizar ${item.nombreArchivo}`}
      aria-busy={reanalizando}
      disabled={reanalizando}
      onclick={reanalizar}
    >
      <span
        class="material-symbols-outlined text-[17px]"
        class:animate-spin={reanalizando}
        aria-hidden="true">{reanalizando ? 'progress_activity' : 'restart_alt'}</span
      >
    </button>
  </div>
{:else}
  <div class="flex items-center gap-2">
    <a
      href={enlace('resultados', { id: item.idAnalisis })}
      class="enlace-foco inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
      title={`Abrir el análisis ${item.nombreArchivo}`}
    >
      Abrir análisis
      <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
    </a>
    <a
      href={enlace('resultados', { id: item.idAnalisis }, { modal: 'exportar' })}
      class="enlace-foco flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      title="Exportar los resultados de este análisis"
      aria-label={`Exportar resultados de ${item.nombreArchivo}`}
    >
      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">file_download</span>
    </a>
    <button
      type="button"
      class="enlace-foco flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
      title="Reanalizar: vuelve a cargar el archivo original"
      aria-label={`Reanalizar ${item.nombreArchivo}`}
      aria-busy={reanalizando}
      disabled={reanalizando}
      onclick={reanalizar}
    >
      <span
        class="material-symbols-outlined text-[18px]"
        class:animate-spin={reanalizando}
        aria-hidden="true">{reanalizando ? 'progress_activity' : 'restart_alt'}</span
      >
    </button>
  </div>
{/if}

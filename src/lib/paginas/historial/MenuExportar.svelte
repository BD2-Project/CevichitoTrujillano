<script lang="ts">
  import { app } from '../../estado/aplicacion.svelte';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import { exportarCsvHistorial, exportarJsonHistorial } from '../../servicios/exportacion';
  import { formatearNumero } from '../../utilidades/formato';

  let { total }: { total: number } = $props();

  let abierto = $state(false);
  let disparador = $state<HTMLButtonElement | null>(null);
  let primerItem = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (abierto) primerItem?.focus();
  });

  function cerrar() {
    abierto = false;
  }

  function cerrarYDevolverFoco() {
    abierto = false;
    disparador?.focus();
  }

  function exportar(formato: 'csv' | 'json') {
    if (total === 0 || app.analisis.length === 0) return;
    if (formato === 'csv') {
      exportarCsvHistorial(app.analisis);
    } else {
      exportarJsonHistorial(app.analisis);
    }
    cerrar();
    app.notificar(
      'exito',
      `Registro exportado en ${formato.toUpperCase()}`,
      `${formatearNumero(total)} ${total === 1 ? 'expediente incluido' : 'expedientes incluidos'}.`
    );
  }

  function alTeclearVentana(evento: KeyboardEvent) {
    if (evento.key === 'Escape' && abierto) {
      evento.preventDefault();
      cerrarYDevolverFoco();
    }
  }

  function alTeclearMenu(evento: KeyboardEvent) {
    if (!abierto) return;
    if (evento.key === 'Tab') {
      cerrar();
      return;
    }
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;

    const contenedor = evento.currentTarget as HTMLElement;
    const opciones = Array.from(
      contenedor.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
    );
    if (opciones.length === 0) return;
    evento.preventDefault();
    const actual = opciones.findIndex((opcion) => opcion === document.activeElement);
    const siguiente =
      evento.key === 'ArrowDown'
        ? (actual + 1) % opciones.length
        : (actual - 1 + opciones.length) % opciones.length;
    opciones[siguiente]?.focus();
  }
</script>

<svelte:window onkeydown={alTeclearVentana} />

<div class="relative">
  <button
    bind:this={disparador}
    type="button"
    class="enlace-foco inline-flex h-9 shrink-0 select-none items-center justify-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3.5 text-label-md font-medium text-on-surface shadow-sm transition-colors hover:bg-surface-container-low"
    aria-haspopup="menu"
    aria-expanded={abierto}
    aria-controls="menu-exportar-historial"
    onclick={() => (abierto = !abierto)}
  >
    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">file_download</span>
    <span>Exportar registro</span>
    <span class="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">
      {abierto ? 'expand_less' : 'expand_more'}
    </span>
  </button>

  {#if abierto}
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default"
      aria-label="Cerrar el menú de exportación"
      tabindex="-1"
      onclick={cerrar}
    ></button>

    <div
      id="menu-exportar-historial"
      role="menu"
      aria-label="Formatos de exportación del historial"
      class="animate-entrada absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-1.5 shadow-flotante"
      tabindex="-1"
      onkeydown={alTeclearMenu}
    >
      <p class="px-2.5 py-1.5 text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
        {formatearNumero(total)} {total === 1 ? 'expediente' : 'expedientes'} en el registro
      </p>

      <button
        bind:this={primerItem}
        type="button"
        role="menuitem"
        class="enlace-foco flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
        disabled={total === 0}
        onclick={() => exportar('csv')}
      >
        <span class="material-symbols-outlined mt-0.5 text-[18px] text-primary" aria-hidden="true">table_view</span>
        <span class="flex min-w-0 flex-col">
          <span class="text-label-md font-semibold text-on-surface">Exportar CSV</span>
          <span class="text-body-sm text-on-surface-variant">
            Una fila por expediente, separado por punto y coma.
          </span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        class="enlace-foco flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
        disabled={total === 0}
        onclick={() => exportar('json')}
      >
        <span class="material-symbols-outlined mt-0.5 text-[18px] text-tertiary" aria-hidden="true">data_object</span>
        <span class="flex min-w-0 flex-col">
          <span class="text-label-md font-semibold text-on-surface">Exportar JSON</span>
          <span class="text-body-sm text-on-surface-variant">
            Estructura completa de los resúmenes de análisis.
          </span>
        </span>
      </button>

      <div class="separador mx-2.5 mt-1 pt-1.5">
        <p class="text-label-sm leading-snug text-on-surface-variant">
          El registro incluye solo metadatos del análisis. El audio consultado no se conserva.
        </p>
        <a
          href={enlace('historial')}
          class="enlace-sutil mt-1 inline-block text-label-sm"
          onclick={cerrar}
        >
          Ver esta tabla en el historial
        </a>
      </div>
    </div>
  {/if}
</div>

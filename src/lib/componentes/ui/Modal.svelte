<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    abierto,
    titulo,
    subtitulo,
    icono,
    ancho = 'lg',
    onCerrar,
    cerrarFuera = true,
    children,
    pie
  }: {
    abierto: boolean;
    titulo: string;
    subtitulo?: string;
    icono?: string;
    ancho?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    onCerrar: () => void;
    cerrarFuera?: boolean;
    children?: Snippet;
    pie?: Snippet;
  } = $props();

  const idTitulo = `modal-${Math.random().toString(36).slice(2, 9)}`;
  let panel = $state<HTMLDivElement | null>(null);

  const anchos = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl'
  } as const;

  $effect(() => {
    if (!abierto) return;
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const temporizador = setTimeout(() => {
      const enfocable = panel?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button:not([data-cerrar]), [tabindex]:not([tabindex="-1"])'
      );
      enfocable?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = anterior;
      clearTimeout(temporizador);
      focoAnterior?.focus();
    };
  });

  function alTeclear(evento: KeyboardEvent) {
    if (!abierto) return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      onCerrar();
    }
    if (evento.key === 'Tab' && panel) {
      const elementos = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
      )).filter((elemento) => elemento.getClientRects().length > 0);
      const primero = elementos[0];
      const ultimo = elementos.at(-1);
      if (evento.shiftKey && (document.activeElement === primero || !panel.contains(document.activeElement))) {
        evento.preventDefault(); ultimo?.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !panel.contains(document.activeElement))) {
        evento.preventDefault(); primero?.focus();
      }
    }
  }
</script>

<svelte:window onkeydown={alTeclear} />

{#if abierto}
  <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
    <button
      type="button"
      class="absolute inset-0 cursor-default bg-on-surface/45 backdrop-blur-[2px]"
      aria-label="Cerrar diálogo"
      data-cerrar
      onclick={() => cerrarFuera && onCerrar()}
    ></button>

    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      class={[
        'animate-entrada relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-flotante sm:rounded-xl',
        anchos[ancho]
      ].join(' ')}
    >
      <header class="flex items-start justify-between gap-4 border-b border-outline-variant/50 px-5 py-4 sm:px-6">
        <div class="flex min-w-0 items-start gap-3">
          {#if icono}
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">{icono}</span>
            </div>
          {/if}
          <div class="min-w-0">
            <h2 id={idTitulo} class="text-headline-sm font-semibold text-on-surface">{titulo}</h2>
            {#if subtitulo}<p class="mt-0.5 text-body-sm text-on-surface-variant">{subtitulo}</p>{/if}
          </div>
        </div>
        <button
          type="button"
          class="enlace-foco flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          aria-label="Cerrar"
          data-cerrar
          onclick={onCerrar}
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {#if children}{@render children()}{/if}
      </div>

      {#if pie}
        <footer class="flex flex-col-reverse gap-2 border-t border-outline-variant/50 bg-surface-container-low/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          {@render pie()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

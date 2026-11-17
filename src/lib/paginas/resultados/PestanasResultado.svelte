<script lang="ts">
  import type { PestanaResultado } from './tipos';

  interface Pestana {
    id: PestanaResultado;
    etiqueta: string;
    icono: string;
    contador?: number;
  }

  let {
    activa,
    cantidadCoincidencias,
    onCambiar
  }: {
    activa: PestanaResultado;
    cantidadCoincidencias: number;
    onCambiar: (pestana: PestanaResultado) => void;
  } = $props();

  const lista = $derived.by(
    (): Pestana[] => [
      {
        id: 'coincidencias',
        etiqueta: 'Coincidencias',
        icono: 'format_list_bulleted',
        contador: cantidadCoincidencias
      },
      { id: 'comparacion', etiqueta: 'Comparación A/B', icono: 'compare' },
      { id: 'metadatos', etiqueta: 'Metadatos', icono: 'fingerprint' }
    ]
  );

  function alTeclear(evento: KeyboardEvent, indice: number) {
    const ultimo = lista.length - 1;
    let destino: number | null = null;
    if (evento.key === 'ArrowRight') destino = indice === ultimo ? 0 : indice + 1;
    if (evento.key === 'ArrowLeft') destino = indice === 0 ? ultimo : indice - 1;
    if (evento.key === 'Home') destino = 0;
    if (evento.key === 'End') destino = ultimo;
    if (destino === null) return;
    evento.preventDefault();
    const siguiente = lista[destino];
    if (!siguiente) return;
    onCambiar(siguiente.id);
    const idBoton = `pestana-${siguiente.id}`;
    requestAnimationFrame(() => document.getElementById(idBoton)?.focus());
  }
</script>

<div class="panel-plano flex flex-wrap items-center gap-1 p-1" role="tablist" aria-label="Vistas del expediente">
  {#each lista as pestana, indice (pestana.id)}
    <button
      type="button"
      role="tab"
      id={`pestana-${pestana.id}`}
      aria-selected={activa === pestana.id}
      aria-controls={`panel-${pestana.id}`}
      tabindex={activa === pestana.id ? 0 : -1}
      onclick={() => onCambiar(pestana.id)}
      onkeydown={(evento) => alTeclear(evento, indice)}
      class={[
        'enlace-foco inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-label-md font-semibold transition-colors',
        activa === pestana.id
          ? 'bg-surface-container-lowest text-primary shadow-panel'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      ].join(' ')}
    >
      <span class="material-symbols-outlined text-[17px]" aria-hidden="true">{pestana.icono}</span>
      {pestana.etiqueta}
      {#if pestana.contador !== undefined}
        <span
          class={[
            'rounded-full px-1.5 py-0.5 font-code text-[10px] leading-none',
            activa === pestana.id
              ? 'bg-primary/10 text-primary'
              : 'bg-surface-container-high text-on-surface-variant'
          ].join(' ')}
        >
          {pestana.contador}
        </span>
      {/if}
    </button>
  {/each}
</div>

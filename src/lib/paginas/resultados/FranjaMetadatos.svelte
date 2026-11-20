<script lang="ts">
  import type { MetadatosArchivo, ResultadoAnalisis } from '../../datos/tipos';
  import {
    formatearDuracion,
    formatearNumero,
    formatearTamano
  } from '../../utilidades/formato';

  let { resultado }: { resultado: ResultadoAnalisis } = $props();

  interface DatoMetadato {
    etiqueta: string;
    valor: string;
    icono: string;
    mono: boolean;
  }

  const NO_DISPONIBLE = 'No disponible';

  function etiquetaCanales(canales: number | undefined): string {
    if (canales === 1) return 'Mono';
    if (canales === 2) return 'Estéreo';
    if (canales && canales > 0) return `${formatearNumero(canales)} canales`;
    return NO_DISPONIBLE;
  }

  function frecuencia(frecuenciaMuestreo: number | undefined): string {
    if (!frecuenciaMuestreo || !Number.isFinite(frecuenciaMuestreo)) return NO_DISPONIBLE;
    return `${formatearNumero(frecuenciaMuestreo)} Hz`;
  }

  function tamano(metadatos: MetadatosArchivo | undefined): string {
    if (!metadatos?.tamanoBytes) return NO_DISPONIBLE;
    return formatearTamano(metadatos.tamanoBytes);
  }

  const datos = $derived.by((): DatoMetadato[] => {
    const metadatos = resultado.metadatos;
    return [
      {
        etiqueta: 'Duración',
        valor:
          metadatos?.duracionSegundos != null
            ? formatearDuracion(metadatos.duracionSegundos)
            : NO_DISPONIBLE,
        icono: 'timer',
        mono: true
      },
      {
        etiqueta: 'Tamaño',
        valor: tamano(metadatos),
        icono: 'sd_storage',
        mono: true
      },
      {
        etiqueta: 'Formato',
        valor: metadatos?.formato ?? NO_DISPONIBLE,
        icono: 'audio_file',
        mono: true
      },
      {
        etiqueta: 'Frecuencia de muestreo',
        valor: frecuencia(metadatos?.frecuenciaMuestreo),
        icono: 'graphic_eq',
        mono: true
      },
      {
        etiqueta: 'Canales',
        valor: etiquetaCanales(metadatos?.canales),
        icono: 'settings_input_component',
        mono: false
      },
      {
        etiqueta: 'Ventana de segmento',
        valor: resultado.segundosPorSegmento > 0 ? `${formatearNumero(resultado.segundosPorSegmento)} s` : NO_DISPONIBLE,
        icono: 'content_cut',
        mono: true
      }
    ];
  });
</script>

<section
  class="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 shadow-panel sm:p-4"
  aria-labelledby="titulo-metadatos-expediente"
>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h2 id="titulo-metadatos-expediente" class="flex items-center gap-1.5 text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
      <span class="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">fingerprint</span>
      Metadatos del archivo
    </h2>
    <span class="font-code text-[11px] text-on-surface-variant">Capturados en el navegador · no persistidos</span>
  </div>

  <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
    {#each datos as dato (dato.etiqueta)}
      <div class="min-w-0">
        <dt class="flex items-center gap-1 text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{dato.icono}</span>
          {dato.etiqueta}
        </dt>
        <dd class={['mt-1 truncate text-code-sm text-on-surface', dato.mono ? 'font-code tabular' : 'font-medium'].join(' ')} title={dato.valor}>
          {dato.valor}
        </dd>
      </div>
    {/each}
  </dl>

  <div class="mt-3 flex items-start gap-2 rounded-lg border border-tertiary/20 bg-tertiary/5 px-3 py-2 text-body-sm text-on-surface-variant">
    <span class="material-symbols-outlined mt-px text-[16px] text-tertiary" aria-hidden="true">info</span>
    <p class="texto-pretty">
      <strong class="text-on-surface">Similitud técnica, no dictamen legal.</strong>
      La similitud mide cuánto se parecen los tramos de audio.
      La interfaz no aplica un umbral legal.
    </p>
  </div>
</section>

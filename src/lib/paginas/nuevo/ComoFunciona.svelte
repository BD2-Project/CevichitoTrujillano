<script lang="ts">
  import {
    COEFICIENTES_MFCC,
    DIMENSION_VECTOR,
    FRECUENCIA_MUESTREO,
    METRICA_INDICE,
    NOMBRE_INDICE,
    SEGUNDOS_POR_SEGMENTO
  } from '../../datos/constantes';
  import { formatearNumero } from '../../utilidades/formato';

  interface Paso {
    numero: string;
    icono: string;
    titulo: string;
    detalle: string;
    pie: string;
  }

  const pasos: Paso[] = [
    {
      numero: '01',
      icono: 'fact_check',
      titulo: 'Lectura y validación',
      detalle:
        'Se valida la entrada de audio antes del análisis. La muestra no se añade al catálogo ni reemplaza una referencia existente.',
      pie: 'WAV · MP3 · FLAC · OGG · AU'
    },
    {
      numero: '02',
      icono: 'graphic_eq',
      titulo: 'Decodificación',
      detalle: `La señal se decodifica y se remuestrea a ${formatearNumero(FRECUENCIA_MUESTREO)} Hz para normalizar la entrada del extractor.`,
      pie: `${formatearNumero(FRECUENCIA_MUESTREO)} Hz de muestreo`
    },
    {
      numero: '03',
      icono: 'content_cut',
      titulo: 'Segmentación',
      detalle: `La pista se divide en ventanas temporales consecutivas de ${SEGUNDOS_POR_SEGMENTO} s. El último tramo puede ser más corto que la ventana.`,
      pie: `${SEGUNDOS_POR_SEGMENTO} s por segmento`
    },
    {
      numero: '04',
      icono: 'fingerprint',
      titulo: 'Huella MFCC',
      detalle: `Cada ventana aporta ${COEFICIENTES_MFCC} coeficientes cepstrales en escala Mel que se condensan en un vector de ${DIMENSION_VECTOR} dimensiones.`,
      pie: `${COEFICIENTES_MFCC} MFCC → ${DIMENSION_VECTOR} dims`
    },
    {
      numero: '05',
      icono: 'travel_explore',
      titulo: 'Consulta HNSW',
      detalle: `Cada vector consulta el índice ${NOMBRE_INDICE} y recupera k vecinos por distancia ${METRICA_INDICE === 'euclidean' ? 'euclidiana' : METRICA_INDICE}.`,
      pie: `${NOMBRE_INDICE} · k vecinos`
    },
    {
      numero: '06',
      icono: 'timeline',
      titulo: 'Alineación temporal',
      detalle:
        'Los segmentos contiguos se agrupan en runs alineados y se calcula el desplazamiento temporal entre la muestra y cada referencia candidata.',
      pie: 'Runs · desplazamiento temporal'
    }
  ];
</script>

<section
  id="como-funciona"
  class="panel scroll-mt-20 p-4 focus:outline-none sm:p-5"
  tabindex="-1"
  aria-labelledby="como-funciona-titulo"
>
  <div class="flex flex-wrap items-start justify-between gap-2">
    <div class="flex items-start gap-2.5">
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary"
      >
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">route</span>
      </span>
      <div>
        <h2 id="como-funciona-titulo" class="text-headline-sm font-semibold text-on-surface">
          Cómo funciona
        </h2>
        <p class="mt-0.5 text-body-sm leading-relaxed text-on-surface-variant">
          Seis etapas deterministas desde el archivo cargado hasta la evidencia de similitud temporal.
        </p>
      </div>
    </div>
    <span
      class="rounded bg-surface-container px-2 py-0.5 font-code text-code-sm text-on-surface-variant"
    >
      Pipeline de referencia
    </span>
  </div>

  <ol class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#each pasos as paso (paso.numero)}
      <li
        class="flex flex-col justify-between gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3.5"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class="font-code text-code-sm font-semibold tabular text-primary"
              aria-hidden="true">{paso.numero}</span
            >
            <span class="material-symbols-outlined text-[18px] text-primary" aria-hidden="true"
              >{paso.icono}</span
            >
          </div>
          <span class="font-code text-[10px] uppercase tracking-wider text-on-surface-variant">Etapa</span>
        </div>
        <div>
          <h3 class="text-label-md font-semibold text-on-surface">{paso.titulo}</h3>
          <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">{paso.detalle}</p>
        </div>
        <p
          class="rounded bg-surface-container-lowest px-2 py-1 font-code text-[11px] text-on-surface-variant"
        >
          {paso.pie}
        </p>
      </li>
    {/each}
  </ol>

  <div
    class="mt-4 flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm leading-relaxed text-on-surface-variant"
  >
    <span class="material-symbols-outlined mt-0.5 text-[18px] text-secondary" aria-hidden="true">info</span>
    <p>
      La salida del pipeline es una similitud acústica en el intervalo [0, 1] y un alineamiento temporal. Es
      evidencia técnica para revisión humana: no constituye un dictamen legal ni una probabilidad de
      infracción.
    </p>
  </div>
</section>

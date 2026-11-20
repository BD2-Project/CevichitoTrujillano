<script lang="ts">
  import type { RegionOnda } from './tipos';
  import OndaAudio from './OndaAudio.svelte';
  import { picosSimulados } from '../../utilidades/audio';
  import { formatearDuracion } from '../../utilidades/formato';

  let {
    urlAudio = null,
    titulo,
    picos,
    duracionSegundos,
    regiones = [],
    variante = 'consola',
    compacto = false,
    permitirBucle = true,
    onSolicitarAudio
  }: {
    urlAudio?: string | null;
    titulo?: string;
    picos?: number[] | null;
    duracionSegundos?: number;
    regiones?: RegionOnda[];
    variante?: 'consola' | 'claro';
    compacto?: boolean;
    permitirBucle?: boolean;
    onSolicitarAudio?: () => void;
  } = $props();

  let elemento = $state<HTMLAudioElement | null>(null);
  let reproduciendo = $state(false);
  let tiempo = $state(0);
  let duracionReal = $state(0);
  let volumen = $state(0.8);
  let bucle = $state(false);
  let errorAudio = $state<string | null>(null);

  const picosUsados = $derived(picos ?? picosSimulados(titulo ?? urlAudio ?? 'audiotrace', 140));
  const finRegion = $derived(regiones.reduce((maximo, region) => Math.max(maximo, region.fin), 0));
  const duracion = $derived(Math.max(duracionReal, duracionSegundos ?? 0, finRegion, 0.1));
  const esConsola = $derived(variante === 'consola');

  $effect(() => {
    if (!elemento) return;
    elemento.volume = volumen;
    elemento.loop = bucle;
  });

  $effect(() => {
    if (!elemento) return;
    elemento.pause();
    reproduciendo = false;
    tiempo = 0;
    duracionReal = 0;
    errorAudio = null;
    if (urlAudio) elemento.load();
  });

  function alternar() {
    if (!elemento) return;
    if (!urlAudio) {
      errorAudio = 'Sin archivo de audio disponible en la demostración. Carga un audio para escucharlo.';
      onSolicitarAudio?.();
      return;
    }
    if (elemento.paused) {
      elemento
        .play()
        .then(() => {
          reproduciendo = true;
          errorAudio = null;
        })
        .catch(() => {
          errorAudio = 'El navegador no pudo reproducir este archivo.';
          reproduciendo = false;
        });
    } else {
      elemento.pause();
      reproduciendo = false;
    }
  }

  function mover(segundos: number) {
    if (!elemento || !urlAudio) {
      errorAudio = 'No hay audio cargado para desplazar.';
      return;
    }
    elemento.currentTime = Math.min(duracion, Math.max(0, segundos));
    tiempo = elemento.currentTime;
  }

  function alBuscar(segundos: number) {
    mover(segundos);
  }
</script>

<div
  class={[
    'flex flex-col gap-2 rounded-xl',
    esConsola
      ? 'bg-[#0f172a] p-3 text-white shadow-md'
      : 'border border-outline-variant/50 bg-surface-container-lowest p-3 shadow-panel',
    compacto ? 'gap-1.5' : ''
  ].join(' ')}
>
  <audio
    bind:this={elemento}
    src={urlAudio ?? undefined}
    preload="metadata"
    onloadedmetadata={() => {
      duracionReal = elemento && Number.isFinite(elemento.duration) ? elemento.duration : 0;
    }}
    ontimeupdate={() => {
      tiempo = elemento?.currentTime ?? 0;
    }}
    onplay={() => (reproduciendo = true)}
    onpause={() => (reproduciendo = false)}
    onended={() => (reproduciendo = false)}
    onerror={() => {
      if (urlAudio) errorAudio = 'No se pudo leer el audio en esta ruta.';
      reproduciendo = false;
    }}
  ></audio>

  <div class="flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <span class={['material-symbols-outlined text-[17px]', esConsola ? 'text-tertiary-fixed' : 'text-primary'].join(' ')} aria-hidden="true">equalizer</span>
      <div class="min-w-0">
        <p class={['truncate text-label-md font-semibold', esConsola ? 'text-white' : 'text-on-surface'].join(' ')}>
          {titulo ?? 'Monitor de audio'}
        </p>
        {#if !compacto}
          <p class={['truncate text-code-sm', esConsola ? 'text-white/55' : 'text-on-surface-variant'].join(' ')}>
            {urlAudio ? (urlAudio.startsWith('blob:') ? 'Archivo local · reproducción real' : 'Audio de referencia · reproducción desde SoupDB') : 'Sin archivo de audio disponible'}
          </p>
        {/if}
      </div>
    </div>
    <div class={['flex shrink-0 items-baseline gap-1 rounded-lg px-2 py-1 font-code text-code-sm tabular', esConsola ? 'bg-black/40 text-white' : 'bg-surface-container-low text-on-surface'].join(' ')}>
      <span class={esConsola ? 'font-semibold text-cyan-300' : 'font-semibold text-primary'}>{formatearDuracion(tiempo)}</span>
      <span class={esConsola ? 'text-white/35' : 'text-on-surface-variant/60'}>/</span>
      <span class={esConsola ? 'text-white/65' : 'text-on-surface-variant'}>{formatearDuracion(duracion)}</span>
    </div>
  </div>

  <OndaAudio
    picos={picosUsados}
    {duracion}
    posicion={tiempo}
    {regiones}
    altura={compacto ? 54 : 82}
    colorBase={esConsola ? '#94a3b8' : '#8b98a0'}
    colorActivo={esConsola ? '#5cd5fa' : '#0ca6ca'}
    clase={esConsola ? 'bg-black/45' : 'bg-[#0f172a]/95'}
    onSeek={alBuscar}
  />

  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class={[
          'flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95',
          esConsola ? 'bg-primary text-white hover:bg-primary-container' : 'bg-primary text-on-primary hover:bg-primary-container'
        ].join(' ')}
        aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
        aria-pressed={reproduciendo}
        onclick={alternar}
      >
        <span class="material-symbols-outlined text-[21px]" style={`font-variation-settings:'FILL' 1;`}>
          {reproduciendo ? 'pause' : 'play_arrow'}
        </span>
      </button>
      <button
        type="button"
        class={['flex h-8 w-8 items-center justify-center rounded-lg transition-colors', esConsola ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-on-surface-variant hover:bg-surface-container'].join(' ')}
        aria-label="Retroceder 5 segundos"
        onclick={() => mover(tiempo - 5)}
      >
        <span class="material-symbols-outlined text-[17px]">replay_5</span>
      </button>
      <button
        type="button"
        class={['flex h-8 w-8 items-center justify-center rounded-lg transition-colors', esConsola ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-on-surface-variant hover:bg-surface-container'].join(' ')}
        aria-label="Avanzar 5 segundos"
        onclick={() => mover(tiempo + 5)}
      >
        <span class="material-symbols-outlined text-[17px]">forward_5</span>
      </button>
      {#if permitirBucle}
        <button
          type="button"
          class={[
            'flex h-8 items-center gap-1 rounded-lg px-2 text-code-sm transition-colors',
            bucle
              ? esConsola
                ? 'bg-secondary/30 text-cyan-200'
                : 'bg-secondary-container/50 text-secondary'
              : esConsola
                ? 'text-white/60 hover:bg-white/10'
                : 'text-on-surface-variant hover:bg-surface-container'
          ].join(' ')}
          aria-pressed={bucle}
          aria-label="Repetir audio"
          onclick={() => (bucle = !bucle)}
        >
          <span class="material-symbols-outlined text-[16px]">repeat</span>
          {#if !compacto}<span>Repetir</span>{/if}
        </button>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if !compacto}
        <span class={['material-symbols-outlined text-[17px]', esConsola ? 'text-white/60' : 'text-on-surface-variant'].join(' ')} aria-hidden="true">volume_up</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volumen}
          class="enlace-foco control-volumen h-2 w-24 cursor-pointer appearance-none rounded-full"
          class:pista-oscura={esConsola}
          style:--nivel-volumen={`${volumen * 100}%`}
          aria-label="Volumen"
          oninput={(evento) => (volumen = Number((evento.currentTarget as HTMLInputElement).value))}
        />
      {/if}
    </div>
  </div>

  {#if errorAudio}
    <p class={['flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-code-sm', esConsola ? 'bg-amber-500/10 text-amber-200' : 'bg-advertencia-suave text-amber-800'].join(' ')}>
      <span class="material-symbols-outlined text-[15px]">warning</span>
      {errorAudio}
    </p>
  {/if}
</div>

<style>
  .control-volumen {
    --volumen-activo: var(--color-primary);
    --volumen-restante: var(--color-outline);
    background: linear-gradient(
      to right,
      var(--volumen-activo) var(--nivel-volumen),
      var(--volumen-restante) var(--nivel-volumen)
    );
  }

  .pista-oscura {
    --volumen-activo: var(--color-primary-fixed-dim);
    --volumen-restante: rgb(255 255 255 / 45%);
  }

  .control-volumen::-webkit-slider-thumb {
    appearance: none;
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--volumen-activo);
    border-radius: 50%;
    background: white;
  }

  .control-volumen::-moz-range-thumb {
    box-sizing: border-box;
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--volumen-activo);
    border-radius: 50%;
    background: white;
  }
</style>

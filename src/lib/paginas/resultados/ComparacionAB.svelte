<script lang="ts">
  import type { Coincidencia, ResultadoAnalisis } from '../../datos/tipos';
  import type { RegionOnda } from '../../componentes/audio/tipos';
  import OndaAudio from '../../componentes/audio/OndaAudio.svelte';
  import Reproductor from '../../componentes/audio/Reproductor.svelte';
  import BarraSimilitud from '../../componentes/ui/BarraSimilitud.svelte';
  import Boton from '../../componentes/ui/Boton.svelte';
  import EstadoVacio from '../../componentes/ui/EstadoVacio.svelte';
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import { app } from '../../estado/aplicacion.svelte';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import { picosSimulados } from '../../utilidades/audio';
  import {
    etiquetaSimilitud,
    formatearCodigoTiempo,
    formatearDuracion,
    formatearNumero,
    formatearSimilitud,
    tonoSimilitud
  } from '../../utilidades/formato';
  import type { CoincidenciaIndexada } from './utiles';
  import { claveCoincidencia, formatearDesplazamiento } from './utiles';

  let {
    resultado,
    coincidencia,
    indice,
    coincidencias,
    onSeleccionar,
    onAnterior,
    onSiguiente
  }: {
    resultado: ResultadoAnalisis;
    coincidencia: Coincidencia | null;
    indice: number | null;
    coincidencias: CoincidenciaIndexada[];
    onSeleccionar: (indice: number) => void;
    onAnterior: () => void;
    onSiguiente: () => void;
  } = $props();

  const posicion = $derived(coincidencias.findIndex((item) => item.indice === indice));
  const total = $derived(coincidencias.length);
  const puedeAnterior = $derived(posicion > 0);
  const puedeSiguiente = $derived(posicion >= 0 && posicion < total - 1);

  const cancion = $derived(
    coincidencia
      ? app.catalogo.find((item) => item.idCancion === coincidencia?.idCancion) ?? null
      : null
  );

  const duracionConsulta = $derived(
    Math.max(
      resultado.metadatos?.duracionSegundos ?? 0,
      coincidencia?.finConsulta ?? 0,
      1
    )
  );
  const urlConsulta = $derived(
    app.resultadoActual?.idAnalisis === resultado.idAnalisis && app.archivo?.name === resultado.nombreArchivo
      ? app.urlArchivo
      : null
  );
  const urlReferencia = $derived(cancion?.origen !== 'demo' && /^(https?:|blob:)/.test(cancion?.urlAudio ?? '') ? cancion?.urlAudio : null);

  const duracionReferencia = $derived(
    Math.max(cancion?.duracionSegundos ?? 0, coincidencia?.finFuente ?? 0, 1)
  );

  const picosConsulta = $derived(
    picosSimulados(`${resultado.nombreArchivo}:${resultado.idAnalisis}`, 140)
  );

  const picosReferencia = $derived(
    picosSimulados(
      `${coincidencia?.idCancion ?? 'referencia'}:${coincidencia?.titulo ?? 'catálogo'}`,
      140
    )
  );

  const regionesConsulta = $derived.by((): RegionOnda[] => {
    if (!coincidencia) return [];
    return [
      {
        inicio: coincidencia.inicioConsulta,
        fin: coincidencia.finConsulta,
        color: 'rgba(75, 92, 146, 0.32)',
        borde: '#4b5c92',
        etiqueta: `A · ${formatearDuracion(coincidencia.finConsulta - coincidencia.inicioConsulta)}`
      }
    ];
  });

  const regionesReferencia = $derived.by((): RegionOnda[] => {
    if (!coincidencia) return [];
    return [
      {
        inicio: coincidencia.inicioFuente,
        fin: coincidencia.finFuente,
        color: 'rgba(5, 103, 126, 0.32)',
        borde: '#05677e',
        etiqueta: `B · ${formatearDuracion(coincidencia.finFuente - coincidencia.inicioFuente)}`
      }
    ];
  });

  function alElegir(evento: Event) {
    const valor = Number((evento.currentTarget as HTMLSelectElement).value);
    if (Number.isFinite(valor)) onSeleccionar(valor);
  }

  function reanalizar() {
    app.prepararReanalisis(resultado);
  }

  function avisarReferencia() {
    app.notificar(
      'info',
      'Audio de referencia no disponible',
      `${coincidencia?.titulo ?? 'La referencia'} no incluye un archivo reproducible en la demostración; la onda mostrada es una representación esquemática.`
    );
  }
</script>

{#if !coincidencia}
  <section class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-panel sm:p-5" aria-label="Comparación A/B">
    <EstadoVacio
      icono="compare"
      titulo="Sin coincidencias para comparar"
      descripcion="Este expediente no contiene tramos candidatos que se puedan alinear con una referencia del catálogo. La comparación A/B se habilita cuando existe al menos una coincidencia."
    >
      <a href={enlace('nuevo')} class="enlace-foco rounded-lg">
        <Boton variante="primario" icono="add_circle">Analizar otro archivo</Boton>
      </a>
      <a href={enlace('historial')} class="enlace-foco rounded-lg">
        <Boton variante="secundario" icono="history">Ver historial</Boton>
      </a>
    </EstadoVacio>
  </section>
{:else}
  <section class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-panel" aria-labelledby="titulo-comparacion-ab">
    <header class="flex flex-col gap-3 border-b border-outline-variant/40 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0">
        <p class="text-label-sm font-semibold uppercase tracking-[0.08em] text-primary">Laboratorio de comparación A/B</p>
        <h2 id="titulo-comparacion-ab" class="mt-0.5 text-headline-sm font-semibold text-on-surface">
          Tramo consultado frente a referencia
        </h2>
        <p class="mt-0.5 text-body-sm text-on-surface-variant">
          {coincidencia.titulo} · {coincidencia.artista}
          <span class="mx-1 text-outline-variant" aria-hidden="true">·</span>
          Coincidencia {posicion >= 0 ? posicion + 1 : 1} de {total}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        {#if total > 1}
          <div class="flex min-w-0 items-center gap-2">
            <label for="selector-coincidencia-ab" class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
              Coincidencia
            </label>
            <select
              id="selector-coincidencia-ab"
              class="campo-selector max-w-64 py-1.5 pr-8 text-label-md"
              value={indice ?? undefined}
              onchange={alElegir}
            >
              {#each coincidencias as item, ordenVisible (claveCoincidencia(item))}
                <option value={item.indice}>
                  {ordenVisible + 1}. {item.coincidencia.titulo} · {formatearSimilitud(item.coincidencia.similitud)}
                </option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="inline-flex items-center rounded-lg border border-outline-variant/50 bg-surface-container-low p-0.5">
          <button
            type="button"
            class="enlace-foco flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-40"
            title="Coincidencia anterior"
            aria-label="Coincidencia anterior"
            disabled={!puedeAnterior}
            onclick={onAnterior}
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
          </button>
          <span class="min-w-16 px-1 text-center font-code text-code-sm font-semibold tabular text-on-surface">
            {posicion >= 0 ? posicion + 1 : 1} / {total}
          </span>
          <button
            type="button"
            class="enlace-foco flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-40"
            title="Coincidencia siguiente"
            aria-label="Coincidencia siguiente"
            disabled={!puedeSiguiente}
            onclick={onSiguiente}
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      </div>
    </header>

    <div class="space-y-4 p-4 sm:p-5">
      <p class="text-body-sm text-on-surface-variant">Las ondas son representaciones esquemáticas; no proceden de la extracción de amplitudes. Los controles reproducen el archivo real cuando está disponible.</p>
      <div class="grid gap-3 lg:grid-cols-2 lg:items-stretch">
        <article class="flex h-full flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 shadow-panel">
          <header class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary font-code text-code-sm font-bold text-on-primary shadow-sm">A</span>
              <div class="min-w-0">
                <h3 class="text-label-md font-bold text-on-surface">Tu audio (analizado)</h3>
                <p class="truncate font-code text-code-sm text-on-surface-variant">{resultado.nombreArchivo}</p>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <span class="inline-block rounded bg-surface-container px-2 py-0.5 font-code text-[11px] font-semibold tabular text-primary">
                {formatearCodigoTiempo(coincidencia.inicioConsulta)} – {formatearCodigoTiempo(coincidencia.finConsulta)}
              </span>
              <p class="mt-1 text-label-sm text-on-surface-variant">{formatearDuracion(coincidencia.finConsulta - coincidencia.inicioConsulta)} de audio</p>
            </div>
          </header>

          {#if urlConsulta}
            <Reproductor
              urlAudio={urlConsulta}
              titulo={`A · ${resultado.nombreArchivo}`}
              picos={picosConsulta}
              duracionSegundos={duracionConsulta}
              regiones={regionesConsulta}
              variante="consola"
            />
          {:else}
            <div class="flex flex-1 flex-col gap-2 rounded-xl bg-[#0f172a] p-3 text-white shadow-md">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-[18px] text-amber-300" aria-hidden="true">warning</span>
                  <div>
                    <p class="text-label-md font-semibold text-white">Audio no disponible en esta visita</p>
                    <p class="text-body-sm text-white/60">El archivo subido no se persiste; vuelve a cargarlo para escuchar el fragmento.</p>
                  </div>
                </div>
                <Boton variante="primario" tamanio="sm" icono="upload_file" onclick={reanalizar}>Volver a cargar</Boton>
              </div>

              <OndaAudio
                picos={picosConsulta}
                duracion={duracionConsulta}
                posicion={0}
                regiones={regionesConsulta}
                altura={82}
                colorBase="#64748b"
                colorActivo="#5cd5fa"
                clase="bg-black/45"
              />

              <p class="flex items-start gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-code-sm text-white/65">
                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
                La región resaltada marca el tramo consultado [inicio, fin]. La onda es una representación determinista del nombre del archivo.
              </p>
            </div>
          {/if}

          <div class="mt-auto flex flex-wrap items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[14px]" aria-hidden="true">security</span>
              {urlConsulta ? 'Audio local del expediente' : 'Representación esquemática del tramo'}
            </span>
            <Insignia tono={tonoSimilitud(coincidencia.similitud)} icono="graphic_eq">
              {etiquetaSimilitud(coincidencia.similitud)}
            </Insignia>
          </div>
        </article>

        <article class="flex h-full flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 shadow-panel">
          <header class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary font-code text-code-sm font-bold text-on-secondary shadow-sm">B</span>
              <div class="min-w-0">
                <h3 class="text-label-md font-bold text-on-surface">Referencia de catálogo</h3>
                <p class="truncate text-body-sm text-on-surface-variant">{coincidencia.titulo} · {coincidencia.artista}</p>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <span class="inline-block rounded bg-surface-container px-2 py-0.5 font-code text-[11px] font-semibold tabular text-secondary">
                {formatearCodigoTiempo(coincidencia.inicioFuente)} – {formatearCodigoTiempo(coincidencia.finFuente)}
              </span>
              <p class="mt-1 text-label-sm text-on-surface-variant">{formatearDuracion(coincidencia.finFuente - coincidencia.inicioFuente)} de referencia</p>
            </div>
          </header>

          {#if urlReferencia}
            <Reproductor urlAudio={urlReferencia} titulo={`B · ${coincidencia.titulo}`} picos={picosReferencia} duracionSegundos={duracionReferencia} regiones={regionesReferencia} variante="consola" />
          {:else}
          <div class="flex flex-1 flex-col gap-1.5 rounded-xl bg-[#0f172a] p-3 shadow-md">
            <div class="flex flex-wrap items-center justify-between gap-2 text-white/55">
              <span class="font-code text-[10px] uppercase tracking-[0.08em]">Representación esquemática</span>
              <span class="font-code text-[10px]">Sin audio reproducible en la demo</span>
            </div>
            <OndaAudio
              picos={picosReferencia}
              duracion={duracionReferencia}
              posicion={0}
              regiones={regionesReferencia}
              altura={82}
              colorBase="#94a3b8"
              colorActivo="#5cd5fa"
              clase="bg-black/45"
            />
            <p class="text-code-sm text-white/50">
              {#if cancion}
                {formatearDuracion(cancion.duracionSegundos)} de referencia · {cancion.genero} · {cancion.anio}
              {:else}
                Duración de la referencia no disponible en el catálogo cargado
              {/if}
            </p>
          </div>
          {/if}

          <div class="mt-auto flex flex-wrap items-center justify-between gap-2">
            {#if !urlReferencia}<Boton variante="terciario" tamanio="sm" icono="volume_off" onclick={avisarReferencia}>Audio no disponible</Boton>{/if}
            <span class="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary-container/40 px-2.5 py-1 text-label-sm font-semibold text-on-secondary-container">
              <span class="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
              Similitud {formatearSimilitud(coincidencia.similitud)}
            </span>
          </div>

          <p class="text-body-sm text-on-surface-variant">
            {urlReferencia ? 'Reproducción del audio de referencia servido por SoupDB. La onda es esquemática y sirve como guía de alineación.' : 'Esta referencia no incluye audio reproducible. La forma de onda se deriva del identificador de la canción y sirve solo como guía de alineación.'}
          </p>
        </article>
      </div>

      <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 sm:p-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <div>
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Desplazamiento</p>
            <p class="mt-1 font-code text-code-timecode font-semibold tabular text-on-surface">
              {formatearDesplazamiento(coincidencia.desplazamientoAlineacion)}
            </p>
          </div>
          <div>
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Segmentos</p>
            <p class="mt-1 font-code text-code-timecode font-semibold tabular text-on-surface">
              {coincidencia.cantidadSegmentos}
              <span class="text-code-sm font-normal text-on-surface-variant"> × {formatearNumero(resultado.segundosPorSegmento)} s</span>
            </p>
          </div>
          <div>
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Similitud mínima</p>
            <p class="mt-1 font-code text-code-timecode font-semibold tabular text-on-surface">{formatearSimilitud(coincidencia.similitudMinima)}</p>
          </div>
          <div>
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Similitud media</p>
            <p class="mt-1 font-code text-code-timecode font-semibold tabular text-on-surface">{formatearSimilitud(coincidencia.similitud)}</p>
          </div>
          <div>
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Similitud máxima</p>
            <p class="mt-1 font-code text-code-timecode font-semibold tabular text-on-surface">{formatearSimilitud(coincidencia.similitudMaxima)}</p>
          </div>
          <div class="col-span-2 sm:col-span-1">
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Carril activo</p>
            <p class="mt-1 text-label-md font-semibold text-primary">A · consulta</p>
          </div>
        </div>

        <div class="mt-3 flex items-start gap-2 rounded-lg border border-secondary/20 bg-secondary-container/20 px-3 py-2 text-body-sm text-on-surface-variant">
          <span class="material-symbols-outlined mt-px text-[16px] text-secondary" aria-hidden="true">align_horizontal_left</span>
          <p class="texto-pretty">
            <strong class="text-on-surface">Nota de alineación.</strong>
            El tramo consultado [{formatearCodigoTiempo(coincidencia.inicioConsulta)} – {formatearCodigoTiempo(coincidencia.finConsulta)}]
            se alinea con [{formatearCodigoTiempo(coincidencia.inicioFuente)} – {formatearCodigoTiempo(coincidencia.finFuente)}]
            de la referencia. El desplazamiento es la diferencia entre el inicio de la referencia y el inicio consultado;
            un valor positivo indica que la referencia comienza más tarde.
          </p>
        </div>
      </div>
    </div>
  </section>
{/if}

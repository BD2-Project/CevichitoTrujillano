<script lang="ts">
  import type { Coincidencia, ResultadoAnalisis } from '../../datos/tipos';
  import type { RegionOnda } from '../../componentes/audio/tipos';
  import Reproductor from '../../componentes/audio/Reproductor.svelte';
  import Boton from '../../componentes/ui/Boton.svelte';
  import EstadoVacio from '../../componentes/ui/EstadoVacio.svelte';
  import { app } from '../../estado/aplicacion.svelte';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import { picosSimulados } from '../../utilidades/audio';
  import {
    formatearCodigoTiempo,
    formatearDuracion,
    formatearNumero,
    formatearSimilitud
  } from '../../utilidades/formato';
  import type { CoincidenciaIndexada } from './utiles';
  import { formatearDesplazamiento } from './utiles';

  let {
    resultado,
    coincidencia,
    indice,
    coincidencias,
    onAnterior,
    onSiguiente
  }: {
    resultado: ResultadoAnalisis;
    coincidencia: Coincidencia | null;
    indice: number | null;
    coincidencias: CoincidenciaIndexada[];
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
      ? app.urlArchivo ?? resultado.urlAudio
      : resultado.urlAudio
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

  function reanalizar() {
    app.prepararReanalisis(resultado);
  }

  function avisarReferencia() {
    app.notificar(
      'info',
      'Audio de referencia no disponible',
      `${coincidencia?.titulo ?? 'La referencia'} no tiene audio disponible.`
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
    {#if urlConsulta}
      <Reproductor urlAudio={urlConsulta} picos={picosConsulta} mostrarEncabezado={false} />
    {/if}
  </section>
{:else}
  {@const pistas = [
    {
      letra: 'A', titulo: 'Tu audio (analizado)', nombre: resultado.nombreArchivo,
      descripcion: 'Audio analizado', url: urlConsulta, picos: picosConsulta,
      duracion: duracionConsulta, regiones: regionesConsulta, solicitarAudio: reanalizar,
      inicio: coincidencia.inicioConsulta, fin: coincidencia.finConsulta
    },
    {
      letra: 'B', titulo: 'Referencia de catálogo', nombre: coincidencia.titulo,
      descripcion: `Audio de referencia · ${coincidencia.artista}`, url: urlReferencia, picos: picosReferencia,
      duracion: duracionReferencia, regiones: regionesReferencia, solicitarAudio: avisarReferencia,
      inicio: coincidencia.inicioFuente, fin: coincidencia.finFuente
    }
  ]}
  <section class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-panel" aria-labelledby="titulo-comparacion-ab">
    <header class="border-b border-outline-variant/40 p-4 sm:p-5">
      <p class="text-label-sm font-semibold uppercase tracking-[0.08em] text-primary">Laboratorio de comparación A/B</p>
      <h2 id="titulo-comparacion-ab" class="mt-0.5 text-headline-sm font-semibold text-on-surface">
        Tramo consultado frente a referencia
      </h2>
    </header>

    <div class="space-y-4 p-4 sm:p-5">
      <div class="grid gap-3 lg:grid-cols-2">
        {#each pistas as pista (pista.letra)}
          <article class="min-w-0 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 shadow-panel">
            <header class="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <span class={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-code text-code-sm font-bold shadow-sm',
                  pista.letra === 'A' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'
                ].join(' ')}>{pista.letra}</span>
                <h3 class="text-label-md font-bold text-on-surface">{pista.titulo}</h3>
              </div>
              <span class={[
                'rounded bg-surface-container px-2 py-0.5 font-code text-[11px] font-semibold tabular',
                pista.letra === 'A' ? 'text-primary' : 'text-secondary'
              ].join(' ')}>
                {formatearCodigoTiempo(pista.inicio)} – {formatearCodigoTiempo(pista.fin)}
              </span>
            </header>
            <Reproductor
              urlAudio={pista.url}
              titulo={pista.nombre}
              descripcion={pista.descripcion}
              picos={pista.picos}
              duracionSegundos={pista.duracion}
              regiones={pista.regiones}
              onSolicitarAudio={pista.solicitarAudio}
              variante="consola"
            />
          </article>
        {/each}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary-container/40 px-2.5 py-1 text-label-sm font-semibold text-on-secondary-container">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
          Similitud {formatearSimilitud(coincidencia.similitud)}
        </span>
        {#if total > 1}
          <nav class="flex items-center gap-1 rounded-lg border border-outline-variant/50 bg-surface-container-low p-0.5" aria-label="Navegar coincidencias">
            <Boton variante="fantasma" tamanio="icono" icono="chevron_left" titulo="Coincidencia anterior" deshabilitado={!puedeAnterior} onclick={onAnterior} />
            <span class="px-1 text-center font-code text-code-sm font-semibold tabular text-on-surface" aria-live="polite">
              {posicion >= 0 ? posicion + 1 : 1} / {total}
            </span>
            <Boton variante="fantasma" tamanio="icono" icono="chevron_right" titulo="Coincidencia siguiente" deshabilitado={!puedeSiguiente} onclick={onSiguiente} />
          </nav>
        {/if}
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

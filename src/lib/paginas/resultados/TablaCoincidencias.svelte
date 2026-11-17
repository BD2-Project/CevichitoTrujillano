<script lang="ts">
  import Boton from '../../componentes/ui/Boton.svelte';
  import BarraSimilitud from '../../componentes/ui/BarraSimilitud.svelte';
  import EstadoVacio from '../../componentes/ui/EstadoVacio.svelte';
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import {
    etiquetaSimilitud,
    formatearCodigoTiempo,
    formatearDuracion,
    formatearNumero,
    formatearSimilitud,
    tonoSimilitud
  } from '../../utilidades/formato';
  import type { OrdenCoincidencias } from './tipos';
  import type { CoincidenciaIndexada } from './utiles';
  import { claveCoincidencia, formatearDesplazamiento } from './utiles';

  let {
    coincidencias,
    orden,
    indiceSeleccionado,
    onCambiarOrden,
    onSeleccionar,
    onComparar
  }: {
    coincidencias: CoincidenciaIndexada[];
    orden: OrdenCoincidencias;
    indiceSeleccionado: number | null;
    onCambiarOrden: (orden: OrdenCoincidencias) => void;
    onSeleccionar: (indice: number) => void;
    onComparar: (indice: number) => void;
  } = $props();

  function alTeclearFila(evento: KeyboardEvent, indice: number) {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    evento.preventDefault();
    onSeleccionar(indice);
  }

  function comparar(evento: MouseEvent, indice: number) {
    evento.stopPropagation();
    onComparar(indice);
  }
</script>

<section class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-panel" aria-labelledby="titulo-coincidencias">
  <header class="flex flex-col gap-3 border-b border-outline-variant/40 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
    <div class="min-w-0">
      <p class="text-label-sm font-semibold uppercase tracking-[0.08em] text-secondary">Desglose técnico</p>
      <h2 id="titulo-coincidencias" class="mt-0.5 text-headline-sm font-semibold text-on-surface">
        Coincidencias detectadas
      </h2>
      <p class="mt-0.5 text-body-sm text-on-surface-variant">
        Selecciona un tramo para inspeccionarlo en la comparación A/B. El orden no altera el análisis original.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Ordenar por</span>
      <div class="inline-flex items-center rounded-lg border border-outline-variant/50 bg-surface-container-low p-0.5" role="group" aria-label="Ordenar coincidencias">
        <button
          type="button"
          class={[
            'enlace-foco inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-label-md font-semibold transition-colors',
            orden === 'similitud'
              ? 'bg-surface-container-lowest text-primary shadow-panel'
              : 'text-on-surface-variant hover:text-on-surface'
          ].join(' ')}
          aria-pressed={orden === 'similitud'}
          onclick={() => onCambiarOrden('similitud')}
        >
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">sort</span>
          Similitud
        </button>
        <button
          type="button"
          class={[
            'enlace-foco inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-label-md font-semibold transition-colors',
            orden === 'tiempo'
              ? 'bg-surface-container-lowest text-primary shadow-panel'
              : 'text-on-surface-variant hover:text-on-surface'
          ].join(' ')}
          aria-pressed={orden === 'tiempo'}
          onclick={() => onCambiarOrden('tiempo')}
        >
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
          Tiempo
        </button>
      </div>
    </div>
  </header>

  {#if coincidencias.length === 0}
    <div class="p-4 sm:p-5">
      <EstadoVacio
        icono="manage_search"
        titulo="Sin coincidencias candidatas"
        descripcion="El cotejo no devolvió tramos con evidencia en el catálogo consultado. La ausencia de coincidencias no certifica originalidad ni descarta similitud en otras condiciones de análisis."
      >
        <a href={enlace('nuevo')} class="enlace-foco rounded-lg">
          <Boton variante="primario" icono="add_circle">Analizar otro archivo</Boton>
        </a>
        <a href={enlace('historial')} class="enlace-foco rounded-lg">
          <Boton variante="secundario" icono="history">Ver historial</Boton>
        </a>
      </EstadoVacio>
    </div>
  {:else}
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full min-w-[920px] border-collapse text-left">
        <caption class="sr-only">Coincidencias candidatas del expediente, ordenadas por {orden === 'similitud' ? 'similitud descendente' : 'tiempo de aparición'}.</caption>
        <thead>
          <tr class="bg-surface-container-low/70 text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
            <th scope="col" class="w-12 px-3 py-2.5 text-right">#</th>
            <th scope="col" class="px-3 py-2.5">Canción / artista</th>
            <th scope="col" class="px-3 py-2.5">Tramo consultado</th>
            <th scope="col" class="px-3 py-2.5">Tramo en referencia</th>
            <th scope="col" class="px-3 py-2.5">Segmentos</th>
            <th scope="col" class="w-48 px-3 py-2.5">Similitud</th>
            <th scope="col" class="px-3 py-2.5 text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant/30">
          {#each coincidencias as item, posicion (claveCoincidencia(item))}
            {@const coincidencia = item.coincidencia}
            {@const seleccionada = indiceSeleccionado === item.indice}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <tr
              class={[
                'cursor-pointer align-top text-body-md transition-colors',
                seleccionada ? 'bg-primary/5' : 'hover:bg-surface-container-low/70'
              ].join(' ')}
              tabindex="0"
              aria-current={seleccionada ? 'true' : undefined}
              title={`Seleccionar ${coincidencia.titulo} para la comparación A/B`}
              onclick={() => onSeleccionar(item.indice)}
              onkeydown={(evento) => alTeclearFila(evento, item.indice)}
            >
              <td class="px-3 py-3 text-right">
                <span class={['font-code text-code-sm tabular', seleccionada ? 'font-semibold text-primary' : 'text-on-surface-variant'].join(' ')}>
                  {String(posicion + 1).padStart(2, '0')}
                </span>
              </td>

              <td class="px-3 py-3">
                <div class="flex items-start gap-2.5">
                  <span
                    class={[
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                      coincidencia.esMejorTramo ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    <span class="material-symbols-outlined text-[16px]">library_music</span>
                  </span>
                  <div class="min-w-0">
                    <p class="text-label-md font-semibold text-on-surface">{coincidencia.titulo}</p>
                    <p class="text-body-sm text-on-surface-variant">{coincidencia.artista}</p>
                    {#if coincidencia.esMejorTramo}
                      <Insignia tono="exito" icono="star" clase="mt-1">Mejor tramo</Insignia>
                    {/if}
                  </div>
                </div>
              </td>

              <td class="px-3 py-3">
                <div class="font-code text-code-sm tabular">
                  <p class="font-medium text-primary">{formatearCodigoTiempo(coincidencia.inicioConsulta)}</p>
                  <p class="text-on-surface-variant">{formatearCodigoTiempo(coincidencia.finConsulta)}</p>
                </div>
                <p class="mt-1 text-label-sm text-on-surface-variant">
                  {formatearDuracion(coincidencia.finConsulta - coincidencia.inicioConsulta)} de audio
                </p>
              </td>

              <td class="px-3 py-3">
                <div class="font-code text-code-sm tabular">
                  <p class="font-medium text-on-surface">{formatearCodigoTiempo(coincidencia.inicioFuente)}</p>
                  <p class="text-on-surface-variant">{formatearCodigoTiempo(coincidencia.finFuente)}</p>
                </div>
                <p class="mt-1 text-label-sm text-on-surface-variant">
                  Desplaz. {formatearDesplazamiento(coincidencia.desplazamientoAlineacion)}
                </p>
              </td>

              <td class="px-3 py-3">
                <span class="font-code text-code-sm font-semibold tabular text-on-surface">{coincidencia.cantidadSegmentos}</span>
                <span class="text-body-sm text-on-surface-variant"> × {formatearNumero(coincidencia.finConsulta - coincidencia.inicioConsulta > 0 && coincidencia.cantidadSegmentos > 0 ? (coincidencia.finConsulta - coincidencia.inicioConsulta) / coincidencia.cantidadSegmentos : 0, 1)} s</span>
              </td>

              <td class="px-3 py-3">
                <BarraSimilitud valor={coincidencia.similitud} ancho="compacto" />
                <p class="mt-1 text-label-sm text-on-surface-variant">{etiquetaSimilitud(coincidencia.similitud)}</p>
              </td>

              <td class="px-3 py-3 text-right">
                <Boton
                  tamanio="sm"
                  variante={seleccionada ? 'primario' : 'secundario'}
                  icono="compare_arrows"
                  onclick={(evento) => comparar(evento, item.indice)}
                >
                  Comparar
                </Boton>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="space-y-2.5 p-4 md:hidden">
      {#each coincidencias as item, posicion (claveCoincidencia(item))}
        {@const coincidencia = item.coincidencia}
        {@const seleccionada = indiceSeleccionado === item.indice}
        <article
          class={[
            'rounded-xl border p-3 transition-colors',
            seleccionada
              ? 'border-primary/35 bg-primary/5 shadow-panel'
              : 'border-outline-variant/50 bg-surface-container-low/40'
          ].join(' ')}
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-code text-[11px] tabular text-on-surface-variant">#{String(posicion + 1).padStart(2, '0')}</p>
              <h3 class="truncate text-label-md font-semibold text-on-surface">{coincidencia.titulo}</h3>
              <p class="truncate text-body-sm text-on-surface-variant">{coincidencia.artista}</p>
              {#if coincidencia.esMejorTramo}
                <Insignia tono="exito" icono="star" clase="mt-1">Mejor tramo</Insignia>
              {/if}
            </div>
            <div class="w-24 shrink-0">
              <p class="text-right font-code text-code-sm font-semibold tabular text-on-surface">{formatearSimilitud(coincidencia.similitud)}</p>
              <BarraSimilitud valor={coincidencia.similitud} mostrarValor={false} />
              <p class="mt-1 text-right text-[10px] text-on-surface-variant">{etiquetaSimilitud(coincidencia.similitud)}</p>
            </div>
          </div>

          <dl class="mt-2.5 grid grid-cols-2 gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-2">
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Consulta</dt>
              <dd class="font-code text-[11px] tabular text-primary">{formatearCodigoTiempo(coincidencia.inicioConsulta)}</dd>
              <dd class="font-code text-[11px] tabular text-on-surface-variant">{formatearCodigoTiempo(coincidencia.finConsulta)}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Referencia</dt>
              <dd class="font-code text-[11px] tabular text-on-surface">{formatearCodigoTiempo(coincidencia.inicioFuente)}</dd>
              <dd class="font-code text-[11px] tabular text-on-surface-variant">{formatearCodigoTiempo(coincidencia.finFuente)}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Segmentos</dt>
              <dd class="font-code text-[11px] tabular text-on-surface">{coincidencia.cantidadSegmentos}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Desplazamiento</dt>
              <dd class="font-code text-[11px] tabular text-on-surface">{formatearDesplazamiento(coincidencia.desplazamientoAlineacion)}</dd>
            </div>
          </dl>

          <div class="mt-2.5 flex items-center justify-end gap-2">
            <Boton
              tamanio="sm"
              variante="fantasma"
              icono={seleccionada ? 'check_circle' : 'radio_button_unchecked'}
              activo={seleccionada}
              onclick={() => onSeleccionar(item.indice)}
            >
              {seleccionada ? 'Seleccionada' : 'Seleccionar'}
            </Boton>
            <Boton
              tamanio="sm"
              variante="primario"
              icono="compare_arrows"
              onclick={() => onComparar(item.indice)}
            >
              Comparar
            </Boton>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<script lang="ts">
  import BarraSimilitud from '../../componentes/ui/BarraSimilitud.svelte';
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import { app } from '../../estado/aplicacion.svelte';
  import type { ResumenAnalisis } from '../../datos/tipos';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import {
    abreviarId,
    copiarTexto,
    etiquetaEstado,
    etiquetaSimilitud,
    formatearFecha,
    formatearNumero,
    formatearRelativo,
    formatearSimilitud,
    tonoEstado
  } from '../../utilidades/formato';
  import AccionesAnalisis from './AccionesAnalisis.svelte';
  import TarjetaAnalisis from './TarjetaAnalisis.svelte';
  import {
    detalleTecnico,
    iconoEstado,
    metadatosArchivo,
    textoCanciones,
    textoCoincidencias
  } from './presentacion';

  let {
    items,
    total,
    pagina,
    totalPaginas,
    tamanoPagina,
    onPagina
  }: {
    items: ResumenAnalisis[];
    total: number;
    pagina: number;
    totalPaginas: number;
    tamanoPagina: number;
    onPagina: (pagina: number) => void;
  } = $props();

  const inicioRango = $derived(total === 0 ? 0 : (pagina - 1) * tamanoPagina + 1);
  const finRango = $derived(Math.min(pagina * tamanoPagina, total));
  const totalCatalogo = $derived(app.catalogo.length);

  function paginasVisibles(actual: number, cantidad: number): number[] {
    const maximo = 5;
    if (cantidad <= maximo) {
      return Array.from({ length: cantidad }, (_, indice) => indice + 1);
    }
    const inicio = Math.min(Math.max(1, actual - 2), cantidad - maximo + 1);
    return Array.from({ length: maximo }, (_, indice) => inicio + indice);
  }

  const paginas = $derived(paginasVisibles(pagina, totalPaginas));

  async function copiarId(item: ResumenAnalisis) {
    const copiado = await copiarTexto(item.idAnalisis);
    app.notificar(
      copiado ? 'exito' : 'advertencia',
      copiado ? 'ID copiado' : 'No se pudo copiar el ID',
      copiado ? item.idAnalisis : 'El navegador bloqueó el acceso al portapapeles.'
    );
  }
</script>

<section
  class="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-panel"
  aria-label="Listado de análisis"
>
  <div class="hidden overflow-x-auto lg:block">
    <table class="w-full border-collapse text-left">
      <caption class="sr-only">
        Historial de análisis acústicos: {formatearNumero(total)} expedientes encontrados.
      </caption>
      <thead>
        <tr
          class="border-b border-outline-variant/50 bg-surface-container-low text-label-sm uppercase tracking-[0.05em] text-on-surface-variant"
        >
          <th scope="col" class="px-4 py-3 font-semibold">Expediente / fecha</th>
          <th scope="col" class="px-3 py-3 font-semibold">Archivo fuente</th>
          <th scope="col" class="px-3 py-3 font-semibold">Canciones</th>
          <th scope="col" class="px-3 py-3 font-semibold">Coincidencias</th>
          <th scope="col" class="px-3 py-3 font-semibold">Estado</th>
          <th scope="col" class="px-4 py-3 text-right font-semibold">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-outline-variant/40">
        {#each items as item (item.idAnalisis)}
          <tr class="group align-top transition-colors hover:bg-surface-container-low/70">
            <td class="px-4 py-3.5">
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-1.5">
                  <a
                    href={enlace('resultados', { id: item.idAnalisis })}
                    class="enlace-foco rounded font-code text-code-timecode font-semibold text-primary hover:underline"
                    title={`Abrir el análisis ${item.idAnalisis}`}
                  >
                    #{abreviarId(item.idAnalisis, 8)}
                  </a>
                  <button
                    type="button"
                    class="enlace-foco flex h-6 w-6 items-center justify-center rounded text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                    title="Copiar el ID completo"
                    aria-label={`Copiar el ID del análisis ${abreviarId(item.idAnalisis, 8)}`}
                    onclick={() => copiarId(item)}
                  >
                    <span class="material-symbols-outlined text-[14px]" aria-hidden="true">content_copy</span>
                  </button>
                </div>
                <span class="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  <span class="material-symbols-outlined text-[13px]" aria-hidden="true">schedule</span>
                  {formatearRelativo(item.creadoEn)}
                </span>
                <span
                  class="font-code text-[10px] text-on-surface-variant/80"
                  title={formatearFecha(item.creadoEn)}
                >
                  {formatearFecha(item.creadoEn, true)}
                </span>
              </div>
            </td>

            <td class="px-3 py-3.5">
              <div class="flex items-start gap-2.5">
                <div
                  class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-fixed/40 text-primary"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">audio_file</span>
                </div>
                <div class="min-w-0">
                  <p
                    class="max-w-[15rem] truncate text-label-md font-semibold text-on-surface"
                    title={item.nombreArchivo}
                  >
                    {item.nombreArchivo}
                  </p>
                  <p class="font-code text-code-sm text-on-surface-variant">{metadatosArchivo(item)}</p>
                  {#if detalleTecnico(item)}
                    <p class="text-label-sm text-on-surface-variant/80">{detalleTecnico(item)}</p>
                  {/if}
                </div>
              </div>
            </td>

            <td class="px-3 py-3.5">
              <div class="flex flex-col gap-0.5">
                <span class="text-label-md font-medium text-on-surface">
                  {textoCanciones(item.cantidadCanciones)}
                </span>
                <span class="text-body-sm text-on-surface-variant">
                  {totalCatalogo > 0 ? `de ${formatearNumero(totalCatalogo)} en el catálogo` : 'Catálogo no cargado'}
                </span>
                <span class="font-code text-[10px] text-tertiary">Índice HNSW</span>
              </div>
            </td>

            <td class="px-3 py-3.5">
              <div class="flex max-w-[16rem] flex-col gap-1.5">
                <Insignia
                  tono={item.cantidadCoincidencias > 0 ? 'info' : 'neutro'}
                  icono={item.cantidadCoincidencias > 0 ? 'fingerprint' : 'search_off'}
                >
                  {textoCoincidencias(item.cantidadCoincidencias)}
                </Insignia>
                {#if item.mejorSimilitud !== null}
                  <div class="flex items-center gap-2">
                    <div class="w-24">
                      <BarraSimilitud valor={item.mejorSimilitud} mostrarValor={false} />
                    </div>
                    <span class="font-code text-code-sm font-semibold tabular text-on-surface">
                      {formatearSimilitud(item.mejorSimilitud)}
                    </span>
                  </div>
                  <span class="text-label-sm text-on-surface-variant">
                    {etiquetaSimilitud(item.mejorSimilitud)}
                  </span>
                {:else}
                  <span class="text-body-sm text-on-surface-variant">
                    Sin coincidencias candidatas registradas.
                  </span>
                {/if}
              </div>
            </td>

            <td class="px-3 py-3.5">
              <div class="flex flex-col items-start gap-1">
                <Insignia tono={tonoEstado(item.estado)} icono={iconoEstado(item.estado)}>
                  {etiquetaEstado(item.estado)}
                </Insignia>
                {#if item.nota}
                  <p
                    class="recorte-2 max-w-[12rem] text-label-sm leading-snug text-on-surface-variant"
                    title={item.nota}
                  >
                    {item.nota}
                  </p>
                {/if}
              </div>
            </td>

            <td class="px-4 py-3.5 text-right">
              <AccionesAnalisis {item} variante="tabla" />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="bg-surface-container-low/30 p-3 lg:hidden">
    <div class="space-y-2.5">
      {#each items as item (item.idAnalisis)}
        <TarjetaAnalisis {item} />
      {/each}
    </div>
  </div>

  <footer
    class="flex flex-col gap-2 border-t border-outline-variant/50 bg-surface-container-low px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="text-body-sm text-on-surface-variant" aria-live="polite">
      Mostrando
      <span class="font-semibold tabular text-on-surface">{inicioRango}–{finRango}</span>
      de
      <span class="font-semibold tabular text-on-surface">{formatearNumero(total)}</span>
      expedientes
      <span class="ml-1 hidden text-label-sm sm:inline">· {tamanoPagina} por página</span>
    </p>

    <nav class="flex items-center justify-between gap-1 sm:justify-end" aria-label="Paginación del historial">
      <button
        type="button"
        class="enlace-foco flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-40"
        aria-label="Página anterior"
        disabled={pagina <= 1}
        onclick={() => onPagina(pagina - 1)}
      >
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
      </button>

      <div class="flex items-center gap-1">
        {#each paginas as numero (numero)}
          <button
            type="button"
            class={[
              'enlace-foco flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-label-md font-semibold tabular transition-colors',
              numero === pagina
                ? 'bg-primary text-on-primary shadow-sm'
                : 'border border-outline-variant/50 bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            ].join(' ')}
            aria-label={`Ir a la página ${numero}`}
            aria-current={numero === pagina ? 'page' : undefined}
            onclick={() => onPagina(numero)}
          >
            {numero}
          </button>
        {/each}
      </div>

      <button
        type="button"
        class="enlace-foco flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:pointer-events-none disabled:opacity-40"
        aria-label="Página siguiente"
        disabled={pagina >= totalPaginas}
        onclick={() => onPagina(pagina + 1)}
      >
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
      </button>
    </nav>
  </footer>
</section>

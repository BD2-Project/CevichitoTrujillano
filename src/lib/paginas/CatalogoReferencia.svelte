<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../estado/aplicacion.svelte';
  import { enlace, enrutador } from '../navegacion/enrutador.svelte';
  import { cliente } from '../servicios';
  import { COEFICIENTES_MFCC, SEGUNDOS_POR_SEGMENTO } from '../datos/constantes';
  import type { CancionCatalogo, DetalleCancion } from '../datos/tipos';
  import EncabezadoPagina from '../componentes/ui/EncabezadoPagina.svelte';
  import TarjetaMetrica from '../componentes/ui/TarjetaMetrica.svelte';
  import EstadoVacio from '../componentes/ui/EstadoVacio.svelte';
  import Boton from '../componentes/ui/Boton.svelte';
  import FilaCatalogo from './catalogo/FilaCatalogo.svelte';
  import TarjetaCatalogo from './catalogo/TarjetaCatalogo.svelte';
  import PanelDetalle from './catalogo/PanelDetalle.svelte';
  import { formatearNumero, normalizarBusqueda } from '../utilidades/formato';

  type Vista = 'lista' | 'cuadricula';
  type OrdenCatalogo = 'titulo' | 'artista' | 'duracion' | 'segmentos' | 'anio';

  const TAMANO_PAGINA = 12;
  const colador = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

  const claseEnlaceSecundario =
    'enlace-foco inline-flex h-9 items-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3.5 text-label-md font-medium text-on-surface shadow-sm transition-colors hover:bg-surface-container-low';
  const claseEnlacePrimario =
    'enlace-foco inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-label-md font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container';

  let busqueda = $state('');
  let genero = $state('todos');
  let coleccion = $state('todas');
  let anio = $state('todos');
  let orden = $state<OrdenCatalogo>('titulo');
  let vista = $state<Vista>('lista');
  let limite = $state(TAMANO_PAGINA);

  let seleccionadaId = $state<number | null>(null);
  let detalle = $state<DetalleCancion | null>(null);
  let cargandoDetalle = $state(false);
  let errorDetalle = $state<string | null>(null);
  let tokenDetalle = 0;
  let panelRef = $state<HTMLDivElement | null>(null);

  const esDemo = $derived(app.estadoConexion.modo === 'demo');

  const cargandoCatalogo = $derived(app.cargandoInicial && app.catalogo.length === 0);

  const colecciones = $derived.by(() => {
    const conteo = new Map<string, number>();
    for (const cancion of app.catalogo) {
      conteo.set(cancion.coleccion, (conteo.get(cancion.coleccion) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .sort((a, b) => colador.compare(a[0], b[0]))
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));
  });

  const generosObservados = $derived.by(() => {
    return [...new Set(app.catalogo.map((cancion) => cancion.genero).filter(Boolean))]
      .sort((a, b) => colador.compare(a, b));
  });

  const conteoGeneros = $derived.by(() => {
    const conteo = new Map<string, number>();
    for (const cancion of app.catalogo) {
      conteo.set(cancion.genero, (conteo.get(cancion.genero) ?? 0) + 1);
    }
    return conteo;
  });

  const aniosDisponibles = $derived.by(() =>
    [...new Set(app.catalogo.map((cancion) => cancion.anio).filter((valor) => valor > 0))].sort((a, b) => b - a)
  );

  const firmaFiltros = $derived([busqueda, genero, coleccion, anio, orden].join('\u0000'));

  $effect(() => {
    void firmaFiltros;
    limite = TAMANO_PAGINA;
  });

  const hayFiltros = $derived(
    busqueda.trim() !== '' ||
      genero !== 'todos' ||
      coleccion !== 'todas' ||
      anio !== 'todos' ||
      orden !== 'titulo'
  );

  const referenciasFiltradas = $derived.by(() => {
    const termino = normalizarBusqueda(busqueda);
    const filtradas = app.catalogo.filter((cancion) => {
      if (genero !== 'todos' && cancion.genero !== genero) return false;
      if (coleccion !== 'todas' && cancion.coleccion !== coleccion) return false;
      if (anio !== 'todos' && String(cancion.anio) !== anio) return false;
      if (!termino) return true;
      const contenido = normalizarBusqueda(
        `${cancion.titulo} ${cancion.artista} ${cancion.coleccion} ${cancion.genero}`
      );
      return contenido.includes(termino);
    });

    return filtradas.sort((a, b) => {
      switch (orden) {
        case 'titulo':
          return colador.compare(a.titulo, b.titulo);
        case 'artista':
          return colador.compare(a.artista, b.artista) || colador.compare(a.titulo, b.titulo);
        case 'duracion':
          return b.duracionSegundos - a.duracionSegundos || colador.compare(a.titulo, b.titulo);
        case 'segmentos':
          return b.cantidadSegmentos - a.cantidadSegmentos || colador.compare(a.titulo, b.titulo);
        case 'anio':
          return b.anio - a.anio || colador.compare(a.titulo, b.titulo);
      }
    });
  });

  const visibles = $derived(referenciasFiltradas.slice(0, limite));
  const restantes = $derived(Math.max(0, referenciasFiltradas.length - visibles.length));
  const resumenSeleccionado = $derived(
    app.catalogo.find((cancion) => cancion.idCancion === seleccionadaId) ?? null
  );

  function limpiarFiltros() {
    busqueda = '';
    genero = 'todos';
    coleccion = 'todas';
    anio = 'todos';
    orden = 'titulo';
  }

  async function cargarDetalle(idCancion: number): Promise<void> {
    const token = ++tokenDetalle;
    detalle = null;
    errorDetalle = null;
    cargandoDetalle = true;
    try {
      const datos = await cliente.obtenerCancion(idCancion);
      if (token !== tokenDetalle) return;
      if (!datos) {
        errorDetalle = `No existe una referencia con el identificador ${idCancion}.`;
        return;
      }
      detalle = datos;
    } catch (error) {
      if (token !== tokenDetalle) return;
      errorDetalle = error instanceof Error ? error.message : 'Error desconocido al leer la referencia.';
    } finally {
      if (token === tokenDetalle) cargandoDetalle = false;
    }
  }

  async function seleccionar(cancion: CancionCatalogo): Promise<void> {
    if (seleccionadaId === cancion.idCancion) return;
    seleccionadaId = cancion.idCancion;
    const carga = cargarDetalle(cancion.idCancion);
    await tick();
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      panelRef?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    await carga;
  }

  function cerrarDetalle() {
    tokenDetalle += 1;
    seleccionadaId = null;
    detalle = null;
    errorDetalle = null;
    cargandoDetalle = false;
  }

  function reintentarDetalle() {
    if (resumenSeleccionado) void cargarDetalle(resumenSeleccionado.idCancion);
  }

  function notificarSinAudio() {
    app.notificar(
      'info',
      'La referencia no tiene audio disponible',
      esDemo ? 'El catálogo de demostración no incluye archivos reproducibles. La forma de onda es esquemática.' : 'El servicio no proporcionó una URL de audio reproducible para esta referencia.'
    );
  }

  function alTeclear(evento: KeyboardEvent) {
    if (evento.key === 'Escape' && seleccionadaId !== null && !enrutador.modal) {
      cerrarDetalle();
    }
  }
</script>

<svelte:window onkeydown={alTeclear} />

<div class="space-y-4">
  <EncabezadoPagina
    etiqueta="Base de datos acústica"
    titulo="Catálogo de referencia acústica"
    icono="library_music"
  >
    {#snippet acciones()}
      {#if esDemo}
      <a
        href={enlace('catalogo', {}, { modal: 'importar' })}
        class={claseEnlaceSecundario}
        title="Importar un lote de referencias locales"
      >
        <span class="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">drive_folder_upload</span>
        Importar dataset / lote
      </a>
      <a
        href={enlace('catalogo', {}, { modal: 'agregar' })}
        class={claseEnlacePrimario}
        title="Añadir una referencia al catálogo"
      >
        <span class="material-symbols-outlined text-[19px]" aria-hidden="true">add</span>
        Añadir nueva referencia
      </a>
      {:else}
        <span class="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-label-md text-on-surface-variant" title="El servicio declara catalog_mutable: false; no expone altas ni importación en ejecución."><span class="material-symbols-outlined text-[18px]" aria-hidden="true">lock</span>Catálogo de solo lectura</span>
        <Boton icono="refresh" cargando={app.cargandoDatos} onclick={() => void app.recargarCatalogo()}>Actualizar catálogo</Boton>
      {/if}
    {/snippet}
  </EncabezadoPagina>

  {#if cargandoCatalogo}
    <section class="space-y-3" aria-busy="true" aria-live="polite">
      <span class="sr-only">Cargando el catálogo de referencia acústica…</span>
      <div class="grid gap-3 sm:grid-cols-3">
        {#each [0, 1, 2] as marcador (marcador)}
          <div class="h-[104px] animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-low"></div>
        {/each}
      </div>
      <div class="h-[92px] animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-low"></div>
      <div class="h-[320px] animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-low"></div>
    </section>
  {:else}
    <section class="grid gap-3 sm:grid-cols-3" aria-label="Métricas del catálogo">
      <TarjetaMetrica
        etiqueta="Obras indexadas"
        valor={formatearNumero(app.catalogo.length)}
        unidad="títulos"
        icono="album"
        tono="primario"
      />
      <TarjetaMetrica
        etiqueta="Segmentos"
        valor={formatearNumero(app.totalSegmentosCatalogo)}
        unidad="ventanas"
        detalle={`Ventanas de ${SEGUNDOS_POR_SEGMENTO} s · ${COEFICIENTES_MFCC} MFCC`}
        icono="segment"
        tono="info"
      />
      <TarjetaMetrica
        etiqueta="Colecciones"
        valor={formatearNumero(colecciones.length)}
        unidad={colecciones.length === 1 ? 'agrupación' : 'agrupaciones'}
        detalle={colecciones.length === 0 ? 'Sin colecciones declaradas' : colecciones.map((item) => item.nombre).join(' · ')}
        icono="folder_special"
        tono="neutro"
      />
    </section>

    <section class="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-panel" aria-label="Filtros del catálogo">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div class="min-w-0 flex-1">
          <label for="busqueda-catalogo" class="sr-only">Buscar referencias por título, artista o colección</label>
          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-on-surface-variant" aria-hidden="true">search</span>
            <input
              id="busqueda-catalogo"
              type="search"
              class="campo-entrada pl-10"
              placeholder="Buscar por título, artista o colección…"
              autocomplete="off"
              spellcheck="false"
              bind:value={busqueda}
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-auto">
          <div>
            <label for="filtro-genero" class="sr-only">Filtrar por género</label>
            <div class="relative">
              <select id="filtro-genero" class="campo-selector py-2 text-label-md" bind:value={genero}>
                <option value="todos">Todos los géneros</option>
                {#each generosObservados as opcion (opcion)}
                  <option value={opcion}>{opcion} ({conteoGeneros.get(opcion) ?? 0})</option>
                {/each}
              </select>
              <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">expand_more</span>
            </div>
          </div>

          <div>
            <label for="filtro-coleccion" class="sr-only">Filtrar por colección</label>
            <div class="relative">
              <select id="filtro-coleccion" class="campo-selector py-2 text-label-md" bind:value={coleccion}>
                <option value="todas">Todas las colecciones</option>
                {#each colecciones as item (item.nombre)}
                  <option value={item.nombre}>{item.nombre} ({item.cantidad})</option>
                {/each}
              </select>
              <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">expand_more</span>
            </div>
          </div>

          <div>
            <label for="filtro-anio" class="sr-only">Filtrar por año</label>
            <div class="relative">
              <select id="filtro-anio" class="campo-selector py-2 text-label-md" bind:value={anio}>
                <option value="todos">Todos los años</option>
                {#each aniosDisponibles as opcion (opcion)}
                  <option value={String(opcion)}>{opcion}</option>
                {/each}
              </select>
              <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">expand_more</span>
            </div>
          </div>

          <div>
            <label for="orden-catalogo" class="sr-only">Ordenar referencias</label>
            <div class="relative">
              <select id="orden-catalogo" class="campo-selector py-2 text-label-md" bind:value={orden}>
                <option value="titulo">Título A–Z</option>
                <option value="artista">Artista A–Z</option>
                <option value="duracion">Duración (mayor)</option>
                <option value="segmentos">Segmentos (mayor)</option>
                <option value="anio">Año (más reciente)</option>
              </select>
              <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[17px] text-on-surface-variant" aria-hidden="true">sort</span>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <div class="flex items-center gap-0.5 rounded-lg border border-outline-variant/50 bg-surface-container-low p-0.5" role="group" aria-label="Modo de visualización">
            <button
              type="button"
              class={[
                'enlace-foco inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                vista === 'lista' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              ].join(' ')}
              aria-pressed={vista === 'lista'}
              aria-label="Vista de lista"
              title="Vista de lista"
              onclick={() => (vista = 'lista')}
            >
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">view_list</span>
            </button>
            <button
              type="button"
              class={[
                'enlace-foco inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                vista === 'cuadricula' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              ].join(' ')}
              aria-pressed={vista === 'cuadricula'}
              aria-label="Vista de cuadrícula"
              title="Vista de cuadrícula"
              onclick={() => (vista = 'cuadricula')}
            >
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/50 pt-2.5">
        <p class="text-body-sm text-on-surface-variant" aria-live="polite">
          Mostrando <strong class="text-on-surface">{formatearNumero(visibles.length)}</strong> de
          <strong class="text-on-surface">{formatearNumero(referenciasFiltradas.length)}</strong>
          {referenciasFiltradas.length === 1 ? 'referencia' : 'referencias'}
          {#if hayFiltros}<span class="ml-1 text-primary">· filtros activos</span>{/if}
        </p>
        <Boton
          tamanio="sm"
          variante={hayFiltros ? 'contorno' : 'fantasma'}
          icono="filter_alt_off"
          deshabilitado={!hayFiltros}
          onclick={limpiarFiltros}
        >
          Limpiar filtros
        </Boton>
      </div>
    </section>

    {#if esDemo}
      <div class="flex items-start gap-2.5 rounded-xl border border-advertencia/30 bg-advertencia-suave p-3 text-body-sm text-amber-900">
        <span class="material-symbols-outlined mt-0.5 text-[19px] text-advertencia" aria-hidden="true">info</span>
        <p>
          <strong class="font-semibold">Catálogo local de demostración.</strong>
          Las obras base y las referencias que añadas se resuelven en este navegador; las nuevas se
          guardan en el almacenamiento local. Esta build no ejecuta una indexación vectorial real ni
          envía el catálogo a un servicio remoto.
        </p>
      </div>
    {/if}

    <div class={['grid min-w-0 grid-cols-1 items-start gap-4', resumenSeleccionado ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''].join(' ')}>
      {#if resumenSeleccionado}
        <div
          bind:this={panelRef}
          class="order-first scroll-mt-4 xl:order-2 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto"
        >
          <PanelDetalle
            cancion={resumenSeleccionado}
            {detalle}
            cargando={cargandoDetalle}
            error={errorDetalle}
            onCerrar={cerrarDetalle}
            onReintentar={reintentarDetalle}
            onSolicitarAudio={notificarSinAudio}
          />
        </div>
      {/if}

      <section class="order-last min-w-0 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-panel xl:order-1" aria-label="Referencias del catálogo">
        <div class="flex items-center gap-2 border-b border-outline-variant/50 px-4 py-2.5">
          <span class="material-symbols-outlined text-[19px] text-primary" aria-hidden="true">library_music</span>
          <h2 class="text-headline-sm font-semibold text-on-surface">Referencias del catálogo</h2>
        </div>

        {#if app.catalogo.length === 0}
          <div class="p-4">
            <EstadoVacio
              icono="library_music"
              titulo="El catálogo está vacío"
              descripcion={esDemo ? 'Añade una obra de referencia o importa un lote para que el cotejo tenga contra qué comparar.' : 'Comprueba la conexión y prepara el catálogo en SoupDB. El servicio no permite añadir referencias durante la ejecución.'}
            >
              {#if esDemo}
              <a href={enlace('catalogo', {}, { modal: 'agregar' })} class={claseEnlacePrimario}>
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                Añadir nueva referencia
              </a>
              <a href={enlace('catalogo', {}, { modal: 'importar' })} class={claseEnlaceSecundario}>
                <span class="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">drive_folder_upload</span>
                Importar dataset / lote
              </a>
              {:else}
                <Boton icono="refresh" cargando={app.cargandoDatos} onclick={() => void app.recargarCatalogo()}>Reintentar conexión</Boton>
              {/if}
            </EstadoVacio>
          </div>
        {:else if referenciasFiltradas.length === 0}
          <div class="p-4">
            <EstadoVacio
              compacto
              icono="search_off"
              titulo="Ninguna referencia coincide"
              descripcion="Ajusta la búsqueda o los filtros de género, colección y año para ver resultados."
            >
              <Boton tamanio="sm" variante="secundario" icono="filter_alt_off" onclick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            </EstadoVacio>
          </div>
        {:else if vista === 'lista'}
          <div class="relative overflow-x-auto">
            <table class="w-full min-w-[1040px] border-collapse text-left">
              <caption class="sr-only">Referencias acústicas del catálogo con sus metadatos</caption>
              <thead>
                <tr class="select-none bg-surface-container-low/70 text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">
                  <th scope="col" class="px-3 py-2 pl-4 font-semibold">Obra y artista</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Colección</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Duración</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Segmentos</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Género</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Año</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Licencia</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Origen</th>
                  <th scope="col" class="px-3 py-2 pr-4 text-right font-semibold"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {#each visibles as cancion (cancion.idCancion)}
                  <FilaCatalogo
                    {cancion}
                    seleccionada={cancion.idCancion === seleccionadaId}
                    onSeleccionar={seleccionar}
                  />
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {#each visibles as cancion (cancion.idCancion)}
              <TarjetaCatalogo
                {cancion}
                seleccionada={cancion.idCancion === seleccionadaId}
                onSeleccionar={seleccionar}
              />
            {/each}
          </div>
        {/if}

        <div class="flex flex-col gap-2 border-t border-outline-variant/50 bg-surface-container-low/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1 font-code text-code-sm text-on-surface-variant">
            <span>{formatearNumero(app.catalogo.length)} obras</span>
            <span class="h-1 w-1 rounded-full bg-outline-variant" aria-hidden="true"></span>
            <span>{formatearNumero(app.totalSegmentosCatalogo)} segmentos</span>
            <span class="h-1 w-1 rounded-full bg-outline-variant" aria-hidden="true"></span>
            <span class="text-secondary">{esDemo ? 'Datos locales' : 'Datos de SoupDB'}</span>
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-body-sm text-on-surface-variant">
              {formatearNumero(visibles.length)} de {formatearNumero(referenciasFiltradas.length)}
            </span>
            {#if restantes > 0}
              <Boton
                tamanio="sm"
                variante="secundario"
                icono="expand_more"
                onclick={() => {
                  limite += TAMANO_PAGINA;
                }}
              >
                Cargar más ({formatearNumero(restantes)})
              </Boton>
            {/if}
          </div>
        </div>
      </section>
    </div>

  {/if}
</div>

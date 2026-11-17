<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from '../componentes/ui/Modal.svelte';
  import Boton from '../componentes/ui/Boton.svelte';
  import Insignia from '../componentes/ui/Insignia.svelte';
  import { app } from '../estado/aplicacion.svelte';
  import { CATALOGO_PREDETERMINADO, GENEROS, SEGUNDOS_POR_SEGMENTO } from '../datos/constantes';
  import type { CancionCatalogo, ReferenciaNueva, ResultadoImportacion } from '../datos/tipos';
  import { descargarBlob, formatearDuracion, formatearNumero } from '../utilidades/formato';
  import { analizarCsv, csvEjemplo, plantillaCsv } from './importacionCsv';

  type Pestana = 'agregar' | 'importar';
  type Campo = 'titulo' | 'artista' | 'anio' | 'duracion' | 'ruta';
  type Errores = Partial<Record<Campo, string>>;

  interface FormularioReferencia {
    titulo: string;
    artista: string;
    anio: string;
    genero: string;
    coleccion: string;
    duracion: string;
    ruta: string;
    licencia: string;
  }

  let {
    pestanaInicial = 'agregar',
    onCerrar
  }: { pestanaInicial?: string; onCerrar: () => void } = $props();

  const ANIO_ACTUAL = new Date().getFullYear();
  const ORDEN_CAMPOS: readonly Campo[] = ['titulo', 'artista', 'anio', 'duracion', 'ruta'];

  let pestana = $state<Pestana>(untrack(() => pestanaInicial === 'importar' ? 'importar' : 'agregar'));
  let tabAgregar = $state<HTMLButtonElement | null>(null);
  let tabImportar = $state<HTMLButtonElement | null>(null);

  let formulario = $state<FormularioReferencia>({
    titulo: '',
    artista: '',
    anio: String(ANIO_ACTUAL),
    genero: GENEROS[4] ?? 'Instrumental',
    coleccion: CATALOGO_PREDETERMINADO,
    duracion: '',
    ruta: '',
    licencia: ''
  });
  let errores = $state<Errores>({});
  let enviando = $state(false);
  let referenciaCreada = $state<CancionCatalogo | null>(null);

  let textoCsv = $state('');
  let nombreArchivoCsv = $state<string | null>(null);
  let leyendoArchivo = $state(false);
  let importando = $state(false);
  let resultadoImportacion = $state<ResultadoImportacion | null>(null);
  let omitidasLocales = $state(0);

  const analisis = $derived(analizarCsv(textoCsv));
  const permiteEscritura = $derived(app.estadoConexion.modo === 'demo');
  const colecciones = $derived(
    Array.from(
      new Set([CATALOGO_PREDETERMINADO, ...app.catalogo.map((cancion) => cancion.coleccion).filter(Boolean)])
    )
  );
  const formularioCompleto = $derived(
    formulario.titulo.trim() !== '' &&
      formulario.artista.trim() !== '' &&
      formulario.duracion.trim() !== '' &&
      formulario.ruta.trim() !== ''
  );
  const omitidasTotales = $derived(
    (resultadoImportacion?.omitidas ?? 0) + omitidasLocales
  );

  function mensajeDe(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido.';
  }

  function validarFormulario(): Errores {
    const encontrados: Errores = {};
    if (!formulario.titulo.trim()) encontrados.titulo = 'El título es obligatorio.';
    if (!formulario.artista.trim()) encontrados.artista = 'El artista es obligatorio.';

    const textoAnio = formulario.anio.trim();
    if (textoAnio) {
      const anio = Number(textoAnio);
      if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) {
        encontrados.anio = 'El año debe estar entre 1900 y 2100.';
      }
    }

    const textoDuracion = formulario.duracion.trim();
    const duracion = Number(textoDuracion.replace(',', '.'));
    if (!textoDuracion) {
      encontrados.duracion = 'Indica la duración en segundos.';
    } else if (!Number.isFinite(duracion) || duracion < 2.5 || duracion > 3600) {
      encontrados.duracion = 'La duración debe estar entre 2,5 y 3600 segundos.';
    }

    if (!formulario.ruta.trim()) {
      encontrados.ruta = 'Indica la ruta del audio de referencia.';
    } else if (formulario.ruta.includes('#')) {
      encontrados.ruta = 'La ruta no debe contener «#».';
    }

    return encontrados;
  }

  function validarCampo(campo: Campo): void {
    const todos = validarFormulario();
    const siguiente: Errores = { ...errores };
    if (todos[campo]) siguiente[campo] = todos[campo];
    else delete siguiente[campo];
    errores = siguiente;
  }

  function enfocarPrimerError(encontrados: Errores): void {
    const campo = ORDEN_CAMPOS.find((item) => encontrados[item]);
    if (campo) document.getElementById(`referencia-${campo}`)?.focus();
  }

  function reiniciarFormulario(): void {
    formulario = {
      titulo: '',
      artista: '',
      anio: String(ANIO_ACTUAL),
      genero: GENEROS[4] ?? 'Instrumental',
      coleccion: CATALOGO_PREDETERMINADO,
      duracion: '',
      ruta: '',
      licencia: ''
    };
    errores = {};
    referenciaCreada = null;
  }

  async function guardarReferencia(): Promise<void> {
    if (enviando || !permiteEscritura) return;
    const encontrados = validarFormulario();
    errores = encontrados;
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(encontrados);
      return;
    }

    enviando = true;
    try {
      const duracion = Number(formulario.duracion.trim().replace(',', '.'));
      const referencia: ReferenciaNueva = {
        titulo: formulario.titulo.trim(),
        artista: formulario.artista.trim(),
        anio: Number(formulario.anio.trim()) || ANIO_ACTUAL,
        genero: formulario.genero,
        coleccion: formulario.coleccion.trim() || CATALOGO_PREDETERMINADO,
        duracionSegundos: Number(duracion.toFixed(2)),
        rutaAudio: formulario.ruta.trim(),
        licencia: formulario.licencia.trim() || undefined
      };
      referenciaCreada = await app.agregarReferencia(referencia);
    } catch (error) {
      app.notificar('peligro', 'No se pudo añadir la referencia', mensajeDe(error));
    } finally {
      enviando = false;
    }
  }

  async function importarLote(): Promise<void> {
    if (importando || analisis.validas === 0 || !permiteEscritura) return;
    importando = true;
    omitidasLocales = analisis.omitidas;
    try {
      const referencias = analisis.filas
        .filter((fila) => fila.valida)
        .map((fila) => fila.referencia);
      resultadoImportacion = await app.importarDataset(referencias);
    } catch (error) {
      app.notificar('peligro', 'No se pudo importar el dataset', mensajeDe(error));
    } finally {
      importando = false;
    }
  }

  function reiniciarImportacion(): void {
    textoCsv = '';
    nombreArchivoCsv = null;
    resultadoImportacion = null;
    omitidasLocales = 0;
  }

  function cargarEjemplo(): void {
    textoCsv = csvEjemplo();
    nombreArchivoCsv = 'ejemplo-referencias.csv';
    resultadoImportacion = null;
    omitidasLocales = 0;
  }

  function descargarPlantilla(): void {
    const blob = new Blob([`\uFEFF${plantillaCsv()}`], { type: 'text/csv;charset=utf-8' });
    descargarBlob(blob, 'audiotrace-plantilla-catalogo.csv');
    app.notificar('info', 'Plantilla descargada', 'Incluye las ocho cabeceras admitidas y tres filas de ejemplo.');
  }

  async function alSeleccionarArchivo(evento: Event): Promise<void> {
    const entrada = evento.currentTarget as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    leyendoArchivo = true;
    try {
      textoCsv = await archivo.text();
      nombreArchivoCsv = archivo.name;
      resultadoImportacion = null;
      omitidasLocales = 0;
    } catch (error) {
      app.notificar('peligro', 'No se pudo leer el archivo', mensajeDe(error));
    } finally {
      leyendoArchivo = false;
      entrada.value = '';
    }
  }

  function cambiarPestana(nueva: Pestana, enfocar = false): void {
    if (nueva === pestana) return;
    pestana = nueva;
    if (enfocar) {
      const destino = nueva === 'agregar' ? tabAgregar : tabImportar;
      requestAnimationFrame(() => destino?.focus());
    }
  }

  function alTeclearPestanas(evento: KeyboardEvent): void {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    evento.preventDefault();
    cambiarPestana(pestana === 'agregar' ? 'importar' : 'agregar', true);
  }
</script>

<Modal
  abierto={true}
  titulo="Añadir al catálogo de referencia"
  subtitulo={permiteEscritura
    ? 'Incorpora referencias locales de demostración para futuros cotejos.'
    : 'Vista previa de altas e importaciones; el catálogo del servicio es de solo lectura.'}
  icono="library_music"
  ancho="lg"
  onCerrar={onCerrar}
>
  <div class="space-y-4">
    {#if !permiteEscritura}
      <div class="rounded-lg border border-advertencia/30 bg-advertencia-suave p-3 text-body-sm text-amber-900" role="status">
        <p class="flex items-start gap-2 font-semibold">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">lock</span>
          Catálogo de solo lectura
        </p>
        <p class="mt-1">
          SoupDB declara <code class="font-code">catalog_mutable: false</code> y aún no ofrece
          endpoints para añadir referencias o importar datasets. Puedes revisar el formulario y
          validar un CSV; guardar e importar estarán disponibles cuando el servicio admita estas operaciones.
          En el modo de demostración sí se guardan referencias locales.
        </p>
      </div>
    {/if}
    <div class="-mt-1 flex items-center gap-5 border-b border-outline-variant/50" role="tablist" aria-label="Alta de referencias">
      <button
        type="button"
        role="tab"
        id="tab-agregar"
        aria-selected={pestana === 'agregar'}
        aria-controls="panel-agregar"
        tabindex={pestana === 'agregar' ? 0 : -1}
        bind:this={tabAgregar}
        onclick={() => cambiarPestana('agregar')}
        onkeydown={alTeclearPestanas}
        class={[
          'enlace-foco -mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-label-md font-semibold transition-colors',
          pestana === 'agregar'
            ? 'border-primary text-primary'
            : 'border-transparent text-on-surface-variant hover:text-on-surface'
        ].join(' ')}
      >
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>
        Añadir referencia
      </button>
      <button
        type="button"
        role="tab"
        id="tab-importar"
        aria-selected={pestana === 'importar'}
        aria-controls="panel-importar"
        tabindex={pestana === 'importar' ? 0 : -1}
        bind:this={tabImportar}
        onclick={() => cambiarPestana('importar')}
        onkeydown={alTeclearPestanas}
        class={[
          'enlace-foco -mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-label-md font-semibold transition-colors',
          pestana === 'importar'
            ? 'border-primary text-primary'
            : 'border-transparent text-on-surface-variant hover:text-on-surface'
        ].join(' ')}
      >
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">folder_open</span>
        Importar dataset
        <span class="rounded bg-surface-container px-1.5 py-0.5 font-code text-[10px] font-medium text-on-surface-variant">Lote</span>
      </button>
      <span class="ml-auto hidden pb-2.5 font-code text-code-sm text-on-surface-variant sm:inline">
        {formatearNumero(app.catalogo.length)} obras · {formatearNumero(app.totalSegmentosCatalogo)} segmentos
      </span>
    </div>

    {#if pestana === 'agregar'}
      <div id="panel-agregar" role="tabpanel" aria-labelledby="tab-agregar" class="space-y-4">
        {#if referenciaCreada}
          <div class="space-y-3">
            <div class="rounded-xl border border-exito/30 bg-exito-suave/60 p-4">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined relleno text-[26px] text-emerald-700" aria-hidden="true">check_circle</span>
                <div class="min-w-0">
                  <p class="text-headline-sm font-semibold text-on-surface">Referencia añadida al catálogo local</p>
                  <p class="mt-0.5 text-body-sm text-on-surface-variant">
                    Se registró <strong class="text-on-surface">{referenciaCreada.titulo}</strong> con
                    {referenciaCreada.cantidadSegmentos} segmentos de {SEGUNDOS_POR_SEGMENTO} s.
                  </p>
                </div>
              </div>
              <dl class="mt-3 grid gap-x-4 gap-y-2 border-t border-exito/20 pt-3 text-body-sm sm:grid-cols-2">
                <div class="flex items-baseline justify-between gap-2 sm:block">
                  <dt class="text-on-surface-variant">Artista</dt>
                  <dd class="font-medium text-on-surface">{referenciaCreada.artista}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-2 sm:block">
                  <dt class="text-on-surface-variant">Año · género</dt>
                  <dd class="font-medium text-on-surface">{referenciaCreada.anio} · {referenciaCreada.genero}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-2 sm:block">
                  <dt class="text-on-surface-variant">Colección</dt>
                  <dd class="font-medium text-on-surface">{referenciaCreada.coleccion}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-2 sm:block">
                  <dt class="text-on-surface-variant">Duración</dt>
                  <dd class="font-code text-code-sm font-medium text-on-surface tabular">
                    {formatearDuracion(referenciaCreada.duracionSegundos)} · {formatearNumero(referenciaCreada.duracionSegundos, 1)} s
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-2 sm:col-span-2 sm:block">
                  <dt class="text-on-surface-variant">Ruta de audio</dt>
                  <dd class="break-all font-code text-code-sm text-on-surface">{referenciaCreada.urlAudio}</dd>
                </div>
                {#if referenciaCreada.licencia}
                  <div class="flex items-baseline justify-between gap-2 sm:col-span-2 sm:block">
                    <dt class="text-on-surface-variant">Licencia</dt>
                    <dd class="font-medium text-on-surface">{referenciaCreada.licencia}</dd>
                  </div>
                {/if}
              </dl>
            </div>
            <p class="flex items-start gap-1.5 text-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[16px] text-tertiary" aria-hidden="true">info</span>
              <span>
                Ya aparece en el catálogo del navegador. No se ha indexado en HNSW ni modifica los
                análisis anteriores. Puedes añadir otra referencia o cerrar el diálogo.
              </span>
            </p>
          </div>
        {:else}
          <p class="text-body-sm text-on-surface-variant">
            Completa los metadatos mínimos. Los campos marcados con <span class="text-error">*</span> son obligatorios.
          </p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="referencia-titulo" class="campo-etiqueta">
                <span>Título de la obra <span class="text-error">*</span></span>
              </label>
              <input
                id="referencia-titulo"
                class="campo-entrada mt-1.5"
                type="text"
                autocomplete="off"
                placeholder="Ej.: Concierto de Otoño"
                bind:value={formulario.titulo}
                onblur={() => validarCampo('titulo')}
                aria-invalid={Boolean(errores.titulo)}
                aria-describedby={errores.titulo ? 'referencia-titulo-error' : undefined}
              />
              {#if errores.titulo}
                <p id="referencia-titulo-error" class="mt-1 flex items-center gap-1 text-body-sm text-error">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  {errores.titulo}
                </p>
              {/if}
            </div>

            <div>
              <label for="referencia-artista" class="campo-etiqueta">
                <span>Artista / compositor <span class="text-error">*</span></span>
              </label>
              <input
                id="referencia-artista"
                class="campo-entrada mt-1.5"
                type="text"
                autocomplete="off"
                placeholder="Ej.: Dra. Elena Velasco"
                bind:value={formulario.artista}
                onblur={() => validarCampo('artista')}
                aria-invalid={Boolean(errores.artista)}
                aria-describedby={errores.artista ? 'referencia-artista-error' : undefined}
              />
              {#if errores.artista}
                <p id="referencia-artista-error" class="mt-1 flex items-center gap-1 text-body-sm text-error">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  {errores.artista}
                </p>
              {/if}
            </div>

            <div>
              <label for="referencia-anio" class="campo-etiqueta">Año de producción</label>
              <input
                id="referencia-anio"
                class="campo-entrada mt-1.5 font-code tabular"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                placeholder="2024"
                bind:value={formulario.anio}
                onblur={() => validarCampo('anio')}
                aria-invalid={Boolean(errores.anio)}
                aria-describedby="referencia-anio-ayuda"
              />
              {#if errores.anio}
                <p class="mt-1 flex items-center gap-1 text-body-sm text-error">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  {errores.anio}
                </p>
              {:else}
                <p id="referencia-anio-ayuda" class="mt-1 text-body-sm text-on-surface-variant">
                  Entre 1900 y 2100. Si se deja vacío se usa {ANIO_ACTUAL}.
                </p>
              {/if}
            </div>

            <div>
              <label for="referencia-genero" class="campo-etiqueta">Género</label>
              <div class="relative mt-1.5">
                <select id="referencia-genero" class="campo-selector" bind:value={formulario.genero}>
                  {#each GENEROS as genero}
                    <option value={genero}>{genero}</option>
                  {/each}
                </select>
                <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" aria-hidden="true">expand_more</span>
              </div>
            </div>

            <div>
              <label for="referencia-coleccion" class="campo-etiqueta">Colección</label>
              <input
                id="referencia-coleccion"
                class="campo-entrada mt-1.5"
                type="text"
                autocomplete="off"
                list="colecciones-referencia"
                placeholder={CATALOGO_PREDETERMINADO}
                bind:value={formulario.coleccion}
              />
              <datalist id="colecciones-referencia">
                {#each colecciones as coleccion}
                  <option value={coleccion}></option>
                {/each}
              </datalist>
            </div>

            <div>
              <label for="referencia-duracion" class="campo-etiqueta">
                <span>Duración en segundos <span class="text-error">*</span></span>
              </label>
              <input
                id="referencia-duracion"
                class="campo-entrada mt-1.5 font-code tabular"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                placeholder="180"
                bind:value={formulario.duracion}
                onblur={() => validarCampo('duracion')}
                aria-invalid={Boolean(errores.duracion)}
                aria-describedby={errores.duracion ? 'referencia-duracion-error' : 'referencia-duracion-ayuda'}
              />
              {#if errores.duracion}
                <p id="referencia-duracion-error" class="mt-1 flex items-center gap-1 text-body-sm text-error">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  {errores.duracion}
                </p>
              {:else}
                <p id="referencia-duracion-ayuda" class="mt-1 text-body-sm text-on-surface-variant">
                  Entre 2,5 y 3600 s. Se generan ventanas de {SEGUNDOS_POR_SEGMENTO} s.
                </p>
              {/if}
            </div>

            <div class="sm:col-span-2">
              <label for="referencia-ruta" class="campo-etiqueta">
                <span>Ruta de audio <span class="text-error">*</span></span>
              </label>
              <input
                id="referencia-ruta"
                class="campo-entrada mt-1.5 font-code text-code-sm"
                type="text"
                autocomplete="off"
                placeholder="archivo/obra-de-referencia.wav"
                bind:value={formulario.ruta}
                onblur={() => validarCampo('ruta')}
                aria-invalid={Boolean(errores.ruta)}
                aria-describedby={errores.ruta ? 'referencia-ruta-error' : 'referencia-ruta-ayuda'}
              />
              {#if errores.ruta}
                <p id="referencia-ruta-error" class="mt-1 flex items-center gap-1 text-body-sm text-error">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  {errores.ruta}
                </p>
              {:else}
                <p id="referencia-ruta-ayuda" class="mt-1 text-body-sm text-on-surface-variant">
                  Ruta o identificador descriptivo del máster en tu repositorio. La demo no sube ni
                  reproduce el archivo.
                </p>
              {/if}
            </div>

            <div class="sm:col-span-2">
              <label for="referencia-licencia" class="campo-etiqueta">Licencia</label>
              <input
                id="referencia-licencia"
                class="campo-entrada mt-1.5"
                type="text"
                autocomplete="off"
                placeholder="Ej.: CC BY 4.0"
                bind:value={formulario.licencia}
              />
            </div>
          </div>

          <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low/70 p-3">
            <div class="flex items-start gap-2">
              <span class="material-symbols-outlined mt-0.5 text-[18px] text-tertiary" aria-hidden="true">info</span>
              <div class="text-body-sm text-on-surface-variant">
                <p class="font-medium text-on-surface">{permiteEscritura ? 'Alcance de la demostración' : 'Alta preparada para soporte futuro'}</p>
                <p class="mt-0.5">
                  {#if permiteEscritura}
                    La referencia se guarda en el navegador con metadatos y segmentos generados a partir
                    de la duración. No se indexa en HNSW ni se envía a SoupDB.
                  {:else}
                    Este formulario no modifica el servicio. Las referencias reales se preparan junto
                    con el índice antes de iniciar el runtime de SoupDB.
                  {/if}
                  Catálogo actual:
                  <strong class="text-on-surface">{formatearNumero(app.catalogo.length)}</strong> obras ·
                  <strong class="text-on-surface">{formatearNumero(app.totalSegmentosCatalogo)}</strong> segmentos.
                </p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div id="panel-importar" role="tabpanel" aria-labelledby="tab-importar" class="space-y-4">
        {#if resultadoImportacion}
          <div class="space-y-3">
            <div class={[
              'rounded-xl border p-4',
              resultadoImportacion.cantidadCanciones > 0
                ? 'border-exito/30 bg-exito-suave/60'
                : 'border-advertencia/30 bg-advertencia-suave/70'
            ].join(' ')}>
              <div class="flex items-start gap-3">
                <span
                  class={[
                    'material-symbols-outlined relleno text-[26px]',
                    resultadoImportacion.cantidadCanciones > 0 ? 'text-emerald-700' : 'text-amber-700'
                  ].join(' ')}
                  aria-hidden="true">{resultadoImportacion.cantidadCanciones > 0 ? 'check_circle' : 'info'}</span
                >
                <div class="min-w-0">
                  <p class="text-headline-sm font-semibold text-on-surface">
                    {resultadoImportacion.cantidadCanciones > 0
                      ? 'Dataset importado al catálogo local'
                      : 'No se añadió ninguna referencia nueva'}
                  </p>
                  <p class="mt-0.5 text-body-sm text-on-surface-variant">
                    {#if resultadoImportacion.cantidadCanciones > 0}
                      Se incorporaron {resultadoImportacion.cantidadCanciones}
                      {resultadoImportacion.cantidadCanciones === 1 ? 'obra' : 'obras'} y
                      {formatearNumero(resultadoImportacion.cantidadSegmentos)} segmentos de {SEGUNDOS_POR_SEGMENTO} s.
                    {:else}
                      Todas las filas válidas coinciden con obras ya presentes o carecen de metadatos mínimos.
                    {/if}
                  </p>
                </div>
              </div>

              <dl class="mt-3 grid grid-cols-2 gap-3 border-t border-outline-variant/40 pt-3 sm:grid-cols-4">
                <div>
                  <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Canciones</dt>
                  <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">{formatearNumero(resultadoImportacion.cantidadCanciones)}</dd>
                </div>
                <div>
                  <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Segmentos</dt>
                  <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">{formatearNumero(resultadoImportacion.cantidadSegmentos)}</dd>
                </div>
                <div>
                  <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Omitidas</dt>
                  <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">{formatearNumero(omitidasTotales)}</dd>
                </div>
                <div>
                  <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Filas leídas</dt>
                  <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">{formatearNumero(analisis.filas.length)}</dd>
                </div>
              </dl>

              {#if omitidasTotales > 0}
                <p class="mt-2 text-body-sm text-on-surface-variant">
                  {omitidasLocales} descartadas por formato o campos inválidos y
                  {resultadoImportacion.omitidas} por duplicado o metadatos incompletos.
                </p>
              {/if}

              {#if resultadoImportacion.nombres.length > 0}
                <div class="mt-3 border-t border-outline-variant/40 pt-3">
                  <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Referencias importadas</p>
                  <ul class="mt-1.5 flex flex-wrap gap-1.5">
                    {#each resultadoImportacion.nombres.slice(0, 8) as nombre}
                      <li class="rounded-md bg-surface-container-lowest/80 px-2 py-0.5 text-body-sm text-on-surface">{nombre}</li>
                    {/each}
                    {#if resultadoImportacion.nombres.length > 8}
                      <li class="rounded-md bg-surface-container-lowest/80 px-2 py-0.5 font-code text-code-sm text-on-surface-variant">
                        +{resultadoImportacion.nombres.length - 8} más
                      </li>
                    {/if}
                  </ul>
                </div>
              {/if}
            </div>
            <p class="flex items-start gap-1.5 text-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[16px] text-tertiary" aria-hidden="true">info</span>
              <span>El lote quedó solo en el almacenamiento del navegador; no se indexó en HNSW ni alteró análisis previos.</span>
            </p>
          </div>
        {:else}
          <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/40 p-3.5">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-headline-sm font-semibold text-on-surface">Lote CSV / TXT</p>
                <p class="mt-0.5 text-body-sm text-on-surface-variant">
                  Cabeceras admitidas: <code class="break-all font-code text-code-sm text-on-surface">titulo; artista; anio; genero; coleccion; duracion_segundos; ruta_audio; licencia</code>.
                  Separador «;» o «,»; se ignoran BOM, líneas vacías y comentarios con «#».
                </p>
              </div>
              <Boton variante="fantasma" tamanio="sm" icono="download" onclick={descargarPlantilla}>
                Plantilla CSV
              </Boton>
            </div>

            <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <label
                class="enlace-foco flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-outline-variant/80 bg-surface-container-lowest px-3 py-3 transition-colors hover:border-primary-container/60 hover:bg-surface-container-low focus-within:ring-2 focus-within:ring-primary-container/40"
              >
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  class="sr-only"
                  onchange={alSeleccionarArchivo}
                />
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span class="material-symbols-outlined text-[20px]" aria-hidden="true">upload_file</span>
                </span>
                <span class="min-w-0">
                  <span class="block text-label-md font-semibold text-on-surface">
                    {leyendoArchivo ? 'Leyendo archivo…' : 'Seleccionar archivo CSV o TXT'}
                  </span>
                  <span class="block text-body-sm text-on-surface-variant">Se procesa en el navegador; no se envía a ningún servidor.</span>
                </span>
              </label>
              <div class="flex flex-row gap-2 sm:flex-col sm:justify-center">
                <Boton variante="secundario" tamanio="md" icono="science" onclick={cargarEjemplo}>Cargar ejemplo</Boton>
                <Boton variante="fantasma" tamanio="md" icono="delete_sweep" onclick={reiniciarImportacion} deshabilitado={!textoCsv}>
                  Limpiar
                </Boton>
              </div>
            </div>

            {#if nombreArchivoCsv}
              <p class="mt-2 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">description</span>
                <span class="truncate font-code text-code-sm">{nombreArchivoCsv}</span>
              </p>
            {/if}
          </div>

          <div>
            <label for="csv-texto" class="campo-etiqueta">
              <span>Pegar contenido CSV</span>
              <span class="font-code text-code-sm font-normal text-on-surface-variant">{analisis.filas.length} filas leídas</span>
            </label>
            <textarea
              id="csv-texto"
              class="mt-1.5 min-h-32 w-full resize-y rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2.5 font-code text-code-sm leading-5 text-on-surface transition-colors placeholder:text-on-surface-variant/60 focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/15"
              spellcheck="false"
              placeholder={'titulo;artista;anio;genero;coleccion;duracion_segundos;ruta_audio;licencia\n…'}
              bind:value={textoCsv}
              oninput={() => {
                resultadoImportacion = null;
                omitidasLocales = 0;
              }}
            ></textarea>
          </div>

          {#if analisis.error}
            <div class="rounded-lg border border-peligro/30 bg-peligro-suave px-3 py-2.5" role="alert">
              <p class="flex items-start gap-1.5 text-body-sm text-red-800">
                <span class="material-symbols-outlined mt-0.5 text-[18px]" aria-hidden="true">error</span>
                <span>
                  <strong class="font-semibold">{analisis.error}</strong>
                  Las columnas obligatorias son titulo, artista, duracion_segundos y ruta_audio.
                </span>
              </p>
            </div>
          {:else if analisis.filas.length > 0}
            <div class="overflow-hidden rounded-xl border border-outline-variant/50">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/50 bg-surface-container-low/60 px-3 py-2">
                <span class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Vista previa</span>
                <div class="flex flex-wrap items-center gap-1.5">
                  <Insignia tono="exito" icono="check_circle">{analisis.validas} válidas</Insignia>
                  {#if analisis.omitidas > 0}
                    <Insignia tono="advertencia" icono="warning">{analisis.omitidas} omitidas</Insignia>
                  {/if}
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-surface-container-low/40 text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">
                      <th scope="col" class="whitespace-nowrap px-3 py-2 font-medium">Línea</th>
                      <th scope="col" class="min-w-40 px-3 py-2 font-medium">Título</th>
                      <th scope="col" class="min-w-36 px-3 py-2 font-medium">Artista</th>
                      <th scope="col" class="whitespace-nowrap px-3 py-2 font-medium">Año</th>
                      <th scope="col" class="whitespace-nowrap px-3 py-2 font-medium">Duración</th>
                      <th scope="col" class="min-w-44 px-3 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant/40 text-body-sm">
                    {#each analisis.filas.slice(0, 5) as fila}
                      <tr class={fila.valida ? '' : 'bg-advertencia-suave/40'}>
                        <td class="whitespace-nowrap px-3 py-2 font-code text-code-sm text-on-surface-variant tabular">{fila.numeroLinea}</td>
                        <td class="px-3 py-2 font-medium text-on-surface">
                          <span class="line-clamp-1">{fila.referencia.titulo || '—'}</span>
                        </td>
                        <td class="px-3 py-2 text-on-surface-variant">
                          <span class="line-clamp-1">{fila.referencia.artista || '—'}</span>
                        </td>
                        <td class="whitespace-nowrap px-3 py-2 font-code text-code-sm text-on-surface tabular">{fila.referencia.anio}</td>
                        <td class="whitespace-nowrap px-3 py-2 font-code text-code-sm text-on-surface tabular">
                          {fila.referencia.duracionSegundos > 0
                            ? `${formatearNumero(fila.referencia.duracionSegundos, 1)} s`
                            : '—'}
                        </td>
                        <td class="px-3 py-2">
                          {#if fila.valida}
                            <Insignia tono="exito" icono="check_circle">Válida</Insignia>
                          {:else}
                            <div class="flex flex-col gap-0.5">
                              <Insignia tono="advertencia" icono="error">Omitida</Insignia>
                              <span class="text-body-sm text-amber-800">{fila.motivos.join(' · ')}</span>
                            </div>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              <p class="border-t border-outline-variant/50 bg-surface-container-low/40 px-3 py-2 text-body-sm text-on-surface-variant">
                {#if analisis.filas.length > 5}
                  Mostrando 5 de {analisis.filas.length} filas.
                {/if}
                Se importarán {analisis.validas}
                {analisis.validas === 1 ? 'referencia válida' : 'referencias válidas'}.
                {#if analisis.desconocidas.length > 0}
                  Se ignoran columnas no admitidas: {analisis.desconocidas.join(', ')}.
                {/if}
              </p>
            </div>
          {:else}
            <div class="rounded-lg border border-dashed border-outline-variant/70 bg-surface-container-low/30 px-3 py-4 text-center text-body-sm text-on-surface-variant">
              Selecciona un archivo, pega filas o pulsa «Cargar ejemplo» para ver la vista previa.
            </div>
          {/if}

          <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low/70 p-3">
            <div class="flex items-start gap-2">
              <span class="material-symbols-outlined mt-0.5 text-[18px] text-tertiary" aria-hidden="true">info</span>
              <p class="text-body-sm text-on-surface-variant">
                {#if permiteEscritura}
                  La importación se resuelve en el navegador con el mismo alta que el formulario
                  individual. No hay indexación HNSW real en esta demo; las filas duplicadas
                  se omiten al comparar título y artista.
                {:else}
                  La vista previa valida el CSV en el navegador. No se enviarán filas al servicio
                  mientras el catálogo sea de solo lectura.
                {/if}
              </p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#snippet pie()}
    {#if pestana === 'agregar' && referenciaCreada}
      <Boton variante="secundario" icono="add" onclick={reiniciarFormulario}>Añadir otra</Boton>
      <Boton variante="primario" onclick={onCerrar}>Cerrar</Boton>
    {:else if pestana === 'importar' && resultadoImportacion}
      <Boton variante="secundario" icono="upload_file" onclick={reiniciarImportacion}>Importar otro lote</Boton>
      <Boton variante="primario" onclick={onCerrar}>Cerrar</Boton>
    {:else}
      <Boton variante="secundario" onclick={onCerrar}>Cancelar</Boton>
      {#if pestana === 'agregar'}
        <Boton
          variante="primario"
          icono="add_circle"
          cargando={enviando}
          deshabilitado={!permiteEscritura || !formularioCompleto}
          onclick={() => void guardarReferencia()}
        >
          Añadir referencia
        </Boton>
      {:else}
        <Boton
          variante="primario"
          icono="upload_file"
          cargando={importando}
          deshabilitado={!permiteEscritura || analisis.validas === 0}
          onclick={() => void importarLote()}
        >
          Importar {analisis.validas} {analisis.validas === 1 ? 'referencia' : 'referencias'}
        </Boton>
      {/if}
    {/if}
  {/snippet}
</Modal>

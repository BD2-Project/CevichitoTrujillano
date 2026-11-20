<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from '../componentes/ui/Modal.svelte';
  import Boton from '../componentes/ui/Boton.svelte';
  import Insignia from '../componentes/ui/Insignia.svelte';
  import BarraSimilitud from '../componentes/ui/BarraSimilitud.svelte';
  import EstadoVacio from '../componentes/ui/EstadoVacio.svelte';
  import { app } from '../estado/aplicacion.svelte';
  import { enlace } from '../navegacion/enrutador.svelte';
  import {
    COEFICIENTES_MFCC,
    DIMENSION_VECTOR,
    METRICA_INDICE,
    NOMBRE_INDICE,
    SEGUNDOS_POR_SEGMENTO,
    VERSION_ESQUEMA
  } from '../datos/constantes';
  import type { ResultadoAnalisis, Tono } from '../datos/tipos';
  import { exportarCsvResultado, exportarPdfResultado } from '../servicios/exportacion';
  import {
    descargarBlob,
    etiquetaSimilitud,
    formatearDuracion,
    formatearFecha,
    formatearNumero,
    formatearSimilitud,
    formatearTamano,
    nombreArchivoSeguro,
    tonoSimilitud
  } from '../utilidades/formato';

  type FormatoExportacion = 'pdf' | 'csv' | 'json';

  interface SeccionPreview {
    clave: string;
    titulo: string;
    detalle: string;
    activa: boolean;
  }

  interface OpcionFormato {
    id: FormatoExportacion;
    titulo: string;
    etiqueta: string;
    descripcion: string;
    icono: string;
    fondo: string;
  }

  const ADVERTENCIA =
    'La similitud acústica es una medida técnica de evidencia, no un dictamen legal ni una probabilidad de infracción.';

  const OPCIONES_FORMATO: readonly OpcionFormato[] = [
    {
      id: 'pdf',
      titulo: 'PDF',
      etiqueta: 'Reporte técnico',
      descripcion: 'Documento maquetado con metadatos, resumen y tabla de coincidencias.',
      icono: 'picture_as_pdf',
      fondo: 'bg-primary/10 text-primary'
    },
    {
      id: 'csv',
      titulo: 'CSV',
      etiqueta: 'Dataset de datos',
      descripcion: 'Una fila por coincidencia con métricas de similitud en el rango [0, 1].',
      icono: 'table_chart',
      fondo: 'bg-secondary-container/50 text-secondary'
    },
    {
      id: 'json',
      titulo: 'JSON',
      etiqueta: 'Respaldo íntegro',
      descripcion: 'Expediente completo con metadatos y coincidencias para auditoría o reutilización.',
      icono: 'data_object',
      fondo: 'bg-tertiary/10 text-tertiary'
    }
  ];

  let {
    idAnalisis = null,
    onCerrar
  }: { idAnalisis?: string | null; onCerrar: () => void } = $props();

  let cargando = $state(true);
  let errorCarga = $state<string | null>(null);
  let resultado = $state<ResultadoAnalisis | null>(null);

  let formato = $state<FormatoExportacion>('pdf');
  let tituloReporte = $state('Resultados del análisis');
  let incluirMetadatos = $state(true);
  let incluirResumen = $state(true);
  let incluirCoincidencias = $state(true);
  let incluirAdvertencia = $state(true);
  let exportando = $state(false);

  const coincidencias = $derived(resultado?.coincidencias ?? []);
  const canciones = $derived(new Set(coincidencias.map((item) => item.idCancion)).size);
  const mejorSimilitud = $derived(
    coincidencias.length > 0 ? Math.max(...coincidencias.map((item) => item.similitud)) : null
  );
  const tramoVisible = $derived.by(() => {
    const intervalos = coincidencias
      .map((item) => [item.inicioConsulta, item.finConsulta] as const)
      .sort((a, b) => a[0] - b[0]);
    let total = 0;
    let finAnterior = 0;
    for (const [inicio, fin] of intervalos) {
      total += Math.max(0, fin - Math.max(inicio, finAnterior));
      finAnterior = Math.max(finAnterior, fin);
    }
    return total;
  });
  const duracionArchivo = $derived(resultado?.metadatos?.duracionSegundos ?? null);
  const tamanoArchivo = $derived(resultado?.metadatos?.tamanoBytes ?? null);

  const tonoMejor = $derived<Tono>(
    mejorSimilitud !== null ? tonoSimilitud(mejorSimilitud) : 'neutro'
  );
  const etiquetaMejor = $derived(
    mejorSimilitud !== null ? etiquetaSimilitud(mejorSimilitud) : 'Sin coincidencias'
  );

  const baseSalida = $derived(
    resultado
      ? nombreArchivoSeguro(resultado.nombreArchivo).replace(/\.[^.]+$/, '')
      : 'cevichitotrujillano'
  );
  const nombreSalida = $derived(
    formato === 'pdf'
      ? `${baseSalida}-reporte.pdf`
      : formato === 'csv'
        ? `${baseSalida}.csv`
        : `${baseSalida}-respaldo.json`
  );

  const seccionesPdfActivas = $derived(
    [incluirMetadatos, incluirResumen, incluirCoincidencias, incluirAdvertencia].filter(Boolean).length
  );
  const puedeExportar = $derived(
    Boolean(resultado) &&
      !exportando &&
      (formato !== 'pdf' || (seccionesPdfActivas > 0 && tituloReporte.trim() !== ''))
  );

  const contenidoPreview = $derived.by((): SeccionPreview[] => {
    if (formato === 'csv') {
      return [
        { clave: 'cabecera', titulo: 'Cabecera del análisis y advertencia', detalle: '2 filas', activa: true },
        {
          clave: 'filas',
          titulo: 'Coincidencias candidatas',
          detalle: `${formatearNumero(coincidencias.length)} filas`,
          activa: true
        },
        { clave: 'codificacion', titulo: 'Codificación', detalle: 'UTF-8 · «;»', activa: true }
      ];
    }

    return [
      { clave: 'expediente', titulo: 'Expediente completo', detalle: '1 objeto', activa: true },
      {
        clave: 'coincidencias',
        titulo: 'Coincidencias',
        detalle: formatearNumero(coincidencias.length),
        activa: true
      },
      { clave: 'esquema', titulo: 'Esquema', detalle: VERSION_ESQUEMA, activa: true },
      { clave: 'advertencia', titulo: 'Advertencia metodológica', detalle: 'Incluida', activa: true }
    ];
  });

  const etiquetaFormato = $derived(
    formato === 'pdf' ? 'PDF' : formato === 'csv' ? 'CSV' : 'JSON'
  );

  let versionCarga = 0;

  $effect(() => {
    const id = idAnalisis;
    untrack(() => void cargar(id));
    return () => { versionCarga += 1; };
  });

  async function cargar(id: string | null = idAnalisis): Promise<void> {
    const version = ++versionCarga;
    resultado = null;
    errorCarga = null;
    if (!id) {
      cargando = false;
      return;
    }
    cargando = true;
    errorCarga = null;
    try {
      const datos = await app.cargarResultado(id);
      if (version !== versionCarga) return;
      resultado = datos;
      if (!datos) {
        errorCarga = 'El expediente no está disponible en el historial.';
      }
    } catch (error) {
      if (version === versionCarga) errorCarga = error instanceof Error ? error.message : 'Error desconocido.';
    } finally {
      if (version === versionCarga) cargando = false;
    }
  }

  async function exportar(): Promise<void> {
    if (!resultado || exportando) return;
    if (formato === 'pdf' && (seccionesPdfActivas === 0 || tituloReporte.trim() === '')) {
      app.notificar(
        'advertencia',
        'Reporte sin contenido',
        'Selecciona al menos una sección y escribe un título para el PDF.'
      );
      return;
    }

    exportando = true;
    try {
      if (formato === 'pdf') {
        await exportarPdfResultado(resultado, {
          titulo: tituloReporte.trim(),
          incluirMetadatos,
          incluirResumen,
          incluirCoincidencias,
          incluirAdvertencia
        });
        app.notificar('exito', 'Reporte PDF generado', `Se descargó ${nombreSalida}.`);
      } else if (formato === 'csv') {
        exportarCsvResultado(resultado);
        app.notificar('exito', 'Dataset CSV generado', `Se descargó ${nombreSalida}.`);
      } else {
        const respaldo = {
          generadoEn: new Date().toISOString(),
          esquema: VERSION_ESQUEMA,
          advertencia: ADVERTENCIA,
          analisis: resultado
        };
        const blob = new Blob([JSON.stringify(respaldo, null, 2)], {
          type: 'application/json;charset=utf-8'
        });
        descargarBlob(blob, nombreSalida);
        app.notificar('exito', 'Respaldo JSON generado', `Se descargó ${nombreSalida}.`);
      }
      onCerrar();
    } catch (error) {
      app.notificar(
        'peligro',
        'No se pudo exportar',
        error instanceof Error ? error.message : 'Error desconocido.'
      );
    } finally {
      exportando = false;
    }
  }
</script>

<Modal
  abierto={true}
  titulo="Exportar reporte técnico"
  subtitulo="Genera un documento o dataset con las coincidencias."
  icono="description"
  ancho="lg"
  onCerrar={onCerrar}
>
  {#if cargando}
    <div class="space-y-3" role="status" aria-live="polite">
      <p class="flex items-center gap-2 text-body-sm text-on-surface-variant">
        <span class="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
        Cargando expediente…
      </p>
      <div class="h-24 animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-low"></div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="h-20 animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-low"></div>
        <div class="h-20 animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-low"></div>
        <div class="h-20 animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-low"></div>
      </div>
    </div>
  {:else if !resultado}
    <EstadoVacio
      icono={idAnalisis ? 'folder_off' : 'description'}
      titulo={idAnalisis ? 'No se pudo abrir el expediente' : 'Sin expediente seleccionado'}
      descripcion={idAnalisis
        ? (errorCarga ?? 'El análisis solicitado no está disponible en el historial.')
        : 'Abre este diálogo desde un análisis del historial para exportar sus resultados.'}
    >
      {#if idAnalisis}
        <Boton variante="secundario" icono="refresh" onclick={() => void cargar()}>Reintentar</Boton>
      {/if}
      <a
        href={enlace('historial')}
        class="enlace-foco inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-label-md font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container"
      >
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">history</span>
        Ver historial
      </a>
    </EstadoVacio>
  {:else}
    <div class="space-y-4">
      <div class="overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-panel">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/40 px-4 py-3">
          <div class="min-w-0">
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Expediente</p>
            <p class="truncate text-headline-sm font-semibold text-on-surface">{resultado.nombreArchivo}</p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant">
              <span>{formatearFecha(resultado.creadoEn)}</span>
              {#if resultado.metadatos?.formato}
                <span class="h-1 w-1 rounded-full bg-outline-variant" aria-hidden="true"></span>
                <span class="font-code text-code-sm">{resultado.metadatos.formato}</span>
              {/if}
            </p>
          </div>
          <Insignia tono={tonoMejor} icono="graphic_eq">{etiquetaMejor}</Insignia>
        </div>

        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Coincidencias</dt>
            <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">{formatearNumero(coincidencias.length)}</dd>
          </div>
          <div>
            <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Canciones</dt>
            <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">{formatearNumero(canciones)}</dd>
          </div>
          <div>
            <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Mejor similitud</dt>
            <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">
              {mejorSimilitud !== null ? formatearSimilitud(mejorSimilitud) : '—'}
            </dd>
          </div>
          <div>
            <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Tramo cubierto</dt>
            <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">{formatearDuracion(tramoVisible)}</dd>
          </div>
          <div>
            <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Duración</dt>
            <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">
              {duracionArchivo !== null ? formatearDuracion(duracionArchivo, true) : '—'}
            </dd>
          </div>
          <div>
            <dt class="text-label-sm uppercase tracking-[0.05em] text-on-surface-variant">Tamaño</dt>
            <dd class="font-code text-headline-sm font-semibold text-on-surface tabular">
              {tamanoArchivo !== null ? formatearTamano(tamanoArchivo) : '—'}
            </dd>
          </div>
        </dl>

        <div class="border-t border-outline-variant/40 px-4 py-3">
          {#if mejorSimilitud !== null}
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-label-md font-medium text-on-surface">Mejor similitud del expediente</span>
              <span class="font-code text-code-sm text-on-surface-variant">similitud ∈ [0, 1]</span>
            </div>
            <div class="mt-1.5">
              <BarraSimilitud valor={mejorSimilitud} />
            </div>
          {:else}
            <p class="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[16px]" aria-hidden="true">info</span>
              El expediente no contiene coincidencias candidatas; se puede exportar el reporte sin filas.
            </p>
          {/if}
          <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-code text-code-sm text-on-surface-variant">
            <span>{SEGUNDOS_POR_SEGMENTO} s / segmento</span>
            <span class="h-1 w-1 rounded-full bg-outline-variant" aria-hidden="true"></span>
            <span>{COEFICIENTES_MFCC} MFCC</span>
            <span class="h-1 w-1 rounded-full bg-outline-variant" aria-hidden="true"></span>
            <span>{DIMENSION_VECTOR} dims</span>
            <span class="h-1 w-1 rounded-full bg-outline-variant" aria-hidden="true"></span>
            <span>{NOMBRE_INDICE} · {METRICA_INDICE}</span>
          </p>
        </div>
      </div>

      <fieldset class="space-y-2">
        <legend class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
          Formato de exportación
        </legend>
        <div class="grid gap-3 sm:grid-cols-3">
          {#each OPCIONES_FORMATO as opcion (opcion.id)}
            <label
              class={[
                'enlace-foco relative flex cursor-pointer flex-col rounded-xl border p-3 transition-all focus-within:ring-2 focus-within:ring-primary-container/40',
                formato === opcion.id
                  ? 'border-primary bg-primary/5 shadow-panel'
                  : 'border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low/60'
              ].join(' ')}
            >
              <input
                type="radio"
                name="formato-exportacion"
                value={opcion.id}
                bind:group={formato}
                class="sr-only"
              />
              <div class="flex items-start justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <span class={['flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', opcion.fondo].join(' ')}>
                    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{opcion.icono}</span>
                  </span>
                  <div class="min-w-0">
                    <span class="block text-headline-sm font-semibold text-on-surface">{opcion.titulo}</span>
                    <span class="block text-code-sm text-on-surface-variant">{opcion.etiqueta}</span>
                  </div>
                </div>
                <span
                  class={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                    formato === opcion.id
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant text-transparent'
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <span class="material-symbols-outlined text-[14px]">check</span>
                </span>
              </div>
              <p class="mt-2 text-body-sm text-on-surface-variant">{opcion.descripcion}</p>
            </label>
          {/each}
        </div>
      </fieldset>

      {#if formato === 'pdf'}
        <section class="rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-4" aria-labelledby="opciones-pdf">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 id="opciones-pdf" class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
              Contenido del reporte
            </h3>
            <span class="font-code text-code-sm text-on-surface-variant">{seccionesPdfActivas} de 4 secciones</span>
          </div>

          <div class="mt-3">
            <label for="titulo-reporte" class="campo-etiqueta">Título del reporte</label>
            <input
              id="titulo-reporte"
              class="campo-entrada mt-1.5"
              type="text"
              maxlength={120}
              autocomplete="off"
              bind:value={tituloReporte}
              placeholder="Resultados del análisis"
            />
          </div>

          <fieldset class="mt-3 grid gap-2 sm:grid-cols-2">
            <legend class="sr-only">Secciones incluidas en el PDF</legend>
            <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/70 px-2.5 py-2 hover:bg-surface-container-lowest">
              <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary" bind:checked={incluirMetadatos} />
              <span class="text-body-sm">
                <span class="block font-medium text-on-surface">Metadatos del expediente</span>
                <span class="block text-on-surface-variant">Archivo, fecha, formato y 9 filas técnicas.</span>
              </span>
            </label>
            <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/70 px-2.5 py-2 hover:bg-surface-container-lowest">
              <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary" bind:checked={incluirResumen} />
              <span class="text-body-sm">
                <span class="block font-medium text-on-surface">Resumen del cotejo</span>
                <span class="block text-on-surface-variant">Recuento, mejor similitud y criterio de búsqueda.</span>
              </span>
            </label>
            <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/70 px-2.5 py-2 hover:bg-surface-container-lowest">
              <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary" bind:checked={incluirCoincidencias} />
              <span class="text-body-sm">
                <span class="block font-medium text-on-surface">Coincidencias detalladas</span>
                <span class="block text-on-surface-variant">{formatearNumero(coincidencias.length)} filas con tramos y similitud.</span>
              </span>
            </label>
            <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/70 px-2.5 py-2 hover:bg-surface-container-lowest">
              <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary" bind:checked={incluirAdvertencia} />
              <span class="text-body-sm">
                <span class="block font-medium text-on-surface">Advertencia metodológica</span>
                <span class="block text-on-surface-variant">La similitud no es un dictamen legal.</span>
              </span>
            </label>
          </fieldset>
        </section>
      {:else if formato === 'csv'}
        <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-3.5">
          <div class="flex items-start gap-2">
            <span class="material-symbols-outlined mt-0.5 text-[18px] text-secondary" aria-hidden="true">table_chart</span>
            <p class="text-body-sm text-on-surface-variant">
              El CSV incluye siempre la cabecera del análisis, la advertencia metodológica y una fila
              por coincidencia con similitud y similitudes mínima y máxima. No hay opciones adicionales.
            </p>
          </div>
        </div>
      {:else}
        <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-3.5">
          <div class="flex items-start gap-2">
            <span class="material-symbols-outlined mt-0.5 text-[18px] text-tertiary" aria-hidden="true">data_object</span>
            <p class="text-body-sm text-on-surface-variant">
              El respaldo JSON reproduce el expediente completo con el esquema {VERSION_ESQUEMA},
              la marca de generación y la advertencia metodológica. No se aplican filtros.
            </p>
          </div>
        </div>
      {/if}

      {#if formato !== 'pdf'}
        <section class="rounded-xl border border-outline-variant/50 bg-surface-container-low/40 p-4" aria-labelledby="vista-previa-exportacion">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 id="vista-previa-exportacion" class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
              Vista previa del contenido
            </h3>
            <span class="inline-flex min-w-0 items-center gap-1 font-code text-code-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[14px]" aria-hidden="true">description</span>
              <span class="truncate">{nombreSalida}</span>
            </span>
          </div>

          <ul class="mt-2 divide-y divide-outline-variant/40">
            {#each contenidoPreview as seccion (seccion.clave)}
              <li class="flex items-start justify-between gap-3 py-1.5">
                <span class={['flex min-w-0 items-start gap-2 text-body-sm', seccion.activa ? 'text-on-surface' : 'text-on-surface-variant/60'].join(' ')}>
                  <span
                    class={['material-symbols-outlined mt-0.5 text-[16px]', seccion.activa ? 'text-secondary' : 'text-on-surface-variant/50'].join(' ')}
                    aria-hidden="true">{seccion.activa ? 'check_circle' : 'remove_circle'}</span
                  >
                  <span class={seccion.activa ? '' : 'line-through'}>{seccion.titulo}</span>
                </span>
                <span class="shrink-0 text-right font-code text-code-sm text-on-surface-variant">{seccion.detalle}</span>
              </li>
            {/each}
          </ul>

          <div class="mt-3 rounded-lg border border-advertencia/30 bg-advertencia-suave/80 px-3 py-2">
            <p class="flex items-start gap-1.5 text-body-sm text-amber-900">
              <span class="material-symbols-outlined mt-0.5 text-[16px]" aria-hidden="true">warning</span>
              <span>La similitud acústica es evidencia técnica: no equivale a una probabilidad de infracción ni a un dictamen legal.</span>
            </p>
          </div>
        </section>
      {/if}
    </div>
  {/if}

  {#snippet pie()}
    <Boton variante="secundario" onclick={onCerrar}>Cancelar</Boton>
    <Boton
      variante="primario"
      icono="download"
      cargando={exportando}
      deshabilitado={!puedeExportar}
      onclick={() => void exportar()}
    >
      Exportar {etiquetaFormato}
    </Boton>
  {/snippet}
</Modal>

<script lang="ts">
  import EncabezadoPagina from '../componentes/ui/EncabezadoPagina.svelte';
  import EstadoVacio from '../componentes/ui/EstadoVacio.svelte';
  import Boton from '../componentes/ui/Boton.svelte';
  import { app } from '../estado/aplicacion.svelte';
  import { enlace } from '../navegacion/enrutador.svelte';
  import BarraFiltros from './historial/BarraFiltros.svelte';
  import MetricasHistorial from './historial/MetricasHistorial.svelte';
  import MenuExportar from './historial/MenuExportar.svelte';
  import TablaHistorial from './historial/TablaHistorial.svelte';
  import type { FiltrosHistorialUI, MetricasHistorial as DatosMetricas } from './historial/tipos';

  const filtrosIniciales: FiltrosHistorialUI = {
    busqueda: '', estado: 'todos', rango: 'todo', similitudMinima: 0, orden: 'recientes'
  };
  let filtros = $state<FiltrosHistorialUI>({ ...filtrosIniciales });
  let pagina = $state(1);
  const tamanoPagina = 10;

  const conteoEstados = $derived({
    todos: app.analisis.length,
    conEvidencia: app.analisis.filter((item) => item.estado === 'con-evidencia').length,
    sinEvidencia: app.analisis.filter((item) => item.estado === 'sin-evidencia').length,
    errores: app.analisis.filter((item) => item.estado === 'error').length
  });

  const metricas = $derived.by((): DatosMetricas => {
    const items = app.analisis;
    const similitudes = items.flatMap((item) => item.mejorSimilitud === null ? [] : [item.mejorSimilitud]);
    const duraciones = items.flatMap((item) => item.duracionArchivoSegundos === undefined ? [] : [item.duracionArchivoSegundos]);
    const duracionTotal = duraciones.reduce((total, valor) => total + valor, 0);
    return {
      total: items.length,
      conEvidencia: conteoEstados.conEvidencia,
      sinEvidencia: conteoEstados.sinEvidencia,
      errores: items.filter((item) => item.estado === 'error').length,
      demo: items.filter((item) => item.origen === 'demo').length,
      coincidencias: items.reduce((total, item) => total + item.cantidadCoincidencias, 0),
      canciones: items.reduce((total, item) => total + item.cantidadCanciones, 0),
      mejorGlobal: similitudes.length ? Math.max(...similitudes) : null,
      mediaMejor: similitudes.length ? similitudes.reduce((total, valor) => total + valor, 0) / similitudes.length : null,
      duracionTotal,
      duracionMedia: duraciones.length ? duracionTotal / duraciones.length : null,
      tamanoTotal: items.reduce((total, item) => total + (item.tamanoBytes ?? 0), 0),
      formatos: [...new Set(items.flatMap((item) => item.formato ? [item.formato.toUpperCase()] : []))]
    };
  });

  const filtrados = $derived.by(() => {
    const consulta = filtros.busqueda.trim().toLocaleLowerCase('es');
    const ahora = new Date();
    let desde = Number.NEGATIVE_INFINITY;
    if (filtros.rango === 'hoy') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    } else if (filtros.rango !== 'todo') {
      desde = ahora.getTime() - (filtros.rango === '7d' ? 7 : 30) * 86_400_000;
    }
    return app.analisis.filter((item) => {
      const coincideTexto = !consulta || `${item.nombreArchivo} ${item.idAnalisis}`.toLocaleLowerCase('es').includes(consulta);
      return coincideTexto
        && (filtros.estado === 'todos' || item.estado === filtros.estado)
        && (filtros.rango === 'todo' || new Date(item.creadoEn).getTime() >= desde)
        && (filtros.similitudMinima === 0 || (item.mejorSimilitud !== null && item.mejorSimilitud >= filtros.similitudMinima));
    }).sort((a, b) => {
      if (filtros.orden === 'similitud') return (b.mejorSimilitud ?? -1) - (a.mejorSimilitud ?? -1);
      const diferencia = new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      return filtros.orden === 'antiguos' ? -diferencia : diferencia;
    });
  });

  const totalPaginas = $derived(Math.max(1, Math.ceil(filtrados.length / tamanoPagina)));
  const paginaActual = $derived(Math.min(pagina, totalPaginas));
  const visibles = $derived(filtrados.slice((paginaActual - 1) * tamanoPagina, paginaActual * tamanoPagina));

  $effect(() => {
    JSON.stringify(filtros);
    pagina = 1;
  });

  function limpiarFiltros() {
    filtros = { ...filtrosIniciales };
  }
</script>

<div class="space-y-6">
  <EncabezadoPagina etiqueta="Registro de evidencia" titulo="Historial de análisis" descripcion="Consulta tus cotejos acústicos, revisa las coincidencias candidatas y exporta los resultados." icono="history">
    {#snippet acciones()}
      <MenuExportar total={app.analisis.length} />
      <a href={enlace('nuevo')} class="enlace-foco inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary-container">
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
        Nuevo análisis
      </a>
    {/snippet}
  </EncabezadoPagina>

  <MetricasHistorial {metricas} />
  <BarraFiltros {filtros} total={app.analisis.length} visibles={filtrados.length} {conteoEstados} onLimpiar={limpiarFiltros} />

  {#if app.cargandoInicial}
    <div class="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-12 text-body-md text-on-surface-variant" role="status">
      <span class="material-symbols-outlined animate-spin text-primary" aria-hidden="true">progress_activity</span>
      Cargando historial de análisis…
    </div>
  {:else if app.analisis.length === 0}
    <EstadoVacio icono="history" titulo="Tu historial empieza aquí" descripcion="Al completar tu primer análisis encontrarás aquí sus coincidencias y opciones de exportación.">
      <a href={enlace('nuevo')} class="enlace-sutil">Iniciar un análisis</a>
    </EstadoVacio>
  {:else if filtrados.length === 0}
    <EstadoVacio icono="search_off" titulo="No hay análisis con estos filtros" descripcion="Prueba otro nombre de archivo, amplía el rango de fechas o elimina los filtros activos.">
      <Boton variante="secundario" icono="filter_alt_off" onclick={limpiarFiltros}>Limpiar filtros</Boton>
    </EstadoVacio>
  {:else}
    <TablaHistorial items={visibles} total={filtrados.length} pagina={paginaActual} {totalPaginas} {tamanoPagina} onPagina={(numero) => (pagina = numero)} />
  {/if}

  <section class="flex items-start gap-3 rounded-xl bg-surface-container-low p-4" aria-label="Interpretación de la evidencia">
    <span class="material-symbols-outlined rounded-lg bg-secondary-container p-2 text-secondary" aria-hidden="true">info</span>
    <div class="space-y-1">
      <p class="text-label-md font-semibold text-on-surface">Evidencia técnica de similitud acústica</p>
      <p class="text-body-sm text-on-surface-variant">La similitud no expresa una probabilidad de infracción ni constituye un dictamen. Los filtros organizan la evidencia y no representan un umbral legal.</p>
    </div>
  </section>
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/estado/aplicacion.svelte';
  import { enrutador, enlace } from './lib/navegacion/enrutador.svelte';
  import BarraLateral from './lib/componentes/shell/BarraLateral.svelte';
  import BarraSuperior from './lib/componentes/shell/BarraSuperior.svelte';
  import Notificaciones from './lib/componentes/shell/Notificaciones.svelte';
  import Modal from './lib/componentes/ui/Modal.svelte';
  import Boton from './lib/componentes/ui/Boton.svelte';
  import Insignia from './lib/componentes/ui/Insignia.svelte';
  import NuevoAnalisis from './lib/paginas/NuevoAnalisis.svelte';
  import AnalisisEnProgreso from './lib/paginas/AnalisisEnProgreso.svelte';
  import ResultadosAnalisis from './lib/paginas/ResultadosAnalisis.svelte';
  import HistorialAnalisis from './lib/paginas/HistorialAnalisis.svelte';
  import CatalogoReferencia from './lib/paginas/CatalogoReferencia.svelte';
  import ErrorAnalisis from './lib/paginas/ErrorAnalisis.svelte';
  import NoEncontrado from './lib/paginas/NoEncontrado.svelte';
  import ModalCatalogo from './lib/modales/ModalCatalogo.svelte';
  import ModalExportar from './lib/modales/ModalExportar.svelte';

  let menuAbierto = $state(false);
  let acercaDe = $state(false);

  const modalCatalogo = $derived(enrutador.modal === 'agregar' || enrutador.modal === 'importar');
  const modalExportar = $derived(enrutador.modal === 'exportar');
  const idExportar = $derived(
    enrutador.actual.parametros.id ?? enrutador.actual.consulta.get('analisis')
  );

  onMount(() => {
    void app.inicializar();
  });

  $effect(() => {
    void enrutador.actual.nombre;
    menuAbierto = false;
  });

  function cerrarCatalogo() {
    enrutador.ir('catalogo', {}, {}, true);
  }

  function cerrarExportar() {
    enrutador.ir(enrutador.actual.nombre, enrutador.actual.parametros, {}, true);
  }
</script>

<a
  href="#contenido-principal"
  onclick={(evento) => {
    evento.preventDefault();
    document.getElementById('contenido-principal')?.focus();
  }}
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
>
  Saltar al contenido
</a>

<div class="min-h-dvh bg-surface">
  <BarraLateral abierto={menuAbierto} onCerrar={() => (menuAbierto = false)} onAcercaDe={() => (acercaDe = true)} />

  <div class="flex min-h-dvh flex-col lg:pl-64">
    <BarraSuperior onAbrirMenu={() => (menuAbierto = true)} />

    {#if app.cargandoInicial}
      <div class="h-0.5 w-full overflow-hidden bg-surface-container">
        <div class="h-full w-1/3 animate-barrido rounded-full bg-primary-container"></div>
      </div>
    {/if}

    <main id="contenido-principal" tabindex="-1" class="min-w-0 flex-1">
      <div class="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        {#if enrutador.actual.nombre === 'nuevo'}
          <NuevoAnalisis />
        {:else if enrutador.actual.nombre === 'progreso'}
          <AnalisisEnProgreso />
        {:else if enrutador.actual.nombre === 'resultados'}
          <ResultadosAnalisis id={enrutador.actual.parametros.id} />
        {:else if enrutador.actual.nombre === 'historial'}
          <HistorialAnalisis />
        {:else if enrutador.actual.nombre === 'catalogo'}
          <CatalogoReferencia />
        {:else if enrutador.actual.nombre === 'error'}
          <ErrorAnalisis codigo={enrutador.actual.parametros.codigo} />
        {:else}
          <NoEncontrado />
        {/if}
      </div>
    </main>

  </div>

  <Notificaciones />

  {#if modalCatalogo}
    <ModalCatalogo pestanaInicial={enrutador.modal ?? 'agregar'} onCerrar={cerrarCatalogo} />
  {/if}

  {#if modalExportar}
    <ModalExportar idAnalisis={idExportar} onCerrar={cerrarExportar} />
  {/if}

  <Modal
    abierto={acercaDe}
    titulo="Acerca de AudioTrace"
    subtitulo="Consola de evidencia de similitud acústica sobre SoupDB"
    icono="graphic_eq"
    ancho="md"
    onCerrar={() => (acercaDe = false)}
  >
    <div class="space-y-4 text-body-md text-on-surface-variant">
      <p>
        AudioTrace compara una muestra de audio contra el catálogo de referencia y presenta
        <strong class="text-on-surface">similitud acústica</strong>, no un dictamen ni una probabilidad de infracción.
        No existe un umbral legal integrado en la interfaz.
      </p>
      <div class="grid gap-2 sm:grid-cols-2">
        <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
          <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Pipeline</p>
          <p class="mt-1 font-code text-code-sm text-on-surface">5 s por segmento · 20 MFCC · 128 dimensiones</p>
        </div>
        <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
          <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Índice</p>
          <p class="mt-1 font-code text-code-sm text-on-surface">HNSW · distancia euclidiana · k vecinos</p>
        </div>
        <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
          <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Persistencia</p>
          <p class="mt-1 font-code text-code-sm text-on-surface">songs · audio_segments · analyses · analysis_matches</p>
        </div>
        {#if app.estadoConexion.etiqueta}
          <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
            <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Integración</p>
            <p class="mt-1 flex flex-wrap items-center gap-1.5">
              <Insignia tono="info" punto>{app.estadoConexion.etiqueta}</Insignia>
            </p>
          </div>
        {/if}
      </div>
      <div class="rounded-lg border border-advertencia/30 bg-advertencia-suave p-3 text-body-sm text-amber-900">
        <p class="flex items-start gap-1.5">
          <span class="material-symbols-outlined text-[18px]">warning</span>
          <span>
            {#if app.estadoConexion.modo === 'demo'}
              Modo demostración: datos locales y análisis simulados. Las referencias añadidas se guardan en el navegador.
            {:else if app.estadoConexion.modo === 'rest'}
              La aplicación consume la API REST de SoupDB. El audio se envía al servicio para analizarlo;
              el historial guarda resultados, sin conservar el archivo subido. El catálogo actual es de solo lectura.
            {:else}
              Contrato nativo Tauri + rsoup preparado. El análisis requiere el pipeline Python y no está implementado en este adaptador.
            {/if}
          </span>
        </p>
      </div>
    </div>
    {#snippet pie()}
      <Boton variante="secundario" onclick={() => (acercaDe = false)}>Cerrar</Boton>
      <a href={enlace('nuevo')} onclick={() => (acercaDe = false)}>
        <Boton variante="primario" icono="add_circle">Iniciar un análisis</Boton>
      </a>
    {/snippet}
  </Modal>
</div>

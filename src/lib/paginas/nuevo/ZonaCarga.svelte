<script lang="ts">
  import Boton from '../../componentes/ui/Boton.svelte';
  import Reproductor from '../../componentes/audio/Reproductor.svelte';
  import { app } from '../../estado/aplicacion.svelte';
  import { EXTENSIONES_AUDIO } from '../../datos/constantes';
  import { formatearDuracion, formatearNumero, formatearTamano } from '../../utilidades/formato';
  import { picosSimulados } from '../../utilidades/audio';

  let {
    cargandoMetadatos,
    onSeleccionar
  }: {
    cargandoMetadatos: boolean;
    onSeleccionar: (archivo: File) => Promise<void> | void;
  } = $props();

  let selector = $state<HTMLInputElement | null>(null);
  let arrastrando = $state(false);

  const ACEPTADOS = EXTENSIONES_AUDIO.join(',');
  const formatosAdmitidos = new Intl.ListFormat('es').format(
    EXTENSIONES_AUDIO.map((extension) => extension.slice(1).toUpperCase())
  );
  const picosVacios = picosSimulados('audiotrace-sin-archivo', 96);

  const metadatos = $derived(app.configuracion.metadatosArchivo);
  const picos = $derived(picosSimulados(app.archivo?.name ?? 'audiotrace', 140));

  const formato = $derived(
    metadatos?.formato ?? app.archivo?.name.split('.').pop()?.toUpperCase() ?? '—'
  );
  const duracionTexto = $derived(
    metadatos?.duracionSegundos !== undefined ? formatearDuracion(metadatos.duracionSegundos) : '—'
  );
  const frecuenciaTexto = $derived(
    metadatos?.frecuenciaMuestreo !== undefined
      ? `${formatearNumero(metadatos.frecuenciaMuestreo)} Hz`
      : '—'
  );
  const canalesTexto = $derived(
    metadatos?.canales === 1
      ? 'Mono'
      : metadatos?.canales === 2
        ? 'Estéreo'
        : metadatos?.canales !== undefined
          ? `${formatearNumero(metadatos.canales)} canales`
          : '—'
  );

  function abrirSelector() {
    if (cargandoMetadatos || app.trabajoActivo) return;
    selector?.click();
  }

  function alElegir(evento: Event) {
    const entrada = evento.currentTarget as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (archivo) void onSeleccionar(archivo);
  }

  function alEntrarArrastre(evento: DragEvent) {
    evento.preventDefault();
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy';
    arrastrando = true;
  }

  function alSoltar(evento: DragEvent) {
    evento.preventDefault();
    arrastrando = false;
    if (cargandoMetadatos || app.trabajoActivo) return;
    const archivo = evento.dataTransfer?.files?.[0];
    if (archivo) void onSeleccionar(archivo);
  }

  function quitarArchivo() {
    if (cargandoMetadatos || app.trabajoActivo) return;
    app.limpiarArchivo();
    if (selector) selector.value = '';
  }
</script>

<div class="space-y-4">
  {#if app.nombreArchivoSugerido}
    <div
      class="flex items-start gap-2.5 rounded-xl border border-secondary/25 bg-secondary-container/25 p-3 text-body-sm leading-relaxed text-on-secondary-container"
      role="status"
    >
      <span class="material-symbols-outlined mt-0.5 text-[18px]" aria-hidden="true">history</span>
      <p>
        <strong class="font-semibold">Sugerencia de reanálisis:</strong>
        {app.nombreArchivoSugerido}. El audio original no se conserva en el historial; vuelve a cargarlo para
        repetir el cotejo.
      </p>
    </div>
  {/if}

  <section class="panel p-4 sm:p-5" aria-labelledby="muestra-titulo">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true"
          >audio_file</span
        >
        <h2 id="muestra-titulo" class="etiqueta-micro font-semibold text-on-surface-variant">
          Muestra en análisis
        </h2>
      </div>
      {#if cargandoMetadatos}
        <span class="font-code text-code-sm font-medium text-primary">LEYENDO METADATOS…</span>
      {:else if app.archivo}
        <span class="font-code text-code-sm font-medium text-secondary">ARCHIVO LISTO</span>
      {:else}
        <span class="font-code text-code-sm font-medium text-on-surface-variant">SIN ARCHIVO</span>
      {/if}
    </div>

    <button
      type="button"
      class={[
        'mt-3 w-full rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors',
        arrastrando
          ? 'border-primary bg-primary/5'
          : 'border-outline-variant/70 bg-surface-container-low/50 hover:border-primary/40 hover:bg-surface-container-low',
        cargandoMetadatos ? 'cursor-wait opacity-80' : ''
      ].join(' ')}
      aria-describedby="ayuda-carga"
      aria-busy={cargandoMetadatos}
      disabled={cargandoMetadatos || app.trabajoActivo}
      onclick={abrirSelector}
      ondragenter={alEntrarArrastre}
      ondragover={alEntrarArrastre}
      ondragleave={() => (arrastrando = false)}
      ondrop={alSoltar}
    >
      <span class="pointer-events-none flex flex-col items-center gap-2">
        <span
          class={[
            'flex h-12 w-12 items-center justify-center rounded-full transition-transform',
            arrastrando ? 'scale-110 bg-primary text-on-primary' : 'bg-primary/10 text-primary'
          ].join(' ')}
        >
          <span class="material-symbols-outlined text-[26px]" aria-hidden="true">
            {cargandoMetadatos ? 'hourglass_top' : arrastrando ? 'file_download' : 'cloud_upload'}
          </span>
        </span>
        <span class="text-headline-sm font-semibold text-on-surface">
          {#if cargandoMetadatos}
            Leyendo metadatos del audio…
          {:else if arrastrando}
            Suelta el archivo para cargarlo
          {:else if app.archivo}
            Arrastra otro archivo o haz clic para reemplazar
          {:else}
            Arrastra tu archivo aquí o haz clic para explorar
          {/if}
        </span>
        <span id="ayuda-carga" class="max-w-lg text-body-sm leading-relaxed text-on-surface-variant">
          El análisis admite archivos {formatosAdmitidos} de al menos 2,5 segundos.
          La preescucha depende de los códecs compatibles con tu navegador.
        </span>
      </span>
    </button>

    <input
      bind:this={selector}
      class="hidden"
      type="file"
      accept={ACEPTADOS}
      tabindex={-1}
      aria-label="Seleccionar archivo de audio"
      onchange={alElegir}
    />

    {#if app.archivo}
      <div class="mt-4 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary shadow-panel"
            >
              <span class="material-symbols-outlined text-[23px]" aria-hidden="true">graphic_eq</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="truncate text-headline-sm font-semibold text-on-surface" title={app.archivo.name}>
                  {app.archivo.name}
                </p>
                <span
                  class="material-symbols-outlined relleno text-[16px] text-exito"
                  title="Archivo seleccionado"
                  aria-label="Archivo seleccionado"
                  >check_circle</span
                >
              </div>
              <p
                class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-code text-code-sm text-on-surface-variant"
              >
                <span>{formato}</span>
                <span aria-hidden="true">·</span>
                <span>{formatearTamano(metadatos?.tamanoBytes ?? app.archivo.size)}</span>
                <span aria-hidden="true">·</span>
                <span>{duracionTexto}</span>
              </p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
            <Boton variante="secundario" tamanio="sm" icono="sync" deshabilitado={cargandoMetadatos || app.trabajoActivo} onclick={abrirSelector}>
              Reemplazar
            </Boton>
            <Boton
              variante="fantasma"
              tamanio="icono"
              icono="delete_outline"
              titulo="Quitar archivo"
              deshabilitado={cargandoMetadatos || app.trabajoActivo}
              onclick={quitarArchivo}
            />
          </div>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-lg bg-surface-container-lowest px-2.5 py-2">
            <dt class="etiqueta-micro text-on-surface-variant">Duración</dt>
            <dd class="mt-0.5 font-code text-code-sm font-medium tabular text-on-surface">{duracionTexto}</dd>
          </div>
          <div class="rounded-lg bg-surface-container-lowest px-2.5 py-2">
            <dt class="etiqueta-micro text-on-surface-variant">Frecuencia</dt>
            <dd class="mt-0.5 font-code text-code-sm font-medium tabular text-on-surface">{frecuenciaTexto}</dd>
          </div>
          <div class="rounded-lg bg-surface-container-lowest px-2.5 py-2">
            <dt class="etiqueta-micro text-on-surface-variant">Canales</dt>
            <dd class="mt-0.5 font-code text-code-sm font-medium text-on-surface">{canalesTexto}</dd>
          </div>
          <div class="rounded-lg bg-surface-container-lowest px-2.5 py-2">
            <dt class="etiqueta-micro text-on-surface-variant">Tamaño</dt>
            <dd class="mt-0.5 font-code text-code-sm font-medium tabular text-on-surface">
              {formatearTamano(metadatos?.tamanoBytes ?? app.archivo.size)}
            </dd>
          </div>
        </dl>
      </div>
    {/if}

    {#if app.archivo && app.urlArchivo && metadatos}
      <div class="mt-4">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p class="etiqueta-micro font-semibold text-on-surface-variant">Pre-escucha local</p>
          <span class="font-code text-code-sm text-on-surface-variant">
            {formato} · {frecuenciaTexto} · {canalesTexto}
          </span>
        </div>
        <Reproductor
          urlAudio={app.urlArchivo}
          titulo={app.archivo.name}
          picos={picos}
          duracionSegundos={metadatos.duracionSegundos}
          variante="consola"
        />
      </div>
    {:else}
      <div class="mt-4 overflow-hidden rounded-xl bg-[#0f172a] p-3 text-white shadow-md">
        <div class="flex items-center justify-between gap-2 font-code text-code-sm">
          <span class="flex items-center gap-1.5 text-white/60">
            <span class="material-symbols-outlined text-[16px] text-cyan-300/70" aria-hidden="true"
              >equalizer</span
            >
            Monitor de pre-escucha
          </span>
          <span class="text-white/40">SIN SEÑAL</span>
        </div>
        <div class="mt-2 flex h-16 items-center gap-[2px] opacity-30" aria-hidden="true">
          {#each picosVacios as pico}
            <span
              class="min-w-0 flex-1 rounded-full bg-cyan-200"
              style={`height:${Math.max(8, Math.round(pico * 100))}%`}
            ></span>
          {/each}
        </div>
        <p class="mt-2 text-body-sm leading-relaxed text-white/55">
          Carga un archivo para reproducirlo aquí.
        </p>
      </div>
    {/if}
    <div class="mt-4 flex justify-center">
      <Boton
        variante="primario"
        tamanio="lg"
        icono="model_training"
        clase="w-full sm:w-auto"
        cargando={app.trabajoActivo}
        deshabilitado={!app.archivo || app.catalogo.length === 0 || cargandoMetadatos || app.cargandoInicial}
        onclick={() => void app.iniciarAnalisis()}
      >
        Iniciar análisis
      </Boton>
    </div>
  </section>
</div>

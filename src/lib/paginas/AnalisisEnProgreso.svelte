<script lang="ts">
  import { onMount } from 'svelte';
  import EncabezadoPagina from '../componentes/ui/EncabezadoPagina.svelte';
  import EstadoVacio from '../componentes/ui/EstadoVacio.svelte';
  import Insignia from '../componentes/ui/Insignia.svelte';
  import OndaAudio from '../componentes/audio/OndaAudio.svelte';
  import { app } from '../estado/aplicacion.svelte';
  import { enlace } from '../navegacion/enrutador.svelte';
  import { picosSimulados } from '../utilidades/audio';
  import { formatearDuracion, formatearTamano } from '../utilidades/formato';

  let transcurrido = $state(0);
  const esDemo = $derived(app.estadoConexion.modo === 'demo');
  const porcentaje = $derived(Math.min(100, Math.max(0, app.progreso?.porcentaje ?? 0)));
  const etapas = [
    { titulo: 'Lectura del archivo', icono: 'audio_file', desde: 4 },
    { titulo: 'Decodificación', icono: 'graphic_eq', desde: 14 },
    { titulo: 'Segmentación', icono: 'content_cut', desde: 28 },
    { titulo: 'Extracción MFCC', icono: 'fingerprint', desde: 30 },
    { titulo: 'Consulta HNSW', icono: 'travel_explore', desde: 72 },
    { titulo: 'Alineación temporal', icono: 'timeline', desde: 86 }
  ];
  const picos = $derived(picosSimulados(app.archivo?.name ?? 'pipeline', 140));
  onMount(() => {
    const inicio = Date.now();
    const reloj = setInterval(() => { transcurrido = (Date.now() - inicio) / 1000; }, 1000);
    return () => clearInterval(reloj);
  });
</script>

<div class="space-y-6">
  <EncabezadoPagina etiqueta="Pipeline acústico" titulo="Procesando análisis acústico" descripcion="Extracción de huellas por ventanas temporales y búsqueda de referencias candidatas en el índice vectorial." />
  {#if !app.trabajoActivo}
    <EstadoVacio icono="hourglass_disabled" titulo="No hay un análisis en curso" descripcion="Carga un archivo de audio para iniciar un nuevo cotejo.">
      <a href={enlace('nuevo')} class="rounded-lg bg-primary px-4 py-2 text-label-md text-on-primary">Nuevo análisis</a>
      <a href={enlace('historial')} class="rounded-lg bg-surface-container px-4 py-2 text-label-md">Ver historial</a>
    </EstadoVacio>
  {:else}
    <div class="flex flex-wrap items-center justify-between gap-3"><Insignia tono="info" punto>{esDemo ? 'Simulación en ejecución' : 'Solicitud en curso'}</Insignia><span class="font-code text-code-sm text-on-surface-variant">{formatearDuracion(transcurrido)} en esta pantalla</span></div>
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="panel min-w-0 p-4"><p class="etiqueta-micro text-on-surface-variant">Archivo sujeto</p><p class="mt-2 truncate text-headline-sm font-semibold" title={app.archivo?.name}>{app.archivo?.name ?? 'Muestra de audio'}</p><p class="mt-1 font-code text-code-sm text-on-surface-variant">{formatearTamano(app.archivo?.size ?? 0)}</p></div>
      <div class="panel p-4"><p class="etiqueta-micro text-on-surface-variant">Matriz espectral</p><p class="mt-2 text-headline-sm font-semibold">20 MFCC · 128 dimensiones</p><p class="mt-1 font-code text-code-sm text-on-surface-variant">Ventanas de 5 s</p></div>
      <div class="panel p-4"><p class="etiqueta-micro text-on-surface-variant">Búsqueda vectorial</p><p class="mt-2 text-headline-sm font-semibold">HNSW · euclidiana</p><p class="mt-1 font-code text-code-sm text-on-surface-variant">{esDemo ? `k = ${app.configuracion.kVecinos}` : 'Parámetros del servicio'}</p></div>
    </div>
    <section class="overflow-hidden rounded-2xl bg-[#0f172a] p-5 text-white shadow-lg sm:p-7" aria-labelledby="monitor-titulo">
      <div class="flex flex-wrap items-center justify-between gap-2"><h2 id="monitor-titulo" class="font-code text-code-sm uppercase tracking-widest text-cyan-200">Monitor del análisis</h2><span class="font-code text-code-sm text-white/50">{esDemo ? 'VISUALIZACIÓN SIMULADA' : 'ESPERANDO RESPUESTA'}</span></div>
      <div class="my-5 opacity-75"><OndaAudio {picos} duracion={100} posicion={esDemo ? porcentaje : 0} altura={100} etiquetas={false} /></div>
      <div class="flex items-end justify-between gap-4"><div><p class="text-headline-md font-semibold">{app.progreso?.etapa ?? 'Preparando solicitud'}</p><p class="mt-2 text-body-sm leading-relaxed text-white/65">{app.progreso?.detalle ?? 'Esperando al servicio de análisis.'}</p></div>{#if esDemo}<span class="font-code text-3xl text-cyan-200">{porcentaje}%</span>{/if}</div>
      <div class="mt-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progreso del análisis" aria-valuemin={0} aria-valuemax={100} aria-valuenow={esDemo ? porcentaje : undefined} aria-valuetext={esDemo ? `${porcentaje} por ciento, simulación` : 'El servicio no expone avance por etapas'}>
        <div class={esDemo ? 'h-full rounded-full bg-cyan-300 transition-all duration-500' : 'h-full w-1/3 animate-barrido rounded-full bg-cyan-300'} style={esDemo ? `width:${porcentaje}%` : undefined}></div>
      </div>
      <p class="mt-3 text-body-sm text-white/60">{esDemo ? 'Los tiempos y las etapas son simulados; no se ejecuta el extractor MFCC en la demo.' : 'El servicio procesa la muestra en Python. No informa porcentaje, tiempo restante ni etapas intermedias.'}</p>
    </section>
    <section aria-labelledby="etapas-titulo">
      <h2 id="etapas-titulo" class="mb-3 text-headline-sm font-semibold">{esDemo ? 'Etapas del pipeline simulado' : 'Etapas del pipeline de referencia'}</h2>
      <ol class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {#each etapas as etapa, indice}
          {@const completa = esDemo && porcentaje >= (etapas[indice + 1]?.desde ?? 100)}
          {@const activa = esDemo && porcentaje >= etapa.desde && !completa}
          <li class={['panel flex items-center gap-3 p-4', activa ? 'ring-2 ring-primary/35' : ''].join(' ')}>
            <span class={['material-symbols-outlined rounded-lg p-2', completa ? 'bg-secondary-container text-secondary' : activa ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-outline'].join(' ')} aria-hidden="true">{completa ? 'check' : etapa.icono}</span>
            <div><p class="text-label-md font-semibold">{etapa.titulo}</p><p class="mt-1 font-code text-code-sm text-on-surface-variant">{!esDemo ? 'Sin telemetría de etapa' : completa ? 'Completada' : activa ? 'En proceso' : 'Pendiente'}</p></div>
          </li>
        {/each}
      </ol>
    </section>
    <p class="text-body-sm leading-relaxed text-on-surface-variant" role="status">Mantén esta pestaña abierta hasta recibir el resultado. Puedes <a class="font-semibold text-primary underline" href={enlace('historial')}>consultar el historial</a> durante la espera; la aplicación abrirá el informe cuando termine.</p>
  {/if}
</div>

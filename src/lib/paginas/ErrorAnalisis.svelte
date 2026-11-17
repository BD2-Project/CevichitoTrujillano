<script lang="ts">
  import { app } from '../estado/aplicacion.svelte';
  import { enlace, enrutador } from '../navegacion/enrutador.svelte';
  import { ERRORES_DEMO } from '../datos/mock';
  import {
    COEFICIENTES_MFCC,
    DIMENSION_VECTOR,
    METRICA_INDICE,
    NOMBRE_INDICE,
    SEGUNDOS_POR_SEGMENTO
  } from '../datos/constantes';
  import type { CodigoErrorAnalisis, ErrorAnalisis } from '../datos/tipos';
  import Boton from '../componentes/ui/Boton.svelte';
  import Insignia from '../componentes/ui/Insignia.svelte';
  import { copiarTexto, formatearFecha } from '../utilidades/formato';

  let { codigo }: { codigo: string } = $props();

  const CODIGOS_VALIDOS = ['422', '503', '500'] as const;

  function esCodigoValido(valor: string): valor is CodigoErrorAnalisis {
    return (CODIGOS_VALIDOS as readonly string[]).includes(valor);
  }

  interface ErrorConSolicitud extends ErrorAnalisis {
    idSolicitud?: string;
  }

  interface EtapaDiagnostico {
    etiqueta: string;
    icono: string;
    chip: string;
    descripcion: string;
  }

  const ETAPAS: Record<CodigoErrorAnalisis, EtapaDiagnostico> = {
    '422': {
      etiqueta: 'Decodificación y segmentación',
      icono: 'audio_file',
      chip: 'Audio no procesable',
      descripcion: 'El audio no superó la validación previa al cotejo vectorial.'
    },
    '503': {
      etiqueta: 'Preparación del servicio',
      icono: 'dns',
      chip: 'Servicio no disponible',
      descripcion: 'El servicio no respondió o no tenía el índice y el perfil acústico listos. Consulta el mensaje recibido.'
    },
    '500': {
      etiqueta: 'Ejecución interna del pipeline',
      icono: 'bug_report',
      chip: 'Operación sin resultado confirmado',
      descripcion: 'El pipeline se interrumpió sin exponer trazas internas al cliente.'
    }
  };

  const ETIQUETAS_DEMO: Record<CodigoErrorAnalisis, string> = {
    '422': 'Audio ilegible',
    '503': 'Servicio no listo',
    '500': 'Fallo interno'
  };

  const NOTAS_SEGURIDAD: Record<CodigoErrorAnalisis, string> = {
    '422': 'El servicio rechazó el audio durante la validación. Revisa el archivo antes de volver a enviarlo.',
    '503': 'No se recibió un resultado válido. Si hubo una interrupción de conexión, consulta el historial antes de repetir la solicitud.',
    '500': 'No se pudo confirmar el resultado de la operación. Actualiza el historial antes de volver a enviar el archivo.'
  };

  const metricaEtiqueta = METRICA_INDICE === 'euclidean' ? 'euclidiana' : METRICA_INDICE;

  const codigoSolicitado = $derived((codigo ?? '').trim());
  const codigoValido = $derived(esCodigoValido(codigoSolicitado));
  const codigoBase = $derived(esCodigoValido(codigoSolicitado) ? codigoSolicitado : '500');
  const codigoDesconocido = $derived(!codigoValido);

  const usaErrorActual = $derived(
    app.errorActual !== null && app.errorActual.codigo === codigoSolicitado
  );
  const error = $derived(
    usaErrorActual && app.errorActual ? app.errorActual : ERRORES_DEMO[codigoBase]
  );
  const etapa = $derived(ETAPAS[codigoBase]);
  const notaSeguridad = $derived(NOTAS_SEGURIDAD[codigoBase]);
  const esDemo = $derived(app.estadoConexion.modo === 'demo');
  const fechaError = $derived(usaErrorActual ? error.fecha ?? null : null);
  const solicitud = $derived(error.solicitud ?? null);
  const notasConfiguracion = $derived(app.configuracion.notas.trim());

  const idSolicitud = $derived.by(() => {
    if (!usaErrorActual || !app.errorActual) return null;
    const posible = (app.errorActual as ErrorConSolicitud).idSolicitud;
    return typeof posible === 'string' && posible.trim() ? posible.trim() : null;
  });

  let copiando = $state(false);
  let reintentando = $state(false);
  let codigoAvisado: string | null = null;

  $effect(() => {
    if (!codigoDesconocido) {
      codigoAvisado = null;
      return;
    }
    if (codigoAvisado === codigoSolicitado) return;
    codigoAvisado = codigoSolicitado;
    app.notificar(
      'advertencia',
      'Código de error desconocido',
      `Se muestra el diagnóstico 500${codigoSolicitado ? ` para «${codigoSolicitado}»` : ''}.`
    );
  });

  function textoDiagnostico(): string {
    const lineas = [
      'AudioTrace · Diagnóstico de análisis',
      `Código de diagnóstico: ${codigoBase}${codigoDesconocido ? ` (solicitado: ${codigoSolicitado || 'sin código'})` : ''}`,
      `Origen: ${usaErrorActual ? 'Último intento' : 'Vista de ejemplo; no representa una solicitud fallida real'}`,
      `Título: ${error.titulo}`,
      `Mensaje: ${error.mensaje}`,
      `Detalle: ${error.detalle}`,
      `Solicitud: ${solicitud ?? 'No registrada'}`,
      `Etapa: ${etapa.etiqueta}`,
      `Fecha: ${fechaError ? formatearFecha(fechaError) : 'No registrada'}`,
      `Conexión: ${app.estadoConexion.etiqueta} (${app.estadoConexion.modo}) · ${app.estadoConexion.detalle}`
    ];
    if (idSolicitud) lineas.splice(6, 0, `ID de solicitud: ${idSolicitud}`);
    lineas.push(
      esDemo ? `Configuración de demo: ${app.configuracion.descripcion} · k=${app.configuracion.kVecinos}`
        : 'Configuración administrada por el servidor; k no informado por la API.'
    );
    return lineas.join('\n');
  }

  async function copiarDiagnostico(): Promise<void> {
    if (copiando) return;
    copiando = true;
    const ok = await copiarTexto(textoDiagnostico());
    copiando = false;
    app.notificar(
      ok ? 'exito' : 'advertencia',
      ok ? 'Diagnóstico copiado' : 'No se pudo copiar el diagnóstico',
      ok
        ? 'El resumen técnico está en el portapapeles.'
        : 'El navegador bloqueó el portapapeles; selecciona el texto manualmente.'
    );
  }

  async function reintentar(): Promise<void> {
    if (reintentando) return;
    if (!app.archivo) {
      app.notificar(
        'info',
        'Carga un audio para reintentar',
        'El archivo no se conserva entre intentos; selecciona la muestra en Nuevo análisis.'
      );
      enrutador.ir('nuevo');
      return;
    }
    reintentando = true;
    try {
      app.configuracion.forzarError = null;
      await app.iniciarAnalisis();
    } finally {
      reintentando = false;
    }
  }
</script>

<div class="space-y-4 sm:space-y-5">
  <section
    class="overflow-hidden rounded-2xl border border-error/20 bg-surface-container-lowest shadow-panel"
    aria-labelledby="diagnostico-titulo"
  >
    <div class="border-b border-outline-variant/40 bg-gradient-to-r from-error-container/40 via-surface-container-lowest to-surface-container-lowest p-4 sm:p-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-error/20 bg-error-container px-2.5 py-1 font-code text-code-sm font-bold text-on-error-container">
              Código {codigoBase}
            </span>
            <Insignia tono={usaErrorActual ? 'peligro' : 'neutro'} punto>{usaErrorActual ? 'Análisis interrumpido' : 'Ejemplo de diagnóstico'}</Insignia>
            {#if fechaError}
              <span class="inline-flex items-center gap-1 rounded-full border border-outline-variant/50 bg-surface-container-low/70 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">calendar_today</span>
                {formatearFecha(fechaError)}
              </span>
            {/if}
            {#if idSolicitud}
              <span class="inline-flex items-center gap-1 rounded-full border border-outline-variant/50 bg-surface-container-low/70 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">fingerprint</span>
                Solicitud <span class="font-code">{idSolicitud}</span>
              </span>
            {/if}
            <Insignia tono={app.estadoConexion.conectado ? 'info' : 'advertencia'} punto>
              {app.estadoConexion.etiqueta}
            </Insignia>
          </div>

          <div class="flex items-start gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error text-on-error shadow-sm">
              <span class="material-symbols-outlined relleno text-[24px]" aria-hidden="true">{etapa.icono}</span>
            </span>
            <div class="min-w-0">
              <p class="text-label-sm font-bold uppercase tracking-[0.08em] text-error">Diagnóstico de fallo</p>
              <h1 id="diagnostico-titulo" class="mt-1 texto-equilibrado text-headline-lg-mobile font-bold tracking-tight text-on-surface sm:text-headline-lg">
                {error.titulo}
              </h1>
              <p class="mt-1.5 max-w-3xl texto-pretty text-body-md leading-relaxed text-on-surface-variant">
                {error.mensaje}
              </p>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
          <Boton variante="secundario" icono="content_copy" onclick={() => void copiarDiagnostico()} cargando={copiando}>
            Copiar diagnóstico
          </Boton>
          <Boton variante="primario" icono="replay" onclick={() => void reintentar()} cargando={reintentando}>
            Reintentar análisis
          </Boton>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-t border-error/10 bg-error-container/15 px-4 py-2.5 sm:px-5">
      <span class="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary-container/35 px-2.5 py-1 text-label-sm font-semibold text-on-secondary-container">
        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">shield</span>
        {etapa.chip}
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container-lowest/80 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">inventory_2</span>
        Consulta el historial antes de repetir
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container-lowest/80 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">audio_file</span>
        El audio no se persiste
      </span>
      {#if codigoDesconocido}
        <span class="inline-flex items-center gap-1.5 rounded-full border border-advertencia/40 bg-advertencia-suave px-2.5 py-1 text-label-sm font-semibold text-amber-900">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">warning</span>
          Código desconocido · se muestra el diagnóstico 500
        </span>
      {/if}
    </div>
  </section>

  <div class="grid gap-4 xl:grid-cols-12">
    <section class="panel p-4 sm:p-5 xl:col-span-7" aria-labelledby="detalle-tecnico-titulo">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="etiqueta-micro text-primary">Detalle técnico</p>
          <h2 id="detalle-tecnico-titulo" class="mt-0.5 text-headline-md font-semibold tracking-tight text-on-surface">
            Qué ocurrió
          </h2>
        </div>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container-low px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">visibility_off</span>
          Sin trazas internas
        </span>
      </div>

      <dl class="mt-4 grid gap-3">
        <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3">
          <dt class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Mensaje del servicio</dt>
          <dd class="mt-1 text-body-md leading-relaxed text-on-surface">{error.mensaje}</dd>
        </div>
        <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3">
          <dt class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Detalle</dt>
          <dd class="mt-1 text-body-md leading-relaxed text-on-surface">{error.detalle}</dd>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3">
            <dt class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Solicitud</dt>
            <dd class="mt-1 break-words font-code text-code-sm leading-relaxed text-on-surface">
              {solicitud ?? 'No registrada'}
            </dd>
          </div>
          <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3">
            <dt class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Etapa relacionada</dt>
            <dd class="mt-1 text-body-md font-medium text-on-surface">{etapa.etiqueta}</dd>
            <dd class="mt-0.5 text-body-sm leading-snug text-on-surface-variant">{etapa.descripcion}</dd>
          </div>
        </div>
      </dl>

      <div class="mt-4 flex items-start gap-2.5 rounded-xl border border-secondary/20 bg-secondary-container/20 p-3">
        <span class="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">verified_user</span>
        <div class="min-w-0">
          <p class="text-label-md font-semibold text-on-surface">Estado de la operación</p>
          <p class="mt-0.5 text-body-sm leading-relaxed text-on-surface-variant">{notaSeguridad}</p>
          <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
            El audio de la consulta no se persiste en el catálogo ni en el historial.
          </p>
        </div>
      </div>
    </section>

    <div class="flex flex-col gap-4 xl:col-span-5">
      <section class="overflow-hidden rounded-2xl bg-[#090D16] text-slate-200 shadow-panel" aria-labelledby="consola-titulo">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0F172A] px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2" aria-hidden="true">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-error"></span>
            </span>
            <h2 id="consola-titulo" class="font-code text-[11px] font-bold uppercase tracking-[0.08em] text-white">
              Consola de diagnóstico
            </h2>
          </div>
          <span class="rounded bg-slate-800 px-1.5 py-0.5 font-code text-[10px] font-semibold text-slate-300">HTTP {codigoBase}</span>
        </div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 px-4 py-3.5 font-code text-code-sm">
          <dt class="text-slate-400">Etapa</dt>
          <dd class="text-right text-slate-100">{etapa.etiqueta}</dd>
          <dt class="text-slate-400">Ventana</dt>
          <dd class="text-right text-slate-100">{SEGUNDOS_POR_SEGMENTO} s / segmento</dd>
          <dt class="text-slate-400">MFCC</dt>
          <dd class="text-right text-slate-100">{COEFICIENTES_MFCC} coeficientes</dd>
          <dt class="text-slate-400">Vector</dt>
          <dd class="text-right text-slate-100">{DIMENSION_VECTOR} dimensiones</dd>
          <dt class="text-slate-400">Índice</dt>
          <dd class="text-right text-slate-100">{NOMBRE_INDICE} · {metricaEtiqueta}</dd>
          <dt class="text-slate-400">Vecinos</dt>
          <dd class="text-right text-slate-100">{esDemo ? `k = ${app.configuracion.kVecinos}` : 'Configurado en SoupDB'}</dd>
        </dl>
        <p class="flex items-start gap-2 border-t border-white/10 bg-[#0F172A] px-4 py-2.5 text-[11px] leading-snug text-slate-300">
          <span class="material-symbols-outlined text-[15px] text-secondary-fixed" aria-hidden="true">verified_user</span>
          <span>Diagnóstico limitado a metadatos del intento. No se muestran trazas ni rutas internas.</span>
        </p>
      </section>

      <section class="panel p-4" aria-labelledby="configuracion-titulo">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="etiqueta-micro text-primary">Configuración</p>
            <h2 id="configuracion-titulo" class="mt-0.5 text-headline-sm font-semibold text-on-surface">
              Parámetros del intento
            </h2>
          </div>
          <Insignia tono="info" icono="tune">{esDemo ? 'Demo' : 'Servicio'}</Insignia>
        </div>
        <dl class="mt-3 space-y-2.5">
          <div>
            <dt class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Catálogo</dt>
            <dd class="mt-0.5 text-body-md font-medium text-on-surface">
              {esDemo ? app.configuracion.descripcion || 'Catálogo local' : 'Catálogo completo del servicio SoupDB'}
            </dd>
            {#if esDemo && app.configuracion.idCatalogo}
              <dd class="font-code text-[11px] text-on-surface-variant">{app.configuracion.idCatalogo}</dd>
            {/if}
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low/60 p-2.5">
              <dt class="text-label-sm text-on-surface-variant">k vecinos</dt>
              <dd class="font-code text-code-sm font-semibold text-on-surface">{esDemo ? app.configuracion.kVecinos : 'No informado por la API'}</dd>
            </div>
            <div class="rounded-lg border border-outline-variant/50 bg-surface-container-low/60 p-2.5">
              <dt class="text-label-sm text-on-surface-variant">Métrica</dt>
              <dd class="font-code text-code-sm font-semibold text-on-surface">{metricaEtiqueta}</dd>
            </div>
          </div>
          <div>
            <dt class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Notas</dt>
            <dd class="mt-0.5 text-body-sm leading-relaxed text-on-surface-variant">
              {esDemo ? notasConfiguracion || 'Sin notas de configuración.' : 'La API actual recibe únicamente el archivo de audio.'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>

  <div class="grid gap-4 xl:grid-cols-12">
    <section class="panel p-4 sm:p-5 xl:col-span-7" aria-labelledby="sugerencias-titulo">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="etiqueta-micro text-primary">Recuperación</p>
          <h2 id="sugerencias-titulo" class="mt-0.5 text-headline-md font-semibold tracking-tight text-on-surface">
            Sugerencias para continuar
          </h2>
        </div>
        <Insignia tono="advertencia" icono="lightbulb">{error.sugerencias.length} pasos</Insignia>
      </div>

      {#if error.sugerencias.length > 0}
        <ol class="mt-3 space-y-2">
          {#each error.sugerencias as sugerencia, indice}
            <li class="flex items-start gap-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-2.5">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-container-high font-code text-code-sm font-semibold text-on-surface-variant" aria-hidden="true">
                {indice + 1}
              </span>
              <span class="text-body-md leading-relaxed text-on-surface">{sugerencia}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="mt-3 rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/40 p-3 text-body-sm text-on-surface-variant">
          El servicio no devolvió sugerencias adicionales para este diagnóstico.
        </p>
      {/if}

      <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/50 pt-4">
        <Boton variante="primario" icono="replay" onclick={() => void reintentar()} cargando={reintentando}>
          Reintentar análisis
        </Boton>
        <a
          href={enlace('nuevo')}
          class="enlace-foco inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3.5 text-label-md font-medium text-on-surface shadow-sm transition-colors hover:bg-surface-container-low"
        >
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
          Editar configuración
        </a>
        <a
          href={enlace('historial')}
          class="enlace-foco inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">history</span>
          Ver historial
        </a>
      </div>
      <p class="mt-2 flex items-start gap-1.5 text-body-sm leading-snug text-on-surface-variant">
        <span class="material-symbols-outlined text-[15px]" aria-hidden="true">info</span>
        <span>Si no hay un audio cargado, «Reintentar análisis» abre Nuevo análisis para seleccionarlo de nuevo.</span>
      </p>
    </section>

    <aside class="panel p-4 sm:p-5 xl:col-span-5" aria-labelledby="probar-titulo">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="etiqueta-micro text-primary">Ejemplos de interfaz</p>
          <h2 id="probar-titulo" class="mt-0.5 text-headline-md font-semibold tracking-tight text-on-surface">
            Probar diagnóstico
          </h2>
        </div>
        <Insignia tono="neutro" icono="science">Demo</Insignia>
      </div>
      <p class="mt-1.5 text-body-sm leading-relaxed text-on-surface-variant">
        Previsualiza los tres diagnósticos. Abrir estos enlaces no envía solicitudes ni provoca errores en SoupDB.
      </p>

      <ul class="mt-3 grid grid-cols-3 gap-2">
        {#each CODIGOS_VALIDOS as codigoDemo (codigoDemo)}
          {@const activo = codigoValido && codigoBase === codigoDemo}
          <li>
            <a
              href={enlace('error', { codigo: codigoDemo })}
              class={[
                'enlace-foco flex h-full flex-col gap-0.5 rounded-xl border p-2.5 transition-colors',
                activo
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container-high'
              ].join(' ')}
              aria-current={activo ? 'page' : undefined}
            >
              <span class="font-code text-code-sm font-bold">HTTP {codigoDemo}</span>
              <span class={['text-label-sm leading-tight', activo ? 'text-primary' : 'text-on-surface-variant'].join(' ')}>
                {ETIQUETAS_DEMO[codigoDemo]}
              </span>
            </a>
          </li>
        {/each}
      </ul>

      <div class="mt-3 rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3">
        <p class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Diagnóstico visible</p>
        <p class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">{etapa.descripcion}</p>
      </div>

      {#if codigoDesconocido}
        <p class="mt-3 flex items-start gap-2 rounded-xl border border-advertencia/35 bg-advertencia-suave p-2.5 text-body-sm leading-snug text-amber-900">
          <span class="material-symbols-outlined text-[17px]" aria-hidden="true">warning</span>
          <span>
            Código <span class="font-code">«{codigoSolicitado || 'sin código'}»</span> no reconocido. Se muestra el diagnóstico 500.
          </span>
        </p>
      {/if}
    </aside>
  </div>
</div>

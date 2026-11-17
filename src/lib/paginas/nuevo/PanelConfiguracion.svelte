<script lang="ts">
  import Boton from '../../componentes/ui/Boton.svelte';
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import { app } from '../../estado/aplicacion.svelte';
  import { enlace } from '../../navegacion/enrutador.svelte';
  import { K_VECINOS_PREDETERMINADO } from '../../datos/constantes';
  import { formatearNumero } from '../../utilidades/formato';

  let { cargandoMetadatos }: { cargandoMetadatos: boolean } = $props();

  interface OpcionCatalogo {
    id: string;
    nombre: string;
    canciones: number;
    segmentos: number;
    completa: boolean;
  }

  const esDemo = $derived(app.estadoConexion.modo === 'demo');

  const opciones = $derived.by<OpcionCatalogo[]>(() => {
    if (app.catalogo.length === 0) return [];
    return [
      {
        id: 'catalogo-completo',
        nombre: 'Catálogo completo',
        canciones: app.catalogo.length,
        segmentos: app.totalSegmentosCatalogo,
        completa: true
      }
    ];
  });

  const opcionActual = $derived(
    opciones.find((opcion) => opcion.id === app.configuracion.idCatalogo) ?? null
  );

  const totalCanciones = $derived(opcionActual?.canciones ?? app.catalogo.length);
  const totalSegmentos = $derived(opcionActual?.segmentos ?? app.totalSegmentosCatalogo);
  const listoArchivo = $derived(app.archivo !== null);
  const listoCatalogo = $derived(opciones.length > 0 && opcionActual !== null);
  const posicionRecomendada = $derived(((K_VECINOS_PREDETERMINADO - 1) / 19) * 100);

  $effect(() => {
    if (opciones.length === 0) return;
    if (opciones.some((opcion) => opcion.id === app.configuracion.idCatalogo)) return;
    const predeterminada = opciones[0];
    aplicarOpcion(predeterminada.id);
  });

  function aplicarOpcion(id: string) {
    const opcion = opciones.find((item) => item.id === id);
    if (!opcion) return;
    app.configuracion.idCatalogo = opcion.id;
    app.configuracion.descripcion = `${opcion.nombre} · ${formatearNumero(opcion.canciones)} canciones · ${formatearNumero(opcion.segmentos)} segmentos`;
  }

  function alCambiarCatalogo(evento: Event) {
    aplicarOpcion((evento.currentTarget as HTMLSelectElement).value);
  }

  function alCambiarVecinos(evento: Event) {
    app.configuracion.kVecinos = Number((evento.currentTarget as HTMLInputElement).value);
  }

  function alEscribirNotas(evento: Event) {
    app.configuracion.notas = (evento.currentTarget as HTMLTextAreaElement).value.slice(0, 280);
  }

  function alCambiarError(evento: Event) {
    const valor = (evento.currentTarget as HTMLSelectElement).value;
    if (valor === '422' || valor === '503' || valor === '500') {
      app.configuracion.forzarError = valor;
    } else {
      app.configuracion.forzarError = null;
    }
  }

  async function iniciarAnalisis() {
    if (!app.archivo || app.trabajoActivo) return;
    await app.iniciarAnalisis();
  }

  function irComoFunciona() {
    const seccion = document.getElementById('como-funciona');
    if (!seccion) return;
    const reducirMovimiento =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    seccion.scrollIntoView({ behavior: reducirMovimiento ? 'auto' : 'smooth', block: 'start' });
    seccion.focus({ preventScroll: true });
  }
</script>

<section class="panel p-4" aria-labelledby="configuracion-titulo">
  <div class="flex items-center justify-between gap-2 border-b border-outline-variant/40 pb-3">
    <div class="flex items-center gap-2">
      <span class="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">tune</span>
      <h2 id="configuracion-titulo" class="text-headline-sm font-semibold text-on-surface">
        Configuración del análisis
      </h2>
    </div>
    <span
      class="rounded bg-surface-container-high px-1.5 py-0.5 font-code text-[10px] font-medium uppercase tracking-wider text-on-surface-variant"
    >
      Parámetros
    </span>
  </div>

  <div class="mt-4 space-y-4">
    <div class="space-y-1.5">
      <div class="campo-etiqueta">
        <label for="catalogo-referencia">Catálogo de referencia</label>
        <span class="text-label-sm font-normal text-on-surface-variant">
          {#if opciones.length > 0}
            {formatearNumero(totalCanciones)} canciones
          {:else}
            Cargando…
          {/if}
        </span>
      </div>
      <div class="relative">
        <select
          id="catalogo-referencia"
          class="campo-selector"
          value={app.configuracion.idCatalogo}
          disabled={opciones.length === 0 || !esDemo || app.trabajoActivo}
          aria-describedby="catalogo-detalle"
          onchange={alCambiarCatalogo}
        >
          {#if opciones.length === 0}
            <option value="">Catálogo no disponible</option>
          {/if}
          {#each opciones as opcion (opcion.id)}
            <option value={opcion.id}>
              {opcion.nombre} ({formatearNumero(opcion.canciones)} canciones ·
              {formatearNumero(opcion.segmentos)} segmentos)
            </option>
          {/each}
        </select>
        <span
          class="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
          aria-hidden="true">swap_vert</span
        >
      </div>
      <div
        id="catalogo-detalle"
        class="space-y-1 rounded-lg border border-outline-variant/40 bg-surface-container-low p-2.5 font-code text-code-sm text-on-surface-variant"
      >
        {#if opcionActual}
          <div class="flex items-center justify-between gap-2">
            <span>Colección</span>
            <span class="truncate text-right font-medium text-on-surface" title={opcionActual.nombre}>
              {opcionActual.completa ? 'Todas las colecciones' : opcionActual.nombre}
            </span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span>Índice</span>
            <span class="tabular text-on-surface">
              {formatearNumero(totalCanciones)} canciones · {formatearNumero(totalSegmentos)} segmentos
            </span>
          </div>
        {:else}
          <p>No hay referencias disponibles. Revisa la conexión o añade referencias en la demo.</p>
        {/if}
      </div>
      <a
        href={enlace('catalogo')}
        class="enlace-foco inline-flex items-center gap-1 rounded text-label-md font-medium text-primary hover:text-primary-container"
      >
        <span class="material-symbols-outlined text-[15px]" aria-hidden="true">manage_search</span>
        Gestionar referencias
      </a>
    </div>

    <div class="separador"></div>

    {#if esDemo}
    <div>
      <div class="campo-etiqueta">
        <label for="k-vecinos">Vecinos por segmento (k)</label>
        <span class="rounded bg-secondary-container/45 px-1.5 py-0.5 font-code text-code-sm font-semibold text-on-secondary-container">
          k = {app.configuracion.kVecinos}
        </span>
      </div>
      <input
        id="k-vecinos"
        class="mt-2 w-full cursor-pointer accent-primary"
        type="range"
        min="1"
        max="20"
        step="1"
        value={app.configuracion.kVecinos}
        aria-describedby="k-ayuda"
        oninput={alCambiarVecinos}
      />
      <div class="relative mt-1 h-2.5" aria-hidden="true">
        <span
          class="absolute top-0 h-2.5 w-px bg-secondary"
          style={`left:${posicionRecomendada}%`}
        ></span>
      </div>
      <div class="flex items-center justify-between gap-2 text-label-sm text-on-surface-variant">
        <span class="font-code">1</span>
        <span class="font-semibold text-secondary">
          {K_VECINOS_PREDETERMINADO} recomendado
        </span>
        <span class="font-code">20</span>
      </div>
      <p id="k-ayuda" class="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
        Cada segmento consulta k vecinos en el índice HNSW con distancia euclidiana. Un k mayor amplía la
        búsqueda, no la certeza del resultado.
      </p>
    </div>

    <div class="separador"></div>

    <div class="space-y-1.5">
      <div class="campo-etiqueta">
        <label for="notas-analisis">Notas del análisis</label>
        <span class="font-code text-code-sm font-normal tabular text-on-surface-variant">
          {app.configuracion.notas.length} / 280
        </span>
      </div>
      <textarea
        id="notas-analisis"
        class="campo-entrada resize-none"
        rows="3"
        maxlength={280}
        placeholder="Ej.: prueba de aula con un fragmento de 20 s."
        value={app.configuracion.notas}
        oninput={alEscribirNotas}
      ></textarea>
    </div>

    {:else}
      <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 text-body-sm leading-relaxed text-on-surface-variant">
        <p class="font-semibold text-on-surface">Parámetros administrados por el servicio</p>
        <p class="mt-1">La API recibe el archivo y consulta el catálogo completo. El valor de k y el extractor se configuran en el servidor; esta solicitud no admite notas ni filtros de colección.</p>
      </div>
    {/if}

    {#if esDemo}
      <div class="space-y-2 rounded-lg border border-advertencia/25 bg-advertencia-suave/60 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="etiqueta-micro font-semibold text-amber-900">Diagnóstico de la demo</p>
          <Insignia tono="advertencia">Solo demo</Insignia>
        </div>
        <label class="block text-label-md font-semibold text-on-surface" for="forzar-error">
          Respuesta de error simulada
        </label>
        <select
          id="forzar-error"
          class="campo-selector text-body-sm"
          value={app.configuracion.forzarError ?? ''}
          onchange={alCambiarError}
        >
          <option value="">Sin error</option>
          <option value="422">422 · Audio no procesable</option>
          <option value="503">503 · Servicio no disponible</option>
          <option value="500">500 · Error interno</option>
        </select>
        <p class="text-body-sm leading-relaxed text-amber-900/85">
          Fuerza el fallo para revisar la pantalla de diagnóstico sin salir del flujo. El intento fallido no
          se guarda en el historial.
        </p>
      </div>
    {/if}

    <div class="separador"></div>

    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[19px] text-primary" aria-hidden="true"
          >playlist_add_check</span
        >
        <h3 class="text-headline-sm font-semibold text-on-surface">Listo para analizar</h3>
      </div>

      <ul class="space-y-2">
        <li class="flex items-start gap-2">
          <span
            class={[
              'material-symbols-outlined mt-0.5 text-[18px]',
              listoArchivo ? 'relleno text-exito' : 'text-outline'
            ].join(' ')}
            aria-hidden="true">{listoArchivo ? 'check_circle' : 'radio_button_unchecked'}</span
          >
          <div class="min-w-0">
            <p class="text-label-md font-semibold text-on-surface">Archivo de audio</p>
            <p class="truncate text-body-sm text-on-surface-variant" title={app.archivo?.name ?? ''}>
              {#if cargandoMetadatos}
                Leyendo metadatos…
              {:else if app.archivo}
                {app.archivo.name}
              {:else}
                Selecciona un archivo válido para continuar.
              {/if}
            </p>
          </div>
        </li>
        <li class="flex items-start gap-2">
          <span
            class={[
              'material-symbols-outlined mt-0.5 text-[18px]',
              listoCatalogo ? 'relleno text-exito' : 'text-outline'
            ].join(' ')}
            aria-hidden="true">{listoCatalogo ? 'check_circle' : 'radio_button_unchecked'}</span
          >
          <div class="min-w-0">
            <p class="text-label-md font-semibold text-on-surface">Catálogo de referencia</p>
            <p class="text-body-sm text-on-surface-variant">
              {#if listoCatalogo && opcionActual}
                {opcionActual.nombre} · {formatearNumero(totalCanciones)} canciones · {formatearNumero(
                  totalSegmentos
                )} segmentos.
              {:else}
                Esperando las referencias del catálogo.
              {/if}
            </p>
          </div>
        </li>
        <li class="flex items-start gap-2">
          <span
            class="material-symbols-outlined relleno mt-0.5 text-[18px] text-exito"
            aria-hidden="true">check_circle</span
          >
          <div class="min-w-0">
            <p class="text-label-md font-semibold text-on-surface">Pipeline {esDemo ? 'simulado' : 'del servicio'}</p>
            <p class="text-body-sm text-on-surface-variant">
              20 MFCC · vector de 128 dimensiones{esDemo ? ` · k = ${app.configuracion.kVecinos}` : ''}.
            </p>
          </div>
        </li>
      </ul>

      <Boton
        variante="primario"
        tamanio="lg"
        icono="model_training"
        clase="w-full"
        cargando={app.trabajoActivo}
        deshabilitado={!listoArchivo || !listoCatalogo || cargandoMetadatos || app.cargandoInicial}
        onclick={() => void iniciarAnalisis()}
      >
        Iniciar análisis
      </Boton>

      <div
        class="flex items-start gap-2 rounded-lg bg-surface-container-low px-2.5 py-2 text-body-sm leading-relaxed text-on-surface-variant"
      >
        <span class="material-symbols-outlined mt-0.5 text-[17px] text-secondary" aria-hidden="true"
          >verified_user</span
        >
        <p>
          {#if esDemo}
            En la demo se reproducen el audio y sus metadatos localmente. El cotejo es simulado y el archivo no se persiste.
          {:else}
            El archivo se envía al servicio de análisis de SoupDB. La consulta no añade la muestra al catálogo de referencia.
          {/if}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-md">
        <a
          href={enlace('catalogo')}
          class="enlace-foco inline-flex items-center gap-1 rounded font-medium text-primary hover:text-primary-container"
        >
          <span class="material-symbols-outlined text-[15px]" aria-hidden="true">library_music</span>
          Explorar temas
        </a>
        <span class="h-3 w-px bg-outline-variant/70" aria-hidden="true"></span>
        <button
          type="button"
          class="enlace-foco inline-flex items-center gap-1 rounded font-medium text-primary hover:text-primary-container"
          onclick={irComoFunciona}
        >
          <span class="material-symbols-outlined text-[15px]" aria-hidden="true">help</span>
          Cómo funciona
        </button>
      </div>
    </div>
  </div>
</section>

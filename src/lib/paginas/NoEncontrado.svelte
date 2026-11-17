<script lang="ts">
  import { enlace, enrutador } from '../navegacion/enrutador.svelte';
  import EncabezadoPagina from '../componentes/ui/EncabezadoPagina.svelte';

  interface RutaDisponible {
    ruta: 'nuevo' | 'historial' | 'catalogo';
    icono: string;
    titulo: string;
    descripcion: string;
  }

  const rutas: RutaDisponible[] = [
    {
      ruta: 'nuevo',
      icono: 'add_circle',
      titulo: 'Nuevo análisis',
      descripcion: 'Carga un audio y configura el cotejo.'
    },
    {
      ruta: 'historial',
      icono: 'history',
      titulo: 'Historial',
      descripcion: 'Revisa expedientes y resultados anteriores.'
    },
    {
      ruta: 'catalogo',
      icono: 'library_music',
      titulo: 'Catálogo',
      descripcion: 'Consulta las referencias acústicas indexadas.'
    }
  ];

  const rutaIntentada = $derived(enrutador.actual.parametros.ruta?.trim() || '');
  const rutaMostrada = $derived(rutaIntentada ? `#${rutaIntentada}` : 'Sin ruta especificada');

  const clasePrimario =
    'enlace-foco inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-label-md font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container';
  const claseSecundario =
    'enlace-foco inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3.5 text-label-md font-medium text-on-surface shadow-sm transition-colors hover:bg-surface-container-low';
</script>

<div class="space-y-4 sm:space-y-5">
  <EncabezadoPagina
    etiqueta="Sistema · HTTP 404"
    titulo="No encontramos esta ruta"
    descripcion="La dirección solicitada no corresponde a ninguna pantalla de AudioTrace. La consola sigue disponible desde el menú lateral."
    icono="explore_off"
  >
    {#snippet acciones()}
      <a href={enlace('nuevo')} class={clasePrimario}>
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add_circle</span>
        Nuevo análisis
      </a>
      <a href={enlace('historial')} class={claseSecundario}>
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">history</span>
        Ver historial
      </a>
    {/snippet}
  </EncabezadoPagina>

  <div class="grid gap-4 xl:grid-cols-12">
    <section class="panel overflow-hidden xl:col-span-8" aria-labelledby="ruta-titulo">
      <div class="degradado-consola p-4 sm:p-5">
        <div class="flex flex-wrap items-start gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
            <span class="material-symbols-outlined text-[24px]" aria-hidden="true">explore_off</span>
          </span>
          <div class="min-w-0 flex-1">
            <p class="etiqueta-micro text-primary">Dirección solicitada</p>
            <h2 id="ruta-titulo" class="mt-0.5 texto-equilibrado text-headline-md font-semibold tracking-tight text-on-surface">
              Ninguna pantalla coincide con esta dirección
            </h2>
            <p class="mt-1 max-w-2xl text-body-md leading-relaxed text-on-surface-variant">
              Puede tratarse de un enlace antiguo o de una dirección que ya no forma parte de la consola.
              El resto del espacio de trabajo sigue funcionando con normalidad.
            </p>
          </div>
          <span class="rounded-full border border-outline-variant/60 bg-surface-container-lowest px-2.5 py-1 font-code text-code-sm font-semibold text-on-surface-variant">
            HTTP 404
          </span>
        </div>

        <div class="mt-4 rounded-xl bg-[#090D16] p-3 text-slate-200 shadow-panel">
          <p class="font-code text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Ruta intentada</p>
          <p class="mt-1 break-all font-code text-code-sm text-slate-100">{rutaMostrada}</p>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <a href={enlace('nuevo')} class={clasePrimario}>
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add_circle</span>
            Nuevo análisis
          </a>
          <a href={enlace('historial')} class={claseSecundario}>
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">history</span>
            Ver historial
          </a>
          <a href={enlace('catalogo')} class={claseSecundario}>
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">library_music</span>
            Explorar catálogo
          </a>
        </div>
      </div>

      <div class="flex items-start gap-2 border-t border-outline-variant/50 px-4 py-3 text-body-sm text-on-surface-variant sm:px-5">
        <span class="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">info</span>
        <p>
          Las rutas se abren desde el menú lateral o desde las acciones de cada pantalla.
          No se modificó ningún dato.
        </p>
      </div>
    </section>

    <aside class="panel p-4 sm:p-5 xl:col-span-4" aria-labelledby="rutas-titulo">
      <p class="etiqueta-micro text-primary">Navegación</p>
      <h2 id="rutas-titulo" class="mt-0.5 text-headline-sm font-semibold text-on-surface">
        Continúa desde aquí
      </h2>

      <ul class="mt-3 space-y-2">
        {#each rutas as item (item.ruta)}
          <li>
            <a
              href={enlace(item.ruta)}
              class="enlace-foco group flex items-start gap-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-2.5 transition-colors hover:border-primary/30 hover:bg-surface-container-low"
            >
              <span class="material-symbols-outlined text-[19px] text-primary" aria-hidden="true">{item.icono}</span>
              <span class="min-w-0 flex-1">
                <span class="block text-label-md font-semibold text-on-surface">{item.titulo}</span>
                <span class="mt-0.5 block text-body-sm leading-snug text-on-surface-variant">{item.descripcion}</span>
              </span>
              <span
                class="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform group-hover:translate-x-0.5"
                aria-hidden="true">arrow_forward</span
              >
            </a>
          </li>
        {/each}
      </ul>
    </aside>
  </div>
</div>

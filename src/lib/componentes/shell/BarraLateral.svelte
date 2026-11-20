<script lang="ts">
  import { enlace, enrutador } from '../../navegacion/enrutador.svelte';
  import { NOMBRE_APLICACION } from '../../datos/constantes';

  let {
    abierto = false,
    onCerrar,
    onAcercaDe
  }: {
    abierto?: boolean;
    onCerrar?: () => void;
    onAcercaDe?: () => void;
  } = $props();

  const enlaces = [
    { ruta: 'nuevo' as const, etiqueta: 'Nuevo análisis', icono: 'add_circle', descripcion: 'Cargar audio y configurar el cotejo' },
    { ruta: 'historial' as const, etiqueta: 'Historial', icono: 'history', descripcion: 'Expedientes y resultados anteriores' },
    { ruta: 'catalogo' as const, etiqueta: 'Catálogo', icono: 'library_music', descripcion: 'Referencias acústicas indexadas' }
  ];

  function activa(nombre: 'nuevo' | 'historial' | 'catalogo'): boolean {
    const actual = enrutador.actual.nombre;
    if (nombre === 'nuevo') return actual === 'nuevo' || actual === 'progreso';
    if (nombre === 'historial') return actual === 'historial' || actual === 'resultados' || actual === 'error';
    return actual === 'catalogo';
  }
</script>

<svelte:window onkeydown={(evento) => { if (evento.key === 'Escape' && abierto) onCerrar?.(); }} />

{#if abierto}
  <button
    type="button"
    class="fixed inset-0 z-30 bg-on-surface/35 backdrop-blur-[1px] lg:hidden"
    aria-label="Cerrar navegación"
    onclick={onCerrar}
  ></button>
{/if}

<aside
  class={[
    'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-outline-variant/50 bg-surface-container-lowest transition-transform duration-200 lg:translate-x-0',
    abierto ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'
  ].join(' ')}
  aria-label="Navegación principal"
>
  <div class="flex h-16 items-center justify-between gap-2 border-b border-outline-variant/50 px-4">
    <a
      href={enlace('nuevo')}
      class="enlace-foco flex min-w-0 items-center gap-2.5 rounded-lg"
      onclick={onCerrar}
    >
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-sm">
        <span class="material-symbols-outlined text-[22px]">graphic_eq</span>
      </span>
      <span class="min-w-0">
        <span class="block truncate text-headline-sm font-semibold tracking-tight text-on-surface">{NOMBRE_APLICACION}</span>
        <span class="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Spectral Precision</span>
      </span>
    </a>
    <button
      type="button"
      class="enlace-foco flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container lg:hidden"
      aria-label="Cerrar menú"
      onclick={onCerrar}
    >
      <span class="material-symbols-outlined text-[20px]">close</span>
    </button>
  </div>

  <nav class="flex-1 overflow-y-auto px-3 py-4">
    <p class="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Espacio de trabajo</p>
    <ul class="space-y-1">
      {#each enlaces as item (item.ruta)}
        {@const seleccionado = activa(item.ruta)}
        <li>
          <a
            href={enlace(item.ruta)}
            class={[
              'enlace-foco group flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors',
              seleccionado
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            ].join(' ')}
            aria-current={seleccionado ? 'page' : undefined}
            onclick={onCerrar}
          >
            <span
              class={['material-symbols-outlined mt-0.5 text-[20px]', seleccionado ? 'relleno' : ''].join(' ')}
              aria-hidden="true">{item.icono}</span
            >
            <span class="min-w-0">
              <span class="block text-label-md font-semibold">{item.etiqueta}</span>
              <span class="mt-0.5 block text-body-sm leading-tight text-on-surface-variant/80">{item.descripcion}</span>
            </span>
          </a>
        </li>
      {/each}
    </ul>

  </nav>

  <div class="flex items-center border-t border-outline-variant/50 px-4 py-3 text-[10px] text-on-surface-variant">
    <button
      type="button"
      class="enlace-foco rounded font-medium transition-colors hover:text-on-surface"
      onclick={onAcercaDe}
    >
      Acerca de
    </button>
  </div>
</aside>

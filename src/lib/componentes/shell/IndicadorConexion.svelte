<script lang="ts">
  import { app } from '../../estado/aplicacion.svelte';
  import Insignia from '../ui/Insignia.svelte';

  let { compacto = false }: { compacto?: boolean } = $props();
  const conexion = $derived(app.estadoConexion);
</script>

{#if compacto}
  <Insignia tono={conexion.conectado ? 'info' : 'advertencia'} punto>
    {conexion.etiqueta}
  </Insignia>
{:else}
  <div class="rounded-xl border border-outline-variant/50 bg-surface-container-low/70 p-3">
    <div class="flex items-center justify-between gap-2">
      <span class="text-label-sm font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Conexión</span>
      <span class={['h-2 w-2 rounded-full', conexion.conectado ? 'bg-exito' : 'bg-advertencia'].join(' ')}></span>
    </div>
    <p class="mt-1 text-label-md font-semibold text-on-surface">{conexion.etiqueta}</p>
    <p class="mt-0.5 text-body-sm leading-snug text-on-surface-variant">{conexion.detalle}</p>
    {#if !conexion.conectado}
      <button
        type="button"
        class="enlace-foco mt-2 rounded text-body-sm font-semibold text-primary disabled:opacity-50"
        disabled={app.cargandoInicial}
        onclick={() => void app.recargarTodo()}
      >
        {app.cargandoInicial ? 'Comprobando conexión…' : 'Volver a conectar'}
      </button>
    {/if}
  </div>
{/if}

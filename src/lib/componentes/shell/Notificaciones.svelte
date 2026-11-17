<script lang="ts">
  import { app } from '../../estado/aplicacion.svelte';
  import type { Tono } from '../../datos/tipos';

  const estilos: Record<Tono, { caja: string; icono: string; simbolo: string }> = {
    neutro: { caja: 'border-outline-variant bg-surface-container-lowest', icono: 'bg-surface-container text-on-surface-variant', simbolo: 'info' },
    primario: { caja: 'border-primary/25 bg-surface-container-lowest', icono: 'bg-primary/10 text-primary', simbolo: 'info' },
    info: { caja: 'border-secondary/25 bg-surface-container-lowest', icono: 'bg-secondary-container/50 text-secondary', simbolo: 'info' },
    exito: { caja: 'border-exito/30 bg-surface-container-lowest', icono: 'bg-exito-suave text-emerald-700', simbolo: 'check_circle' },
    advertencia: { caja: 'border-advertencia/35 bg-surface-container-lowest', icono: 'bg-advertencia-suave text-amber-700', simbolo: 'warning' },
    peligro: { caja: 'border-peligro/30 bg-surface-container-lowest', icono: 'bg-peligro-suave text-red-700', simbolo: 'error' },
    terciario: { caja: 'border-tertiary/25 bg-surface-container-lowest', icono: 'bg-tertiary/10 text-tertiary', simbolo: 'info' }
  };
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite" aria-atomic="false">
  {#each app.notificaciones as notificacion (notificacion.id)}
    <div class={['animate-entrada pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-elevado', estilos[notificacion.tono].caja].join(' ')}>
      <div class={['flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', estilos[notificacion.tono].icono].join(' ')}>
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{estilos[notificacion.tono].simbolo}</span>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-label-md font-semibold text-on-surface">{notificacion.titulo}</p>
        {#if notificacion.mensaje}
          <p class="mt-0.5 text-body-sm leading-snug text-on-surface-variant">{notificacion.mensaje}</p>
        {/if}
      </div>
      <button
        type="button"
        class="enlace-foco flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container"
        aria-label="Descartar notificación"
        onclick={() => app.descartarNotificacion(notificacion.id)}
      >
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  {/each}
</div>

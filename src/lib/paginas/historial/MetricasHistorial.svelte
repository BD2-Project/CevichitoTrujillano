<script lang="ts">
  import Insignia from '../../componentes/ui/Insignia.svelte';
  import TarjetaMetrica from '../../componentes/ui/TarjetaMetrica.svelte';
  import {
    etiquetaSimilitud,
    formatearDuracion,
    formatearNumero,
    formatearSimilitud,
    formatearTamano,
    tonoSimilitud
  } from '../../utilidades/formato';
  import type { MetricasHistorial } from './tipos';

  let { metricas }: { metricas: MetricasHistorial } = $props();

  const origen = $derived(
    metricas.total === 0
      ? 'Sin expedientes registrados'
      : metricas.demo === metricas.total
        ? `${formatearNumero(metricas.total)} ${metricas.total === 1 ? 'expediente demo' : 'expedientes demo'}`
        : metricas.demo === 0
          ? `${formatearNumero(metricas.total)} ${metricas.total === 1 ? 'expediente registrado' : 'expedientes registrados'}`
          : `${formatearNumero(metricas.demo)} demo · ${formatearNumero(metricas.total - metricas.demo)} registros adicionales`
  );

  const detalleCoincidencias = $derived(
    metricas.coincidencias === 0
      ? 'Sin coincidencias candidatas en el registro'
      : `${formatearNumero(metricas.canciones)} canciones cotejadas (suma por expediente)`
  );

  const detalleSimilitud = $derived(
    metricas.mediaMejor === null
      ? 'Aún no hay similitud observada'
      : `Media de las mejores similitudes: ${formatearSimilitud(metricas.mediaMejor)}`
  );

  const detalleMaterial = $derived.by(() => {
    const partes: string[] = [];
    if (metricas.duracionMedia !== null) {
      partes.push(`Duración media: ${formatearDuracion(metricas.duracionMedia)}`);
    }
    if (metricas.tamanoTotal > 0) {
      partes.push(`Tamaño acumulado: ${formatearTamano(metricas.tamanoTotal)}`);
    }
    return partes.length > 0 ? partes.join(' · ') : 'Metadatos de archivo no disponibles';
  });

  const formatos = $derived(
    metricas.formatos.length > 0 ? metricas.formatos.join(' · ') : 'Sin formatos registrados'
  );
</script>

<section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas del historial">
  <TarjetaMetrica
    etiqueta="Análisis registrados"
    valor={formatearNumero(metricas.total)}
    detalle={origen}
    icono="equalizer"
    tono="primario"
    mono
  >
    {#snippet pie()}
      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Insignia tono="info" punto>
          {formatearNumero(metricas.conEvidencia)} con evidencia
        </Insignia>
        <span class="font-code text-code-sm text-on-surface-variant">MFCC · 20 coef.</span>
      </div>
    {/snippet}
  </TarjetaMetrica>

  <TarjetaMetrica
    etiqueta="Coincidencias detectadas"
    valor={formatearNumero(metricas.coincidencias)}
    unidad={metricas.coincidencias === 1 ? 'tramo' : 'tramos'}
    detalle={detalleCoincidencias}
    icono="fingerprint"
    tono="info"
    mono
  >
    {#snippet pie()}
      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Insignia tono="neutro">
          {metricas.sinEvidencia} sin evidencia
          {#if metricas.errores > 0}· {metricas.errores} con error{/if}
        </Insignia>
        <span class="font-code text-code-sm text-on-surface-variant">HNSW · euclidiana</span>
      </div>
    {/snippet}
  </TarjetaMetrica>

  <TarjetaMetrica
    etiqueta="Mejor similitud global"
    valor={formatearSimilitud(metricas.mejorGlobal)}
    detalle={detalleSimilitud}
    icono="query_stats"
    tono={metricas.mejorGlobal === null ? 'neutro' : tonoSimilitud(metricas.mejorGlobal)}
    mono
  >
    {#snippet pie()}
      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Insignia
          tono={metricas.mejorGlobal === null ? 'neutro' : tonoSimilitud(metricas.mejorGlobal)}
          icono="graphic_eq"
        >
          {metricas.mejorGlobal === null ? 'Sin evidencia' : etiquetaSimilitud(metricas.mejorGlobal)}
        </Insignia>
        <span class="font-code text-code-sm text-on-surface-variant">128 dims</span>
      </div>
    {/snippet}
  </TarjetaMetrica>

  <TarjetaMetrica
    etiqueta="Material analizado"
    valor={metricas.duracionTotal > 0 ? formatearDuracion(metricas.duracionTotal, true) : '—'}
    detalle={detalleMaterial}
    icono="album"
    tono="terciario"
    mono
  >
    {#snippet pie()}
      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container px-2.5 py-0.5 font-code text-code-sm text-on-surface"
        >
          <span class="material-symbols-outlined text-[13px]" aria-hidden="true">hard_drive</span>
          {metricas.tamanoTotal > 0 ? formatearTamano(metricas.tamanoTotal) : 'Tamaño no disponible'}
        </span>
        <span class="font-code text-code-sm text-on-surface-variant">{formatos}</span>
      </div>
    {/snippet}
  </TarjetaMetrica>
</section>

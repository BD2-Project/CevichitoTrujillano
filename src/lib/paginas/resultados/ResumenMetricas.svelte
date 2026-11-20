<script lang="ts">
  import type { ResultadoAnalisis } from '../../datos/tipos';
  import BarraSimilitud from '../../componentes/ui/BarraSimilitud.svelte';
  import TarjetaMetrica from '../../componentes/ui/TarjetaMetrica.svelte';
  import {
    etiquetaSimilitud,
    formatearDuracion,
    formatearSimilitud,
    tonoSimilitud
  } from '../../utilidades/formato';
  import {
    cantidadSegmentosTotales,
    materialCubierto
  } from './utiles';

  let { resultado }: { resultado: ResultadoAnalisis } = $props();

  const cantidadCanciones = $derived(new Set(resultado.coincidencias.map((coincidencia) => coincidencia.idCancion)).size);

  const mejor = $derived(
    resultado.coincidencias.reduce<number | null>(
      (maximo, coincidencia) =>
        maximo === null || coincidencia.similitud > maximo ? coincidencia.similitud : maximo,
      null
    )
  );

  const segmentos = $derived(cantidadSegmentosTotales(resultado.coincidencias));
  const cubierto = $derived(materialCubierto(resultado.coincidencias));
  const duracion = $derived(resultado.metadatos?.duracionSegundos ?? null);
  const cobertura = $derived(duracion && duracion > 0 ? Math.min(1, cubierto / duracion) : null);

</script>

{#snippet pieMejor()}
  {#if mejor !== null}
    <BarraSimilitud valor={mejor} etiqueta={formatearSimilitud(mejor, 2)} />
  {:else}
    <p class="text-label-sm text-on-surface-variant">Sin coincidencias candidatas</p>
  {/if}
{/snippet}

{#snippet pieCobertura()}
  {#if cobertura !== null}
    <BarraSimilitud
      valor={Math.min(1, cobertura)}
      etiqueta={formatearSimilitud(cobertura, 1)}
    />
  {/if}
{/snippet}

<section aria-label="Resumen del expediente">
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <TarjetaMetrica
      etiqueta="Coincidencias candidatas"
      valor={resultado.coincidencias.length}
      unidad={resultado.coincidencias.length === 1 ? 'tramo' : 'tramos'}
      detalle={segmentos > 0 ? `${segmentos} segmentos implicados` : 'Sin segmentos coincidentes'}
      icono="grain"
      tono="primario"
      mono
    />

    <TarjetaMetrica
      etiqueta="Canciones de referencia"
      valor={cantidadCanciones}
      unidad={cantidadCanciones === 1 ? 'obra del catálogo' : 'obras del catálogo'}
      icono="library_music"
      tono="terciario"
      mono
    />

    <TarjetaMetrica
      etiqueta="Mejor similitud"
      valor={mejor !== null ? formatearSimilitud(mejor, 2) : '—'}
      detalle={mejor !== null ? etiquetaSimilitud(mejor) : 'Sin evidencia en el catálogo consultado'}
      icono="insights"
      tono={mejor !== null ? tonoSimilitud(mejor) : 'neutro'}
      mono
      pie={pieMejor}
    />

    <TarjetaMetrica
      etiqueta="Material cubierto"
      valor={formatearDuracion(cubierto)}
      unidad="sin duplicar solapes"
      detalle={duracion !== null ? `De ${formatearDuracion(duracion)} analizados` : undefined}
      icono="timelapse"
      tono="info"
      mono
      pie={pieCobertura}
    />
  </div>
</section>

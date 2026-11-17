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

  const canciones = $derived.by(() => {
    const mapa = new Map<number, string>();
    for (const coincidencia of resultado.coincidencias) {
      if (!mapa.has(coincidencia.idCancion)) mapa.set(coincidencia.idCancion, coincidencia.titulo);
    }
    return [...mapa.values()];
  });

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

  const nombres = $derived(
    canciones.length === 0
      ? 'Sin canciones de referencia'
      : `${canciones.slice(0, 3).join(' · ')}${canciones.length > 3 ? ` +${canciones.length - 3}` : ''}`
  );
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
  {:else}
    <p class="text-label-sm text-on-surface-variant">Duración del archivo no disponible</p>
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
      valor={canciones.length}
      unidad={canciones.length === 1 ? 'obra del catálogo' : 'obras del catálogo'}
      detalle={nombres}
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
      detalle={duracion !== null ? `De ${formatearDuracion(duracion)} analizados` : 'Duración del archivo no disponible'}
      icono="timelapse"
      tono="info"
      mono
      pie={pieCobertura}
    />
  </div>
</section>

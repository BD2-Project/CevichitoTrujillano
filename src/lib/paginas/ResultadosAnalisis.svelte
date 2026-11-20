<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '../estado/aplicacion.svelte';
  import { enlace } from '../navegacion/enrutador.svelte';
  import type { ResultadoAnalisis } from '../datos/tipos';
  import Boton from '../componentes/ui/Boton.svelte';
  import EstadoVacio from '../componentes/ui/EstadoVacio.svelte';
  import CargandoResultado from './resultados/CargandoResultado.svelte';
  import EncabezadoResultado from './resultados/EncabezadoResultado.svelte';
  import ResumenMetricas from './resultados/ResumenMetricas.svelte';
  import PestanasResultado from './resultados/PestanasResultado.svelte';
  import TablaCoincidencias from './resultados/TablaCoincidencias.svelte';
  import ComparacionAB from './resultados/ComparacionAB.svelte';
  import FranjaMetadatos from './resultados/FranjaMetadatos.svelte';
  import type { OrdenCoincidencias, PestanaResultado } from './resultados/tipos';
  import { indexarYOrdenar } from './resultados/utiles';
  let { id }: { id: string } = $props();
  let resultado = $state<ResultadoAnalisis | null>(null);
  let cargando = $state(true);
  let pestana = $state<PestanaResultado>('coincidencias');
  let orden = $state<OrdenCoincidencias>('similitud');
  let indiceSeleccionado = $state<number | null>(null);
  const coincidencias = $derived(indexarYOrdenar(resultado?.coincidencias ?? [], orden));
  const seleccionada = $derived(indiceSeleccionado === null ? null : resultado?.coincidencias[indiceSeleccionado] ?? null);

  $effect(() => {
    const identificador = id;
    let vigente = true;
    cargando = true;
    resultado = null;
    pestana = 'coincidencias';
    untrack(() => app.cargarResultado(identificador)).then((expediente) => {
      if (!vigente) return;
      resultado = expediente;
      indiceSeleccionado = expediente?.coincidencias.length ? indexarYOrdenar(expediente.coincidencias, 'similitud')[0].indice : null;
      cargando = false;
    });
    return () => { vigente = false; };
  });

  function comparar(indice: number) {
    indiceSeleccionado = indice;
    pestana = 'comparacion';
  }
  function desplazar(direccion: number) {
    const posicion = coincidencias.findIndex((item) => item.indice === indiceSeleccionado);
    const siguiente = coincidencias[posicion + direccion];
    if (siguiente) indiceSeleccionado = siguiente.indice;
  }
</script>

{#if cargando}
  <CargandoResultado />
{:else if !resultado}
  <div class="panel p-6">
    <EstadoVacio icono="folder_off" titulo="Expediente no disponible" descripcion="No se pudo recuperar el análisis. Revisa el historial o inicia un nuevo análisis.">
      <a href={enlace('historial')}><Boton icono="history">Ver historial</Boton></a>
      <a href={enlace('nuevo')}><Boton variante="secundario" icono="add">Nuevo análisis</Boton></a>
    </EstadoVacio>
  </div>
{:else}
  <div class="space-y-5">
    <EncabezadoResultado {resultado} />
    <ResumenMetricas {resultado} />
    <PestanasResultado activa={pestana} cantidadCoincidencias={coincidencias.length} onCambiar={(valor) => pestana = valor} />
    <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`} tabindex="0" class="enlace-foco rounded-xl">
      {#if pestana === 'coincidencias'}
        <TablaCoincidencias {coincidencias} {orden} {indiceSeleccionado} onCambiarOrden={(valor) => orden = valor} onSeleccionar={(indice) => indiceSeleccionado = indice} onComparar={comparar} />
      {:else if pestana === 'comparacion'}
        <ComparacionAB {resultado} coincidencia={seleccionada} indice={indiceSeleccionado} {coincidencias} onSeleccionar={(indice) => indiceSeleccionado = indice} onAnterior={() => desplazar(-1)} onSiguiente={() => desplazar(1)} />
      {:else}
        <FranjaMetadatos {resultado} />
      {/if}
    </div>
  </div>
{/if}

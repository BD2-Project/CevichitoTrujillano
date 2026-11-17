<script lang="ts">
  import { picosSimulados } from '../../utilidades/audio';

  let {
    semilla,
    clase = ''
  }: {
    semilla: string;
    clase?: string;
  } = $props();

  const paletas = [
    { desde: '#1e1b4b', hasta: '#312e81', barra: '#8b5cf6', punto: '#8b5cf6' },
    { desde: '#042f2e', hasta: '#115e59', barra: '#5eead4', punto: '#0f766e' },
    { desde: '#1e293b', hasta: '#334155', barra: '#b4c5ff', punto: '#4b5c92' },
    { desde: '#1e3a5f', hasta: '#0f172a', barra: '#5cd5fa', punto: '#00677f' }
  ] as const;

  function indiceDe(texto: string): number {
    let valor = 0;
    for (const caracter of texto) {
      valor = (valor * 31 + caracter.charCodeAt(0)) >>> 0;
    }
    return valor % paletas.length;
  }

  const paleta = $derived(paletas[indiceDe(semilla)]);
  const barras = $derived(picosSimulados(semilla, 6));
</script>

<div
  class={['relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-inner', clase || 'h-11 w-11'].join(' ')}
  style={`background:linear-gradient(135deg, ${paleta.desde} 0%, ${paleta.hasta} 100%)`}
  aria-hidden="true"
>
  <svg class="h-6 w-8" viewBox="0 0 32 24" fill="none">
    {#each barras as pico, indice}
      {@const alto = Math.max(3, Math.round(pico * 16))}
      <rect
        x={2 + indice * 5}
        y={20 - alto}
        width="3"
        height={alto}
        rx="1"
        fill={paleta.barra}
        fill-opacity={[0.8, 1, 0.9, 1, 0.7, 0.5][indice] ?? 0.8}
      />
    {/each}
  </svg>
  <span
    class="absolute left-1 top-1 h-1.5 w-1.5 rounded-full"
    style={`background-color:${paleta.punto}`}
  ></span>
</div>

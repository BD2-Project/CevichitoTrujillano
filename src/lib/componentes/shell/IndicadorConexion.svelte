<script lang="ts">
  import { app } from '../../estado/aplicacion.svelte';
  import Insignia from '../ui/Insignia.svelte';

  const conexion = $derived(app.estadoConexion);
</script>

{#if conexion.etiqueta}
  <Insignia tono={conexion.conectado ? 'info' : 'advertencia'} punto>
    {conexion.etiqueta}
  </Insignia>
{/if}

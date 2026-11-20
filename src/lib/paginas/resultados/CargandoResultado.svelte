<div class="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
  <span class="sr-only">Cargando el expediente…</span>

  <div class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-panel sm:p-5">
    <div class="h-3 w-40 rounded bg-surface-container-high"></div>
    <div class="mt-4 h-6 w-2/3 max-w-md rounded bg-surface-container-high"></div>
    <div class="mt-3 flex flex-wrap gap-2">
      <div class="h-6 w-32 rounded-full bg-surface-container"></div>
      <div class="h-6 w-24 rounded-full bg-surface-container"></div>
      <div class="h-6 w-28 rounded-full bg-surface-container"></div>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <div class="h-9 w-28 rounded-lg bg-surface-container"></div>
      <div class="h-9 w-36 rounded-lg bg-surface-container"></div>
      <div class="h-9 w-32 rounded-lg bg-surface-container"></div>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {#each Array(4) as _, indice (indice)}
      <div class="h-[104px] rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-panel">
        <div class="h-2.5 w-24 rounded bg-surface-container-high"></div>
        <div class="mt-4 h-7 w-16 rounded bg-surface-container-high"></div>
        <div class="mt-3 h-2 w-28 rounded bg-surface-container"></div>
      </div>
    {/each}
  </div>

  <div class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-panel sm:p-5">
    <div class="flex gap-2">
      <div class="h-9 w-32 rounded-lg bg-surface-container-high"></div>
      <div class="h-9 w-40 rounded-lg bg-surface-container"></div>
      <div class="h-9 w-28 rounded-lg bg-surface-container"></div>
    </div>
    <div class="mt-5 h-10 w-full rounded-lg bg-surface-container-low"></div>
    <div class="mt-2 h-10 w-full rounded-lg bg-surface-container-low"></div>
    <div class="mt-2 h-10 w-full rounded-lg bg-surface-container-low"></div>
  </div>
</div>

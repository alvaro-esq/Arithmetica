<script lang="ts">
  import { ACCENT, POS, NEG, PAPER, PAPER_RAISED, INK, MUTED, BORDER } from '../../lib/svm/colors';

  // ChatGPT ⊂ GPT ⊂ LLM como anillos concéntricos: la relación
  // producto / familia de modelos / categoría se vuelve espacial.

  interface Layer {
    id: string;
    name: string;
    tagline: string;
    def: string;
    examples: string[];
    analogy: string;
    r: number;
    color: string;
  }

  const LAYERS: Layer[] = [
    {
      id: 'llm',
      name: 'LLM',
      tagline: 'la categoría',
      def: 'Large Language Model: cualquier modelo grande entrenado para procesar y generar lenguaje. GPT es un LLM, pero no todos los LLM son GPT.',
      examples: ['GPT', 'Claude', 'Gemini', 'Llama', 'Mistral'],
      analogy: 'La categoría "motor": hay muchos fabricantes y versiones.',
      r: 165,
      color: NEG,
    },
    {
      id: 'gpt',
      name: 'GPT',
      tagline: 'la familia de modelos',
      def: 'Generative Pre-trained Transformer: la familia de modelos de OpenAI. Es el motor que genera el texto — no la aplicación que usas.',
      examples: ['GPT-3', 'GPT-4', 'GPT-4o'],
      analogy: 'El motor concreto que va dentro del automóvil.',
      r: 112,
      color: POS,
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      tagline: 'el producto',
      def: 'La aplicación conversacional: interfaz de chat + memoria + herramientas, montada SOBRE un modelo GPT. Es lo único de esta lista que "usas" directamente.',
      examples: ['app web', 'app móvil', 'historial', 'herramientas'],
      analogy: 'El automóvil completo que el usuario maneja.',
      r: 60,
      color: ACCENT,
    },
  ];

  let sel = $state(2); // empieza en ChatGPT: lo que el estudiante ya conoce
  let active = $derived(LAYERS[sel]);

  const C = 180; // centro del SVG
</script>

<div class="grid gap-4 sm:grid-cols-[minmax(0,340px)_1fr] sm:items-center">
  <svg viewBox="0 0 360 360" class="w-full select-none" role="group" aria-label="Diagrama de anillos: ChatGPT dentro de GPT, dentro de LLM">
    {#each LAYERS as layer, i}
      <circle
        cx={C}
        cy={C}
        r={layer.r}
        fill={layer.color}
        fill-opacity={i === sel ? 0.16 : 0.05}
        stroke={layer.color}
        stroke-width={i === sel ? 3 : 1.5}
        stroke-opacity={i === sel ? 1 : 0.45}
        style="cursor:pointer; outline-offset: 3px; transition: fill-opacity 0.25s ease, stroke-opacity 0.25s ease, stroke-width 0.25s ease"
        role="button"
        tabindex="0"
        aria-label={layer.name}
        aria-pressed={i === sel}
        onclick={() => (sel = i)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            sel = i;
          }
        }}
      />
      <text
        x={C}
        y={i === 2 ? C + 5 : C - layer.r + 24}
        text-anchor="middle"
        font-size={i === sel ? 17 : 14}
        font-weight={i === sel ? 700 : 500}
        fill={i === sel ? layer.color : MUTED}
        style="cursor:pointer; transition: fill 0.25s ease"
        onclick={() => (sel = i)}
      >{layer.name}</text>
    {/each}
  </svg>

  <div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
    <div class="mb-2 flex flex-wrap items-baseline gap-2">
      <span class="rounded-full px-3 py-1 text-sm font-bold" style="background-color: {active.color}; color: {PAPER}">{active.name}</span>
      <span class="text-sm" style="color: {MUTED}">{active.tagline}</span>
    </div>
    <p class="text-sm leading-relaxed" style="color: {INK}">{active.def}</p>
    <div class="mt-3 flex flex-wrap gap-1.5">
      {#each active.examples as ex (ex)}
        <span class="rounded-md border px-2 py-0.5 text-xs" style="border-color: {BORDER}; color: {MUTED}">{ex}</span>
      {/each}
    </div>
    <p class="mt-3 text-xs italic" style="color: {MUTED}">🚗 Analogía: {active.analogy}</p>
  </div>
</div>

<div class="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Seleccionar capa">
  {#each LAYERS as layer, i}
    <button
      class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
      style={i === sel
        ? `background-color:${layer.color};color:${PAPER};border-color:${layer.color}`
        : `color:${MUTED};border-color:${BORDER}`}
      onclick={() => (sel = i)}
    >{layer.name}</button>
  {/each}
  <span class="text-xs" style="color: {MUTED}">— toca cada capa del diagrama</span>
</div>

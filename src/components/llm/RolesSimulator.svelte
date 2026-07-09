<script lang="ts">
  import { ROLE_LIBRARY, ROLE_ORDER, toRequestJSON, validateOrder, type Role, type RoleBlock } from '../../lib/llm/roles';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Una conversación de API es una LISTA DE MENSAJES CON ROLES. Ármala bloque a
  // bloque y mírala en sus dos formas: burbujas de chat y el JSON del request.

  let blocks = $state<RoleBlock[]>([
    { role: 'system', content: ROLE_LIBRARY.system.examples[0] },
    { role: 'user', content: ROLE_LIBRARY.user.examples[0] },
  ]);
  let exampleIdx = $state<Record<Role, number>>({ system: 1, user: 1, assistant: 0, tool: 0 });
  let apiView = $state(false);

  let check = $derived(validateOrder(blocks));
  let json = $derived(toRequestJSON(blocks, { model: 'modelo-estandar', temperature: 0.3 }));

  const ROLE_COLOR: Record<Role, string> = { system: ACCENT, user: NEG, assistant: POS, tool: SUCCESS };

  function add(role: Role) {
    const ex = ROLE_LIBRARY[role].examples;
    blocks = [...blocks, { role, content: ex[exampleIdx[role] % ex.length] }];
    exampleIdx[role]++;
  }
  function removeAt(i: number) {
    blocks = blocks.filter((_, j) => j !== i);
  }
  function reset() {
    blocks = [
      { role: 'system', content: ROLE_LIBRARY.system.examples[0] },
      { role: 'user', content: ROLE_LIBRARY.user.examples[0] },
    ];
    exampleIdx = { system: 1, user: 1, assistant: 0, tool: 0 };
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div class="flex flex-wrap gap-2" role="group" aria-label="Añadir mensaje por rol">
      {#each ROLE_ORDER as role}
        <button
          class="rounded-md px-3 py-1.5 text-sm font-semibold"
          style="background-color: {ROLE_COLOR[role]}; color: {PAPER}"
          title={ROLE_LIBRARY[role].desc}
          onclick={() => add(role)}
        >+ {ROLE_LIBRARY[role].label}</button>
      {/each}
    </div>
    <div class="flex gap-2">
      <button
        class="rounded-md border px-3 py-1 text-xs font-medium"
        style={!apiView ? `background-color:${INK};color:${PAPER};border-color:${INK}` : `color:${MUTED};border-color:${BORDER}`}
        onclick={() => (apiView = false)}
      >💬 Vista chat</button>
      <button
        class="rounded-md border px-3 py-1 text-xs font-medium"
        style={apiView ? `background-color:${INK};color:${PAPER};border-color:${INK}` : `color:${MUTED};border-color:${BORDER}`}
        onclick={() => (apiView = true)}
      >{'{ }'} Vista API</button>
    </div>
  </div>

  {#if !check.ok}
    <p class="mb-2 rounded-md border px-3 py-2 text-xs font-medium" style="border-color: {WARN}; color: {WARN}" aria-live="polite">⚠ {check.hint}</p>
  {/if}

  {#if apiView}
    <pre class="block-in overflow-x-auto rounded-md border p-3 text-xs leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}"><code>{json}</code></pre>
  {:else}
    <div class="block-in space-y-2 rounded-md border p-3" style="border-color: {BORDER}; background-color: {PAPER}">
      {#each blocks as b, i (i + '-' + b.role)}
        {@const c = ROLE_COLOR[b.role]}
        <div class="block-in group flex items-start gap-2 {b.role === 'user' ? 'flex-row-reverse' : ''}">
          <span class="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold" style="background-color: {c}; color: {PAPER}">{b.role}</span>
          <p
            class="max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-snug {b.role === 'tool' ? 'font-mono text-xs' : ''}"
            style="border-color: {c}55; background-color: {c}0d; color: {b.role === 'system' ? MUTED : INK}; {b.role === 'system' ? 'font-style: italic' : ''}"
          >{b.content}</p>
          <button class="text-xs opacity-0 transition-opacity group-hover:opacity-100" style="color: {MUTED}" aria-label="Quitar mensaje {i + 1}" onclick={() => removeAt(i)}>✕</button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="mt-3 flex flex-wrap items-center gap-3">
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={reset}>↺ Reiniciar</button>
    <p class="text-xs" style="color: {MUTED}">Las dos vistas son <strong>el mismo dato</strong>: "ChatGPT" es una interfaz bonita sobre esta lista — y el usuario final nunca ve el mensaje <span style="color: {ACCENT}; font-weight: 600">system</span>.</p>
  </div>
</div>

<style>
  .block-in {
    animation: block-in 0.3s ease;
  }
  @keyframes block-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>

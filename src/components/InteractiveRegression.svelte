<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { onMount } from 'svelte';

  let slope = 1;
  let intercept = 0;

  const data = [
    { x: 1, y: 2 }, { x: 2, y: 3.5 }, { x: 3, y: 2.5 },
    { x: 4, y: 5 }, { x: 5, y: 4.5 }, { x: 6, y: 6 }
  ];

  const width = 600;
  const height = 400;
  const padding = 40;

  const xScale = scaleLinear()
    .domain([0, 7])
    .range([padding, width - padding]);

  const yScale = scaleLinear()
    .domain([0, 7])
    .range([height - padding, padding]);

  const lineStart = { x: xScale(0), y: yScale(intercept) };
  const lineEnd = { x: xScale(7), y: yScale(slope * 7 + intercept) };
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[3/2]">
    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E5E5" stroke-width="2" />
    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E5E5" stroke-width="2" />

    {#each data as point}
      <circle cx={xScale(point.x)} cy={yScale(point.y)} r="6" fill="#222222" />
    {/each}

    <line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y} stroke="#002FA7" stroke-width="3" />
  </svg>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium mb-1">Slope (m): {slope}</label>
      <input type="range" bind:value={slope} min="-2" max="2" step="0.1" class="w-full accent-interactive" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1">Intercept (b): {intercept}</label>
      <input type="range" bind:value={intercept} min="-3" max="3" step="0.1" class="w-full accent-interactive" />
    </div>
  </div>
</div>

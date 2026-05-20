<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  min: number
  max: number
  step?: number
  formatValue?: (v: number) => string
}>()

const modelValue = defineModel<[number, number]>({ required: true })

const fmt = (v: number) => props.formatValue ? props.formatValue(v) : String(v)

const range = computed(() => props.max - props.min)

const leftPct = computed(() => ((modelValue.value[0] - props.min) / range.value) * 100)
const rightPct = computed(() => ((modelValue.value[1] - props.min) / range.value) * 100)

const fillStyle = computed(() => ({
  left: leftPct.value + '%',
  width: (rightPct.value - leftPct.value) + '%',
}))

// When both thumbs collide, raise z-index of the one the user is likely to drag
const minZ = computed(() => (modelValue.value[0] >= props.max ? 'z-20' : 'z-10'))
const maxZ = computed(() => (modelValue.value[0] >= props.max ? 'z-10' : 'z-20'))

function setMin(e: Event) {
  const v = +(e.target as HTMLInputElement).value
  modelValue.value = [Math.min(v, modelValue.value[1]), modelValue.value[1]]
}

function setMax(e: Event) {
  const v = +(e.target as HTMLInputElement).value
  modelValue.value = [modelValue.value[0], Math.max(v, modelValue.value[0])]
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex justify-between items-center">
      <span class="text-xs text-gray-400 uppercase tracking-wider font-medium">{{ label }}</span>
      <span class="text-xs font-mono text-yellow-400 tabular-nums">
        {{ fmt(modelValue[0]) }} – {{ fmt(modelValue[1]) }}
      </span>
    </div>

    <!-- Track -->
    <div class="relative h-6 flex items-center">
      <!-- Grey background track -->
      <div class="absolute inset-x-0 h-1.5 rounded-full bg-gray-700 pointer-events-none"></div>
      <!-- Yellow fill between thumbs -->
      <div class="absolute h-1.5 rounded-full bg-yellow-400 pointer-events-none" :style="fillStyle"></div>

      <!-- Min thumb -->
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step ?? 1"
        :value="modelValue[0]"
        @input="setMin"
        class="thumb absolute w-full" :class="minZ"
      />
      <!-- Max thumb -->
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step ?? 1"
        :value="modelValue[1]"
        @input="setMax"
        class="thumb absolute w-full" :class="maxZ"
      />
    </div>
  </div>
</template>

<style scoped>
.thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 0;
  background: transparent;
  pointer-events: none;
  position: absolute;
  width: 100%;
}

.thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: #facc15;
  border: 2px solid #111827;
  pointer-events: all;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
  transition: transform 0.1s;
}

.thumb::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.thumb::-moz-range-thumb {
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: #facc15;
  border: 2px solid #111827;
  pointer-events: all;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
}
</style>

<script setup lang="ts">
defineProps<{
  label: string
  min: number
  max: number
  step?: number
}>()

const modelValue = defineModel<[number, number]>({ required: true })
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex justify-between items-center">
      <span class="text-xs text-gray-400 uppercase tracking-wider font-medium">{{ label }}</span>
      <span class="text-xs text-gray-400 tabular-nums">{{ modelValue[0] }} – {{ modelValue[1] }}</span>
    </div>
    <div class="flex gap-2 items-center">
      <input
        type="range"
        :min="min"
        :max="modelValue[1]"
        :step="step ?? 1"
        :value="modelValue[0]"
        @input="modelValue = [+($event.target as HTMLInputElement).value, modelValue[1]]"
        class="w-full accent-yellow-400 cursor-pointer"
      />
      <input
        type="range"
        :min="modelValue[0]"
        :max="max"
        :step="step ?? 1"
        :value="modelValue[1]"
        @input="modelValue = [modelValue[0], +($event.target as HTMLInputElement).value]"
        class="w-full accent-yellow-400 cursor-pointer"
      />
    </div>
  </div>
</template>

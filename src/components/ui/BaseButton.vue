<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'cta' | 'secondary' | 'success' | 'danger' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  iconOnly?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false,
  iconOnly: false,
  type: 'button',
})

const variantClasses: Record<string, string> = {
  cta:
    'bg-ds-gold hover:bg-ds-gold/85 active:bg-ds-gold/70 text-ds-midnight font-bold border border-transparent disabled:opacity-40',
  primary:
    'bg-ds-royal hover:bg-ds-royal/85 active:bg-ds-royal/70 text-white border border-transparent glow-cyan disabled:opacity-40',
  secondary:
    'bg-transparent hover:bg-ds-neon/5 active:bg-ds-neon/10 text-ds-soft-white border border-ds-neon/30 hover:border-ds-neon/70 disabled:opacity-40',
  success:
    'bg-green-600 hover:bg-green-500 active:bg-green-700 text-white border border-transparent disabled:opacity-40',
  danger:
    'bg-transparent hover:bg-red-600/15 active:bg-red-600/25 text-red-400 border border-red-600/40 hover:border-red-500 disabled:opacity-40',
  accent:
    'bg-ds-gold/10 hover:bg-ds-gold/20 active:bg-ds-gold/30 text-ds-gold border border-ds-gold/40 hover:border-ds-gold/70 disabled:opacity-40',
  ghost:
    'bg-transparent hover:bg-ds-navy active:bg-ds-navy/80 text-ds-slate hover:text-ds-soft-white border border-transparent disabled:opacity-40',
}

const sizeBase: Record<string, string> = {
  sm: 'text-xs rounded-md gap-1.5',
  md: 'text-sm rounded-lg gap-2',
  lg: 'text-base rounded-xl gap-2.5',
}

const sizePadding = computed(() => {
  if (props.iconOnly) return { sm: 'p-1.5', md: 'p-2', lg: 'p-3' }[props.size]
  return { sm: 'px-2.5 py-1', md: 'px-4 py-2', lg: 'px-6 py-3' }[props.size]
})

const classes = computed(() => [
  'inline-flex items-center justify-center font-semibold transition-all duration-150',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-cyan/60 select-none shrink-0',
  props.disabled ? 'cursor-not-allowed' : 'cursor-pointer',
  variantClasses[props.variant],
  sizeBase[props.size],
  sizePadding.value,
])
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot name="icon" />
    <slot />
  </button>
</template>

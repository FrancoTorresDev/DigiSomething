<script setup lang="ts">
import Navbar from '@/components/layout/Navbar.vue'
</script>

<template>
  <div class="min-h-screen text-ds-soft-white">
    <Navbar />
    <main class="pt-16">
      <RouterView />
    </main>
  </div>
</template>

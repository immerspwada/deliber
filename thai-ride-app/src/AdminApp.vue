<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastContainer from './components/ToastContainer.vue'
</script>

<template>
  <div id="admin-app" class="admin-root">
    <RouterView />
    <ToastContainer />
  </div>
</template>

<style>
.admin-root {
  font-family: 'Sarabun', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  background-color: #F6F6F6;
}
</style>

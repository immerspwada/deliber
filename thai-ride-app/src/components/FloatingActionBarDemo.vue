<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 p-8">
    <!-- Demo Content -->
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          Floating Action Bar Demo
        </h1>
        <p class="text-gray-600">
          Current Active: <span class="font-semibold text-orange-600">{{ activeSection }}</span>
        </p>
      </div>

      <!-- Content Sections -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div v-if="activeSection === 'home'" class="space-y-4">
          <h2 class="text-2xl font-bold text-gray-900">🏠 Home</h2>
          <p class="text-gray-600">Welcome to your dashboard!</p>
          <div class="grid grid-cols-2 gap-4 mt-6">
            <div class="bg-orange-100 rounded-xl p-6">
              <p class="text-3xl font-bold text-orange-600">12</p>
              <p class="text-sm text-gray-600">Total Rides</p>
            </div>
            <div class="bg-blue-100 rounded-xl p-6">
              <p class="text-3xl font-bold text-blue-600">฿450</p>
              <p class="text-sm text-gray-600">Saved</p>
            </div>
          </div>
        </div>

        <div v-else-if="activeSection === 'deals'" class="space-y-4">
          <h2 class="text-2xl font-bold text-gray-900">🏷️ Deals</h2>
          <div class="space-y-3">
            <div class="bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl p-4 text-white">
              <p class="font-bold">50% OFF First Ride</p>
              <p class="text-sm opacity-90">Use code: FIRST50</p>
            </div>
            <div class="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white">
              <p class="font-bold">Free Delivery</p>
              <p class="text-sm opacity-90">Orders over ฿200</p>
            </div>
          </div>
        </div>

        <div v-else-if="activeSection === 'nearby'" class="space-y-4">
          <h2 class="text-2xl font-bold text-gray-900">📍 Nearby</h2>
          <div class="aspect-video bg-gray-200 rounded-xl flex items-center justify-center">
            <p class="text-gray-500">Map View</p>
          </div>
        </div>

        <div v-else-if="activeSection === 'cart'" class="space-y-4">
          <h2 class="text-2xl font-bold text-gray-900">🛒 Cart</h2>
          <p class="text-gray-600">Your cart is empty</p>
        </div>

        <div v-else-if="activeSection === 'profile'" class="space-y-4">
          <h2 class="text-2xl font-bold text-gray-900">👤 Profile</h2>
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              JD
            </div>
            <div>
              <p class="font-bold text-gray-900">John Doe</p>
              <p class="text-sm text-gray-600">john@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Bar -->
    <FloatingActionBar
      :items="navItems"
      default-active="home"
      @change="handleNavChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FloatingActionBar from './FloatingActionBar.vue';
import {
  HomeIcon,
  TagIcon,
  MapPinIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from '@heroicons/vue/24/outline';

const activeSection = ref('home');

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'deals', label: 'Deals', icon: TagIcon },
  { id: 'nearby', label: 'Nearby', icon: MapPinIcon },
  { id: 'cart', label: 'Cart', icon: ShoppingCartIcon },
  { id: 'profile', label: 'Profile', icon: UserCircleIcon },
];

function handleNavChange(id: string) {
  activeSection.value = id;
}
</script>

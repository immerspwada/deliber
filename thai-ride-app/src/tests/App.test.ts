import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from '../App.vue'
import { routes } from '../router/index'

describe('App.vue', () => {
  it('renders properly', () => {
    const router = createRouter({
      history: createWebHistory(),
      routes
    })
    
    const pinia = createPinia()
    
    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })
    
    expect(wrapper.find('#app').exists()).toBe(true)
  })
})
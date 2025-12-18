/**
 * Feature: F04a - Shopping Favorite Lists
 * Tables: shopping_favorite_lists
 * Migration: 052_shopping_favorites_and_images.sql
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Use any to avoid Supabase type issues
const db = supabase as any

export interface ShoppingFavoriteList {
  id: string
  name: string
  items: string
  store_name?: string
  store_address?: string
  store_lat?: number
  store_lng?: number
  estimated_budget?: number
  use_count: number
  last_used_at?: string
  created_at: string
}

export function useFavoriteShoppingLists() {
  const authStore = useAuthStore()
  const favorites = ref<ShoppingFavoriteList[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchFavorites = async () => {
    if (!authStore.user?.id) return
    
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await db
        .from('shopping_favorite_lists')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('use_count', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: false })
      
      if (err) throw err
      favorites.value = data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching favorites:', e)
    } finally {
      loading.value = false
    }
  }

  const saveFavorite = async (data: {
    name: string
    items: string
    storeName?: string
    storeAddress?: string
    storeLat?: number
    storeLng?: number
    estimatedBudget?: number
  }) => {
    if (!authStore.user?.id) return null
    
    loading.value = true
    error.value = null
    
    try {
      const { data: result, error: err } = await db
        .from('shopping_favorite_lists')
        .insert({
          user_id: authStore.user.id,
          name: data.name,
          items: data.items,
          store_name: data.storeName,
          store_address: data.storeAddress,
          store_lat: data.storeLat,
          store_lng: data.storeLng,
          estimated_budget: data.estimatedBudget
        })
        .select()
        .single()
      
      if (err) throw err
      
      // Add to local list
      if (result) {
        favorites.value.unshift(result)
      }
      
      return result
    } catch (e: any) {
      error.value = e.message
      console.error('Error saving favorite:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  const useFavorite = async (listId: string) => {
    try {
      const currentCount = favorites.value.find(f => f.id === listId)?.use_count ?? 0
      await db
        .from('shopping_favorite_lists')
        .update({ 
          use_count: currentCount + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', listId)
      
      // Update local
      const idx = favorites.value.findIndex(f => f.id === listId)
      if (idx !== -1 && favorites.value[idx]) {
        favorites.value[idx].use_count++
        favorites.value[idx].last_used_at = new Date().toISOString()
      }
    } catch (e) {
      console.error('Error updating use count:', e)
    }
  }

  const deleteFavorite = async (listId: string) => {
    try {
      const { error: err } = await db
        .from('shopping_favorite_lists')
        .delete()
        .eq('id', listId)
      
      if (err) throw err
      
      favorites.value = favorites.value.filter(f => f.id !== listId)
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const updateFavorite = async (listId: string, data: Partial<ShoppingFavoriteList>) => {
    try {
      const { error: err } = await db
        .from('shopping_favorite_lists')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', listId)
      
      if (err) throw err
      
      const idx = favorites.value.findIndex(f => f.id === listId)
      if (idx !== -1 && favorites.value[idx]) {
        favorites.value[idx] = { ...favorites.value[idx], ...data }
      }
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  return {
    favorites,
    loading,
    error,
    fetchFavorites,
    saveFavorite,
    useFavorite,
    deleteFavorite,
    updateFavorite
  }
}

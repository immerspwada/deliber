#!/usr/bin/env node
/**
 * VAPID Key Generator for Push Notifications
 * Feature: F07 - Push Notifications
 * 
 * Usage: node scripts/generate-vapid-keys.js
 * 
 * This script generates VAPID keys required for Web Push notifications.
 * After running, add the keys to:
 * 1. Frontend .env: VITE_VAPID_PUBLIC_KEY=<public_key>
 * 2. Supabase Secrets: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
 */

const crypto = require('crypto')

// Generate ECDSA P-256 key pair
function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256'
  })

  // Export keys in raw format
  const publicKeyBuffer = publicKey.export({ type: 'spki', format: 'der' })
  const privateKeyBuffer = privateKey.export({ type: 'pkcs8', format: 'der' })

  // Extract raw public key (last 65 bytes of SPKI)
  const rawPublicKey = publicKeyBuffer.slice(-65)
  
  // Extract raw private key (last 32 bytes of PKCS8)
  const rawPrivateKey = privateKeyBuffer.slice(-32)

  // Convert to URL-safe base64
  const publicKeyBase64 = rawPublicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const privateKeyBase64 = rawPrivateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  }
}

// Main
console.log('\n🔐 VAPID Key Generator for Web Push Notifications\n')
console.log('=' .repeat(60))

const keys = generateVapidKeys()

console.log('\n📋 Generated VAPID Keys:\n')
console.log('Public Key (for frontend .env):')
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`)

console.log('Private Key (for Supabase secrets):')
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}\n`)

console.log('Public Key (also for Supabase secrets):')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}\n`)

console.log('=' .repeat(60))
console.log('\n📝 Setup Instructions:\n')
console.log('1. Add to thai-ride-app/.env:')
console.log(`   VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`)

console.log('2. Add to Supabase Dashboard > Settings > Edge Functions > Secrets:')
console.log(`   VAPID_PUBLIC_KEY = ${keys.publicKey}`)
console.log(`   VAPID_PRIVATE_KEY = ${keys.privateKey}`)
console.log(`   VAPID_SUBJECT = mailto:admin@gobear.app\n`)

console.log('3. Deploy Edge Function:')
console.log('   cd thai-ride-app')
console.log('   supabase functions deploy send-push\n')

console.log('4. Test push notification in app settings\n')
console.log('=' .repeat(60))
console.log('\n✅ Keys generated successfully!\n')

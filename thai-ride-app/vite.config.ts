import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [
    vue(),
    VueDevTools(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico', 
        'pwa-192x192.png', 
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
        'offline.html',
        'sw-push.js'
      ],
      manifest: {
        id: '/gobear-app',
        name: 'GOBEAR - เรียกรถ ส่งของ ซื้อของ',
        short_name: 'GOBEAR',
        description: 'GOBEAR - ระบบเรียกรถ ส่งของ และซื้อของ ในประเทศไทย',
        theme_color: '#00A86B',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'th',
        dir: 'ltr',
        categories: ['transportation', 'lifestyle', 'utilities'],
        iarc_rating_id: '',
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'เรียกรถ',
            short_name: 'เรียกรถ',
            description: 'เรียกรถรับส่งทันที',
            url: '/services?type=ride',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'ส่งของ',
            short_name: 'ส่งของ',
            description: 'บริการส่งของรวดเร็ว',
            url: '/delivery',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'ซื้อของ',
            short_name: 'ซื้อของ',
            description: 'บริการซื้อของให้',
            url: '/shopping',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'กระเป๋าเงิน',
            short_name: 'กระเป๋า',
            description: 'ดูยอดเงินและประวัติ',
            url: '/wallet',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        screenshots: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'หน้าหลัก GOBEAR'
          }
        ],
        related_applications: [],
        handle_links: 'preferred',
        launch_handler: {
          client_mode: ['navigate-existing', 'auto']
        }
      },
      workbox: {
        // Import push notification handler
        importScripts: ['sw-push.js'],
        
        // Pre-cache app shell and critical assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // ให้ user เลือก update เอง
        
        // Navigation fallback for SPA
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/admin/, /^\/supabase/],
        
        // Offline fallback
        offlineGoogleAnalytics: false,
        
        runtimeCaching: [
          // App Shell - NetworkFirst with fast fallback
          {
            urlPattern: /^https?:\/\/[^/]+\/?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              networkTimeoutSeconds: 3
            }
          },
          
          // Static JS/CSS - StaleWhileRevalidate for instant loads
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          
          // CartoDB Map Tiles - CacheFirst (maps don't change often)
          {
            urlPattern: /^https:\/\/[abc]\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 300, // ลดลงเพื่อ balance storage
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // OpenStreetMap Tiles (backup)
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Nominatim Geocoding API - NetworkFirst (need fresh data)
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geocoding-cache',
              expiration: {
                maxEntries: 50, // ลดลง
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 days
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // OSRM Routing API - NetworkFirst (routes change)
          {
            urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'routing-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 30 // 30 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Supabase API - NetworkOnly (always need fresh data)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkOnly'
          },
          
          // Supabase Auth - NetworkOnly
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          
          // Supabase Realtime - NetworkOnly
          {
            urlPattern: /^wss?:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly'
          },
          
          // Supabase Storage - CacheFirst for images
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Google Fonts Stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          
          // Google Fonts Webfonts
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // CDN Assets (Leaflet, etc.)
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Images - CacheFirst
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // HTML pages - NetworkFirst for fresh content
          {
            urlPattern: /\.html$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              networkTimeoutSeconds: 3
            }
          },
          
          // JSON data - NetworkFirst
          {
            urlPattern: /\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'json-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 5
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        suppressWarnings: true,
        type: 'module'
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'map-vendor': ['leaflet']
        }
      }
    }
  }
})

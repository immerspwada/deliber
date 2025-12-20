import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import noUnsafeSingle from './eslint-rules/no-unsafe-single.js'

export default [
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: {
      'custom-rules': {
        rules: {
          'no-unsafe-single': noUnsafeSingle
        }
      }
    },
    rules: {
      // Warn when using .single() without explanation
      'custom-rules/no-unsafe-single': 'warn',
      
      // Vue rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      
      // General rules
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        Notification: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestIdleCallback: 'readonly',
        cancelIdleCallback: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        Worker: 'readonly',
        SharedWorker: 'readonly',
        ServiceWorker: 'readonly',
        BroadcastChannel: 'readonly',
        MessageChannel: 'readonly',
        MessagePort: 'readonly',
        WebSocket: 'readonly',
        EventSource: 'readonly',
        XMLHttpRequest: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        Video: 'readonly',
        Canvas: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        WebGLRenderingContext: 'readonly',
        OffscreenCanvas: 'readonly',
        ImageData: 'readonly',
        ImageBitmap: 'readonly',
        createImageBitmap: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        Intl: 'readonly',
        queueMicrotask: 'readonly',
        structuredClone: 'readonly',
        reportError: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly'
      }
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.vercel/**',
      'public/**',
      '*.config.js',
      '*.config.ts'
    ]
  }
]

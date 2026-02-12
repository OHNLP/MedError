import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), viteSingleFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: './', // This makes it work when opened as file://
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // 100MB - ensures everything gets inlined
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})

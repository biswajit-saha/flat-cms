import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [
    svelte(), 
    tailwindcss()
  ],
  build: {
    minify: 'esbuild',
    cssMinify: 'lightningcss',
    lib: {
      entry: 'src/main.ts',
      name: 'FlatCMS',
      fileName: () => `cms.js`,
      formats: ['es']
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some(name => name.endsWith('.css'))) return 'cms.css';
          return '[name][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
    },
  },
})
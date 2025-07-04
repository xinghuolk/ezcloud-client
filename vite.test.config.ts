import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'

export default defineConfig({
  root: process.cwd(),
  base: '/',
  publicDir: 'public',
  server: {
    port: 3000,
    host: true
  },
  resolve: {
    alias: [
      {
        find: '/@src/',
        replacement: `/src/`,
      },
    ],
  },
  plugins: [
    VueRouter({
      routesFolder: 'src/pages',
      dts: './types/router.d.ts',
    }),
    Vue({
      include: [/\.vue$/],
      template: {
        compilerOptions: {
          isCustomElement: tag => ['iconify-icon'].includes(tag),
        },
      },
    })
  ]
})
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import Components from 'unplugin-vue-components/vite'
import Imports from 'unplugin-auto-import/vite'
import PurgeCSS from 'rollup-plugin-purgecss'
import Unhead from '@unhead/addons/vite'
import DevTools from 'vite-plugin-vue-devtools'
import { unheadVueComposablesImports } from '@unhead/vue'

const isProd = process.env.NODE_ENV === 'production'

/**
 * This is the main configuration file for vitejs
 *
 * @see https://vitejs.dev/config
 */
export default defineConfig({
  // Project root directory (where index.html is located).
  root: process.cwd(),
  // Base public path when served in development or production.
  // You also need to add this base like `history: createWebHistory('my-subdirectory')`
  // in ./src/router.ts
  // base: '/my-subdirectory/',
  base: '/',
  publicDir: 'public',
  // logLevel: 'warn',
  resolve: {
    alias: [
      {
        find: '/@src/',
        replacement: `/src/`,
      },
    ],
  },
  // development server configuration
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // 允许外部域名访问（解决OAuth回调域名访问问题）
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'ezcloud.xinghuolike.top',
      '.xinghuolike.top', // 允许所有子域名
      '.localhost', // 允许localhost子域名
      'host.docker.internal' // Docker内部访问
    ],
    hmr: {
      overlay: true,
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/docs/**',
        '**/documentation/**',
        '**/public/**',
        '**/*.md',
        '**/coverage/**',
        '**/logs/**',
        '**/temp/**',
        '**/uploads/**',
        '**/types/**'
      ],
      include: [
        'src/**/*',
        'vite.config.ts',
        'index.html'
      ]
    }
  },
  // Predefine dependencies in order to prevent reloading them in the browser during development.
  optimizeDeps: {
    include: [
      'ufo',
      'vee-validate',
      'defu',
    ],
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        // Using only hash to prevent adblockers from blocking assets that match their patterns.
        // Replace with [name] to use the original name for debug purposes.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/_/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
      },
    },
  },
  plugins: [
    /**
     * Shows a quick overview of your app, including the Vue version, pages and components.
     *
     * @see https://devtools-next.vuejs.org/
     */
    // DevTools(), // Temporarily disabled due to definePage conflict

    /**
     * unplugin-vue-router plugin generate routes based on file system
     * allow to use typed routes and usage of defineLoader
     *
     * @see https://uvr.esm.is/rfcs/data-loaders/
     */
    VueRouter({
      routesFolder: 'src/pages',
      dts: './types/router.d.ts',
    }),

    /**
     * plugin-vue plugin inject vue library and allow sfc files to work (*.vue)
     *
     * @see https://github.com/vitejs/vite-plugin-vue/blob/main/packages/plugin-vue/README.md
     */
    Vue({
      include: [/\.vue$/],
      template: {
        compilerOptions: {
          isCustomElement: tag => ['iconify-icon'].includes(tag),
        },
      },
    }),

    /**
     * Unhead provides a Vite plugin to optimise your builds, by removing composables that aren't needed and simplifying your code.
     *
     * @see https://unhead.harlanzw.com/guide/getting-started/vite-plugin
     */
    Unhead(),

    /**
     * unplugin-auto-import allow to automaticaly import modules/components
     *
     * @see https://github.com/antfu/unplugin-auto-import
     */
    Imports({
      dts: './types/imports.d.ts',
      imports: [
        'vue',
        '@vueuse/core',
        VueRouterAutoImports,
        unheadVueComposablesImports,
      ],
      dirs: ['src/composables', 'src/stores', 'src/utils'],
    }),

    /**
     * unplugin-vue-components plugin is responsible of autoloading components
     * documentation and md file are loaded for elements and components sections
     *
     * @see https://github.com/antfu/unplugin-vue-components
     */
    Components({
      dirs: ['src/components'],
      extensions: ['vue'],
      dts: './types/components.d.ts',
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
    }),

    /**
     * rollup-plugin-purgecss plugin is responsible of purging css rules
     * that are not used in the bundle
     *
     * @see https://github.com/FullHuman/purgecss/tree/main/packages/rollup-plugin-purgecss
     */
    PurgeCSS({
      output: false,
      content: [`./src/**/*.vue`],
      variables: false,
      safelist: {
        standard: [
          /(autv|lnil|lnir|fas?)/,
          /-(leave|enter|appear)(|-(to|from|active))$/,
          /^(?!(|.*?:)cursor-move).+-move$/,
          /^router-link(|-exact)-active$/,
          /data-v-.*/,
        ],
      },
      defaultExtractor(content) {
        const contentWithoutStyleBlocks = content.replace(/<style[^]+?<\/style>/gi, '')
        return contentWithoutStyleBlocks.match(/[A-Za-z0-9-_/:]*[A-Za-z0-9-_/]+/g) || []
      },
    }),
  ],
})

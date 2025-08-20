/**
 * Vitest集成测试配置
 * 专门用于运行集成测试的配置文件
 * 与单元测试配置分离，提供不同的测试环境和设置
 */

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: [
      {
        find: '/@src/',
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
  },
  test: {
    // 集成测试使用happy-dom环境
    environment: 'happy-dom',
    
    // 集成测试的包含模式
    include: ['src/tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // 排除单元测试
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
      'src/**/__tests__/**', // 排除单元测试目录
      'src/tests/unit/**'     // 排除单元测试目录
    ],
    
    // 集成测试需要更长的超时时间
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // 全局设置
    globals: true,
    
    // 集成测试设置文件
    setupFiles: ['./src/tests/setup.ts', './src/tests/integration/setup.ts'],
    
    // 覆盖率配置（集成测试的覆盖率要求可以适当降低）
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
      thresholds: {
        global: {
          branches: 70,
          functions: 70, 
          lines: 70,
          statements: 70
        }
      },
      include: [
        'src/**/*.{js,ts,vue}',
        '!src/**/__tests__/**',
        '!src/tests/**'
      ],
      exclude: [
        'src/tests/**',
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts}',
        'src/**/*.spec.{js,ts}'
      ]
    },
    
    // 并行运行配置
    pool: 'threads',
    poolOptions: {
      threads: {
        // 集成测试可以使用更多线程
        minThreads: 2,
        maxThreads: 4
      }
    },
    
    // 报告器配置
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './coverage/integration/junit.xml'
    },
    
    // 集成测试的依赖优化 (使用最新的server配置替代废弃的deps.inline)
    server: {
      deps: {
        inline: [
          '@vue/test-utils',
          'vue',
          'pinia'
        ]
      }
    }
  },
})
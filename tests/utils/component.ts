/**
 * Vue 组件测试工具
 * 提供组件测试的辅助函数和常用配置
 */

import { mount, shallowMount } from '@vue/test-utils'
import { createTestPinia } from './store'
import type { ComponentMountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'

// 默认的挂载选项
export const defaultMountOptions: ComponentMountingOptions<any> = {
  global: {
    plugins: [createTestPinia()],
    stubs: {
      'iconify-icon': {
        template: '<span data-testid="iconify-icon" :icon="icon"><slot /></span>',
        props: ['icon']
      },
      'VCard': {
        template: '<div data-testid="v-card" class="card"><slot /></div>'
      },
      'VTag': {
        template: '<span data-testid="v-tag" :class="color"><slot /></span>',
        props: ['color', 'size']
      },
      'VButton': {
        template: '<button data-testid="v-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        props: ['disabled', 'loading', 'color'],
        emits: ['click']
      },
      'VInput': {
        template: '<input data-testid="v-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        props: ['modelValue', 'placeholder', 'type', 'icon'],
        emits: ['update:modelValue']
      },
      'VTextarea': {
        template: '<textarea data-testid="v-textarea" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
        props: ['modelValue', 'placeholder', 'rows'],
        emits: ['update:modelValue']
      },
      'VModal': {
        template: '<div data-testid="v-modal" v-if="open"><h2>{{ title }}</h2><slot name="content" /><slot name="action" /></div>',
        props: ['open', 'title', 'size'],
        emits: ['close']
      },
      'VField': {
        template: '<div data-testid="v-field"><slot /></div>'
      },
      'VControl': {
        template: '<div data-testid="v-control"><slot /></div>'
      },
      'VLabel': {
        template: '<label data-testid="v-label"><slot /></label>'
      },
      'VTabs': {
        template: '<div data-testid="v-tabs"><slot name="tab" :activeValue="selected" /></div>',
        props: ['selected', 'tabs'],
        emits: ['update:selected']
      },
      'VAvatar': {
        template: '<div data-testid="v-avatar" class="avatar"><slot /></div>',
        props: ['initials']
      },
      'VLoader': {
        template: '<div data-testid="v-loader">Loading...</div>'
      },
      'VPlaceholderSection': {
        template: '<div data-testid="v-placeholder-section"><h3>{{ title }}</h3><p>{{ subtitle }}</p></div>',
        props: ['title', 'subtitle', 'size']
      }
    }
  }
}

// 组件挂载助手
export const mountComponent = <T extends Component>(
  component: T,
  options: ComponentMountingOptions<T> = {}
) => {
  const mergedOptions = {
    ...defaultMountOptions,
    ...options,
    global: {
      ...defaultMountOptions.global,
      ...options.global
    }
  }
  
  return mount(component, mergedOptions)
}

// 浅挂载助手
export const shallowMountComponent = <T extends Component>(
  component: T,
  options: ComponentMountingOptions<T> = {}
) => {
  const mergedOptions = {
    ...defaultMountOptions,
    ...options,
    global: {
      ...defaultMountOptions.global,
      ...options.global
    }
  }
  
  return shallowMount(component, mergedOptions)
}

// 组件Props测试助手
export const testComponentProps = (wrapper: any, expectedProps: Record<string, any>) => {
  Object.keys(expectedProps).forEach(prop => {
    expect(wrapper.props(prop)).toBe(expectedProps[prop])
  })
}

// 组件事件测试助手
export const testComponentEmit = async (wrapper: any, eventName: string, triggerMethod?: () => void) => {
  if (triggerMethod) {
    await triggerMethod()
  }
  
  expect(wrapper.emitted(eventName)).toBeTruthy()
  return wrapper.emitted(eventName)
}

// 等待组件更新
export const waitForUpdate = async (wrapper: any) => {
  await wrapper.vm.$nextTick()
}

// 查找测试元素助手
export const findByTestId = (wrapper: any, testId: string) => {
  return wrapper.find(`[data-testid="${testId}"]`)
}

// 查找所有测试元素助手
export const findAllByTestId = (wrapper: any, testId: string) => {
  return wrapper.findAll(`[data-testid="${testId}"]`)
}

// 模拟用户输入
export const simulateUserInput = async (wrapper: any, selector: string, value: string) => {
  const input = wrapper.find(selector)
  await input.setValue(value)
  await input.trigger('input')
  return waitForUpdate(wrapper)
}

// 模拟用户点击
export const simulateUserClick = async (wrapper: any, selector: string) => {
  const element = wrapper.find(selector)
  await element.trigger('click')
  return waitForUpdate(wrapper)
}
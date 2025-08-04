<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTimeSplit } from '/@src/utils/date-formatter'

interface Props {
  /** 日期字符串 */
  dateString?: string | null | undefined
  /** 大小变体 */
  size?: 'tiny' | 'small' | 'medium' | 'large'
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 显示模式 */
  variant?: 'default' | 'inline' | 'stat' | 'batch'
}

const props = withDefaults(defineProps<Props>(), {
  dateString: undefined,
  size: 'medium',
  align: 'left',
  variant: 'default'
})

const dateTimeData = computed(() => formatDateTimeSplit(props.dateString))
</script>

<template>
  <div 
    class="v-date-time-split" 
    :class="[
      `is-${size}`,
      `is-${align}`,
      `is-${variant}`
    ]"
  >
    <div class="date-part">{{ dateTimeData.date }}</div>
    <div class="time-part">{{ dateTimeData.time }}</div>
  </div>
</template>

<style lang="scss" scoped>
.v-date-time-split {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  
  .date-part {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--dark-text);
    line-height: 1.2;
  }
  
  .time-part {
    font-size: 0.75rem;
    color: var(--muted-grey);
    line-height: 1.2;
  }

  // 大小变体
  &.is-tiny {
    gap: 0.0625rem;
    
    .date-part {
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .time-part {
      font-size: 0.625rem;
    }
  }

  &.is-small {
    gap: 0.1rem;
    
    .date-part {
      font-size: 0.8125rem;
      font-weight: 500;
    }
    
    .time-part {
      font-size: 0.6875rem;
    }
  }

  &.is-large {
    gap: 0.1875rem;
    
    .date-part {
      font-size: 0.9375rem;
      font-weight: 600;
    }
    
    .time-part {
      font-size: 0.8125rem;
    }
  }

  // 对齐方式
  &.is-center {
    align-items: center;
    text-align: center;
  }

  &.is-right {
    align-items: flex-end;
    text-align: right;
  }

  // 显示变体
  &.is-inline {
    flex-direction: row;
    gap: 0.5rem;
    align-items: baseline;
    
    .time-part {
      font-size: 0.8125rem;
      color: var(--muted-grey);
    }
  }

  &.is-stat {
    .date-part {
      font-weight: 600;
      color: var(--primary);
    }
    
    .time-part {
      font-weight: 500;
      color: var(--dark-text);
    }
  }

  &.is-batch {
    gap: 0.1875rem;
    
    .date-part {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary);
    }
    
    .time-part {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--dark-text);
    }
  }
}

// 暗色主题适配
.is-dark {
  .v-date-time-split {
    .date-part {
      color: var(--dark-dark-text);
    }
    
    .time-part {
      color: var(--dark-muted-grey);
    }

    &.is-stat {
      .time-part {
        color: var(--dark-dark-text);
      }
    }

    &.is-batch {
      .time-part {
        color: var(--dark-dark-text);
      }
    }
  }
}
</style>
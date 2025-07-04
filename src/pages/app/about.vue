<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

const appInfo = {
  name: 'EzCloud IoT Management Platform',
  version: '2.0.0',
  description: 'A modern IoT device management platform for 5G gateway devices with Vue 3 + Vuero UI',
  features: [
    'Real-time device monitoring',
    'WiFi and modem status tracking',
    'Device model and vendor management',
    'Serial number batch generation',
    'User authentication and authorization',
    'Responsive design for all devices',
    'Dark mode support'
  ],
  technologies: [
    { name: 'Vue 3', description: 'Progressive JavaScript framework' },
    { name: 'TypeScript', description: 'Typed JavaScript at scale' },
    { name: 'Vuero UI', description: 'Modern Vue 3 component library' },
    { name: 'Vite', description: 'Next generation build tool' },
    { name: 'Pinia', description: 'State management for Vue' },
    { name: 'Node.js', description: 'JavaScript runtime for backend' },
    { name: 'Express', description: 'Web framework for Node.js' },
    { name: 'MySQL', description: 'Relational database system' }
  ]
}

useHead({
  title: 'About - EzCloud'
})
</script>

<template>
  <div class="page-content-inner">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="title is-3">{{ appInfo.name }}</h2>
        <p class="subtitle">{{ appInfo.description }}</p>
      </div>
    </div>

    <div class="columns">
      <!-- App Information -->
      <div class="column is-6">
        <VCard radius="smooth" class="mb-6">
          <h3 class="title is-5 mb-4">Application Information</h3>
          
          <div class="app-info-grid">
            <div class="info-item">
              <label>Application Name</label>
              <span>{{ appInfo.name }}</span>
            </div>
            <div class="info-item">
              <label>Version</label>
              <VTag color="primary">v{{ appInfo.version }}</VTag>
            </div>
            <div class="info-item full-width">
              <label>Description</label>
              <span>{{ appInfo.description }}</span>
            </div>
          </div>
        </VCard>

        <!-- Features -->
        <VCard radius="smooth">
          <h3 class="title is-5 mb-4">Key Features</h3>
          
          <div class="features-list">
            <div 
              v-for="feature in appInfo.features" 
              :key="feature"
              class="feature-item"
            >
              <iconify-icon icon="lucide:check-circle" class="feature-icon" />
              <span>{{ feature }}</span>
            </div>
          </div>
        </VCard>
      </div>

      <!-- Technology Stack -->
      <div class="column is-6">
        <VCard radius="smooth">
          <h3 class="title is-5 mb-4">Technology Stack</h3>
          
          <div class="tech-grid">
            <div 
              v-for="tech in appInfo.technologies" 
              :key="tech.name"
              class="tech-item"
            >
              <div class="tech-header">
                <iconify-icon icon="lucide:code" class="tech-icon" />
                <span class="tech-name">{{ tech.name }}</span>
              </div>
              <p class="tech-description">{{ tech.description }}</p>
            </div>
          </div>
        </VCard>
      </div>
    </div>

    <!-- System Status -->
    <VCard radius="smooth">
      <h3 class="title is-5 mb-4">System Status</h3>
      
      <div class="status-grid">
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:server" class="status-icon" />
            <span>Backend API</span>
          </div>
          <VTag color="success">Online</VTag>
        </div>
        
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:database" class="status-icon" />
            <span>Database</span>
          </div>
          <VTag color="success">Connected</VTag>
        </div>
        
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:wifi" class="status-icon" />
            <span>WebSocket Gateway</span>
          </div>
          <VTag color="success">Active</VTag>
        </div>
        
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:shield-check" class="status-icon" />
            <span>Authentication</span>
          </div>
          <VTag color="success">Secure</VTag>
        </div>
      </div>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.page-content-inner {
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;

  .header-content {
    text-align: center;

    .title {
      margin: 0 0 0.5rem 0;
      color: var(--dark-text);
    }

    .subtitle {
      color: var(--muted-grey);
      margin: 0;
    }
  }
}

.app-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;

  .info-item {
    padding: 1rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);

    &.full-width {
      grid-column: 1 / -1;
    }

    label {
      display: block;
      font-weight: 600;
      color: var(--muted-grey);
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    span {
      color: var(--dark-text);
      font-weight: 500;
    }
  }
}

.features-list {
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
    transition: all 0.3s;

    &:hover {
      background: var(--fade-grey-light-6);
    }

    .feature-icon {
      color: var(--success);
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    span {
      color: var(--dark-text);
      font-weight: 500;
    }
  }
}

.tech-grid {
  display: grid;
  gap: 1rem;

  .tech-item {
    padding: 1.5rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);
    transition: all 0.3s;

    &:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }

    .tech-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;

      .tech-icon {
        color: var(--primary);
        font-size: 1.1rem;
      }

      .tech-name {
        font-weight: 600;
        color: var(--dark-text);
      }
    }

    .tech-description {
      color: var(--muted-grey);
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.4;
    }
  }
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);

    .status-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .status-icon {
        color: var(--primary);
        font-size: 1.2rem;
      }

      span {
        font-weight: 600;
        color: var(--dark-text);
      }
    }
  }
}

.is-dark {
  .info-item,
  .tech-item,
  .status-item {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }

  .feature-item {
    &:hover {
      background: var(--dark-sidebar-light-6);
    }
  }
}

@media only screen and (max-width: 767px) {
  .page-content-inner {
    padding: 1rem;
  }

  .app-info-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }

  .columns {
    display: block;

    .column {
      width: 100%;
      margin-bottom: 1rem;
    }
  }
}
</style>
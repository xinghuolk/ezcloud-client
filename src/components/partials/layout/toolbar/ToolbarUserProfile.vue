<script setup lang="ts">
import { useUserSession } from '/@src/stores/user-session'
import { useRouter } from 'vue-router'

const userSession = useUserSession()
const router = useRouter()

async function logout() {
  await userSession.logoutUser()
  router.push('/auth')
}

// Get user initial for avatar
const getUserInitial = () => {
  return userSession.user?.username?.charAt(0).toUpperCase() || 'U'
}

// Get user display name
const getUserDisplayName = () => {
  return userSession.user?.username || 'User'
}

// Get user role display
const getUserRole = () => {
  const role = userSession.user?.role || 'user'
  return role.charAt(0).toUpperCase() + role.slice(1)
}
</script>

<template>
  <VDropdown
    v-if="userSession.isLoggedIn"
    spaced
    class="profile-dropdown"
  >
    <template #button="{ toggle }">
      <a
        role="button"
        tabindex="0"
        class="is-trigger dropdown-trigger"
        aria-haspopup="true"
        @keydown.enter.prevent="toggle"
        @click="toggle"
      >
        <VAvatar 
          :initials="getUserInitial()"
          color="primary"
        />
      </a>
    </template>

    <template #content>
      <div class="dropdown-head">
        <VAvatar
          size="large"
          :initials="getUserInitial()"
          color="primary"
        />

        <div class="meta">
          <span>{{ getUserDisplayName() }}</span>
          <span>{{ getUserRole() }}</span>
        </div>
      </div>

      <RouterLink
        to="/app/profile"
        class="dropdown-item is-media"
      >
        <div class="icon">
          <iconify-icon icon="lucide:user" />
        </div>
        <div class="meta">
          <span>Profile</span>
          <span>View your profile</span>
        </div>
      </RouterLink>

      <hr class="dropdown-divider">

      <RouterLink
        to="/app/devices"
        class="dropdown-item is-media"
      >
        <div class="icon">
          <iconify-icon icon="lucide:monitor" />
        </div>
        <div class="meta">
          <span>Devices</span>
          <span>Manage devices</span>
        </div>
      </RouterLink>

      <RouterLink
        v-if="userSession.isAdmin"
        to="/app/vendors"
        class="dropdown-item is-media"
      >
        <div class="icon">
          <iconify-icon icon="lucide:building" />
        </div>
        <div class="meta">
          <span>Vendors</span>
          <span>Manage vendors</span>
        </div>
      </RouterLink>

      <hr class="dropdown-divider">

      <RouterLink
        to="/app/settings"
        class="dropdown-item is-media"
      >
        <div class="icon">
          <iconify-icon icon="lucide:settings" />
        </div>
        <div class="meta">
          <span>Settings</span>
          <span>Account settings</span>
        </div>
      </RouterLink>

      <hr class="dropdown-divider">

      <div class="dropdown-item is-button">
        <VButton
          class="logout-button"
          icon="lucide:log-out"
          color="primary"
          role="menuitem"
          raised
          fullwidth
          @click="logout"
        >
          Logout
        </VButton>
      </div>
    </template>
  </VDropdown>
</template>

<style scoped lang="scss">
.profile-dropdown {
  > img {
    height: 32px;
    width: 32px;
    border-radius: var(--radius-rounded);
    margin: 0 4px;
    cursor: pointer;
  }

  .dropdown-content, :deep(.dropdown-content) {
    padding-top: 0 !important;
    overflow: hidden;

    .dropdown-head {
      display: flex;
      align-items: center;
      padding: 20px 16px;
      margin-bottom: 12px;
      background: #fafafa;

      .meta {
        margin-inline-start: 12px;
        font-family: var(--font);

        span {
          display: block;

          &:first-child {
            font-size: 1.1rem;
            font-weight: 500;
            color: var(--dark-text);
            line-height: 1.2;
          }

          &:nth-child(2) {
            text-transform: uppercase;
            color: var(--light-text);
            font-size: 0.7rem;
          }
        }
      }
    }

    .dropdown-item.is-media {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      text-decoration: none;
      color: var(--dark-text);
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--fade-grey-light-3);
      }

      .icon {
        margin-right: 12px;
        width: 20px;
        text-align: center;
        color: var(--light-text);
      }

      .meta {
        span {
          display: block;

          &:first-child {
            font-weight: 500;
            color: var(--dark-text);
          }

          &:nth-child(2) {
            font-size: 0.85rem;
            color: var(--light-text);
          }
        }
      }
    }

    .logout-button {
      .iconify {
        color: var(--smoke-white) !important;
      }
    }
  }
}

.is-dark {
  .profile-dropdown {
    .dropdown-content, :deep(.dropdown-content) {
      .dropdown-head {
        background: color-mix(in oklab, var(--dark-sidebar), white 2%) !important;

        &:hover,
        &:focus {
          background: color-mix(in oklab, var(--dark-sidebar), white 2%) !important;
        }

        .meta {
          &:hover {
            background: color-mix(in oklab, var(--dark-sidebar), white 2%) !important;
          }

          span {
            &:first-child {
              color: var(--dark-dark-text) !important;
            }
          }
        }
      }

      .dropdown-item.is-media {
        &:hover {
          background-color: var(--dark-sidebar-light-1) !important;
        }
      }
    }
  }
}
</style>
import { vBackground } from '/@src/directives/background'
import { vPreloadLink } from '/@src/directives/preload-link'
import { vTooltip } from '/@src/directives/tooltip'
import type { VueroPlugin } from '/@src/utils/plugins'

const plugin: VueroPlugin = ({ app }) => {
  // register global v-preload-link directive
  app.directive('preload-link', vPreloadLink)

  // register global v-tooltip directive
  app.directive('tooltip', vTooltip)

  // register global v-background directive
  app.directive('background', vBackground)
}

export default plugin
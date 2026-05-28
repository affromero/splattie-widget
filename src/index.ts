import { SplatWidget } from './SplatWidget';

export const VERSION: string = __WIDGET_VERSION__;

export { SplatWidget };
export { StateMachine } from './state/StateMachine';
export { createDefaultConfig, loadConfig, mergeWithDefaults } from './state/StateConfig';
export type {
  AutoBlinkConfig,
  CameraConfig,
  GhostConfig,
  SplatWidgetEvents,
  SplattieManifest,
  StateDefinition,
  TrackingConfig,
  TransitionConfig,
  WidgetConfig,
} from './types';

export function register(tagName = 'splattie-widget'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SplatWidget);
  }
}

register();

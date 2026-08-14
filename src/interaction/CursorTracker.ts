import { expSmooth } from '../features/GazeMath';

export class CursorTracker {
  ndcX = 0;
  ndcY = 0;
  /** Damped cursor position, eased toward ndcX/ndcY each frame via update(). */
  smoothX = 0;
  smoothY = 0;
  clientX = 0;
  clientY = 0;
  isOnPage = false;
  private element: HTMLElement | null = null;
  private useGyro = false;
  private baseBeta: number | null = null;
  private baseGamma: number | null = null;
  private touchResetTimer: ReturnType<typeof setTimeout> | null = null;

  attach(element: HTMLElement): void {
    this.element = element;
    document.addEventListener('pointerdown', this.onMove);
    document.addEventListener('pointermove', this.onMove);
    document.addEventListener('pointerleave', this.onLeave);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);

    if ('ontouchstart' in window && window.DeviceOrientationEvent) {
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (DOE.requestPermission) {
        // iOS grants motion access only from a user gesture — asking at
        // attach time rejects silently. Wait for the first touch instead.
        document.addEventListener('pointerdown', this.onFirstGesture, { once: true });
      } else {
        this.requestGyro();
      }
    }
  }

  detach(): void {
    document.removeEventListener('pointerdown', this.onMove);
    document.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerleave', this.onLeave);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('pointerdown', this.onFirstGesture);
    window.removeEventListener('deviceorientation', this.onGyro);
    if (this.touchResetTimer !== null) clearTimeout(this.touchResetTimer);
    this.element = null;
  }

  /**
   * Advance the damped cursor toward the raw target. Call once per frame with
   * the real delta-time and smoothing time-constant. On pointer-leave the
   * target is zeroed, so the smoothed value eases back to center instead of
   * snapping.
   */
  update(dt: number, tau: number): void {
    this.smoothX = expSmooth(this.smoothX, this.ndcX, dt, tau);
    this.smoothY = expSmooth(this.smoothY, this.ndcY, dt, tau);
  }

  private onFirstGesture = (): void => {
    this.requestGyro();
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.element) return;
    if (this.touchResetTimer !== null) {
      clearTimeout(this.touchResetTimer);
      this.touchResetTimer = null;
    }
    const rect = this.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.ndcX = (e.clientX - centerX) / (rect.width / 2);
    this.ndcY = -((e.clientY - centerY) / (rect.height / 2));

    this.clientX = e.clientX - rect.left;
    this.clientY = e.clientY - rect.top;
    this.isOnPage = true;
  };

  private onLeave = (): void => {
    if (!this.useGyro) {
      this.isOnPage = false;
      this.ndcX = 0;
      this.ndcY = 0;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' && !this.useGyro) {
      // Grace period so the click event that follows touchend still sees the
      // tap's hover state — the hit-test loop would otherwise zero it first.
      this.touchResetTimer = setTimeout(() => {
        this.touchResetTimer = null;
        this.isOnPage = false;
        this.ndcX = 0;
        this.ndcY = 0;
      }, 150);
    }
  };

  private async requestGyro(): Promise<void> {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (DOE.requestPermission) {
      try {
        const result = await DOE.requestPermission();
        if (result !== 'granted') return;
      } catch { return; }
    }
    this.useGyro = true;
    window.addEventListener('deviceorientation', this.onGyro);
  }

  private onGyro = (e: DeviceOrientationEvent): void => {
    if (e.beta === null || e.gamma === null) return;

    if (this.baseBeta === null) {
      this.baseBeta = e.beta;
      this.baseGamma = e.gamma;
    }

    // gamma = left/right tilt (-90 to 90), maps to X
    // beta = front/back tilt (0 to 180), maps to Y
    const dx = (e.gamma - (this.baseGamma ?? 0)) / 30;
    const dy = -(e.beta - (this.baseBeta ?? 0)) / 25;

    this.ndcX = Math.max(-1, Math.min(1, dx));
    this.ndcY = Math.max(-1, Math.min(1, dy));
    this.isOnPage = true;
  };
}

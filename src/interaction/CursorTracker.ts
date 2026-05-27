export class CursorTracker {
  ndcX = 0;
  ndcY = 0;
  clientX = 0;
  clientY = 0;
  isOnPage = false;
  private element: HTMLElement | null = null;
  private useGyro = false;
  private baseBeta: number | null = null;
  private baseGamma: number | null = null;

  attach(element: HTMLElement): void {
    this.element = element;
    document.addEventListener('pointermove', this.onMove);
    document.addEventListener('pointerleave', this.onLeave);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);

    if ('ontouchstart' in window && window.DeviceOrientationEvent) {
      this.useGyro = true;
      window.addEventListener('deviceorientation', this.onGyro);
    }
  }

  detach(): void {
    document.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerleave', this.onLeave);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('deviceorientation', this.onGyro);
    this.element = null;
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.element) return;
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
      this.isOnPage = false;
      this.ndcX = 0;
      this.ndcY = 0;
    }
  };

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

/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CursorTracker } from '../src/interaction/CursorTracker';

describe('CursorTracker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tracks pointer position as normalized device coordinates and eases back on leave', () => {
    vi.stubGlobal('DeviceOrientationEvent', undefined);
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      left: 50,
      top: 25,
      width: 200,
      height: 100,
      right: 250,
      bottom: 125,
      x: 50,
      y: 25,
      toJSON: () => ({}),
    });

    const cursor = new CursorTracker();
    cursor.attach(element);

    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 250, clientY: 25 }));
    expect(cursor.isOnPage).toBe(true);
    expect(cursor.clientX).toBe(200);
    expect(cursor.clientY).toBe(0);
    expect(cursor.ndcX).toBeCloseTo(1);
    expect(cursor.ndcY).toBeCloseTo(1);

    cursor.update(1, 0);
    expect(cursor.smoothX).toBeCloseTo(1);
    expect(cursor.smoothY).toBeCloseTo(1);

    document.dispatchEvent(new Event('pointerleave'));
    expect(cursor.isOnPage).toBe(false);
    expect(cursor.ndcX).toBe(0);
    expect(cursor.ndcY).toBe(0);

    cursor.detach();
  });

  it('registers a touch tap via pointerdown and keeps state through the click grace period', () => {
    vi.stubGlobal('DeviceOrientationEvent', undefined);
    vi.useFakeTimers();
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
      toJSON: () => ({}),
    });

    const cursor = new CursorTracker();
    cursor.attach(element);

    // A quick tap fires pointerdown + pointerup with no pointermove.
    document.dispatchEvent(new MouseEvent('pointerdown', { clientX: 50, clientY: 50 }));
    expect(cursor.isOnPage).toBe(true);
    expect(cursor.clientX).toBe(50);
    expect(cursor.clientY).toBe(50);

    const up = new MouseEvent('pointerup');
    Object.defineProperty(up, 'pointerType', { value: 'touch' });
    document.dispatchEvent(up);

    // Still on-page right after touchend so the trailing click hit-tests true...
    expect(cursor.isOnPage).toBe(true);
    // ...and eased back to center once the grace period passes.
    vi.advanceTimersByTime(200);
    expect(cursor.isOnPage).toBe(false);
    expect(cursor.ndcX).toBe(0);

    cursor.detach();
    vi.useRealTimers();
  });

  it('defers the iOS motion-permission request until the first touch gesture', () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission });
    (window as unknown as { ontouchstart: null }).ontouchstart = null;

    const cursor = new CursorTracker();
    cursor.attach(document.createElement('div'));
    expect(requestPermission).not.toHaveBeenCalled();

    document.dispatchEvent(new MouseEvent('pointerdown', { clientX: 1, clientY: 1 }));
    expect(requestPermission).toHaveBeenCalledTimes(1);

    cursor.detach();
    delete (window as unknown as { ontouchstart?: null }).ontouchstart;
  });
});

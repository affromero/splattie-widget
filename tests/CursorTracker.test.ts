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
});

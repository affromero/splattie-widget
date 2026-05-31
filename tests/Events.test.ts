/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { SplatEvents } from '../src/interaction/Events';

describe('SplatEvents', () => {
  it('emits hover and leave only when the hit state changes', () => {
    const element = document.createElement('div');
    const hover = vi.fn();
    const leave = vi.fn();
    element.addEventListener('splathover', hover);
    element.addEventListener('splatleave', leave);

    const events = new SplatEvents(element);
    events.update(true);
    events.update(true);
    events.update(false);

    expect(hover).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('turns clicks over the splat into widget events', () => {
    const element = document.createElement('div');
    const click = vi.fn();
    const dblclick = vi.fn();
    element.addEventListener('splatclick', click);
    element.addEventListener('splatdblclick', dblclick);

    const events = new SplatEvents(element);
    events.attachClick(element);
    element.click();
    expect(click).not.toHaveBeenCalled();

    events.update(true);
    element.click();
    element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(dblclick).toHaveBeenCalledTimes(1);
  });
});

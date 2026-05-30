import { describe, it, expect, vi, afterEach } from 'vitest';
import { AutoBlink } from '../src/features/AutoBlink';

// Drive performance.now() deterministically; Math.random()=0 makes the next blink
// land at the start of the interval (now + min).
const withClock = (start: number) => {
  let t = start;
  vi.spyOn(performance, 'now').mockImplementation(() => t);
  vi.spyOn(Math, 'random').mockReturnValue(0);
  return {
    set: (v: number) => {
      t = v;
    },
  };
};

afterEach(() => vi.restoreAllMocks());

describe('AutoBlink.getWeights', () => {
  it('drives both eyelids together with an equal weight', () => {
    withClock(1000);
    const blink = new AutoBlink({ interval: [2000, 7000], duration: 150 });
    const w = blink.getWeights();
    expect(w.eyeBlinkLeft).toBe(w.eyeBlinkRight);
    expect(Object.keys(w).sort()).toEqual(['eyeBlinkLeft', 'eyeBlinkRight']);
  });

  it('stays closed-weight 0 before the scheduled blink', () => {
    const clock = withClock(1000); // next blink at 1000 + 2000 = 3000
    const blink = new AutoBlink({ interval: [2000, 7000], duration: 150 });
    clock.set(2999);
    expect(blink.getWeights().eyeBlinkLeft).toBe(0);
  });

  it('peaks at weight 1 halfway through the blink, then reopens', () => {
    const clock = withClock(1000); // next blink at 3000, duration 150
    const blink = new AutoBlink({ interval: [2000, 7000], duration: 150 });

    clock.set(3075); // elapsed 75 = duration/2 -> sin(pi/2) = 1
    expect(blink.getWeights().eyeBlinkLeft).toBeCloseTo(1, 6);

    clock.set(3150); // elapsed == duration -> reopened, reschedules
    expect(blink.getWeights().eyeBlinkLeft).toBe(0);
  });

  it('schedules the next blink after the previous one completes', () => {
    const clock = withClock(0); // first blink at 2000
    const blink = new AutoBlink({ interval: [2000, 7000], duration: 150 });

    clock.set(2150); // finish first blink -> reschedule at 2150 + 2000 = 4150
    expect(blink.getWeights().eyeBlinkLeft).toBe(0);

    clock.set(4225); // halfway through the second blink (4150 + 75)
    expect(blink.getWeights().eyeBlinkLeft).toBeCloseTo(1, 6);
  });
});

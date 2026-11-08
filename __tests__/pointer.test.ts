import {
  aspectNormY,
  createSpeedFilter,
  pointerAcceleration,
} from '../src/utils/pointer';

describe('pointerAcceleration', () => {
  it('damps slow movement and amplifies fast movement', () => {
    expect(pointerAcceleration(0)).toBeCloseTo(0.7);
    expect(pointerAcceleration(5000)).toBeCloseTo(2.0);
  });

  it('keeps deliberate movement near 1x', () => {
    const gain = pointerAcceleration(500);
    expect(gain).toBeGreaterThan(0.85);
    expect(gain).toBeLessThan(1.15);
  });

  it('never decreases as speed rises', () => {
    let prev = pointerAcceleration(0);
    for (let speed = 25; speed <= 2000; speed += 25) {
      const gain = pointerAcceleration(speed);
      expect(gain).toBeGreaterThanOrEqual(prev);
      prev = gain;
    }
  });
});

describe('createSpeedFilter', () => {
  it('smooths consecutive samples', () => {
    const filter = createSpeedFilter();
    expect(filter(1000, 1000)).toBe(1000);
    expect(filter(0, 1010)).toBe(500);
  });

  it('restarts after a pause', () => {
    const filter = createSpeedFilter();
    filter(1000, 1000);
    expect(filter(200, 1500)).toBe(200);
  });
});

describe('aspectNormY', () => {
  it('equalizes axes within its cap', () => {
    expect(aspectNormY(300, 200)).toBeCloseTo(1.5);
    expect(aspectNormY(900, 200)).toBe(1.5);
    expect(aspectNormY(100, 400)).toBe(0.5);
    expect(aspectNormY(0, 0)).toBe(1);
  });
});

// Pointer math shared by the platform touchpad screens.

// Finger speeds (pt/s) bounding the acceleration ramp, and the gain at
// either end. Typical deliberate movement (~400–600 pt/s) lands near 1×,
// so the sensitivity setting keeps its meaning.
const ACCEL_SLOW_SPEED = 100;
const ACCEL_FAST_SPEED = 1500;
const ACCEL_MIN_GAIN = 0.7;
const ACCEL_MAX_GAIN = 2.0;

/**
 * Trackpad-style pointer acceleration: slow finger movement is damped for
 * precision, fast movement is amplified so a flick crosses the screen. The
 * ramp is a smoothstep, so gain never changes abruptly mid-gesture.
 */
export function pointerAcceleration(speed: number): number {
  const t = Math.min(
    1,
    Math.max(
      0,
      (speed - ACCEL_SLOW_SPEED) / (ACCEL_FAST_SPEED - ACCEL_SLOW_SPEED),
    ),
  );
  const eased = t * t * (3 - 2 * t);
  return ACCEL_MIN_GAIN + (ACCEL_MAX_GAIN - ACCEL_MIN_GAIN) * eased;
}

// A gap this long between pointer deltas means a new movement: the speed
// estimate restarts instead of carrying the previous gesture's speed.
const SPEED_RESET_GAP_MS = 100;

/**
 * Low-pass filter for the per-event finger speed. Raw touch velocity is
 * noisy, and feeding it straight into the acceleration curve would make the
 * gain flicker from event to event.
 */
export function createSpeedFilter(): (speed: number, now: number) => number {
  let smoothed = 0;
  let lastAt = 0;
  return (speed, now) => {
    smoothed =
      now - lastAt > SPEED_RESET_GAP_MS ? speed : smoothed * 0.5 + speed * 0.5;
    lastAt = now;
    return smoothed;
  };
}

/**
 * Vertical gain that makes pointer travel uniform on both axes: the pad is
 * rarely square, so a full-height swipe should move the cursor as far as a
 * full-width swipe. Capped because a wide-short landscape pad would push
 * vertical gain into jitter-amplifying territory.
 */
export function aspectNormY(padW: number, padH: number): number {
  if (padW <= 0 || padH <= 0) {
    return 1;
  }
  return Math.min(1.5, Math.max(0.5, padW / padH));
}

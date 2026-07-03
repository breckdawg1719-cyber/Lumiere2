import confetti from "canvas-confetti";

/**
 * Soft rose-gold petal burst — keep it elegant, not party-store.
 * Optionally pass an origin point {x, y} in normalized [0..1] coords.
 */
export function celebrateAttending(origin = { x: 0.5, y: 0.4 }) {
  const palette = ["#C5A880", "#E2C2B3", "#D48A8A", "#E8CBA5", "#9CB4A6"];

  confetti({
    particleCount: 36,
    spread: 70,
    startVelocity: 32,
    gravity: 0.9,
    scalar: 0.85,
    ticks: 130,
    decay: 0.92,
    origin,
    colors: palette,
    shapes: ["circle"],
  });

  // A second softer wave for a layered feel
  setTimeout(() => {
    confetti({
      particleCount: 18,
      spread: 100,
      startVelocity: 22,
      gravity: 0.8,
      scalar: 0.7,
      ticks: 160,
      decay: 0.94,
      origin: { x: origin.x, y: origin.y + 0.05 },
      colors: palette,
      shapes: ["circle"],
    });
  }, 180);
}

/**
 * Convert a DOM event into normalized confetti origin coords.
 */
export function originFromEvent(e) {
  if (!e || typeof window === "undefined") return { x: 0.5, y: 0.4 };
  const x = (e.clientX || window.innerWidth / 2) / window.innerWidth;
  const y = (e.clientY || window.innerHeight / 3) / window.innerHeight;
  return { x, y };
}

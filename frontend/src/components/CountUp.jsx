import { useEffect, useState } from "react";
import { animate } from "framer-motion";

/**
 * Smooth count-up that animates from current value to `value` whenever it changes.
 * Usage: <CountUp value={48200} prefix="$" />
 */
export default function CountUp({
  value = 0,
  prefix = "",
  suffix = "",
  duration = 0.9,
  decimals = 0,
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const controls = animate(display, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

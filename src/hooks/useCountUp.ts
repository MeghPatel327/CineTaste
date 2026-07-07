"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 → target with ease-out cubic.
 *
 * - Animates once when target first becomes a positive number.
 * - Safe to call with undefined/null while data is loading — shows "0".
 * - Handles strings (e.g. avgRating comes as "8.1" from toFixed).
 */
export function useCountUp(
  target: number | string | null | undefined,
  duration = 800,
  decimals = 0
): string {
  const numericTarget = target === null || target === undefined
    ? undefined
    : typeof target === "string" ? parseFloat(target) : target;

  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Not ready yet
    if (numericTarget === undefined || isNaN(numericTarget)) return;
    // Already animated — don't repeat
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Zero target — just show 0 instantly
    if (numericTarget === 0) {
      setValue(0);
      return;
    }

    const final = numericTarget;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(eased * final);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(final);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [numericTarget, duration]);

  const display = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toString();

  return display;
}

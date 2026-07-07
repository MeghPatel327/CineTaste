"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 600,
  decimals = 0,
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);
  const numericValue = Number(value) || 0;

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplay(numericValue);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(numericValue);
      hasAnimated.current = true;
      return;
    }

    hasAnimated.current = true;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericValue * eased;
      setDisplay(decimals > 0 ? current : Math.round(current));
      if (progress < 1) requestAnimationFrame(tick);
      else setDisplay(numericValue);
    };

    requestAnimationFrame(tick);
  }, [numericValue, duration, decimals]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );
}

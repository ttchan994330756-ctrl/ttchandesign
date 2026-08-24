import { useEffect, useRef, useState } from "react";
import "./CountUp.css";

type CountUpProps = {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
};

function formatValue(value: number, separator: string) {
  const rounded = Math.round(value);
  const formatted = Math.abs(rounded).toLocaleString("en-US");
  return separator ? formatted.replace(/,/g, separator) : formatted;
}

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}: CountUpProps) {
  const initialValue = direction === "down" ? to : from;
  const targetValue = direction === "down" ? from : to;
  const [value, setValue] = useState(initialValue);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!startWhen) return undefined;
    let timeoutId: number | undefined;
    const start = () => {
      onStart?.();
      const startedAt = performance.now();
      const durationMs = Math.max(1, duration * 1000);
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(initialValue + (targetValue - initialValue) * eased);
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          frameRef.current = undefined;
          onEnd?.();
          window.dispatchEvent(new Event("portfolio:count-complete"));
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    };

    timeoutId = window.setTimeout(start, Math.max(0, delay * 1000));
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    };
  }, [delay, duration, initialValue, onEnd, onStart, startWhen, targetValue]);

  return <span className={`count-up ${className}`.trim()}>{formatValue(value, separator)}</span>;
}

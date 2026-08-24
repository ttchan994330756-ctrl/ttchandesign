import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "./BlurText.css";

type BlurSnapshot = {
  filter?: string;
  opacity?: number;
  y?: number | string;
  x?: number | string;
};

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  startDelay?: number;
  animationFrom?: BlurSnapshot;
  animationTo?: BlurSnapshot[];
  easing?: string | ((value: number) => number);
  stepDuration?: number;
  onAnimationComplete?: () => void;
  waitForOpening?: boolean;
};

export default function BlurText({
  text = "",
  delay = 90,
  className = "",
  animateBy = "letters",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  startDelay = 0,
  animationFrom,
  animationTo,
  easing = "cubic-bezier(.22, 1, .36, 1)",
  stepDuration = 0.42,
  onAnimationComplete,
  waitForOpening = false,
}: BlurTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  const elements = useMemo(() => (animateBy === "words" ? text.split(" ") : Array.from(text)), [animateBy, text]);
  const computedDirection = direction === "top" ? "-42px" : "42px";
  const fromSnapshot = animationFrom ?? { filter: "blur(10px)", opacity: 0, y: computedDirection };
  const finalSnapshot = animationTo?.at(-1);
  const finalOpacity = finalSnapshot?.opacity ?? 1;
  const finalFilter = finalSnapshot?.filter ?? "blur(0px)";
  const finalY = finalSnapshot?.y ?? 0;
  const finalX = finalSnapshot?.x ?? 0;
  const easingValue = typeof easing === "string" ? easing : "cubic-bezier(.22, 1, .36, 1)";
  const baseStyle = {
    "--blur-from-filter": fromSnapshot.filter ?? "blur(10px)",
    "--blur-from-opacity": fromSnapshot.opacity ?? 0,
    "--blur-from-x": typeof fromSnapshot.x === "number" ? `${fromSnapshot.x}px` : (fromSnapshot.x ?? "0px"),
    "--blur-from-y": typeof fromSnapshot.y === "number" ? `${fromSnapshot.y}px` : (fromSnapshot.y ?? computedDirection),
    "--blur-to-filter": finalFilter,
    "--blur-to-opacity": finalOpacity,
    "--blur-to-x": typeof finalX === "number" ? `${finalX}px` : finalX,
    "--blur-to-y": typeof finalY === "number" ? `${finalY}px` : finalY,
    "--blur-duration": `${stepDuration}s`,
    "--blur-ease": easingValue,
  } as CSSProperties;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let timer: number | undefined;
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      timer = window.setTimeout(() => setInView(true), startDelay);
    };
    const onOpeningComplete = () => begin();
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.unobserve(root);
      if (waitForOpening && document.documentElement.dataset.openingComplete !== "true") {
        window.addEventListener("portfolio:opening-complete", onOpeningComplete, { once: true });
      } else {
        begin();
      }
    }, { threshold, rootMargin });
    observer.observe(root);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("portfolio:opening-complete", onOpeningComplete);
    };
  }, [rootMargin, startDelay, threshold, waitForOpening]);

  return (
    <span ref={rootRef} className={`blur-text ${className}`.trim()}>
      <span className="blur-text-sr-only">{text}</span>
      <span className={`blur-text-visual${inView ? " is-visible" : ""}`} aria-hidden="true">
        {elements.map((segment, index) => (
          <span
            className="blur-text-segment"
            key={`${segment}-${index}`}
            style={{ ...baseStyle, "--blur-delay": `${index * delay}ms` } as CSSProperties}
          >
            {segment === " " ? "\u00a0" : segment}
            {animateBy === "words" && index < elements.length - 1 ? "\u00a0" : null}
          </span>
        ))}
      </span>
    </span>
  );
}

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "./BorderGlow.css";

type BorderGlowProps = {
  children: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
};

type AnimationOptions = {
  start?: number;
  end?: number;
  duration?: number;
  delay?: number;
  ease?: (value: number) => number;
  onUpdate: (value: number) => void;
  onEnd?: () => void;
};

const GRADIENT_POSITIONS = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const GRADIENT_KEYS = ["--gradient-one", "--gradient-two", "--gradient-three", "--gradient-four", "--gradient-five", "--gradient-six", "--gradient-seven"];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function parseHSL(hsl: string) {
  const match = hsl.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 256, s: 99, l: 58 };
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function buildGlowVars(glowColor: string, intensity: number) {
  const { h, s, l } = parseHSL(glowColor);
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
  return opacities.reduce<Record<string, string>>((variables, opacity, index) => {
    variables[`--glow-color${keys[index]}`] = `hsl(${h}deg ${s}% ${l}% / ${Math.min(opacity * intensity, 100)}%)`;
    return variables;
  }, {});
}

function buildGradientVars(colors: string[]) {
  const palette = colors.length ? colors : ["#4101f6"];
  const variables = GRADIENT_POSITIONS.reduce<Record<string, string>>((result, position, index) => {
    const color = palette[Math.min(COLOR_MAP[index], palette.length - 1)];
    result[GRADIENT_KEYS[index]] = `radial-gradient(at ${position}, ${color} 0px, transparent 50%)`;
    return result;
  }, {});
  variables["--gradient-base"] = `linear-gradient(${palette[0]} 0 100%)`;
  return variables;
}

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const easeInCubic = (value: number) => value * value * value;

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }: AnimationOptions) {
  const startTime = performance.now() + delay;
  const tick = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);
    onUpdate(start + (end - start) * ease(progress));
    if (progress < 1) requestAnimationFrame(tick);
    else onEnd?.();
  };
  window.setTimeout(() => requestAnimationFrame(tick), delay);
}

export default function BorderGlow({
  children,
  className = "",
  edgeSensitivity = 30,
  glowColor = "256 99 58",
  backgroundColor = "#0c121f",
  borderRadius = 16,
  glowRadius = 32,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  colors = ["#4101f6", "#8b5cf6", "#38bdf8"],
  fillOpacity = 0.42,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const scaleX = dx === 0 ? Infinity : centerX / Math.abs(dx);
    const scaleY = dy === 0 ? Infinity : centerY / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(scaleX, scaleY), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    card.style.setProperty("--edge-proximity", (edge * 100).toFixed(3));
    card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!animated || !card) return;
    const angleStart = 110;
    const angleEnd = 465;
    card.classList.add("sweep-active");
    card.style.setProperty("--cursor-angle", `${angleStart}deg`);
    animateValue({ duration: 500, onUpdate: value => card.style.setProperty("--edge-proximity", `${value}`) });
    animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: value => card.style.setProperty("--cursor-angle", `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`) });
    animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: value => card.style.setProperty("--cursor-angle", `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`) });
    animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0, onUpdate: value => card.style.setProperty("--edge-proximity", `${value}`), onEnd: () => card.classList.remove("sweep-active") });
  }, [animated]);

  const style = {
    "--card-bg": backgroundColor,
    "--edge-sensitivity": edgeSensitivity,
    "--border-radius": `${borderRadius}px`,
    "--glow-padding": `${glowRadius}px`,
    "--cone-spread": coneSpread,
    "--fill-opacity": fillOpacity,
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colors),
  } as CSSProperties;

  return (
    <div ref={cardRef} onPointerMove={handlePointerMove} className={`border-glow-card ${className}`} style={style}>
      <span className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}

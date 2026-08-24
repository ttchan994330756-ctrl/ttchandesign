import { useEffect, useRef } from "react";
import "./GooeyNav.css";

type GooeyNavItem = {
  id: string;
  label: string;
  href: string;
};

type GooeyNavProps = {
  items: GooeyNavItem[];
  activeIndex: number;
  onActiveChange?: (index: number) => void;
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
};

type ParticleData = {
  start: [number, number];
  end: [number, number];
  time: number;
  scale: number;
  color: number;
  rotate: number;
};

export default function GooeyNav({
  items,
  activeIndex,
  onActiveChange,
  animationTime = 520,
  particleCount = 14,
  particleDistances = [38, 7],
  particleR = 82,
  timeVariance = 180,
  colors = [1, 2, 1, 3, 2, 1, 4],
}: GooeyNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);

  const noise = (amount = 1) => amount / 2 - Math.random() * amount;

  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (index: number, time: number): ParticleData => {
    const rotate = noise(particleR / 10);
    return {
      start: getXY(particleDistances[0], particleCount - index, particleCount),
      end: getXY(particleDistances[1] + noise(7), particleCount - index, particleCount),
      time,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + particleR / 20) * 10 : (rotate - particleR / 20) * 10,
    };
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const position = element.getBoundingClientRect();
    const styles = {
      left: `${position.x - containerRect.x}px`,
      top: `${position.y - containerRect.y}px`,
      width: `${position.width}px`,
      height: `${position.height}px`,
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };

  const makeParticles = (element: HTMLElement) => {
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty("--time", `${bubbleTime}ms`);

    for (let index = 0; index < particleCount; index += 1) {
      const time = animationTime * 2 + noise(timeVariance * 2);
      const particleData = createParticle(index, time);
      element.classList.remove("active");

      const createTimer = window.setTimeout(() => {
        const particle = document.createElement("span");
        const point = document.createElement("span");
        particle.className = "gooey-particle";
        point.className = "gooey-point";
        particle.style.setProperty("--start-x", `${particleData.start[0]}px`);
        particle.style.setProperty("--start-y", `${particleData.start[1]}px`);
        particle.style.setProperty("--end-x", `${particleData.end[0]}px`);
        particle.style.setProperty("--end-y", `${particleData.end[1]}px`);
        particle.style.setProperty("--time", `${particleData.time}ms`);
        particle.style.setProperty("--scale", `${particleData.scale}`);
        particle.style.setProperty("--color", `var(--gooey-color-${particleData.color}, #fff)`);
        particle.style.setProperty("--rotate", `${particleData.rotate}deg`);
        particle.appendChild(point);
        element.appendChild(particle);

        requestAnimationFrame(() => element.classList.add("active"));
        const removeTimer = window.setTimeout(() => particle.remove(), time);
        timersRef.current.push(removeTimer);
      }, 30);
      timersRef.current.push(createTimer);
    }
  };

  const activate = (element: HTMLElement, index: number) => {
    if (activeIndex === index) return;
    element.classList.remove("gooey-clicked");
    void element.offsetWidth;
    element.classList.add("gooey-clicked");
    const clickTimer = window.setTimeout(() => element.classList.remove("gooey-clicked"), animationTime + 260);
    timersRef.current.push(clickTimer);
    updateEffectPosition(element);
    filterRef.current?.querySelectorAll(".gooey-particle").forEach(particle => particle.remove());
    textRef.current?.classList.remove("active");
    void textRef.current?.offsetWidth;
    textRef.current?.classList.add("active");
    if (filterRef.current) makeParticles(filterRef.current);
    onActiveChange?.(index);
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeItem = navRef.current.querySelectorAll<HTMLElement>("li")[activeIndex];
    if (activeItem) {
      updateEffectPosition(activeItem);
      textRef.current?.classList.add("active");
    }

    const resizeObserver = new ResizeObserver(() => {
      const current = navRef.current?.querySelectorAll<HTMLElement>("li")[activeIndex];
      if (current) updateEffectPosition(current);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  useEffect(() => () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
  }, []);

  return (
    <div className="capsule-nav gooey-nav-container" ref={containerRef}>
      <svg className="gooey-filter-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter
            id="gooey-nav-metaball"
            x="-80%"
            y="-220%"
            width="260%"
            height="540%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.2" result="gooey-blur" />
            <feColorMatrix
              in="gooey-blur"
              mode="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 24 -10"
              result="gooey-shape"
            />
            <feBlend in="SourceGraphic" in2="gooey-shape" mode="normal" />
          </filter>
        </defs>
      </svg>
      <nav aria-label="主导航">
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li className={`gooey-nav-item${activeIndex === index ? " active" : ""}`} key={item.id}>
              <a href={item.href} onClick={event => activate(event.currentTarget.parentElement!, index)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="gooey-effect gooey-filter" ref={filterRef} />
      <span className="gooey-effect gooey-text" ref={textRef} />
    </div>
  );
}

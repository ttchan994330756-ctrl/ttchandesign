import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

type Falloff = "linear" | "exponential" | "gaussian";

type VariableProximityProps = {
  label: string;
  fromFontVariationSettings?: string;
  toFontVariationSettings?: string;
  containerRef?: RefObject<HTMLElement | null>;
  radius?: number;
  falloff?: Falloff;
  className?: string;
};

type GlyphLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function parseSettings(settings: string) {
  return new Map(
    settings.split(",").map((setting) => {
      const [axis, value] = setting.trim().split(/\s+/);
      return [axis.replace(/["']/g, ""), Number.parseFloat(value)];
    }),
  );
}

export default function VariableProximity({
  label,
  fromFontVariationSettings = "'wght' 760",
  toFontVariationSettings = "'wght' 1000",
  containerRef,
  radius = 120,
  falloff = "exponential",
  className = "",
}: VariableProximityProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const glyphLayoutRef = useRef<GlyphLayout[]>([]);
  const [glyphLayout, setGlyphLayout] = useState<GlyphLayout[]>([]);
  const letters = useMemo(() => Array.from(label), [label]);
  const parsedSettings = useMemo(() => {
    const from = parseSettings(fromFontVariationSettings);
    const to = parseSettings(toFontVariationSettings);
    return Array.from(from.entries()).map(([axis, fromValue]) => ({
      axis,
      fromValue,
      toValue: to.get(axis) ?? fromValue,
    }));
  }, [fromFontVariationSettings, toFontVariationSettings]);

  const measureGlyphs = useCallback(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    const textNode = measure?.firstChild;
    if (!root || !measure || !(textNode instanceof Text)) return;

    const rootRect = root.getBoundingClientRect();
    const range = document.createRange();
    let offset = 0;
    const nextLayout = letters.map((letter) => {
      const start = offset;
      offset += letter.length;
      range.setStart(textNode, start);
      range.setEnd(textNode, offset);
      const rect = range.getBoundingClientRect();
      return {
        left: rect.left - rootRect.left,
        top: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
      };
    });
    range.detach();
    glyphLayoutRef.current = nextLayout;
    setGlyphLayout(nextLayout);
  }, [letters]);

  useLayoutEffect(() => {
    measureGlyphs();
    const measure = measureRef.current;
    if (!measure) return;

    const observer = new ResizeObserver(measureGlyphs);
    observer.observe(measure);
    window.addEventListener("resize", measureGlyphs);
    void document.fonts?.ready.then(measureGlyphs);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureGlyphs);
    };
  }, [measureGlyphs]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    let clientX = 0;
    let clientY = 0;
    let rootRect: { left: number; top: number } | null = null;

    const invalidateRootRect = () => { rootRect = null; };

    const setInfluence = (clientX: number, clientY: number) => {
      const root = rootRef.current;
      const layout = glyphLayoutRef.current;
      if (!root || layout.length !== letters.length) return;
      if (!rootRect) {
        const rect = root.getBoundingClientRect();
        rootRect = { left: rect.left, top: rect.top };
      }
      letterRefs.current.forEach((letter, index) => {
        if (!letter) return;
        const glyph = layout[index];
        if (!glyph) return;
        const distance = Math.hypot(
          clientX - (rootRect!.left + glyph.left + glyph.width / 2),
          clientY - (rootRect!.top + glyph.top + glyph.height / 2),
        );
        const normalized = Math.min(Math.max(1 - distance / radius, 0), 1);
        const influence = falloff === "exponential"
          ? normalized ** 2
          : falloff === "gaussian"
            ? Math.exp(-((distance / (radius / 2)) ** 2) / 2)
            : normalized;
        const settings = parsedSettings
          .map(({ axis, fromValue, toValue }) =>
            `'${axis}' ${fromValue + (toValue - fromValue) * influence}`,
          )
          .join(", ");
        const weightAxis = parsedSettings.find(({ axis }) => axis === "wght");
        letter.style.fontVariationSettings = settings;
        if (weightAxis) {
          const weight = weightAxis.fromValue
            + (weightAxis.toValue - weightAxis.fromValue) * influence;
          letter.style.fontWeight = String(Math.round(weight));
        }
        // The incumbent display stack is a static font. A paint-only stroke
        // makes proximity weight visible without changing glyph metrics.
        letter.style.webkitTextStrokeWidth = `${influence * 0.09}em`;
      });
    };

    const reset = () => {
      cancelAnimationFrame(frame);
      letterRefs.current.forEach((letter) => {
        if (!letter) return;
        letter.style.fontVariationSettings = fromFontVariationSettings;
        const weight = parsedSettings.find(({ axis }) => axis === "wght")?.fromValue;
        if (weight !== undefined) letter.style.fontWeight = String(weight);
        letter.style.webkitTextStrokeWidth = "0em";
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        setInfluence(clientX, clientY);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", invalidateRootRect, { passive: true });
    window.addEventListener("scroll", invalidateRootRect, { passive: true });
    window.addEventListener("blur", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", invalidateRootRect);
      window.removeEventListener("scroll", invalidateRootRect);
      window.removeEventListener("blur", reset);
    };
  }, [containerRef, falloff, fromFontVariationSettings, parsedSettings, radius]);

  const isReady = glyphLayout.length === letters.length;

  return (
    <span
      ref={rootRef}
      className={`variable-proximity${isReady ? " is-ready" : ""}${className ? ` ${className}` : ""}`}
    >
      <span ref={measureRef} className="variable-proximity-measure" aria-hidden="true">
        {label}
      </span>
      <span className="variable-proximity-overlay" aria-hidden="true">
        {letters.map((letter, index) => {
          const layout = glyphLayout[index];
          return (
            <span
              key={`${letter}-${index}`}
              ref={(element) => { letterRefs.current[index] = element; }}
              className="variable-proximity-letter"
              style={layout ? {
                left: layout.left,
                top: layout.top,
                width: layout.width,
                height: layout.height,
                fontVariationSettings: fromFontVariationSettings,
                WebkitTextStrokeWidth: "0em",
              } : undefined}
            >
              {letter === " " ? "\u00a0" : letter}
            </span>
          );
        })}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

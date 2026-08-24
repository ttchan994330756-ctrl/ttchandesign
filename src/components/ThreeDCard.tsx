import { useEffect, useRef, type ReactNode } from "react";

type ThreeDCardProps = {
  children: ReactNode;
  className?: string;
};

export default function ThreeDCard({ children, className = "" }: ThreeDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let bounds: {
      scene: { left: number; top: number; width: number; height: number };
      tag: { left: number; top: number; right: number; bottom: number } | null;
    } | null = null;
    let clientX = 0;
    let clientY = 0;

    const measure = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const tagRect = cardRef.current?.querySelector<HTMLElement>(".portrait-education-tag")?.getBoundingClientRect();
      bounds = {
        scene: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        tag: tagRect
          ? { left: tagRect.left, top: tagRect.top, right: tagRect.right, bottom: tagRect.bottom }
          : null,
      };
    };

    const resetCard = () => {
      const card = cardRef.current;
      if (!card) return;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      card.dataset.active = "false";
      card.style.setProperty("--card-rotate-x", "0deg");
      card.style.setProperty("--card-rotate-y", "0deg");
      card.style.setProperty("--card-shift-x", "0px");
      card.style.setProperty("--card-shift-y", "0px");
      card.style.setProperty("--card-scale", "1");
    };

    const updateCard = () => {
      frame = 0;
      const card = cardRef.current;
      if (!card) return;
      if (!bounds) measure();
      if (!bounds) return;
      const rect = bounds.scene;
      const tagRect = bounds.tag;
      const isInsideCard = clientX >= rect.left && clientX <= rect.left + rect.width
        && clientY >= rect.top && clientY <= rect.top + rect.height;
      const isInsideTag = tagRect
        ? clientX >= tagRect.left && clientX <= tagRect.right
          && clientY >= tagRect.top && clientY <= tagRect.bottom
        : false;
      const isInside = isInsideCard || isInsideTag;
      if (!isInside) {
        resetCard();
        return;
      }
      const x = Math.max(-0.5, Math.min(0.5, (clientX - rect.left) / rect.width - 0.5));
      const y = Math.max(-0.5, Math.min(0.5, (clientY - rect.top) / rect.height - 0.5));
      card.dataset.active = "true";
      card.style.setProperty("--card-rotate-x", `${-y * 26}deg`);
      card.style.setProperty("--card-rotate-y", `${x * 34}deg`);
      card.style.setProperty("--card-shift-x", `${x * 12}px`);
      card.style.setProperty("--card-shift-y", `${y * 9}px`);
      card.style.setProperty("--card-scale", "1.035");
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (!bounds) measure();
      if (!frame) frame = requestAnimationFrame(updateCard);
    };
    const invalidateBounds = () => { bounds = null; };
    const resizeObserver = sceneRef.current ? new ResizeObserver(invalidateBounds) : null;
    if (sceneRef.current) resizeObserver?.observe(sceneRef.current);

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", invalidateBounds, { passive: true });
    window.addEventListener("scroll", invalidateBounds, { passive: true });
    window.addEventListener("blur", resetCard);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", invalidateBounds);
      window.removeEventListener("scroll", invalidateBounds);
      window.removeEventListener("blur", resetCard);
      resizeObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={sceneRef} className="three-d-card-scene">
      <div
        ref={cardRef}
        data-active="false"
        className={`three-d-card ${className}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}

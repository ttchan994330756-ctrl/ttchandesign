// @ts-nocheck
import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import "./WarpText.css";

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  vec2 drift = vec2(time * 0.055, -time * 0.045);
  vec2 ambient = (vec2(
    noise(uv * 3.6 + drift),
    noise((uv + 11.3) * 4.1 - drift.yx)
  ) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float distanceToPointer = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float lens = smoothstep(radius, 0.0, distanceToPointer) * uPointerActive;
  float bulge = distanceToPointer < radius
    ? (distanceToPointer / radius) * (1.0 - distanceToPointer / radius) * 6.5 * uPointerActive
    : 0.0;
  vec2 direction = distanceToPointer > 0.0001
    ? vec2(aspectDelta.x / aspect, aspectDelta.y) / distanceToPointer
    : vec2(0.0);
  float rippleWave = sin(distanceToPointer * 28.0 - time * 4.2) * 0.5 + 0.5;
  vec2 pointerWarp = -direction * bulge * uPointerStrength * 0.045;
  pointerWarp += direction * (rippleWave - 0.5) * uRipple * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDirection = ambient + pointerWarp;
  float splitLength = length(splitDirection);
  splitDirection = splitLength > 0.00001 ? splitDirection / splitLength : vec2(0.7071);
  vec2 split = splitDirection * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec4 base = sampleText(displaced);
  float red = sampleText(displaced + split).r;
  float blue = sampleText(displaced - split).b;
  float alpha = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);
  vec3 color = vec3(red, base.g, blue) + lens * base.a * 0.055;
  fragColor = vec4(color, alpha);
}`;

const PADDING = 14;

function drawTextTexture(container: HTMLElement, width: number, height: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * dpr));
  canvas.height = Math.max(1, Math.ceil(height * dpr));
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  container.querySelectorAll<HTMLElement>("[data-warp-text]").forEach((source) => {
    const text = source.textContent ?? "";
    if (!text) return;
    const style = window.getComputedStyle(source);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.fontKerning = "normal";
    if ("letterSpacing" in context) context.letterSpacing = style.letterSpacing;
    const metrics = context.measureText(text);
    const inkHeight = (metrics.actualBoundingBoxAscent || parseFloat(style.fontSize))
      + (metrics.actualBoundingBoxDescent || 0);
    // offset* values intentionally ignore the parent reveal transform. Using
    // getBoundingClientRect here rasterizes the compressed entry state and
    // causes the canvas text to overlap when the title returns to full scale.
    const top = source.offsetTop + PADDING;
    const left = source.offsetLeft + PADDING;
    const baseline = top + (source.offsetHeight - inkHeight) / 2 + (metrics.actualBoundingBoxAscent || 0);
    context.fillText(text, left, baseline);
  });

  return canvas;
}

type WarpTextProps = {
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
  warpStrength?: number;
  speed?: number;
  pointerInfluence?: number;
  pointerStrength?: number;
  refraction?: number;
  ripple?: boolean;
};

export default function WarpText({
  children,
  className = "",
  ariaLabel,
  warpStrength = 0.038,
  speed = 0.44,
  pointerInfluence = 1.35,
  pointerStrength = 0.72,
  refraction = 0.022,
  ripple = true,
}: WarpTextProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    let gl;
    let texture;
    let geometry;
    let program;
    let mesh;
    let resizeObserver;
    let intersectionObserver;
    let raf = 0;
    let disposed = false;
    let contextLost = false;
    let visible = true;
    let pageVisible = !document.hidden;
    let reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let rasterVersion = 0;
    let pointerRect: { left: number; top: number; width: number; height: number } | null = null;

    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
      gl = renderer.gl;
    } catch (error) {
      console.warn("WarpText: WebGL could not be initialized.", error);
      return undefined;
    }

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.className = "warp-text-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.left = `${-PADDING}px`;
    canvas.style.top = `${-PADDING}px`;
    canvas.style.width = `calc(100% + ${PADDING * 2}px)`;
    canvas.style.height = `calc(100% + ${PADDING * 2}px)`;
    container.appendChild(canvas);

    texture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
    geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: texture },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uPointerActive: { value: 0 },
        uTime: { value: 0 },
        uWarpStrength: { value: warpStrength },
        uSpeed: { value: speed },
        uPointerInfluence: { value: pointerInfluence },
        uPointerStrength: { value: pointerStrength },
        uRefraction: { value: refraction },
        uRipple: { value: ripple ? 1 : 0 },
        uMotion: { value: reducedMotion ? 0 : 1 },
      },
    });
    mesh = new Mesh(gl, { geometry, program });

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    const startTime = performance.now();

    const renderOnce = () => {
      if (!disposed && !contextLost) renderer.render({ scene: mesh });
    };

    const rasterize = async () => {
      const version = ++rasterVersion;
      await document.fonts?.ready;
      if (disposed || contextLost || version !== rasterVersion) return;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      if (width <= 0 || height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      texture.image = drawTextTexture(container, width + PADDING * 2, height + PADDING * 2, dpr);
      texture.needsUpdate = true;
      container.dataset.warpReady = "true";
      renderOnce();
    };

    const resize = () => {
      if (disposed || contextLost) return;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      if (width <= 0 || height <= 0) return;
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(width + PADDING * 2, height + PADDING * 2);
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      pointerRect = null;
      void rasterize();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerRect) {
        const rect = container.getBoundingClientRect();
        pointerRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      }
      const rect = pointerRect;
      pointer.tx = Math.max(0, Math.min(1, (event.clientX - rect.left + PADDING) / (rect.width + PADDING * 2)));
      pointer.ty = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top + PADDING) / (rect.height + PADDING * 2)));
      pointer.activeTarget = 1;
    };
    const onPointerLeave = () => { pointer.activeTarget = 0; };
    const onScroll = () => { pointerRect = null; };
    const onContextLost = (event: Event) => { event.preventDefault(); contextLost = true; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => { pageVisible = !document.hidden; if (pageVisible && visible && !raf) raf = requestAnimationFrame(loop); };
    const onReducedMotion = (event: MediaQueryListEvent) => { reducedMotion = event.matches; program.uniforms.uMotion.value = reducedMotion ? 0 : 1; renderOnce(); };
    const loop = (now: number) => {
      if (disposed || contextLost) return;
      const elapsed = (now - startTime) * 0.001;
      const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
      const targetX = pointer.activeTarget ? pointer.tx : idleX;
      const targetY = pointer.activeTarget ? pointer.ty : idleY;
      const damping = pointer.activeTarget ? 0.12 : 0.035;
      pointer.x += (targetX - pointer.x) * damping;
      pointer.y += (targetY - pointer.y) * damping;
      pointer.active += ((pointer.activeTarget ? 1 : 0.18) - pointer.active) * 0.06;
      program.uniforms.uPointer.value[0] = pointer.x;
      program.uniforms.uPointer.value[1] = pointer.y;
      program.uniforms.uPointerActive.value = reducedMotion ? pointer.active * 0.35 : pointer.active;
      program.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    const tryStart = () => { if (visible && pageVisible && !raf) raf = requestAnimationFrame(loop); };
    const intersectionCallback = (entries: IntersectionObserverEntry[]) => { visible = entries[0]?.isIntersecting ?? true; if (visible) tryStart(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    intersectionObserver = new IntersectionObserver(intersectionCallback, { threshold: 0 });
    intersectionObserver.observe(container);
    container.addEventListener("pointermove", onPointerMove, { passive: true });
    container.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    document.addEventListener("visibilitychange", onVisibility);
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    mediaQuery?.addEventListener("change", onReducedMotion);
    resize();
    tryStart();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);
      mediaQuery?.removeEventListener("change", onReducedMotion);
      delete container.dataset.warpReady;
      try {
        if (!contextLost) gl.getExtension("WEBGL_lose_context")?.loseContext();
        texture?.destroy?.();
        geometry?.remove?.();
        program?.remove?.();
        if (canvas.parentNode === container) container.removeChild(canvas);
      } catch { /* WebGL context may already be gone. */ }
    };
  }, [pointerInfluence, pointerStrength, refraction, ripple, speed, warpStrength]);

  return (
    <h2 ref={containerRef} className={`warp-text ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </h2>
  );
}

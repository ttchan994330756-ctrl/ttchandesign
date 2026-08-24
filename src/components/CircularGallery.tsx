// @ts-nocheck
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";
import "./CircularGallery.css";

const lerp = (start, end, amount) => start + (end - start) * amount;

function createTextTexture(gl, text, font, color, ordinal) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  const ordinalText = String(ordinal).padStart(2, "0");
  const separator = "/";
  const ordinalWidth = context.measureText(ordinalText).width;
  const separatorWidth = context.measureText(separator).width;
  const titleWidth = context.measureText(text).width;
  const width = Math.ceil(ordinalWidth + separatorWidth + titleWidth) + 62;
  const size = Number(font.match(/(\d+)px/)?.[1] || 24);
  const height = Math.ceil(size * 1.35) + 20;
  canvas.width = width;
  canvas.height = height;
  context.font = font;
  context.textAlign = "left";
  context.textBaseline = "middle";
  let cursor = 14;
  context.fillStyle = "#ffffff";
  context.fillText(ordinalText, cursor, height / 2);
  cursor += ordinalWidth + 13;
  context.fillStyle = "rgba(255,255,255,.42)";
  context.fillText(separator, cursor, height / 2);
  cursor += separatorWidth + 13;
  context.fillStyle = color;
  context.fillText(text, cursor, height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width, height };
}

class GalleryTitle {
  constructor({ gl, plane, text, color, font, ordinal }) {
    this.plane = plane;
    const { texture, width, height } = createTextTexture(gl, text, font, color, ordinal);
    this.aspect = width / height;
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(gl, { geometry, program });
    this.mesh.setParent(plane);
    this.onResize();
  }

  onResize() {
    const textHeight = 0.22;
    const planeRatio = this.plane.scale.y / Math.max(this.plane.scale.x, 0.001);
    this.mesh.scale.set(textHeight * this.aspect * planeRatio, textHeight, 1);
    this.mesh.position.set(0, -0.5 - textHeight * 0.56, 0.02);
  }
}

class GalleryMedia {
  constructor({ geometry, gl, image, badge, item, index, ordinal, length, scene, screen, text, viewport, bend, textColor, borderRadius, font }) {
    Object.assign(this, { geometry, gl, image, badge, item, index, ordinal, length, scene, screen, text, viewport, bend, textColor, borderRadius, font });
    if (ordinal === 4 && !this.badge) this.badge = "/hero-projects/if-design-award.png";
    this.extra = 0;
    this.createShader();
    this.createMesh();
    this.onResize();
    this.title = new GalleryTitle({ gl, plane: this.plane, text, color: textColor, font, ordinal });
  }

  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
      minFilter: this.gl.LINEAR,
      magFilter: this.gl.LINEAR,
      wrapS: this.gl.CLAMP_TO_EDGE,
      wrapT: this.gl.CLAMP_TO_EDGE,
    });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) + cos(p.y * 2.0 + uTime)) * (0.08 + abs(uSpeed) * 0.42);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        uniform float uHover;
        varying vec2 vUv;
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);
          vec4 color = texture2D(tMap, uv);
          float distance = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.002, 0.002, distance);
          float edge = 1.0 - smoothstep(0.002, 0.018, abs(distance));
          float glow = 1.0 - smoothstep(0.0, 0.065, abs(distance));
          vec3 accent = vec3(0.255, 0.004, 0.965);
          vec3 hoverColor = mix(color.rgb, accent, glow * uHover * 0.28);
          hoverColor = mix(hoverColor, mix(accent, vec3(1.0), 0.16), edge * uHover);
          gl_FragColor = vec4(hoverColor, max(alpha, glow * uHover * 0.52));
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [1, 1] },
        uSpeed: { value: 0 },
        uTime: { value: Math.random() * 100 },
        uBorderRadius: { value: this.borderRadius },
        uHover: { value: 0 },
      },
    });
    const image = new Image();
    image.src = this.image;
    image.onload = () => {
      this.program.uniforms.uImageSizes.value = [image.naturalWidth, image.naturalHeight];
      if (!this.badge) {
        texture.image = image;
        return;
      }

      const badgeImage = new Image();
      let badgeApplied = false;
      const applyBadge = () => {
        if (badgeApplied || !badgeImage.naturalWidth) return;
        badgeApplied = true;
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const planeAspect = this.baseScaleX / Math.max(this.baseScaleY, 0.001);
        const imageAspect = canvas.width / canvas.height;
        let visibleX = 0;
        let visibleY = 0;
        let visibleWidth = canvas.width;
        let visibleHeight = canvas.height;
        if (imageAspect > planeAspect) {
          visibleWidth = canvas.height * planeAspect;
          visibleX = (canvas.width - visibleWidth) / 2;
        } else {
          visibleHeight = canvas.width / planeAspect;
          visibleY = (canvas.height - visibleHeight) / 2;
        }
        const unit = Math.min(visibleWidth, visibleHeight);
        const badgeAspect = badgeImage.naturalWidth / Math.max(badgeImage.naturalHeight, 1);
        let badgeHeight = unit * 0.18;
        let badgeWidth = badgeHeight * badgeAspect;
        const maxBadgeWidth = unit * 0.3;
        if (badgeWidth > maxBadgeWidth) {
          badgeWidth = maxBadgeWidth;
          badgeHeight = badgeWidth / badgeAspect;
        }
        const badgeMargin = Math.round(unit * 0.045);
        context.drawImage(
          badgeImage,
          visibleX + visibleWidth - badgeMargin - badgeWidth,
          visibleY + badgeMargin,
          badgeWidth,
          badgeHeight,
        );
        texture.image = canvas;
      };
      badgeImage.onload = applyBadge;
      badgeImage.onerror = () => { texture.image = image; };
      badgeImage.src = this.badge;
      if (badgeImage.complete) applyBadge();
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.hover = 0;
    this.hoverTarget = 0;
    this.neighbor = 0;
    this.neighborTarget = 0;
    this.push = 0;
    this.pushTarget = 0;
    this.plane.setParent(this.scene);
  }

  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    const scale = this.screen.height / 1500;
    this.baseScaleY = (this.viewport.height * (900 * scale)) / this.screen.height;
    this.baseScaleX = (this.viewport.width * (860 * scale)) / this.screen.width;
    this.plane.scale.y = this.baseScaleY;
    this.plane.scale.x = this.baseScaleX;
    this.program.uniforms.uPlaneSizes.value = [this.baseScaleX, this.baseScaleY];
    this.title?.onResize();
    this.padding = 1.35;
    this.width = this.baseScaleX + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }

  update(scroll, direction) {
    this.hover = lerp(this.hover, this.hoverTarget, this.hoverTarget ? 0.115 : 0.085);
    this.neighbor = lerp(this.neighbor, this.neighborTarget, this.neighborTarget ? 0.105 : 0.085);
    this.push = lerp(this.push, this.pushTarget, this.pushTarget ? 0.105 : 0.085);
    const hoverScale = 1 + this.hover * 0.18 + this.neighbor * 0.08;
    this.plane.scale.x = this.baseScaleX * hoverScale;
    this.plane.scale.y = this.baseScaleY * hoverScale;
    this.program.uniforms.uHover.value = this.hover;
    this.plane.renderOrder = this.hover > 0.02 ? 20 : 0;
    this.plane.position.x = this.x - scroll.current - this.extra + this.push * this.baseScaleX * 0.16;
    const x = this.plane.position.x;
    const halfWidth = this.viewport.width / 2;
    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const bend = Math.abs(this.bend);
      const radius = (halfWidth * halfWidth + bend * bend) / (2 * bend);
      const effectiveX = Math.min(Math.abs(x), halfWidth);
      const arc = radius - Math.sqrt(radius * radius - effectiveX * effectiveX);
      this.plane.position.y = this.bend > 0 ? -arc : arc;
      this.plane.rotation.z = (this.bend > 0 ? -1 : 1) * Math.sign(x) * Math.asin(effectiveX / radius);
    }
    this.plane.position.y += this.baseScaleY * (this.hover * 0.1 + this.neighbor * 0.035);
    this.plane.position.z = this.hover * 0.6;
    const speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = speed;
    const planeOffset = this.plane.scale.x / 2;
    const before = this.plane.position.x + planeOffset < -halfWidth;
    const after = this.plane.position.x - planeOffset > halfWidth;
    if (direction === "right" && before) this.extra -= this.widthTotal;
    if (direction === "left" && after) this.extra += this.widthTotal;
  }
}

class CircularGalleryApp {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.scroll = { ease: options.scrollEase, current: 0, target: 0, last: 0, position: 0 };
    this.isVisible = true;
    this.pageVisible = !document.hidden;
    this.hoverDirty = true;
    this.createRenderer();
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
    this.scene = new Transform();
    this.geometry = new Plane(this.gl, { heightSegments: 32, widthSegments: 64 });
    this.onResize();
    const sourceLength = options.items.length;
    const items = options.items.concat(options.items);
    this.medias = items.map((item, index) => new GalleryMedia({ geometry: this.geometry, gl: this.gl, image: item.image, badge: item.badge, item, index, ordinal: (index % sourceLength) + 1, length: items.length, scene: this.scene, screen: this.screen, text: item.text, viewport: this.viewport, bend: options.bend, textColor: options.textColor, borderRadius: options.borderRadius, font: options.font }));
    this.bindEvents();
    this.update();
  }

  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }

  onResize = () => {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / Math.max(this.screen.height, 1) });
    const height = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    this.viewport = { width: height * this.camera.aspect, height };
    this.medias?.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
  };

  snap = () => {
    const width = this.medias?.[0]?.width;
    if (!width) return;
    this.scroll.target = Math.round(this.scroll.target / width) * width;
  };

  rememberPointer = event => {
    const rect = this.container.getBoundingClientRect();
    const clientX = event.clientX ?? event.touches?.[0]?.clientX;
    const clientY = event.clientY ?? event.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;
    this.pointer = {
      x: ((clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * this.viewport.width,
      y: (0.5 - (clientY - rect.top) / Math.max(rect.height, 1)) * this.viewport.height,
    };
    this.hoverDirty = true;
  };

  resolveHover = () => {
    let hovered = null;
    let closest = Infinity;
    if (this.pointer) {
      this.medias?.forEach(media => {
        const dx = this.pointer.x - media.plane.position.x;
        const dy = this.pointer.y - media.plane.position.y;
        const angle = media.plane.rotation.z;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const localX = cos * dx + sin * dy;
        const localY = -sin * dx + cos * dy;
        const halfX = media.plane.scale.x * 0.5;
        const halfY = media.plane.scale.y * 0.5;
        if (Math.abs(localX) <= halfX && Math.abs(localY) <= halfY) {
          const score = Math.abs(localX) / halfX + Math.abs(localY) / halfY;
          if (score < closest) {
            closest = score;
            hovered = media;
          }
        }
      });
    }
    const ordered = [...(this.medias || [])].sort((a, b) => a.plane.position.x - b.plane.position.x);
    const hoveredIndex = hovered ? ordered.indexOf(hovered) : -1;
    const leftNeighbor = hoveredIndex > 0 ? ordered[hoveredIndex - 1] : null;
    const rightNeighbor = hoveredIndex >= 0 && hoveredIndex < ordered.length - 1 ? ordered[hoveredIndex + 1] : null;
    this.hoveredMedia = hovered;
    if (!this.isDown) this.container.style.cursor = hovered && this.options.onItemClick ? "pointer" : "grab";
    this.medias?.forEach(media => {
      media.hoverTarget = media === hovered ? 1 : 0;
      media.neighborTarget = media === leftNeighbor || media === rightNeighbor ? 1 : 0;
      media.pushTarget = hovered ? Math.sign(media.plane.position.x - hovered.plane.position.x) : 0;
    });
  };

  onPointerDown = event => {
    this.rememberPointer(event);
    this.resolveHover();
    this.pressedMedia = this.hoveredMedia;
    this.isDown = true;
    this.hasDragged = false;
    this.scroll.position = this.scroll.current;
    this.dragStartX = event.clientX ?? event.touches?.[0]?.clientX;
    this.startY = event.clientY ?? event.touches?.[0]?.clientY;
    this.container.style.cursor = "grabbing";
    this.container.setPointerCapture?.(event.pointerId);
  };
  onPointerMove = event => {
    this.rememberPointer(event);
    if (!this.isDown) return;
    const x = event.clientX ?? event.touches?.[0]?.clientX;
    const y = event.clientY ?? event.touches?.[0]?.clientY;
    if (Math.hypot(x - this.dragStartX, y - this.startY) > 7) this.hasDragged = true;
    this.scroll.target = this.scroll.position + (this.dragStartX - x) * (this.options.scrollSpeed * 0.025);
  };
  onPointerUp = event => {
    this.rememberPointer(event);
    const clickedMedia = !this.hasDragged ? this.pressedMedia : null;
    this.isDown = false;
    this.pressedMedia = null;
    this.resolveHover();
    this.container.releasePointerCapture?.(event.pointerId);
    this.container.style.cursor = clickedMedia && this.options.onItemClick ? "pointer" : "grab";
    this.snap();
    if (clickedMedia && this.options.onItemClick) {
      this.options.onItemClick({ item: clickedMedia.item, ordinal: clickedMedia.ordinal });
    }
  };
  onPointerCancel = () => {
    this.isDown = false;
    this.hasDragged = true;
    this.pressedMedia = null;
    this.container.style.cursor = "grab";
    this.snap();
  };
  onPointerLeave = () => {
    this.pointer = null;
    this.hoverDirty = true;
    this.resolveHover();
  };

  // The model/detail modal can sit above the gallery and swallow its
  // pointerleave event. Track the pointer at window level so a card cannot
  // remain enlarged after the modal closes.
  onWindowPointerMove = event => {
    if (this.isDown) return;
    const rect = this.container.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside && this.pointer) {
      this.pointer = null;
      this.hoverDirty = true;
      this.resolveHover();
    }
  };

  onWindowBlur = () => {
    this.pointer = null;
    this.hoverDirty = true;
    this.resolveHover();
  };
  onWheel = event => { event.preventDefault(); this.scroll.target += Math.sign(event.deltaY || event.deltaX) * this.options.scrollSpeed * 0.2; window.clearTimeout(this.snapTimer); this.snapTimer = window.setTimeout(this.snap, 160); };
  onKeyDown = event => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") this.scroll.target = 0;
    else this.scroll.target += (event.key === "ArrowRight" ? 1 : -1) * this.options.scrollSpeed * 5;
    this.snap();
  };

  bindEvents() {
    this.container.addEventListener("pointerdown", this.onPointerDown);
    this.container.addEventListener("pointermove", this.onPointerMove);
    this.container.addEventListener("pointerup", this.onPointerUp);
    this.container.addEventListener("pointercancel", this.onPointerCancel);
    this.container.addEventListener("pointerleave", this.onPointerLeave);
    this.container.addEventListener("wheel", this.onWheel, { passive: false });
    this.container.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("pointermove", this.onWindowPointerMove, { passive: true });
    window.addEventListener("blur", this.onWindowBlur);
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.isVisible = entry?.isIntersecting ?? true;
      if (this.isVisible) this.startLoop();
      else this.stopLoop();
    }, { threshold: 0 });
    this.visibilityObserver.observe(this.container);
    this.onVisibility = () => {
      this.pageVisible = !document.hidden;
      if (this.pageVisible && this.isVisible) this.startLoop();
      else this.stopLoop();
    };
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  startLoop = () => {
    if (!this.raf && this.isVisible && this.pageVisible) this.raf = requestAnimationFrame(this.update);
  };

  stopLoop = () => {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  update = () => {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias?.forEach(media => media.update(this.scroll, direction));
    if (this.hoverDirty || Math.abs(this.scroll.current - this.scroll.last) > 0.0001) {
      this.resolveHover();
      this.hoverDirty = false;
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = 0;
    this.startLoop();
  };

  destroy() {
    this.stopLoop();
    window.clearTimeout(this.snapTimer);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onWindowPointerMove);
    window.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.visibilityObserver?.disconnect();
    this.container.removeEventListener("pointerdown", this.onPointerDown);
    this.container.removeEventListener("pointermove", this.onPointerMove);
    this.container.removeEventListener("pointerup", this.onPointerUp);
    this.container.removeEventListener("pointercancel", this.onPointerCancel);
    this.container.removeEventListener("pointerleave", this.onPointerLeave);
    this.container.removeEventListener("wheel", this.onWheel);
    this.container.removeEventListener("keydown", this.onKeyDown);
    this.gl.canvas.remove();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

export default function CircularGallery({ items, bend = 2, textColor = "#ffffff", borderRadius = 0.08, font = '600 24px Inter, sans-serif', scrollSpeed = 2, scrollEase = 0.055, onItemClick }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current || !items?.length) return;
    const gallery = new CircularGalleryApp(containerRef.current, { items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick });
    return () => gallery.destroy();
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick]);
  return <div className="circular-gallery" ref={containerRef} tabIndex={0} role="region" aria-label="作品图片画廊，可拖拽或使用左右方向键浏览" />;
}

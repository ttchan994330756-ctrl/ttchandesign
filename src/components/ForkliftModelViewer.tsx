import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./ForkliftModelViewer.css";

type ForkliftModelViewerProps = {
  open: boolean;
  onClose: () => void;
};

function ForkliftScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const setViewRef = useRef<((view: "side" | "front") => void) | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let loadedModel: THREE.Object3D | null = null;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.rotateSpeed = 0.62;
    controls.zoomSpeed = 0.72;
    controls.autoRotate = false;

    scene.add(new THREE.HemisphereLight(0xf6f8ff, 0x27313e, 2.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
    keyLight.position.set(5, 8, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x90a9ff, 2.4);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);
    const frontLight = new THREE.DirectionalLight(0xffebe7, 1.7);
    frontLight.position.set(1, 2, 8);
    scene.add(frontLight);

    // Captured from the temporary calibration panel and used verbatim for the
    // initial view, reset action, and responsive resize.
    const calibratedDefaultCamera = new THREE.Vector3(6.7176, 1.4448, 7.0481);
    const calibratedDefaultTarget = new THREE.Vector3(0, 1.4482, 0);

    const setCamera = (model: THREE.Object3D, view: "default" | "side" | "front" = "default") => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const target = view === "default"
        ? calibratedDefaultTarget.clone()
        : new THREE.Vector3(center.x, box.min.y + size.y * 0.51, center.z);
      const fov = THREE.MathUtils.degToRad(camera.fov / 2);
      const verticalDistance = size.y / (2 * Math.tan(fov));
      const horizontalSize = Math.max(size.x, size.z);
      const horizontalDistance = horizontalSize / (2 * Math.tan(fov) * Math.max(camera.aspect, 0.72));
      const distance = Math.max(verticalDistance, horizontalDistance) * 1.145;
      const direction = {
        default: new THREE.Vector3(0, 0, 1),
        side: new THREE.Vector3(1.44, 0.32, 0.18),
        front: new THREE.Vector3(0.08, 0.28, 1.55),
      }[view].normalize();
      if (view === "default") camera.position.copy(calibratedDefaultCamera);
      else camera.position.copy(target).addScaledVector(direction, distance);
      const controlDistance = camera.position.distanceTo(target);
      camera.near = Math.max(0.01, controlDistance / 100);
      camera.far = controlDistance * 10;
      camera.updateProjectionMatrix();
      controls.target.copy(target);
      controls.minDistance = controlDistance * 0.58;
      controls.maxDistance = controlDistance * 1.65;
      controls.maxPolarAngle = Math.PI * 0.56;
      controls.update();
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    dracoLoader.preload();
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      "/models/forklift-optimized.glb",
      ({ scene: model }) => {
        if (disposed) return;
        const initialBox = new THREE.Box3().setFromObject(model);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const scale = 4.8 / Math.max(initialSize.x, initialSize.y, initialSize.z);
        model.scale.setScalar(scale);
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        model.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.frustumCulled = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.envMapIntensity = 0.7;
              material.needsUpdate = true;
            }
          });
        });
        loadedModel = model;
        scene.add(model);
        setCamera(model);
        controls.saveState();
        resetViewRef.current = () => {
          model.rotation.y = 0;
          // Clear OrbitControls' inertial delta before applying the captured
          // coordinates so reset cannot settle at a nearby angle.
          controls.enableDamping = false;
          controls.reset();
          setCamera(model);
          controls.update();
          controls.enableDamping = true;
          controls.saveState();
        };
        setViewRef.current = (view) => {
          model.rotation.y = 0;
          setCamera(model, view);
        };
        setProgress(100);
        setReady(true);
      },
      (event) => {
        if (!event.total || disposed) return;
        setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      },
      (error) => {
        console.error("Failed to load forklift model", error);
        if (!disposed) setFailed(true);
      },
    );

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (loadedModel) setCamera(loadedModel);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      resetViewRef.current = null;
      setViewRef.current = null;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      dracoLoader.dispose();
      if (loadedModel) {
        loadedModel.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) value.dispose();
            }
            material.dispose();
          });
        });
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`forklift-scene${ready ? " is-ready" : ""}`}>
      <div className="forklift-contact-shadow" aria-hidden="true" />
      <canvas ref={canvasRef} aria-label="可拖动旋转和缩放的欧能叉车三维模型" />
      {!ready && !failed && (
        <div className="forklift-loading" role="status" aria-live="polite">
          <span>LOADING 3D MODEL</span>
          <div><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
          <b>{progress}%</b>
        </div>
      )}
      {failed && <p className="forklift-error" role="alert">模型加载失败，请刷新后重试</p>}
      <div className="forklift-control-hits" aria-label="模型视角控制">
        <button className="forklift-control-hit forklift-control-reset" type="button" onClick={() => resetViewRef.current?.()} disabled={!ready} aria-label="复原模型视角" />
        <button className="forklift-control-hit forklift-control-side" type="button" onClick={() => setViewRef.current?.("side")} disabled={!ready} aria-label="查看模型侧视角" />
        <button className="forklift-control-hit forklift-control-front" type="button" onClick={() => setViewRef.current?.("front")} disabled={!ready} aria-label="查看模型正视角" />
      </div>
    </div>
  );
}

export default function ForkliftModelViewer({ open, onClose }: ForkliftModelViewerProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="model-viewer-backdrop" role="dialog" aria-modal="true" aria-label="欧能叉车设计展示页">
      <section className="model-viewer-panel">
        <img className="model-viewer-reference" src="/forklift-model-page.jpg" alt="欧能叉车设计模型展示页" draggable={false} />
        <span className="forklift-adoption-label">企业采纳产品</span>
        <ForkliftScene />
        <button className="model-viewer-close-hotspot" type="button" onClick={onClose} aria-label="关闭叉车设计展示页"><span aria-hidden="true" /></button>
      </section>
    </div>
  );
}

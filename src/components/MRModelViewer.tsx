import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import "./ForkliftModelViewer.css";
import "./MRModelViewer.css";

type MRModelViewerProps = {
  open: boolean;
  onClose: () => void;
};

function MRScene() {
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

    const calibratedDefaultCamera = new THREE.Vector3(0.4932, 4.6241, 10.7265);
    const calibratedDefaultTarget = new THREE.Vector3(0, 2.496, 0);
    const calibratedDefaultDistance = 10.9467;
    const calibratedFrontCamera = new THREE.Vector3(5.7503, 4.4023, 9.1176);
    const calibratedFrontTarget = new THREE.Vector3(0, 2.496, 0);
    const defaultOffset = calibratedDefaultCamera.clone().sub(calibratedDefaultTarget);
    const defaultAzimuth = Math.atan2(defaultOffset.x, defaultOffset.z);
    const defaultElevation = Math.asin(defaultOffset.y / calibratedDefaultDistance);

    const setCamera = (model: THREE.Object3D, view: "default" | "side" | "front" = "default") => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const target = view === "front" ? calibratedFrontTarget.clone() : calibratedDefaultTarget.clone();
      const fov = THREE.MathUtils.degToRad(camera.fov / 2);
      const verticalDistance = size.y / (2 * Math.tan(fov));
      const horizontalSize = Math.max(size.x, size.z);
      const horizontalDistance = horizontalSize / (2 * Math.tan(fov) * Math.max(camera.aspect, 0.72));
      const distance = Math.max(verticalDistance, horizontalDistance) * 1.18;
      const viewDistance = Math.max(distance, calibratedDefaultDistance);
      const viewAzimuth = view === "side" ? defaultAzimuth + Math.PI / 2 : defaultAzimuth;
      const direction = view === "default"
        ? defaultOffset.clone().normalize()
        : new THREE.Vector3(
          Math.sin(viewAzimuth) * Math.cos(defaultElevation),
          Math.sin(defaultElevation),
          Math.cos(viewAzimuth) * Math.cos(defaultElevation),
        );
      if (view === "default") camera.position.copy(calibratedDefaultCamera);
      else if (view === "front") camera.position.copy(calibratedFrontCamera);
      else camera.position.copy(target).addScaledVector(direction, viewDistance);
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

    const loader = new FBXLoader();
    loader.load(
      "/models/mr-scanner.fbx",
      (model) => {
        if (disposed) return;
        const initialBox = new THREE.Box3().setFromObject(model);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const scale = 4.8 / Math.max(initialSize.x, initialSize.y, initialSize.z);
        model.scale.setScalar(scale);
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        // Shift only the MR model within the existing canvas; the canvas,
        // camera framing, text, and control hit areas remain unchanged.
        const modelShiftX = -0.6;
        model.position.set(-scaledCenter.x + modelShiftX, -scaledBox.min.y, -scaledCenter.z);
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.frustumCulled = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
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
          model.rotation.set(0, 0, 0);
          controls.enableDamping = false;
          controls.reset();
          setCamera(model);
          controls.update();
          controls.enableDamping = true;
          controls.saveState();
        };
        setViewRef.current = (view) => {
          model.rotation.set(0, 0, 0);
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
        console.error("Failed to load MR scanner model", error);
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
      if (loadedModel) {
        loadedModel.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        });
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`forklift-scene mr-scene${ready ? " is-ready" : ""}`}>
      <div className="forklift-contact-shadow" aria-hidden="true" />
      <canvas ref={canvasRef} aria-label="可拖动旋转和缩放的 MR 扫描仪三维模型" />
      {!ready && !failed && (
        <div className="forklift-loading" role="status" aria-live="polite">
          <span>LOADING 3D MODEL</span>
          <div><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
          <b>{progress}%</b>
        </div>
      )}
      {failed && <p className="forklift-error" role="alert">模型加载失败，请检查 MR 扫描仪模型文件</p>}
      <div className="forklift-control-hits" aria-label="模型视角控制">
        <button className="forklift-control-hit forklift-control-reset" type="button" onClick={() => resetViewRef.current?.()} disabled={!ready} aria-label="复原模型视角" />
        <button className="forklift-control-hit forklift-control-side" type="button" onClick={() => setViewRef.current?.("side")} disabled={!ready} aria-label="查看模型侧视角" />
        <button className="forklift-control-hit forklift-control-front" type="button" onClick={() => setViewRef.current?.("front")} disabled={!ready} aria-label="查看模型正视角" />
      </div>
    </div>
  );
}

export default function MRModelViewer({ open, onClose }: MRModelViewerProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="model-viewer-backdrop" role="dialog" aria-modal="true" aria-label="MR 扫描仪设计展示页">
      <section className="model-viewer-panel mr-model-viewer-panel">
        <img className="model-viewer-reference" src="/mr-scanner-model-page.jpg" alt="TRACE 探迹博物馆文旅交互设计模型展示页" draggable={false} />
        <MRScene />
        <button className="model-viewer-close-hotspot" type="button" onClick={onClose} aria-label="关闭 MR 扫描仪展示页"><span aria-hidden="true" /></button>
      </section>
    </div>
  );
}

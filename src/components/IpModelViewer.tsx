import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import "./ForkliftModelViewer.css";
import "./IpModelViewer.css";

type IpModelViewerProps = {
  open: boolean;
  onClose: () => void;
};

function IpScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const setViewRef = useRef<((view: "side" | "front") => void) | null>(null);
  const switchModelRef = useRef<(() => void) | null>(null);
  const switchingRef = useRef(false);
  const modelVariantRef = useRef<"red" | "white">("red");
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [modelVariant, setModelVariant] = useState<"red" | "white">("red");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let loadedModel: THREE.Object3D | null = null;
    const modelOrbitTarget = new THREE.Vector3();
    let modelCenterReady = false;
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
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    dracoLoader.preload();

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

    const calibratedDefaultCamera = new THREE.Vector3(9.5882, 2.4274, 12.429);
    const calibratedDefaultTarget = new THREE.Vector3(6.2, 2.4, 0);
    const calibratedDefaultDistance = 12.8825;
    const calibratedFrontCamera = new THREE.Vector3(0, 2.2, 13.7);
    const calibratedFrontTarget = new THREE.Vector3(0, 2.2, 0);
    const defaultOffset = calibratedDefaultCamera.clone().sub(calibratedDefaultTarget);
    const defaultAzimuth = Math.atan2(defaultOffset.x, defaultOffset.z);
    const defaultElevation = Math.asin(defaultOffset.y / calibratedDefaultDistance);

    const setCamera = (model: THREE.Object3D, view: "default" | "side" | "front" = "default") => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      // Orbit around the model's world-space center, including its layout offset.
      // OrbitControls uses its target as both the look-at point and rotation
      // pivot. Always use the model's world-space center after loading so
      // free dragging rotates symmetrically around the product itself.
      const target = view === "front"
        ? calibratedFrontTarget.clone()
        : modelCenterReady
          ? modelOrbitTarget.clone()
          : calibratedDefaultTarget.clone();
      const fov = THREE.MathUtils.degToRad(camera.fov / 2);
      const verticalDistance = size.y / (2 * Math.tan(fov));
      const horizontalSize = Math.max(size.x, size.z);
      const horizontalDistance = horizontalSize / (2 * Math.tan(fov) * Math.max(camera.aspect, 0.72));
      const distance = Math.max(verticalDistance, horizontalDistance) * 1.2;
      const viewDistance = Math.max(distance, calibratedDefaultDistance);
      const viewAzimuth = view === "side" ? defaultAzimuth + Math.PI / 2 : defaultAzimuth;
      const direction = new THREE.Vector3(
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

    const attachModel = (model: THREE.Object3D) => {
      if (disposed) return;
      try {
        const initialBox = new THREE.Box3().setFromObject(model);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const scale = 4.8 / Math.max(initialSize.x, initialSize.y, initialSize.z, 0.0001);
        model.scale.setScalar(scale);
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        // Keep the IP figure centered inside the right-hand grid area.
        // Positive world X moves the figure left from this calibrated camera.
        const modelShiftX = 6.2;
        model.position.set(-scaledCenter.x + modelShiftX, -scaledBox.min.y, -scaledCenter.z);
        new THREE.Box3().setFromObject(model).getCenter(modelOrbitTarget);
        modelCenterReady = true;
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          // Some CAD exports contain mixed winding on thin shells. Keep both
          // sides visible so those surfaces do not disappear at oblique views.
          child.frustumCulled = false;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
              material.side = THREE.DoubleSide;
                material.envMapIntensity = 0.7;
              material.needsUpdate = true;
            }
          });
        });
        if (loadedModel) {
          scene.remove(loadedModel);
          loadedModel.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            child.geometry.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => material.dispose());
          });
        }
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
      } catch (error) {
        console.error("Failed to parse IP model", error);
        if (!disposed) setFailed(true);
      }
    };

    const parseModel = (buffer: ArrayBuffer, onComplete?: () => void) => {
      const loader = new GLTFLoader();
      loader.parse(buffer, "/models/", (gltf) => { attachModel(gltf.scene); onComplete?.(); }, (error) => {
        console.error("Failed to parse optimized IP model", error);
        if (!disposed) setFailed(true);
      });
    };

    const loadPreviewModel = (url: string) => new Promise<void>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(url, (gltf) => {
        attachModel(gltf.scene);
        resolve();
      }, undefined, reject);
    });

    const loadCompressedModel = async (url: string) => {
      // Large model archives are published as numbered chunks to keep each
      // static asset below hosting upload limits. A single-file URL remains
      // supported for local development and older deployments.
      const chunkUrls = [`${url}.part-0`, `${url}.part-1`];
      let responses = await Promise.all(chunkUrls.map((chunkUrl) => fetch(chunkUrl)));
      if (responses.some((response) => !response.ok)) responses = [await fetch(url)];
      const compressedParts: Uint8Array[] = [];
      let loaded = 0;
      let total = 0;
      for (const response of responses) {
        if (!response.ok) throw new Error(`Compressed IP model request failed: ${response.status}`);
        total += Number(response.headers.get("content-length")) || 0;
      }
      for (const response of responses) {
        const buffer = new Uint8Array(await response.arrayBuffer());
        compressedParts.push(buffer);
        loaded += buffer.byteLength;
        if (total) setProgress(Math.min(86, Math.round((loaded / total) * 86)));
      }
      const compressed = new Uint8Array(loaded);
      let offset = 0;
      compressedParts.forEach((part) => { compressed.set(part, offset); offset += part.byteLength; });
      if (!("DecompressionStream" in window)) throw new Error("DecompressionStream unavailable");
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).arrayBuffer();
    };

    const loadModel = async () => {
      try {
        // Draco preview assets avoid a second 60MB gzip decompression in the browser.
        await loadPreviewModel("/models/ip-red-orange-preview.glb");
      } catch (compressedError) {
        console.warn("Compressed IP preview unavailable; falling back to archived GLB", compressedError);
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        loader.load("/models/ip-red-orange.glb", (gltf) => attachModel(gltf.scene), (event) => {
          if (!event.total) return;
          setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }, (error) => {
          console.error("Failed to load IP model", error);
          if (!disposed) setFailed(true);
        });
      }
    };

    switchModelRef.current = async () => {
      if (switchingRef.current || disposed) return;
      switchingRef.current = true;
      setSwitching(true);
      setProgress(0);
      try {
        const nextVariant = modelVariantRef.current === "red" ? "white" : "red";
        const previewUrl = nextVariant === "white" ? "/models/ip-red-white-preview.glb" : "/models/ip-red-orange-preview.glb";
        await loadPreviewModel(previewUrl);
        modelVariantRef.current = nextVariant;
        setModelVariant(nextVariant);
      } catch (error) {
        console.error("Failed to switch IP model", error);
        // Keep the original archive as a last-resort fallback for older builds.
        try {
          const nextVariant = modelVariantRef.current === "red" ? "white" : "red";
          const buffer = await loadCompressedModel(nextVariant === "white" ? "/models/ip-red-white.glb.gz.bin" : "/models/ip-red-orange.glb.gz.bin");
          await new Promise<void>((resolve) => parseModel(buffer, resolve));
          modelVariantRef.current = nextVariant;
          setModelVariant(nextVariant);
        } catch (fallbackError) {
          console.error("Failed to switch IP model fallback", fallbackError);
          setFailed(true);
        }
      } finally {
        switchingRef.current = false;
        setSwitching(false);
      }
    };

    void loadModel();
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
      switchModelRef.current = null;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      if (loadedModel) {
        loadedModel.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
            material.dispose();
          });
        });
      }
      renderer.dispose();
      dracoLoader.dispose();
    };
  }, []);

  return (
    <div className={`forklift-scene ip-scene${ready ? " is-ready" : ""}`}>
      <canvas ref={canvasRef} aria-label="可拖动旋转和缩放的 TT-ROBOT 三维模型" />
      {!ready && !failed && (
        <div className="forklift-loading" role="status" aria-live="polite">
          <span>LOADING 3D MODEL</span><div><i style={{ transform: `scaleX(${progress / 100})` }} /></div><b>{progress}%</b>
        </div>
      )}
      {failed && <p className="forklift-error" role="alert">模型加载失败，请刷新后重试</p>}
      <div className="forklift-control-hits" aria-label="模型视角控制">
        <button className="forklift-control-hit forklift-control-reset" type="button" onClick={() => resetViewRef.current?.()} disabled={!ready} aria-label="复原模型视角" />
        <button className="forklift-control-hit forklift-control-side" type="button" onClick={() => setViewRef.current?.("side")} disabled={!ready} aria-label="查看模型侧视角" />
        <button className="forklift-control-hit forklift-control-front" type="button" onClick={() => setViewRef.current?.("front")} disabled={!ready} aria-label="查看模型正视角" />
      </div>
      <button
        className="ip-model-switch"
        type="button"
        onClick={() => switchModelRef.current?.()}
        disabled={!ready || switching}
        aria-label={modelVariant === "red" ? "切换红白配色模型" : "切换红橙配色模型"}
        title={modelVariant === "red" ? "切换红白配色" : "切换红橙配色"}
      ><span className="ip-model-switch-label">切换</span></button>
    </div>
  );
}

export default function IpModelViewer({ open, onClose }: IpModelViewerProps) {
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
    <div className="model-viewer-backdrop" role="dialog" aria-modal="true" aria-label="TT-ROBOT IP 形象设计展示页">
      <section className="model-viewer-panel ip-model-viewer-panel">
        <img className="model-viewer-reference" src="/ip-model-page.jpg" alt="TT-ROBOT IP 形象设计展示页" draggable={false} />
        <IpScene />
        <button className="model-viewer-close-hotspot" type="button" onClick={onClose} aria-label="关闭 TT-ROBOT IP 形象展示页"><span aria-hidden="true" /></button>
      </section>
    </div>
  );
}


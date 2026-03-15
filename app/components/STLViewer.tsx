"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export type ViewerModel = {
  id: string;
  name: string;
  file: File;
  scale: number;
  positionX: number;
  positionY: number;
  rotationZ: number;
};

type STLViewerProps = {
  models: ViewerModel[];
  selectedModelId: string | null;
  filamentColor: string;
  buildPlate: { width: number; depth: number };
  onSelectModel?: (modelId: string | null) => void;
  onModelPositionChange?: (payload: { modelId: string; positionX: number; positionY: number }) => void;
  onModelFootprintsChange?: (payload: Record<string, { width: number; depth: number; height: number }>) => void;
  onAnalysisChange?: (payload: {
    totalVolumeCm3: number;
    dimensionsMm: { width: number; depth: number; height: number };
  }) => void;
};

type ViewerEntry = {
  object: THREE.Object3D;
  baseVolumeCm3: number;
  boundsBox: THREE.Box3;
  boundsHelper: THREE.Box3Helper;
  dimensionSprite: THREE.Sprite;
};

const computeGeometryVolumeCm3 = (geometry: THREE.BufferGeometry): number => {
  const position = geometry.getAttribute("position");
  if (!position) return 0;

  const getVertex = (vertexIndex: number, target: THREE.Vector3) => {
    target.set(
      position.getX(vertexIndex),
      position.getY(vertexIndex),
      position.getZ(vertexIndex)
    );
  };

  let signedVolume = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      getVertex(index.getX(i), a);
      getVertex(index.getX(i + 1), b);
      getVertex(index.getX(i + 2), c);
      signedVolume += a.dot(cross.copy(b).cross(c)) / 6;
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      getVertex(i, a);
      getVertex(i + 1, b);
      getVertex(i + 2, c);
      signedVolume += a.dot(cross.copy(b).cross(c)) / 6;
    }
  }

  return Math.abs(signedVolume) / 1000;
};

const createTextSprite = (
  text: string,
  options?: {
    fontSize?: number;
    paddingX?: number;
    paddingY?: number;
    textColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    scale?: { x: number; y: number };
  }
) => {
  const fontSize = options?.fontSize ?? 44;
  const paddingX = options?.paddingX ?? 18;
  const paddingY = options?.paddingY ?? 10;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    const fallback = new THREE.Sprite(new THREE.SpriteMaterial());
    return fallback;
  }

  context.font = `${fontSize}px sans-serif`;
  const metrics = context.measureText(text);
  canvas.width = Math.ceil(metrics.width + paddingX * 2);
  canvas.height = Math.ceil(fontSize + paddingY * 2);

  context.font = `${fontSize}px sans-serif`;
  context.textBaseline = "middle";
  context.textAlign = "center";

  if (options?.backgroundColor) {
    context.fillStyle = options.backgroundColor;
    context.beginPath();
    context.roundRect(0, 0, canvas.width, canvas.height, 14);
    context.fill();
  }

  if (options?.borderColor) {
    context.strokeStyle = options.borderColor;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 14);
    context.stroke();
  }

  context.fillStyle = options?.textColor ?? "#d9fbe8";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(
    options?.scale?.x ?? canvas.width * 0.12,
    options?.scale?.y ?? canvas.height * 0.12,
    1
  );
  sprite.renderOrder = 10;
  sprite.userData.labelText = text;
  return sprite;
};

const updateTextSprite = (
  sprite: THREE.Sprite,
  text: string,
  options?: Parameters<typeof createTextSprite>[1]
) => {
  if (sprite.userData.labelText === text) return;

  const next = createTextSprite(text, options);
  const nextMaterial = next.material as THREE.SpriteMaterial;
  const material = sprite.material as THREE.SpriteMaterial;

  material.map?.dispose();
  material.map = nextMaterial.map ?? null;
  material.needsUpdate = true;
  sprite.scale.copy(next.scale);
  sprite.userData.labelText = text;

  nextMaterial.dispose();
};

const createBuildPlate = (width: number, depth: number) => {
  const plateGroup = new THREE.Group();
  const halfW = width / 2;
  const halfD = depth / 2;

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.03,
      roughness: 0.96,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    })
  );
  plate.position.z = 0;
  plateGroup.add(plate);

  const minorPoints: THREE.Vector3[] = [];
  const mediumPoints: THREE.Vector3[] = [];
  const majorPoints: THREE.Vector3[] = [];

  const addLine = (target: THREE.Vector3[], start: THREE.Vector3, end: THREE.Vector3) => {
    target.push(start, end);
  };

  const startX = Math.ceil(-halfW / 10) * 10;
  const endX = Math.floor(halfW / 10) * 10;
  const startY = Math.ceil(-halfD / 10) * 10;
  const endY = Math.floor(halfD / 10) * 10;

  for (let x = startX; x <= endX; x += 10) {
    const target = x % 200 === 0 ? majorPoints : x % 50 === 0 ? mediumPoints : minorPoints;
    addLine(target, new THREE.Vector3(x, -halfD, 0.05), new THREE.Vector3(x, halfD, 0.05));
  }

  for (let y = startY; y <= endY; y += 10) {
    const target = y % 200 === 0 ? majorPoints : y % 50 === 0 ? mediumPoints : minorPoints;
    addLine(target, new THREE.Vector3(-halfW, y, 0.05), new THREE.Vector3(halfW, y, 0.05));
  }

  const minorLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(minorPoints),
    new THREE.LineBasicMaterial({ color: 0xd5dde7, transparent: true, opacity: 0.45 })
  );
  const mediumLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(mediumPoints),
    new THREE.LineBasicMaterial({ color: 0xc3cedb, transparent: true, opacity: 0.6 })
  );
  const majorLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(majorPoints),
    new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.82 })
  );

  plateGroup.add(minorLines, mediumLines, majorLines);

  for (let x = Math.ceil(-halfW / 50) * 50; x <= halfW; x += 50) {
    const label = createTextSprite(`${x}`, {
      fontSize: 28,
      textColor: "#6b7280",
      scale: { x: 12, y: 6 },
    });
    label.position.set(x, -halfD + 12, 0.3);
    plateGroup.add(label);
  }

  for (let y = Math.ceil(-halfD / 50) * 50; y <= halfD; y += 50) {
    const label = createTextSprite(`${y}`, {
      fontSize: 28,
      textColor: "#6b7280",
      scale: { x: 12, y: 6 },
    });
    label.position.set(-halfW + 12, y, 0.3);
    plateGroup.add(label);
  }

  const centerMarker = new THREE.Group();
  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(4, 5.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  centerRing.rotation.x = Math.PI / 2;
  centerMarker.add(centerRing);

  const markerPoints = [
    new THREE.Vector3(-8, 0, 0.2),
    new THREE.Vector3(8, 0, 0.2),
    new THREE.Vector3(0, -8, 0.2),
    new THREE.Vector3(0, 8, 0.2),
  ];
  const markerLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(markerPoints),
    new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.9 })
  );
  centerMarker.add(markerLines);
  plateGroup.add(centerMarker);

  return plateGroup;
};

const createAxisWidget = () => {
  const group = new THREE.Group();
  group.add(new THREE.AxesHelper(40));

  const xLabel = createTextSprite("X", {
    fontSize: 34,
    textColor: "#f87171",
    scale: { x: 8, y: 8 },
  });
  xLabel.position.set(48, 0, 0);

  const yLabel = createTextSprite("Y", {
    fontSize: 34,
    textColor: "#4ade80",
    scale: { x: 8, y: 8 },
  });
  yLabel.position.set(0, 48, 0);

  const zLabel = createTextSprite("Z", {
    fontSize: 34,
    textColor: "#60a5fa",
    scale: { x: 8, y: 8 },
  });
  zLabel.position.set(0, 0, 48);

  group.add(xLabel, yLabel, zLabel);
  return group;
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(new Error("Invalid model file buffer"));
    };
    reader.onerror = () => reject(new Error("Failed to read model file."));
    reader.readAsArrayBuffer(file);
  });
};

export default function STLViewer({
  models,
  selectedModelId,
  filamentColor,
  buildPlate,
  onSelectModel,
  onModelPositionChange,
  onModelFootprintsChange,
  onAnalysisChange,
}: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const axesSceneRef = useRef<THREE.Scene | null>(null);
  const axesCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelMapRef = useRef(
    new Map<string, ViewerEntry>()
  );
  const buildPlateRef = useRef<THREE.Object3D | null>(null);
  const buildPlateSizeRef = useRef(buildPlate);
  const filamentColorRef = useRef(filamentColor);
  const onSelectModelRef = useRef(onSelectModel);
  const onModelPositionChangeRef = useRef(onModelPositionChange);
  const onModelFootprintsChangeRef = useRef(onModelFootprintsChange);
  const dragStateRef = useRef<{
    modelId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    filamentColorRef.current = filamentColor;
  }, [filamentColor]);

  useEffect(() => {
    buildPlateSizeRef.current = buildPlate;
  }, [buildPlate]);

  useEffect(() => {
    onSelectModelRef.current = onSelectModel;
  }, [onSelectModel]);

  useEffect(() => {
    onModelPositionChangeRef.current = onModelPositionChange;
  }, [onModelPositionChange]);

  useEffect(() => {
    onModelFootprintsChangeRef.current = onModelFootprintsChange;
  }, [onModelFootprintsChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    camera.up.set(0, 0, 1);
    camera.position.set(0, -300, 220);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planePoint = new THREE.Vector3();
    const snapStep = 1;

    renderer.domElement.style.cursor = "grab";

    const findModelIdFromObject = (object: THREE.Object3D | null): string | null => {
      let current: THREE.Object3D | null = object;
      while (current) {
        if (typeof current.userData.modelId === "string") {
          return current.userData.modelId;
        }
        current = current.parent;
      }
      return null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!cameraRef.current || event.button !== 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, cameraRef.current);

      const clickableObjects: THREE.Object3D[] = [];
      modelMapRef.current.forEach(({ object }) => {
        clickableObjects.push(object);
      });

      const intersections = raycaster.intersectObjects(clickableObjects, true);
      if (intersections.length === 0) return;

      const selectedId = findModelIdFromObject(intersections[0].object);
      if (selectedId && onSelectModelRef.current) {
        onSelectModelRef.current(selectedId);
      }

      if (!selectedId) return;

      const entry = modelMapRef.current.get(selectedId);
      if (!entry) return;

      dragStateRef.current = {
        modelId: selectedId,
        offsetX: intersections[0].point.x - entry.object.position.x,
        offsetY: intersections[0].point.y - entry.object.position.y,
      };

      controls.enabled = false;
      renderer.domElement.style.cursor = "grabbing";
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!cameraRef.current || !dragStateRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cameraRef.current);

      if (!raycaster.ray.intersectPlane(dragPlane, planePoint)) return;

      const { modelId, offsetX, offsetY } = dragStateRef.current;
      const entry = modelMapRef.current.get(modelId);
      if (!entry) return;

      const { width, depth } = buildPlateSizeRef.current;
      const halfW = width / 2;
      const halfD = depth / 2;

      const size = entry.boundsBox.getSize(new THREE.Vector3());
      const minX = -halfW + size.x / 2;
      const maxX = halfW - size.x / 2;
      const minY = -halfD + size.y / 2;
      const maxY = halfD - size.y / 2;

      const rawX = planePoint.x - offsetX;
      const rawY = planePoint.y - offsetY;
      const snappedX = Math.round(rawX / snapStep) * snapStep;
      const snappedY = Math.round(rawY / snapStep) * snapStep;

      const clampedX = THREE.MathUtils.clamp(snappedX, minX, maxX);
      const clampedY = THREE.MathUtils.clamp(snappedY, minY, maxY);

      entry.object.position.x = clampedX;
      entry.object.position.y = clampedY;
      entry.object.updateMatrixWorld(true);

      const movedBox = new THREE.Box3().setFromObject(entry.object);
      entry.boundsBox.copy(movedBox);
      entry.boundsHelper.box.copy(movedBox);
      const center = movedBox.getCenter(new THREE.Vector3());
      entry.dimensionSprite.position.set(center.x, center.y, movedBox.max.z + 18);

      if (onModelPositionChangeRef.current) {
        onModelPositionChangeRef.current({
          modelId,
          positionX: clampedX,
          positionY: clampedY,
        });
      }
    };

    const stopDragging = () => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(12, 18, 16);
    scene.add(directionalLight);
    const fillLight = new THREE.PointLight(0x93c5fd, 0.28, 1200);
    fillLight.position.set(-220, -180, 180);
    scene.add(fillLight);

    const plate = createBuildPlate(buildPlate.width, buildPlate.depth);
    scene.add(plate);
    buildPlateRef.current = plate;

    const axesScene = new THREE.Scene();
    axesScene.background = new THREE.Color(0xe2e8f0);
    axesScene.add(createAxisWidget());
    axesSceneRef.current = axesScene;

    const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    axesCamera.position.set(0, 0, 80);
    axesCamera.lookAt(0, 0, 0);
    axesCameraRef.current = axesCamera;

    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", resize);

    let rafId = 0;
    const renderLoop = () => {
      controls.update();

      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setViewport(0, 0, width, height);
      renderer.setScissorTest(false);
      renderer.render(scene, camera);

      if (axesSceneRef.current && axesCameraRef.current) {
        const inset = Math.floor(Math.min(width, height) * 0.22);
        const padding = 12;

        renderer.clearDepth();
        renderer.setScissorTest(true);
        renderer.setScissor(padding, padding, inset, inset);
        renderer.setViewport(padding, padding, inset, inset);

        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        axesCamera.position.copy(dir.multiplyScalar(-80));
        axesCamera.lookAt(0, 0, 0);
        renderer.render(axesSceneRef.current, axesCameraRef.current);
        renderer.setScissorTest(false);
      }

      rafId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      cancelAnimationFrame(rafId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (buildPlateRef.current) {
      sceneRef.current.remove(buildPlateRef.current);
    }

    const plate = createBuildPlate(buildPlate.width, buildPlate.depth);
    sceneRef.current.add(plate);
    buildPlateRef.current = plate;
  }, [buildPlate.width, buildPlate.depth]);

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const modelMap = modelMapRef.current;

    const removeModelById = (id: string) => {
      const entry = modelMap.get(id);
      if (!entry) return;
      scene.remove(entry.object);
      scene.remove(entry.boundsHelper);
      scene.remove(entry.dimensionSprite);
      (entry.boundsHelper.material as THREE.Material).dispose();
      (entry.dimensionSprite.material as THREE.SpriteMaterial).map?.dispose();
      (entry.dimensionSprite.material as THREE.Material).dispose();
      modelMap.delete(id);
    };

    const nextIds = new Set(models.map((m) => m.id));
    Array.from(modelMap.keys()).forEach((id) => {
      if (!nextIds.has(id)) removeModelById(id);
    });

    const applyTransformsAndAnalyze = () => {
      const halfW = buildPlate.width / 2;
      const halfD = buildPlate.depth / 2;
      const nextFootprints: Record<string, { width: number; depth: number; height: number }> = {};

      models.forEach((model) => {
        const entry = modelMap.get(model.id);
        if (!entry) return;
        const draggingModelId = dragStateRef.current?.modelId;

        const object = entry.object;
        object.scale.setScalar(model.scale);
        object.rotation.set(0, 0, (model.rotationZ * Math.PI) / 180);
        object.position.set(model.positionX, model.positionY, 0);
        object.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(object);
        object.position.z += -box.min.z;
        object.updateMatrixWorld(true);

        const groundedBox = new THREE.Box3().setFromObject(object);
        const size = groundedBox.getSize(new THREE.Vector3());
        const minX = -halfW + size.x / 2;
        const maxX = halfW - size.x / 2;
        const minY = -halfD + size.y / 2;
        const maxY = halfD - size.y / 2;
        object.position.x = THREE.MathUtils.clamp(object.position.x, minX, maxX);
        object.position.y = THREE.MathUtils.clamp(object.position.y, minY, maxY);
        object.updateMatrixWorld(true);

        const finalBox = new THREE.Box3().setFromObject(object);
        entry.boundsBox.copy(finalBox);
        entry.boundsHelper.box.copy(finalBox);

        const finalSize = finalBox.getSize(new THREE.Vector3());
        const finalCenter = finalBox.getCenter(new THREE.Vector3());
        nextFootprints[model.id] = {
          width: finalSize.x,
          depth: finalSize.y,
          height: finalSize.z,
        };
        entry.dimensionSprite.position.set(
          finalCenter.x,
          finalCenter.y,
          finalBox.max.z + 18
        );
        updateTextSprite(
          entry.dimensionSprite,
          `${Math.round(finalSize.x)}mm × ${Math.round(finalSize.y)}mm × ${Math.round(finalSize.z)}mm`,
          {
            fontSize: 30,
            paddingX: 18,
            paddingY: 8,
            textColor: "#d9fbe8",
            backgroundColor: "rgba(7,17,31,0.72)",
            borderColor: "rgba(52,211,153,0.35)",
            scale: { x: 34, y: 9 },
          }
        );

        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach((mat) => {
            if ("emissive" in mat) {
              const std = mat as THREE.MeshStandardMaterial;
              if (model.id === selectedModelId) {
                std.emissive.set(0x1f2937);
                std.emissiveIntensity = draggingModelId === model.id ? 0.5 : 0.35;
              } else {
                std.emissive.set(0x000000);
                std.emissiveIntensity = 0;
              }
            }
          });
        });

        const boxMaterial = entry.boundsHelper.material as THREE.LineBasicMaterial;
        boxMaterial.color.set(0x34d399);
        boxMaterial.transparent = true;
        boxMaterial.opacity = draggingModelId === model.id ? 1 : model.id === selectedModelId ? 0.95 : 0.45;
      });

      if (onModelFootprintsChangeRef.current) {
        onModelFootprintsChangeRef.current(nextFootprints);
      }

      const visibleObjects = models
        .map((m) => modelMap.get(m.id)?.object)
        .filter((obj): obj is THREE.Object3D => Boolean(obj));

      if (visibleObjects.length === 0) {
        if (onAnalysisChange) {
          onAnalysisChange({
            totalVolumeCm3: 0,
            dimensionsMm: { width: 0, depth: 0, height: 0 },
          });
        }
        camera.position.set(0, -300, 220);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        return;
      }

      const aggregateBox = new THREE.Box3();
      visibleObjects.forEach((obj, index) => {
        const box = new THREE.Box3().setFromObject(obj);
        if (index === 0) aggregateBox.copy(box);
        else aggregateBox.union(box);
      });

      let totalVolumeCm3 = 0;
      models.forEach((model) => {
        const entry = modelMap.get(model.id);
        if (!entry) return;
        totalVolumeCm3 += entry.baseVolumeCm3 * Math.pow(model.scale, 3);
      });

      if (onAnalysisChange) {
        const size = aggregateBox.getSize(new THREE.Vector3());
        onAnalysisChange({
          totalVolumeCm3,
          dimensionsMm: {
            width: size.x,
            depth: size.y,
            height: size.z,
          },
        });
      }

      const size = aggregateBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const fov = (camera.fov * Math.PI) / 180;
      const distance = (maxDim / 2) / Math.tan(fov / 2);

      camera.position.set(0, -Math.max(distance * 1.8, 260), Math.max(maxDim * 1.2, 200));
      camera.lookAt(0, 0, size.z / 2);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, size.z / 2);
      controls.update();
    };

    const loadMissingModels = async () => {
      for (let index = 0; index < models.length; index += 1) {
        const model = models[index];
        if (modelMap.has(model.id)) continue;

        try {
          const buffer = await readFileAsArrayBuffer(model.file);
          const ext = model.file.name.split(".").pop()?.toLowerCase();
          let object: THREE.Object3D;

          if (ext === "stl") {
            const geometry = new STLLoader().parse(buffer);
            geometry.computeVertexNormals();
            object = new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: filamentColorRef.current,
                metalness: 0.15,
                roughness: 0.65,
              })
            );
          } else if (ext === "obj") {
            const text = new TextDecoder().decode(buffer);
            object = new OBJLoader().parse(text);
            object.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: filamentColorRef.current,
                  metalness: 0.15,
                  roughness: 0.65,
                });
                child.geometry.computeVertexNormals();
              }
            });
          } else if (ext === "3mf") {
            object = new ThreeMFLoader().parse(buffer);
            object.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: filamentColorRef.current,
                  metalness: 0.15,
                  roughness: 0.65,
                });
                child.geometry.computeVertexNormals();
              }
            });
          } else {
            throw new Error("Unsupported model format");
          }

          object.position.set(index * 25, index * 25, 0);
          object.userData.modelId = model.id;
          object.traverse((child) => {
            child.userData.modelId = model.id;
          });
          scene.add(object);

          object.updateMatrixWorld(true);
          let baseVolumeCm3 = 0;
          object.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            if (!(child.geometry instanceof THREE.BufferGeometry)) return;
            const worldGeometry = child.geometry.clone();
            worldGeometry.applyMatrix4(child.matrixWorld);
            baseVolumeCm3 += computeGeometryVolumeCm3(worldGeometry);
            worldGeometry.dispose();
          });

          const boundsBox = new THREE.Box3().setFromObject(object);
          const boundsHelper = new THREE.Box3Helper(boundsBox, 0x34d399);
          (boundsHelper.material as THREE.LineBasicMaterial).transparent = true;
          (boundsHelper.material as THREE.LineBasicMaterial).opacity = 0.55;
          const dimensionSprite = createTextSprite("", {
            fontSize: 30,
            paddingX: 18,
            paddingY: 8,
            textColor: "#d9fbe8",
            backgroundColor: "rgba(7,17,31,0.72)",
            borderColor: "rgba(52,211,153,0.35)",
            scale: { x: 34, y: 9 },
          });

          scene.add(boundsHelper);
          scene.add(dimensionSprite);

          modelMap.set(model.id, {
            object,
            baseVolumeCm3,
            boundsBox,
            boundsHelper,
            dimensionSprite,
          });
        } catch (error) {
          console.error("Model parsing error:", error);
          alert(`Failed to process model: ${model.name}`);
        }
      }

      applyTransformsAndAnalyze();
    };

    void loadMissingModels();
    applyTransformsAndAnalyze();
  }, [models, selectedModelId, buildPlate.width, buildPlate.depth, onAnalysisChange]);

  useEffect(() => {
    if (modelMapRef.current.size === 0) return;

    modelMapRef.current.forEach(({ object }) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;

        const applyColor = (material: THREE.Material) => {
          if ("color" in material) {
            (material as THREE.MeshStandardMaterial).color.set(filamentColor);
            material.needsUpdate = true;
          }
        };

        if (Array.isArray(child.material)) {
          child.material.forEach(applyColor);
        } else {
          applyColor(child.material);
        }
      });
    });
  }, [filamentColor]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg border border-slate-300"
      style={{ width: "100%", height: "400px", background: "#f8fafc" }}
    />
  );
}

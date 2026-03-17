"use client";

import { useCallback, useEffect, useRef } from "react";
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
  simpleView?: boolean;
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

const BAMBU_A1_PLATE_MM = 256;
const CAMERA_HOME = new THREE.Vector3(200, 200, 200);

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

const createPeiTexture = () => {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = "#252a33";
  context.fillRect(0, 0, size, size);

  const cell = 32;
  context.strokeStyle = "rgba(255,255,255,0.07)";
  context.lineWidth = 1;

  for (let i = 0; i <= size; i += cell) {
    context.beginPath();
    context.moveTo(i + 0.5, 0);
    context.lineTo(i + 0.5, size);
    context.stroke();

    context.beginPath();
    context.moveTo(0, i + 0.5);
    context.lineTo(size, i + 0.5);
    context.stroke();
  }

  // Add subtle PEI grain for a more realistic plate surface.
  const noise = context.createImageData(size, size);
  for (let i = 0; i < noise.data.length; i += 4) {
    const value = 20 + Math.floor(Math.random() * 25);
    noise.data[i] = value;
    noise.data[i + 1] = value;
    noise.data[i + 2] = value;
    noise.data[i + 3] = 20;
  }
  context.putImageData(noise, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const clampModelWithinPlate = (
  object: THREE.Object3D,
  width: number,
  depth: number
) => {
  const rawBox = new THREE.Box3().setFromObject(object);
  const size = rawBox.getSize(new THREE.Vector3());
  const halfW = width / 2;
  const halfD = depth / 2;

  const fitsX = size.x <= width;
  const fitsY = size.y <= depth;

  if (!fitsX) {
    object.position.x = 0;
  } else {
    const minX = -halfW + size.x / 2;
    const maxX = halfW - size.x / 2;
    object.position.x = THREE.MathUtils.clamp(object.position.x, minX, maxX);
  }

  if (!fitsY) {
    object.position.y = 0;
  } else {
    const minY = -halfD + size.y / 2;
    const maxY = halfD - size.y / 2;
    object.position.y = THREE.MathUtils.clamp(object.position.y, minY, maxY);
  }

  object.updateMatrixWorld(true);
  return {
    box: new THREE.Box3().setFromObject(object),
    fits: fitsX && fitsY,
  };
};

const centerAndGroundObject = (object: THREE.Object3D) => {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.y -= center.y;
  object.position.z -= box.min.z;
  object.updateMatrixWorld(true);
};

const normalizeModelToBuildPlate = (
  object: THREE.Object3D,
  buildPlate: { width: number; depth: number }
) => {
  object.rotation.set(0, 0, 0);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);

  centerAndGroundObject(object);

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());

  const widthScale = size.x > 0 ? (buildPlate.width * 0.96) / size.x : 1;
  const depthScale = size.y > 0 ? (buildPlate.depth * 0.96) / size.y : 1;
  const fitScale = Math.min(widthScale, depthScale, 1);

  if (Number.isFinite(fitScale) && fitScale > 0 && fitScale < 1) {
    object.scale.multiplyScalar(fitScale);
    object.updateMatrixWorld(true);
    centerAndGroundObject(object);
  }

  return new THREE.Box3().setFromObject(object);
};

const createBuildPlate = (width: number, depth: number) => {
  const plateGroup = new THREE.Group();
  const halfW = width / 2;
  const halfD = depth / 2;

  const peiTexture = createPeiTexture();

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      color: 0x2b313b,
      map: peiTexture,
      metalness: 0.1,
      roughness: 0.92,
      side: THREE.DoubleSide,
    })
  );
  plate.position.z = 0;
  plate.receiveShadow = true;
  plateGroup.add(plate);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, depth)),
    new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 })
  );
  outline.position.z = 0.06;
  plateGroup.add(outline);

  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(width + 12, depth + 12, 3.5),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.2,
      roughness: 0.8,
      transparent: true,
      opacity: 0.95,
    })
  );
  skirt.position.z = -2;
  skirt.receiveShadow = true;
  plateGroup.add(skirt);

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
    new THREE.LineBasicMaterial({ color: 0xa3acb9, transparent: true, opacity: 0.18 })
  );
  const mediumLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(mediumPoints),
    new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.25 })
  );
  const majorLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(majorPoints),
    new THREE.LineBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.35 })
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
    new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
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
    new THREE.LineBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.85 })
  );
  centerMarker.add(markerLines);
  plateGroup.add(centerMarker);

  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(width, depth) * 0.42, 48),
    new THREE.ShadowMaterial({ opacity: 0.17 })
  );
  shadowCatcher.position.z = 0.01;
  shadowCatcher.receiveShadow = true;
  plateGroup.add(shadowCatcher);

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
  simpleView = false,
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
  const centeredModelIdsRef = useRef(new Set<string>());
  const normalizedModelIdsRef = useRef(new Set<string>());

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

  const updateBuildPlate = useCallback((_width: number, _depth: number) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const plateWidth = BAMBU_A1_PLATE_MM;
    const plateDepth = BAMBU_A1_PLATE_MM;

    if (buildPlateRef.current) {
      scene.remove(buildPlateRef.current);
      buildPlateRef.current.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }

        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (!material) return;

        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose());
        } else {
          material.dispose();
        }
      });
    }

    if (simpleView) {
      buildPlateRef.current = null;
      buildPlateSizeRef.current = { width: plateWidth, depth: plateDepth };
      return;
    }

    const plate = createBuildPlate(plateWidth, plateDepth);
    scene.add(plate);
    buildPlateRef.current = plate;
    buildPlateSizeRef.current = { width: plateWidth, depth: plateDepth };
  }, [simpleView]);

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
    camera.position.copy(CAMERA_HOME);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

      const rawX = planePoint.x - offsetX;
      const rawY = planePoint.y - offsetY;
      const snappedX = Math.round(rawX / snapStep) * snapStep;
      const snappedY = Math.round(rawY / snapStep) * snapStep;

      entry.object.position.x = snappedX;
      entry.object.position.y = snappedY;
      entry.object.updateMatrixWorld(true);

      const { box: movedBox } = clampModelWithinPlate(entry.object, width, depth);
      entry.boundsBox.copy(movedBox);
      entry.boundsHelper.box.copy(movedBox);
      const center = movedBox.getCenter(new THREE.Vector3());
      entry.dimensionSprite.position.set(center.x, center.y, movedBox.max.z + 18);

      if (onModelPositionChangeRef.current) {
        onModelPositionChangeRef.current({
          modelId,
          positionX: entry.object.position.x,
          positionY: entry.object.position.y,
        });
      }
    };

    const stopDragging = () => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = "grab";
    };

    if (!simpleView) {
      renderer.domElement.addEventListener("pointerdown", handlePointerDown);
      renderer.domElement.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopDragging);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0, 0);
    controls.minDistance = 120;
    controls.maxDistance = 900;
    controls.enableRotate = !simpleView;
    controls.enablePan = !simpleView;
    controls.enableZoom = !simpleView;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.12);
    directionalLight.position.set(190, 160, 260);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 800;
    directionalLight.shadow.camera.left = -260;
    directionalLight.shadow.camera.right = 260;
    directionalLight.shadow.camera.top = 260;
    directionalLight.shadow.camera.bottom = -260;
    directionalLight.shadow.bias = -0.00018;
    scene.add(directionalLight);
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.38);
    fillLight.position.set(-220, -80, 150);
    scene.add(fillLight);

    updateBuildPlate(buildPlate.width, buildPlate.depth);

    if (!simpleView) {
      const axesScene = new THREE.Scene();
      axesScene.background = new THREE.Color(0xe2e8f0);
      axesScene.add(createAxisWidget());
      axesSceneRef.current = axesScene;

      const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      axesCamera.position.set(0, 0, 80);
      axesCamera.lookAt(0, 0, 0);
      axesCameraRef.current = axesCamera;
    }

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

      if (!simpleView && axesSceneRef.current && axesCameraRef.current) {
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
      if (!simpleView) {
        renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
        renderer.domElement.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopDragging);
      }
      cancelAnimationFrame(rafId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [simpleView, updateBuildPlate]);

  useEffect(() => {
    updateBuildPlate(buildPlate.width, buildPlate.depth);
  }, [buildPlate.width, buildPlate.depth, updateBuildPlate]);

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
      const plateWidth = buildPlateSizeRef.current.width;
      const plateDepth = buildPlateSizeRef.current.depth;
      const nextFootprints: Record<string, { width: number; depth: number; height: number }> = {};

      models.forEach((model) => {
        const entry = modelMap.get(model.id);
        if (!entry) return;
        const draggingModelId = dragStateRef.current?.modelId;

        const object = entry.object;
        object.scale.setScalar(model.scale);
        object.rotation.set(0, 0, (model.rotationZ * Math.PI) / 180);

        const shouldAutoCenter =
          normalizedModelIdsRef.current.has(model.id) ||
          !centeredModelIdsRef.current.has(model.id) &&
          Math.abs(model.positionX) <= 35 &&
          Math.abs(model.positionY) <= 35;

        const nextX = shouldAutoCenter ? 0 : model.positionX;
        const nextY = shouldAutoCenter ? 0 : model.positionY;
        object.position.set(nextX, nextY, 0);
        object.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(object);
        object.position.z += -box.min.z;
        object.updateMatrixWorld(true);

        if (shouldAutoCenter) {
          normalizedModelIdsRef.current.delete(model.id);
          centeredModelIdsRef.current.add(model.id);
        }

        const { box: finalBox, fits } = clampModelWithinPlate(object, plateWidth, plateDepth);
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
                std.emissive.set(fits ? 0x1f2937 : 0x7f1d1d);
                std.emissiveIntensity = draggingModelId === model.id ? 0.5 : 0.35;
              } else {
                std.emissive.set(0x000000);
                std.emissiveIntensity = 0;
              }
            }
          });
        });

        const boxMaterial = entry.boundsHelper.material as THREE.LineBasicMaterial;
        boxMaterial.color.set(fits ? 0x34d399 : 0xef4444);
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
        camera.position.copy(CAMERA_HOME);
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

      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    };

    const loadMissingModels = async () => {
      for (const model of models) {
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

          const plateSize = buildPlateSizeRef.current;
          normalizeModelToBuildPlate(object, plateSize);
          normalizedModelIdsRef.current.add(model.id);
          object.userData.modelId = model.id;
          object.traverse((child) => {
            child.userData.modelId = model.id;
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(object);

          if (onModelPositionChangeRef.current) {
            onModelPositionChangeRef.current({
              modelId: model.id,
              positionX: 0,
              positionY: 0,
            });
          }

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
          boundsHelper.visible = !simpleView;
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
          dimensionSprite.visible = !simpleView;

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
  }, [models, selectedModelId, buildPlate.width, buildPlate.depth, onAnalysisChange, simpleView]);

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

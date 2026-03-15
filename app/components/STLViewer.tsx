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
  onAnalysisChange?: (payload: {
    totalVolumeCm3: number;
    dimensionsMm: { width: number; depth: number; height: number };
  }) => void;
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

const createBuildPlate = (width: number, depth: number) => {
  const plateGroup = new THREE.Group();

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.05,
      roughness: 0.95,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    })
  );
  plate.position.z = 0;
  plateGroup.add(plate);

  const gridSpacing = width <= 250 && depth <= 250 ? 10 : 20;
  const halfW = width / 2;
  const halfD = depth / 2;

  const gridPoints: THREE.Vector3[] = [];
  for (let x = -halfW; x <= halfW; x += gridSpacing) {
    gridPoints.push(new THREE.Vector3(x, -halfD, 0.01));
    gridPoints.push(new THREE.Vector3(x, halfD, 0.01));
  }
  for (let y = -halfD; y <= halfD; y += gridSpacing) {
    gridPoints.push(new THREE.Vector3(-halfW, y, 0.01));
    gridPoints.push(new THREE.Vector3(halfW, y, 0.01));
  }

  const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
  const gridLines = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({ color: 0x374151 })
  );
  plateGroup.add(gridLines);

  return plateGroup;
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
  onAnalysisChange,
}: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const axesSceneRef = useRef<THREE.Scene | null>(null);
  const axesCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelMapRef = useRef(
    new Map<string, { object: THREE.Object3D; baseVolumeCm3: number }>()
  );
  const buildPlateRef = useRef<THREE.Object3D | null>(null);
  const filamentColorRef = useRef(filamentColor);
  const onSelectModelRef = useRef(onSelectModel);

  useEffect(() => {
    filamentColorRef.current = filamentColor;
  }, [filamentColor]);

  useEffect(() => {
    onSelectModelRef.current = onSelectModel;
  }, [onSelectModel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
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
      if (!cameraRef.current) return;

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
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(12, 18, 10);
    scene.add(directionalLight);

    const plate = createBuildPlate(buildPlate.width, buildPlate.depth);
    scene.add(plate);
    buildPlateRef.current = plate;

    const axesScene = new THREE.Scene();
    axesScene.background = new THREE.Color(0x0f172a);
    axesScene.add(new THREE.AxesHelper(40));
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
      modelMap.delete(id);
    };

    const nextIds = new Set(models.map((m) => m.id));
    Array.from(modelMap.keys()).forEach((id) => {
      if (!nextIds.has(id)) removeModelById(id);
    });

    const applyTransformsAndAnalyze = () => {
      const halfW = buildPlate.width / 2;
      const halfD = buildPlate.depth / 2;

      models.forEach((model) => {
        const entry = modelMap.get(model.id);
        if (!entry) return;

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
                std.emissiveIntensity = 0.35;
              } else {
                std.emissive.set(0x000000);
                std.emissiveIntensity = 0;
              }
            }
          });
        });
      });

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

          modelMap.set(model.id, { object, baseVolumeCm3 });
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
      className="border border-gray-700 rounded-lg"
      style={{ width: "100%", height: "400px", background: "#111" }}
    />
  );
}

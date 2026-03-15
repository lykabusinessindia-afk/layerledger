"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type STLViewerProps = {
  file: File | null;
  filamentColor: string;
  buildPlate: { width: number; depth: number };
  onModelLoaded?: (
    volumeCm3: number,
    dimensionsMm: { width: number; depth: number; height: number }
  ) => void;
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
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0;
  plateGroup.add(plate);

  const gridSpacing = width <= 250 && depth <= 250 ? 10 : 20;
  const halfW = width / 2;
  const halfD = depth / 2;
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x374151 });

  const gridPoints: THREE.Vector3[] = [];
  for (let x = -halfW; x <= halfW; x += gridSpacing) {
    gridPoints.push(new THREE.Vector3(x, 0.01, -halfD));
    gridPoints.push(new THREE.Vector3(x, 0.01, halfD));
  }

  for (let z = -halfD; z <= halfD; z += gridSpacing) {
    gridPoints.push(new THREE.Vector3(-halfW, 0.01, z));
    gridPoints.push(new THREE.Vector3(halfW, 0.01, z));
  }

  const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
  const gridLines = new THREE.LineSegments(gridGeometry, lineMaterial);
  plateGroup.add(gridLines);

  return plateGroup;
};

const computeGeometryVolumeCm3 = (geometry: THREE.BufferGeometry): number => {
  const position = geometry.getAttribute("position");
  if (!position) {
    return 0;
  }

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

  const volumeMm3 = Math.abs(signedVolume);
  return volumeMm3 / 1000;
};

export default function STLViewer({ file, filamentColor, buildPlate, onModelLoaded }: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const axesSceneRef = useRef<THREE.Scene | null>(null);
  const axesCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const loadedObjectRef = useRef<THREE.Object3D | null>(null);
  const buildPlateRef = useRef<THREE.Object3D | null>(null);
  const filamentColorRef = useRef(filamentColor);

  useEffect(() => {
    filamentColorRef.current = filamentColor;
  }, [filamentColor]);

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
    camera.position.set(0, 100, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(12, 18, 10);
    scene.add(directionalLight);

    const buildPlateMesh = createBuildPlate(buildPlate.width, buildPlate.depth);
    scene.add(buildPlateMesh);
    buildPlateRef.current = buildPlateMesh;

    const axesScene = new THREE.Scene();
    axesScene.background = new THREE.Color(0x0f172a);
    const axesHelper = new THREE.AxesHelper(40);
    axesScene.add(axesHelper);
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
      cancelAnimationFrame(rafId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    if (buildPlateRef.current) {
      sceneRef.current.remove(buildPlateRef.current);
      buildPlateRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }

        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const nextPlate = createBuildPlate(buildPlate.width, buildPlate.depth);
    sceneRef.current.add(nextPlate);
    buildPlateRef.current = nextPlate;
  }, [buildPlate.width, buildPlate.depth]);

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !controlsRef.current) {
      return;
    }

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const removeLoadedObject = () => {
      if (loadedObjectRef.current) {
        scene.remove(loadedObjectRef.current);
        loadedObjectRef.current = null;
      }
    };

    if (!file) {
      removeLoadedObject();

      camera.position.set(0, 100, 200);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          throw new Error("Invalid model file buffer");
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        let modelObject: THREE.Object3D;

        if (ext === "stl") {
          const stlLoader = new STLLoader();
          const geometry = stlLoader.parse(result);
          geometry.computeVertexNormals();

          const material = new THREE.MeshStandardMaterial({
            color: filamentColorRef.current,
            metalness: 0.15,
            roughness: 0.65,
          });

          modelObject = new THREE.Mesh(geometry, material);
        } else if (ext === "obj") {
          const text = new TextDecoder().decode(result);
          const objLoader = new OBJLoader();
          modelObject = objLoader.parse(text);

          modelObject.traverse((child) => {
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
          const threeMFLoader = new ThreeMFLoader();
          modelObject = threeMFLoader.parse(result);

          modelObject.traverse((child) => {
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

        removeLoadedObject();

        const box = new THREE.Box3().setFromObject(modelObject);
        const center = box.getCenter(new THREE.Vector3());
        const minY = box.min.y;
        modelObject.position.x -= center.x;
        modelObject.position.y -= minY;
        modelObject.position.z -= center.z;

        scene.add(modelObject);
        loadedObjectRef.current = modelObject;

        modelObject.updateMatrixWorld(true);

        const size = box.getSize(new THREE.Vector3());
        let volumeCm3 = 0;

        modelObject.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;

          const geometry = child.geometry;
          if (!(geometry instanceof THREE.BufferGeometry)) return;

          const worldGeometry = geometry.clone();
          worldGeometry.applyMatrix4(child.matrixWorld);
          volumeCm3 += computeGeometryVolumeCm3(worldGeometry);
          worldGeometry.dispose();
        });

        if (onModelLoaded) {
          onModelLoaded(volumeCm3, {
            width: size.x,
            depth: size.y,
            height: size.z,
          });
        }

        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const fov = (camera.fov * Math.PI) / 180;
        const distance = (maxDim / 2) / Math.tan(fov / 2);

        camera.position.set(0, Math.max(maxDim * 0.6, 80), distance * 1.8);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.update();
      } catch (error) {
        console.error("Model parsing error:", error);
        alert("Failed to process 3D model.");
      }
    };

    reader.onerror = () => {
      alert("Failed to read model file.");
    };

    reader.readAsArrayBuffer(file);
  }, [file, onModelLoaded]);

  useEffect(() => {
    if (!loadedObjectRef.current) {
      return;
    }

    loadedObjectRef.current.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const applyColor = (material: THREE.Material) => {
        if ("color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(filamentColor);
          material.needsUpdate = true;
        }
      };

      if (Array.isArray(child.material)) {
        child.material.forEach(applyColor);
      } else if (child.material) {
        applyColor(child.material);
      }
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

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type STLViewerProps = {
  file: File | null;
  onModelLoaded?: (volumeCm3: number) => void;
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

export default function STLViewer({ file, onModelLoaded }: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

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
    rendererRef.current = renderer;
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

    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", resize);

    let rafId = 0;
    const renderLoop = () => {
      controls.update();
      renderer.render(scene, camera);
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
    if (!file || !sceneRef.current || !cameraRef.current || !controlsRef.current) {
      return;
    }

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          throw new Error("Invalid STL file buffer");
        }

        const loader = new STLLoader();
        const geometry = loader.parse(result);
        geometry.computeVertexNormals();

        const volumeCm3 = computeGeometryVolumeCm3(geometry);
        if (onModelLoaded) {
          onModelLoaded(volumeCm3);
        }

        scene.children
          .filter((child) => child.type === "Mesh")
          .forEach((mesh) => scene.remove(mesh));

        const material = new THREE.MeshStandardMaterial({
          color: 0x00ff88,
          metalness: 0.15,
          roughness: 0.65,
        });

        const mesh = new THREE.Mesh(geometry, material);

        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        mesh.position.sub(center);

        scene.add(mesh);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const fov = (camera.fov * Math.PI) / 180;
        const distance = (maxDim / 2) / Math.tan(fov / 2);

        camera.position.set(0, maxDim * 0.35, distance * 1.8);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.update();
      } catch (error) {
        console.error("STL parsing error:", error);
        alert("Failed to process STL model.");
      }
    };

    reader.onerror = () => {
      alert("Failed to read STL file.");
    };

    reader.readAsArrayBuffer(file);
  }, [file, onModelLoaded]);

  return (
    <div
      ref={containerRef}
      className="border border-gray-700 rounded-lg"
      style={{ width: "100%", height: "400px", background: "#111" }}
    />
  );
}

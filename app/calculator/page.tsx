"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import parse from "stl-parser";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function Calculator() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const { promptInstall } = useInstallPrompt();

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joining, setJoining] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [filamentUsed, setFilamentUsed] = useState("");
  const [filamentPricePerKg, setFilamentPricePerKg] = useState("");
  const [printTimeHours, setPrintTimeHours] = useState("");
  const [electricityRate, setElectricityRate] = useState("");
  const [machinePowerWatts, setMachinePowerWatts] = useState("");
  const [machineCostPerHour, setMachineCostPerHour] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [failureRate, setFailureRate] = useState("5");
  const [gstPercent, setGstPercent] = useState("0");
  const [profitMargin, setProfitMargin] = useState("30");

  // 3D Preview state
  const previewRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  const parseNumber = (value: string) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const computeVolume = (triangles: { vertices: [number[], number[], number[]] }[]) => {
    let volume = 0;
    for (const triangle of triangles) {
      const [A, B, C] = triangle.vertices;
      volume += (1/6) * (
        A[0] * (B[1] * C[2] - B[2] * C[1]) +
        A[1] * (B[2] * C[0] - B[0] * C[2]) +
        A[2] * (B[0] * C[1] - B[1] * C[0])
      );
    }
    return Math.abs(volume) / 1000; // Convert mm³ to cm³
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !['stl', 'obj', '3mf'].includes(ext)) {
      alert('Unsupported file format. Please upload STL, OBJ, or 3MF.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        let object: THREE.Object3D | null = null;
        let stlBuffer: Uint8Array | null = null;

        if (ext === 'stl') {
          stlBuffer = new Uint8Array(buffer);
          const loader = new STLLoader();
          const geometry = loader.parse(buffer);
          const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
          object = new THREE.Mesh(geometry, material);
        } else if (ext === 'obj') {
          const text = new TextDecoder().decode(buffer);
          const loader = new OBJLoader();
          object = loader.parse(text);

          // Convert to STL for volume calculation
          let mesh: THREE.Mesh | null = null;
          object.traverse((child) => {
            if (child instanceof THREE.Mesh && !mesh) {
              mesh = child;
            }
          });

          if (!mesh) {
            throw new Error('No mesh geometry found in uploaded model.');
          }

          const exporter = new STLExporter();
          const stlData = exporter.parse(mesh);
          stlBuffer = new TextEncoder().encode(stlData);
        } else if (ext === '3mf') {
          const loader = new ThreeMFLoader();
          object = loader.parse(buffer);

          // Convert to STL for volume calculation
          let mesh: THREE.Mesh | null = null;
          object.traverse((child) => {
            if (child instanceof THREE.Mesh && !mesh) {
              mesh = child;
            }
          });

          if (!mesh) {
            throw new Error('No mesh geometry found in uploaded model.');
          }

          const exporter = new STLExporter();
          const stlData = exporter.parse(mesh);
          stlBuffer = new TextEncoder().encode(stlData);
        }

        if (!object) {
          throw new Error('Unsupported model format');
        }

        if (!stlBuffer) {
          throw new Error('Failed to generate STL buffer');
        }

        // Parse STL for volume calculation
        const stl = parse(stlBuffer);
        const volumeCm3 = computeVolume(stl.triangles);
        const density = 1.25; // g/cm³ for PLA
        const grams = volumeCm3 * density;
        setFilamentUsed(grams.toFixed(2));

        // Estimate print time (simple formula: volume / 10 * layer height factor)
        const layerHeight = 0.2; // mm
        const printTimeHours = (volumeCm3 / 10) * (0.2 / layerHeight); // Simplified estimation
        setPrintTimeHours(printTimeHours.toFixed(2));

        // Add to 3D preview
        if (sceneRef.current) {
          // Clear previous model
          sceneRef.current.children.forEach(child => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
              sceneRef.current!.remove(child);
            }
          });

          // Add new model
          sceneRef.current.add(object);

          // Center and fit camera
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          object.position.sub(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = cameraRef.current!.fov * (Math.PI / 180);
          const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));

          cameraRef.current!.position.set(0, 0, cameraDistance * 1.5);
          cameraRef.current!.lookAt(0, 0, 0);

          if (controlsRef.current) {
            controlsRef.current.reset();
            controlsRef.current.update();
          }

          setModelLoaded(true);
        }
      } catch (error) {
        console.error('File processing error:', error);
        alert('Failed to process 3D model. Please upload a valid STL, OBJ, or 3MF file.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read model file.');
    };

    reader.readAsArrayBuffer(file);
  };

  const {
    filamentCost,
    electricityCost,
    machineCost,
    totalCost,
    adjustedCost,
    baseSellingPrice,
    gstAmount,
    sellingPrice,
    profitAmount,
  } = useMemo(() => {
    const filamentUsedNum = parseNumber(filamentUsed);
    const filamentPriceNum = parseNumber(filamentPricePerKg);
    const printHoursNum = parseNumber(printTimeHours);
    const electricityRateNum = parseNumber(electricityRate);
    const machinePowerNum = parseNumber(machinePowerWatts);
    const machineCostPerHourNum = parseNumber(machineCostPerHour);
    const packagingCostNum = parseNumber(packagingCost);
    const shippingCostNum = parseNumber(shippingCost);
    const failureRateNum = parseNumber(failureRate);
    const gstPercentNum = parseNumber(gstPercent);
    const profitMarginNum = parseNumber(profitMargin);

    const filamentCost = (filamentUsedNum / 1000) * filamentPriceNum;

    const electricityCost =
      (machinePowerNum / 1000) * printHoursNum * electricityRateNum;

    const machineCost = machineCostPerHourNum * printHoursNum;

    const totalCost =
      filamentCost +
      electricityCost +
      packagingCostNum +
      shippingCostNum +
      machineCost;

    const adjustedCost = totalCost * (1 + failureRateNum / 100);

    const baseSellingPrice =
      adjustedCost + (adjustedCost * profitMarginNum) / 100;

    const gstAmount = (baseSellingPrice * gstPercentNum) / 100;

    const sellingPrice = baseSellingPrice + gstAmount;

    const profitAmount = baseSellingPrice - adjustedCost;

    return {
      filamentCost,
      electricityCost,
      machineCost,
      totalCost,
      adjustedCost,
      baseSellingPrice,
      gstAmount,
      sellingPrice,
      profitAmount,
    };
  }, [
    filamentUsed,
    filamentPricePerKg,
    printTimeHours,
    electricityRate,
    machinePowerWatts,
    machineCostPerHour,
    packagingCost,
    shippingCost,
    failureRate,
    gstPercent,
    profitMargin,
  ]);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
      else setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  // Initialize 3D preview
  useEffect(() => {
    if (!previewRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, previewRef.current.clientWidth / previewRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(previewRef.current.clientWidth, previewRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    previewRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!previewRef.current) return;
      camera.aspect = previewRef.current.clientWidth / previewRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(previewRef.current.clientWidth, previewRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (previewRef.current && renderer.domElement) {
        previewRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);
  
  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) console.log("App installed");
  };
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const redirectToLyka = () => {
    window.open("https://www.lyka3dstudio.com", "_blank");
  };

  const handleWaitlist = async () => {
    if (!waitlistEmail) return alert("Enter email");

    setJoining(true);

    const { error } = await supabase
      .from("waitlist")
      .insert([{ email: waitlistEmail }]);

    setJoining(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("You're on the waitlist 🚀");
    setWaitlistEmail("");
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback) return alert("Enter feedback");

    setSubmittingFeedback(true);

    const { error } = await supabase
      .from("feedback")
      .insert([{ message: feedback }]);

    setSubmittingFeedback(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Thanks for feedback 🙌");
    setFeedback("");
  };
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="hidden md:flex justify-end gap-3 mb-6">

          <button
            onClick={handleInstall}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:scale-105 hover:shadow-green-500/40"
          >
            ⬇ Install App
          </button>

          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:scale-105"
          >
            Sign Out
          </button>

        </div>

        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            <span>Layer</span>
            <span className="text-green-400 ml-1">Ledger</span>
          </h1>

          <p className="text-lg md:text-2xl text-gray-300 mt-4 max-w-2xl mx-auto">
            Turn Every 3D Print Into{" "}
            <span className="text-green-500 font-semibold">
              Predictable Profit
            </span>
          </p>

          <p className="text-center text-sm text-gray-400 mt-2">
            Built by{" "}
            <a href="https://lyka3dstudio.com" className="underline">
              LYKA3DStudio
            </a>
          </p>

          <div className="mt-6 md:hidden">
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg text-sm font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* 3D MODEL PREVIEW */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="relative">
            <div
              ref={previewRef}
              id="model-preview"
              style={{ height: "400px", width: "100%", background: "#111", borderRadius: "10px" }}
              className="border border-gray-700"
            />
            {!modelLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg pointer-events-none">
                Upload a 3D model to preview
              </div>
            )}
          </div>
        </div>

        {/* STL UPLOAD */}
        <div className="mt-8 max-w-xl mx-auto">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Upload 3D Model (STL, OBJ, 3MF)
          </label>
          <input
            type="file"
            accept=".stl,.obj,.3mf"
            onChange={handleModelUpload}
            className="p-2 rounded bg-gray-800 text-white w-full"
          />
        </div>

        {/* INPUTS */}
        <div className="flex flex-col gap-4 max-w-xl mx-auto mt-10">

          <input
            type="number"
            min={0}
            placeholder="Filament Used (grams)"
            className="p-3 rounded bg-gray-800"
            value={filamentUsed}
            onChange={(e) => setFilamentUsed(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Filament Price per KG"
            className="p-3 rounded bg-gray-800"
            value={filamentPricePerKg}
            onChange={(e) => setFilamentPricePerKg(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Print Time (hours)"
            className="p-3 rounded bg-gray-800"
            value={printTimeHours}
            onChange={(e) => setPrintTimeHours(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Electricity Rate (per kWh)"
            className="p-3 rounded bg-gray-800"
            value={electricityRate}
            onChange={(e) => setElectricityRate(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Machine Power (Watts)"
            className="p-3 rounded bg-gray-800"
            value={machinePowerWatts}
            onChange={(e) => setMachinePowerWatts(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Machine Cost Per Hour"
            className="p-3 rounded bg-gray-800"
            value={machineCostPerHour}
            onChange={(e) => setMachineCostPerHour(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Packaging Cost"
            className="p-3 rounded bg-gray-800"
            value={packagingCost}
            onChange={(e) => setPackagingCost(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Shipping Cost"
            className="p-3 rounded bg-gray-800"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Failure Rate %"
            className="p-3 rounded bg-gray-800"
            value={failureRate}
            onChange={(e) => setFailureRate(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="Profit Margin %"
            className="p-3 rounded bg-gray-800"
            value={profitMargin}
            onChange={(e) => setProfitMargin(e.target.value.replace(/-/g, ""))}
          />
          <input
            type="number"
            min={0}
            placeholder="GST %"
            className="p-3 rounded bg-gray-800"
            value={gstPercent}
            onChange={(e) => setGstPercent(e.target.value.replace(/-/g, ""))}
          />

        </div>

        {/* COST BREAKDOWN */}
        <div className="mt-14 bg-gray-900 p-6 rounded-xl max-w-xl mx-auto shadow-lg">

          <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>

          <div className="space-y-2 text-gray-300">

            <div className="flex justify-between">
              <span>Filament Cost</span>
              <span>₹ {filamentCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Electricity Cost</span>
              <span>₹ {electricityCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Machine Cost</span>
              <span>₹ {machineCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Total Production Cost</span>
              <span>₹ {totalCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Adjusted Cost (w/ failure)</span>
              <span>₹ {adjustedCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-green-400">
              <span>Net Profit</span>
              <span>₹ {profitAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Selling Price (Excl. GST)</span>
              <span>₹ {baseSellingPrice.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-yellow-400">
              <span>GST Amount</span>
              <span>₹ {gstAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-gray-700 my-2"></div>

            <div className="flex justify-between text-green-500 font-bold text-lg">
              <span>Final Selling Price (Incl. GST)</span>
              <span>₹ {sellingPrice.toFixed(2)}</span>
            </div>

          </div>

        </div>
        {/* ORDER ON LYKA */}
<div className="mt-8 max-w-xl mx-auto">

  <button
    onClick={redirectToLyka}
    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition duration-300 shadow-lg hover:scale-105 hover:shadow-green-500/40"
  >
    🛒 Order This Print on LYKA 3D Studio
  </button>

</div>

        {/* COMING SOON */}
        <div className="mt-16 p-8 bg-gray-900 rounded-xl border border-gray-700 max-w-2xl mx-auto shadow-lg">

          <h2 className="text-2xl font-bold text-green-400 mb-4">
            🔥 LayerLedger Pro – Coming Soon
          </h2>

          <p className="text-gray-400 mb-4">
            Advanced tools built for serious 3D printing sellers.
          </p>

          <ul className="space-y-3 text-gray-300 mb-8 mt-6 text-sm md:text-base">
            <li>🚀 STL File Upload with Auto Cost Detection</li>
            <li>📦 Bulk Order Pricing Calculator</li>
            <li>📊 Monthly Profit & Revenue Dashboard</li>
            <li>💰 Filament Inventory & Cost Tracker</li>
            <li>🧾 GST Invoice Generator (PDF Export)</li>
            <li>🛒 Shopify Price Sync Integration</li>
            <li>📁 Save & Export Project History</li>
          </ul>

          <input
            type="email"
            placeholder="Enter your email"
            value={waitlistEmail}
            onChange={(e)=>setWaitlistEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-800"
          />

          <button
            onClick={handleWaitlist}
            className="mt-4 w-full bg-green-600 p-3 rounded-lg"
          >
            {joining ? "Joining..." : "Join Waitlist"}
          </button>

        </div>

        {/* FEEDBACK */}
        <div className="mt-12 p-6 bg-gray-900 rounded-xl border border-gray-700 max-w-xl mx-auto">

          <h3 className="text-lg font-semibold text-green-400 mb-3">
            💬 Share Your Feedback
          </h3>

          <textarea
            value={feedback}
            onChange={(e)=>setFeedback(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 min-h-[100px]"
          />

          <button
            onClick={handleFeedbackSubmit}
            className="mt-4 w-full bg-blue-600 p-3 rounded-lg"
          >
            {submittingFeedback ? "Submitting..." : "Submit Feedback"}
          </button>

        </div>

      </div>
    </div>
  );
}
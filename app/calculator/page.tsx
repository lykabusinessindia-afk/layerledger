"use client";
import { useMemo, useState, useEffect, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import STLViewer from "@/components/STLViewer";

type PrinterOption = {
  name: string;
  buildVolume: { width: number; depth: number; height: number };
};

const PRINTER_OPTIONS: PrinterOption[] = [
  { name: "Ender 3", buildVolume: { width: 220, depth: 220, height: 250 } },
  { name: "Ender 3 V3 SE", buildVolume: { width: 220, depth: 220, height: 250 } },
  { name: "Bambu Lab A1", buildVolume: { width: 256, depth: 256, height: 256 } },
  { name: "Bambu Lab A1 Mini", buildVolume: { width: 180, depth: 180, height: 180 } },
  { name: "Bambu Lab P1P", buildVolume: { width: 256, depth: 256, height: 256 } },
  { name: "Bambu Lab X1 Carbon", buildVolume: { width: 256, depth: 256, height: 256 } },
  { name: "Prusa MK4", buildVolume: { width: 250, depth: 210, height: 220 } },
  { name: "Creality K1", buildVolume: { width: 220, depth: 220, height: 250 } },
  { name: "Anycubic Kobra 2", buildVolume: { width: 220, depth: 220, height: 250 } },
  { name: "Elegoo Neptune 4", buildVolume: { width: 225, depth: 225, height: 265 } },
  { name: "Elegoo OrangeStorm Giga", buildVolume: { width: 800, depth: 800, height: 1000 } },
];

export default function Calculator() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const { promptInstall } = useInstallPrompt();

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joining, setJoining] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [filamentUsed, setFilamentUsed] = useState("");
  const [filamentPricePerKg, setFilamentPricePerKg] = useState("0");
  const [printTimeHours, setPrintTimeHours] = useState("");
  const [electricityRate, setElectricityRate] = useState("");
  const [machinePowerWatts, setMachinePowerWatts] = useState("");
  const [machineCostPerHour, setMachineCostPerHour] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [failureRate, setFailureRate] = useState("5");
  const [gstPercent, setGstPercent] = useState("0");
  const [profitMargin, setProfitMargin] = useState("30");
  const [filamentColor, setFilamentColor] = useState("#00ff88");
  const [selectedPrinter, setSelectedPrinter] = useState(PRINTER_OPTIONS[0].name);

  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelVolume, setModelVolume] = useState(0);
  const [estimatedPrintTime, setEstimatedPrintTime] = useState(0);
  const [modelFilamentUsed, setModelFilamentUsed] = useState(0);
  const [supportFilamentUsed, setSupportFilamentUsed] = useState(0);
  const [modelDimensions, setModelDimensions] = useState({
    width: 0,
    depth: 0,
    height: 0,
  });
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [showOwnershipWarning, setShowOwnershipWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseNumber = (value: string) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isSupportedModelFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext === "stl" || ext === "obj" || ext === "3mf";
  };

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!ownershipConfirmed) {
      setShowOwnershipWarning(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupportedModelFile(file)) {
      alert("Only STL, OBJ, and 3MF files are supported.");
      return;
    }

    setModelFile(file);
    setShowOwnershipWarning(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!ownershipConfirmed) {
      setShowOwnershipWarning(true);
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!isSupportedModelFile(file)) {
      alert("Only STL, OBJ, and 3MF files are supported.");
      return;
    }

    setModelFile(file);
    setShowOwnershipWarning(false);
  };

  const handleClearModel = () => {
    setModelFile(null);
    setModelVolume(0);
    setEstimatedPrintTime(0);
    setModelFilamentUsed(0);
    setSupportFilamentUsed(0);
    setModelDimensions({ width: 0, depth: 0, height: 0 });
    setFilamentUsed("0.00");
    setPrintTimeHours("0.00");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModelLoaded = useCallback((
    volumeCm3: number,
    dimensionsMm: { width: number; depth: number; height: number }
  ) => {
    setModelVolume(volumeCm3);
    setModelDimensions(dimensionsMm);

    const materialDensity = 1.24; // g/cm³ for PLA
    const modelGrams = volumeCm3 * materialDensity;

    // Default support estimation: 15% of model volume
    const supportVolumeCm3 = volumeCm3 * 0.15;
    const supportGrams = supportVolumeCm3 * materialDensity;

    const totalGrams = modelGrams + supportGrams;

    setModelFilamentUsed(modelGrams);
    setSupportFilamentUsed(supportGrams);
    setFilamentUsed(totalGrams.toFixed(2));

    // Estimate print time from volume and flow rate (default FDM flow: 12 mm³/s)
    const volumeMm3 = volumeCm3 * 1000;
    const flowRateMm3PerSecond = 12;
    const estimatedHours = volumeMm3 / flowRateMm3PerSecond / 3600;
    setEstimatedPrintTime(estimatedHours);
    setPrintTimeHours(estimatedHours.toFixed(2));
  }, []);

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

  const filamentMeters = useMemo(() => {
    const filamentUsedNum = parseNumber(filamentUsed);
    return filamentUsedNum / 2.98;
  }, [filamentUsed]);

  const instantPriceQuote = useMemo(() => {
    const packagingCostNum = parseNumber(packagingCost);
    const shippingCostNum = parseNumber(shippingCost);
    const productionCost =
      filamentCost +
      electricityCost +
      machineCost +
      packagingCostNum +
      shippingCostNum;

    return productionCost * 1.3;
  }, [
    filamentCost,
    electricityCost,
    machineCost,
    packagingCost,
    shippingCost,
  ]);

  const selectedPrinterDetails = useMemo(
    () => PRINTER_OPTIONS.find((printer) => printer.name === selectedPrinter) ?? PRINTER_OPTIONS[0],
    [selectedPrinter]
  );

  const modelHasDimensions =
    modelDimensions.width > 0 || modelDimensions.depth > 0 || modelDimensions.height > 0;

  const modelFitsSelectedPrinter =
    modelDimensions.width <= selectedPrinterDetails.buildVolume.width &&
    modelDimensions.depth <= selectedPrinterDetails.buildVolume.depth &&
    modelDimensions.height <= selectedPrinterDetails.buildVolume.height;

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
      else setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

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
          <STLViewer
            file={modelFile}
            filamentColor={filamentColor}
            buildPlate={{
              width: selectedPrinterDetails.buildVolume.width,
              depth: selectedPrinterDetails.buildVolume.depth,
            }}
            onModelLoaded={handleModelLoaded}
          />
        </div>

        {/* OWNERSHIP CONFIRMATION */}
        <div className="mt-8 max-w-xl mx-auto">
          <label className="flex items-start gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={ownershipConfirmed}
              onChange={(e) => {
                const checked = e.target.checked;
                setOwnershipConfirmed(checked);
                if (checked) {
                  setShowOwnershipWarning(false);
                }
              }}
              className="mt-0.5 h-4 w-4 accent-green-500"
            />
            <span>I confirm that I own this model or have permission to print it.</span>
          </label>
          {showOwnershipWarning && (
            <p className="mt-2 text-xs text-red-400">
              Please confirm model ownership before uploading.
            </p>
          )}
        </div>

        {/* STL UPLOAD */}
        <div className="mt-8 max-w-xl mx-auto">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              if (!ownershipConfirmed) {
                setShowOwnershipWarning(true);
              }
            }}
            style={{
              border: "2px dashed #00ff88",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
              opacity: ownershipConfirmed ? 1 : 0.6,
              cursor: ownershipConfirmed ? "pointer" : "not-allowed"
            }}
          >
            <p>Drag & Drop STL, OBJ, or 3MF file here</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.obj,.3mf"
              onChange={handleUpload}
              disabled={!ownershipConfirmed}
            />
            <button
              onClick={handleClearModel}
              className="mt-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 border border-gray-600"
            >
              Clear Model
            </button>
          </div>
        </div>

        {/* FILAMENT COLOR */}
        <div className="mt-6 max-w-xl mx-auto">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Filament Color
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name: "White", value: "#ffffff" },
              { name: "Black", value: "#000000" },
              { name: "Red", value: "#ef4444" },
              { name: "Blue", value: "#3b82f6" },
              { name: "Green", value: "#22c55e" },
              { name: "Yellow", value: "#eab308" },
              { name: "Orange", value: "#f97316" },
              { name: "Gray", value: "#9ca3af" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilamentColor(option.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 ${
                  filamentColor === option.value
                    ? "border-green-400 bg-green-900/30"
                    : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                }`}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full border border-gray-500"
                  style={{ backgroundColor: option.value }}
                />
                <span className="text-sm text-white">{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PRINTER COMPATIBILITY */}
        <div className="mt-8 bg-gray-900 p-5 rounded-xl max-w-xl mx-auto border border-gray-700">
          <label className="block text-sm font-medium mb-2 text-gray-300">Select Printer</label>
          <select
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white"
          >
            {PRINTER_OPTIONS.map((printer) => (
              <option key={printer.name} value={printer.name}>
                {printer.name} - {printer.buildVolume.width} × {printer.buildVolume.depth} × {printer.buildVolume.height} mm
              </option>
            ))}
          </select>

          <div className="mt-4 space-y-2 text-gray-300 text-sm">
            <div className="flex justify-between">
              <span>Model Dimensions</span>
              <span>
                {modelDimensions.width.toFixed(2)} × {modelDimensions.depth.toFixed(2)} × {modelDimensions.height.toFixed(2)} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span>Printer Build Volume</span>
              <span>
                {selectedPrinterDetails.buildVolume.width} × {selectedPrinterDetails.buildVolume.depth} × {selectedPrinterDetails.buildVolume.height} mm
              </span>
            </div>
            {!modelHasDimensions ? (
              <p className="text-yellow-400">Upload a model to check printer compatibility.</p>
            ) : modelFitsSelectedPrinter ? (
              <p className="text-green-400">✅ Model fits on this printer</p>
            ) : (
              <p className="text-yellow-400">⚠️ Model exceeds the printer build volume.</p>
            )}
          </div>
        </div>

        {/* MODEL ANALYSIS */}
        <div className="mt-8 bg-gray-900 p-5 rounded-xl max-w-xl mx-auto border border-gray-700">
          <h3 className="text-lg font-semibold text-green-400 mb-3">Model Analysis</h3>
          <div className="space-y-2 text-gray-300 text-sm">
            <div className="flex justify-between">
              <span>Model Volume (cm³)</span>
              <span>{modelVolume.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Filament Used (Model Only)</span>
              <span>{modelFilamentUsed.toFixed(2)} grams</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Support Material</span>
              <span>{supportFilamentUsed.toFixed(2)} grams</span>
            </div>
            <div className="flex justify-between">
              <span>Total Filament Used</span>
              <span>{filamentUsed || "0.00"} grams</span>
            </div>
            <div className="flex justify-between">
              <span>Filament Length (meters)</span>
              <span>{filamentMeters.toFixed(2)} meters</span>
            </div>
            <div className="flex justify-between">
              <span>Model Dimensions (mm)</span>
              <span>
                {modelDimensions.width.toFixed(2)} × {modelDimensions.depth.toFixed(2)} × {modelDimensions.height.toFixed(2)} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Print Time</span>
              <span>{estimatedPrintTime.toFixed(2)} hours</span>
            </div>
            <div className="flex justify-between">
              <span>Filament Cost</span>
              <span>₹ {filamentCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* INSTANT PRICE QUOTE */}
        <div className="mt-6 bg-green-900/30 border border-green-500/40 p-5 rounded-xl max-w-xl mx-auto text-center shadow-lg">
          <h3 className="text-lg font-semibold text-green-300">Instant Price Quote</h3>
          <p className="text-3xl font-extrabold text-green-400 mt-2">₹{instantPriceQuote.toFixed(2)}</p>
        </div>

        {/* INPUTS */}
        <div className="flex flex-col gap-4 max-w-xl mx-auto mt-10">

          <input
            type="number"
            min={0}
            step="any"
            placeholder="Filament Price per KG"
            className="p-3 rounded bg-gray-800"
            value={filamentPricePerKg}
            onChange={(e) => setFilamentPricePerKg(e.target.value)}
          />
          <input
            type="number"
            min={0}
            placeholder="Print Time (hours)"
            className="p-3 rounded bg-gray-800"
            value={printTimeHours}
            readOnly
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
            readOnly
          />
          <input
            type="number"
            min={0}
            placeholder="Profit Margin %"
            className="p-3 rounded bg-gray-800"
            value={profitMargin}
            readOnly
          />
          <input
            type="number"
            min={0}
            placeholder="GST %"
            className="p-3 rounded bg-gray-800"
            value={gstPercent}
            readOnly
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
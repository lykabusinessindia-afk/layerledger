"use client";
import { useMemo, useState, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { supabase } from "@/lib/supabase";
import STLViewer from "@/components/STLViewer";
import type { ViewerModel } from "@/app/components/STLViewer";

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

  const [models, setModels] = useState<ViewerModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
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

  const appendModels = (incomingFiles: File[]) => {
    const supported = incomingFiles.filter(isSupportedModelFile);
    const rejected = incomingFiles.length - supported.length;

    if (rejected > 0) {
      alert("Some files were skipped. Only STL, OBJ, and 3MF files are supported.");
    }

    if (supported.length === 0) {
      return;
    }

    const startOffset = models.length;
    const createdModels: ViewerModel[] = supported.map((file, index) => {
      const id = `${Date.now()}-${startOffset + index}-${Math.random().toString(36).slice(2, 8)}`;
      const offset = (startOffset + index) * 25;
      return {
        id,
        name: file.name,
        file,
        scale: 1,
        positionX: offset,
        positionY: offset,
        rotationZ: 0,
      };
    });

    setModels((prev) => [...prev, ...createdModels]);

    if (!selectedModelId) {
      setSelectedModelId(createdModels[0].id);
    }
  };

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!ownershipConfirmed) {
      setShowOwnershipWarning(true);
      return;
    }

    const files = e.target.files ? Array.from(e.target.files) : [];
    appendModels(files);
    setShowOwnershipWarning(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!ownershipConfirmed) {
      setShowOwnershipWarning(true);
      return;
    }

    const files = Array.from(e.dataTransfer.files ?? []);
    appendModels(files);
    setShowOwnershipWarning(false);
  };

  const handleClearModel = () => {
    setModels([]);
    setSelectedModelId(null);
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

  const handleAnalysisChange = useCallback((payload: {
    totalVolumeCm3: number;
    dimensionsMm: { width: number; depth: number; height: number };
  }) => {
    setModelVolume(payload.totalVolumeCm3);
    setModelDimensions(payload.dimensionsMm);

    const materialDensity = 1.24; // g/cm³ for PLA
    const modelGrams = payload.totalVolumeCm3 * materialDensity;

    // Default support estimation: 15% of model volume
    const supportVolumeCm3 = payload.totalVolumeCm3 * 0.15;
    const supportGrams = supportVolumeCm3 * materialDensity;

    const totalGrams = modelGrams + supportGrams;

    setModelFilamentUsed(modelGrams);
    setSupportFilamentUsed(supportGrams);
    setFilamentUsed(totalGrams.toFixed(2));

    // Estimate print time from volume and flow rate (default FDM flow: 12 mm³/s)
    const volumeMm3 = payload.totalVolumeCm3 * 1000;
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

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId]
  );

  const updateSelectedModel = (updater: (current: ViewerModel) => ViewerModel) => {
    if (!selectedModelId) return;

    const halfW = selectedPrinterDetails.buildVolume.width / 2;
    const halfD = selectedPrinterDetails.buildVolume.depth / 2;

    setModels((prev) =>
      prev.map((model) => {
        if (model.id !== selectedModelId) return model;
        const next = updater(model);
        return {
          ...next,
          positionX: Math.min(Math.max(next.positionX, -halfW), halfW),
          positionY: Math.min(Math.max(next.positionY, -halfD), halfD),
          scale: Math.min(Math.max(next.scale, 0.1), 3),
          rotationZ: Math.min(Math.max(next.rotationZ, -180), 180),
        };
      })
    );
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) console.log("App installed");
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

  const analysisCards = [
    {
      label: "Model Volume",
      value: `${modelVolume.toFixed(2)} cm³`,
    },
    {
      label: "Filament Usage",
      value: `${filamentUsed || "0.00"} g`,
    },
    {
      label: "Dimensions",
      value: `${modelDimensions.width.toFixed(2)} × ${modelDimensions.depth.toFixed(2)} × ${modelDimensions.height.toFixed(2)} mm`,
    },
    {
      label: "Print Time",
      value: `${estimatedPrintTime.toFixed(2)} hrs`,
    },
  ];

  const inputFields = [
    {
      label: "Filament Price per KG",
      value: filamentPricePerKg,
      readOnly: false,
      onChange: (value: string) => setFilamentPricePerKg(value),
    },
    {
      label: "Print Time (hours)",
      value: printTimeHours,
      readOnly: true,
      onChange: () => undefined,
    },
    {
      label: "Electricity Rate (per kWh)",
      value: electricityRate,
      readOnly: false,
      onChange: (value: string) => setElectricityRate(value.replace(/-/g, "")),
    },
    {
      label: "Machine Power (Watts)",
      value: machinePowerWatts,
      readOnly: false,
      onChange: (value: string) => setMachinePowerWatts(value.replace(/-/g, "")),
    },
    {
      label: "Machine Cost Per Hour",
      value: machineCostPerHour,
      readOnly: false,
      onChange: (value: string) => setMachineCostPerHour(value.replace(/-/g, "")),
    },
    {
      label: "Packaging Cost",
      value: packagingCost,
      readOnly: false,
      onChange: (value: string) => setPackagingCost(value.replace(/-/g, "")),
    },
    {
      label: "Shipping Cost",
      value: shippingCost,
      readOnly: false,
      onChange: (value: string) => setShippingCost(value.replace(/-/g, "")),
    },
    {
      label: "Failure Rate %",
      value: failureRate,
      readOnly: true,
      onChange: () => undefined,
    },
    {
      label: "Profit Margin %",
      value: profitMargin,
      readOnly: true,
      onChange: () => undefined,
    },
    {
      label: "GST %",
      value: gstPercent,
      readOnly: true,
      onChange: () => undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-green-300">Calculator Workspace</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Professional Print Pricing Dashboard</h1>
            <p className="mt-4 text-base leading-relaxed text-slate-300 md:text-lg">
              Use the left panel for uploads and printer setup, the center workspace for model preview, and the right panel for pricing analytics.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleInstall}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
            >
              Install App
            </button>
            <button
              onClick={redirectToLyka}
              className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(34,197,94,0.24)] transition-all duration-200 hover:scale-[1.02]"
            >
              Order on LYKA 3D Studio
            </button>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)_390px]">
        <aside className="space-y-6 xl:sticky xl:top-24">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Upload Model</h2>
            <p className="mt-2 text-sm text-slate-400">Drop STL, OBJ, or 3MF files and manage ownership confirmation.</p>

            <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-slate-300">
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
              <p className="mt-3 text-xs text-red-400">Please confirm model ownership before uploading.</p>
            )}

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => {
                if (!ownershipConfirmed) {
                  setShowOwnershipWarning(true);
                }
              }}
              className={`mt-4 rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200 ${
                ownershipConfirmed
                  ? "border-green-400/50 bg-green-500/5 shadow-[0_0_50px_rgba(34,197,94,0.08)]"
                  : "border-white/10 bg-white/5 opacity-70"
              }`}
            >
              <p className="text-sm font-semibold text-white">Drop files here</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.obj,.3mf"
                multiple
                onChange={handleUpload}
                disabled={!ownershipConfirmed}
                className="mt-3 block w-full text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
              />
            </div>

            <button
              onClick={handleClearModel}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
            >
              Clear Model
            </button>

            <div className="mt-5 border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Filament Color</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
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
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                      filamentColor === option.value
                        ? "border-green-400/40 bg-green-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="inline-block h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: option.value }} />
                    <span className="text-xs text-white">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Printer Selection</h2>
            <p className="mt-2 text-sm text-slate-400">Set the target printer and verify model fit against build volume.</p>

            <label className="mt-4 block text-sm font-medium text-slate-300">Selected Printer</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white"
            >
              {PRINTER_OPTIONS.map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.name} - {printer.buildVolume.width} × {printer.buildVolume.depth} × {printer.buildVolume.height} mm
                </option>
              ))}
            </select>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Model</span>
                <span className="text-right">{modelDimensions.width.toFixed(2)} × {modelDimensions.depth.toFixed(2)} × {modelDimensions.height.toFixed(2)} mm</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Build Volume</span>
                <span className="text-right">{selectedPrinterDetails.buildVolume.width} × {selectedPrinterDetails.buildVolume.depth} × {selectedPrinterDetails.buildVolume.height} mm</span>
              </div>
            </div>

            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                !modelHasDimensions
                  ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-300"
                  : modelFitsSelectedPrinter
                    ? "border-green-400/20 bg-green-500/10 text-green-300"
                    : "border-yellow-400/20 bg-yellow-500/10 text-yellow-300"
              }`}
            >
              {!modelHasDimensions
                ? "Upload a model to check printer compatibility."
                : modelFitsSelectedPrinter
                  ? "Model fits on this printer."
                  : "Model exceeds the selected printer build volume."}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-[26px] border border-white/10 bg-slate-950/75 p-4 shadow-[0_0_80px_rgba(34,197,94,0.08)] ring-1 ring-green-500/10 backdrop-blur-xl md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white md:text-2xl">3D Workspace Viewer</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Build Plate Preview</span>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-slate-900/70 p-3 shadow-[0_0_60px_rgba(34,197,94,0.06)] md:p-4">
              <STLViewer
                models={models}
                selectedModelId={selectedModelId}
                filamentColor={filamentColor}
                buildPlate={{
                  width: selectedPrinterDetails.buildVolume.width,
                  depth: selectedPrinterDetails.buildVolume.depth,
                }}
                onAnalysisChange={handleAnalysisChange}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Loaded Models</h3>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{models.length} total</span>
            </div>

            {models.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No models loaded yet.</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModelId(model.id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      selectedModelId === model.id
                        ? "border-green-400/40 bg-green-500/10 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            )}

            {selectedModel && (
              <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Scale ({Math.round(selectedModel.scale * 100)}%)</label>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    value={Math.round(selectedModel.scale * 100)}
                    onChange={(e) =>
                      updateSelectedModel((current) => ({
                        ...current,
                        scale: parseInt(e.target.value, 10) / 100,
                      }))
                    }
                    className="w-full accent-green-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Move X (mm)</label>
                    <input
                      type="number"
                      value={selectedModel.positionX.toFixed(2)}
                      onChange={(e) =>
                        updateSelectedModel((current) => ({
                          ...current,
                          positionX: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Move Y (mm)</label>
                    <input
                      type="number"
                      value={selectedModel.positionY.toFixed(2)}
                      onChange={(e) =>
                        updateSelectedModel((current) => ({
                          ...current,
                          positionY: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Rotate Z ({selectedModel.rotationZ.toFixed(0)} deg)</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={selectedModel.rotationZ}
                    onChange={(e) =>
                      updateSelectedModel((current) => ({
                        ...current,
                        rotationZ: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-green-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Model Analysis</h2>
            <div className="mt-4 space-y-3">
              {analysisCards.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/8 bg-slate-900/80 p-3.5">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-1.5 text-base font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-slate-900/80 p-3">
                <p className="text-xs text-slate-400">Model Filament</p>
                <p className="mt-1 text-sm font-semibold text-white">{modelFilamentUsed.toFixed(2)} g</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-900/80 p-3">
                <p className="text-xs text-slate-400">Support</p>
                <p className="mt-1 text-sm font-semibold text-white">{supportFilamentUsed.toFixed(2)} g</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-900/80 p-3">
                <p className="text-xs text-slate-400">Filament Length</p>
                <p className="mt-1 text-sm font-semibold text-white">{filamentMeters.toFixed(2)} m</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-900/80 p-3">
                <p className="text-xs text-slate-400">Filament Cost</p>
                <p className="mt-1 text-sm font-semibold text-white">₹ {filamentCost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-green-400/20 bg-gradient-to-br from-green-500/20 via-emerald-500/12 to-slate-950/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Instant Price Quote</h2>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-green-200/70">Estimated Quote</p>
              <p className="mt-3 text-4xl font-black text-white">₹{instantPriceQuote.toFixed(2)}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-[10px] text-green-100/70">Cost</p>
                <p className="mt-1 text-sm font-semibold text-white">₹ {totalCost.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-[10px] text-green-100/70">Profit</p>
                <p className="mt-1 text-sm font-semibold text-white">₹ {profitAmount.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-[10px] text-green-100/70">Final</p>
                <p className="mt-1 text-sm font-semibold text-white">₹ {sellingPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Cost Breakdown</h2>

            <div className="mt-4 space-y-2.5 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <span>Filament Cost</span>
                <span>₹ {filamentCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Electricity Cost</span>
                <span>₹ {electricityCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Machine Cost</span>
                <span>₹ {machineCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Total Production Cost</span>
                <span>₹ {totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Adjusted Cost (w/ failure)</span>
                <span>₹ {adjustedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3 text-green-300">
                <span>Net Profit</span>
                <span>₹ {profitAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Selling Price (Excl. GST)</span>
                <span>₹ {baseSellingPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3 text-yellow-300">
                <span>GST Amount</span>
                <span>₹ {gstAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-3 text-base font-bold text-white flex justify-between gap-3">
                <span>Final Selling Price</span>
                <span className="text-green-300">₹ {sellingPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {inputFields.map((field) => (
                <label key={field.label} className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">{field.label}</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-white ${
                      field.readOnly
                        ? "border-white/8 bg-white/5 text-slate-400"
                        : "border-white/10 bg-white/5"
                    }`}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    readOnly={field.readOnly}
                  />
                </label>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <h2 className="text-2xl font-bold tracking-tight text-white">LayerLedger Pro</h2>
          <p className="mt-3 text-slate-300">Advanced tools for higher-volume print businesses are on the way. Join the waitlist to hear when they launch.</p>

          <ul className="mt-6 space-y-3 text-sm text-slate-300 md:text-base">
            <li>STL upload with auto cost detection</li>
            <li>Bulk order pricing calculator</li>
            <li>Monthly profit and revenue dashboard</li>
            <li>Filament inventory and cost tracker</li>
            <li>GST invoice generator with PDF export</li>
            <li>Shopify price sync integration</li>
            <li>Saved project history and export tools</li>
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
            <button
              onClick={handleWaitlist}
              className="rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-green-500"
            >
              {joining ? "Joining..." : "Join Waitlist"}
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <h3 className="text-2xl font-bold tracking-tight text-white">Share Your Feedback</h3>
          <p className="mt-3 text-slate-300">Tell us what should improve next in the quoting workflow.</p>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="mt-6 min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
          />

          <button
            onClick={handleFeedbackSubmit}
            className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-blue-500"
          >
            {submittingFeedback ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </section>
    </div>
  );
}
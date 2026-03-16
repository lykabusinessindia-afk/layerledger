"use client";
import { useMemo, useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import STLViewer from "@/components/STLViewer";
import type { ViewerModel } from "@/components/STLViewer";

type PrinterOption = {
  name: string;
  buildVolume: { width: number; depth: number; height: number };
};

const PRINTER_OPTIONS: PrinterOption[] = [
  { name: "Ender 3", buildVolume: { width: 220, depth: 220, height: 250 } },
  { name: "Ender 3 V3 SE", buildVolume: { width: 220, depth: 220, height: 250 } },
  { name: "Ender 3 S1", buildVolume: { width: 220, depth: 220, height: 270 } },
  { name: "Ender 5 Plus", buildVolume: { width: 350, depth: 350, height: 400 } },

  { name: "CR-10", buildVolume: { width: 300, depth: 300, height: 400 } },
  { name: "CR-10 Smart Pro", buildVolume: { width: 300, depth: 300, height: 400 } },

  { name: "Bambu Lab A1", buildVolume: { width: 256, depth: 256, height: 256 } },
  { name: "Bambu Lab A1 Mini", buildVolume: { width: 180, depth: 180, height: 180 } },
  { name: "Bambu Lab P1P", buildVolume: { width: 256, depth: 256, height: 256 } },
  { name: "Bambu Lab P1S", buildVolume: { width: 256, depth: 256, height: 256 } },
  { name: "Bambu Lab X1 Carbon", buildVolume: { width: 256, depth: 256, height: 256 } },

  { name: "Prusa MK3S+", buildVolume: { width: 250, depth: 210, height: 210 } },
  { name: "Prusa MK4", buildVolume: { width: 250, depth: 210, height: 220 } },
  { name: "Prusa XL", buildVolume: { width: 360, depth: 360, height: 360 } },

  { name: "Creality K1", buildVolume: { width: 220, depth: 220, height: 250 } },

  { name: "Anycubic Kobra 2", buildVolume: { width: 220, depth: 220, height: 250 } },
  { name: "Anycubic Kobra Max", buildVolume: { width: 400, depth: 400, height: 450 } },

  { name: "Elegoo Neptune 3 Pro", buildVolume: { width: 225, depth: 225, height: 280 } },
  { name: "Elegoo Neptune 4", buildVolume: { width: 225, depth: 225, height: 265 } },
  { name: "Elegoo Neptune 4 Max", buildVolume: { width: 420, depth: 420, height: 480 } },

  { name: "Elegoo OrangeStorm Giga", buildVolume: { width: 800, depth: 800, height: 1000 } },
];

type PrinterProfile = {
  power: number;
  speed: number;
  machineCostPerHour: number;
};

const PRINTER_PROFILES: Record<string, PrinterProfile> = {
  "Ender 3": { power: 250, speed: 60, machineCostPerHour: 10 },
  "Ender 3 V3 SE": { power: 260, speed: 80, machineCostPerHour: 10 },
  "Ender 3 S1": { power: 270, speed: 80, machineCostPerHour: 12 },
  "Ender 5 Plus": { power: 350, speed: 60, machineCostPerHour: 15 },

  "CR-10": { power: 350, speed: 60, machineCostPerHour: 15 },
  "CR-10 Smart Pro": { power: 350, speed: 80, machineCostPerHour: 18 },

  "Bambu Lab A1": { power: 350, speed: 200, machineCostPerHour: 20 },
  "Bambu Lab A1 Mini": { power: 300, speed: 180, machineCostPerHour: 18 },
  "Bambu Lab P1P": { power: 350, speed: 300, machineCostPerHour: 25 },
  "Bambu Lab P1S": { power: 350, speed: 300, machineCostPerHour: 25 },
  "Bambu Lab X1 Carbon": { power: 350, speed: 300, machineCostPerHour: 30 },

  "Prusa MK3S+": { power: 250, speed: 60, machineCostPerHour: 15 },
  "Prusa MK4": { power: 280, speed: 80, machineCostPerHour: 18 },
  "Prusa XL": { power: 400, speed: 200, machineCostPerHour: 35 },

  "Creality K1": { power: 400, speed: 300, machineCostPerHour: 25 },

  "Anycubic Kobra 2": { power: 250, speed: 80, machineCostPerHour: 12 },
  "Anycubic Kobra Max": { power: 400, speed: 80, machineCostPerHour: 20 },

  "Elegoo Neptune 3 Pro": { power: 250, speed: 60, machineCostPerHour: 12 },
  "Elegoo Neptune 4": { power: 300, speed: 250, machineCostPerHour: 20 },
  "Elegoo Neptune 4 Max": { power: 400, speed: 250, machineCostPerHour: 25 },

  "Elegoo OrangeStorm Giga": { power: 600, speed: 250, machineCostPerHour: 40 },
};

// Slicer-style filament estimation constants
const WALLS_FACTOR = 0.35;          // shell / perimeter volume fraction
const DEFAULT_INFILL_PERCENTAGE = 0.22; // default infill (22 %)
const TOP_BOTTOM_FACTOR = 0.15;     // top and bottom solid layers
const SUPPORTS_FACTOR = 0.05;       // estimated support material
const SLICER_EFFICIENCY_FACTOR = 0.65; // extrusion path efficiency vs raw volume

type MaterialType = "PLA" | "PETG" | "ABS" | "TPU" | "ASA" | "PLA+";

const MATERIAL_LIBRARY: Record<
  MaterialType,
  {
    name: string;
    density: number;
    defaultSpeed: number;
    temperature: string;
    badgeClass: string;
  }
> = {
  PLA: {
    name: "PLA",
    density: 1.24,
    defaultSpeed: 60,
    temperature: "200-210 degC",
    badgeClass: "bg-green-500/20 text-green-300 border-green-400/30",
  },
  PETG: {
    name: "PETG",
    density: 1.27,
    defaultSpeed: 50,
    temperature: "230-250 degC",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
  },
  ABS: {
    name: "ABS",
    density: 1.04,
    defaultSpeed: 55,
    temperature: "230-260 degC",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  },
  TPU: {
    name: "TPU",
    density: 1.21,
    defaultSpeed: 35,
    temperature: "210-230 degC",
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-400/30",
  },
  ASA: {
    name: "ASA",
    density: 1.07,
    defaultSpeed: 50,
    temperature: "240-260 degC",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-400/30",
  },
  "PLA+": {
    name: "PLA+",
    density: 1.24,
    defaultSpeed: 65,
    temperature: "205-220 degC",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  },
};

export default function Calculator() {
  const defaultPrinterProfile = PRINTER_PROFILES[PRINTER_OPTIONS[0].name];

  const [filamentUsed, setFilamentUsed] = useState("");
  const [machinePowerWatts, setMachinePowerWatts] = useState(String(defaultPrinterProfile.power));
  const [printSpeedMmPerSecond, setPrintSpeedMmPerSecond] = useState(String(defaultPrinterProfile.speed));
  const [machineCostPerHour, setMachineCostPerHour] = useState(String(defaultPrinterProfile.machineCostPerHour));

  // Internal pricing configuration (kept out of customer UI)
  const filamentPricePerKg = "1200";
  const electricityRate = "10";
  const packagingCost = "0";
  const shippingCost = "0";
  const failureRate = "5";
  const gstPercent = "0";
  const profitMargin = "30";

  const [materialType, setMaterialType] = useState<MaterialType>("PLA");
  const [filamentColor, setFilamentColor] = useState("#00ff88");
  const [selectedPrinter, setSelectedPrinter] = useState(PRINTER_OPTIONS[0].name);

  const [models, setModels] = useState<ViewerModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelVolume, setModelVolume] = useState(0);
  const [estimatedPrintTime, setEstimatedPrintTime] = useState(0);
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

  const handleClearModel = () => {
    setModels([]);
    setSelectedModelId(null);
    setModelVolume(0);
    setEstimatedPrintTime(0);
    setModelDimensions({ width: 0, depth: 0, height: 0 });
    setFilamentUsed("0.00");

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
  }, []);

  const selectedMaterialConfig = useMemo(
    () => MATERIAL_LIBRARY[materialType],
    [materialType]
  );

  useEffect(() => {
    const profile = PRINTER_PROFILES[selectedPrinter];
    if (!profile) return;

    setMachinePowerWatts(String(profile.power));
    setPrintSpeedMmPerSecond(String(profile.speed));
    setMachineCostPerHour(String(profile.machineCostPerHour));
  }, [selectedPrinter]);

  // Filament estimation — only recalculates on model change, material change, or printer profile change.
  // This prevents the weight from fluctuating when unrelated UI fields (speed, price, etc.) are edited.
  useEffect(() => {
    if (modelVolume <= 0) {
      setFilamentUsed("0.00");
      return;
    }

    const infillPercentage = DEFAULT_INFILL_PERCENTAGE;
    const materialDensity = MATERIAL_LIBRARY[materialType]?.density ?? 1.24;

    const wallsVolume    = modelVolume * WALLS_FACTOR;
    const infillVolume   = modelVolume * infillPercentage;
    const topBotVolume   = modelVolume * TOP_BOTTOM_FACTOR;
    const supportsVolume = modelVolume * SUPPORTS_FACTOR;

    const bodyVolume = wallsVolume + infillVolume + topBotVolume;
    const effectiveVolume = bodyVolume + supportsVolume;

    const rawFilamentWeight = effectiveVolume * materialDensity;
    const filamentWeight    = Math.round(rawFilamentWeight * SLICER_EFFICIENCY_FACTOR * 100) / 100;

    setFilamentUsed(filamentWeight.toFixed(2));
  }, [modelVolume, materialType, selectedPrinter]);

  // Print-time estimation — recalculates on model or speed change only.
  useEffect(() => {
    if (modelVolume <= 0) {
      setEstimatedPrintTime(0);
      return;
    }
    const volumeMm3 = modelVolume * 1000;
    const selectedSpeed = Math.max(parseNumber(printSpeedMmPerSecond), 1);
    const baseFlowRate = 12; // mm³/s at 60 mm/s baseline speed
    const flowRateMm3PerSecond = Math.max(1, baseFlowRate * (selectedSpeed / 60));
    const estimatedHours = volumeMm3 / flowRateMm3PerSecond / 3600;
    setEstimatedPrintTime(estimatedHours);
  }, [modelVolume, printSpeedMmPerSecond]);

  const {
    filamentCost,
    electricityCost,
    machineCost,
  } = useMemo(() => {
    const filamentUsedNum = parseNumber(filamentUsed);
    const filamentPriceNum = parseNumber(filamentPricePerKg);
    const printHoursNum = Math.max(estimatedPrintTime, 0);
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

    const totalProductionCost =
      filamentCost +
      electricityCost +
      machineCost +
      packagingCostNum +
      shippingCostNum;

    const adjustedCost = totalProductionCost * (1 + failureRateNum / 100);

    const profitAmount = adjustedCost * (profitMarginNum / 100);

    const baseSellingPrice = adjustedCost + profitAmount;

    const gstAmount = (baseSellingPrice * gstPercentNum) / 100;

    const finalPrice = baseSellingPrice + gstAmount;

    return {
      filamentCost,
      electricityCost,
      machineCost,
    };
  }, [
    filamentUsed,
    filamentPricePerKg,
    estimatedPrintTime,
    electricityRate,
    machinePowerWatts,
    machineCostPerHour,
    packagingCost,
    shippingCost,
    failureRate,
    gstPercent,
    profitMargin,
  ]);

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
  const redirectToLyka = () => window.open("https://www.lyka3dstudio.com", "_blank");

  const analysisCards = [
    {
      label: "Estimated Filament Usage (±10% accuracy)",
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

  return (
    <div className="layerledger-content mx-auto max-w-5xl space-y-6">
      <section className="rounded-[28px] border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-8">
        <h1 className="text-center text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">3D Print Quote</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
          Upload your model, preview it, choose printer and material, and get an instant customer quote.
        </p>
      </section>

      <section className="rounded-[24px] border border-black/10 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Upload Model</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">STL / OBJ / 3MF Upload</h2>
        <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={ownershipConfirmed}
            onChange={(e) => {
              const checked = e.target.checked;
              setOwnershipConfirmed(checked);
              if (checked) setShowOwnershipWarning(false);
            }}
            className="mt-0.5 h-4 w-4 accent-green-500"
          />
          <span>I confirm that I own this model or have permission to print it.</span>
        </label>
        {showOwnershipWarning ? <p className="mt-3 text-xs text-red-500 dark:text-red-400">Please confirm model ownership before uploading.</p> : null}

        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,.obj,.3mf"
          multiple
          onChange={handleUpload}
          disabled={!ownershipConfirmed}
          className="mt-4 block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:file:bg-white/10"
        />

        <button
          onClick={handleClearModel}
          className="mt-4 w-full rounded-2xl border border-black/10 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          Clear Model
        </button>
      </section>

      <div className="text-center text-sm font-semibold text-slate-400">↓</div>

      <section className="rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">3D Model Preview</p>
        <div className="mt-4 rounded-[22px] border border-black/10 bg-slate-100/80 p-3 dark:border-white/8 dark:bg-slate-900/70 md:p-4">
          <STLViewer
            models={models}
            selectedModelId={selectedModelId}
            filamentColor={filamentColor}
            buildPlate={{
              width: selectedPrinterDetails.buildVolume.width,
              depth: selectedPrinterDetails.buildVolume.depth,
            }}
            onSelectModel={setSelectedModelId}
            onAnalysisChange={handleAnalysisChange}
          />
        </div>
      </section>

      <div className="text-center text-sm font-semibold text-slate-400">↓</div>

      <section className="rounded-[24px] border border-black/10 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Printer Selection</p>
        <select
          value={selectedPrinter}
          onChange={(e) => setSelectedPrinter(e.target.value)}
          className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          {PRINTER_OPTIONS.map((printer) => (
            <option key={printer.name} value={printer.name}>
              {printer.name} - {printer.buildVolume.width} × {printer.buildVolume.depth} × {printer.buildVolume.height} mm
            </option>
          ))}
        </select>

        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
            !modelHasDimensions
              ? "border-yellow-500/30 bg-yellow-50 text-yellow-800 dark:border-yellow-400/20 dark:bg-yellow-500/10 dark:text-yellow-300"
              : modelFitsSelectedPrinter
                ? "border-green-500/30 bg-green-50 text-green-800 dark:border-green-400/20 dark:bg-green-500/10 dark:text-green-300"
                : "border-yellow-500/30 bg-yellow-50 text-yellow-800 dark:border-yellow-400/20 dark:bg-yellow-500/10 dark:text-yellow-300"
          }`}
        >
          {!modelHasDimensions
            ? "Upload a model to check printer compatibility."
            : modelFitsSelectedPrinter
              ? "Model fits on this printer."
              : "Model exceeds the selected printer build volume."}
        </div>
      </section>

      <div className="text-center text-sm font-semibold text-slate-400">↓</div>

      <section className="grid gap-5 rounded-[24px] border border-black/10 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Material Selection</p>
          <select
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value as MaterialType)}
            className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            {(Object.keys(MATERIAL_LIBRARY) as MaterialType[]).map((materialKey) => (
              <option key={materialKey} value={materialKey}>
                {MATERIAL_LIBRARY[materialKey].name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Temperature: {selectedMaterialConfig.temperature}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Filament Color</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    ? "border-green-500/50 bg-green-50 dark:border-green-400/40 dark:bg-green-500/10"
                    : "border-black/10 bg-white hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                <span className="inline-block h-3.5 w-3.5 rounded-full border border-black/20 dark:border-white/20" style={{ backgroundColor: option.value }} />
                <span className="text-xs text-slate-900 dark:text-white">{option.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="text-center text-sm font-semibold text-slate-400">↓</div>

      <section className="rounded-[24px] border border-black/10 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Model Analysis</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {analysisCards.map((item) => (
            <div key={item.label} className="rounded-xl border border-black/10 bg-slate-100/80 p-3.5 dark:border-white/8 dark:bg-slate-900/80">
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center text-sm font-semibold text-slate-400">↓</div>

      <section className="rounded-[24px] border border-green-500/30 bg-gradient-to-br from-green-100/70 via-emerald-100/50 to-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-green-400/20 dark:from-green-500/20 dark:via-emerald-500/12 dark:to-slate-950/90 dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-green-200">Instant Price Quote</p>
        <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 p-5 text-center dark:border-white/10 dark:bg-black/20">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-800/70 dark:text-green-200/70">Estimated Quote</p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">₹{instantPriceQuote.toFixed(2)}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-black/20">
            <p className="text-[10px] text-slate-500 dark:text-green-100/70">Filament</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">₹ {filamentCost.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-black/20">
            <p className="text-[10px] text-slate-500 dark:text-green-100/70">Electricity</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">₹ {electricityCost.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/8 dark:bg-black/20">
            <p className="text-[10px] text-slate-500 dark:text-green-100/70">Machine</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">₹ {machineCost.toFixed(2)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={redirectToLyka}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 px-6 py-4 text-lg font-black text-black shadow-[0_12px_40px_rgba(34,197,94,0.24)] transition-all duration-200 hover:scale-[1.01]"
        >
          Order This Print
        </button>
      </section>
    </div>
  );
}
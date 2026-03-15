"use client";
import { useMemo, useState, useEffect, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import STLViewer from "@/components/STLViewer";
import type { ViewerModel } from "@/components/STLViewer";

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

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-white relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_26%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.12),_transparent_22%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <header className="relative border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-black tracking-tight">
              Layer<span className="text-green-400">Ledger</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">3D printing cost intelligence dashboard</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/10"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/calculator")}
              className="rounded-xl border border-green-500/30 bg-green-500/15 px-4 py-2 text-sm font-medium text-green-300 shadow-[0_0_30px_rgba(34,197,94,0.12)] transition-all duration-200 hover:bg-green-500/20"
            >
              Calculator
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <section className="mb-8 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.25em] text-green-300">Calculator Dashboard</p>
              <h1 className="mt-3 text-3xl md:text-5xl font-black tracking-tight">Price every print with a cleaner workflow.</h1>
              <p className="mt-4 text-slate-300 text-base md:text-lg leading-relaxed">
                Upload models, review geometry, confirm printer fit, and generate instant quotes from one dashboard built for professional 3D print operations.
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

        <div className="space-y-8">
          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] ring-1 ring-green-500/10 backdrop-blur-xl">
            <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Upload and Preview Your Model</h2>
              <p className="text-slate-300">Manage uploads, arrange models on the build plate, and preview the final job setup in one place.</p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
              <div className="rounded-[24px] border border-white/8 bg-slate-900/70 p-3 md:p-4 shadow-[0_0_60px_rgba(34,197,94,0.06)]">
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

              <div className="space-y-5">
                <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                  <label className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed">
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
                    <p className="mt-3 text-xs text-red-400">
                      Please confirm model ownership before uploading.
                    </p>
                  )}
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!ownershipConfirmed) {
                      setShowOwnershipWarning(true);
                    }
                  }}
                  className={`rounded-3xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
                    ownershipConfirmed
                      ? "border-green-400/50 bg-green-500/5 shadow-[0_0_50px_rgba(34,197,94,0.08)]"
                      : "border-white/10 bg-white/5 opacity-70"
                  }`}
                >
                  <p className="text-base font-semibold text-white">Drop STL, OBJ, or 3MF files here</p>
                  <p className="mt-2 text-sm text-slate-400">Or use the file picker to load one or more models into the build plate.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.obj,.3mf"
                    multiple
                    onChange={handleUpload}
                    disabled={!ownershipConfirmed}
                    className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
                  />
                  <button
                    onClick={handleClearModel}
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
                  >
                    Clear Model
                  </button>
                </div>

                <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">Loaded Models</h3>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{models.length} total</span>
                  </div>

                  {models.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No models loaded yet.</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setSelectedModelId(model.id)}
                          className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition-all ${
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

                <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                  <h3 className="text-lg font-semibold text-white">Filament Color</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                        className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                          filamentColor === option.value
                            ? "border-green-400/40 bg-green-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-white/20"
                          style={{ backgroundColor: option.value }}
                        />
                        <span className="text-sm text-white">{option.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Model Analysis</h2>
              <p className="text-slate-300">Core geometry and material metrics surfaced in a cleaner dashboard grid.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {analysisCards.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/8 bg-slate-900/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-3 text-xl font-semibold text-white leading-snug">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400">Model Only Filament</p>
                <p className="mt-3 text-xl font-semibold text-white">{modelFilamentUsed.toFixed(2)} g</p>
              </div>
              <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400">Support Estimate</p>
                <p className="mt-3 text-xl font-semibold text-white">{supportFilamentUsed.toFixed(2)} g</p>
              </div>
              <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400">Filament Length</p>
                <p className="mt-3 text-xl font-semibold text-white">{filamentMeters.toFixed(2)} m</p>
              </div>
              <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400">Filament Cost</p>
                <p className="mt-3 text-xl font-semibold text-white">₹ {filamentCost.toFixed(2)}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Printer Compatibility</h2>
                <p className="text-slate-300">Match the current model setup against your selected printer build volume.</p>
              </div>

              <label className="block text-sm font-medium mb-2 text-slate-300">Selected Printer</label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              >
                {PRINTER_OPTIONS.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name} - {printer.buildVolume.width} × {printer.buildVolume.depth} × {printer.buildVolume.height} mm
                  </option>
                ))}
              </select>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                  <p className="text-sm text-slate-400">Model Dimensions</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {modelDimensions.width.toFixed(2)} × {modelDimensions.depth.toFixed(2)} × {modelDimensions.height.toFixed(2)} mm
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5">
                  <p className="text-sm text-slate-400">Build Volume</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {selectedPrinterDetails.buildVolume.width} × {selectedPrinterDetails.buildVolume.depth} × {selectedPrinterDetails.buildVolume.height} mm
                  </p>
                </div>
              </div>

              <div className={`mt-5 rounded-3xl border px-5 py-4 text-sm font-medium ${
                !modelHasDimensions
                  ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-300"
                  : modelFitsSelectedPrinter
                    ? "border-green-400/20 bg-green-500/10 text-green-300"
                    : "border-yellow-400/20 bg-yellow-500/10 text-yellow-300"
              }`}>
                {!modelHasDimensions
                  ? "Upload a model to check printer compatibility."
                  : modelFitsSelectedPrinter
                    ? "Model fits on this printer."
                    : "Model exceeds the selected printer build volume."}
              </div>
            </div>

            <div className="rounded-[28px] border border-green-400/20 bg-gradient-to-br from-green-500/20 via-emerald-500/12 to-slate-950/90 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Instant Price Quote</h2>
                <p className="text-green-100/80">A quick quote view based on your current material, machine, and delivery inputs.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-sm uppercase tracking-[0.25em] text-green-200/70">Estimated Quote</p>
                <p className="mt-4 text-4xl md:text-5xl font-black text-white">₹{instantPriceQuote.toFixed(2)}</p>
                <p className="mt-3 text-sm text-green-100/80">Generated from current production cost with margin applied for faster quoting.</p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm text-green-100/70">Production Cost</p>
                  <p className="mt-2 text-xl font-semibold text-white">₹ {totalCost.toFixed(2)}</p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm text-green-100/70">Profit</p>
                  <p className="mt-2 text-xl font-semibold text-white">₹ {profitAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm text-green-100/70">Final Price</p>
                  <p className="mt-2 text-xl font-semibold text-white">₹ {sellingPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Cost Breakdown</h2>
              <p className="text-slate-300">Tune your pricing inputs and review the detailed calculation behind every quote.</p>
            </div>

            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Pricing Inputs</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {inputFields.map((field) => (
                    <label key={field.label} className="block">
                      <span className="mb-2 block text-sm text-slate-300">{field.label}</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={`w-full rounded-2xl border px-4 py-3 text-white ${
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

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Detailed Calculation</h3>
                <div className="rounded-3xl border border-white/8 bg-slate-900/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex justify-between gap-4">
                      <span>Filament Cost</span>
                      <span>₹ {filamentCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Electricity Cost</span>
                      <span>₹ {electricityCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Machine Cost</span>
                      <span>₹ {machineCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Total Production Cost</span>
                      <span>₹ {totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Adjusted Cost (w/ failure)</span>
                      <span>₹ {adjustedCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-green-300">
                      <span>Net Profit</span>
                      <span>₹ {profitAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Selling Price (Excl. GST)</span>
                      <span>₹ {baseSellingPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-yellow-300">
                      <span>GST Amount</span>
                      <span>₹ {gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-4 flex justify-between gap-4 text-base font-bold text-white">
                      <span>Final Selling Price (Incl. GST)</span>
                      <span className="text-green-300">₹ {sellingPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <h2 className="text-2xl font-bold tracking-tight text-white">LayerLedger Pro</h2>
              <p className="mt-3 text-slate-300">Advanced tools for higher-volume print businesses are on the way. Join the waitlist to hear when they launch.</p>

              <ul className="mt-6 space-y-3 text-sm md:text-base text-slate-300">
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

            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
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
      </main>
    </div>
  );
}
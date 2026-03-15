"use client";

import { useMemo, useState, useEffect, useRef, type ChangeEvent } from "react";
import STLViewer from "@/components/STLViewer";
import type { ViewerModel } from "@/components/STLViewer";

type WidgetMaterial = "PLA" | "PETG" | "ABS" | "TPU";

const MATERIALS: Record<
  WidgetMaterial,
  {
    density: number;
    speed: number;
    pricePerKg: number;
  }
> = {
  PLA: { density: 1.24, speed: 60, pricePerKg: 1200 },
  PETG: { density: 1.27, speed: 50, pricePerKg: 1450 },
  ABS: { density: 1.04, speed: 55, pricePerKg: 1500 },
  TPU: { density: 1.21, speed: 35, pricePerKg: 1850 },
};

const COLORS = [
  { name: "Black", value: "#111111" },
  { name: "White", value: "#f8fafc" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
] as const;

const isSupportedModelFile = (file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "stl" || ext === "obj" || ext === "3mf";
};

export default function WidgetPage() {
  const [material, setMaterial] = useState<WidgetMaterial>("PLA");
  const [filamentColor, setFilamentColor] = useState("#22c55e");
  const [cartConfirmation, setCartConfirmation] = useState("");
  const [models, setModels] = useState<ViewerModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelVolume, setModelVolume] = useState(0);
  const [filamentUsed, setFilamentUsed] = useState(0);
  const [estimatedPrintTime, setEstimatedPrintTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const materialConfig = MATERIALS[material];

  useEffect(() => {
    const modelGrams = modelVolume * materialConfig.density;
    const supportGrams = modelGrams * 0.15;
    const totalGrams = modelGrams + supportGrams;
    setFilamentUsed(totalGrams);

    const volumeMm3 = modelVolume * 1000;
    const baseFlowRate = 12; // mm3/s at 60 mm/s baseline
    const adjustedFlowRate = Math.max(1, baseFlowRate * (materialConfig.speed / 60));
    const hours = volumeMm3 / adjustedFlowRate / 3600;
    setEstimatedPrintTime(hours);
  }, [modelVolume, materialConfig]);

  const estimatedPrice = useMemo(() => {
    const filamentCost = (filamentUsed / 1000) * materialConfig.pricePerKg;
    const electricityRate = 10;
    const machinePowerWatts = 250;
    const machineCostPerHour = 20;
    const packagingCost = 15;
    const shippingCost = 0;

    const electricityCost =
      (machinePowerWatts / 1000) * estimatedPrintTime * electricityRate;
    const machineCost = machineCostPerHour * estimatedPrintTime;

    const productionCost =
      filamentCost + electricityCost + machineCost + packagingCost + shippingCost;

    return productionCost * 1.3;
  }, [filamentUsed, estimatedPrintTime, materialConfig.pricePerKg]);

  const appendModels = (incomingFiles: File[]) => {
    const supported = incomingFiles.filter(isSupportedModelFile);

    if (supported.length === 0) {
      alert("Only STL, OBJ, and 3MF files are supported.");
      return;
    }

    const startOffset = models.length;
    const createdModels: ViewerModel[] = supported.map((file, index) => {
      const id = `${Date.now()}-${startOffset + index}-${Math.random().toString(36).slice(2, 8)}`;
      const offset = (startOffset + index) * 20;
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
    const files = e.target.files ? Array.from(e.target.files) : [];
    appendModels(files);
  };

  const handleAddToCart = () => {
    const selectedModel = models.find((m) => m.id === selectedModelId) ?? models[0] ?? null;
    const uploadedFileName = selectedModel?.name ?? "No model uploaded";
    const selectedMaterial = material;
    const selectedColor = COLORS.find((colorOption) => colorOption.value === filamentColor)?.name ?? filamentColor;
    const calculatedPrice = Number(estimatedPrice.toFixed(2));
    const filamentUsedValue = Number(filamentUsed.toFixed(2));
    const estimatedPrintTimeValue = Number(estimatedPrintTime.toFixed(2));

    const cartPayload = {
      productTitle: "Custom 3D Print",
      price: calculatedPrice,
      properties: {
        material: selectedMaterial,
        color: selectedColor,
        filamentUsed: filamentUsedValue,
        printTime: estimatedPrintTimeValue,
        modelFile: uploadedFileName,
      },
    };

    console.log("LayerLedger Widget Add to Cart payload:", cartPayload);
    setCartConfirmation("Item ready to add to Shopify cart.");
  };

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">LayerLedger Widget</h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure custom 3D print options and estimate pricing for Shopify product pages.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Model Upload</h2>
            <p className="mt-1 text-sm text-slate-600">Upload STL, OBJ, or 3MF files.</p>

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.obj,.3mf"
                multiple
                onChange={handleUpload}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800"
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-2">
              <STLViewer
                models={models}
                selectedModelId={selectedModelId}
                filamentColor={filamentColor}
                buildPlate={{ width: 220, depth: 220 }}
                onSelectModel={setSelectedModelId}
                onAnalysisChange={(payload) => setModelVolume(payload.totalVolumeCm3)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Material Selection</h2>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value as WidgetMaterial)}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
              >
                {(Object.keys(MATERIALS) as WidgetMaterial[]).map((materialKey) => (
                  <option key={materialKey} value={materialKey}>
                    {materialKey}
                  </option>
                ))}
              </select>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Color Selection</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setFilamentColor(colorOption.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                      filamentColor === colorOption.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-slate-300"
                      style={{ backgroundColor: colorOption.value }}
                    />
                    {colorOption.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Price Estimate</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>Estimated Price</span>
                  <span className="font-semibold text-slate-900">₹ {estimatedPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Print Time</span>
                  <span>{estimatedPrintTime.toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Filament Used</span>
                  <span>{filamentUsed.toFixed(2)} g</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
              >
                Add to Cart
              </button>
              {cartConfirmation ? (
                <p className="mt-2 text-xs text-emerald-700">{cartConfirmation}</p>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

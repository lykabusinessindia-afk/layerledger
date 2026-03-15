"use client";

import { useMemo, useState, useEffect, useRef, type ChangeEvent } from "react";
import STLViewer from "@/components/STLViewer";
import type { ViewerModel } from "@/components/STLViewer";
import { PRINTER_OPTIONS, PRINTER_PROFILES } from "@/lib/printers";

const PLA_DENSITY = 1.24;
const INFILL_FACTOR = 0.3;
const SUPPORT_FACTOR = 0.15;
const FILAMENT_PRICE_PER_KG = 1200;
const ELECTRICITY_RATE = 10;
const PACKAGING_COST = 15;
const SHIPPING_COST = 0;
const FAILURE_RATE = 0.05;
const PROFIT_MARGIN = 0.3;

const isSupportedModelFile = (file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "stl" || ext === "obj" || ext === "3mf";
};

export default function WidgetPage() {
  const [selectedPrinter, setSelectedPrinter] = useState(PRINTER_OPTIONS[0].name);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [cartConfirmation, setCartConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [models, setModels] = useState<ViewerModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelVolume, setModelVolume] = useState(0);
  const [filamentUsed, setFilamentUsed] = useState(0);
  const [estimatedPrintTime, setEstimatedPrintTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const printerProfile = PRINTER_PROFILES[selectedPrinter] ?? PRINTER_PROFILES[PRINTER_OPTIONS[0].name];
  const selectedPrinterVolume =
    PRINTER_OPTIONS.find((printer) => printer.name === selectedPrinter)?.buildVolume ??
    PRINTER_OPTIONS[0].buildVolume;

  useEffect(() => {
    const printedVolume = modelVolume * INFILL_FACTOR;
    const modelGrams = printedVolume * PLA_DENSITY;
    const supportGrams = modelGrams * 0.15;
    const totalGrams = modelGrams + supportGrams;
    setFilamentUsed(totalGrams);

    const volumeMm3 = modelVolume * 1000;
    const baseFlowRate = 12; // mm3/s at 60 mm/s baseline
    const adjustedFlowRate = Math.max(1, baseFlowRate * (printerProfile.speed / 60));
    const hours = volumeMm3 / adjustedFlowRate / 3600;
    setEstimatedPrintTime(hours);
  }, [modelVolume, printerProfile.speed]);

  const estimatedPrice = useMemo(() => {
    const filamentCost = (filamentUsed / 1000) * FILAMENT_PRICE_PER_KG;
    const machinePowerWatts = printerProfile.power;
    const machineCostPerHour = printerProfile.machineCostPerHour;

    const electricityCost =
      (machinePowerWatts / 1000) * estimatedPrintTime * ELECTRICITY_RATE;
    const machineCost = machineCostPerHour * estimatedPrintTime;

    const productionCost =
      filamentCost + electricityCost + machineCost + PACKAGING_COST + SHIPPING_COST;

    const adjustedCost = productionCost * (1 + FAILURE_RATE);
    const profit = adjustedCost * PROFIT_MARGIN;

    return adjustedCost + profit;
  }, [filamentUsed, estimatedPrintTime, printerProfile]);

  const appendModels = async (incomingFiles: File[]) => {
    const supported = incomingFiles.filter(isSupportedModelFile);

    if (supported.length === 0) {
      alert("Only STL, OBJ, and 3MF files are supported.");
      return;
    }

    setErrorMessage("");

    const primaryFile = supported[0];
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", primaryFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const uploadPayload = (await response.json()) as { fileUrl: string };
      setUploadedFileUrl(uploadPayload.fileUrl);
    } catch {
      setErrorMessage("Model upload failed. Try again.");
    } finally {
      setUploading(false);
    }

    const modelId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdModel: ViewerModel = {
      id: modelId,
      name: primaryFile.name,
      file: primaryFile,
      scale: 1,
      positionX: 0,
      positionY: 0,
      rotationZ: 0,
    };

    setModels([createdModel]);
    setSelectedModelId(modelId);
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await appendModels(files);
  };

  const handleAddToCart = async () => {
    const variantId = process.env.NEXT_PUBLIC_SHOPIFY_VARIANT_ID;
    if (!variantId) {
      setErrorMessage("Missing NEXT_PUBLIC_SHOPIFY_VARIANT_ID.");
      return;
    }

    const selectedModel = models.find((m) => m.id === selectedModelId) ?? models[0] ?? null;
    if (!selectedModel) {
      setErrorMessage("Upload a model before adding to cart.");
      return;
    }

    setErrorMessage("");
    setCartConfirmation("");

    const storefrontBase = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL?.trim() || "";
    const cartAddUrl = storefrontBase ? `${storefrontBase}/cart/add.js` : "/cart/add.js";
    const cartUrl = storefrontBase ? `${storefrontBase}/cart` : "/cart";

    const uploadedFileName = selectedModel.name;
    const selectedMaterial = "PLA";
    const calculatedPrice = Number(estimatedPrice.toFixed(2));
    const filamentUsedValue = Number(filamentUsed.toFixed(2));
    const estimatedPrintTimeValue = Number(estimatedPrintTime.toFixed(2));

    const cartPayload = {
      productTitle: "Custom 3D Print",
      price: calculatedPrice,
      properties: {
        STL_File: uploadedFileUrl,
        Material: selectedMaterial,
        Printer: selectedPrinter,
        Volume: Number(modelVolume.toFixed(2)),
        Filament: filamentUsedValue,
        PrintTime: estimatedPrintTimeValue,
        modelFile: uploadedFileName,
        LayerLedgerUserId: "",
      },
    };

    console.log("LayerLedger Widget Add to Cart payload:", cartPayload);

    try {
      setAddingToCart(true);

      const response = await fetch(cartAddUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(variantId),
          quantity: 1,
          properties: cartPayload.properties,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to add item to Shopify cart");
      }

      setCartConfirmation("Added to cart. Redirecting to checkout cart...");

      if (window.top) {
        window.top.location.href = cartUrl;
        return;
      }

      window.location.href = cartUrl;
    } catch {
      setErrorMessage(
        "Unable to add to Shopify cart. Configure NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL or use Shopify app proxy."
      );
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <label className="text-sm font-semibold text-slate-800">3D Model (STL / OBJ / 3MF)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.obj,.3mf"
                onChange={handleUpload}
                className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800"
              />
              {uploading ? <p className="mt-2 text-xs text-slate-500">Uploading model...</p> : null}
              {uploadedFileUrl ? (
                <p className="mt-2 truncate text-xs text-emerald-700">Uploaded: {uploadedFileUrl}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">Printer Selection</label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
              >
                {PRINTER_OPTIONS.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Build Volume: {selectedPrinterVolume.width} x {selectedPrinterVolume.depth} x {selectedPrinterVolume.height} mm
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-2">
            <STLViewer
              models={models}
              selectedModelId={selectedModelId}
              filamentColor="#22c55e"
              buildPlate={{ width: selectedPrinterVolume.width, depth: selectedPrinterVolume.depth }}
              onSelectModel={setSelectedModelId}
              onAnalysisChange={(payload) => setModelVolume(payload.totalVolumeCm3)}
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Instant Price Calculator</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Model Volume</p>
                <p className="font-semibold">{modelVolume.toFixed(2)} cm3</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Filament</p>
                <p className="font-semibold">{filamentUsed.toFixed(2)} g</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Print Time</p>
                <p className="font-semibold">{estimatedPrintTime.toFixed(2)} hrs</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Estimated Price</p>
              <p className="text-xl font-bold text-slate-900">Rs {estimatedPrice.toFixed(2)}</p>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addingToCart || uploading || !models.length}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addingToCart ? "Adding..." : "Add to Cart"}
            </button>

            {cartConfirmation ? <p className="mt-2 text-xs text-emerald-700">{cartConfirmation}</p> : null}
            {errorMessage ? <p className="mt-2 text-xs text-red-600">{errorMessage}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

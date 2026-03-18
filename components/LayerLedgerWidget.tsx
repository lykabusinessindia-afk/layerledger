"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import STLViewer from "@/components/STLViewer";
import type { ViewerModel } from "@/components/STLViewer";
import { PRINTER_OPTIONS, PRINTER_PROFILES } from "@/lib/printers";

type MaterialType = "PLA" | "PETG" | "ABS" | "TPU";

const MATERIAL_DENSITY: Record<MaterialType, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  TPU: 1.21,
};

const EFFECTIVE_VOLUME_FACTOR = 0.43;
const FILAMENT_PRICE_PER_KG = 1200;
const ELECTRICITY_RATE = 10;
const PACKAGING_COST = 15;
const SHIPPING_COST = 0;
const FAILURE_RATE = 0.05;
const PROFIT_MARGIN = 0.3;

const COLOR_OPTIONS = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Gray", value: "#9ca3af" },
];

const isSupportedModelFile = (file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "stl" || ext === "obj" || ext === "3mf";
};

export type LayerLedgerWidgetProps = {
  className?: string;
  printerDefault?: string;
  materialDefault?: string;
  shop?: string;
  productId?: string;
};

export function LayerLedgerWidget({
  className = "",
  printerDefault,
  materialDefault,
  shop,
  productId,
}: LayerLedgerWidgetProps) {
  const [selectedPrinter, setSelectedPrinter] = useState(printerDefault || PRINTER_OPTIONS[0].name);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(materialDefault as MaterialType || "PLA");
  const [filamentColor, setFilamentColor] = useState("#22c55e");

  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [cartConfirmation, setCartConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const [models, setModels] = useState<ViewerModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelVolume, setModelVolume] = useState(0);
  const [modelDimensions, setModelDimensions] = useState({ width: 0, depth: 0, height: 0 });
  const [filamentUsed, setFilamentUsed] = useState(0);
  const [estimatedPrintTime, setEstimatedPrintTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [proceedError, setProceedError] = useState("");
  const [proceeding, setProceeding] = useState(false);

  const printerProfile = PRINTER_PROFILES[selectedPrinter] ?? PRINTER_PROFILES[PRINTER_OPTIONS[0].name];
  const selectedPrinterVolume =
    PRINTER_OPTIONS.find((printer) => printer.name === selectedPrinter)?.buildVolume ?? PRINTER_OPTIONS[0].buildVolume;

  useEffect(() => {
    const density = MATERIAL_DENSITY[selectedMaterial];
    const effectiveVolume = modelVolume * EFFECTIVE_VOLUME_FACTOR;
    const weight = Math.round(effectiveVolume * density * 100) / 100;
    setFilamentUsed(weight);

    const volumeMm3 = modelVolume * 1000;
    const baseFlowRate = 12;
    const adjustedFlowRate = Math.max(1, baseFlowRate * (printerProfile.speed / 60));
    const hours = volumeMm3 / adjustedFlowRate / 3600;
    setEstimatedPrintTime(hours);
  }, [modelVolume, selectedMaterial, printerProfile.speed]);

  const estimatedPrice = useMemo(() => {
    const filamentCost = (filamentUsed / 1000) * FILAMENT_PRICE_PER_KG;
    const electricityCost = (printerProfile.power / 1000) * estimatedPrintTime * ELECTRICITY_RATE;
    const machineCost = printerProfile.machineCostPerHour * estimatedPrintTime;

    const productionCost = filamentCost + electricityCost + machineCost + PACKAGING_COST + SHIPPING_COST;
    const adjustedCost = productionCost * (1 + FAILURE_RATE);
    const profit = adjustedCost * PROFIT_MARGIN;

    return adjustedCost + profit;
  }, [filamentUsed, estimatedPrintTime, printerProfile]);

  const selectedModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) ?? models[0] ?? null,
    [models, selectedModelId]
  );

  const canAddToCart = Boolean(selectedModel && uploadedFileUrl && estimatedPrice > 0 && !uploading);

  const appendModels = async (incomingFiles: File[]) => {
    const supported = incomingFiles.filter(isSupportedModelFile);
    if (supported.length === 0) {
      setErrorMessage("Only STL, OBJ, and 3MF files are supported.");
      return;
    }

    setErrorMessage("");
    setCartConfirmation("");

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
      setErrorMessage("Model upload failed. Please try again.");
      return;
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

  const handleProceedToOrder = () => {
    if (!selectedModel || !uploadedFileUrl) {
      setProceedError("Please upload an STL file before proceeding.");
      return;
    }
    setProceedError("");
    setProceeding(true);
    const params = new URLSearchParams({
      fileName: selectedModel.name,
      material: selectedMaterial,
      width: modelDimensions.width.toFixed(2),
      depth: modelDimensions.depth.toFixed(2),
      height: modelDimensions.height.toFixed(2),
      qty: String(quantity),
    });
    console.log("[LayerLedger] Proceeding to order with:", Object.fromEntries(params));
    router.push(`/jobs?${params.toString()}`);
  };

  const handleAddPrintToCart = async () => {
    const variantId = process.env.NEXT_PUBLIC_SHOPIFY_VARIANT_ID;
    if (!variantId) {
      setErrorMessage("Missing NEXT_PUBLIC_SHOPIFY_VARIANT_ID.");
      return;
    }

    if (!selectedModel) {
      setErrorMessage("Upload a model before adding to cart.");
      return;
    }

    if (!uploadedFileUrl) {
      setErrorMessage("Model upload is required before adding to cart.");
      return;
    }

    setErrorMessage("");
    setCartConfirmation("");

    const storefrontBase = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL?.trim() || "";
    const cartAddUrl = storefrontBase ? `${storefrontBase}/cart/add.js` : "/cart/add.js";
    const cartUrl = storefrontBase ? `${storefrontBase}/cart` : "/cart";

    try {
      setAddingToCart(true);

      const properties = {
        model_name: selectedModel.name,
        filament_usage: `${filamentUsed.toFixed(2)} g`,
        print_time: `${estimatedPrintTime.toFixed(2)} hrs`,
        printer: selectedPrinter,
        material: `${selectedMaterial} / ${COLOR_OPTIONS.find((c) => c.value === filamentColor)?.name ?? filamentColor}`,
        model_dimensions: `${modelDimensions.width.toFixed(2)} x ${modelDimensions.depth.toFixed(2)} x ${modelDimensions.height.toFixed(2)} mm`,
        stl_file_url: uploadedFileUrl,
        product_name: "3D Print Job",
        estimated_price: estimatedPrice.toFixed(2),
      };

      const response = await fetch(cartAddUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(variantId),
          quantity: 1,
          properties,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to add item to Shopify cart");
      }

      setCartConfirmation("Print added to cart. Redirecting...");

      const topWindow = window.top;
      if (topWindow && topWindow !== window.self) {
        topWindow.location.href = cartUrl;
        return;
      }

      window.location.href = cartUrl;
    } catch {
      setErrorMessage("Unable to add to cart. Check Shopify storefront/app proxy configuration.");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">LayerLedgerWidget</h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Upload Model</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.obj,.3mf"
              onChange={handleUpload}
              className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800"
            />
            {uploading ? <p className="mt-2 text-xs text-slate-500">Uploading model...</p> : null}
            {uploadedFileUrl ? (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
                <span>✓</span>
                <span className="truncate">{selectedModel?.name ?? "Model"} uploaded successfully</span>
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Select Printer</p>
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

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Preview Model</p>
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <STLViewer
              models={models}
              selectedModelId={selectedModelId}
              filamentColor={filamentColor}
              buildPlate={{ width: selectedPrinterVolume.width, depth: selectedPrinterVolume.depth }}
              onSelectModel={setSelectedModelId}
              onAnalysisChange={(payload) => {
                setModelVolume(payload.totalVolumeCm3);
                setModelDimensions(payload.dimensionsMm);
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Quantity</p>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="mt-2 w-32 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
            />
          </div>
          <div />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Material</p>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value as MaterialType)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
            >
              {(Object.keys(MATERIAL_DENSITY) as MaterialType[]).map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Color</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFilamentColor(color.value)}
                  className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                    filamentColor === color.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Price Estimate</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Filament Usage</p>
              <p className="font-semibold">{filamentUsed.toFixed(2)} g</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Print Time</p>
              <p className="font-semibold">{estimatedPrintTime.toFixed(2)} hrs</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2">
              <p className="text-xs text-slate-500">Estimated Price</p>
              <p className="text-xl font-bold text-slate-900">Rs {estimatedPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddPrintToCart}
          disabled={!canAddToCart || addingToCart}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {addingToCart ? "Adding..." : "Add Print To Cart"}
        </button>

        {cartConfirmation ? <p className="text-xs text-emerald-700">{cartConfirmation}</p> : null}
        {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}

        <button
          type="button"
          onClick={handleProceedToOrder}
          disabled={proceeding}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {proceeding ? "Redirecting..." : "Proceed to Order →"}
        </button>
        {proceedError ? <p className="text-xs text-red-600">{proceedError}</p> : null}
      </div>
    </section>
  );
}

export default LayerLedgerWidget;

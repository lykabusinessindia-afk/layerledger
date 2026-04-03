"use client";
import { useMemo, useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import Script from "next/script";
import STLViewer from "@/components/STLViewer";
import type { ViewerModel } from "@/components/STLViewer";
import { supabase } from "@/lib/supabase";

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

type ModelDimensions = {
  width: number;
  depth: number;
  height: number;
};

type ModelSizeInputs = {
  width: string;
  depth: string;
  height: string;
};

type SizeUnit = "mm" | "cm" | "inches";

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

const SIZE_UNIT_TO_MM: Record<SizeUnit, number> = {
  mm: 1,
  cm: 10,
  inches: 25.4,
};

const MIN_SIZE_MM = 1;

type MaterialType = "PLA" | "PETG" | "PLA Silk" | "TPU";

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
  "PLA Silk": {
    name: "PLA Silk",
    density: 1.22,
    defaultSpeed: 45,
    temperature: "205-220 degC",
    badgeClass: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30",
  },
  TPU: {
    name: "TPU",
    density: 1.21,
    defaultSpeed: 35,
    temperature: "210-230 degC",
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-400/30",
  },
};

type PrintQuality = "Draft" | "Standard" | "High";

const PRINT_QUALITY_OPTIONS: PrintQuality[] = ["Draft", "Standard", "High"];

const MATERIAL_RATES: Record<MaterialType, number> = {
  PLA: 3,
  PETG: 4,
  "PLA Silk": 5,
  TPU: 6,
};

const QUALITY_MULTIPLIERS: Record<PrintQuality, number> = {
  Draft: 0.8,
  Standard: 1.0,
  High: 1.3,
};

const BASE_FACTOR = 1.375;

type ColorOption = {
  name: string;
  value: string;
  swatchStyle?: {
    backgroundColor?: string;
    backgroundImage?: string;
  };
};

const COLOR_OPTIONS: ColorOption[] = [
  { name: "White", value: "#ffffff", swatchStyle: { backgroundColor: "#ffffff" } },
  { name: "Black", value: "#000000", swatchStyle: { backgroundColor: "#000000" } },
  { name: "Red", value: "#ef4444", swatchStyle: { backgroundColor: "#ef4444" } },
  { name: "Blue", value: "#3b82f6", swatchStyle: { backgroundColor: "#3b82f6" } },
  { name: "Green", value: "#22c55e", swatchStyle: { backgroundColor: "#22c55e" } },
  { name: "Yellow", value: "#eab308", swatchStyle: { backgroundColor: "#eab308" } },
  { name: "Orange", value: "#f97316", swatchStyle: { backgroundColor: "#f97316" } },
  { name: "Gray", value: "#9ca3af", swatchStyle: { backgroundColor: "#9ca3af" } },
  { name: "Purple", value: "#8b5cf6", swatchStyle: { backgroundColor: "#8b5cf6" } },
  { name: "Pink", value: "#ec4899", swatchStyle: { backgroundColor: "#ec4899" } },
  { name: "Brown", value: "#92400e", swatchStyle: { backgroundColor: "#92400e" } },
  { name: "Gold", value: "#d4af37", swatchStyle: { backgroundColor: "#d4af37" } },
  { name: "Silver", value: "#c0c0c0", swatchStyle: { backgroundColor: "#c0c0c0" } },
  {
    name: "Transparent",
    value: "#e5e7eb",
    swatchStyle: {
      backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(226,232,240,0.55))",
    },
  },
  { name: "Neon Green", value: "#39ff14", swatchStyle: { backgroundColor: "#39ff14" } },
  { name: "Neon Yellow", value: "#faff00", swatchStyle: { backgroundColor: "#faff00" } },
  { name: "Sky Blue", value: "#38bdf8", swatchStyle: { backgroundColor: "#38bdf8" } },
  { name: "Navy Blue", value: "#1e3a8a", swatchStyle: { backgroundColor: "#1e3a8a" } },
  { name: "Maroon", value: "#7f1d1d", swatchStyle: { backgroundColor: "#7f1d1d" } },
  { name: "Olive", value: "#6b8e23", swatchStyle: { backgroundColor: "#6b8e23" } },
  { name: "Teal", value: "#0f766e", swatchStyle: { backgroundColor: "#0f766e" } },
  { name: "Beige", value: "#d6c6a5", swatchStyle: { backgroundColor: "#d6c6a5" } },
  { name: "Ivory", value: "#fff8e7", swatchStyle: { backgroundColor: "#fff8e7" } },
  { name: "Copper", value: "#b87333", swatchStyle: { backgroundColor: "#b87333" } },
  { name: "Matte Black", value: "#111827", swatchStyle: { backgroundColor: "#111827" } },
  { name: "Matte White", value: "#f8fafc", swatchStyle: { backgroundColor: "#f8fafc" } },
  {
    name: "Gradient",
    value: "#a855f7",
    swatchStyle: {
      backgroundImage: "linear-gradient(135deg, #a855f7, #ec4899, #f59e0b)",
    },
  },
  {
    name: "Rainbow",
    value: "#ff4d6d",
    swatchStyle: {
      backgroundImage: "linear-gradient(135deg, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6, #8b5cf6)",
    },
  },
];

export default function Calculator() {
  const TOKEN_PERCENTAGE = 0.3;
  const TOKEN_CONFIRMATION_MESSAGE =
    "Order placed with 30% advance. Final price will be confirmed after slicing.";

  const defaultPrinterProfile = PRINTER_PROFILES[PRINTER_OPTIONS[0].name];

  const [filamentUsed, setFilamentUsed] = useState("");
  const [machinePowerWatts, setMachinePowerWatts] = useState(String(defaultPrinterProfile.power));
  const [printSpeedMmPerSecond, setPrintSpeedMmPerSecond] = useState(String(defaultPrinterProfile.speed));
  const [machineCostPerHour, setMachineCostPerHour] = useState(String(defaultPrinterProfile.machineCostPerHour));

  const [materialType, setMaterialType] = useState<MaterialType>("PLA");
  const [materialRate, setMaterialRate] = useState(MATERIAL_RATES.PLA);
  const [materialWeightInput, setMaterialWeightInput] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [filamentColor, setFilamentColor] = useState(COLOR_OPTIONS[0].value);
  const [printQuality, setPrintQuality] = useState<PrintQuality>("Standard");
  const [selectedPrinter, setSelectedPrinter] = useState(PRINTER_OPTIONS[0].name);

  const [models, setModels] = useState<ViewerModel[]>([]);
  const [uploadedModelUrls, setUploadedModelUrls] = useState<Record<string, string>>({});
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [estimatedPrintTime, setEstimatedPrintTime] = useState(0);
  const [modelDimensions, setModelDimensions] = useState<ModelDimensions>({
    width: 0,
    depth: 0,
    height: 0,
  });
  const [modelSizeInputs, setModelSizeInputs] = useState<ModelSizeInputs>({
    width: "",
    depth: "",
    height: "",
  });
  const [modelSizeUnit, setModelSizeUnit] = useState<SizeUnit>("mm");
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [showOwnershipWarning, setShowOwnershipWarning] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderConfirmationMessage, setOrderConfirmationMessage] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [isLoggedInUser, setIsLoggedInUser] = useState(false);
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerPincode, setCustomerPincode] = useState("");
  const [modalValidationError, setModalValidationError] = useState("");
  const [isProcessingModal, setIsProcessingModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseNumber = (value: string) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleModelSizeInputChange = (field: keyof ModelSizeInputs, value: string) => {
    if (value === "") {
      setModelSizeInputs((prev) => ({
        ...prev,
        [field]: value,
      }));
      return;
    }

    const normalizedValue = value.replace(/,/g, ".");
    const parsedValue = Number(normalizedValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    setModelSizeInputs((prev) => ({
      ...prev,
      [field]: normalizedValue,
    }));
  };

  const handleMaterialWeightChange = (value: string) => {
    if (value === "") {
      setMaterialWeightInput("");
      return;
    }

    const normalizedValue = value.replace(/,/g, ".");
    const parsedValue = Number(normalizedValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    setMaterialWeightInput(normalizedValue);
  };

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setQuantity("1");
      return;
    }

    const normalizedValue = value.replace(/,/g, ".");
    const parsedValue = Number(normalizedValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 1) {
      return;
    }

    setQuantity(String(Math.floor(parsedValue)));
  };

  const isSupportedModelFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["stl", "obj", "3mf"];
    return allowed.includes(ext);
  };

  const isWithinSizeLimit = (file: File) => file.size <= 50 * 1024 * 1024;

  const uploadStlToStorage = async (file: File, modelId: string) => {
    if (!(file instanceof File) || !file.name) {
      throw new Error("Missing file for upload");
    }

    console.log("Uploading file:", file);

    const safeFileName = file.name.replace(/[\\/]/g, "_");
    const storagePath = `uploads/${Date.now()}-${safeFileName}`;

    const { data, error } = await supabase.storage
      .from("stl-files")
      .upload(storagePath, file, {
        upsert: false,
      });

    if (error) {
      console.log("Upload error:", error);
      alert("Upload failed");
      return;
    }

    console.log("Upload success:", data);

    const {
      data: { publicUrl },
    } = supabase.storage.from("stl-files").getPublicUrl(storagePath);

    if (!publicUrl) {
      return;
    }

    setUploadedModelUrls((prev) => ({
      ...prev,
      [modelId]: publicUrl,
    }));

    return { success: true, fileUrl: publicUrl };
  };

  const appendModels = async (incomingFiles: File[]) => {
    const supported = incomingFiles.filter((file) => isSupportedModelFile(file) && isWithinSizeLimit(file));
    const rejected = incomingFiles.length - supported.length;

    if (rejected > 0) {
      alert("Only STL, OBJ, 3MF files up to 50MB are supported");
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

    for (const model of createdModels) {
      try {
        await uploadStlToStorage(model.file, model.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload STL file";
        alert(message);
      }
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!ownershipConfirmed) {
      setShowOwnershipWarning(true);
      return;
    }

    const file = e.target.files?.[0];

    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    if (!isSupportedModelFile(file) || !isWithinSizeLimit(file)) {
      alert("Only STL, OBJ, 3MF files up to 50MB are supported");
      return;
    }

    await appendModels([file]);
    setShowOwnershipWarning(false);
  };

  const handleClearModel = () => {
    setModels([]);
    setSelectedModelId(null);
    setUploadedModelUrls({});
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
    setModelDimensions(payload.dimensionsMm);
  }, []);

  const selectedMaterialConfig = useMemo(
    () => MATERIAL_LIBRARY[materialType],
    [materialType]
  );

  const qualityMultiplier = useMemo(
    () => QUALITY_MULTIPLIERS[printQuality],
    [printQuality]
  );

  useEffect(() => {
    setMaterialRate(MATERIAL_RATES[materialType]);
  }, [materialType]);

  useEffect(() => {
    const storedMessage = window.sessionStorage.getItem("layerledger-token-confirmation");
    if (!storedMessage) {
      return;
    }

    setOrderConfirmationMessage(storedMessage);
    window.sessionStorage.removeItem("layerledger-token-confirmation");
  }, []);

  useEffect(() => {
    let active = true;

    const loadCustomerEmail = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email?.trim() ?? "";
        const userId = data.user?.id ?? null;

        if (!active) return;

        setCurrentUserId(userId);

        if (email) {
          setCustomerEmail(email);
          setIsLoggedInUser(true);
          setIsEmailLocked(true);
        } else {
          setIsLoggedInUser(false);
          setIsEmailLocked(false);
        }
      } finally {
        if (active) {
          setIsEmailLoading(false);
        }
      }
    };

    void loadCustomerEmail();

    return () => {
      active = false;
    };
  }, []);

  const lockEmailIfNeeded = () => {
    if (isLoggedInUser || isEmailLocked) {
      return;
    }

    const normalized = customerEmail.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    setCustomerEmail(normalized);
    setIsEmailLocked(true);
  };

  const manualModelDimensionsMm = useMemo<ModelDimensions>(() => {
    const unitMultiplier = SIZE_UNIT_TO_MM[modelSizeUnit];

    return {
      width: parseNumber(modelSizeInputs.width) * unitMultiplier,
      depth: parseNumber(modelSizeInputs.depth) * unitMultiplier,
      height: parseNumber(modelSizeInputs.height) * unitMultiplier,
    };
  }, [modelSizeInputs, modelSizeUnit]);

  const hasManualModelSize = useMemo(
    () => Object.values(modelSizeInputs).some((value) => value.trim() !== ""),
    [modelSizeInputs]
  );

  const hasValidManualModelSize = useMemo(
    () =>
      Object.values(modelSizeInputs).every((value) => value.trim() !== "") &&
      Object.values(manualModelDimensionsMm).every((value) => value >= MIN_SIZE_MM),
    [manualModelDimensionsMm, modelSizeInputs]
  );

  const modelSizeValidationMessage = useMemo(() => {
    if (!hasManualModelSize) {
      return "";
    }

    if (Object.values(modelSizeInputs).some((value) => value.trim() === "")) {
      return "Enter X, Y, and Z to calculate a quote.";
    }

    if (Object.values(manualModelDimensionsMm).some((value) => value === 0)) {
      return "Each dimension must be greater than 0.";
    }

    if (Object.values(manualModelDimensionsMm).some((value) => value < MIN_SIZE_MM)) {
      return "Each dimension must be at least 1 mm.";
    }

    return "";
  }, [hasManualModelSize, manualModelDimensionsMm, modelSizeInputs]);

  const sizeInputMinimum = useMemo(
    () => String(MIN_SIZE_MM / SIZE_UNIT_TO_MM[modelSizeUnit]),
    [modelSizeUnit]
  );

  const modelDimensionsForCalculations = useMemo<ModelDimensions>(
    () => (hasManualModelSize ? manualModelDimensionsMm : modelDimensions),
    [hasManualModelSize, manualModelDimensionsMm, modelDimensions]
  );

  useEffect(() => {
    const profile = PRINTER_PROFILES[selectedPrinter];
    if (!profile) return;

    setMachinePowerWatts(String(profile.power));
    setPrintSpeedMmPerSecond(String(profile.speed));
    setMachineCostPerHour(String(profile.machineCostPerHour));
  }, [selectedPrinter]);

  const materialWeight = useMemo(() => parseNumber(materialWeightInput), [materialWeightInput]);
  const isWeightProvided = materialWeightInput.trim() !== "";
  const quantityValue = useMemo(() => Math.max(1, Math.floor(parseNumber(quantity))), [quantity]);

  const instantPriceQuote = useMemo(() => {
    if (materialWeight <= 0 || materialRate <= 0 || qualityMultiplier <= 0 || quantityValue <= 0) {
      return 0;
    }

    const basePrice = materialWeight * materialRate * qualityMultiplier * BASE_FACTOR;
    const finalPrice = basePrice * quantityValue;
    return Math.round(finalPrice);
  }, [materialRate, materialWeight, qualityMultiplier, quantityValue]);

  const tokenBreakdownAmount = useMemo(
    () => Math.round(instantPriceQuote * TOKEN_PERCENTAGE),
    [instantPriceQuote, TOKEN_PERCENTAGE]
  );

  const remainingBreakdownAmount = useMemo(
    () => Math.max(0, instantPriceQuote - tokenBreakdownAmount),
    [instantPriceQuote, tokenBreakdownAmount]
  );

  const selectedPrinterDetails = useMemo(
    () => PRINTER_OPTIONS.find((printer) => printer.name === selectedPrinter) ?? PRINTER_OPTIONS[0],
    [selectedPrinter]
  );

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId]
  );

  const openCheckoutModal = () => {
    console.log("[Order] Opening checkout modal");

    if (!selectedModel) {
      setOrderError("Upload a model before ordering.");
      return;
    }

    const normalizedCustomerEmail = customerEmail.trim().toLowerCase();
    const isEmailValid = /^\S+@\S+\.\S+$/.test(normalizedCustomerEmail);

    if (!normalizedCustomerEmail || !isEmailValid) {
      setOrderError("Please enter a valid email to proceed.");
      return;
    }

    if (!isLoggedInUser && !isEmailLocked) {
      setCustomerEmail(normalizedCustomerEmail);
      setIsEmailLocked(true);
    }

    setModalValidationError("");
    setShowCheckoutModal(true);
    setOrderError("");
  };

  const validateModalForm = (): boolean => {
    setModalValidationError("");

    const phone = customerPhone.trim();
    const address = customerAddress.trim();
    const city = customerCity.trim();
    const state = customerState.trim();
    const pincode = customerPincode.trim();

    if (!phone) {
      setModalValidationError("Phone number is required.");
      return false;
    }

    if (!/^[\d\s\-\+\(\)]{10,}$/.test(phone)) {
      setModalValidationError("Please enter a valid phone number.");
      return false;
    }

    if (!address) {
      setModalValidationError("Address is required.");
      return false;
    }

    if (!city) {
      setModalValidationError("City is required.");
      return false;
    }

    if (!state) {
      setModalValidationError("State is required.");
      return false;
    }

    if (!pincode) {
      setModalValidationError("Pincode is required.");
      return false;
    }

    if (!/^\d{6}$/.test(pincode)) {
      setModalValidationError("Pincode must be 6 digits.");
      return false;
    }

    return true;
  };

  const handleContinueToPayment = async () => {
    console.log("[Order] Continue to payment clicked");

    if (!validateModalForm()) {
      return;
    }

    setIsProcessingModal(true);
    setModalValidationError("");

    try {
      await handleOrderThisPrint();
      setShowCheckoutModal(false);
    } catch (error) {
      console.error("[Order] Error during payment:", error);
      setModalValidationError("Failed to process order. Please try again.");
    } finally {
      setIsProcessingModal(false);
    }
  };

  const handleOrderThisPrint = async () => {
    console.log("[Order] Processing payment");

    const paymentWindow = window as Window & {
      __orderCreated?: boolean;
      __orderSaved?: boolean;
    };

    if (paymentWindow.__orderCreated) {
      return;
    }

    paymentWindow.__orderCreated = true;
    paymentWindow.__orderSaved = false;

    if (!selectedModel) {
      paymentWindow.__orderCreated = false;
      setOrderError("Upload a model before ordering.");
      return;
    }

    if (!selectedModel.file) {
      paymentWindow.__orderCreated = false;
      setOrderError("No model file found. Please upload your model again.");
      return;
    }

    const normalizedCustomerEmail = customerEmail.trim().toLowerCase();
    const selectedModelFileUrl = uploadedModelUrls[selectedModel.id];

    if (!selectedModelFileUrl) {
      paymentWindow.__orderCreated = false;
      setOrderError("Please wait for STL upload to complete before placing the order.");
      return;
    }

    try {
      setIsOrdering(true);
      setOrderError("");
      setOrderConfirmationMessage("");

      const final_price = Math.max(0, Math.round(instantPriceQuote));
      const token_amount = Math.max(0, Math.round(final_price * TOKEN_PERCENTAGE));

      console.log("ORDER CREATED ONCE");
      console.log("[Order] Requesting Razorpay order", { final_price, token_amount });

      const response = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_amount }),
      });

      console.log("[Order] API response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to create Razorpay order.");
      }

      const data = (await response.json()) as { success?: boolean; order_id?: string; amount?: number; error?: string };
      console.log("[Order] API response data:", data);

      if (!data.success || !data.order_id) {
        throw new Error(data.error || "Missing order_id from API response.");
      }

      const razorpayWindow = window as any;
      if (!razorpayWindow.Razorpay) {
        paymentWindow.__orderCreated = false;
        setOrderError("Razorpay SDK not loaded. Please refresh the page.");
        return;
      }
      localStorage.setItem(
  "customer_details",
  JSON.stringify({
    phone: customerPhone,
    address: customerAddress,
    city: customerCity,
    state: customerState,
    pincode: customerPincode,
  })
);
      const razorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: data.order_id,
        amount: data.amount ? data.amount * 100 : token_amount * 100,
        currency: "INR",
        name: "LYKA 3D Studio",
        description: "3D Print Advance Payment",
        image: "/logo.png",
        prefill: {
          name: "",
          email: normalizedCustomerEmail,
          contact: "",
        },
        notes: {
          brand: "LYKA 3D Studio",
          model: selectedModel.file.name,
        },
        handler: async function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
          const guardWindow = window as Window & { __orderSaved?: boolean };
          if (guardWindow.__orderSaved) return;
          guardWindow.__orderSaved = true;

          console.log("Razorpay success:", response);
          setOrderConfirmationMessage(TOKEN_CONFIRMATION_MESSAGE);

          const enteredEmail = normalizedCustomerEmail;
          const safeFileUrl =
            typeof selectedModelFileUrl === "string" && selectedModelFileUrl.startsWith("http")
              ? selectedModelFileUrl
              : null;
          console.log("FILE URL DEBUG:", safeFileUrl);
          console.log("SENDING CUSTOMIZATION:", {
            material: materialType,
            color: filamentColor,
            finish: printQuality,
            scale: selectedModel?.scale,
            quantity: quantity,
          });
          const customization = {
            color: filamentColor,
            material: materialType,
            finish: printQuality,
            scale: selectedModel?.scale,
            quantity: quantity,
          };
          const xValue = modelSizeInputs.width;
          const yValue = modelSizeInputs.depth;
          const zValue = modelSizeInputs.height;
          const safeSize = {
            x: Number(xValue) || null,
            y: Number(yValue) || null,
            z: Number(zValue) || null,
          };
          const updatedCustomization = {
            ...customization,
            size: safeSize,
          };
          console.log("Sending size:", safeSize);

          const email = enteredEmail?.trim() || null;
          const phone = customerPhone?.trim() || null;
          const address = customerAddress?.trim() || null;
          const city = customerCity?.trim() || null;
          const state = customerState?.trim() || null;
          const pincode = customerPincode?.trim() || null;

          console.log("SENDING TO BACKEND:", {
            email,
            phone,
            address,
            city,
            state,
            pincode,
          });

          const saveOrderBody = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            customization: updatedCustomization,
            file_url: safeFileUrl,
            amount: token_amount,
            status: "paid",
            material: materialType,
            color: filamentColor,
            finish: printQuality,
            scale: selectedModel?.scale,
            quantity: quantity,
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
            ...(address ? { address } : {}),
            ...(city ? { city } : {}),
            ...(state ? { state } : {}),
            ...(pincode ? { pincode } : {}),
          };

          try {
            console.log("API CALLED ONCE");
            const res = await fetch("/api/save-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(saveOrderBody),
            });

            const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };

            if (!data.success) {
              console.error("Order save failed:", data.error);
              alert("Payment received but order not saved. Contact support.");
            }

            console.log("Order saved successfully");
          } catch (error) {
            console.error("Order save failed", error);
            alert("Payment received but order not saved. Contact support.");
          }

          window.location.href = "/payment-success";
        },
        modal: {
          ondismiss: () => {
            paymentWindow.__orderCreated = false;
            paymentWindow.__orderSaved = false;
          },
        },
        theme: {
          color: "#22c55e",
        },
      };

      // Ensure customer details are saved before payment
      localStorage.setItem(
        "customer_details",
        JSON.stringify({
          phone: customerPhone || "",
          address: customerAddress || "",
          city: customerCity || "",
          state: customerState || "",
          pincode: customerPincode || "",
        })
      );

      const razorpay = new razorpayWindow.Razorpay(razorpayOptions);
      console.log("[Order] Opening Razorpay checkout");
      razorpay.open();
    } catch (error) {
      paymentWindow.__orderCreated = false;
      paymentWindow.__orderSaved = false;
      const message = error instanceof Error ? error.message : "Could not place order.";
      console.error("[Order] Error:", message);
      setOrderError(message);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => console.log("[Razorpay] Script loaded")}
        onError={() => console.error("[Razorpay] Script failed to load")}
      />
      <div className="min-h-screen bg-[#020617] bg-[radial-gradient(circle_at_12%_10%,rgba(168,85,247,0.22),transparent_40%),radial-gradient(circle_at_88%_92%,rgba(59,130,246,0.2),transparent_42%),linear-gradient(to_bottom_right,#020617,#0f172a)] text-white">
      <div className="layerledger-content mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <section className="rounded-[28px] border border-violet-400/20 bg-slate-950/65 p-6 shadow-[0_14px_40px_rgba(59,130,246,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl opacity-90 transition-all duration-300 hover:opacity-100 md:p-8">
        <h1 className="text-center text-3xl font-black tracking-tight text-white md:text-4xl">Upload Your STL</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
          Upload your 3D model, customize your print, and place your order.
        </p>
      </section>

      <div className="relative flex items-center justify-center">
      <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-r from-purple-500 via-blue-500 to-transparent opacity-30 blur-3xl" />
      <section className="relative z-10 w-full scale-[1.02] rounded-[24px] border border-violet-400/30 bg-slate-950/78 p-5 shadow-[0_0_60px_rgba(168,85,247,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl md:scale-[1.05]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Upload Model</p>
        <h2 className="mt-2 text-lg font-semibold text-white">STL / OBJ / 3MF Upload</h2>
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
          className="mt-4 block w-full rounded-xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] file:mr-3 file:rounded-xl file:border-0 file:bg-violet-500/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          onClick={handleClearModel}
          className="mt-4 w-full rounded-2xl border border-violet-400/25 bg-slate-900/75 px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all hover:bg-slate-800/85"
        >
          Clear Model
        </button>
      </section>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-400/55 to-transparent shadow-[0_0_16px_rgba(99,102,241,0.45)]" />

      <section className="rounded-[24px] border border-blue-400/20 bg-slate-950/65 p-5 shadow-[0_12px_34px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl opacity-90 transition-all duration-300 hover:opacity-100">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">3D Model Preview</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Preview only. Your model is auto-positioned for quoting.</p>
        <div className="mt-4 rounded-[22px] border border-blue-400/20 bg-slate-950/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-4">
          <STLViewer
            models={models}
            selectedModelId={selectedModelId}
            filamentColor={filamentColor}
            simpleView
            buildPlate={{
              width: selectedPrinterDetails.buildVolume.width,
              depth: selectedPrinterDetails.buildVolume.depth,
            }}
            onAnalysisChange={handleAnalysisChange}
          />
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-400/45 to-transparent shadow-[0_0_14px_rgba(59,130,246,0.35)]" />

      <section className="rounded-[24px] border border-violet-400/20 bg-slate-950/65 p-5 shadow-[0_12px_34px_rgba(99,102,241,0.14),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl opacity-90 transition-all duration-300 hover:opacity-100">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Model Size Customization</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">X (Width)</label>
            <input
              type="number"
              min={sizeInputMinimum}
              step="any"
              inputMode="decimal"
              value={modelSizeInputs.width}
              onChange={(e) => handleModelSizeInputChange("width", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Y (Depth)</label>
            <input
              type="number"
              min={sizeInputMinimum}
              step="any"
              inputMode="decimal"
              value={modelSizeInputs.depth}
              onChange={(e) => handleModelSizeInputChange("depth", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Z (Height)</label>
            <input
              type="number"
              min={sizeInputMinimum}
              step="any"
              inputMode="decimal"
              value={modelSizeInputs.height}
              onChange={(e) => handleModelSizeInputChange("height", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Unit</label>
            <select
              value={modelSizeUnit}
              onChange={(e) => setModelSizeUnit(e.target.value as SizeUnit)}
              className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="inches">inches</option>
            </select>
          </div>
        </div>
        {modelSizeValidationMessage ? (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
            {modelSizeValidationMessage}
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {hasManualModelSize
              ? `Converted internally to ${modelDimensionsForCalculations.width.toFixed(2)} × ${modelDimensionsForCalculations.depth.toFixed(2)} × ${modelDimensionsForCalculations.height.toFixed(2)} mm.`
              : "Values are converted internally to mm for calculations."}
          </p>
        )}
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-400/45 to-transparent shadow-[0_0_14px_rgba(99,102,241,0.35)]" />

      <section className="rounded-[24px] border border-blue-400/20 bg-slate-950/65 p-5 shadow-[0_12px_34px_rgba(59,130,246,0.14),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl opacity-90 transition-all duration-300 hover:opacity-100">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Material Weight</p>
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Weight (grams)</label>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={materialWeightInput}
            onChange={(e) => handleMaterialWeightChange(e.target.value)}
            placeholder="Enter weight in grams (e.g., 120)"
            className="mt-2 w-full rounded-2xl border border-blue-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-400/60"
          />
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-400/45 to-transparent shadow-[0_0_14px_rgba(59,130,246,0.35)]" />

      <section className="grid gap-5 rounded-[24px] border border-violet-400/20 bg-slate-950/65 p-5 shadow-[0_12px_34px_rgba(99,102,241,0.14),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl opacity-90 transition-all duration-300 hover:opacity-100 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Material Selection</p>
          <select
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value as MaterialType)}
            className="mt-3 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
          >
            {(Object.keys(MATERIAL_LIBRARY) as MaterialType[]).map((materialKey) => (
              <option key={materialKey} value={materialKey}>
                {MATERIAL_LIBRARY[materialKey].name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Temperature: {selectedMaterialConfig.temperature}</p>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Print Quality</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PRINT_QUALITY_OPTIONS.map((quality) => (
                <button
                  key={quality}
                  type="button"
                  onClick={() => setPrintQuality(quality)}
                  className={`flex items-center justify-center rounded-xl border px-2.5 py-2 text-center text-xs transition-all ${
                    printQuality === quality
                      ? "border-none bg-gradient-to-r from-violet-400 to-blue-400 text-black shadow-[0_0_18px_rgba(99,102,241,0.45)]"
                      : "border-violet-400/25 bg-slate-900/70 text-slate-200 hover:bg-slate-800/80"
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Quantity</p>
            <div className="mt-3">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Number of Prints</label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Filament Color</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilamentColor(option.value)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm transition-all ${
                  filamentColor === option.value
                    ? "border-none bg-gradient-to-r from-violet-400 to-blue-400 text-black shadow-[0_0_18px_rgba(99,102,241,0.45)]"
                    : "border-violet-400/25 bg-slate-900/70 text-white hover:bg-slate-800/80"
                }`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full border border-black/20 dark:border-white/20"
                  style={option.swatchStyle ?? { backgroundColor: option.value }}
                />
                <span className="text-xs">{option.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-400/50 to-transparent shadow-[0_0_16px_rgba(99,102,241,0.45)]" />

      <section className="rounded-[24px] border border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-blue-500/8 to-slate-950/70 p-5 shadow-[0_20px_60px_rgba(99,102,241,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl opacity-95 transition-all duration-300 hover:opacity-100">
        <p className="text-green-400 font-semibold tracking-widest text-sm opacity-100">Instant Price Quote</p>
        <div className="mt-4 rounded-2xl border border-violet-400/25 bg-slate-950/80 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-gray-300 text-sm tracking-wide">Estimated Quote</p>
          <p className="text-white text-4xl font-bold">₹{instantPriceQuote.toFixed(2)}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Estimated Delivery: 3-5 days (after final payment)</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Production and dispatch will begin only after the remaining balance is paid.</p>
          <div className="mt-4 grid gap-2 text-left text-sm text-slate-700 dark:text-slate-200">
            <p>Estimated Price: ₹{instantPriceQuote.toFixed(2)}</p>
            <p className="font-bold text-green-700 dark:text-green-300">Token (30%): ₹{tokenBreakdownAmount.toFixed(2)}</p>
            <p className="text-slate-500 dark:text-slate-400">Remaining: ₹{remainingBreakdownAmount.toFixed(2)}</p>
            <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">Final price may vary slightly after model slicing.</p>
            <div className="pt-1 text-xs text-slate-600 dark:text-slate-300">
              <p>Step 1: Pay advance</p>
              <p>Step 2: We slice model &amp; confirm price</p>
              <p>Step 3: Pay remaining</p>
              <p>Step 4: We print &amp; ship</p>
            </div>
          </div>
        </div>

        <p className="text-green-300 text-sm font-medium text-center opacity-100">
          You are paying 30% advance (<span className="font-black text-green-700 dark:text-green-300">₹{tokenBreakdownAmount.toFixed(2)}</span>)
        </p>

        <div className="mt-4 rounded-2xl border border-violet-400/25 bg-slate-950/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Email {isLoggedInUser ? "(auto-filled)" : "(required)"}
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => {
              if (isLoggedInUser || isEmailLocked) {
                return;
              }
              setCustomerEmail(e.target.value);
            }}
            onBlur={lockEmailIfNeeded}
            readOnly={isLoggedInUser || isEmailLocked}
            required
            placeholder={isEmailLoading ? "Loading email..." : "you@example.com"}
            className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
          />
          {!isLoggedInUser && isEmailLocked ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Email is locked for this order to keep payment and order records consistent.</p>
          ) : null}
        </div>

        {showCheckoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-violet-400/30 bg-slate-950/92 p-6 shadow-[0_20px_80px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <h2 className="text-center text-2xl font-bold text-white">Complete Your Details</h2>
              <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">Add your contact and address information</p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    readOnly
                    className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Phone *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Address *</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Street address"
                    className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">City *</label>
                    <input
                      type="text"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      placeholder="City"
                      className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">State *</label>
                    <input
                      type="text"
                      value={customerState}
                      onChange={(e) => setCustomerState(e.target.value)}
                      placeholder="State"
                      className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Pincode *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customerPincode}
                    onChange={(e) => setCustomerPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="mt-2 w-full rounded-2xl border border-violet-400/25 bg-slate-950/90 px-3 py-3 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                  />
                </div>
              </div>

              {modalValidationError && (
                <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">{modalValidationError}</p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setModalValidationError("");
                  }}
                  disabled={isProcessingModal}
                  className="flex-1 rounded-2xl border border-violet-400/25 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800/80 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinueToPayment}
                  disabled={isProcessingModal}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(99,102,241,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_34px_rgba(59,130,246,0.5)] disabled:opacity-60"
                >
                  {isProcessingModal ? "Processing..." : "Continue to Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={openCheckoutModal}
          disabled={!selectedModel || isOrdering || !isWeightProvided || instantPriceQuote <= 0 || isEmailLoading}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-6 py-4 text-lg font-black text-white shadow-[0_0_28px_rgba(99,102,241,0.35)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_42px_rgba(59,130,246,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOrdering ? "Processing..." : `Pay ₹${tokenBreakdownAmount.toFixed(2)} & Start Printing`}
        </button>

        <p className="mt-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">🔒 Secure Payment via Razorpay</p>

        {orderConfirmationMessage ? (
          <p className="mt-3 text-sm font-semibold text-green-700 dark:text-green-300">
            {orderConfirmationMessage}
          </p>
        ) : null}
        {orderError ? <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">{orderError}</p> : null}

        <footer className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-300">
          <span className="cursor-pointer hover:text-green-400 transition">
            Privacy Policy
          </span>
          <span className="text-white/10">|</span>
          <span className="cursor-pointer hover:text-green-400 transition">
            Terms of Service
          </span>
        </footer>
      </section>
    </div>
    </div>
    </>
  );
}
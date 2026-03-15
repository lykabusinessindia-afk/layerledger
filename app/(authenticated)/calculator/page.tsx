"use client";
import { useMemo, useState, useCallback, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { supabase } from "@/lib/supabase";
import { addSavedPrintJob } from "@/lib/printJobs";
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

const SPOOL_SIZES = [
  { label: "250g", grams: 250 },
  { label: "500g", grams: 500 },
  { label: "1kg", grams: 1000 },
  { label: "2kg", grams: 2000 },
  { label: "5kg", grams: 5000 },
];

const PRINT_EFFICIENCY = 0.5;
const SUPPORT_FACTOR = 0.15;

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
  type WorkspaceTool = "move" | "rotate" | "scale";
  type ModelFootprint = { width: number; depth: number; height: number };

  const { promptInstall } = useInstallPrompt();

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joining, setJoining] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [jobSaveMessage, setJobSaveMessage] = useState("");

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
  const [spoolSizeGrams, setSpoolSizeGrams] = useState("1000");
  const [remainingFilamentGrams, setRemainingFilamentGrams] = useState("1000");
  const [materialType, setMaterialType] = useState<MaterialType>("PLA");
  const [filamentColor, setFilamentColor] = useState("#00ff88");
  const [selectedPrinter, setSelectedPrinter] = useState(PRINTER_OPTIONS[0].name);

  const [models, setModels] = useState<ViewerModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<WorkspaceTool>("move");
  const [modelFootprints, setModelFootprints] = useState<Record<string, ModelFootprint>>({});
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
    setModelFootprints({});
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
  }, []);

  const selectedMaterialConfig = useMemo(
    () => MATERIAL_LIBRARY[materialType],
    [materialType]
  );

  useEffect(() => {
    const materialDensity = selectedMaterialConfig.density;
    const modelGrams = modelVolume * materialDensity * PRINT_EFFICIENCY;
    const supportGrams = modelGrams * SUPPORT_FACTOR;
    const totalGrams = modelGrams + supportGrams;

    setModelFilamentUsed(modelGrams);
    setSupportFilamentUsed(supportGrams);
    setFilamentUsed(totalGrams.toFixed(2));

    const volumeMm3 = modelVolume * 1000;
    const baseFlowRate = 12; // mm3/s at 60 mm/s baseline speed
    const flowRateMm3PerSecond = Math.max(
      1,
      baseFlowRate * (selectedMaterialConfig.defaultSpeed / 60)
    );
    const estimatedHours = volumeMm3 / flowRateMm3PerSecond / 3600;
    setEstimatedPrintTime(estimatedHours);
    setPrintTimeHours(estimatedHours.toFixed(2));
  }, [modelVolume, selectedMaterialConfig]);

  const handleModelFootprintsChange = useCallback((payload: Record<string, ModelFootprint>) => {
    setModelFootprints(payload);
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

  const {
    requiredFilament,
    remainingFilament,
    afterPrintRemaining,
    isSpoolSufficient,
    spoolUsagePercent,
    spoolBarClass,
  } = useMemo(() => {
    const required = Math.max(parseNumber(filamentUsed), 0);
    const remaining = Math.max(parseNumber(remainingFilamentGrams), 0);
    const after = remaining - required;
    const sufficient = required <= remaining;
    const usagePercent = remaining > 0 ? Math.min((required / remaining) * 100, 100) : required > 0 ? 100 : 0;
    const remainingRatio = remaining > 0 ? after / remaining : -1;

    const barClass = !sufficient
      ? "from-red-500 to-rose-500"
      : remainingRatio <= 0.2
        ? "from-yellow-500 to-amber-400"
        : "from-green-500 to-emerald-400";

    return {
      requiredFilament: required,
      remainingFilament: remaining,
      afterPrintRemaining: after,
      isSpoolSufficient: sufficient,
      spoolUsagePercent: usagePercent,
      spoolBarClass: barClass,
    };
  }, [filamentUsed, remainingFilamentGrams]);

  const {
    occupiedPlateArea,
    plateArea,
    utilizationPercent,
    freePercent,
    estimatedAdditionalModels,
  } = useMemo(() => {
    const footprintAreas = models
      .map((model) => {
        const footprint = modelFootprints[model.id];
        if (!footprint) return 0;
        return Math.max(footprint.width, 0) * Math.max(footprint.depth, 0);
      })
      .filter((area) => area > 0);

    const occupiedArea = footprintAreas.reduce((sum, area) => sum + area, 0);
    const plateArea =
      selectedPrinterDetails.buildVolume.width *
      selectedPrinterDetails.buildVolume.depth;
    const used = plateArea > 0 ? (occupiedArea / plateArea) * 100 : 0;
    const clampedUsed = Math.min(Math.max(used, 0), 100);
    const free = Math.max(0, 100 - clampedUsed);
    const freeArea = Math.max(0, plateArea - occupiedArea);

    const averageFootprint =
      footprintAreas.length > 0
        ? footprintAreas.reduce((sum, area) => sum + area, 0) / footprintAreas.length
        : 0;

    const estimatedAdditional =
      averageFootprint > 0 ? Math.floor(freeArea / averageFootprint) : 0;

    return {
      occupiedPlateArea: occupiedArea,
      plateArea,
      utilizationPercent: clampedUsed,
      freePercent: free,
      estimatedAdditionalModels: Math.max(0, estimatedAdditional),
    };
  }, [models, modelFootprints, selectedPrinterDetails]);

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

  const handleModelPositionChange = useCallback(
    (payload: { modelId: string; positionX: number; positionY: number }) => {
      const halfW = selectedPrinterDetails.buildVolume.width / 2;
      const halfD = selectedPrinterDetails.buildVolume.depth / 2;

      setModels((prev) =>
        prev.map((model) => {
          if (model.id !== payload.modelId) return model;
          return {
            ...model,
            positionX: Math.min(Math.max(payload.positionX, -halfW), halfW),
            positionY: Math.min(Math.max(payload.positionY, -halfD), halfD),
          };
        })
      );
    },
    [selectedPrinterDetails.buildVolume.width, selectedPrinterDetails.buildVolume.depth]
  );

  const duplicateSelectedModel = () => {
    if (!selectedModel) return;

    const halfW = selectedPrinterDetails.buildVolume.width / 2;
    const halfD = selectedPrinterDetails.buildVolume.depth / 2;
    const duplicateId = `${Date.now()}-copy-${Math.random().toString(36).slice(2, 8)}`;
    const duplicated: ViewerModel = {
      ...selectedModel,
      id: duplicateId,
      name: `${selectedModel.name.replace(/(\.[^.]+)?$/, "")}-copy${selectedModel.name.includes(".") ? selectedModel.name.slice(selectedModel.name.lastIndexOf(".")) : ""}`,
      positionX: Math.min(Math.max(selectedModel.positionX + 25, -halfW), halfW),
      positionY: Math.min(Math.max(selectedModel.positionY + 25, -halfD), halfD),
    };

    setModels((prev) => [...prev, duplicated]);
    setSelectedModelId(duplicateId);
  };

  const deleteSelectedModel = () => {
    if (!selectedModelId) return;

    setModels((prev) => {
      const index = prev.findIndex((m) => m.id === selectedModelId);
      const next = prev.filter((m) => m.id !== selectedModelId);

      if (next.length === 0) {
        setSelectedModelId(null);
      } else {
        const fallbackIndex = Math.min(index, next.length - 1);
        setSelectedModelId(next[fallbackIndex].id);
      }

      return next;
    });
  };

  const handleSaveJob = () => {
    const hasModels = models.length > 0;
    const primaryModel = selectedModel?.name ?? models[0]?.name ?? "Untitled Model";

    const jobLabel = hasModels
      ? models.length > 1
        ? `${primaryModel} +${models.length - 1} more`
        : primaryModel
      : "No model loaded";

    addSavedPrintJob({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      jobName: `Job ${new Date().toLocaleString()}`,
      modelName: jobLabel,
      material: selectedMaterialConfig.name,
      filamentUsed: Math.max(parseNumber(filamentUsed), 0),
      estimatedPrintTime: Math.max(parseNumber(printTimeHours), 0),
      priceQuote: instantPriceQuote,
      printer: selectedPrinter,
      status: "Pending",
      dateCreated: new Date().toISOString(),
    });

    setJobSaveMessage("Job saved successfully.");
    window.setTimeout(() => setJobSaveMessage(""), 2200);
  };

  const autoArrangeModels = () => {
    if (models.length === 0) return;

    const spacing = 10;
    const halfW = selectedPrinterDetails.buildVolume.width / 2;
    const halfD = selectedPrinterDetails.buildVolume.depth / 2;
    const minX = -halfW + spacing;
    const maxX = halfW - spacing;
    const maxY = halfD - spacing;

    const normalizeRotation = (deg: number) => {
      const wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
      return wrapped;
    };

    const placementQueue = models.map((model) => {
      const footprint = modelFootprints[model.id];
      const width = Math.max(footprint?.width ?? 20, 1);
      const depth = Math.max(footprint?.depth ?? 20, 1);

      return {
        id: model.id,
        width,
        depth,
        area: width * depth,
      };
    });

    // Place larger models first for better plate utilization.
    placementQueue.sort((a, b) => b.area - a.area);

    let cursorX = minX;
    let cursorY = -halfD + spacing;
    let rowDepth = 0;
    let capacityReached = false;

    const planned = new Map<
      string,
      { positionX: number; positionY: number; rotationZ: number }
    >();

    const tryPlace = (candidate: { width: number; depth: number }) => {
      if (cursorX + candidate.width > maxX) return null;
      if (cursorY + candidate.depth > maxY) return null;

      return {
        positionX: cursorX + candidate.width / 2,
        positionY: cursorY + candidate.depth / 2,
      };
    };

    for (const candidate of placementQueue) {
      const baseOrientation = { width: candidate.width, depth: candidate.depth, rotated: false };
      const rotatedOrientation = { width: candidate.depth, depth: candidate.width, rotated: true };

      let place = tryPlace(baseOrientation);
      let orientation = baseOrientation;

      const rotatedPlace = tryPlace(rotatedOrientation);

      if (!place && rotatedPlace) {
        place = rotatedPlace;
        orientation = rotatedOrientation;
      } else if (place && rotatedPlace) {
        const baseRemaining = maxX - (cursorX + baseOrientation.width);
        const rotatedRemaining = maxX - (cursorX + rotatedOrientation.width);
        if (rotatedRemaining < baseRemaining) {
          place = rotatedPlace;
          orientation = rotatedOrientation;
        }
      }

      if (!place) {
        cursorX = minX;
        cursorY += rowDepth + spacing;
        rowDepth = 0;

        place = tryPlace(baseOrientation);
        orientation = baseOrientation;

        const rotatedPlaceOnNextRow = tryPlace(rotatedOrientation);
        if (!place && rotatedPlaceOnNextRow) {
          place = rotatedPlaceOnNextRow;
          orientation = rotatedOrientation;
        } else if (place && rotatedPlaceOnNextRow) {
          const baseRemaining = maxX - (cursorX + baseOrientation.width);
          const rotatedRemaining = maxX - (cursorX + rotatedOrientation.width);
          if (rotatedRemaining < baseRemaining) {
            place = rotatedPlaceOnNextRow;
            orientation = rotatedOrientation;
          }
        }
      }

      if (!place) {
        capacityReached = true;
        continue;
      }

      const sourceModel = models.find((m) => m.id === candidate.id);
      if (!sourceModel) continue;

      planned.set(candidate.id, {
        positionX: place.positionX,
        positionY: place.positionY,
        rotationZ: orientation.rotated
          ? normalizeRotation(sourceModel.rotationZ + 90)
          : sourceModel.rotationZ,
      });

      cursorX += orientation.width + spacing;
      rowDepth = Math.max(rowDepth, orientation.depth);
    }

    const nextModels = models.map((model) => {
      const placement = planned.get(model.id);
      if (!placement) {
        return model;
      }

      return {
        ...model,
        positionX: placement.positionX,
        positionY: placement.positionY,
        rotationZ: placement.rotationZ,
      };
    });

    setModels(nextModels);

    if (capacityReached || planned.size !== models.length) {
      alert("Plate capacity reached. Some models could not be placed.");
    }
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
    <div className="layerledger-content space-y-6">
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

            <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "move", label: "Move" },
                  { key: "rotate", label: "Rotate" },
                  { key: "scale", label: "Scale" },
                ].map((tool) => (
                  <button
                    key={tool.key}
                    type="button"
                    onClick={() => setActiveTool(tool.key as WorkspaceTool)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                      activeTool === tool.key
                        ? "border-green-400/40 bg-green-500/15 text-green-300"
                        : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={duplicateSelectedModel}
                  disabled={!selectedModel}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Duplicate
                </button>

                <button
                  type="button"
                  onClick={autoArrangeModels}
                  disabled={models.length === 0}
                  className="rounded-xl border border-green-400/30 bg-green-500/15 px-3 py-2 text-xs font-semibold text-green-300 transition-all hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Smart Arrange
                </button>

                <button
                  type="button"
                  onClick={deleteSelectedModel}
                  disabled={!selectedModel}
                  className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete
                </button>

                <button
                  type="button"
                  onClick={handleSaveJob}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20"
                >
                  Save Job
                </button>
              </div>

              {jobSaveMessage ? (
                <p className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  {jobSaveMessage}
                </p>
              ) : null}

              {selectedModel ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-slate-400">Selected: <span className="text-white">{selectedModel.name}</span></p>

                  {activeTool === "move" && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-400">Move X (mm)</span>
                        <input
                          type="number"
                          value={selectedModel.positionX.toFixed(2)}
                          onChange={(e) =>
                            updateSelectedModel((current) => ({
                              ...current,
                              positionX: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-400">Move Y (mm)</span>
                        <input
                          type="number"
                          value={selectedModel.positionY.toFixed(2)}
                          onChange={(e) =>
                            updateSelectedModel((current) => ({
                              ...current,
                              positionY: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white"
                        />
                      </label>
                    </div>
                  )}

                  {activeTool === "rotate" && (
                    <div className="mt-3">
                      <label className="mb-1 block text-xs text-slate-400">Rotate Z ({selectedModel.rotationZ.toFixed(0)} deg)</label>
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
                  )}

                  {activeTool === "scale" && (
                    <div className="mt-3">
                      <label className="mb-1 block text-xs text-slate-400">Scale ({Math.round(selectedModel.scale * 100)}%)</label>
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
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">Select a model from the list or click one in the viewer to edit it.</p>
              )}
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
                onSelectModel={setSelectedModelId}
                onModelPositionChange={handleModelPositionChange}
                onModelFootprintsChange={handleModelFootprintsChange}
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

            {selectedModel ? (
              <div className="mt-5 border-t border-white/10 pt-4 text-xs text-slate-400">
                Use the floating toolbar above the viewer to move, rotate, scale, duplicate, or delete the selected model.
              </div>
            ) : null}
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

          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Plate Utilization</h2>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <span>Used Plate Area</span>
                <span className="text-green-300 font-semibold">{utilizationPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Free Plate Area</span>
                <span className="text-slate-200 font-semibold">{freePercent.toFixed(1)}%</span>
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-700/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${utilizationPercent.toFixed(2)}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="rounded-xl border border-white/8 bg-slate-900/70 p-3">
                <p>Occupied Area</p>
                <p className="mt-1 text-sm font-semibold text-slate-200">{occupiedPlateArea.toFixed(0)} mm²</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-900/70 p-3">
                <p>Total Plate Area</p>
                <p className="mt-1 text-sm font-semibold text-slate-200">{plateArea.toFixed(0)} mm²</p>
              </div>
            </div>

            <p className="mt-4 rounded-xl border border-green-400/20 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              Approximately {estimatedAdditionalModels} more models may fit on this plate.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Filament Spool</h2>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">Spool Size</span>
                <select
                  value={spoolSizeGrams}
                  onChange={(e) => {
                    setSpoolSizeGrams(e.target.value);
                    setRemainingFilamentGrams(e.target.value);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                >
                  {SPOOL_SIZES.map((spool) => (
                    <option key={spool.grams} value={String(spool.grams)}>
                      {spool.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">Remaining Filament (grams)</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={remainingFilamentGrams}
                  onChange={(e) => setRemainingFilamentGrams(e.target.value.replace(/-/g, ""))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                />
              </label>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <span>Remaining Filament</span>
                <span className="font-semibold text-slate-100">{remainingFilament.toFixed(2)}g</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>This Print Uses</span>
                <span className="font-semibold text-slate-100">{requiredFilament.toFixed(2)}g</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Remaining After Print</span>
                <span className={`font-semibold ${afterPrintRemaining < 0 ? "text-red-300" : "text-slate-100"}`}>
                  {afterPrintRemaining.toFixed(2)}g
                </span>
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-700/70">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${spoolBarClass} transition-all duration-300`}
                style={{ width: `${spoolUsagePercent.toFixed(2)}%` }}
              />
            </div>

            {!isSpoolSufficient ? (
              <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                Not enough filament on current spool.
              </p>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-green-400/20 bg-gradient-to-br from-green-500/20 via-emerald-500/12 to-slate-950/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Instant Price Quote</h2>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-200">
              <span>Material Type</span>
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${selectedMaterialConfig.badgeClass}`}>
                {selectedMaterialConfig.name}
              </span>
            </div>
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

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-slate-200">Material Type</label>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${selectedMaterialConfig.badgeClass}`}>
                  {selectedMaterialConfig.name}
                </span>
              </div>

              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
              >
                {(Object.keys(MATERIAL_LIBRARY) as MaterialType[]).map((materialKey) => (
                  <option key={materialKey} value={materialKey}>
                    {MATERIAL_LIBRARY[materialKey].name}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(MATERIAL_LIBRARY) as MaterialType[]).map((materialKey) => (
                  <span
                    key={materialKey}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${MATERIAL_LIBRARY[materialKey].badgeClass}`}
                  >
                    {MATERIAL_LIBRARY[materialKey].name}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-white/8 bg-slate-950/60 p-3 text-xs text-slate-300">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Material Density</span>
                  <span className="font-semibold text-slate-100">{selectedMaterialConfig.density.toFixed(2)} g/cm3</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Typical Print Speed</span>
                  <span className="font-semibold text-slate-100">{selectedMaterialConfig.defaultSpeed} mm/s</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Temperature Range</span>
                  <span className="font-semibold text-slate-100">{selectedMaterialConfig.temperature}</span>
                </div>
              </div>
            </div>

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
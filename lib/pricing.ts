export type PricingInput = {
  materialCostPerGram: number;
  filamentUsedGrams: number;
  printTimeHours: number;
  machineCostPerHour: number;
  electricityCostPerHour: number;
  laborCost?: number;
  accessoriesCost?: number;
  packagingCost?: number;
  shippingCost?: number;
  failureRatePercent?: number;
  profitMarginPercent?: number;
  gstPercent?: number;
};

export type PricingBreakdown = {
  materialCost: number;
  machineCost: number;
  electricityCost: number;
  laborCost: number;
  accessoriesCost: number;
  packagingCost: number;
  shippingCost: number;
  baseCost: number;
  adjustedCost: number;
  profitAmount: number;
  finalPrice: number;
  gstAmount: number;
  finalPriceWithGST: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const toNumber = (value: string | number | undefined | null) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculatePricingBreakdown = (input: PricingInput): PricingBreakdown => {
  const materialCostPerGram = toNumber(input.materialCostPerGram);
  const filamentUsedGrams = toNumber(input.filamentUsedGrams);
  const printTimeHours = toNumber(input.printTimeHours);
  const machineCostPerHour = toNumber(input.machineCostPerHour);
  const electricityCostPerHour = toNumber(input.electricityCostPerHour);

  const laborCost = toNumber(input.laborCost);
  const accessoriesCost = toNumber(input.accessoriesCost);
  const packagingCost = toNumber(input.packagingCost);
  const shippingCost = toNumber(input.shippingCost);

  const failureRatePercent = clamp(toNumber(input.failureRatePercent), 0, 99);
  const profitMarginPercent = Math.max(toNumber(input.profitMarginPercent), 0);
  const gstPercent = Math.max(toNumber(input.gstPercent), 0);

  const materialCost = materialCostPerGram * filamentUsedGrams;
  const machineCost = printTimeHours * machineCostPerHour;
  const electricityCost = printTimeHours * electricityCostPerHour;

  const baseCost =
    materialCost +
    machineCost +
    electricityCost +
    laborCost +
    accessoriesCost +
    packagingCost +
    shippingCost;

  const adjustedCost = baseCost / (1 - failureRatePercent / 100);
  const profitAmount = adjustedCost * (profitMarginPercent / 100);
  const finalPrice = adjustedCost + profitAmount;
  const gstAmount = finalPrice * (gstPercent / 100);
  const finalPriceWithGST = finalPrice + gstAmount;

  return {
    materialCost,
    machineCost,
    electricityCost,
    laborCost,
    accessoriesCost,
    packagingCost,
    shippingCost,
    baseCost,
    adjustedCost,
    profitAmount,
    finalPrice,
    gstAmount,
    finalPriceWithGST,
  };
};

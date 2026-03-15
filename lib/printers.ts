export type PrinterOption = {
  name: string;
  buildVolume: { width: number; depth: number; height: number };
};

export type PrinterProfile = {
  power: number;
  speed: number;
  machineCostPerHour: number;
};

export const PRINTER_OPTIONS: PrinterOption[] = [
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

export const PRINTER_PROFILES: Record<string, PrinterProfile> = {
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

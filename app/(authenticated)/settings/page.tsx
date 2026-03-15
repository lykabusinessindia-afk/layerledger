"use client";

import { useEffect, useState } from "react";

type SettingsState = {
  filamentPrice: string;
  electricityRate: string;
  machinePower: string;
  machineCostPerHour: string;
};

const STORAGE_KEY = "layerledger-settings";

const DEFAULT_SETTINGS: SettingsState = {
  filamentPrice: "1200",
  electricityRate: "10",
  machinePower: "250",
  machineCostPerHour: "20",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<SettingsState>;
      setSettings({
        filamentPrice: parsed.filamentPrice ?? DEFAULT_SETTINGS.filamentPrice,
        electricityRate: parsed.electricityRate ?? DEFAULT_SETTINGS.electricityRate,
        machinePower: parsed.machinePower ?? DEFAULT_SETTINGS.machinePower,
        machineCostPerHour: parsed.machineCostPerHour ?? DEFAULT_SETTINGS.machineCostPerHour,
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const updateField = (key: keyof SettingsState, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value.replace(/-/g, "") }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaveMessage("Settings saved successfully.");
    setTimeout(() => setSaveMessage(""), 2500);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-green-300">Settings</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Workspace Defaults</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">
          Configure your default pricing and machine assumptions so every quote starts with consistent baseline values.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Calculator Defaults</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Default Filament Price (per KG)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.filamentPrice}
                onChange={(e) => updateField("filamentPrice", e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Electricity Rate (per kWh)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.electricityRate}
                onChange={(e) => updateField("electricityRate", e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Machine Power (Watts)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.machinePower}
                onChange={(e) => updateField("machinePower", e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Machine Cost Per Hour</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.machineCostPerHour}
                onChange={(e) => updateField("machineCostPerHour", e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-500"
            >
              Save Settings
            </button>
            {saveMessage ? <p className="text-sm text-green-300">{saveMessage}</p> : null}
          </div>
        </div>

        <aside className="rounded-[24px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Current Defaults</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="flex justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
              <span>Filament Price</span>
              <span>₹ {settings.filamentPrice || "0"}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
              <span>Electricity Rate</span>
              <span>₹ {settings.electricityRate || "0"}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
              <span>Machine Power</span>
              <span>{settings.machinePower || "0"} W</span>
            </div>
            <div className="flex justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
              <span>Machine Cost / hr</span>
              <span>₹ {settings.machineCostPerHour || "0"}</span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

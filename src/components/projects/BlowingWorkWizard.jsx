import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ChevronLeft, Check, Wind } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CABLE_TYPES = [
  "2x12 Minikabel",
  "8x12 Minikabel",
  "6R/22",
  "12R/44",
  "24R/88",
  "48R/176",
  "96R/352",
];

const SNR_COLORS = [
  { name: "Rot",        hex: "#ff0000" },
  { name: "Grün",       hex: "#00cc00" },
  { name: "Blau",       hex: "#0000ff" },
  { name: "Gelb",       hex: "#ffff00" },
  { name: "Weiß",       hex: "#ffffff" },
  { name: "Grau",       hex: "#b0b0b0" },
  { name: "Braun",      hex: "#7b3f00" },
  { name: "Violett",    hex: "#8080c0" },
  { name: "Türkis",     hex: "#00ffff" },
  { name: "Schwarz",    hex: "#000000" },
  { name: "Orange",     hex: "#ff9900" },
  { name: "Rosa",       hex: "#ffb6c1" },
];

const STEPS = [
  { id: 1, title: "Kabelmeter", desc: "Anfang & Ende" },
  { id: 2, title: "Kabelart",   desc: "Typ auswählen" },
  { id: 3, title: "SNR Farbe",  desc: "Farbe wählen" },
  { id: 4, title: "Zusammenfassung", desc: "Überprüfen & Speichern" },
];

export default function BlowingWorkWizard({ project, onClose, onSaved, user }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    start_cable_meters: "",
    end_cable_meters: "",
    point_a: "",
    point_b: "",
    cable_type: "",
    snr_color: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const metersBlown = () => {
    const start = parseFloat(data.start_cable_meters);
    const end = parseFloat(data.end_cable_meters);
    if (!isNaN(start) && !isNaN(end) && end > start) return (end - start).toFixed(1);
    return null;
  };

  const canNext = () => {
    if (step === 1) return data.start_cable_meters !== "" && data.end_cable_meters !== "" && parseFloat(data.end_cable_meters) > parseFloat(data.start_cable_meters) && data.point_a !== "" && data.point_b !== "";
    if (step === 2) return data.cable_type !== "";
    if (step === 3) return data.snr_color !== "";
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    const blown = parseFloat(data.end_cable_meters) - parseFloat(data.start_cable_meters);
    await base44.entities.BlowingWork.create({
      project_id: project.id,
      start_cable_meters: parseFloat(data.start_cable_meters),
      end_cable_meters: parseFloat(data.end_cable_meters),
      meters_blown: blown,
      point_a: data.point_a,
      point_b: data.point_b,
      cable_type: data.cable_type,
      snr_color: data.snr_color,
      notes: data.notes,
      foreman_user_id: user?.id || "",
      foreman_name: user?.full_name || "",
      documentation_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  const snrColorObj = SNR_COLORS.find(c => c.name === data.snr_color);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5" />
              <h2 className="text-lg font-bold">Einblasarbeiten</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
          {/* Step indicators */}
          <div className="flex gap-2">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`flex-1 text-center py-1 px-2 rounded-lg text-xs font-medium transition-all ${
                  step === s.id
                    ? "bg-white text-teal-700"
                    : step > s.id
                    ? "bg-white/40 text-white"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {step > s.id ? <Check className="w-3 h-3 inline" /> : s.id}
                <span className="ml-1 hidden sm:inline">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-5 min-h-[280px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Kabelmeter erfassen</h3>
                  <p className="text-sm text-gray-500">Gib den Anfangs- und Endmeter des Kabels ein.</p>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Punkt A (Startpunkt)</Label>
                      <Input
                        placeholder="z.B. M10"
                        className="mt-1"
                        value={data.point_a}
                        onChange={e => setData(d => ({ ...d, point_a: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Punkt B (Endpunkt)</Label>
                      <Input
                        placeholder="z.B. M20"
                        className="mt-1"
                        value={data.point_b}
                        onChange={e => setData(d => ({ ...d, point_b: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Anfang Kabel (m)</Label>
                    <Input
                      type="number"
                      placeholder="z.B. 0"
                      className="mt-1 text-lg"
                      value={data.start_cable_meters}
                      onChange={e => setData(d => ({ ...d, start_cable_meters: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Ende Kabel (m)</Label>
                    <Input
                      type="number"
                      placeholder="z.B. 125"
                      className="mt-1 text-lg"
                      value={data.end_cable_meters}
                      onChange={e => setData(d => ({ ...d, end_cable_meters: e.target.value }))}
                    />
                  </div>
                  {metersBlown() && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-teal-700 font-medium">Eingeblasene Meter:</span>
                      <Badge className="bg-teal-600 text-white text-base px-3">{metersBlown()} m</Badge>
                    </div>
                  )}
                  {data.start_cable_meters && data.end_cable_meters && !metersBlown() && (
                    <p className="text-xs text-red-500">Ende muss größer als Anfang sein.</p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Kabelart auswählen</h3>
                  <p className="text-sm text-gray-500">Welcher Kabeltyp wurde eingeblasen?</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {CABLE_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setData(d => ({ ...d, cable_type: type }))}
                      className={`px-4 py-3 rounded-xl border-2 text-left font-medium transition-all ${
                        data.cable_type === type
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">SNR Farbe wählen</h3>
                  <p className="text-sm text-gray-500">Welche Kabelfarbe wurde verwendet?</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SNR_COLORS.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setData(d => ({ ...d, snr_color: color.name }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        data.snr_color === color.name
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300 shadow"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs font-medium text-gray-700">{color.name}</span>
                      {data.snr_color === color.name && <Check className="w-3 h-3 text-teal-600" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Zusammenfassung</h3>
                  <p className="text-sm text-gray-500">Alle Angaben überprüfen und speichern.</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <Row label="Punkt A → Punkt B" value={<span className="font-semibold text-teal-700">{data.point_a} → {data.point_b}</span>} />
                  <Row label="Anfang Kabel" value={`${data.start_cable_meters} m`} />
                  <Row label="Ende Kabel" value={`${data.end_cable_meters} m`} />
                  <div className="border-t pt-3">
                    <Row label="Eingeblasen" value={<Badge className="bg-teal-600 text-white">{metersBlown()} m</Badge>} />
                  </div>
                  <Row label="Kabelart" value={data.cable_type} />
                  <Row
                    label="SNR Farbe"
                    value={
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: snrColorObj?.hex }} />
                        <span>{data.snr_color}</span>
                      </div>
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Notizen (optional)</Label>
                  <textarea
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                    rows={2}
                    placeholder="Optionale Anmerkungen..."
                    value={data.notes}
                    onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              Weiter <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {saving ? "Speichert..." : <><Check className="w-4 h-4 mr-1" /> Speichern</>}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
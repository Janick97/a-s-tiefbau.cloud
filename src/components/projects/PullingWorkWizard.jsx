import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Check, Cable } from "lucide-react";
import { Material, PullingWork, ProjectMaterial } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import MultiTubeSelector from "./MultiTubeSelector";

// ─── Farben (gleiche wie beim Einblasen) ──────────────────────────────────────
const SNR_COLORS = [
  { name: "Rot",      hex: "#ff0000" },
  { name: "Grün",     hex: "#00cc00" },
  { name: "Blau",     hex: "#0000ff" },
  { name: "Gelb",     hex: "#ffff00" },
  { name: "Weiß",     hex: "#ffffff" },
  { name: "Grau",     hex: "#b0b0b0" },
  { name: "Braun",    hex: "#7b3f00" },
  { name: "Violett",  hex: "#8080c0" },
  { name: "Türkis",   hex: "#00ffff" },
  { name: "Schwarz",  hex: "#000000" },
  { name: "Orange",   hex: "#ff9900" },
  { name: "Rosa",     hex: "#ffb6c1" },
];

// ─── SNRVerband Materialien (statisch) ────────────────────────────────────────
const SNR_VERBAND_MATERIALS = [
  { article: "40317871", name: "SNRVe 3x12 orange" },
  { article: "40374388", name: "SNRVe 3x12 orange/schwarz" },
  { article: "40374391", name: "SNRVe 3x12 orange/weiß" },
  { article: "40374392", name: "SNRVe 3x12 orange/rot" },
  { article: "40274727", name: "SNRVe 7x12 orange" },
  { article: "40274728", name: "SNRVe 7x12 orange/schwarz" },
  { article: "40374393", name: "SNRVe 7x12 orange/weiß" },
  { article: "40374395", name: "SNRVe 7x12 orange/rot" },
  { article: "40980194", name: "SNRVe 7x12 orange/grün" },
  { article: "40980196", name: "SNRVe 7x12 orange/blau" },
  { article: "40980198", name: "SNRVe 7x12 orange/gelb" },
  { article: "40980200", name: "SNRVe 7x12 orange/braun" },
  { article: "40770321", name: "SNRVe 12x12 orange" },
  { article: "40770322", name: "SNRVe 12x12 orange/schwarz" },
  { article: "40770323", name: "SNRVe 12x12 orange/weiß" },
  { article: "40770324", name: "SNRVe 12x12 orange/rot" },
  { article: "40980202", name: "SNRVe 12x12 orange/grün" },
  { article: "40980204", name: "SNRVe 12x12 orange/blau" },
  { article: "40980206", name: "SNRVe 12x12 orange/gelb" },
  { article: "40980208", name: "SNRVe 12x12 orange/braun" },
  { article: "40263173", name: "SNRVe 22x7+1x12 orange" },
  { article: "40263174", name: "SNRVe 22x7+1x12 orange mit schwarz" },
  { article: "40263175", name: "SNRVe 22x7+1x12 orange mit weiß" },
  { article: "40263177", name: "SNRVe 22x7+1x12 orange mit rot" },
  { article: "40263178", name: "SNRVe 8x7+1x12 orange" },
  { article: "40263179", name: "SNRVe 8x7+1x12 orange mit schwarz" },
  { article: "40263180", name: "SNRVe 8x7+1x12 orange mit weiß" },
  { article: "40263181", name: "SNRVe 8x7+1x12 orange mit rot" },
];

// ─── Mehrfachrohr (statisch) ──────────────────────────────────────────────────
const MEHRFACHROHR_MATERIALS = [
  { article: "40101299", name: "Mehrfachrohr aus HDPE" },
];

// ─── Einzieh-Kategorien ───────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "einzelne_snr",  label: "Einzelne SNR",  desc: "Einzelne SNR-Farbe einziehen" },
  { id: "snr_verband",   label: "SNRVerband",     desc: "SNR-Verband mit Materialnummer" },
  { id: "kupferkabel",   label: "Kabel",          desc: "Kabel aus Materialliste" },
  { id: "mehrfachrohr",  label: "Mehrfachrohr",   desc: "HDPE Mehrfachrohr" },
];

// ─── In was wurde eingezogen (Rohrtypen) ──────────────────────────────────────
const PULL_INTO_OPTIONS = [
  "Leerrohr",
  "Mikro-Rohr",
  "Kabelformstein",
  "Kabelkanal",
  "Mehrfachrohr",
  "Erdreich (direkt)",
  "Gebäude",
  "Sonstiges",
];

// ─── Rohr-Status (belegt/leer) ────────────────────────────────────────────────
const PIPE_STATUS = [
  { id: "belegt", label: "Belegt", desc: "Rohr war bereits mit Kabel belegt" },
  { id: "leer", label: "Leer", desc: "Rohr war noch leer" },
];

// ─── Rohrdurchmesser (mm) ────────────────────────────────────────────────────
const PIPE_SIZES = [
  { id: "50", label: "50 mm" },
  { id: "110", label: "110 mm" },
  { id: "125", label: "125 mm" },
];

const STEPS = [
  { id: 1, title: "Was wird eingezogen?" },
  { id: 2, title: "Details" },
  { id: 3, title: "Zusammenfassung" },
];

export default function PullingWorkWizard({ onClose, onSaved, project, user, existingWork }) {
  const isEdit = !!existingWork;
  const [step, setStep] = useState(1);
  const [copperMaterials, setCopperMaterials] = useState([]);

  const [data, setData] = useState({
    category: existingWork?.cable_type?.split("|")[0] || "",
    selectedColors: existingWork?.connected_colors || [],
    selectedMaterial: existingWork?.cable_type?.split("|")[1] || "",
    selectedMaterialId: null,
    selectedTubes: [],
    pulledIntoTubes: [],
    point_a: existingWork?.start_point || "",
    point_b: existingWork?.end_point || "",
    pull_into: existingWork?.work_description?.split("|")[0] || "",
    pipeStatus: existingWork?.work_description?.split("|")[1] || "",
    pipeSize: existingWork?.work_description?.split("|")[2] || "",
    meters: existingWork?.cable_length || "",
    notes: existingWork?.notes || "",
  });

  useEffect(() => {
    Material.list().then(mats => {
      const copper = (mats || []).filter(m => m.category === "Kabel");
      setCopperMaterials(copper);
    }).catch(() => {});
  }, []);

  const setField = (field, value) => setData(d => ({ ...d, [field]: value }));

  // ─── Step 1 validation ────────────────────────────────────────────────────
  const toggleColor = (colorName) => {
    setData(d => ({
      ...d,
      selectedColors: d.selectedColors.includes(colorName)
        ? d.selectedColors.filter(c => c !== colorName)
        : [...d.selectedColors, colorName]
    }));
  };

  const step1Valid = () => {
    if (!data.category) return false;
    if (data.category === "einzelne_snr" && data.selectedColors.length === 0) return false;
    if (data.category === "snr_verband" && !data.selectedMaterial) return false;
    if (data.category === "kupferkabel" && !data.selectedMaterial) return false;
    if (data.category === "mehrfachrohr" && (!data.selectedMaterial || data.selectedTubes.length === 0)) return false;
    return true;
  };

  const step2Valid = () => {
    if (!data.point_a || !data.point_b || !data.pull_into || !data.meters) return false;
    if (data.pull_into === "Leerrohr" && !data.pipeStatus) return false;
    if (data.pipeStatus === "leer" && !data.pipeSize) return false;
    if (data.pull_into === "Mehrfachrohr" && data.pulledIntoTubes.length === 0) return false;
    return true;
  };

  // ─── Build display label ──────────────────────────────────────────────────
  const getMaterialLabel = () => {
    if (data.category === "einzelne_snr") return `Einzelne SNR – ${data.selectedColors.join(", ")}`;
    if (data.category === "snr_verband") return data.selectedMaterial;
    if (data.category === "kupferkabel") return data.selectedMaterial;
    if (data.category === "mehrfachrohr") return data.selectedMaterial;
    return "";
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    let foremanName = existingWork?.foreman || "Nicht zugewiesen";
    let foremanUserId = existingWork?.foreman_user_id || "";
    if (!isEdit) {
      try {
        const me = user || await base44.auth.me();
        if (me?.full_name) { foremanName = me.full_name; foremanUserId = me.id || ""; }
      } catch {}
    }
    // Build work_description with pipe info
    let workDesc = data.pull_into;
    if (data.pipeStatus) workDesc += `|${data.pipeStatus}`;
    if (data.pipeSize) workDesc += `|${data.pipeSize}`;

    const payload = {
      project_id: project.id,
      location_name: project.title || "",
      street: project.street || "",
      city: project.city || "",
      cable_type: `${data.category}|${data.selectedMaterial || data.selectedColors.join(",")}`,
      cable_length: parseFloat(data.meters) || 0,
      start_point: data.point_a,
      end_point: data.point_b,
      work_description: workDesc,
      connected_colors: data.selectedColors,
      notes: data.notes,
      status: existingWork?.status || "planned",
      foreman: foremanName,
      foreman_user_id: foremanUserId,
    };

    if (isEdit) {
      await PullingWork.update(existingWork.id, payload);
    } else {
      await PullingWork.create(payload);
    }

    // Automatisch zum Material-Tab hinzufügen wenn Kabel ausgewählt
    if (data.category === "kupferkabel" && data.selectedMaterialId && !isEdit) {
      await ProjectMaterial.create({
        project_id: project.id,
        material_id: data.selectedMaterialId,
        quantity: parseFloat(data.meters) || 1,
        notes: `Einzug: ${data.point_a} → ${data.point_b}`,
      }).catch(() => {});
    }

    onSaved?.();
    onClose();
  };

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
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cable className="w-5 h-5" />
              <h2 className="text-lg font-bold">{isEdit ? "Einziehen bearbeiten" : "Einzieharbeit erfassen"}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
          {/* Step indicators */}
          <div className="flex gap-1.5">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                  step === s.id ? "bg-white text-blue-700" :
                  step > s.id  ? "bg-white/40 text-white" :
                                 "bg-white/10 text-white/60"
                }`}
              >
                {step > s.id ? <Check className="w-3 h-3 inline" /> : s.id}
                <span className="ml-1 hidden sm:inline">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {/* ── STEP 1: Was wird eingezogen ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Was wird eingezogen?</h3>
                  <p className="text-sm text-gray-500 mb-3">Kategorie auswählen</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setField("category", cat.id); setField("selectedMaterial", ""); setField("selectedColor", ""); }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          data.category === cat.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-semibold text-sm">{cat.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Einzelne SNR → Farb-Picker (Mehrfachauswahl) */}
                {data.category === "einzelne_snr" && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Farben auswählen <span className="text-gray-400 font-normal">(mehrere möglich)</span></p>
                    {data.selectedColors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {data.selectedColors.map(c => {
                          const color = SNR_COLORS.find(s => s.name === c);
                          return (
                            <span key={c} className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-300 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                              <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: color?.hex }} />
                              {c}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-2">
                      {SNR_COLORS.map(color => {
                        const isSelected = data.selectedColors.includes(color.name);
                        return (
                          <button
                            key={color.name}
                            onClick={() => toggleColor(color.name)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full border-2 border-gray-300 shadow"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="text-[10px] font-medium text-gray-700 text-center">{color.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SNRVerband → Materialliste */}
                {data.category === "snr_verband" && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Material auswählen</p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {SNR_VERBAND_MATERIALS.map(mat => (
                        <button
                          key={mat.article}
                          onClick={() => setField("selectedMaterial", `${mat.article} – ${mat.name}`)}
                          className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            data.selectedMaterial === `${mat.article} – ${mat.name}`
                              ? "border-blue-500 bg-blue-50 font-medium"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="font-mono text-xs text-gray-500 mr-2">{mat.article}</span>
                          {mat.name}
                        </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Mehrfachrohr → Material + Rohr-Selektion */}
                {data.category === "mehrfachrohr" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Material auswählen</p>
                      <div className="space-y-1.5">
                        {MEHRFACHROHR_MATERIALS.map(mat => (
                          <button
                            key={mat.article}
                            onClick={() => setField("selectedMaterial", `${mat.article} – ${mat.name}`)}
                            className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                              data.selectedMaterial === `${mat.article} – ${mat.name}`
                                ? "border-blue-500 bg-blue-50 font-medium"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span className="font-mono text-xs text-gray-500 mr-2">{mat.article}</span>
                            {mat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {data.selectedMaterial && (
                      <MultiTubeSelector
                        selectedTubes={data.selectedTubes}
                        onChange={(tubes) => setField("selectedTubes", tubes)}
                      />
                    )}
                  </div>
                )}

                {/* Kupferkabel → aus Materialdatenbank */}
                {data.category === "kupferkabel" && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Kupferkabel auswählen</p>
                    {copperMaterials.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Keine Kupferkabel in der Materialliste gefunden.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {copperMaterials.map(mat => (
                          <button
                             key={mat.id}
                             onClick={() => { setField("selectedMaterial", `${mat.article_number} – ${mat.name}`); setField("selectedMaterialId", mat.id); }}
                             className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                               data.selectedMaterial === `${mat.article_number} – ${mat.name}`
                                 ? "border-blue-500 bg-blue-50 font-medium"
                                 : "border-gray-200 hover:border-gray-300"
                             }`}
                           >
                             <span className="font-mono text-xs text-gray-500 mr-2">{mat.article_number}</span>
                             {mat.name}
                           </button>
                         ))}
                         </div>
                         )}
                         </div>
                         )}
              </motion.div>
            )}

            {/* ── STEP 2: Details ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-1">Details der Einzieharbeit</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Punkt A (von)</Label>
                    <Input
                      className="mt-1"
                      placeholder="z.B. HVT-01"
                      value={data.point_a}
                      onChange={e => setField("point_a", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Punkt B (nach)</Label>
                    <Input
                      className="mt-1"
                      placeholder="z.B. NVT-05"
                      value={data.point_b}
                      onChange={e => setField("point_b", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">In was wurde eingezogen?</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PULL_INTO_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          setField("pull_into", opt);
                          if (opt !== "Leerrohr") {
                            setField("pipeStatus", "");
                            setField("pipeSize", "");
                          }
                          if (opt !== "Mehrfachrohr") {
                            setField("pulledIntoTubes", "");
                          }
                        }}
                        className={`px-3 py-2 rounded-xl border-2 text-sm text-left transition-all ${
                          data.pull_into === opt
                            ? "border-blue-500 bg-blue-50 font-medium"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rohr-Status: Belegt oder Leer (nur bei Leerrohr) */}
                {data.pull_into === "Leerrohr" && (
                  <div>
                    <Label className="text-sm font-medium">Rohr-Status</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {PIPE_STATUS.map(status => (
                        <button
                          key={status.id}
                          onClick={() => {
                            setField("pipeStatus", status.id);
                            if (status.id !== "leer") setField("pipeSize", "");
                          }}
                          className={`p-2.5 rounded-xl border-2 text-sm transition-all ${
                            data.pipeStatus === status.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="font-semibold">{status.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{status.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rohrdurchmesser (nur bei Leerrohr + Status gewählt) */}
                {data.pull_into === "Leerrohr" && data.pipeStatus && (
                  <div>
                    <Label className="text-sm font-medium">Rohrdurchmesser</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {PIPE_SIZES.map(size => (
                        <button
                          key={size.id}
                          onClick={() => setField("pipeSize", size.id)}
                          className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                            data.pipeSize === size.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mehrfachrohr-Auswahl (wenn Mehrfachrohr ausgewählt) */}
                {data.pull_into === "Mehrfachrohr" && (
                  <div>
                    <MultiTubeSelector
                      selectedTubes={data.pulledIntoTubes}
                      onChange={(tubes) => setField("pulledIntoTubes", tubes)}
                    />
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Eingezogene Meter (m)</Label>
                  <Input
                    type="number"
                    className="mt-1 text-lg"
                    placeholder="z.B. 45"
                    value={data.meters}
                    onChange={e => setField("meters", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Notizen (optional)</Label>
                  <textarea
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Optionale Anmerkungen..."
                    value={data.notes}
                    onChange={e => setField("notes", e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Zusammenfassung ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-1">Zusammenfassung</h3>
                <p className="text-sm text-gray-500 mb-3">Angaben prüfen und speichern</p>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                  <Row label="Kategorie" value={CATEGORIES.find(c => c.id === data.category)?.label} />
                  <Row label="Material / Farbe" value={getMaterialLabel()} />
                  <div className="border-t pt-3">
                    <Row label="Punkt A → Punkt B" value={<span className="font-semibold text-blue-700">{data.point_a} → {data.point_b}</span>} />
                    <Row label="Eingezogen in" value={data.pull_into} />
                    {data.pipeStatus && (
                      <>
                        <Row label="Rohr-Status" value={PIPE_STATUS.find(p => p.id === data.pipeStatus)?.label} />
                        {data.pipeSize && <Row label="Rohrdurchmesser" value={PIPE_SIZES.find(s => s.id === data.pipeSize)?.label} />}
                      </>
                    )}
                    <Row label="Meter" value={<Badge className="bg-blue-600 text-white">{data.meters} m</Badge>} />
                  </div>
                  {data.notes && <Row label="Notizen" value={data.notes} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-2 flex-shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !step1Valid() : !step2Valid()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Weiter <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Check className="w-4 h-4 mr-1" /> {isEdit ? "Aktualisieren" : "Speichern"}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
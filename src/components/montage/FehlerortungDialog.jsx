import React, { useState } from "react";
import { MontageAuftrag } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, CheckCircle, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

// Chat-Nachricht in den Projekt-Chat schreiben
async function sendChatMessage(projectId, message, userName) {
  const { ProjectComment } = await import("@/entities/all");
  await ProjectComment.create({
    project_id: projectId,
    comment: message,
    user_full_name: userName,
    attachments: []
  });
}

export default function FehlerortungDialog({ montageAuftrag, user, onClose, onReload }) {
  const [step, setStep] = useState('start'); // start | eingemessen | nachgemessen_ergebnis
  const [tiefbauText, setTiefbauText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const montageAuftragId = montageAuftrag.id;
  const projectId = montageAuftrag.id; // Chat läuft auf dem MontageAuftrag als project_id
  const userName = user?.full_name || 'Monteur';

  // Schritt: Eingemessen – Tiefbau erforderlich eingeben
  const handleEingemessen = async () => {
    if (!tiefbauText.trim()) return;
    setIsSaving(true);
    try {
      const msg = `📍 Fehlerortung – Eingemessen\nErforderlicher Tiefbau: ${tiefbauText.trim()}`;
      await sendChatMessage(projectId, msg, userName);
      onReload && onReload();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  // Schritt: Nachgemessen – Störung behoben
  const handleStorungBehoben = async () => {
    setIsSaving(true);
    try {
      const msg = `✅ Fehlerortung – Nachgemessen\nErgebnis: Störung wurde behoben.`;
      await sendChatMessage(projectId, msg, userName);
      onReload && onReload();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  // Schritt: Nachgemessen – Weitere VS / Sonstiges freilegen
  const handleWeitereVS = async () => {
    if (!tiefbauText.trim()) return;
    setIsSaving(true);
    try {
      const msg = `🔍 Fehlerortung – Nachgemessen\nWeitere Maßnahme erforderlich: ${tiefbauText.trim()}`;
      await sendChatMessage(projectId, msg, userName);
      onReload && onReload();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  // Schritt: Nachgemessen – Kabelstück oder weitere Muffe → Tiefbau zurücksetzen
  const handleTiefbauErforderlich = async (art) => {
    setIsSaving(true);
    try {
      const label = art === 'kabel' ? 'Kabelstück muss ausgewechselt werden' : 'Weitere Muffe muss freigelegt werden';
      const msg = `⚠️ Fehlerortung – Nachgemessen\n${label}\n→ Tiefbau ist wieder erforderlich.`;
      await sendChatMessage(projectId, msg, userName);
      // Tiefbau-Status zurücksetzen
      await MontageAuftrag.update(montageAuftragId, { tiefbau_offen: false });
      onReload && onReload();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-yellow-50">
          <div className="flex items-center gap-2">
            {step !== 'start' && (
              <button
                onClick={() => { setStep('start'); setTiefbauText(''); }}
                className="p-1 rounded-lg hover:bg-yellow-100 transition-colors mr-1"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <Search className="w-4 h-4 text-yellow-700" />
            <h3 className="font-bold text-gray-900 text-sm">Fehlerortung</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-yellow-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* SCHRITT 1: Eingemessen oder Nachgemessen? */}
            {step === 'start' && (
              <motion.div key="start" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">Was haben Sie durchgeführt?</p>
                <button
                  onClick={() => setStep('eingemessen')}
                  className="w-full p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all text-left"
                >
                  <div className="font-semibold text-blue-800">📐 Eingemessen</div>
                  <div className="text-xs text-blue-600 mt-0.5">Erstmessung – Tiefbau wird festgelegt</div>
                </button>
                <button
                  onClick={() => setStep('nachgemessen_ergebnis')}
                  className="w-full p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all text-left"
                >
                  <div className="font-semibold text-purple-800">🔁 Nachgemessen</div>
                  <div className="text-xs text-purple-600 mt-0.5">Folgemessung – Ergebnis dokumentieren</div>
                </button>
              </motion.div>
            )}

            {/* SCHRITT 2a: Eingemessen – Tiefbau beschreiben */}
            {step === 'eingemessen' && (
              <motion.div key="eingemessen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Welcher Tiefbau ist erforderlich?</Label>
                  <Input
                    value={tiefbauText}
                    onChange={(e) => setTiefbauText(e.target.value)}
                    placeholder="z.B. VS 10 freilegen, Kabelgraben in Musterstr."
                    className="h-10"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Diese Nachricht wird automatisch im Chat gepostet.</p>
                </div>
                <Button
                  onClick={handleEingemessen}
                  disabled={!tiefbauText.trim() || isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Im Chat posten & speichern
                </Button>
              </motion.div>
            )}

            {/* SCHRITT 2b: Nachgemessen – Ergebnis wählen */}
            {step === 'nachgemessen_ergebnis' && (
              <motion.div key="nachgemessen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <p className="text-sm text-gray-600 mb-1">Was ist das Ergebnis der Nachmessung?</p>

                {/* Störung behoben */}
                <button
                  onClick={handleStorungBehoben}
                  disabled={isSaving}
                  className="w-full p-3.5 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all text-left flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800 text-sm">Störung behoben</div>
                    <div className="text-xs text-green-600">Alles erledigt, kein weiterer Tiefbau nötig</div>
                  </div>
                </button>

                {/* Weitere VS / Sonstiges */}
                <button
                  onClick={() => setStep('weitere_vs')}
                  className="w-full p-3.5 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-all text-left flex items-center gap-3"
                >
                  <Search className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-yellow-800 text-sm">Weitere VS / Sonstiges freilegen</div>
                    <div className="text-xs text-yellow-600">Weitere Maßnahme erforderlich</div>
                  </div>
                </button>

                {/* Kabelstück tauschen → Tiefbau zurücksetzen */}
                <button
                  onClick={() => handleTiefbauErforderlich('kabel')}
                  disabled={isSaving}
                  className="w-full p-3.5 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-all text-left flex items-center gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-red-800 text-sm">Kabelstück muss ausgewechselt werden</div>
                    <div className="text-xs text-red-600">→ Tiefbau-Status wird zurückgesetzt</div>
                  </div>
                </button>

                {/* Weitere Muffe → Tiefbau zurücksetzen */}
                <button
                  onClick={() => handleTiefbauErforderlich('muffe')}
                  disabled={isSaving}
                  className="w-full p-3.5 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-all text-left flex items-center gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-orange-800 text-sm">Weitere Muffe muss freigelegt werden</div>
                    <div className="text-xs text-orange-600">→ Tiefbau-Status wird zurückgesetzt</div>
                  </div>
                </button>

                {isSaving && (
                  <div className="flex items-center justify-center py-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Wird gespeichert...
                  </div>
                )}
              </motion.div>
            )}

            {/* SCHRITT 3: Weitere VS – Tiefbau beschreiben */}
            {step === 'weitere_vs' && (
              <motion.div key="weitere_vs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Was soll freigelegt werden?</Label>
                  <Input
                    value={tiefbauText}
                    onChange={(e) => setTiefbauText(e.target.value)}
                    placeholder="z.B. VS 12 freilegen, nächste Muffe in Richtung..."
                    className="h-10"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Diese Nachricht wird automatisch im Chat gepostet.</p>
                </div>
                <Button
                  onClick={handleWeitereVS}
                  disabled={!tiefbauText.trim() || isSaving}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 h-10"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Im Chat posten & speichern
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
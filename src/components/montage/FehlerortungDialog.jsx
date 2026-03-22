import React, { useState } from "react";
import { MontageAuftrag } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Plus, Package, ClipboardList } from "lucide-react";

async function sendChatMessage(projectId, message, userName) {
  const { ProjectComment } = await import("@/entities/all");
  await ProjectComment.create({
    project_id: projectId,
    comment: message,
    user_full_name: userName,
    attachments: []
  });
}

export default function FehlerortungDialog({ montageAuftrag, user, onClose, onReload, onOpenLeistungWizard }) {
  const [step, setStep] = useState('start');
  const [tiefbauText, setTiefbauText] = useState('');
  const [kabelVon, setKabelVon] = useState('');
  const [kabelBis, setKabelBis] = useState('');
  const [muffeEins, setMuffeEins] = useState('');
  const [muffeZwei, setMuffeZwei] = useState('');
  const [hausanschlussHaus, setHausanschlussHaus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const montageAuftragId = montageAuftrag.id;
  const projectId = montageAuftrag.id;
  const userName = user?.full_name || 'Monteur';

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

  const handleStorungBehoben = async () => {
    setIsSaving(true);
    try {
      const msg = `✅ Fehlerortung – Nachgemessen\nErgebnis: Störung wurde behoben.`;
      await sendChatMessage(projectId, msg, userName);
      onReload && onReload();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
    setStep('behoben_erinnerung');
  };

  const handleTiefbauErforderlich = async (art) => {
    setIsSaving(true);
    try {
      let msg;
      if (art === 'kabel') {
        msg = `⚠️ Fehlerortung – Nachgemessen\nKabelstück muss ausgewechselt werden\nVon: ${kabelVon.trim()}\nBis: ${kabelBis.trim()}\n→ Tiefbau ist wieder erforderlich.`;
      } else {
        const muffeInfo = muffeZwei.trim() ?
        `Muffe 1: ${muffeEins.trim()}\nMuffe 2: ${muffeZwei.trim()}` :
        `Muffe: ${muffeEins.trim()}`;
        msg = `⚠️ Fehlerortung – Nachgemessen\nWeitere Muffe muss freigelegt werden\n${muffeInfo}\n→ Tiefbau ist wieder erforderlich.`;
      }
      await sendChatMessage(projectId, msg, userName);
      await MontageAuftrag.update(montageAuftragId, { tiefbau_offen: false, status: 'Tiefbau ausstehend' });
      onReload && onReload();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const backStep = step === 'eingemessen' || step === 'nachgemessen_ergebnis' ? 'start' :
  step === 'behoben_erinnerung' ? null :
  step === 'kabel_detail' ? 'nachgemessen_ergebnis' :
  step === 'muffle_detail' ? 'nachgemessen_ergebnis' :
  step === 'hausanschluss_detail' ? 'nachgemessen_ergebnis' :
  'start';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {if (e.target === e.currentTarget) onClose();}}>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-white w-full h-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-400 px-4 py-3 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            {backStep &&
            <button
              onClick={() => {setStep(backStep);setTiefbauText('');}}
              className="p-1 rounded-lg hover:bg-yellow-100 transition-colors mr-1">
              
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            }
            <Search className="text-slate-50 lucide lucide-search w-4 h-4" />
            <h3 className="text-slate-50 text-sm font-bold">Fehlerortung</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-yellow-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="text-slate-50 lucide lucide-x w-6 h-6" />
          </button>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* SCHRITT 1: Eingemessen oder Nachgemessen? */}
            {step === 'start' &&
            <motion.div key="start" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">Was haben Sie durchgeführt?</p>
                <button
                onClick={() => setStep('eingemessen')} className="bg-gray-100 p-4 text-left rounded-xl w-full border-2 border-blue-200 hover:bg-blue-100 transition-all">
                
                
                  <div className="text-slate-800 font-semibold">📐 Eingemessen</div>
                  <div className="text-slate-800 mt-0.5 text-xs">Erstmessung – Tiefbau wird festgelegt</div>
                </button>
                <button
                onClick={() => setStep('nachgemessen_ergebnis')} className="bg-slate-300 p-4 text-left rounded-xl w-full border-2 border-purple-200 hover:bg-purple-100 transition-all">
                
                
                  <div className="text-slate-800 font-semibold">🔁 Nachgemessen</div>
                  <div className="text-slate-800 mt-0.5 text-xs">Folgemessung – Ergebnis dokumentieren</div>
                </button>
              </motion.div>
            }

            {/* SCHRITT 2a: Eingemessen – Tiefbau beschreiben */}
            {step === 'eingemessen' &&
            <motion.div key="eingemessen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Welcher Tiefbau ist erforderlich?</Label>
                  <Input
                  value={tiefbauText}
                  onChange={(e) => setTiefbauText(e.target.value)}
                  placeholder="z.B. VS 10 freilegen, Kabelgraben in Musterstr."
                  className="h-12 text-base"
                  autoFocus />
                
                  <p className="text-xs text-gray-400 mt-1">Diese Nachricht wird automatisch im Chat gepostet.</p>
                </div>
                <Button
                onClick={handleEingemessen}
                disabled={!tiefbauText.trim() || isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold">
                
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Im Chat posten & speichern
                </Button>
              </motion.div>
            }

            {/* SCHRITT 2b: Nachgemessen – Ergebnis wählen */}
            {step === 'nachgemessen_ergebnis' &&
            <motion.div key="nachgemessen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <p className="text-sm text-gray-600 mb-1">Was ist das Ergebnis der Nachmessung?</p>

                <button
                onClick={handleStorungBehoben}
                disabled={isSaving}
                className="w-full p-3.5 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all text-left flex items-center gap-3">
                
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800 text-sm">Störung behoben</div>
                    <div className="text-xs text-green-600">Alles erledigt, kein weiterer Tiefbau nötig</div>
                  </div>
                </button>

                <button
                onClick={() => {setKabelVon('');setKabelBis('');setStep('kabel_detail');}}
                disabled={isSaving}
                className="w-full p-3.5 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-all text-left flex items-center gap-3">
                
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-red-800 text-sm">Kabelstück muss ausgewechselt werden</div>
                    <div className="text-xs text-red-600">→ Tiefbau-Status wird zurückgesetzt</div>
                  </div>
                </button>

                <button
                onClick={() => {setMuffeEins('');setMuffeZwei('');setStep('muffle_detail');}}
                disabled={isSaving}
                className="w-full p-3.5 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-all text-left flex items-center gap-3">
                
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-orange-800 text-sm">Weitere Muffe muss freigelegt werden</div>
                    <div className="text-xs text-orange-600">→ Tiefbau-Status wird zurückgesetzt</div>
                  </div>
                </button>

                <button
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const msg = `⚠️ Fehlerortung – Nachgemessen\nGrube zu klein / Stahlplatte muss weg\n→ Tiefbau ist wieder erforderlich.`;
                    await sendChatMessage(projectId, msg, userName);
                    await MontageAuftrag.update(montageAuftragId, { tiefbau_offen: false, status: 'Tiefbau ausstehend' });
                    onReload && onReload();
                    onClose();
                  } catch (e) {
                    console.error(e);
                  }
                  setIsSaving(false);
                }}
                disabled={isSaving}
                className="w-full p-3.5 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all text-left flex items-center gap-3">

                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-800 text-sm">Grube zu klein / Stahlplatte muss weg</div>
                    <div className="text-xs text-amber-600">→ Tiefbau-Status wird zurückgesetzt</div>
                  </div>
                </button>

                <button
                onClick={() => {setHausanschlussHaus('');setStep('hausanschluss_detail');}}
                disabled={isSaving}
                className="w-full p-3.5 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all text-left flex items-center gap-3">

                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-800 text-sm">Hausanschluss auswechseln</div>
                    <div className="text-xs text-blue-600">→ Tiefbau-Status wird zurückgesetzt</div>
                  </div>
                </button>

                {isSaving &&
                <div className="flex items-center justify-center py-2 text-sm text-gray-500">
                     <Loader2 className="w-4 h-4 animate-spin mr-2" />
                     Wird gespeichert...
                   </div>
                }
              </motion.div>
            }

            {/* SCHRITT 3: Kabelstück – Von/Bis angeben */}
            {step === 'kabel_detail' &&
            <motion.div key="kabel_detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-gray-600">Zwischen welchen Punkten muss das Kabelstück ausgewechselt werden?</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Von (Muffe / Hausnummer)</Label>
                    <Input
                    value={kabelVon}
                    onChange={(e) => setKabelVon(e.target.value)}
                    placeholder="z.B. Muffe M12 / Hausnr. 14"
                    className="h-10"
                    autoFocus />
                  
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Bis (Muffe / Hausnummer)</Label>
                    <Input
                    value={kabelBis}
                    onChange={(e) => setKabelBis(e.target.value)}
                    placeholder="z.B. Muffe M13 / Hausnr. 22"
                    className="h-10" />
                  
                  </div>
                  <p className="text-xs text-gray-400">Diese Angaben werden automatisch im Chat gepostet.</p>
                </div>
                <Button
                onClick={() => handleTiefbauErforderlich('kabel')}
                disabled={!kabelVon.trim() || !kabelBis.trim() || isSaving}
                className="w-full bg-red-600 hover:bg-red-700 h-10">
                
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Im Chat posten & speichern
                </Button>
              </motion.div>
            }

            {/* SCHRITT: Muffe – Bezeichnung(en) eingeben */}
            {step === 'muffle_detail' &&
            <motion.div key="muffe_detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-gray-600">Welche Muffe(n) muss/müssen freigelegt werden?</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Muffe 1 *</Label>
                    <Input
                    value={muffeEins}
                    onChange={(e) => setMuffeEins(e.target.value)}
                    placeholder="z.B. Muffe M14 / VS 7"
                    className="h-10"
                    autoFocus />
                  
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Muffe 2 <span className="font-normal text-gray-400">(optional)</span></Label>
                    <Input
                    value={muffeZwei}
                    onChange={(e) => setMuffeZwei(e.target.value)}
                    placeholder="z.B. Muffe M15 / VS 8"
                    className="h-10" />
                  
                  </div>
                  <p className="text-xs text-gray-400">Diese Angaben werden automatisch im Chat gepostet.</p>
                </div>
                <Button
                onClick={() => handleTiefbauErforderlich('muffe')}
                disabled={!muffeEins.trim() || isSaving}
                className="w-full bg-orange-600 hover:bg-orange-700 h-10">
                
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Im Chat posten & speichern
                </Button>
              </motion.div>
            }

            {/* SCHRITT 4: Erinnerung nach "Störung behoben" */}
            {step === 'behoben_erinnerung' &&
            <motion.div key="behoben_erinnerung" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-bold text-gray-900">Störung erfolgreich behoben!</p>
                  <p className="text-xs text-gray-500 mt-1">Der Chat wurde automatisch aktualisiert.</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-semibold text-amber-800">Vergessen Sie nicht:</p>
                  </div>
                  <ul className="text-xs text-amber-700 space-y-1.5 ml-6 list-disc">
                    <li>Erbrachte Leistungen erfassen</li>
                    <li>Verwendetes Material hinzufügen</li>
                  </ul>
                </div>

                <Button
                onClick={() => {
                  onClose();
                  onOpenLeistungWizard && onOpenLeistungWizard();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-sm font-semibold">
                
                  <Plus className="w-4 h-4 mr-2" />
                  Jetzt Leistung erfassen
                </Button>

                <Button
                variant="outline"
                onClick={onClose}
                className="w-full h-10 text-sm">
                
                  Später erledigen
                </Button>
              </motion.div>
            }

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>);

}
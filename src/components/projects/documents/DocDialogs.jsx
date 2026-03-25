import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderInput, MoveRight, CheckSquare, Square, Trash2, X, Lock, Unlock } from "lucide-react";

const Overlay = ({ onClick, children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
    onClick={onClick}>
    <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
      className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}>
      {children}
    </motion.div>
  </motion.div>
);

export function SubfolderDialog({ show, onClose, selectedParentFolder, newSubfolderName, setNewSubfolderName, onCreate }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <Overlay onClick={onClose}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold">Neuer Unterordner</h3>
          <div>
            <Label>Übergeordneter Ordner</Label>
            <Input value={selectedParentFolder || "Hauptebene"} disabled className="bg-gray-50 mt-1" />
          </div>
          <div>
            <Label>Name des Unterordners</Label>
            <Input value={newSubfolderName} onChange={(e) => setNewSubfolderName(e.target.value)}
              placeholder="z.B. Projekt-2024" autoFocus className="mt-1"
              onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); if (e.key === 'Escape') onClose(); }} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={onCreate}><Plus className="w-4 h-4 mr-2" />Erstellen</Button>
          </div>
        </div>
      </Overlay>
    </AnimatePresence>
  );
}

export function NewMainFolderDialog({ show, onClose, newMainFolderName, setNewMainFolderName, onCreate }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <Overlay onClick={onClose}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold">Neuer Hauptordner</h3>
          <div>
            <Label>Name des Ordners</Label>
            <Input value={newMainFolderName} onChange={(e) => setNewMainFolderName(e.target.value)}
              placeholder="z.B. Sonderdokumente" autoFocus className="mt-1"
              onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); if (e.key === 'Escape') onClose(); }} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={onCreate}><Plus className="w-4 h-4 mr-2" />Erstellen</Button>
          </div>
        </div>
      </Overlay>
    </AnimatePresence>
  );
}

export function MoveDocDialog({ movingDoc, allFolders, moveTargetFolder, setMoveTargetFolder, onClose, onMove, getFolderDepth, getFolderName }) {
  return (
    <AnimatePresence>
      {movingDoc && (
        <Overlay onClick={onClose}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold">Datei verschieben</h3>
            <p className="text-sm text-gray-500 truncate -mt-2">{movingDoc.file_name}</p>
            <div>
              <Label>Zielordner</Label>
              <Select value={moveTargetFolder} onValueChange={setMoveTargetFolder}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Ordner wählen..." /></SelectTrigger>
                <SelectContent className="max-h-[300px] z-[200]">
                  {allFolders.map((f) => (
                    <SelectItem key={f} value={f}>{'  '.repeat(getFolderDepth(f))}{getFolderDepth(f) > 0 ? '└─ ' : ''}{getFolderName(f)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button onClick={onMove} disabled={!moveTargetFolder || moveTargetFolder === movingDoc.folder}>
                <FolderInput className="w-4 h-4 mr-2" />Verschieben
              </Button>
            </div>
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

export function BulkMoveDialog({ show, onClose, selectedCount, allFolders, bulkMoveFolder, setBulkMoveFolder, onMove, getFolderDepth, getFolderName }) {
  return (
    <AnimatePresence>
      {show && (
        <Overlay onClick={onClose}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold">Dateien verschieben</h3>
            <p className="text-sm text-gray-500 -mt-2">{selectedCount} Datei(en) ausgewählt</p>
            <div>
              <Label>Zielordner</Label>
              <Select value={bulkMoveFolder} onValueChange={setBulkMoveFolder}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Ordner wählen..." /></SelectTrigger>
                <SelectContent className="max-h-[300px] z-[200]">
                  {allFolders.map((f) => (
                    <SelectItem key={f} value={f}>{'  '.repeat(getFolderDepth(f))}{getFolderDepth(f) > 0 ? '└─ ' : ''}{getFolderName(f)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button onClick={onMove} disabled={!bulkMoveFolder} className="bg-blue-600 hover:bg-blue-700">
                <MoveRight className="w-4 h-4 mr-2" />Verschieben
              </Button>
            </div>
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

export function DeleteFolderDialog({ show, onClose, folderToDelete, getFolderName, onDelete }) {
  return (
    <AnimatePresence>
      {show && (
        <Overlay onClick={onClose}>
          <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400" />
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Ordner löschen</h3>
            <p className="text-sm text-gray-600">Möchten Sie den Ordner <strong>{folderToDelete && getFolderName(folderToDelete)}</strong> wirklich löschen?</p>
            <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠ Alle Dateien in diesem Ordner werden unwiderruflich gelöscht!
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button variant="destructive" onClick={() => onDelete(folderToDelete)}>
                <Trash2 className="w-4 h-4 mr-2" />Löschen
              </Button>
            </div>
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

export function BillingDialog({ billingDoc, billingSmNumber, setBillingSmNumber, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {billingDoc && (
        <Overlay onClick={onClose}>
          <div className="p-6 space-y-4">
            <h3 className="text-base font-bold">VAO abrechnen</h3>
            <p className="text-xs text-gray-500 -mt-2 truncate">{billingDoc.file_name}</p>
            <div>
              <Label>SM Nummer der Abrechnung</Label>
              <Input value={billingSmNumber} onChange={(e) => setBillingSmNumber(e.target.value)}
                placeholder="z.B. SM-2024-001" autoFocus className="mt-1"
                onKeyDown={(e) => { if (e.key === 'Enter' && billingSmNumber.trim()) onConfirm(); if (e.key === 'Escape') onClose(); }} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button disabled={!billingSmNumber.trim()} onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
                <CheckSquare className="w-4 h-4 mr-2" />Als abgerechnet markieren
              </Button>
            </div>
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

export function UnBillingDialog({ unBillingDoc, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {unBillingDoc && (
        <Overlay onClick={onClose}>
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 to-red-400" />
          <div className="p-6 space-y-4">
            <h3 className="text-center font-bold text-gray-900">Abrechnung entfernen?</h3>
            <p className="text-center text-xs text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Datei:</span><span className="font-medium truncate ml-2 max-w-[180px]">{unBillingDoc.file_name}</span></div>
              {unBillingDoc.billed_sm_number && <div className="flex justify-between"><span className="text-gray-500">SM Nummer:</span><span className="font-semibold">{unBillingDoc.billed_sm_number}</span></div>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}><X className="w-4 h-4 mr-1" />Abbrechen</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={onConfirm}><Trash2 className="w-4 h-4 mr-1" />Ja, entfernen</Button>
            </div>
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

export function PasswordDialog({ passwordDialog, setPasswordDialog, onSubmit, onClose }) {
  return (
    <AnimatePresence>
      {passwordDialog && (
        <Overlay onClick={onClose}>
          <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400" />
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Geschützter Ordner</h3>
                <p className="text-xs text-gray-500">"{passwordDialog.folder}" ist passwortgeschützt</p>
              </div>
            </div>
            <div>
              <Label>Passwort eingeben</Label>
              <Input type="password" value={passwordDialog.input} className={`mt-1 ${passwordDialog.error ? 'border-red-400' : ''}`}
                onChange={(e) => setPasswordDialog((prev) => ({ ...prev, input: e.target.value, error: "" }))}
                placeholder="Passwort..." autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onClose(); }} />
              {passwordDialog.error && <p className="text-xs text-red-500 mt-1">{passwordDialog.error}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button onClick={onSubmit} className="bg-red-600 hover:bg-red-700"><Unlock className="w-4 h-4 mr-2" />Entsperren</Button>
            </div>
          </div>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
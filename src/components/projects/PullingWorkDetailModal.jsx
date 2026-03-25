import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, X } from "lucide-react";

const PULL_INTO_LABELS = {
  "HDPE Leerrohr": "HDPE Leerrohr",
  "Mikro-Rohr": "Mikro-Rohr",
  "Kabelformstein": "Kabelformstein",
  "Kabelkanal": "Kabelkanal",
  "Mehrfachrohr": "Mehrfachrohr",
  "Erdreich (direkt)": "Erdreich (direkt)",
  "Gebäude": "Gebäude",
  "Sonstiges": "Sonstiges"
};

const statusLabels = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  completed: "Abgeschlossen"
};

export default function PullingWorkDetailModal({ pullingWork, isOpen, onClose, onEdit, onDelete }) {
  if (!pullingWork) return null;

  const workDesc = pullingWork.work_description?.split("|") || [];
  const pullInto = workDesc[0] || "-";
  const pipeStatus = workDesc[1];
  const pipeSize = workDesc[2];

  const cableType = pullingWork.cable_type || "-";
  const [category, material] = cableType.split("|");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-2">
            <DialogTitle className="flex items-center gap-2">
              {pullingWork.start_point} → {pullingWork.end_point}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Grundinformationen */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Grundinformationen</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Kabellänge</p>
                <p className="font-medium text-lg text-gray-900">{pullingWork.cable_length || "N/A"} m</p>
              </div>
              <div>
                
                

                
              </div>
            </div>
          </div>

          {/* Kabel / Material */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Kabel / Material</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div>
                <p className="text-xs text-gray-500">Kategorie</p>
                <p className="text-sm font-medium text-gray-900">{category || "-"}</p>
              </div>
              {material &&
              <div>
                  <p className="text-xs text-gray-500">Material / Farben</p>
                  <p className="text-sm font-medium text-gray-900">{material}</p>
                </div>
              }
            </div>
          </div>

          {/* Einziehen in */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Einziehen in</h4>
            <div className="bg-blue-50 rounded-lg p-3 space-y-2 border border-blue-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{PULL_INTO_LABELS[pullInto] || pullInto}</p>
              </div>
              {pipeStatus &&
              <div className="text-xs text-gray-600">
                  <span className="font-medium">Rohr-Status:</span> {pipeStatus === "belegt" ? "Belegt" : "Leer"}
                </div>
              }
              {pipeSize &&
              <div className="text-xs text-gray-600">
                  <span className="font-medium">Durchmesser:</span> {pipeSize} mm
                </div>
              }
            </div>
          </div>

          {/* Weitere Details */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Weitere Details</h4>
            <div className="space-y-2 text-sm">
              {pullingWork.foreman &&
              <div className="flex justify-between">
                  <span className="text-gray-600">Bauleiter:</span>
                  <span className="font-medium text-gray-900">{pullingWork.foreman}</span>
                </div>
              }
              {pullingWork.completion_date &&
              <div className="flex justify-between">
                  <span className="text-gray-600">Fertigstellung:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(pullingWork.completion_date).toLocaleDateString("de-DE")}
                  </span>
                </div>
              }
            </div>
          </div>

          {/* Notizen */}
          {pullingWork.notes &&
          <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Notizen</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 italic">
                {pullingWork.notes}
              </div>
            </div>
          }

          {/* Metadaten */}
          <div className="text-xs text-gray-400 space-y-1 pt-2 border-t">
            <p>Erstellt: {new Date(pullingWork.created_date).toLocaleDateString("de-DE")}</p>
            {pullingWork.updated_date &&
            <p>Aktualisiert: {new Date(pullingWork.updated_date).toLocaleDateString("de-DE")}</p>
            }
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button
            variant="outline"
            onClick={() => {onEdit(pullingWork);onClose();}}
            className="text-blue-600 border-blue-200 hover:bg-blue-50">
            
            <Edit className="w-4 h-4 mr-2" /> Bearbeiten
          </Button>
          <Button
            variant="outline"
            onClick={() => {onDelete(pullingWork.id);onClose();}}
            className="text-red-600 border-red-200 hover:bg-red-50">
            
            <Trash2 className="w-4 h-4 mr-2" /> Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Cable, User, Edit, X, ArrowRight, Ruler, Palette } from "lucide-react";

const statusColors = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800"
};
const statusLabels = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  completed: "Abgeschlossen"
};

const SNR_COLOR_MAP = {
  "Rot": "#ff0000", "Grün": "#00cc00", "Blau": "#0000ff",
  "Gelb": "#ffff00", "Weiß": "#ffffff", "Grau": "#b0b0b0",
  "Braun": "#7b3f00", "Violett": "#8080c0", "Türkis": "#00ffff",
  "Schwarz": "#000000", "Orange": "#ff9900", "Rosa": "#ffb6c1",
};

const CATEGORY_LABELS = {
  einzelne_snr: "Einzelne SNR",
  snr_verband: "SNR-Verband",
  kupferkabel: "Kabel",
  mehrfachrohr: "Mehrfachrohr",
};

export default function PullingWorkDetail({ pullingWork, isOpen, onClose, onEdit, materials = [] }) {
  if (!pullingWork) return null;

  const connectedColors = pullingWork.connected_colors || [];
  const resolveHex = (nameOrHex) => SNR_COLOR_MAP[nameOrHex] || nameOrHex;

  // Parse cable_type: "category|material"
  const [categoryKey, materialLabel] = (pullingWork.cable_type || "").split("|");
  const categoryName = CATEGORY_LABELS[categoryKey] || categoryKey;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-5 text-white rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2">
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {pullingWork.location_name}
                </DialogTitle>
                <p className="text-blue-100 text-sm mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {pullingWork.street && `${pullingWork.street}, `}{pullingWork.city}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => onEdit(pullingWork)}
                className="text-white hover:bg-white/20 h-8 px-3">
                <Edit className="w-3.5 h-3.5 mr-1" />Bearbeiten
              </Button>
              <Button size="icon" variant="ghost" onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status + Bauleiter */}
          <div className="flex items-center gap-3 mt-4">
            <Badge className={`${statusColors[pullingWork.status]} border-0 font-medium`}>
              {statusLabels[pullingWork.status] || pullingWork.status}
            </Badge>
            {pullingWork.foreman && (
              <span className="text-blue-100 text-sm flex items-center gap-1">
                <User className="w-3.5 h-3.5" />{pullingWork.foreman}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Route: Punkt A → Punkt B */}
          {(pullingWork.start_point || pullingWork.end_point) && (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-1">Von</p>
                <p className="font-bold text-gray-900 text-lg">{pullingWork.start_point || "–"}</p>
              </div>
              <div className="flex items-center gap-1 text-blue-500">
                <div className="h-0.5 w-8 bg-blue-300" />
                <ArrowRight className="w-5 h-5" />
                <div className="h-0.5 w-8 bg-blue-300" />
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-1">Nach</p>
                <p className="font-bold text-gray-900 text-lg">{pullingWork.end_point || "–"}</p>
              </div>
              {pullingWork.cable_length && (
                <div className="text-center border-l pl-4">
                  <p className="text-xs text-gray-500 mb-1">Meter</p>
                  <p className="font-bold text-blue-700 text-lg flex items-center gap-1">
                    <Ruler className="w-4 h-4" />{pullingWork.cable_length} m
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Kabel-Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Kategorie</p>
              <p className="font-semibold text-gray-900">{categoryName || "–"}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Eingezogen in</p>
              <p className="font-semibold text-gray-900">{pullingWork.work_description || "–"}</p>
            </div>
            {materialLabel && (
              <div className="bg-blue-50 rounded-xl p-3 col-span-2">
                <p className="text-xs text-gray-500 mb-1">Material</p>
                <p className="font-semibold text-gray-900 text-sm">{materialLabel}</p>
              </div>
            )}
          </div>

          {/* Farben */}
          {connectedColors.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-3">
                <Palette className="w-3.5 h-3.5" />
                SNR-Farben ({connectedColors.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {connectedColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: resolveHex(color) }}
                    />
                    <span className="text-sm font-medium text-gray-800">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notizen */}
          {pullingWork.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Notizen</p>
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{pullingWork.notes}</p>
            </div>
          )}

          {/* Fertigstellungsdatum */}
          {pullingWork.completion_date && (
            <div className="text-sm text-gray-500 text-right">
              Fertigstellung: {new Date(pullingWork.completion_date).toLocaleDateString('de-DE')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
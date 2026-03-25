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
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 sm:p-7 text-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-white/20 rounded-xl p-2.5 flex-shrink-0">
                <Cable className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl sm:text-2xl font-bold text-white break-words">
                  {pullingWork.location_name}
                </DialogTitle>
                <p className="text-blue-100 text-sm mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{pullingWork.street && `${pullingWork.street}, `}{pullingWork.city}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button size="sm" onClick={() => onEdit(pullingWork)}
                className="text-blue-700 hover:text-blue-800 bg-white/90 hover:bg-white h-9 px-3 text-xs sm:text-sm">
                <Edit className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Bearbeiten</span>
              </Button>
              <Button size="icon" onClick={onClose}
                className="text-blue-700 hover:text-blue-800 bg-white/90 hover:bg-white h-9 w-9">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Status + Bauleiter */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${statusColors[pullingWork.status]} border-0 font-semibold text-sm`}>
              {statusLabels[pullingWork.status] || pullingWork.status}
            </Badge>
            {pullingWork.foreman && (
              <span className="text-blue-100 text-sm flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                <User className="w-4 h-4" />{pullingWork.foreman}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Route: Punkt A → Punkt B */}
          {(pullingWork.start_point || pullingWork.end_point) && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 sm:p-5 border border-blue-100">
              <p className="text-xs font-semibold text-gray-600 mb-3 sm:mb-4 uppercase tracking-wide">Strecke</p>
              
              {/* Mobile: Stacked layout, Desktop: Row layout */}
              <div className="space-y-3 sm:space-y-4">
                {/* Main route line */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex-1 bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Von</p>
                    <p className="font-bold text-gray-900 text-base sm:text-lg">{pullingWork.start_point || "–"}</p>
                  </div>
                  <div className="flex items-center gap-2 text-blue-500 flex-shrink-0">
                    <div className="h-0.5 w-4 sm:w-8 bg-blue-300" />
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    <div className="h-0.5 w-4 sm:w-8 bg-blue-300" />
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Nach</p>
                    <p className="font-bold text-gray-900 text-base sm:text-lg">{pullingWork.end_point || "–"}</p>
                  </div>
                </div>
                
                {/* Length box */}
                {pullingWork.cable_length && (
                  <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-blue-300 text-center">
                    <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Gesamtlänge</p>
                    <p className="font-bold text-blue-700 text-xl sm:text-2xl flex items-center justify-center gap-2">
                      <Ruler className="w-5 h-5" />{pullingWork.cable_length} m
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kabel-Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Kategorie</p>
              <p className="font-bold text-gray-900 text-lg">{categoryName || "–"}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-5 border-2 border-indigo-200">
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Eingezogen in</p>
              <p className="font-bold text-gray-900 text-lg">{pullingWork.work_description || "–"}</p>
            </div>
          </div>

          {/* Material Section */}
          {materialLabel && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-300 shadow-sm">
              <p className="text-xs font-bold text-purple-700 mb-3 uppercase tracking-wider">📦 Material</p>
              <p className="font-bold text-gray-900 text-lg text-center py-3 bg-white rounded-lg border border-purple-200">{materialLabel}</p>
            </div>
          )}

          {/* Farben */}
          {connectedColors.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-5 h-5 text-orange-500" />
                SNR-Farben ({connectedColors.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {connectedColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-full border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-400 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: resolveHex(color) }}
                    />
                    <span className="text-sm font-bold text-gray-800">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notizen */}
          {pullingWork.notes && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
              <p className="text-xs font-bold text-yellow-700 mb-3 uppercase tracking-wider">📝 Notizen</p>
              <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed font-medium">{pullingWork.notes}</p>
            </div>
          )}

          {/* Fertigstellungsdatum */}
          {pullingWork.completion_date && (
            <div className="flex items-center justify-between bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">✓ Fertigstellung</p>
              <p className="font-bold text-green-800 text-base sm:text-lg">{new Date(pullingWork.completion_date).toLocaleDateString('de-DE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
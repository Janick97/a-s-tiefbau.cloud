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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-5 text-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="bg-white/20 rounded-lg p-1.5 flex-shrink-0">
                <Cable className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-white break-words">
                  {pullingWork.location_name}
                </DialogTitle>
                <p className="text-blue-100 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{pullingWork.street && `${pullingWork.street}, `}{pullingWork.city}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button size="sm" onClick={() => onEdit(pullingWork)}
                className="text-blue-700 hover:text-blue-800 bg-white/90 hover:bg-white h-8 px-2 text-xs">
                <Edit className="w-3.5 h-3.5 mr-0.5" /><span className="hidden sm:inline">Bearbeiten</span>
              </Button>
              <Button size="icon" onClick={onClose}
                className="text-blue-700 hover:text-blue-800 bg-white/90 hover:bg-white h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status + Bauleiter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${statusColors[pullingWork.status]} border-0 font-semibold text-xs`}>
              {statusLabels[pullingWork.status] || pullingWork.status}
            </Badge>
            {pullingWork.foreman && (
              <span className="text-blue-100 text-xs flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                <User className="w-3 h-3" />{pullingWork.foreman}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Route: Punkt A → Punkt B */}
          {(pullingWork.start_point || pullingWork.end_point) && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Strecke</p>
              
              <div className="space-y-2">
                {/* Main route line */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white rounded p-2 border border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-0.5 uppercase">Von</p>
                    <p className="font-bold text-gray-900 text-sm">{pullingWork.start_point || "–"}</p>
                  </div>
                  <div className="flex items-center gap-1 text-blue-500 flex-shrink-0">
                    <div className="h-0.5 w-2 bg-blue-300" />
                    <ArrowRight className="w-3 h-3" />
                    <div className="h-0.5 w-2 bg-blue-300" />
                  </div>
                  <div className="flex-1 bg-white rounded p-2 border border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-0.5 uppercase">Nach</p>
                    <p className="font-bold text-gray-900 text-sm">{pullingWork.end_point || "–"}</p>
                  </div>
                </div>
                
                {/* Length box */}
                {pullingWork.cable_length && (
                  <div className="bg-white rounded p-2 border-2 border-blue-300 text-center">
                    <p className="text-xs text-gray-500 font-semibold mb-0.5 uppercase">Länge</p>
                    <p className="font-bold text-blue-700 text-base flex items-center justify-center gap-1">
                      <Ruler className="w-4 h-4" />{pullingWork.cable_length} m
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kabel-Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
              <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Kategorie</p>
              <p className="font-bold text-gray-900 text-sm">{categoryName || "–"}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 border-2 border-indigo-200">
              <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Eingezogen in</p>
              <p className="font-bold text-gray-900 text-sm">{pullingWork.work_description || "–"}</p>
            </div>
          </div>

          {/* Material Section */}
          {materialLabel && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
              <p className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wider">Material</p>
              <p className="font-bold text-gray-900 text-sm text-center py-2 bg-white rounded border border-purple-200">{materialLabel}</p>
            </div>
          )}

          {/* Farben */}
          {connectedColors.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-4 h-4 text-orange-500" />
                Farben ({connectedColors.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {connectedColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-gray-200 text-xs">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0"
                      style={{ backgroundColor: resolveHex(color) }}
                    />
                    <span className="font-bold text-gray-800">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notizen */}
          {pullingWork.notes && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
              <p className="text-xs font-bold text-yellow-700 mb-2 uppercase tracking-wider">Notizen</p>
              <p className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed">{pullingWork.notes}</p>
            </div>
          )}

          {/* Fertigstellungsdatum */}
          {pullingWork.completion_date && (
            <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 border-2 border-green-200">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Fertigstellung</p>
              <p className="font-bold text-green-800 text-xs">{new Date(pullingWork.completion_date).toLocaleDateString('de-DE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Cable,
  Calendar,
  User,
  Package,
  Palette,
  FileText,
  Edit,
  X } from
"lucide-react";

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

// Farbpalette – Name → Hex (gleiche Werte wie im Wizard)
const SNR_COLOR_MAP = {
  "Rot":     "#ff0000",
  "Grün":    "#00cc00",
  "Blau":    "#0000ff",
  "Gelb":    "#ffff00",
  "Weiß":    "#ffffff",
  "Grau":    "#b0b0b0",
  "Braun":   "#7b3f00",
  "Violett": "#8080c0",
  "Türkis":  "#00ffff",
  "Schwarz": "#000000",
  "Orange":  "#ff9900",
  "Rosa":    "#ffb6c1",
};


export default function PullingWorkDetail({
  pullingWork,
  isOpen,
  onClose,
  onEdit,
  materials = []
}) {
  if (!pullingWork) return null;

  const selectedMaterial = materials.find((m) => m.id === pullingWork.material_id);
  const connectedColors = pullingWork.connected_colors || [];

  // nameOrHex kann ein Farbname ("Rot") oder ein Hex-Code sein
  const resolveHex = (nameOrHex) => SNR_COLOR_MAP[nameOrHex] || nameOrHex;
  const resolveName = (nameOrHex) => SNR_COLOR_MAP[nameOrHex] ? nameOrHex : nameOrHex;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Cable className="w-5 h-5" />
            Einzieharbeit Details - {pullingWork.location_name}
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEdit(pullingWork)}>
              <Edit className="w-4 h-4 mr-2" />
              Bearbeiten
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            

            
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>Bauleiter: {pullingWork.foreman}</span>
            </div>
          </div>

          {/* Standortinformationen */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5" />
                Standortinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Standortbezeichnung</label>
                <p className="text-gray-900 font-medium">{pullingWork.location_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Vollständige Adresse</label>
                <p className="text-gray-900">
                  {pullingWork.street} {pullingWork.house_number}
                  {pullingWork.postal_code && <><br />{pullingWork.postal_code} {pullingWork.city}</>}
                  {!pullingWork.postal_code && <><br />{pullingWork.city}</>}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Arbeitsdetails */}
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
                <FileText className="w-5 h-5" />
                Arbeitsdetails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Beschreibung der Arbeiten</label>
                <p className="text-gray-900 mt-1">{pullingWork.work_description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Startpunkt</label>
                  <p className="text-gray-900">{pullingWork.start_point || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Endpunkt</label>
                  <p className="text-gray-900">{pullingWork.end_point || 'Nicht angegeben'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Kabeltyp</label>
                  <p className="text-gray-900">{pullingWork.cable_type || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Kabellänge</label>
                  <p className="text-gray-900">
                    {pullingWork.cable_length ? `${pullingWork.cable_length} m` : 'Nicht angegeben'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material und Konnektierung */}
          {(selectedMaterial || connectedColors.length > 0) &&
          <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                  <Package className="w-5 h-5" />
                  Material und Konnektierung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedMaterial &&
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Verwendetes Material</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-blue-100 text-blue-800">
                          {selectedMaterial.category}
                        </Badge>
                        <span className="text-gray-900">{selectedMaterial.name}</span>
                      </div>
                      <p className="text-sm text-gray-600">Artikel: {selectedMaterial.article_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Menge</label>
                      <p className="text-gray-900">
                        {pullingWork.material_quantity} {selectedMaterial.unit}
                      </p>
                    </div>
                  </div>
              }

                {connectedColors.length > 0 &&
              <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4" />
                      Konnektierte Farben ({connectedColors.length})
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {connectedColors.map((colorNameOrHex, index) =>
                      <div
                      key={index}
                      className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                          <div
                      className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
                      style={{ backgroundColor: resolveHex(colorNameOrHex) }} />
                          <span className="text-sm font-medium text-gray-900">
                            {resolveName(colorNameOrHex)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
              }
              </CardContent>
            </Card>
          }

          {/* Termine und Status */}
          <Card>
            




            
            















            
          </Card>

          {/* Notizen */}
          {pullingWork.notes &&
          <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zusätzliche Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 whitespace-pre-wrap">{pullingWork.notes}</p>
              </CardContent>
            </Card>
          }
        </div>
      </DialogContent>
    </Dialog>);

}
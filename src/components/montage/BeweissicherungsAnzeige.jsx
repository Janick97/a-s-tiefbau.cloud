import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, MapPin, Clock, User, Camera, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import BeweissicherungDialog from "./BeweissicherungDialog";

export default function BeweissicherungsAnzeige({ beweissicherungen, canEdit = false, onReload }) {
  const [expandedId, setExpandedId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editingBeweissicherung, setEditingBeweissicherung] = useState(null);

  if (!beweissicherungen || beweissicherungen.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-red-600" />
        Beweissicherungen ({beweissicherungen.length})
      </h3>

      {beweissicherungen.map((b) => {
        const isExpanded = expandedId === b.id;
        return (
          <Card key={b.id} className="border-l-4 border-l-red-500">
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : b.id)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  {b.schaediger_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {b.erfassungsdatum && (
                    <Badge variant="outline" className="text-xs">
                      {new Date(b.erfassungsdatum).toLocaleDateString("de-DE")}
                    </Badge>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); setEditingBeweissicherung(b); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Schädiger */}
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Schädiger</p>
                    <p className="text-sm font-medium text-gray-900">{b.schaediger_name}</p>
                    {b.schaediger_adresse && <p className="text-xs text-gray-600">{b.schaediger_adresse}</p>}
                    {b.schaediger_nummer && <p className="text-xs text-gray-600">{b.schaediger_nummer}</p>}
                  </div>

                  {/* Schadensort */}
                  {(b.schadensort_strasse || b.schadensort_ort) && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Schadensort
                      </p>
                      {b.schadensort_strasse && <p className="text-sm font-medium text-gray-900">{b.schadensort_strasse}</p>}
                      {(b.schadensort_plz || b.schadensort_ort) && (
                        <p className="text-xs text-gray-600">{b.schadensort_plz} {b.schadensort_ort}</p>
                      )}
                    </div>
                  )}

                  {/* Schadensdetails */}
                  {(b.schadensursache || b.uhrzeit_schaden) && (
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Schadensdetails</p>
                      {b.schadensursache && <p className="text-sm font-medium text-gray-900">{b.schadensursache}</p>}
                      {(b.uhrzeit_schaden || b.uhrzeit_beseitigung) && (
                        <div className="flex gap-3 mt-1">
                          {b.uhrzeit_schaden && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Schaden: {b.uhrzeit_schaden}
                            </p>
                          )}
                          {b.uhrzeit_beseitigung && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Beseitigung: {b.uhrzeit_beseitigung}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Erfasst von */}
                  {b.erfasst_von && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> Erfasst von
                      </p>
                      <p className="text-sm font-medium text-gray-900">{b.erfasst_von}</p>
                      {b.erfassungsdatum && (
                        <p className="text-xs text-gray-600">{new Date(b.erfassungsdatum).toLocaleDateString("de-DE")}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Fotos */}
                {b.fotos && b.fotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Fotos ({b.fotos.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {b.fotos.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewUrl(url)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Edit Dialog */}
      <AnimatePresence>
        {editingBeweissicherung && (
          <BeweissicherungDialog
            existingBeweissicherung={editingBeweissicherung}
            onClose={() => setEditingBeweissicherung(null)}
            onSave={() => {
              setEditingBeweissicherung(null);
              onReload && onReload();
            }}
          />
        )}
      </AnimatePresence>

      {/* Foto Vollbild Vorschau */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <img src={previewUrl} alt="Vorschau" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
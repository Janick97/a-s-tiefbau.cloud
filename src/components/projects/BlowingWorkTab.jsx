import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wind, Trash2, Calendar, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import BlowingWorkWizard from "./BlowingWorkWizard";

const SNR_COLORS_BASE_HEX = {
  "Rot": "#ff0000", "Grün": "#00cc00", "Blau": "#0000ff",
  "Gelb": "#ffff00", "Weiß": "#ffffff", "Grau": "#b0b0b0",
  "Braun": "#7b3f00", "Violett": "#8080c0", "Türkis": "#00ffff",
  "Schwarz": "#000000", "Orange": "#ff9900", "Rosa": "#ffb6c1",
};
// Include striped variants
const SNR_COLORS_HEX = Object.fromEntries([
  ...Object.entries(SNR_COLORS_BASE_HEX),
  ...Object.entries(SNR_COLORS_BASE_HEX).map(([k, v]) => [k + "/Strich", v]),
]);

export default function BlowingWorkTab({ projectId, user, project }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["blowing-work", projectId],
    queryFn: () => base44.entities.BlowingWork.filter({ project_id: projectId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BlowingWork.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["blowing-work", projectId]),
  });

  const totalMeters = records.reduce((s, r) => s + (r.meters_blown || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Wind className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0" />
            Einblasarbeiten
          </h3>
          {records.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {records.length} Eintrag{records.length !== 1 ? "e" : ""} · gesamt{" "}
              <span className="font-semibold text-teal-700">{totalMeters.toFixed(1)} m</span>
            </p>
          )}
        </div>
        <Button onClick={() => { setEditingRecord(null); setShowWizard(true); }} className="bg-teal-600 hover:bg-teal-700 flex-shrink-0 text-xs sm:text-sm px-2.5 sm:px-4">
          <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Einblasen erfassen</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Laden...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wind className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Noch keine Einblasarbeiten dokumentiert</p>
          <Button onClick={() => { setEditingRecord(null); setShowWizard(true); }} className="mt-4 bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> Ersten Eintrag erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec, i) => (
            <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-l-4 border-teal-400">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-teal-600 text-white text-sm px-3 py-1">
                          {(rec.meters_blown || 0).toFixed(1)} m eingeblasen
                        </Badge>
                        {(rec.point_a || rec.point_b) && (
                          <span className="text-sm font-semibold text-gray-800">
                            {rec.point_a} → {rec.point_b}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-700">{rec.cable_type}</span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="relative w-4 h-4 rounded-full border border-gray-300 shadow-sm overflow-hidden"
                            style={{ backgroundColor: SNR_COLORS_HEX[rec.snr_color] || "#ccc" }}
                          >
                            {rec.snr_color?.endsWith("/Strich") && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-[2px] bg-black/50" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{rec.snr_color}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Anfang: <strong>{rec.start_cable_meters} m</strong></span>
                        <span>Ende: <strong>{rec.end_cable_meters} m</strong></span>
                        {rec.foreman_name && <span>Erfasst von: <strong>{rec.foreman_name}</strong></span>}
                        {rec.documentation_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(rec.documentation_date).toLocaleDateString("de-DE")}
                          </span>
                        )}
                      </div>
                      {rec.notes && <p className="text-xs text-gray-500 italic">{rec.notes}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-teal-600 hover:bg-teal-50 h-8 w-8"
                        onClick={() => { setEditingRecord(rec); setShowWizard(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                        onClick={() => { if (confirm("Eintrag löschen?")) deleteMutation.mutate(rec.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showWizard && (
          <BlowingWorkWizard
            project={project}
            user={user}
            existingRecord={editingRecord}
            onClose={() => { setShowWizard(false); setEditingRecord(null); }}
            onSaved={() => queryClient.invalidateQueries(["blowing-work", projectId])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2 } from "lucide-react";

export default function MoveExcavationsDialog({ open, onClose, selectedExcavations, projects, onMove }) {
  const [targetProjectId, setTargetProjectId] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async () => {
    if (!targetProjectId) return;
    setIsMoving(true);
    await onMove(targetProjectId);
    setIsMoving(false);
    setTargetProjectId("");
  };

  const handleClose = () => {
    setTargetProjectId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-orange-500" />
            Ausgrabungen verschieben
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">{selectedExcavations.length}</span> Ausgrabung{selectedExcavations.length !== 1 ? "en" : ""} werden verschoben:
            </p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {selectedExcavations.map(exc => (
                <Badge key={exc.id} variant="outline" className="text-xs">
                  {exc.location_name || "Unbekannter Standort"}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Zielprojekt auswählen</label>
            <Select value={targetProjectId} onValueChange={setTargetProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Projekt auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="font-mono text-orange-700 mr-2">{project.project_number}</span>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isMoving}>
            Abbrechen
          </Button>
          <Button
            onClick={handleMove}
            disabled={!targetProjectId || isMoving}
            className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
          >
            {isMoving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verschieben...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Verschieben
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
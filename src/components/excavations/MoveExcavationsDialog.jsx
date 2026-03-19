import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Search, Check } from "lucide-react";

export default function MoveExcavationsDialog({ open, onClose, selectedExcavations, projects, onMove }) {
  const [targetProjectId, setTargetProjectId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [search, setSearch] = useState("");

  const handleMove = async () => {
    if (!targetProjectId) return;
    setIsMoving(true);
    await onMove(targetProjectId);
    setIsMoving(false);
    setTargetProjectId("");
  };

  const handleClose = () => {
    setTargetProjectId("");
    setSearch("");
    onClose();
  };

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(p =>
      p.project_number?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.sm_number?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const selectedProject = projects.find(p => p.id === targetProjectId);

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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Suchen nach Nummer, Titel, Stadt..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {selectedProject && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                <Check className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="font-mono text-orange-700 font-semibold">{selectedProject.project_number}</span>
                <span className="text-gray-700 truncate">{selectedProject.title}</span>
              </div>
            )}
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Keine Projekte gefunden</p>
              ) : (
                filteredProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setTargetProjectId(project.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center gap-2 transition-colors border-b last:border-b-0 ${targetProjectId === project.id ? 'bg-orange-50' : ''}`}
                  >
                    <span className="font-mono text-orange-700 font-semibold shrink-0">{project.project_number}</span>
                    <span className="text-gray-700 truncate">{project.title}</span>
                    {project.city && <span className="text-gray-400 text-xs shrink-0">{project.city}</span>}
                  </button>
                ))
              )}
            </div>
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
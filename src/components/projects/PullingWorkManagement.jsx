import React, { useState, useEffect } from 'react';
import { PullingWork, Material } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Cable, ChevronRight } from "lucide-react";
import PullingWorkWizard from "./PullingWorkWizard";
import PullingWorkDetailModal from "./PullingWorkDetailModal";

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

export default function PullingWorkManagement({ projectId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [pullingWorks, setPullingWorks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null);

  useEffect(() => {
    loadData();
    base44.auth.me().then((u) => setCurrentUser(u)).catch(() => {});
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [worksData, materialsData] = await Promise.all([
        PullingWork.filter({ project_id: projectId }),
        Material.list()
      ]);
      setPullingWorks(Array.isArray(worksData) ? worksData : []);
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
    } catch (error) {
      console.error("Fehler beim Laden der Einzieharbeiten:", error);
      setPullingWorks([]);
      setMaterials([]);
    }
    setIsLoading(false);
  };

  const loadPullingWorks = loadData;

  const handleAdd = () => {
    setEditingWork(null);
    setShowForm(true);
    setShowDetail(false);
    setSelectedWork(null);
  };

  const handleEdit = (work) => {
    setEditingWork(work);
    setShowForm(true);
    setShowDetail(false);
    setSelectedWork(null);
  };

  const handleSubmit = async (workData) => {
    try {
      if (editingWork) {
        await PullingWork.update(editingWork.id, workData);
      } else {
        await PullingWork.create({ ...workData, project_id: projectId });
      }
      setShowForm(false);
      setEditingWork(null);
      await loadPullingWorks();
    } catch (error) {
      console.error("Fehler beim Speichern der Einzieharbeit:", error);
    }
  };

  const handleDelete = async (workId) => {
    if (window.confirm("Sind Sie sicher, dass Sie diese Einzieharbeit löschen möchten?")) {
      try {
        await PullingWork.delete(workId);
        await loadPullingWorks();
        if (selectedWork && selectedWork.id === workId) {
          setShowDetail(false);
          setSelectedWork(null);
        }
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  const handleViewDetail = (work) => {
    setSelectedWork(work);
    setShowDetail(true);
    setShowForm(false);
    setEditingWork(null);
  };

  const handleEditFromDetail = (work) => {
    setShowDetail(false);
    setSelectedWork(null);
    setEditingWork(work);
    setShowForm(true);
  };

  const getMaterialDetails = (materialId) => {
    return materials.find((m) => m.id === materialId) || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Cable className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            Einzieharbeiten
          </h3>
          {pullingWorks.length > 0 &&
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {pullingWorks.length} Eintrag{pullingWorks.length !== 1 ? "e" : ""}
            </p>
          }
        </div>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 text-xs sm:text-sm px-2.5 sm:px-4">
          <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Neu</span>
        </Button>
      </div>

      {pullingWorks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Cable className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-sm">Noch keine Einzieharbeiten angelegt</p>
          <Button onClick={handleAdd} className="mt-4 bg-blue-600 hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4 mr-2" /> Ersten Eintrag erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {pullingWorks.map((work, i) => (
            <motion.div key={work.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-l-4 border-blue-400 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetail(work)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-blue-600 text-white text-xs sm:text-sm px-2 py-0.5">
                          {work.cable_length ? `${work.cable_length} m` : 'N/A'}
                        </Badge>
                        {(work.start_point || work.end_point) && (
                          <span className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-1">
                            {work.start_point} <ChevronRight className="w-3 h-3 text-gray-500" /> {work.end_point}
                          </span>
                        )}
                        <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">{work.cable_type || '-'}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {work.work_description && (
                          <p>
                            Eingezogen in: <span className="font-medium text-gray-700">{work.work_description.split('|')[0]}</span>
                            {work.work_description.split('|')[1] && ` • ${work.work_description.split('|')[1] === 'belegt' ? 'Belegt' : 'Leer'}`}
                            {work.work_description.split('|')[2] && ` • Ø ${work.work_description.split('|')[2]} mm`}
                          </p>
                        )}
                        {work.notes && <p className="text-gray-500 italic">{work.notes}</p>}
                      </div>
                      {work.foreman && <p className="text-xs text-gray-400">von {work.foreman}</p>}
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                        onClick={() => handleEdit(work)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                        onClick={() => handleDelete(work.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
        {showForm &&
        <PullingWorkWizard
          existingWork={editingWork}
          project={{ id: projectId }}
          user={currentUser}
          onClose={() => {setShowForm(false);setEditingWork(null);}}
          onSaved={() => {setShowForm(false);setEditingWork(null);loadData();}} />
        }
      </AnimatePresence>

      <PullingWorkDetailModal
        pullingWork={selectedWork}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedWork(null);
        }}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { PullingWork, Material } from "@/entities/all";
import { base44 } from "@/api/base44Client"; // Added Material
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Cable, MapPin } from "lucide-react";
import PullingWorkWizard from "./PullingWorkWizard";
import PullingWorkDetail from "./PullingWorkDetail";

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
  const [materials, setMaterials] = useState([]); // Added materials state
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false); // Added showDetail state
  const [editingWork, setEditingWork] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null); // Added selectedWork state

  useEffect(() => {
    loadData();
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, [projectId]);

  const loadData = async () => { // New loadData function
    setIsLoading(true);
    try {
      const [worksData, materialsData] = await Promise.all([ // Use Promise.all to fetch both
        PullingWork.filter({ project_id: projectId }),
        Material.list() // Fetch materials
      ]);
      setPullingWorks(Array.isArray(worksData) ? worksData : []);
      setMaterials(Array.isArray(materialsData) ? materialsData : []); // Set materials
    } catch (error) {
      console.error("Fehler beim Laden der Einzieharbeiten:", error);
      setPullingWorks([]);
      setMaterials([]);
    }
    setIsLoading(false);
  };

  const loadPullingWorks = loadData; // Alias for compatibility with existing calls

  const handleAdd = () => {
    setEditingWork(null);
    setShowForm(true);
    setShowDetail(false); // Ensure detail view is closed when adding new
    setSelectedWork(null);
  };

  const handleEdit = (work) => {
    setEditingWork(work);
    setShowForm(true);
    setShowDetail(false); // Ensure detail view is closed when editing
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
      await loadPullingWorks(); // This now calls loadData
    } catch (error) {
      console.error("Fehler beim Speichern der Einzieharbeit:", error);
    }
  };

  const handleDelete = async (workId) => {
    if (window.confirm("Sind Sie sicher, dass Sie diese Einzieharbeit löschen möchten?")) {
      try {
        await PullingWork.delete(workId);
        await loadPullingWorks(); // This now calls loadData
        if (selectedWork && selectedWork.id === workId) { // If deleted work was in detail view
          setShowDetail(false);
          setSelectedWork(null);
        }
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  const handleViewDetail = (work) => { // New handler for viewing details
    setSelectedWork(work);
    setShowDetail(true);
    setShowForm(false); // Ensure form is closed when viewing details
    setEditingWork(null);
  };

  const handleEditFromDetail = (work) => { // New handler for editing from detail view
    setShowDetail(false);
    setSelectedWork(null);
    setEditingWork(work);
    setShowForm(true);
  };

  const getMaterialDetails = (materialId) => { // Helper function
    return materials.find(m => m.id === materialId) || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Cable className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            Einzieharbeiten
          </h3>
          {pullingWorks.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {pullingWorks.length} Eintrag{pullingWorks.length !== 1 ? "e" : ""}
            </p>
          )}
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
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-3">
                    {/* Header row: Location and Actions */}
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="bg-blue-600 text-white text-xs sm:text-sm px-2.5 py-1 flex-shrink-0">
                        {work.location_name}
                      </Badge>
                      <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                          onClick={() => handleEdit(work)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                          onClick={() => handleDelete(work.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Cable info row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                      <div>
                        <p className="text-gray-500 font-medium">Kabel</p>
                        <p className="text-gray-900 font-medium truncate">{work.cable_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Länge</p>
                        <p className="text-gray-900 font-medium">{work.cable_length ? `${work.cable_length}m` : '-'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-gray-500 font-medium">Status</p>
                        <Badge variant="outline" className={`${statusColors[work.status]} text-xs`}>
                          {statusLabels[work.status]}
                        </Badge>
                      </div>
                    </div>

                    {/* Location and Foreman */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm border-t pt-3">
                      <div>
                        <p className="text-gray-500 font-medium">Adresse</p>
                        <p className="text-gray-900">{work.street} {work.house_number}, {work.city}</p>
                      </div>
                      {work.foreman && (
                        <div>
                          <p className="text-gray-500 font-medium">Bauleiter</p>
                          <p className="text-gray-900">{work.foreman}</p>
                        </div>
                      )}
                    </div>

                    {/* Work description */}
                    {work.work_description && (
                      <div className="text-xs text-gray-600 italic border-t pt-2">
                        <p className="text-gray-500 font-medium mb-1">Details</p>
                        {work.work_description}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <PullingWorkWizard
            existingWork={editingWork}
            project={{ id: projectId }}
            user={currentUser}
            onClose={() => { setShowForm(false); setEditingWork(null); }}
            onSaved={() => { setShowForm(false); setEditingWork(null); loadData(); }}
          />
        )}
      </AnimatePresence>

      {/* PullingWorkDetail component */}
      <PullingWorkDetail
        pullingWork={selectedWork}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedWork(null);
        }}
        onEdit={handleEditFromDetail}
        materials={materials}
      />
    </div>
  );
}
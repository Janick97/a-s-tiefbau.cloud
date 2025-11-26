
import React, { useState, useEffect } from 'react';
import { PullingWork, Material } from "@/entities/all"; // Added Material
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Cable, MapPin } from "lucide-react";
import PullingWorkForm from "./PullingWorkForm";
import PullingWorkDetail from "./PullingWorkDetail"; // Added PullingWorkDetail

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
  const [pullingWorks, setPullingWorks] = useState([]);
  const [materials, setMaterials] = useState([]); // Added materials state
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false); // Added showDetail state
  const [editingWork, setEditingWork] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null); // Added selectedWork state

  useEffect(() => {
    loadData(); // Changed to loadData
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
    <>
      <Card className="card-elevation border-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cable className="w-5 h-5" />
            Einzieharbeiten ({pullingWorks.length})
          </CardTitle>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Neue Einzieharbeit
          </Button>
        </CardHeader>

        <CardContent>
          {pullingWorks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Cable className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Noch keine Einzieharbeiten angelegt</p>
              <Button onClick={handleAdd} className="mt-3">
                Erste Einzieharbeit hinzufügen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Standort</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Kabel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bauleiter</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {pullingWorks.map((work, index) => (
                    <motion.tr
                      key={work.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 cursor-pointer" // Added cursor-pointer
                      onClick={() => handleViewDetail(work)} // Added onClick to view details
                    >
                      <TableCell className="font-medium">
                        {work.location_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {work.street} {work.house_number}, {work.city}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {work.work_description}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {work.cable_type && <div>{work.cable_type}</div>}
                          {work.cable_length && <div>{work.cable_length}m</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[work.status]}>
                          {statusLabels[work.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {work.foreman}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { // Added e.stopPropagation()
                              e.stopPropagation();
                              handleEdit(work);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { // Added e.stopPropagation()
                              e.stopPropagation();
                              handleDelete(work.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showForm && (
          <PullingWorkForm
            pullingWork={editingWork} // Changed prop name to pullingWork
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingWork(null);
            }}
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
    </>
  );
}

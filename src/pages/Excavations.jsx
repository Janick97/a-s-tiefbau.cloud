import React, { useState, useEffect, useMemo } from "react";
import { Excavation, Project, PriceItem } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, Shovel, Users, ArrowRight, CheckSquare, Square } from "lucide-react";
import ExcavationForm from "../components/excavations/ExcavationForm";
import ExcavationCard from "../components/excavations/ExcavationCard";
import MoveExcavationsDialog from "../components/excavations/MoveExcavationsDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExcavationsPage() {
  const [excavations, setExcavations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingExcavation, setEditingExcavation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [foremanFilter, setForemanFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [excavationsData, projectsData, priceData] = await Promise.all([
          Excavation.list("-created_date").catch(() => []),
          Project.list().catch(() => []),
          PriceItem.list().catch(() => [])
        ]);
        setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setPriceItems(Array.isArray(priceData) ? priceData : []);
      } catch (err) {
        console.error("Fehler beim Laden der Daten:", err);
        setError("Daten konnten nicht geladen werden.");
        setExcavations([]);
        setProjects([]);
        setPriceItems([]);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleFormSubmit = async (excavationData) => {
    try {
      if (editingExcavation) {
        await Excavation.update(editingExcavation.id, excavationData);
      } else {
        await Excavation.create(excavationData);
      }
      setShowForm(false);
      setEditingExcavation(null);
      const excavationsData = await Excavation.list("-created_date").catch(() => []);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
    } catch (error) {
      console.error("Fehler beim Speichern der Ausgrabung:", error);
    }
  };

  const handleEdit = (excavation) => {
    setEditingExcavation(excavation);
    setShowForm(true);
  };
  
  const handleAddNew = () => {
    setEditingExcavation(null);
    setShowForm(true);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedIds([]);
  };

  const handleSelectExcavation = (excavation) => {
    setSelectedIds(prev =>
      prev.includes(excavation.id)
        ? prev.filter(id => id !== excavation.id)
        : [...prev, excavation.id]
    );
  };

  const handleMoveExcavations = async (targetProjectId) => {
    await Promise.all(
      selectedIds.map(id => Excavation.update(id, { project_id: targetProjectId }))
    );
    setShowMoveDialog(false);
    setSelectionMode(false);
    setSelectedIds([]);
    const excavationsData = await Excavation.list("-created_date").catch(() => []);
    setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
  };

  const projectsMap = useMemo(() => new Map((Array.isArray(projects) ? projects : []).map(p => [p.id, p])), [projects]);
  const priceItemsMap = useMemo(() => new Map((Array.isArray(priceItems) ? priceItems : []).map(p => [p.id, p])), [priceItems]);

  const filteredExcavations = useMemo(() => {
    const safeExcavations = Array.isArray(excavations) ? excavations : [];
    return safeExcavations.filter(exc => {
      if (!exc) return false;
      const searchLower = searchTerm.toLowerCase();
      const project = projectsMap.get(exc.project_id);
      const priceItem = priceItemsMap.get(exc.price_item_id);

      const matchesSearch = 
        (exc.location_name || '').toLowerCase().includes(searchLower) ||
        (project?.title || '').toLowerCase().includes(searchLower) ||
        (project?.project_number || '').toLowerCase().includes(searchLower) ||
        (priceItem?.description || '').toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || exc.status === statusFilter;
      const matchesForeman = foremanFilter === "all" || exc.foreman === foremanFilter;
      
      return matchesSearch && matchesStatus && matchesForeman;
    });
  }, [excavations, searchTerm, statusFilter, foremanFilter, projectsMap, priceItemsMap]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      );
    }

    if (error) {
      return <div className="text-center text-red-500">{error}</div>;
    }

    if (filteredExcavations.length === 0) {
      return (
        <div className="text-center py-16">
          <Shovel className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-medium text-gray-500 mb-2">Keine Ausgrabungen gefunden</h3>
          <p className="text-gray-400 mb-6">Passen Sie Ihre Suche an oder erstellen Sie eine neue Ausgrabung.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredExcavations.map((excavation, index) => (
            <ExcavationCard
              key={excavation.id}
              excavation={excavation}
              projectTitle={projectsMap.get(excavation.project_id)?.title}
              priceItem={priceItemsMap.get(excavation.price_item_id)}
              onEdit={handleEdit}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Ausgrabungen</h1>
            <p className="text-gray-600">Gruben und Gräben verwalten</p>
          </div>
          <div className="flex gap-2">
            {selectionMode && selectedIds.length > 0 && (
              <Button
                onClick={() => setShowMoveDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 shadow-lg"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                {selectedIds.length} verschieben
              </Button>
            )}
            <Button
              variant={selectionMode ? "outline" : "secondary"}
              onClick={toggleSelectionMode}
              className={selectionMode ? "border-orange-400 text-orange-600" : ""}
            >
              {selectionMode ? <Square className="w-5 h-5 mr-2" /> : <CheckSquare className="w-5 h-5 mr-2" />}
              {selectionMode ? "Abbrechen" : "Auswählen"}
            </Button>
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> Neue Ausgrabung
            </Button>
          </div>
        </header>

        <AnimatePresence>
          {showForm && (
            <ExcavationForm
              excavation={editingExcavation}
              projects={Array.isArray(projects) ? projects : []}
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(false)}
            />
          )}
        </AnimatePresence>

        <Card className="card-elevation border-none mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Suche nach Standort, Projekt oder Position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="planned">Geplant</SelectItem>
                    <SelectItem value="in_progress">In Arbeit</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="approved">Genehmigt</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={foremanFilter} onValueChange={setForemanFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Users className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Bauleiter</SelectItem>
                    <SelectItem value="Nicht zugewiesen">Nicht zugewiesen</SelectItem>
                    <SelectItem value="Sabri">Sabri</SelectItem>
                    <SelectItem value="Dogan">Dogan</SelectItem>
                    <SelectItem value="Ahmet">Ahmet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {renderContent()}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Project, Excavation, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { UserCircle, CheckCircle, Clock, FolderOpen, Euro, Calendar, MapPin, Building, Eye, AlertTriangle, Search, UserPlus, Loader2, Columns, List } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link, useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function DispositionBauleiterPage() {
  const location = useLocation();
  const bauleiterIdParam = new URLSearchParams(location.search).get("id");
  
  const [bauleiter, setBauleiter] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [assigning, setAssigning] = useState(null);
  const [unassigning, setUnassigning] = useState(null);
  const [confirmUnassign, setConfirmUnassign] = useState({
    show: false,
    projectId: null,
    projectTitle: null
  });
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' or 'list'

  const loadData = React.useCallback(async () => {
    if (!bauleiterIdParam) {
      setError("Keine Bauleiter-ID angegeben");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const [bauleiterData, projectsData, allProjectsData, excavationsData] = await Promise.all([
        User.get(bauleiterIdParam).catch(() => null),
        Project.filter({ assigned_foreman_id: bauleiterIdParam }).catch(() => []),
        Project.list("-created_date").catch(() => []),
        Excavation.list().catch(() => [])
      ]);

      setBauleiter(bauleiterData);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setAllProjects(Array.isArray(allProjectsData) ? allProjectsData : []);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
      
      if (!bauleiterData) {
        setError("Bauleiter nicht gefunden");
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setError("Fehler beim Laden der Daten");
      setBauleiter(null);
      setProjects([]);
      setAllProjects([]);
      setExcavations([]);
    }
    setIsLoading(false);
  }, [bauleiterIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeProjects = projects.filter(p => !p.foreman_completed);
  const completedProjects = projects.filter(p => p.foreman_completed);

  const calculateProjectRevenue = (projectId) => {
    return excavations
      .filter(exc => exc.project_id === projectId)
      .reduce((sum, exc) => sum + (exc.calculated_price || 0), 0);
  };

  const totalRevenue = projects.reduce((sum, p) => sum + calculateProjectRevenue(p.id), 0);

  // Verfügbare Projekte zum Zuweisen (nicht diesem Bauleiter zugewiesen)
  const availableProjects = React.useMemo(() => {
    const safeAllProjects = Array.isArray(allProjects) ? allProjects : [];
    return safeAllProjects.filter(p => {
      const notAssignedToThisBauleiter = p.assigned_foreman_id !== bauleiterIdParam;
      const matchesSearch = searchTerm ? (
        (p.project_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.client || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;
      return notAssignedToThisBauleiter && matchesSearch;
    });
  }, [allProjects, bauleiterIdParam, searchTerm]);

  const handleAssignProject = async (projectId) => {
    setAssigning(projectId);
    try {
      await Project.update(projectId, {
        assigned_foreman_id: bauleiter.id,
        assigned_foreman_name: bauleiter.full_name
      });
      
      // Daten neu laden
      await loadData();
    } catch (error) {
      console.error("Fehler bei der Zuweisung:", error);
    }
    setAssigning(null);
  };

  const handleUnassignProject = (project) => {
    setConfirmUnassign({
      show: true,
      projectId: project.id,
      projectTitle: project.title
    });
  };

  const confirmUnassignProject = async () => {
    const { projectId } = confirmUnassign;
    setUnassigning(projectId);
    setConfirmUnassign({ show: false, projectId: null, projectTitle: null }); // Close modal immediately
    
    try {
      await Project.update(projectId, {
        assigned_foreman_id: null,
        assigned_foreman_name: null,
        foreman_completed: false, // Reset completion status when unassigning
        foreman_completed_date: null // Clear completion date
      });
      
      await loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error("Fehler beim Entfernen der Zuweisung:", error);
    } finally {
      setUnassigning(null);
    }
  };

  const cancelUnassign = () => {
    setConfirmUnassign({ show: false, projectId: null, projectTitle: null });
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const projectId = draggableId;
    const newStatus = destination.droppableId;

    try {
      const updateData = {};
      
      if (newStatus === 'unassigned') {
        updateData.assigned_foreman_id = null;
        updateData.assigned_foreman_name = null;
        updateData.foreman_completed = false;
        updateData.foreman_completed_date = null;
      } else if (newStatus === 'completed') {
        updateData.foreman_completed = true;
        updateData.foreman_completed_date = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'assigned') {
        updateData.assigned_foreman_id = bauleiter.id;
        updateData.assigned_foreman_name = bauleiter.full_name;
        updateData.foreman_completed = false;
      }

      await Project.update(projectId, updateData);
      await loadData();
    } catch (error) {
      console.error('Fehler beim Verschieben:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-blue-100 text-blue-800 border-blue-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      on_hold: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status] || colors.planning;
  };

  const getStatusLabel = (status) => {
    const labels = {
      planning: 'Planung',
      active: 'Aktiv',
      completed: 'Abgeschlossen',
      on_hold: 'Pausiert'
    };
    return labels[status] || 'Unbekannt';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Bauleiter-Daten...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bauleiter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {error || "Bauleiter nicht gefunden"}
            </h2>
            <p className="text-gray-600 mb-4">
              {bauleiterIdParam 
                ? "Der angeforderte Bauleiter konnte nicht geladen werden." 
                : "Bitte wählen Sie einen Bauleiter aus der Navigation aus."}
            </p>
            <Link to={createPageUrl("Disposition")}>
              <Button>Zurück zur Disposition</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
                  <UserCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{bauleiter.full_name}</h1>
                  <p className="text-gray-600">Bauleiter - Projektübersicht</p>
                </div>
              </div>
              
              <Link to={createPageUrl("Disposition")}>
                <Button variant="outline">
                  Zurück zur Übersicht
                </Button>
              </Link>
            </div>

            {/* Statistiken */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="card-elevation border-none">
                <CardContent className="p-6 text-center">
                  <FolderOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  <p className="text-sm text-gray-600">Projekte gesamt</p>
                </CardContent>
              </Card>
              
              <Card className="card-elevation border-none">
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">{activeProjects.length}</p>
                  <p className="text-sm text-gray-600">Aktive Projekte</p>
                </CardContent>
              </Card>
              
              <Card className="card-elevation border-none">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{completedProjects.length}</p>
                  <p className="text-sm text-gray-600">Abgeschlossen</p>
                </CardContent>
              </Card>
              
              <Card className="card-elevation border-none">
                <CardContent className="p-6 text-center">
                  <Euro className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">€{Math.round(totalRevenue).toLocaleString('de-DE')}</p>
                  <p className="text-sm text-gray-600">Gesamtumsatz</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* View Mode Toggle */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="gap-2"
              >
                <Columns className="w-4 h-4" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <List className="w-4 h-4" />
                Liste
              </Button>
            </div>
          </div>

          {viewMode === 'kanban' ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 mb-8">
                {/* Nicht zugewiesen */}
                <div className="flex-shrink-0 w-80">
                  <Card className="card-elevation border-none h-full">
                    <CardHeader className="pb-2 bg-orange-50">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between mb-2">
                        <span>Nicht zugewiesen</span>
                        <Badge variant="outline">{availableProjects.length}</Badge>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                        <Input
                          placeholder="Suchen..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                    </CardHeader>
                    <Droppable droppableId="unassigned">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-3 space-y-3 min-h-[500px] ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}`}
                        >
                          {availableProjects.slice(0, 50).map((project, index) => (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                                >
                                  <Card className="border border-orange-200 bg-orange-50 transition-shadow hover:shadow-md cursor-move">
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        <Link 
                                          to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                                          className="font-semibold text-sm text-gray-900 hover:text-orange-600 line-clamp-2"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {project.title}
                                        </Link>
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <div className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                            {project.project_number}
                                          </div>
                                          <div>SM: {project.sm_number}</div>
                                          <div className="font-medium">{project.client}</div>
                                          {project.city && <div>📍 {project.city}</div>}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {availableProjects.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              Keine Projekte
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </Card>
                </div>

                {/* Zugewiesen */}
                <div className="flex-shrink-0 w-80">
                  <Card className="card-elevation border-none h-full">
                    <CardHeader className="pb-3 bg-blue-50">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Zugewiesen</span>
                        <Badge variant="outline">{activeProjects.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <Droppable droppableId="assigned">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-3 space-y-3 min-h-[500px] ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}`}
                        >
                          {activeProjects.map((project, index) => (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                                >
                                  <Card className="border border-blue-200 bg-blue-50 transition-shadow hover:shadow-md cursor-move">
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        <Link 
                                          to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                                          className="font-semibold text-sm text-gray-900 hover:text-orange-600 line-clamp-2"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {project.title}
                                        </Link>
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <div className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                            {project.project_number}
                                          </div>
                                          <div>SM: {project.sm_number}</div>
                                          <div className="font-medium">{project.client}</div>
                                          {project.city && <div>📍 {project.city}</div>}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {activeProjects.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              Keine Projekte
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </Card>
                </div>

                {/* Erledigt */}
                <div className="flex-shrink-0 w-80">
                  <Card className="card-elevation border-none h-full">
                    <CardHeader className="pb-3 bg-green-50">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Erledigt</span>
                        <Badge variant="outline">{completedProjects.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <Droppable droppableId="completed">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-3 space-y-3 min-h-[500px] ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}`}
                        >
                          {completedProjects.map((project, index) => (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                                >
                                  <Card className="border border-green-200 bg-green-50 transition-shadow hover:shadow-md cursor-move">
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        <Link 
                                          to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                                          className="font-semibold text-sm text-gray-900 hover:text-orange-600 line-clamp-2"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {project.title}
                                        </Link>
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <div className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                            {project.project_number}
                                          </div>
                                          <div>SM: {project.sm_number}</div>
                                          <div className="font-medium">{project.client}</div>
                                          {project.city && <div>📍 {project.city}</div>}
                                        </div>
                                        {project.foreman_completed_date && (
                                          <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                            ✓ {new Date(project.foreman_completed_date).toLocaleDateString('de-DE')}
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {completedProjects.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              Keine Projekte
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </Card>
                </div>
              </div>
            </DragDropContext>
          ) : (
            <>
              {/* Neue Projekte zuweisen */}
              <Card className="card-elevation border-none mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Neue Projekte zuweisen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Projekt suchen (Nummer, Titel, Kunde)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {availableProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchTerm ? 'Keine passenden Projekte gefunden' : 'Alle Projekte sind bereits zugewiesen'}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {availableProjects.slice(0, 10).map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-sm font-bold">
                              {project.project_number}
                            </span>
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusLabel(project.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-900 truncate">{project.title}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {project.client}
                            </span>
                            {project.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {project.city}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAssignProject(project.id)}
                          disabled={assigning === project.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {assigning === project.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Zuweisen
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                    {availableProjects.length > 10 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        Weitere {availableProjects.length - 10} Projekte verfügbar. Nutzen Sie die Suche, um sie zu finden.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Aktive Projekte */}
          <Card className="card-elevation border-none mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Aktive Projekte ({activeProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Keine aktiven Projekte</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="h-full border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">{project.project_number}</h3>
                                <p className="text-sm text-gray-600 truncate">{project.title}</p>
                              </div>
                              <Badge className={getStatusColor(project.status)}>
                                {getStatusLabel(project.status)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span className="truncate">{project.client}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{project.city}</span>
                              </div>
                              {project.start_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Euro className="w-4 h-4" />
                                <span className="font-semibold text-green-600">
                                  €{Math.round(calculateProjectRevenue(project.id)).toLocaleString('de-DE')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)} className="flex-1">
                                <Button size="sm" className="w-full">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Details
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnassignProject(project)}
                                disabled={unassigning === project.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {unassigning === project.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserCircle className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Abgeschlossene Projekte */}
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Abgeschlossene Projekte ({completedProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedProjects.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Noch keine abgeschlossenen Projekte</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="h-full border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">{project.project_number}</h3>
                                <p className="text-sm text-gray-600 truncate">{project.title}</p>
                              </div>
                              <Badge className="bg-green-100 text-green-800">
                                Erledigt
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span className="truncate">{project.client}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{project.city}</span>
                              </div>
                              {project.foreman_completed_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Erledigt: {new Date(project.foreman_completed_date).toLocaleDateString('de-DE')}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Euro className="w-4 h-4" />
                                <span className="font-semibold text-green-600">
                                  €{Math.round(calculateProjectRevenue(project.id)).toLocaleString('de-DE')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)} className="flex-1">
                                <Button size="sm" variant="outline" className="w-full">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Details
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnassignProject(project)}
                                disabled={unassigning === project.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {unassigning === project.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserCircle className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            </>
          )}
        </div>
      </div>

      {/* Bestätigungsdialog für Zuweisung entfernen */}
      {confirmUnassign.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) cancelUnassign(); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md"
          >
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Zuweisung aufheben?</h3>
                    <p className="text-sm text-gray-600">Diese Aktion kann nicht rückgängig gemacht werden</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700 mb-2">
                    Möchten Sie die Zuweisung dieses Projekts wirklich aufheben?
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-900">{confirmUnassign.projectTitle}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Das Projekt wird wieder zur Liste der verfügbaren Projekte hinzugefügt
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={cancelUnassign}
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={confirmUnassignProject}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Zuweisung aufheben
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
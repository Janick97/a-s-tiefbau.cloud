import React, { useState, useEffect, useRef } from 'react';
import { Project, User, MontageAuftrag } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, User as UserIcon, Loader2, Search, Filter, CheckCircle, Clock, Columns, List, X, Users, Construction } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SESSION_KEY = 'disposition_state';

export default function DispositionPage() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.searchTerm || ""; } catch { return ""; }
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.statusFilter || "all"; } catch { return "all"; }
  });
  const [assignmentFilter, setAssignmentFilter] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.assignmentFilter || "all"; } catch { return "all"; }
  });
  const [foremanFilter, setForemanFilter] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.foremanFilter || "all"; } catch { return "all"; }
  });
  const [viewMode, setViewMode] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.viewMode || "kanban"; } catch { return "kanban"; }
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBauleiter, setSelectedBauleiter] = useState([]);
  const [montageAuftraege, setMontageAuftraege] = useState([]);
  const scrollRestoredRef = useRef(false);

  // Speichere State in sessionStorage bei jeder Änderung
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ searchTerm, statusFilter, assignmentFilter, foremanFilter, viewMode }));
  }, [searchTerm, statusFilter, assignmentFilter, foremanFilter, viewMode]);

  // Scroll-Position speichern wenn Nutzer die Seite verlässt
  useEffect(() => {
    const handleScroll = () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {};
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...saved, scrollY: window.scrollY }));
      } catch {}
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsData, allUsers, userData, montageAuftraegeData] = await Promise.all([
        Project.list('-created_date'),
        User.list(),
        User.me().catch(() => null),
        MontageAuftrag.list().catch(() => [])
      ]);
      
      // Filter users: Bauleiter und Oberfläche
      const usersData = allUsers.filter(u => 
        u.position === 'Bauleiter' || u.position === 'Oberfläche'
      );
      
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCurrentUser(userData);
      setMontageAuftraege(Array.isArray(montageAuftraegeData) ? montageAuftraegeData : []);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    }
    setIsLoading(false);
  };

  const handleAssignForeman = async (projectId, userId) => {
    setAssigning(projectId);
    try {
      const user = users.find((u) => u.id === userId);
      const updateData = userId === 'unassign' ? {
        assigned_foreman_id: null,
        assigned_foreman_name: null,
        assigned_bauleiter: []
      } : {
        assigned_foreman_id: userId,
        assigned_foreman_name: user?.full_name || '',
        assigned_bauleiter: [{ id: userId, name: user?.full_name || '' }]
      };
      
      await Project.update(projectId, updateData);

      setProjects(projects.map(p => 
        p.id === projectId 
          ? { ...p, ...updateData }
          : p
      ));
    } catch (error) {
      console.error('Fehler bei der Zuweisung:', error);
    }
    setAssigning(null);
  };

  const handleOpenAssignModal = (project) => {
    setSelectedProject(project);
    setSelectedBauleiter(project.assigned_bauleiter || []);
    setShowAssignModal(true);
  };

  const handleSaveMultipleAssignments = async () => {
    if (!selectedProject) return;

    try {
      const updateData = {
        assigned_bauleiter: selectedBauleiter,
        assigned_foreman_id: selectedBauleiter.length > 0 ? selectedBauleiter[0].id : null,
        assigned_foreman_name: selectedBauleiter.length > 0 ? selectedBauleiter[0].name : null
      };

      await Project.update(selectedProject.id, updateData);

      setProjects(projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, ...updateData }
          : p
      ));

      setShowAssignModal(false);
      setSelectedProject(null);
      setSelectedBauleiter([]);
    } catch (error) {
      console.error('Fehler beim Speichern der Zuweisungen:', error);
    }
  };

  const handleMarkTiefbauOffen = async (project) => {
    if (!project.montage_auftrag_id) return;

    try {
      // Zuerst prüfen ob der Montageauftrag existiert
      const montageAuftrag = await MontageAuftrag.get(project.montage_auftrag_id);
      
      if (!montageAuftrag) {
        alert('Montageauftrag nicht gefunden. Möglicherweise wurde er gelöscht.');
        return;
      }

      const isCurrentlyOpen = montageAuftrag.tiefbau_offen;
      const message = isCurrentlyOpen
        ? 'Möchten Sie den Status auf "Tiefbau noch nicht offen" zurücksetzen?'
        : 'Möchten Sie diesen Auftrag als "Tiefbau offen" markieren?';
      
      if (!window.confirm(message)) return;

      await MontageAuftrag.update(project.montage_auftrag_id, {
        tiefbau_offen: !isCurrentlyOpen,
        tiefbau_offen_date: isCurrentlyOpen ? null : new Date().toISOString()
      });

      // Reload data to refresh the status
      await loadData();
      
      const successMessage = isCurrentlyOpen
        ? 'Status wurde auf "Tiefbau noch nicht offen" zurückgesetzt.'
        : 'Montageauftrag wurde erfolgreich als "Tiefbau offen" markiert!';
      alert(successMessage);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Tiefbau-Status:', error);
      alert('Fehler: Der Montageauftrag konnte nicht aktualisiert werden.');
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const projectId = draggableId;
    const newStatus = destination.droppableId;

    // Update in backend
    try {
      const updateData = {};
      
      if (newStatus === 'unassigned') {
        updateData.assigned_foreman_id = null;
        updateData.assigned_foreman_name = null;
      } else if (newStatus === 'completed') {
        updateData.foreman_completed = true;
        updateData.foreman_completed_date = new Date().toISOString().split('T')[0];
      } else {
        // newStatus is a user ID
        const user = users.find(u => u.id === newStatus);
        updateData.assigned_foreman_id = newStatus;
        updateData.assigned_foreman_name = user?.full_name || '';
        updateData.foreman_completed = false;
      }

      await Project.update(projectId, updateData);

      // Update local state
      setProjects(projects.map(p => 
        p.id === projectId 
          ? { ...p, ...updateData }
          : p
      ));
    } catch (error) {
      console.error('Fehler beim Verschieben:', error);
    }
  };

  // Check if user is admin
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Zugriff verweigert</h2>
            <p className="text-gray-600">
              Nur Administratoren haben Zugriff auf die Disposition.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredProjects = projects.filter(project => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (project.title || '').toLowerCase().includes(searchLower) ||
      (project.project_number || '').toLowerCase().includes(searchLower) ||
      (project.client || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    let matchesAssignment = true;
    if (assignmentFilter === "assigned") {
      matchesAssignment = !!(project.assigned_bauleiter && project.assigned_bauleiter.length > 0) || !!project.assigned_foreman_id;
    } else if (assignmentFilter === "unassigned") {
      matchesAssignment = !(project.assigned_bauleiter && project.assigned_bauleiter.length > 0) && !project.assigned_foreman_id;
    }

    let matchesForeman = true;
    if (foremanFilter !== "all") {
      const bauleiterIds = (project.assigned_bauleiter || []).map(b => b.id);
      matchesForeman = bauleiterIds.includes(foremanFilter) || project.assigned_foreman_id === foremanFilter;
    }

    return matchesSearch && matchesStatus && matchesAssignment && matchesForeman;
  });

  // Group projects by assignment status for list view
  const assignedProjects = filteredProjects.filter(p => (p.assigned_bauleiter && p.assigned_bauleiter.length > 0) || p.assigned_foreman_id);
  const unassignedProjects = filteredProjects.filter(p => !(p.assigned_bauleiter && p.assigned_bauleiter.length > 0) && !p.assigned_foreman_id);

  // Group projects for Kanban view - ordered array for consistent display
  const kanbanColumns = [
    {
      id: 'unassigned',
      title: 'Nicht zugewiesen',
      color: 'orange',
      projects: filteredProjects.filter(p => 
        !(p.assigned_bauleiter && p.assigned_bauleiter.length > 0) && 
        !p.assigned_foreman_id && 
        !p.foreman_completed
      )
    },
    // Add all Bauleiter columns
    ...users.map(user => ({
      id: user.id,
      title: user.full_name,
      color: 'blue',
      projects: filteredProjects.filter(p => {
        const bauleiterIds = (p.assigned_bauleiter || []).map(b => b.id);
        return (bauleiterIds.includes(user.id) || p.assigned_foreman_id === user.id) && !p.foreman_completed;
      })
    })),
    {
      id: 'completed',
      title: 'Erledigt',
      color: 'green',
      projects: filteredProjects.filter(p => p.foreman_completed)
    }
  ];

  const renderSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="card-elevation">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-48" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-2 sm:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-8"
        >
          {/* Mobile Header - kompakt */}
          <div className="flex items-center gap-2 mb-3 md:hidden">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Disposition</h1>
              <p className="text-xs text-gray-600">Bauleiter zuweisen</p>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Disposition</h1>
              <p className="text-gray-600">Weisen Sie Projekte den Bauleitern zu.</p>
            </div>
          </div>

          {/* Statistics - Mobile optimiert */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white p-2 md:p-4 rounded-lg shadow">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs md:text-sm font-medium truncate">Nicht: {unassignedProjects.length}</span>
              </div>
            </div>
            <div className="bg-white p-2 md:p-4 rounded-lg shadow">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs md:text-sm font-medium truncate">Zugewiesen: {assignedProjects.length}</span>
              </div>
            </div>
            <div className="bg-white p-2 md:p-4 rounded-lg shadow">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs md:text-sm font-medium truncate">Erledigt: {assignedProjects.filter(p => p.foreman_completed).length}</span>
              </div>
            </div>
            <div className="bg-white p-2 md:p-4 rounded-lg shadow">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-gray-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs md:text-sm font-medium truncate">Bauleiter: {users.length}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* View Mode Toggle - Mobile optimiert */}
        <div className="flex justify-end mb-3 md:mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 md:p-1">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-1 md:gap-2 text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
            >
              <Columns className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-1 md:gap-2 text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
            >
              <List className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Liste</span>
            </Button>
          </div>
        </div>

        {/* Filters - Mobile optimiert */}
        <Card className="card-elevation border-none mb-4 md:mb-8">
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Suche..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 md:h-10 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="planning">Planung</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="on_hold">Pausiert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <UserIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Zuweisung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Projekte</SelectItem>
                  <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                  <SelectItem value="assigned">Zugewiesen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={foremanFilter} onValueChange={setForemanFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <UserIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Bauleiter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Bauleiter</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? renderSkeleton() : (
          <>
            {viewMode === 'kanban' ? (
              <DragDropContext onDragEnd={onDragEnd}>
                {/* Desktop: Horizontale Spalten */}
                <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
                  {kanbanColumns.map((column) => (
                    <div key={column.id} className="flex-shrink-0 w-80">
                      <Card className="card-elevation border-none h-full">
                        <CardHeader className={`pb-3 ${
                          column.color === 'orange' ? 'bg-orange-50' :
                          column.color === 'green' ? 'bg-green-50' :
                          'bg-blue-50'
                        }`}>
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span>{column.title}</span>
                            <Badge variant="outline" className="ml-2">
                              {column.projects.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <Droppable droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-3 space-y-3 min-h-[500px] ${
                                snapshot.isDraggingOver ? 'bg-gray-50' : ''
                              }`}
                            >
                              {column.projects.map((project, index) => (
                                <Draggable
                                  key={project.id}
                                  draggableId={project.id}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                                    >
                                      <Card className={`border transition-shadow hover:shadow-md cursor-move ${
                                        project.foreman_completed ? 'border-green-200 bg-green-50' :
                                        project.assigned_foreman_id ? 'border-blue-200 bg-blue-50' :
                                        'border-orange-200 bg-orange-50'
                                      }`}>
                                        <CardContent className="p-3">
                                          <div className="space-y-2">
                                            <div>
                                              <Link 
                                                to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                                                className="font-semibold text-sm text-gray-900 hover:text-orange-600 line-clamp-2"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {project.title}
                                              </Link>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                              <div className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                                {project.project_number}
                                              </div>
                                              <div>SM: {project.sm_number}</div>
                                              <div className="font-medium">{project.client}</div>
                                              {project.city && <div>📍 {project.city}</div>}
                                            </div>
                                            {project.foreman_completed && project.foreman_completed_date && (
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
                              {column.projects.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                  Keine Projekte
                                </div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </Card>
                    </div>
                  ))}
                </div>

                {/* Mobile: Vertikale Abschnitte mit kompakten Karten */}
                <div className="md:hidden space-y-3">
                  {kanbanColumns.map((column) => (
                    column.projects.length > 0 && (
                      <Card key={column.id} className="card-elevation border-none">
                        <CardHeader className={`py-2 px-3 ${
                          column.color === 'orange' ? 'bg-orange-50' :
                          column.color === 'green' ? 'bg-green-50' :
                          'bg-blue-50'
                        }`}>
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span className="truncate">{column.title}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {column.projects.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-2">
                          {column.projects.map((project) => (
                            <Card key={project.id} className={`border ${
                              project.foreman_completed ? 'border-green-200 bg-green-50' :
                              project.assigned_foreman_id ? 'border-blue-200 bg-blue-50' :
                              'border-orange-200 bg-orange-50'
                            }`}>
                              <CardContent className="p-2">
                                <div className="space-y-1.5">
                                  <Link 
                                    to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                                    className="font-semibold text-xs text-gray-900 hover:text-orange-600 line-clamp-2 block"
                                  >
                                    {project.title}
                                  </Link>
                                  <div className="text-[10px] text-gray-600 space-y-0.5">
                                    <div className="font-mono bg-white px-1.5 py-0.5 rounded border inline-block">
                                      {project.project_number}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                      <span>SM: {project.sm_number}</span>
                                      <span>•</span>
                                      <span className="font-medium">{project.client}</span>
                                    </div>
                                    {project.city && <div>📍 {project.city}</div>}
                                  </div>
                                  {project.foreman_completed && project.foreman_completed_date && (
                                    <div className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                      ✓ {new Date(project.foreman_completed_date).toLocaleDateString('de-DE')}
                                    </div>
                                  )}
                                  {column.id !== 'unassigned' && column.id !== 'completed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenAssignModal(project)}
                                      className="w-full h-7 text-[10px] mt-1"
                                    >
                                      <Users className="w-3 h-3 mr-1" />
                                      Bearbeiten
                                    </Button>
                                  )}
                                  {column.id === 'unassigned' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenAssignModal(project)}
                                      className="w-full h-7 text-[10px] mt-1 bg-orange-50 border-orange-200 text-orange-700"
                                    >
                                      <Users className="w-3 h-3 mr-1" />
                                      Zuweisen
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </CardContent>
                      </Card>
                    )
                  ))}
                </div>
              </DragDropContext>
            ) : (
              <div className="space-y-2 md:space-y-4">
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`card-elevation border-none transition-shadow hover:shadow-lg ${
                      project.foreman_completed ? 'bg-green-50 border-l-4 border-l-green-500' :
                      project.assigned_foreman_id ? 'border-l-4 border-l-blue-500' : 
                      'border-l-4 border-l-orange-500'
                    }`}>
                      <CardContent className="p-2 md:p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
                          <div className="flex-1 space-y-1 w-full">
                            <div className="flex items-start gap-2 flex-wrap">
                              <Link 
                                to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                                className="font-semibold text-sm md:text-base text-gray-900 hover:text-orange-600 line-clamp-2 flex-1"
                              >
                                {project.title}
                              </Link>
                              <div className="flex gap-1 flex-wrap flex-shrink-0">
                                {project.foreman_completed && (
                                  <Badge className="bg-green-100 text-green-800 text-[10px] md:text-xs h-5">
                                    <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                                    Erledigt
                                  </Badge>
                                )}
                                {project.assigned_foreman_id && !project.foreman_completed && (
                                  <Badge className="bg-blue-100 text-blue-800 text-[10px] md:text-xs h-5">
                                    <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                                    Aktiv
                                  </Badge>
                                )}
                                {!project.assigned_foreman_id && (
                                  <Badge className="bg-orange-100 text-orange-800 text-[10px] md:text-xs h-5">
                                    Offen
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] md:text-sm text-gray-500 flex-wrap">
                              <span className="font-mono bg-orange-50 text-orange-700 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[10px] md:text-xs">
                                {project.project_number}
                              </span>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-[10px] md:text-xs">SM: {project.sm_number}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-[10px] md:text-xs font-medium">{project.client}</span>
                            </div>
                            {((project.assigned_bauleiter && project.assigned_bauleiter.length > 0) || project.assigned_foreman_name) && (
                              <div className="flex items-center gap-1.5 text-xs md:text-sm flex-wrap">
                                <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-500 flex-shrink-0" />
                                <span className="text-blue-600 font-medium text-[10px] md:text-xs">
                                  {
                                    project.assigned_bauleiter && project.assigned_bauleiter.length > 0
                                      ? project.assigned_bauleiter.map(b => b.name).join(', ')
                                      : project.assigned_foreman_name
                                  }
                                </span>
                                {project.foreman_completed && project.foreman_completed_date && (
                                  <span className="text-green-600 text-[9px] md:text-xs">
                                    ({new Date(project.foreman_completed_date).toLocaleDateString('de-DE')})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAssignModal(project)}
                              className="flex-1 md:flex-initial h-7 md:h-9 text-[10px] md:text-sm"
                            >
                              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              <span className="hidden sm:inline">Bauleiter</span>
                            </Button>
                            {project.montage_auftrag_id && (() => {
                              const montageAuftrag = montageAuftraege.find(m => m.id === project.montage_auftrag_id);
                              const isTiefbauOffen = montageAuftrag?.tiefbau_offen;
                              
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkTiefbauOffen(project)}
                                  className={`h-7 md:h-9 text-[10px] md:text-sm ${isTiefbauOffen 
                                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                    : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                  }`}
                                >
                                  {isTiefbauOffen ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                      <span className="hidden sm:inline">Offen</span>
                                    </>
                                  ) : (
                                    <>
                                      <Construction className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                      <span className="hidden sm:inline">Nicht offen</span>
                                    </>
                                  )}
                                </Button>
                              );
                            })()}
                            {assigning === project.id && (
                              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-orange-500" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {filteredProjects.length === 0 && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 md:py-16"
                  >
                    <ClipboardList className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg md:text-xl font-medium text-gray-500 mb-2">
                      Keine Projekte gefunden
                    </h3>
                    <p className="text-sm md:text-base text-gray-400">
                      Versuchen Sie andere Filter oder Suchbegriffe
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}

        {/* Assignment Modal */}
        <AnimatePresence>
          {showAssignModal && selectedProject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) setShowAssignModal(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md"
              >
                <Card className="card-elevation border-none">
                  <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Bauleiter zuweisen
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setShowAssignModal(false)} className="text-white hover:bg-white/20">
                      <X className="w-4 h-4" />
                    </Button>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{selectedProject.project_number}</h3>
                      <p className="text-sm text-gray-600">{selectedProject.title}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Bauleiter auswählen</Label>
                        {selectedBauleiter.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBauleiter([])}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Alle entfernen
                          </Button>
                        )}
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50 space-y-2 max-h-64 overflow-y-auto">
                        {users.map(user => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bauleiter-${user.id}`}
                              checked={selectedBauleiter.some(b => b.id === user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBauleiter([...selectedBauleiter, { id: user.id, name: user.full_name }]);
                                } else {
                                  setSelectedBauleiter(selectedBauleiter.filter(b => b.id !== user.id));
                                }
                              }}
                            />
                            <Label htmlFor={`bauleiter-${user.id}`} className="cursor-pointer text-sm">
                              {user.full_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {selectedBauleiter.length > 0 && (
                        <p className="text-xs text-gray-600">
                          {selectedBauleiter.length} Bauleiter ausgewählt
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                        Abbrechen
                      </Button>
                      <Button onClick={handleSaveMultipleAssignments}>
                        Speichern
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
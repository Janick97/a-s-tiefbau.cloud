import React, { useState, useEffect } from 'react';
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

export default function DispositionPage() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [foremanFilter, setForemanFilter] = useState("all");
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' or 'list'
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBauleiter, setSelectedBauleiter] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsData, allUsers, userData] = await Promise.all([
        Project.list('-created_date'),
        User.list(),
        User.me().catch(() => null)
      ]);
      
      // Filter users: Bauleiter und Oberfläche
      const usersData = allUsers.filter(u => 
        u.position === 'Bauleiter' || u.position === 'Oberfläche'
      );
      
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCurrentUser(userData);
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

      await MontageAuftrag.update(project.montage_auftrag_id, {
        tiefbau_offen: true,
        tiefbau_offen_date: new Date().toISOString()
      });

      alert('Montageauftrag wurde erfolgreich als "Tiefbau offen" markiert!');
    } catch (error) {
      console.error('Fehler beim Markieren als Tiefbau offen:', error);
      alert('Fehler: Der Montageauftrag konnte nicht gefunden werden. Bitte erstellen Sie einen neuen Montageauftrag.');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Disposition</h1>
              <p className="text-gray-600">Weisen Sie Projekte den Bauleitern zu.</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium">Nicht zugewiesen: {unassignedProjects.length}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Zugewiesen: {assignedProjects.length}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Erledigt: {assignedProjects.filter(p => p.foreman_completed).length}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="font-medium">Bauleiter verfügbar: {users.length}</span>
              </div>
            </div>
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

        {/* Filters */}
        <Card className="card-elevation border-none mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Suche nach Projekt, Nummer oder Kunde..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status filtern" />
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
                <SelectTrigger>
                  <UserIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Zuweisung filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Projekte</SelectItem>
                  <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                  <SelectItem value="assigned">Zugewiesen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={foremanFilter} onValueChange={setForemanFilter}>
                <SelectTrigger>
                  <UserIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Bauleiter filtern" />
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
                <div className="flex gap-4 overflow-x-auto pb-4">
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
              </DragDropContext>
            ) : (
              <div className="space-y-4">
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
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <Link 
                                to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                                className="font-semibold text-gray-900 hover:text-orange-600"
                              >
                                {project.title}
                              </Link>
                              <div className="flex gap-2">
                                {project.foreman_completed && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Erledigt
                                  </Badge>
                                )}
                                {project.assigned_foreman_id && !project.foreman_completed && (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    In Bearbeitung
                                  </Badge>
                                )}
                                {!project.assigned_foreman_id && (
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Nicht zugewiesen
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
                                {project.project_number}
                              </span>
                              <span>•</span>
                              <span>SM: {project.sm_number}</span>
                              <span>•</span>
                              <span>{project.client}</span>
                            </div>
                            {((project.assigned_bauleiter && project.assigned_bauleiter.length > 0) || project.assigned_foreman_name) && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-600 font-medium">
                                  Zugewiesen an: {
                                    project.assigned_bauleiter && project.assigned_bauleiter.length > 0
                                      ? project.assigned_bauleiter.map(b => b.name).join(', ')
                                      : project.assigned_foreman_name
                                  }
                                </span>
                                {project.foreman_completed && project.foreman_completed_date && (
                                  <span className="text-green-600 text-xs">
                                    (Erledigt am {new Date(project.foreman_completed_date).toLocaleDateString('de-DE')})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAssignModal(project)}
                              className="flex-1 md:flex-initial"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Bauleiter zuweisen
                            </Button>
                            {project.montage_auftrag_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkTiefbauOffen(project)}
                                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                              >
                                <Construction className="w-4 h-4 mr-2" />
                                Tiefbau offen
                              </Button>
                            )}
                            {assigning === project.id && (
                              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
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
                    className="text-center py-16"
                  >
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-medium text-gray-500 mb-2">
                      Keine Projekte gefunden
                    </h3>
                    <p className="text-gray-400">
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
                      <Label className="text-sm font-medium">Bauleiter auswählen</Label>
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
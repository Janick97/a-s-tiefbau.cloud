import React, { useState, useEffect } from 'react';
import { MontageAuftrag, User } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, User as UserIcon, Loader2, Search, Filter, CheckCircle, Clock, Columns, List, Users, X, Save, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DispositionMonteurPage() {
  const [montageAuftraege, setMontageAuftraege] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [monteurFilter, setMonteurFilter] = useState("all");
  const [viewMode, setViewMode] = useState("kanban");
  const [showMonteurDialog, setShowMonteurDialog] = useState(false);
  const [currentMonteurAuftrag, setCurrentMonteurAuftrag] = useState(null);
  const [selectedMonteure, setSelectedMonteure] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [montageData, allUsers, userData] = await Promise.all([
        MontageAuftrag.list('-created_date'),
        User.list(),
        User.me().catch(() => null)
      ]);
      
      const usersData = allUsers.filter(u => u.position === 'Monteur');
      
      setMontageAuftraege(Array.isArray(montageData) ? montageData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    }
    setIsLoading(false);
  };

  const handleMonteurClick = (auftrag) => {
    setCurrentMonteurAuftrag(auftrag);
    setSelectedMonteure(auftrag.assigned_monteure || []);
    setShowMonteurDialog(true);
  };

  const handleToggleMonteur = (monteur) => {
    setSelectedMonteure(prev => {
      const exists = prev.find(m => m.id === monteur.id);
      if (exists) {
        return prev.filter(m => m.id !== monteur.id);
      } else {
        return [...prev, { id: monteur.id, name: monteur.full_name }];
      }
    });
  };

  const handleSaveMonteure = async () => {
    if (!currentMonteurAuftrag) return;
    
    setAssigning(currentMonteurAuftrag.id);
    try {
      await MontageAuftrag.update(currentMonteurAuftrag.id, {
        assigned_monteure: selectedMonteure
      });
      setShowMonteurDialog(false);
      setCurrentMonteurAuftrag(null);
      setSelectedMonteure([]);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Speichern der Monteure:", error);
      alert(`Fehler beim Speichern: ${error.message}`);
    }
    setAssigning(null);
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const montageAuftragId = draggableId;
    const newStatus = destination.droppableId;

    try {
      const updateData = {};
      
      if (newStatus === 'unassigned') {
        updateData.assigned_monteur_id = null;
        updateData.assigned_monteur_name = null;
      } else if (newStatus === 'completed') {
        updateData.monteur_completed = true;
        updateData.monteur_completed_date = new Date().toISOString().split('T')[0];
      } else {
        const user = users.find(u => u.id === newStatus);
        updateData.assigned_monteur_id = newStatus;
        updateData.assigned_monteur_name = user?.full_name || '';
        updateData.monteur_completed = false;
      }

      await MontageAuftrag.update(montageAuftragId, updateData);

      setMontageAuftraege(montageAuftraege.map(m => 
        m.id === montageAuftragId 
          ? { ...m, ...updateData }
          : m
      ));
    } catch (error) {
      console.error('Fehler beim Verschieben:', error);
    }
  };

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Zugriff verweigert</h2>
            <p className="text-gray-600">
              Nur Administratoren haben Zugriff auf die Monteur-Disposition.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredMontageAuftraege = montageAuftraege.filter(montage => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (montage.title || '').toLowerCase().includes(searchLower) ||
      (montage.project_number || '').toLowerCase().includes(searchLower) ||
      (montage.sm_number || '').toLowerCase().includes(searchLower) ||
      (montage.client || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || montage.status === statusFilter;

    const isAssigned = (Array.isArray(montage.assigned_monteure) && montage.assigned_monteure.length > 0) || !!montage.assigned_monteur_id;

    let matchesAssignment = true;
    if (assignmentFilter === "assigned") {
      matchesAssignment = isAssigned;
    } else if (assignmentFilter === "unassigned") {
      matchesAssignment = !isAssigned;
    }

    let matchesMonteur = true;
    if (monteurFilter !== "all") {
      matchesMonteur = (Array.isArray(montage.assigned_monteure) && montage.assigned_monteure.some(m => m && m.id === monteurFilter)) || 
                       montage.assigned_monteur_id === monteurFilter;
    }

    return matchesSearch && matchesStatus && matchesAssignment && matchesMonteur;
  });

  const assignedMontage = filteredMontageAuftraege.filter(m => 
    (Array.isArray(m.assigned_monteure) && m.assigned_monteure.length > 0) || !!m.assigned_monteur_id
  );
  const unassignedMontage = filteredMontageAuftraege.filter(m => 
    !((Array.isArray(m.assigned_monteure) && m.assigned_monteure.length > 0) || !!m.assigned_monteur_id)
  );

  const kanbanColumns = [
    {
      id: 'unassigned',
      title: 'Nicht zugewiesen',
      color: 'orange',
      icon: Clock,
      montageAuftraege: filteredMontageAuftraege.filter(m => !m.assigned_monteure?.length && !m.assigned_monteur_id && !m.monteur_completed)
    },
    ...users.map(user => ({
      id: user.id,
      title: user.full_name,
      color: 'blue',
      icon: UserIcon,
      montageAuftraege: filteredMontageAuftraege.filter(m => 
        (m.assigned_monteure?.some(mt => mt.id === user.id) || m.assigned_monteur_id === user.id) && !m.monteur_completed
      )
    })),
    {
      id: 'completed',
      title: 'Erledigt',
      color: 'green',
      icon: CheckCircle,
      montageAuftraege: filteredMontageAuftraege.filter(m => m.monteur_completed)
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
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Monteur-Disposition</h1>
              <p className="text-gray-600">Weisen Sie Montageaufträge den Monteuren zu.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium">Nicht zugewiesen: {unassignedMontage.length}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Zugewiesen: {assignedMontage.length}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Erledigt: {assignedMontage.filter(m => m.monteur_completed).length}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="font-medium">Monteure verfügbar: {users.length}</span>
              </div>
            </div>
          </div>
        </motion.div>

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

        <Card className="card-elevation border-none mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Suche nach Auftrag, SM-Nummer oder Kunde..."
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
                  <SelectItem value="Auftrag neu">Auftrag neu</SelectItem>
                  <SelectItem value="In Bearbeitung">In Bearbeitung</SelectItem>
                  <SelectItem value="Montage fertig">Montage fertig</SelectItem>
                  <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger>
                  <UserIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Zuweisung filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Aufträge</SelectItem>
                  <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                  <SelectItem value="assigned">Zugewiesen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={monteurFilter} onValueChange={setMonteurFilter}>
                <SelectTrigger>
                  <UserIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Monteur filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Monteure</SelectItem>
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
              <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanColumns.map((column) => {
                  const Icon = column.icon;
                  return (
                    <div key={column.id} className="flex-shrink-0 w-80">
                      <Card className={`border-none h-full shadow-lg ${
                        column.color === 'orange' ? 'border-t-4 border-t-orange-500' :
                        column.color === 'green' ? 'border-t-4 border-t-green-500' :
                        'border-t-4 border-t-blue-500'
                      }`}>
                        <CardHeader className={`pb-3 ${
                          column.color === 'orange' ? 'bg-gradient-to-br from-orange-50 to-amber-50' :
                          column.color === 'green' ? 'bg-gradient-to-br from-green-50 to-emerald-50' :
                          'bg-gradient-to-br from-blue-50 to-indigo-50'
                        }`}>
                          <CardTitle className="text-base font-bold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="w-5 h-5" />}
                              <span>{column.title}</span>
                            </div>
                            <Badge variant="secondary" className={`ml-2 ${
                              column.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              column.color === 'green' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {column.montageAuftraege.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                          <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                            {column.montageAuftraege.map((montage) => (
                              <Card 
                                key={montage.id} 
                                className="border hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => handleMonteurClick(montage)}
                              >
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
                                      {montage.title}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs font-mono">
                                        {montage.project_number}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium">SM:</span> {montage.sm_number}
                                      </div>
                                      <div className="font-medium text-gray-700">{montage.client}</div>
                                      {montage.city && <div className="flex items-center gap-1">📍 {montage.city}</div>}
                                    </div>
                                    {(montage.assigned_monteure?.length > 0 || montage.assigned_monteur_name) && (
                                      <div className="pt-2 border-t">
                                        <div className="flex items-center gap-1 text-xs text-blue-700">
                                          <Users className="w-3 h-3" />
                                          <span className="font-medium">
                                            {montage.assigned_monteure?.length > 0 
                                              ? montage.assigned_monteure.map(m => m.name).join(', ')
                                              : montage.assigned_monteur_name
                                            }
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {montage.monteur_completed && montage.monteur_completed_date && (
                                      <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        {new Date(montage.monteur_completed_date).toLocaleDateString('de-DE')}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {column.montageAuftraege.length === 0 && (
                              <div className="text-center py-12 text-gray-400 text-sm">
                                <Icon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Keine Aufträge</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMontageAuftraege.map((montage, index) => (
                  <motion.div
                    key={montage.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`card-elevation border-none transition-shadow hover:shadow-lg ${
                      montage.monteur_completed ? 'bg-green-50 border-l-4 border-l-green-500' :
                      montage.assigned_monteur_id ? 'border-l-4 border-l-blue-500' : 
                      'border-l-4 border-l-orange-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-900">
                                {montage.title}
                              </span>
                              <div className="flex gap-2">
                                {montage.monteur_completed && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Erledigt
                                  </Badge>
                                )}
                                {((montage.assigned_monteure?.length > 0) || montage.assigned_monteur_id) && !montage.monteur_completed && (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    In Bearbeitung
                                  </Badge>
                                )}
                                {!montage.assigned_monteure?.length && !montage.assigned_monteur_id && (
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Nicht zugewiesen
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
                                {montage.project_number}
                              </span>
                              <span>•</span>
                              <span>SM: {montage.sm_number}</span>
                              <span>•</span>
                              <span>{montage.client}</span>
                            </div>
                            {(montage.assigned_monteure?.length > 0 || montage.assigned_monteur_name) && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-600 font-medium">
                                  Zugewiesen an: {montage.assigned_monteure?.length > 0 
                                    ? montage.assigned_monteure.map(m => m.name).join(', ')
                                    : montage.assigned_monteur_name
                                  }
                                </span>
                                {montage.monteur_completed && montage.monteur_completed_date && (
                                  <span className="text-green-600 text-xs">
                                    (Erledigt am {new Date(montage.monteur_completed_date).toLocaleDateString('de-DE')})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMonteurClick(montage)}
                              className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Monteure zuweisen
                            </Button>
                            <Link to={createPageUrl(`MontageAuftragDetail?id=${montage.id}`)}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Details
                              </Button>
                            </Link>
                            {assigning === montage.id && (
                              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {filteredMontageAuftraege.length === 0 && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-medium text-gray-500 mb-2">
                      Keine Montageaufträge gefunden
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

        <AnimatePresence>
          {showMonteurDialog && currentMonteurAuftrag && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) setShowMonteurDialog(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg"
              >
                <Card className="border-none shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Monteure zuweisen
                    </CardTitle>
                    <p className="text-sm text-purple-100 mt-1">
                      {currentMonteurAuftrag.sm_number} - {currentMonteurAuftrag.title}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-4">
                        Wählen Sie die Monteure aus, die diesem Auftrag zugewiesen werden sollen:
                      </p>
                      
                      {selectedMonteure.length > 0 && (
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm font-medium text-purple-900 mb-2">
                            Zugewiesene Monteure ({selectedMonteure.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedMonteure.map(m => (
                              <Badge key={m.id} className="bg-purple-100 text-purple-800 border-purple-300">
                                {m.name}
                                <button
                                  onClick={() => handleToggleMonteur({ id: m.id, full_name: m.name })}
                                  className="ml-1 hover:text-purple-900"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {users.map(monteur => {
                          const isSelected = selectedMonteure.some(m => m.id === monteur.id);
                          return (
                            <div
                              key={monteur.id}
                              onClick={() => handleToggleMonteur(monteur)}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-purple-50 border-purple-300 shadow-sm'
                                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleMonteur(monteur)}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{monteur.full_name}</p>
                                <p className="text-sm text-gray-600">{monteur.email}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowMonteurDialog(false);
                        setCurrentMonteurAuftrag(null);
                        setSelectedMonteure([]);
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button onClick={handleSaveMonteure} className="bg-purple-600 hover:bg-purple-700">
                      <Save className="w-4 h-4 mr-2" />
                      Speichern
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
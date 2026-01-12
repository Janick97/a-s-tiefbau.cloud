import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MontageAuftrag, User } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Wrench, User as UserIcon, CheckCircle, Calendar, Loader2, MapPin, Columns, List, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function DispositionMonteurDetailPage() {
  const location = useLocation();
  const [monteur, setMonteur] = useState(null);
  const [montageAuftraege, setMontageAuftraege] = useState([]);
  const [allMontageAuftraege, setAllMontageAuftraege] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [unassigningMontage, setUnassigningMontage] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const monteurId = urlParams.get('id');

      if (!monteurId) {
        setError('Keine Monteur-ID angegeben');
        setIsLoading(false);
        return;
      }

      const [monteurData, allMontageData] = await Promise.all([
        User.get(monteurId),
        MontageAuftrag.list('-created_date')
      ]);

      const safeAllMontageData = Array.isArray(allMontageData) ? allMontageData : [];
      
      // Filter Montageaufträge die diesem Monteur zugewiesen sind
      const montageData = safeAllMontageData.filter(m => {
        // Prüfe assigned_monteur_id (alte Methode)
        const matchesMonteurId = m.assigned_monteur_id === monteurId;
        
        // Prüfe assigned_monteure Array (neue Methode)
        const matchesMonteureArray = Array.isArray(m.assigned_monteure) && 
                                     m.assigned_monteure.some(mt => mt && mt.id === monteurId);
        
        return matchesMonteurId || matchesMonteureArray;
      });
      
      setMonteur(monteurData);
      setMontageAuftraege(montageData);
      setAllMontageAuftraege(safeAllMontageData);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setError('Fehler beim Laden der Daten');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, location.search]);

  const handleUnassign = async () => {
    if (!unassigningMontage || !monteur) return;

    try {
      // Entferne diesen Monteur aus dem assigned_monteure Array
      const currentMonteure = unassigningMontage.assigned_monteure || [];
      const updatedMonteure = currentMonteure.filter(m => m.id !== monteur.id);

      await MontageAuftrag.update(unassigningMontage.id, {
        assigned_monteure: updatedMonteure,
        // Für Rückwärtskompatibilität auch alte Felder leeren falls keine Monteure mehr zugewiesen
        assigned_monteur_id: updatedMonteure.length > 0 ? unassigningMontage.assigned_monteur_id : null,
        assigned_monteur_name: updatedMonteure.length > 0 ? unassigningMontage.assigned_monteur_name : null
      });

      await loadData();
      setShowUnassignDialog(false);
      setUnassigningMontage(null);
    } catch (error) {
      console.error('Fehler beim Entfernen der Zuweisung:', error);
      alert('Fehler beim Entfernen der Zuweisung');
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const montageId = draggableId;
    const newStatus = destination.droppableId;

    try {
      const updateData = {};
      
      if (newStatus === 'unassigned') {
        // Entferne diesen Monteur aus assigned_monteure
        const currentMontage = montageAuftraege.find(m => m.id === montageId);
        const currentMonteure = currentMontage?.assigned_monteure || [];
        const updatedMonteure = currentMonteure.filter(m => m.id !== monteur.id);
        
        updateData.assigned_monteure = updatedMonteure;
        updateData.assigned_monteur_id = updatedMonteure.length > 0 ? currentMontage.assigned_monteur_id : null;
        updateData.assigned_monteur_name = updatedMonteure.length > 0 ? currentMontage.assigned_monteur_name : null;
        updateData.monteur_completed = false;
        updateData.monteur_completed_date = null;
      } else if (newStatus === 'completed') {
        updateData.monteur_completed = true;
        updateData.monteur_completed_date = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'assigned') {
        // Füge diesen Monteur zu assigned_monteure hinzu
        const currentMontage = allMontageAuftraege.find(m => m.id === montageId);
        const currentMonteure = currentMontage?.assigned_monteure || [];
        const alreadyAssigned = currentMonteure.some(m => m.id === monteur.id);
        
        if (!alreadyAssigned) {
          updateData.assigned_monteure = [...currentMonteure, { id: monteur.id, name: monteur.full_name }];
        }
        updateData.monteur_completed = false;
      }

      await MontageAuftrag.update(montageId, updateData);
      await loadData();
    } catch (error) {
      console.error('Fehler beim Verschieben:', error);
    }
  };

  const availableMontageAuftraege = React.useMemo(() => {
    const safeAllMontageAuftraege = Array.isArray(allMontageAuftraege) ? allMontageAuftraege : [];
    return safeAllMontageAuftraege.filter(m => {
      const isAssignedToThisMonteur = m.assigned_monteur_id === monteur?.id || 
                                      (Array.isArray(m.assigned_monteure) && m.assigned_monteure.some(mt => mt && mt.id === monteur?.id));
      const notAssignedToThisMonteur = !isAssignedToThisMonteur;
      
      const matchesSearch = searchTerm ? (
        (m.project_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.client || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;
      return notAssignedToThisMonteur && matchesSearch;
    });
  }, [allMontageAuftraege, monteur?.id, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <Link to={createPageUrl('DispositionMonteur')}>
              <Button>Zurück zur Übersicht</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedMontage = montageAuftraege.filter(m => m.monteur_completed);
  const activeMontage = montageAuftraege.filter(m => !m.monteur_completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link to={createPageUrl('DispositionMonteur')}>
              <Button variant="outline" size="sm">← Zurück</Button>
            </Link>
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {monteur?.full_name}
              </h1>
              <p className="text-gray-600">Montageaufträge im Überblick</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-elevation border-none bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-lg">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-900">{montageAuftraege.length}</p>
                    <p className="text-sm font-medium text-blue-700">Gesamt Aufträge</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevation border-none bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-600 rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-orange-900">{activeMontage.length}</p>
                    <p className="text-sm font-medium text-orange-700">Aktive Aufträge</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevation border-none bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-600 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-900">{completedMontage.length}</p>
                    <p className="text-sm font-medium text-green-700">Erledigt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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

        {viewMode === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              <div className="flex-shrink-0 w-80">
                <Card className="card-elevation border-none h-full">
                  <CardHeader className="pb-2 bg-orange-50">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between mb-2">
                      <span>Nicht zugewiesen</span>
                      <Badge variant="outline">{availableMontageAuftraege.length}</Badge>
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
                        {availableMontageAuftraege.slice(0, 50).map((montage, index) => (
                          <Draggable key={montage.id} draggableId={montage.id} index={index}>
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
                                      <div className="font-semibold text-sm text-gray-900 line-clamp-2">
                                        {montage.title}
                                      </div>
                                      <div className="text-xs text-gray-600 space-y-1">
                                        <div className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                          {montage.project_number}
                                        </div>
                                        <div>SM: {montage.sm_number}</div>
                                        <div className="font-medium">{montage.client}</div>
                                        {montage.city && <div>📍 {montage.city}</div>}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {availableMontageAuftraege.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            Keine Aufträge
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </Card>
              </div>

              <div className="flex-shrink-0 w-80">
                <Card className="card-elevation border-none h-full">
                  <CardHeader className="pb-3 bg-blue-50">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Zugewiesen</span>
                      <Badge variant="outline">{activeMontage.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <Droppable droppableId="assigned">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 space-y-3 min-h-[500px] ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}`}
                      >
                        {activeMontage.map((montage, index) => (
                          <Draggable key={montage.id} draggableId={montage.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                              >
                                <Link to={createPageUrl(`MontageAuftragDetail?id=${montage.id}`)}>
                                  <Card className="border border-blue-200 bg-blue-50 transition-shadow hover:shadow-md cursor-pointer">
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        <div className="font-semibold text-sm text-gray-900 line-clamp-2">
                                          {montage.title}
                                        </div>
                                      <div className="text-xs text-gray-600 space-y-1">
                                        <div className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                          {montage.project_number}
                                        </div>
                                        <div>SM: {montage.sm_number}</div>
                                        <div className="font-medium">{montage.client}</div>
                                        {montage.city && <div>📍 {montage.city}</div>}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {activeMontage.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            Keine Aufträge
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </Card>
              </div>

              <div className="flex-shrink-0 w-80">
                <Card className="card-elevation border-none h-full">
                  <CardHeader className="pb-3 bg-green-50">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Erledigt</span>
                      <Badge variant="outline">{completedMontage.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <Droppable droppableId="completed">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 space-y-3 min-h-[500px] ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}`}
                      >
                        {completedMontage.map((montage, index) => (
                          <Draggable key={montage.id} draggableId={montage.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                              >
                                <Link to={createPageUrl(`MontageAuftragDetail?id=${montage.id}`)}>
                                  <Card className="border border-green-200 bg-green-50 transition-shadow hover:shadow-md cursor-pointer">
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        <div className="font-semibold text-sm text-gray-900 line-clamp-2">
                                          {montage.title}
                                        </div>
                                      <div className="text-xs text-gray-600 space-y-1">
                                        <div className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                          {montage.project_number}
                                        </div>
                                        <div>SM: {montage.sm_number}</div>
                                        <div className="font-medium">{montage.client}</div>
                                        {montage.city && <div>📍 {montage.city}</div>}
                                      </div>
                                      {montage.monteur_completed_date && (
                                        <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                          ✓ {new Date(montage.monteur_completed_date).toLocaleDateString('de-DE')}
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
                        {completedMontage.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            Keine Aufträge
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
          <div className="space-y-6">
          {activeMontage.length > 0 && (
            <Card className="card-elevation border-none">
              <CardHeader>
                <CardTitle>Aktive Aufträge</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {activeMontage.map((montage, index) => (
                    <motion.div
                      key={montage.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{montage.title}</h3>
                                <Badge className="bg-blue-100 text-blue-800">
                                  In Bearbeitung
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                                <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
                                  {montage.project_number}
                                </span>
                                <span>•</span>
                                <span>SM: {montage.sm_number}</span>
                                <span>•</span>
                                <span>{montage.client}</span>
                              </div>
                              {montage.city && (
                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                  <MapPin className="w-4 h-4" />
                                  {montage.city} {montage.street && `- ${montage.street}`}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Link to={createPageUrl(`MontageAuftragDetail?id=${montage.id}`)}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  Details
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnassigningMontage(montage);
                                  setShowUnassignDialog(true);
                                }}
                              >
                                Entfernen
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {completedMontage.length > 0 && (
            <Card className="card-elevation border-none">
              <CardHeader>
                <CardTitle>Erledigte Aufträge</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {completedMontage.map((montage, index) => (
                    <motion.div
                      key={montage.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-l-4 border-l-green-500 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{montage.title}</h3>
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Erledigt
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                                <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
                                  {montage.project_number}
                                </span>
                                <span>•</span>
                                <span>SM: {montage.sm_number}</span>
                                <span>•</span>
                                <span>{montage.client}</span>
                              </div>
                              {montage.monteur_completed_date && (
                                <div className="text-xs text-green-700 mt-1">
                                  Erledigt am {new Date(montage.monteur_completed_date).toLocaleDateString('de-DE')}
                                </div>
                              )}
                            </div>
                            <Link to={createPageUrl(`MontageAuftragDetail?id=${montage.id}`)}>
                              <Button variant="outline" size="sm">
                                Details
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {montageAuftraege.length === 0 && (
            <Card className="card-elevation border-none">
              <CardContent className="p-16 text-center">
                <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">
                  Keine Montageaufträge zugewiesen
                </h3>
                <p className="text-gray-400 mb-4">
                  Diesem Monteur sind aktuell keine Aufträge zugewiesen.
                </p>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
                  <p className="text-xs text-gray-600 font-mono">
                    <strong>Debug Info:</strong><br/>
                    Monteur ID: {monteur?.id}<br/>
                    Monteur Name: {monteur?.full_name}<br/>
                    Alle Aufträge: {allMontageAuftraege.length}<br/>
                    Verfügbar: {availableMontageAuftraege.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        )}

        <Dialog open={showUnassignDialog} onOpenChange={setShowUnassignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auftrag entfernen?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600 mb-4">
                Möchten Sie diesen Auftrag wirklich von {monteur?.full_name} entfernen?
              </p>
              {unassigningMontage && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold">{unassigningMontage.title}</div>
                  <div className="text-sm text-gray-600">
                    {unassigningMontage.project_number} - {unassigningMontage.client}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnassignDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUnassign} className="bg-red-600 hover:bg-red-700">
                Entfernen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
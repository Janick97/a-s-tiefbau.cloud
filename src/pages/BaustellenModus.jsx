import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Project, Excavation, TimesheetEntry, ProjectComment } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  Upload, 
  Wifi, 
  WifiOff,
  Loader2,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Send,
  X,
  AlertCircle,
  Shovel,
  Package,
  Layers
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BaustellenModusPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState(null);
  
  // Foto-Upload State
  const [uploadPhotos, setUploadPhotos] = useState([]);
  const [photoType, setPhotoType] = useState("before");
  const [selectedExcavation, setSelectedExcavation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Zeiterfassung State
  const [timeEntry, setTimeEntry] = useState({
    employee_name: "",
    hours: "",
    hours_type: "normal",
    work_description: ""
  });
  
  // Kommentar State
  const [comment, setComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState([]);
  
  // Offline-Queue
  const [offlineQueue, setOfflineQueue] = useState([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadUserAndProjects();
    loadOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
  }, [selectedProject]);

  const loadOfflineQueue = () => {
    try {
      const queue = JSON.parse(localStorage.getItem('baustellenOfflineQueue') || '[]');
      setOfflineQueue(queue);
    } catch (error) {
      console.error("Fehler beim Laden der Offline-Queue:", error);
    }
  };

  const addToOfflineQueue = (action) => {
    const newQueue = [...offlineQueue, { ...action, timestamp: Date.now() }];
    setOfflineQueue(newQueue);
    localStorage.setItem('baustellenOfflineQueue', JSON.stringify(newQueue));
  };

  const syncOfflineData = async () => {
    if (offlineQueue.length === 0) return;

    try {
      for (const action of offlineQueue) {
        switch (action.type) {
          case 'timesheet':
            await base44.entities.TimesheetEntry.create(action.data);
            break;
          case 'comment':
            await base44.entities.ProjectComment.create(action.data);
            break;
          case 'excavation_update':
            await base44.entities.Excavation.update(action.excavationId, action.data);
            break;
        }
      }
      
      setOfflineQueue([]);
      localStorage.setItem('baustellenOfflineQueue', '[]');
      alert('Offline-Daten wurden erfolgreich synchronisiert!');
      loadProjectData();
    } catch (error) {
      console.error("Fehler bei der Synchronisation:", error);
      alert('Einige Daten konnten nicht synchronisiert werden. Sie bleiben in der Warteschlange.');
    }
  };

  const loadUserAndProjects = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      setTimeEntry(prev => ({ ...prev, employee_name: userData.full_name }));

      if (userData.position === 'Bauleiter' || userData.position === 'Oberfläche') {
        const allProjects = await base44.entities.Project.list("-created_date");
        const assignedProjects = allProjects.filter(p => {
          if (!p.assigned_bauleiter || !Array.isArray(p.assigned_bauleiter)) return false;
          return p.assigned_bauleiter.some(b => b.id === userData.id);
        });
        setMyProjects(assignedProjects || []);
      } else {
        const allProjects = await base44.entities.Project.list("-created_date", 50);
        setMyProjects(allProjects || []);
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  const loadProjectData = async () => {
    if (!selectedProject) return;
    
    try {
      const excavationsData = await base44.entities.Excavation.filter(
        { project_id: selectedProject },
        "-created_date"
      );
      setExcavations(excavationsData || []);
    } catch (error) {
      console.error("Fehler beim Laden der Projektdaten:", error);
    }
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploadedFiles = await Promise.all(uploadPromises);
      const newImageUrls = uploadedFiles.map(res => res.file_url);
      
      setUploadPhotos(prev => [...prev, ...newImageUrls]);
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen der Bilder.");
    }
    setIsUploading(false);
    event.target.value = null;
  };

  const savePhotosToExcavation = async () => {
    if (!selectedExcavation || uploadPhotos.length === 0) return;

    const updateData = {};
    const fieldMap = {
      before: 'photos_before',
      after: 'photos_after',
      environment: 'photos_environment',
      backfill: 'photos_backfill',
      surface: 'photos_surface'
    };

    const currentPhotos = selectedExcavation[fieldMap[photoType]] || [];
    updateData[fieldMap[photoType]] = [...currentPhotos, ...uploadPhotos];

    try {
      if (isOnline) {
        await base44.entities.Excavation.update(selectedExcavation.id, updateData);
        alert('Fotos erfolgreich gespeichert!');
      } else {
        addToOfflineQueue({
          type: 'excavation_update',
          excavationId: selectedExcavation.id,
          data: updateData
        });
        alert('Fotos werden gespeichert, sobald Sie wieder online sind.');
      }
      
      setUploadPhotos([]);
      setSelectedExcavation(null);
      setActiveAction(null);
      loadProjectData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern der Fotos.");
    }
  };

  const submitTimeEntry = async () => {
    if (!selectedProject || !timeEntry.hours || !timeEntry.work_description) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    const data = {
      project_id: selectedProject,
      employee_name: timeEntry.employee_name || user.full_name,
      hours: parseFloat(timeEntry.hours),
      hours_type: timeEntry.hours_type,
      work_description: timeEntry.work_description
    };

    try {
      if (isOnline) {
        await base44.entities.TimesheetEntry.create(data);
        alert('Arbeitszeit erfolgreich erfasst!');
      } else {
        addToOfflineQueue({ type: 'timesheet', data });
        alert('Arbeitszeit wird erfasst, sobald Sie wieder online sind.');
      }
      
      setTimeEntry({
        employee_name: user.full_name,
        hours: "",
        hours_type: "normal",
        work_description: ""
      });
      setActiveAction(null);
    } catch (error) {
      console.error("Fehler beim Erfassen:", error);
      alert("Fehler beim Erfassen der Arbeitszeit.");
    }
  };

  const submitComment = async () => {
    if (!selectedProject || !comment.trim()) {
      alert("Bitte geben Sie einen Kommentar ein.");
      return;
    }

    const data = {
      project_id: selectedProject,
      comment: comment,
      user_full_name: user.full_name,
      attachments: commentAttachments
    };

    try {
      if (isOnline) {
        await base44.entities.ProjectComment.create(data);
        
        // Benachrichtigung erstellen
        const project = myProjects.find(p => p.id === selectedProject);
        if (project?.assigned_bauleiter) {
          for (const bauleiter of project.assigned_bauleiter) {
            if (bauleiter.id !== user.id) {
              await base44.entities.Notification.create({
                user_id: bauleiter.id,
                type: "comment_added",
                title: "Neuer Kommentar",
                message: `${user.full_name} hat einen Kommentar zu ${project.project_number} hinzugefügt`,
                link: `/ProjectDetail?id=${selectedProject}`,
                related_entity_type: "project",
                related_entity_id: selectedProject,
                sender_user_id: user.id,
                sender_name: user.full_name
              });
            }
          }
        }
        
        alert('Kommentar erfolgreich gepostet!');
      } else {
        addToOfflineQueue({ type: 'comment', data });
        alert('Kommentar wird gepostet, sobald Sie wieder online sind.');
      }
      
      setComment("");
      setCommentAttachments([]);
      setActiveAction(null);
    } catch (error) {
      console.error("Fehler beim Posten:", error);
      alert("Fehler beim Posten des Kommentars.");
    }
  };

  const handleCommentPhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploadedFiles = await Promise.all(uploadPromises);
      const newImageUrls = uploadedFiles.map(res => res.file_url);
      
      setCommentAttachments(prev => [...prev, ...newImageUrls]);
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen der Bilder.");
    }
    setIsUploading(false);
    event.target.value = null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Baustellen-Modus wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-20">
      {/* Header mit Online-Status */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold">Baustellen-Modus</h1>
            <p className="text-sm text-white/90">{user?.full_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-green-500 text-white border-none">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-red-500 text-white border-none">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
        
        {offlineQueue.length > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-300/50 rounded-lg p-2 mt-2">
            <p className="text-xs text-white flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {offlineQueue.length} Aktion(en) warten auf Synchronisation
            </p>
          </div>
        )}

        {/* Projektauswahl */}
        <div className="mt-3">
          <Select value={selectedProject || ""} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full bg-white text-gray-900">
              <SelectValue placeholder="Projekt wählen..." />
            </SelectTrigger>
            <SelectContent>
              {myProjects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_number} - {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedProject ? (
        <div className="p-4 text-center mt-12">
          <Shovel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Kein Projekt ausgewählt</h3>
          <p className="text-gray-500">Wählen Sie oben ein Projekt aus, um zu beginnen.</p>
        </div>
      ) : (
        <>
          {/* Kompakte Leistungsübersicht */}
          <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {excavations.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-6 text-center">
                  <Shovel className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Keine Leistungen vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              excavations.map((exc) => (
                <Card key={exc.id} className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{exc.location_name}</h4>
                        <p className="text-xs text-gray-600 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {exc.street}, {exc.city}
                        </p>
                      </div>
                      {exc.is_closed ? (
                        <Badge className="bg-green-500 text-white text-xs flex-shrink-0">Fertig</Badge>
                      ) : exc.is_backfilled ? (
                        <Badge className="bg-yellow-500 text-white text-xs flex-shrink-0">Verfüllt</Badge>
                      ) : (
                        <Badge className="bg-orange-500 text-white text-xs flex-shrink-0">Offen</Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-3 text-xs mb-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Package className="w-3 h-3" />
                        {exc.excavation_length?.toFixed(1)}×{exc.excavation_width?.toFixed(1)}×{exc.excavation_depth?.toFixed(1)}m
                      </div>
                      {exc.surface_type && (
                        <Badge variant="outline" className="text-xs">
                          <Layers className="w-3 h-3 mr-1" />
                          {exc.surface_type}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 text-xs"
                        onClick={() => {
                          setSelectedExcavation(exc);
                          setPhotoType('before');
                          setActiveAction('photos');
                        }}
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Vorher
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 text-xs"
                        onClick={() => {
                          setSelectedExcavation(exc);
                          setPhotoType('after');
                          setActiveAction('photos');
                        }}
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Nachher
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 text-xs"
                        onClick={() => {
                          setSelectedExcavation(exc);
                          setPhotoType('environment');
                          setActiveAction('photos');
                        }}
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Umfeld
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Kompakte Quick-Actions am unteren Rand */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-2 flex gap-2 z-20">
            <Button
              onClick={() => setActiveAction('timesheet')}
              className="flex-1 h-14 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <Clock className="w-5 h-5 mr-1" />
              <span className="text-sm">Zeit</span>
            </Button>

            <Button
              onClick={() => setActiveAction('comment')}
              className="flex-1 h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <MessageSquare className="w-5 h-5 mr-1" />
              <span className="text-sm">Kommentar</span>
            </Button>
          </div>

          {/* Fotos hochladen Modal */}
          <AnimatePresence>
            {activeAction === 'photos' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
              >
                <div className="min-h-screen p-4 flex items-center justify-center">
                  <motion.div
                    initial={{ y: 50, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 50, scale: 0.95 }}
                    className="w-full max-w-2xl"
                  >
                    <Card>
                      <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            Fotos hochladen
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveAction(null);
                              setUploadPhotos([]);
                              setSelectedExcavation(null);
                            }}
                            className="text-white hover:bg-white/20"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* Ausgewählte Leistung anzeigen */}
                        {selectedExcavation && (
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border-2 border-blue-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-blue-900">{selectedExcavation.location_name}</p>
                                <p className="text-xs text-blue-700">{selectedExcavation.street}, {selectedExcavation.city}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedExcavation(null)}
                                className="text-blue-700 hover:bg-blue-200/50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Foto-Typ Buttons */}
                        <div>
                          <Label className="mb-2 block">Foto-Typ</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={photoType === 'before' ? 'default' : 'outline'}
                              onClick={() => setPhotoType('before')}
                              className={photoType === 'before' ? 'bg-blue-600' : ''}
                            >
                              Vorher
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={photoType === 'after' ? 'default' : 'outline'}
                              onClick={() => setPhotoType('after')}
                              className={photoType === 'after' ? 'bg-blue-600' : ''}
                            >
                              Nachher
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={photoType === 'environment' ? 'default' : 'outline'}
                              onClick={() => setPhotoType('environment')}
                              className={photoType === 'environment' ? 'bg-blue-600' : ''}
                            >
                              Umfeld
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={photoType === 'backfill' ? 'default' : 'outline'}
                              onClick={() => setPhotoType('backfill')}
                              className={photoType === 'backfill' ? 'bg-blue-600' : ''}
                            >
                              Verfüllung
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={photoType === 'surface' ? 'default' : 'outline'}
                              onClick={() => setPhotoType('surface')}
                              className={photoType === 'surface' ? 'bg-blue-600' : ''}
                            >
                              Oberfläche
                            </Button>
                          </div>
                        </div>

                        {/* Foto-Vorschau */}
                        {uploadPhotos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {uploadPhotos.map((url, index) => (
                              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => setUploadPhotos(prev => prev.filter((_, i) => i !== index))}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload Button */}
                        <Input
                          id="photo-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('photo-upload').click()}
                          disabled={isUploading}
                          className="w-full h-14"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Lädt hoch...
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5 mr-2" />
                              Fotos aufnehmen ({uploadPhotos.length})
                            </>
                          )}
                        </Button>

                        {/* Speichern Button */}
                        <Button
                          onClick={savePhotosToExcavation}
                          disabled={!selectedExcavation || uploadPhotos.length === 0}
                          className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Fotos speichern
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zeiterfassung Modal */}
          <AnimatePresence>
            {activeAction === 'timesheet' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
              >
                <div className="min-h-screen p-4 flex items-center justify-center">
                  <motion.div
                    initial={{ y: 50, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 50, scale: 0.95 }}
                    className="w-full max-w-lg"
                  >
                    <Card>
                      <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Arbeitszeit erfassen
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveAction(null)}
                            className="text-white hover:bg-white/20"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <Label>Mitarbeiter</Label>
                          <Input
                            value={timeEntry.employee_name}
                            onChange={(e) => setTimeEntry({ ...timeEntry, employee_name: e.target.value })}
                            placeholder="Name..."
                          />
                        </div>

                        <div>
                          <Label>Stunden*</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={timeEntry.hours}
                            onChange={(e) => setTimeEntry({ ...timeEntry, hours: e.target.value })}
                            placeholder="Anzahl Stunden..."
                          />
                        </div>

                        <div>
                          <Label>Art der Stunden</Label>
                          <Select
                            value={timeEntry.hours_type}
                            onValueChange={(value) => setTimeEntry({ ...timeEntry, hours_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="overtime">Überstunden</SelectItem>
                              <SelectItem value="night_shift">Nachtzulage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Arbeitsbeschreibung*</Label>
                          <Textarea
                            value={timeEntry.work_description}
                            onChange={(e) => setTimeEntry({ ...timeEntry, work_description: e.target.value })}
                            placeholder="Was wurde gemacht..."
                            rows={4}
                          />
                        </div>

                        <Button
                          onClick={submitTimeEntry}
                          className="w-full h-14 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Arbeitszeit speichern
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Kommentar Modal */}
          <AnimatePresence>
            {activeAction === 'comment' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
              >
                <div className="min-h-screen p-4 flex items-center justify-center">
                  <motion.div
                    initial={{ y: 50, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 50, scale: 0.95 }}
                    className="w-full max-w-lg"
                  >
                    <Card>
                      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Kommentar hinzufügen
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveAction(null);
                              setComment("");
                              setCommentAttachments([]);
                            }}
                            className="text-white hover:bg-white/20"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <Label>Kommentar*</Label>
                          <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Baustellenfortschritt, Probleme, Hinweise..."
                            rows={5}
                          />
                        </div>

                        {/* Anhänge */}
                        {commentAttachments.length > 0 && (
                          <div>
                            <Label>Anhänge ({commentAttachments.length})</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {commentAttachments.map((url, index) => (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                                  <img src={url} alt={`Anhang ${index + 1}`} className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== index))}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Foto-Upload für Kommentar */}
                        <Input
                          id="comment-photo-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          capture="environment"
                          onChange={handleCommentPhotoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('comment-photo-upload').click()}
                          disabled={isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Lädt hoch...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Fotos anhängen
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={submitComment}
                          disabled={!comment.trim()}
                          className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        >
                          <Send className="w-5 h-5 mr-2" />
                          Kommentar posten
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


        </>
      )}


    </div>
  );
}
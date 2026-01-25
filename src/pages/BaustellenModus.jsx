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
          {/* Haupt-Aktionen */}
          <div className="p-4 space-y-3">
            <Button
              onClick={() => setActiveAction('photos')}
              className="w-full h-20 text-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg"
            >
              <Camera className="w-6 h-6 mr-3" />
              Fotos hochladen
            </Button>

            <Button
              onClick={() => setActiveAction('timesheet')}
              className="w-full h-20 text-lg font-bold bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg"
            >
              <Clock className="w-6 h-6 mr-3" />
              Arbeitszeit erfassen
            </Button>

            <Button
              onClick={() => setActiveAction('comment')}
              className="w-full h-20 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
            >
              <MessageSquare className="w-6 h-6 mr-3" />
              Kommentar hinzufügen
            </Button>

            <Button
              onClick={() => setActiveAction('excavations')}
              variant="outline"
              className="w-full h-16 text-lg font-bold border-2"
            >
              <Shovel className="w-5 h-5 mr-2" />
              Leistungen anzeigen ({excavations.length})
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
                        {/* Leistung auswählen */}
                        <div>
                          <Label>Leistung auswählen</Label>
                          <Select 
                            value={selectedExcavation?.id || ""} 
                            onValueChange={(value) => {
                              const exc = excavations.find(e => e.id === value);
                              setSelectedExcavation(exc);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Leistung wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {excavations.map(exc => (
                                <SelectItem key={exc.id} value={exc.id}>
                                  {exc.location_name} - {exc.street}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Foto-Typ */}
                        <div>
                          <Label>Foto-Typ</Label>
                          <Select value={photoType} onValueChange={setPhotoType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="before">Vorher</SelectItem>
                              <SelectItem value="after">Nachher</SelectItem>
                              <SelectItem value="environment">Umfeld</SelectItem>
                              <SelectItem value="backfill">Verfüllung</SelectItem>
                              <SelectItem value="surface">Oberfläche</SelectItem>
                            </SelectContent>
                          </Select>
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

          {/* Leistungen anzeigen Modal */}
          <AnimatePresence>
            {activeAction === 'excavations' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
              >
                <div className="min-h-screen p-4">
                  <motion.div
                    initial={{ y: 50, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 50, scale: 0.95 }}
                    className="w-full max-w-2xl mx-auto my-8"
                  >
                    <Card>
                      <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white sticky top-0 z-10">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <Shovel className="w-5 h-5" />
                            Leistungen ({excavations.length})
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
                      <CardContent className="p-4 space-y-3">
                        {excavations.length === 0 ? (
                          <div className="text-center py-12">
                            <Shovel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Keine Leistungen vorhanden</p>
                          </div>
                        ) : (
                          excavations.map((exc) => (
                            <Card key={exc.id} className="border-2">
                              <CardContent className="p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{exc.location_name}</h4>
                                    <p className="text-sm text-gray-600">{exc.street}, {exc.city}</p>
                                  </div>
                                  {exc.is_closed ? (
                                    <Badge className="bg-green-100 text-green-800">Fertig</Badge>
                                  ) : exc.is_backfilled ? (
                                    <Badge className="bg-yellow-100 text-yellow-800">Verfüllt</Badge>
                                  ) : (
                                    <Badge className="bg-orange-100 text-orange-800">Offen</Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-2">
                                  <div>
                                    <span className="text-gray-500">L:</span> {exc.excavation_length?.toFixed(1)}m
                                  </div>
                                  <div>
                                    <span className="text-gray-500">B:</span> {exc.excavation_width?.toFixed(1)}m
                                  </div>
                                  <div>
                                    <span className="text-gray-500">T:</span> {exc.excavation_depth?.toFixed(1)}m
                                  </div>
                                </div>

                                {exc.surface_type && (
                                  <div className="mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {exc.surface_type}
                                    </Badge>
                                  </div>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-3"
                                  onClick={() => {
                                    setSelectedExcavation(exc);
                                    setActiveAction('photos');
                                  }}
                                >
                                  <Camera className="w-4 h-4 mr-2" />
                                  Fotos hinzufügen
                                </Button>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* PWA Install Hinweis (falls nicht installiert) */}
      {isOnline && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <Card className="bg-gradient-to-r from-orange-500 to-amber-600 text-white border-none shadow-2xl">
            <CardContent className="p-3 text-center">
              <p className="text-sm font-medium">
                💡 Tipp: Installieren Sie diese App auf Ihrem Startbildschirm für schnellen Zugriff!
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
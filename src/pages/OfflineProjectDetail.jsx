import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { 
  getProjectOffline, 
  getExcavationsOffline, 
  saveProjectOffline,
  saveExcavationOffline,
  addToSyncQueue,
  savePhotoOffline,
  preloadProjectData
} from '../components/utils/offlineManager';
import { 
  ArrowLeft, 
  Camera, 
  Clock, 
  Save, 
  Download,
  Image as ImageIcon,
  MapPin,
  Loader2,
  WifiOff,
  Wifi
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import OfflineSyncManager from '@/components/offline/OfflineSyncManager';

export default function OfflineProjectDetail() {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('id');
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [project, setProject] = useState(null);
  const [excavations, setExcavations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preloading, setPreloading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState(null);
  
  // Photo upload states
  const [selectedExcavation, setSelectedExcavation] = useState(null);
  const [photoType, setPhotoType] = useState('before');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Try to load from server first if online
      if (isOnline) {
        const projectData = await base44.entities.Project.get(projectId);
        setProject(projectData);
        await saveProjectOffline(projectData);
        
        const excavationsData = await base44.entities.Excavation.filter({ project_id: projectId });
        setExcavations(excavationsData);
        for (const exc of excavationsData) {
          await saveExcavationOffline(exc);
        }
      } else {
        // Load from offline storage
        const offlineProject = await getProjectOffline(projectId);
        const offlineExcavations = await getExcavationsOffline(projectId);
        
        if (offlineProject) {
          setProject(offlineProject);
          setExcavations(offlineExcavations);
        } else {
          alert('Projekt nicht im Offline-Speicher verfügbar. Bitte laden Sie es herunter, wenn Sie online sind.');
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      // Try offline fallback
      const offlineProject = await getProjectOffline(projectId);
      if (offlineProject) {
        setProject(offlineProject);
        setExcavations(await getExcavationsOffline(projectId));
      }
    }
    setLoading(false);
  };

  const handlePreloadProject = async () => {
    if (!isOnline) {
      alert('Sie müssen online sein, um Daten herunterzuladen.');
      return;
    }
    
    setPreloading(true);
    const result = await preloadProjectData(base44, projectId);
    setPreloading(false);
    
    if (result.success) {
      alert('Projekt erfolgreich für Offline-Nutzung heruntergeladen!');
      loadProjectData();
    } else {
      alert('Fehler beim Herunterladen der Daten.');
    }
  };

  const handleSaveProject = async () => {
    setSaving(true);
    try {
      // Save to offline storage immediately
      await saveProjectOffline(editedProject);
      setProject(editedProject);
      
      // Add to sync queue
      await addToSyncQueue({
        type: 'project_update',
        data: editedProject
      });
      
      setEditMode(false);
      alert('Änderungen gespeichert! Wird synchronisiert, sobald Sie online sind.');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Änderungen.');
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length || !selectedExcavation) return;

    setUploadingPhoto(true);
    try {
      for (const file of files) {
        const photoId = `photo_${Date.now()}_${Math.random()}`;
        
        // Save photo offline
        await savePhotoOffline(photoId, file);
        
        // Add to sync queue
        await addToSyncQueue({
          type: 'photo_upload',
          photoId: photoId,
          excavationId: selectedExcavation.id,
          photoField: photoType === 'before' ? 'photos_before' : 
                      photoType === 'after' ? 'photos_after' : 'photos_environment',
          updateType: 'excavation_photos'
        });
        
        // Update local excavation state
        const updatedExcavations = excavations.map(exc => {
          if (exc.id === selectedExcavation.id) {
            const field = photoType === 'before' ? 'photos_before' : 
                         photoType === 'after' ? 'photos_after' : 'photos_environment';
            return {
              ...exc,
              [field]: [...(exc[field] || []), photoId]
            };
          }
          return exc;
        });
        setExcavations(updatedExcavations);
        
        // Save to offline storage
        const updated = updatedExcavations.find(e => e.id === selectedExcavation.id);
        if (updated) await saveExcavationOffline(updated);
      }
      
      alert('Fotos gespeichert! Werden hochgeladen, sobald Sie online sind.');
      setSelectedExcavation(null);
    } catch (error) {
      console.error('Fehler beim Foto-Upload:', error);
      alert('Fehler beim Speichern der Fotos.');
    }
    setUploadingPhoto(false);
    event.target.value = null;
  };

  const startEdit = () => {
    setEditedProject({ ...project });
    setEditMode(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <WifiOff className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Projekt nicht verfügbar</h3>
            <p className="text-gray-600 mb-4">
              Dieses Projekt ist offline nicht verfügbar. Laden Sie es herunter, wenn Sie online sind.
            </p>
            <Link to={createPageUrl('MyProjects')}>
              <Button>Zurück zur Übersicht</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <OfflineSyncManager />
      
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('MyProjects')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg">{project.project_number}</h1>
              <p className="text-sm text-gray-600">{project.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-green-100 text-green-800">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            
            {isOnline && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreloadProject}
                disabled={preloading}
              >
                {preloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-t">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'info' 
                ? 'text-orange-600 border-b-2 border-orange-600' 
                : 'text-gray-600'
            }`}
          >
            Projekt-Info
          </button>
          <button
            onClick={() => setActiveTab('excavations')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'excavations' 
                ? 'text-orange-600 border-b-2 border-orange-600' 
                : 'text-gray-600'
            }`}
          >
            Leistungen ({excavations.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Projektdetails</CardTitle>
                {!editMode ? (
                  <Button size="sm" onClick={startEdit}>
                    Bearbeiten
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                      Abbrechen
                    </Button>
                    <Button size="sm" onClick={handleSaveProject} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">Titel</label>
                      <Input
                        value={editedProject.title}
                        onChange={(e) => setEditedProject({...editedProject, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Beschreibung</label>
                      <Textarea
                        value={editedProject.description || ''}
                        onChange={(e) => setEditedProject({...editedProject, description: e.target.value})}
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Straße</label>
                      <Input
                        value={editedProject.street}
                        onChange={(e) => setEditedProject({...editedProject, street: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Stadt</label>
                      <Input
                        value={editedProject.city}
                        onChange={(e) => setEditedProject({...editedProject, city: e.target.value})}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Kunde</p>
                      <p className="font-medium">{project.client}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Standort</p>
                      <p className="font-medium">{project.street}, {project.city}</p>
                    </div>
                    {project.description && (
                      <div>
                        <p className="text-sm text-gray-600">Beschreibung</p>
                        <p className="text-gray-900">{project.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge>{project.project_status}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'excavations' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {excavations.map(exc => (
              <Card key={exc.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {exc.location_name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedExcavation(exc);
                        setPhotoType('before');
                      }}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{exc.street}, {exc.city}</p>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Länge</p>
                      <p className="font-medium">{exc.excavation_length}m</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Breite</p>
                      <p className="font-medium">{exc.excavation_width}m</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tiefe</p>
                      <p className="font-medium">{exc.excavation_depth}m</p>
                    </div>
                  </div>
                  
                  {(exc.photos_before?.length > 0 || exc.photos_after?.length > 0) && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Fotos
                      </p>
                      <div className="flex gap-2">
                        {exc.photos_before?.length > 0 && (
                          <Badge variant="outline">Vorher: {exc.photos_before.length}</Badge>
                        )}
                        {exc.photos_after?.length > 0 && (
                          <Badge variant="outline">Nachher: {exc.photos_after.length}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {excavations.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Keine Leistungen vorhanden
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>

      {/* Photo Upload Dialog */}
      {selectedExcavation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Fotos hinzufügen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{selectedExcavation.location_name}</p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Foto-Typ</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={photoType === 'before' ? 'default' : 'outline'}
                    onClick={() => setPhotoType('before')}
                  >
                    Vorher
                  </Button>
                  <Button
                    size="sm"
                    variant={photoType === 'after' ? 'default' : 'outline'}
                    onClick={() => setPhotoType('after')}
                  >
                    Nachher
                  </Button>
                  <Button
                    size="sm"
                    variant={photoType === 'environment' ? 'default' : 'outline'}
                    onClick={() => setPhotoType('environment')}
                  >
                    Umfeld
                  </Button>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
                disabled={uploadingPhoto}
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedExcavation(null)}
                  disabled={uploadingPhoto}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => document.getElementById('photo-upload').click()}
                  disabled={uploadingPhoto}
                  className="flex-1"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Aufnehmen
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
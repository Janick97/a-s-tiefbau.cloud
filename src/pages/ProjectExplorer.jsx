import React, { useState, useEffect, useMemo } from "react";
import { Project, ProjectDocument, Excavation } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderOpen,
  Image,
  FileText,
  Download,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  Filter
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import JSZip from "jszip";

export default function ProjectExplorerPage() {
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStatuses, setExpandedStatuses] = useState(new Set());
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [showMorePhotos, setShowMorePhotos] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsData, documentsData, excavationsData] = await Promise.all([
        Project.list("-created_date").catch(() => []),
        ProjectDocument.list().catch(() => []),
        Excavation.list().catch(() => [])
      ]);

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  const toggleStatus = (status) => {
    const newExpanded = new Set(expandedStatuses);
    if (newExpanded.has(status)) newExpanded.delete(status);
    else newExpanded.add(status);
    setExpandedStatuses(newExpanded);
  };

  const toggleProject = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getProjectDocuments = (projectId) => {
    return documents.filter(doc => doc.project_id === projectId);
  };

  const getProjectExcavations = (projectId) => {
    return excavations.filter(exc => exc.project_id === projectId);
  };

  const getAllPhotosFromExcavations = (projectExcavations) => {
    const photos = [];
    projectExcavations.forEach(exc => {
      if (exc.photos_before) photos.push(...exc.photos_before.map(url => ({ url, type: 'Vorher', excavation: exc.location_name })));
      if (exc.photos_after) photos.push(...exc.photos_after.map(url => ({ url, type: 'Nachher', excavation: exc.location_name })));
      if (exc.photos_environment) photos.push(...exc.photos_environment.map(url => ({ url, type: 'Umfeld', excavation: exc.location_name })));
      if (exc.photos_backfill) photos.push(...exc.photos_backfill.map(url => ({ url, type: 'Verfüllung', excavation: exc.location_name })));
      if (exc.photos_surface) photos.push(...exc.photos_surface.map(url => ({ url, type: 'Oberfläche', excavation: exc.location_name })));
    });
    return photos;
  };

  const [downloadingProject, setDownloadingProject] = useState(null);

  const downloadAllProjectFiles = async (project) => {
    setDownloadingProject(project.id);
    try {
      const projectDocs = getProjectDocuments(project.id);
      const projectExcs = getProjectExcavations(project.id);
      const photos = getAllPhotosFromExcavations(projectExcs);
      const bauakten = projectDocs.filter(doc => doc.folder === 'Bauakte');

      const zip = new JSZip();
      const bauaktenFolder = zip.folder("Bauakten");
      const fotosFolder = zip.folder("Fotos");

      // Fetch and add Bauakten
      for (const doc of bauakten) {
        const response = await fetch(doc.file_url);
        const blob = await response.blob();
        bauaktenFolder.file(doc.file_name, blob);
      }

      // Fetch and add Fotos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const ext = photo.url.split('.').pop().split('?')[0] || 'jpg';
        fotosFolder.file(`${photo.excavation}_${photo.type}_${i + 1}.${ext}`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${project.project_number}_${project.title}.zip`;
      link.click();
    } catch (error) {
      console.error("Fehler beim ZIP-Download:", error);
      alert("Fehler beim Download. Bitte versuchen Sie es erneut.");
    } finally {
      setDownloadingProject(null);
    }
  };

  const totalPhotos = useMemo(() => excavations.reduce((sum, exc) => sum +
    (exc.photos_before?.length || 0) + (exc.photos_after?.length || 0) +
    (exc.photos_environment?.length || 0) + (exc.photos_backfill?.length || 0) +
    (exc.photos_surface?.length || 0), 0), [excavations]);

  const filteredProjects = useMemo(() => projects.filter(p =>
    p.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [projects, searchTerm]);

  // All known statuses from entity schema, in order
  const ALL_STATUSES = [
    "Auftrag neu im Server", "Auftrag angelegt ohne VAO", "Auftrag neu VAO beantragt",
    "VAO bei Baubeginn", "Auftrag angelegt keine VAO nötig", "Folgeauftrag",
    "VAO von Projekt", "Jahresgenehmigung", "Aufgrabung beantragt", "Privat",
    "Storniert", "Baustelle bearbeiten", "Montage neu in Craftnote angelegt",
    "Montage fertig", "Planbare Baustelle begonnen", "Technisch fertig",
    "Kann zu VERFÜLLEN", "Kann zu Pflaster/Platten", "Kann zu Asphalt TRAG",
    "Kann zu Asphalt FEIN", "Baustelle fertig", "Auftrag komplett abgeschlossen",
    "Auftrag angelegt mit VAO von prj"
  ];

  // Group projects by project_status, only show statuses that have projects
  const projectsByStatus = useMemo(() => {
    const groups = {};
    filteredProjects.forEach(p => {
      const status = p.project_status || "Kein Status";
      if (!groups[status]) groups[status] = [];
      groups[status].push(p);
    });
    // Sort statuses: known ones first in order, then unknown
    const orderedStatuses = ALL_STATUSES.filter(s => groups[s]);
    const unknownStatuses = Object.keys(groups).filter(s => !ALL_STATUSES.includes(s));
    return [...orderedStatuses, ...unknownStatuses].map(s => ({ status: s, projects: groups[s] }));
  }, [filteredProjects]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Folder className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Projekt-Explorer</h1>
              <p className="text-gray-600">{filteredProjects.length} von {projects.length} Projekten · {documents.length} Dokumente · {totalPhotos} Fotos</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Suche nach Projektnummer, Titel oder Kunde..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white shadow-sm"
            />
          </div>
        </motion.div>

        {/* Explorer Tree - Status Folders */}
        <Card className="card-elevation border-none">
          <CardContent className="p-6">
            <div className="space-y-2">
              {projectsByStatus.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Keine Projekte gefunden</div>
              ) : (
                projectsByStatus.map(({ status, projects: statusProjects }) => {
                  const isStatusExpanded = expandedStatuses.has(status);
                  return (
                    <div key={status} className="border rounded-lg overflow-hidden">
                      {/* Status Folder Row */}
                      <div
                        className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => toggleStatus(status)}
                      >
                        <button className="flex-shrink-0">
                          {isStatusExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                        </button>
                        {isStatusExpanded ? (
                          <FolderOpen className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        ) : (
                          <Folder className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-gray-800 flex-1">{status}</span>
                        <Badge variant="secondary" className="flex-shrink-0">{statusProjects.length}</Badge>
                      </div>

                      {/* Projects inside status folder */}
                      <AnimatePresence>
                        {isStatusExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="pl-6 py-2 space-y-1 border-t">
                              {statusProjects.map((project) => {
                                const isExpanded = expandedProjects.has(project.id);
                                const projectDocs = getProjectDocuments(project.id);
                                const projectExcs = getProjectExcavations(project.id);
                                const bauakten = projectDocs.filter(doc => doc.folder === 'Bauakte');
                                const photos = getAllPhotosFromExcavations(projectExcs);

                                return (
                                  <div key={project.id} className="border rounded-lg overflow-hidden">
                                    {/* Project Row */}
                                    <div
                                      className="flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                      onClick={() => toggleProject(project.id)}
                                    >
                                      <button className="flex-shrink-0">
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                      </button>
                                      {isExpanded ? (
                                        <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                      ) : (
                                        <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-900 text-sm truncate">{project.project_number}</span>
                                          <span className="text-gray-600 text-sm truncate">– {project.title}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                          <span>{bauakten.length} Bauakte{bauakten.length !== 1 ? 'n' : ''}</span>
                                          <span>•</span>
                                          <span>{photos.length} Foto{photos.length !== 1 ? 's' : ''}</span>
                                          {project.client && <><span>•</span><span>{project.client}</span></>}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => { e.stopPropagation(); downloadAllProjectFiles(project); }}
                                        disabled={downloadingProject === project.id}
                                        className="flex-shrink-0"
                                      >
                                        {downloadingProject === project.id ? (
                                          <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Lädt...</>
                                        ) : (
                                          <><Download className="w-4 h-4 mr-1" />ZIP</>
                                        )}
                                      </Button>
                                    </div>

                                    {/* Expanded Project Content */}
                                    <AnimatePresence>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="border-t bg-gray-50"
                                        >
                                          <div className="p-4 pl-10 space-y-3">
                                            {/* Bauakten Folder */}
                                            {bauakten.length > 0 && (
                                              <div>
                                                <div
                                                  className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
                                                  onClick={() => toggleFolder(`${project.id}-bauakten`)}
                                                >
                                                  <button>{expandedFolders.has(`${project.id}-bauakten`) ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}</button>
                                                  <Folder className="w-4 h-4 text-amber-500" />
                                                  <span className="font-medium text-sm">Bauakten ({bauakten.length})</span>
                                                </div>
                                                <AnimatePresence>
                                                  {expandedFolders.has(`${project.id}-bauakten`) && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-8 space-y-1 mt-1">
                                                      {bauakten.map((doc) => (
                                                        <div key={doc.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded group">
                                                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                          <span className="text-sm text-gray-700 flex-1 truncate">{doc.file_name}</span>
                                                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"><Download className="w-3 h-3" /></Button>
                                                          </a>
                                                        </div>
                                                      ))}
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            )}

                                            {/* Fotos Folder */}
                                            {photos.length > 0 && (
                                              <div>
                                                <div
                                                  className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
                                                  onClick={() => toggleFolder(`${project.id}-fotos`)}
                                                >
                                                  <button>{expandedFolders.has(`${project.id}-fotos`) ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}</button>
                                                  <Folder className="w-4 h-4 text-purple-500" />
                                                  <span className="font-medium text-sm">Fotos ({photos.length})</span>
                                                </div>
                                                <AnimatePresence>
                                                  {expandedFolders.has(`${project.id}-fotos`) && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-8 mt-1">
                                                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                                                        {photos.slice(0, showMorePhotos[project.id] ? photos.length : 18).map((photo, index) => (
                                                          <div key={index} className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-purple-400 transition-colors" onClick={() => setLightboxPhoto(photo)}>
                                                            <img src={photo.url} alt={`${photo.excavation} ${photo.type}`} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-start">
                                                              <span className="text-[9px] text-white font-medium bg-black/50 px-1 py-0.5 rounded-tr opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">{photo.type}</span>
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                      {photos.length > 18 && (
                                                        <Button variant="ghost" size="sm" className="mt-2 text-xs text-purple-600" onClick={() => setShowMorePhotos(prev => ({ ...prev, [project.id]: !prev[project.id] }))}>
                                                          {showMorePhotos[project.id] ? 'Weniger anzeigen' : `Alle ${photos.length} Fotos anzeigen`}
                                                        </Button>
                                                      )}
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            )}

                                            {bauakten.length === 0 && photos.length === 0 && (
                                              <div className="text-sm text-gray-500 p-2">Keine Dateien vorhanden</div>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setLightboxPhoto(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <div className="text-center" onClick={e => e.stopPropagation()}>
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.type}
                className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
              />
              <p className="text-white/80 mt-3 text-sm">
                {lightboxPhoto.excavation} · {lightboxPhoto.type}
              </p>
              <a href={lightboxPhoto.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="mt-2 bg-white/20 hover:bg-white/30 text-white">
                  <Download className="w-4 h-4 mr-2" /> Herunterladen
                </Button>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
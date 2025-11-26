import React, { useState, useEffect } from "react";
import { Project, ProjectDocument, Excavation } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderOpen,
  File,
  Image,
  FileText,
  Download,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  Archive
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectExplorerPage() {
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());

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

  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllProjectFiles = async (project) => {
    setDownloadingProject(project.id);
    
    try {
      const projectDocs = getProjectDocuments(project.id);
      const projectExcs = getProjectExcavations(project.id);
      const photos = getAllPhotosFromExcavations(projectExcs);
      const bauakten = projectDocs.filter(doc => doc.folder === 'Bauakte');

      // Download Bauakten
      bauakten.forEach((doc, index) => {
        setTimeout(() => downloadFile(doc.file_url, `Bauakte_${doc.file_name}`), index * 300);
      });

      // Download Fotos
      photos.forEach((photo, index) => {
        const filename = `Foto_${photo.excavation}_${photo.type}_${index + 1}.jpg`;
        setTimeout(() => downloadFile(photo.url, filename), (bauakten.length + index) * 300);
      });

      alert(`Download gestartet: ${bauakten.length} Bauakten und ${photos.length} Fotos werden heruntergeladen.\n\nTipp: Erstellen Sie einen neuen Ordner für dieses Projekt, bevor Sie die Downloads akzeptieren.`);

    } catch (error) {
      console.error("Fehler beim Download:", error);
      alert("Fehler beim Download. Bitte versuchen Sie es erneut.");
    } finally {
      setTimeout(() => setDownloadingProject(null), (bauakten.length + photos.length) * 300 + 1000);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <p className="text-gray-600">Durchsuchen und downloaden Sie Projektdateien</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Folder className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{projects.length}</p>
                    <p className="text-sm text-gray-600">Projekte</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{documents.length}</p>
                    <p className="text-sm text-gray-600">Dokumente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Image className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {excavations.reduce((sum, exc) => {
                        return sum + 
                          (exc.photos_before?.length || 0) +
                          (exc.photos_after?.length || 0) +
                          (exc.photos_environment?.length || 0) +
                          (exc.photos_backfill?.length || 0) +
                          (exc.photos_surface?.length || 0);
                      }, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Fotos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="card-elevation border-none">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Suche nach Projektnummer, Titel oder Kunde..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Explorer Tree */}
        <Card className="card-elevation border-none">
          <CardContent className="p-6">
            <div className="space-y-2">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Keine Projekte gefunden
                </div>
              ) : (
                filteredProjects.map((project) => {
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
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                        {isExpanded ? (
                          <FolderOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">
                              {project.project_number}
                            </span>
                            <span className="text-gray-600 truncate">- {project.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{bauakten.length} Bauakte{bauakten.length !== 1 ? 'n' : ''}</span>
                            <span>•</span>
                            <span>{photos.length} Foto{photos.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAllProjectFiles(project);
                          }}
                          disabled={downloadingProject === project.id}
                          className="flex-shrink-0"
                        >
                          {downloadingProject === project.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Lädt...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Alle Dateien
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t bg-gray-50"
                          >
                            <div className="p-4 pl-12 space-y-3">
                              {/* Bauakten Folder */}
                              {bauakten.length > 0 && (
                                <div>
                                  <div
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
                                    onClick={() => toggleFolder(`${project.id}-bauakten`)}
                                  >
                                    <button>
                                      {expandedFolders.has(`${project.id}-bauakten`) ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                      )}
                                    </button>
                                    <Folder className="w-4 h-4 text-amber-500" />
                                    <span className="font-medium text-sm">
                                      Bauakten ({bauakten.length})
                                    </span>
                                  </div>

                                  <AnimatePresence>
                                    {expandedFolders.has(`${project.id}-bauakten`) && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="pl-8 space-y-1 mt-1"
                                      >
                                        {bauakten.map((doc) => (
                                          <div
                                            key={doc.id}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded group"
                                          >
                                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 flex-1 truncate">
                                              {doc.file_name}
                                            </span>
                                            <a
                                              href={doc.file_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                                              >
                                                <Download className="w-3 h-3" />
                                              </Button>
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
                                    <button>
                                      {expandedFolders.has(`${project.id}-fotos`) ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                      )}
                                    </button>
                                    <Folder className="w-4 h-4 text-purple-500" />
                                    <span className="font-medium text-sm">
                                      Fotos ({photos.length})
                                    </span>
                                  </div>

                                  <AnimatePresence>
                                    {expandedFolders.has(`${project.id}-fotos`) && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="pl-8 space-y-1 mt-1"
                                      >
                                        {photos.slice(0, 20).map((photo, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded group"
                                          >
                                            <Image className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <span className="text-sm text-gray-700 truncate block">
                                                {photo.excavation} - {photo.type}
                                              </span>
                                            </div>
                                            <a
                                              href={photo.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                                              >
                                                <Download className="w-3 h-3" />
                                              </Button>
                                            </a>
                                          </div>
                                        ))}
                                        {photos.length > 20 && (
                                          <div className="text-xs text-gray-500 p-2">
                                            ... und {photos.length - 20} weitere Fotos
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}

                              {bauakten.length === 0 && photos.length === 0 && (
                                <div className="text-sm text-gray-500 p-2">
                                  Keine Dateien vorhanden
                                </div>
                              )}
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
    </div>
  );
}
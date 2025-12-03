import React, { useState, useEffect } from "react";
import { ProjectDocument } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  FolderOpen, 
  Eye,
  Edit,
  Check,
  X
} from "lucide-react";
import { UploadFile } from "@/integrations/Core";

const folderOptions = [
  "Aufmaß",
  "Bauakte", 
  "Baubeginn und Fertigstellung",
  "Besonderheiten",
  "Bilder",
  "Montage",
  "Statusmeldung",
  "VAOs",
  "Chat-Dateien"
];

export default function DocumentManagement({ projectId, project, loadData }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingFileName, setEditingFileName] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showSubfolderDialog, setShowSubfolderDialog] = useState(false);
  const [selectedParentFolder, setSelectedParentFolder] = useState("");
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [customFolders, setCustomFolders] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [dragTargetFolder, setDragTargetFolder] = useState(null);
  
  const [uploadForm, setUploadForm] = useState({
    files: [],
    folder: "Bilder",
    description: ""
  });

  useEffect(() => {
    loadDocuments();
    loadCustomFolders();
  }, [projectId]);

  const loadCustomFolders = () => {
    const saved = localStorage.getItem(`custom_folders_${projectId}`);
    if (saved) {
      setCustomFolders(JSON.parse(saved));
    }
  };

  const saveCustomFolders = (folders) => {
    localStorage.setItem(`custom_folders_${projectId}`, JSON.stringify(folders));
    setCustomFolders(folders);
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const documentsData = await ProjectDocument.filter({ project_id: projectId }, "-created_date");
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (error) {
      console.error("Fehler beim Laden der Dokumente:", error);
      setDocuments([]);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.files || uploadForm.files.length === 0) return;

    setUploading(true);
    try {
      for (const file of uploadForm.files) {
        const { file_url } = await UploadFile({ file });
        
        await ProjectDocument.create({
          project_id: projectId,
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          file_type: file.type,
          folder: uploadForm.folder,
          description: uploadForm.description
        });
      }

      setUploadForm({ files: [], folder: "Bilder", description: "" });
      setShowUploadForm(false);
      await loadDocuments();
    } catch (error) {
      console.error("Fehler beim Upload:", error);
    }
    setUploading(false);
  };

  const handleDeleteDocument = async (documentId) => {
    if (window.confirm("Sind Sie sicher, dass Sie dieses Dokument löschen möchten?")) {
      try {
        await ProjectDocument.delete(documentId);
        await loadDocuments();
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  const startEditingFileName = (document) => {
    setEditingFileName(document.id);
    setNewFileName(document.file_name);
  };

  const cancelEditingFileName = () => {
    setEditingFileName(null);
    setNewFileName("");
  };

  const saveFileName = async (documentId) => {
    if (!newFileName.trim()) {
      alert("Dateiname darf nicht leer sein");
      return;
    }

    try {
      await ProjectDocument.update(documentId, { file_name: newFileName.trim() });
      setEditingFileName(null);
      setNewFileName("");
      await loadDocuments();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Dateinamens:", error);
      alert("Fehler beim Speichern des Dateinamens");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get all unique folders (including subfolders and custom empty folders)
  const allFolders = React.useMemo(() => {
    const folders = new Set([...customFolders]);
    documents.forEach(doc => {
      if (doc.folder) {
        folders.add(doc.folder);
        // Add parent folders
        const parts = doc.folder.split('/');
        for (let i = 1; i < parts.length; i++) {
          folders.add(parts.slice(0, i).join('/'));
        }
      }
    });
    return Array.from(folders).sort();
  }, [documents, customFolders]);

  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.folder]) {
      acc[doc.folder] = [];
    }
    acc[doc.folder].push(doc);
    return acc;
  }, {});

  const isImage = (fileType) => {
    return fileType && fileType.includes('image');
  };

  const getFolderDepth = (folder) => {
    return folder.split('/').length - 1;
  };

  const getParentFolder = (folder) => {
    const parts = folder.split('/');
    return parts.slice(0, -1).join('/');
  };

  const getFolderName = (folder) => {
    const parts = folder.split('/');
    return parts[parts.length - 1];
  };

  const handleCreateSubfolder = async () => {
    if (!newSubfolderName.trim()) {
      alert("Bitte geben Sie einen Ordnernamen ein");
      return;
    }
    
    const newFolderPath = selectedParentFolder 
      ? `${selectedParentFolder}/${newSubfolderName.trim()}`
      : newSubfolderName.trim();
    
    // Check if folder already exists
    if (allFolders.includes(newFolderPath)) {
      alert("Dieser Ordner existiert bereits");
      return;
    }
    
    const updatedFolders = [...customFolders, newFolderPath];
    saveCustomFolders(updatedFolders);
    
    setShowSubfolderDialog(false);
    setNewSubfolderName("");
    setSelectedParentFolder("");
  };

  const handleDrop = async (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragTargetFolder(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        
        await ProjectDocument.create({
          project_id: projectId,
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          file_type: file.type,
          folder: folder,
          description: ""
        });
      }
      await loadDocuments();
    } catch (error) {
      console.error("Fehler beim Upload:", error);
    }
    setUploading(false);
  };

  const handleDragOver = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
    setDragTargetFolder(folder);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragTargetFolder(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Anlagenkorb ({documents.length})</h3>
        <Button onClick={() => setShowUploadForm(true)} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
          <Plus className="w-4 h-4 mr-2" />
          Datei hochladen
        </Button>
      </div>

      {/* Upload Form */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-dashed border-2 border-orange-300">
              <CardContent className="p-6">
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label>Datei(en) auswählen</Label>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => setUploadForm({...uploadForm, files: Array.from(e.target.files)})}
                      required
                    />
                    {uploadForm.files.length > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        {uploadForm.files.length} Datei(en) ausgewählt
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Ordner</Label>
                    <div className="flex gap-2">
                      <Select
                        value={uploadForm.folder}
                        onValueChange={(value) => setUploadForm({...uploadForm, folder: value})}
                        className="flex-1"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {folderOptions.map(folder => (
                            <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                          ))}
                          {allFolders
                            .filter(f => !folderOptions.includes(f))
                            .map(folder => (
                              <SelectItem key={folder} value={folder}>
                                {'  '.repeat(getFolderDepth(folder))}└─ {getFolderName(folder)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setSelectedParentFolder(uploadForm.folder);
                          setShowSubfolderDialog(true);
                        }}
                        title="Unterordner erstellen"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Neu
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Beschreibung (optional)</Label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                      placeholder="Kurze Beschreibung der Datei..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={uploading || uploadForm.files.length === 0}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : `${uploadForm.files.length} Datei(en) hochladen`}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowUploadForm(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents grouped by folder */}
      <div className="space-y-6">
        {allFolders.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">Noch keine Dokumente</h3>
            <p className="text-gray-400">Laden Sie die erste Datei hoch, um zu beginnen.</p>
          </div>
        )}

        {allFolders.map((folder) => {
          const docs = groupedDocuments[folder] || [];
          return (
            <Card 
              key={folder} 
              className={`card-elevation border-none transition-all ${dragActive && dragTargetFolder === folder ? 'border-2 border-orange-500 bg-orange-50' : ''}`}
              style={{ marginLeft: `${getFolderDepth(folder) * 24}px` }}
              onDrop={(e) => handleDrop(e, folder)}
              onDragOver={(e) => handleDragOver(e, folder)}
              onDragLeave={handleDragLeave}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderOpen className="w-5 h-5 text-orange-600" />
                    {getFolderName(folder)}
                    <Badge variant="outline">{docs.length} Datei(en)</Badge>
                    {getFolderDepth(folder) > 0 && (
                      <span className="text-xs text-gray-500">in {getParentFolder(folder)}</span>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedParentFolder(folder);
                      setShowSubfolderDialog(true);
                    }}
                    title="Unterordner erstellen"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Unterordner
                  </Button>
                </div>
              </CardHeader>
            <CardContent>
              {docs.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ziehen Sie Dateien hierher oder klicken Sie auf "Datei hochladen"</p>
                </div>
              )}
              
              {/* Grid view for images */}
              {docs.some(doc => isImage(doc.file_type)) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  {docs.filter(doc => isImage(doc.file_type)).map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-400 transition-all"
                    >
                      <img 
                        src={doc.file_url} 
                        alt={doc.file_name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewDoc(doc)}
                      />
                      
                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                            onClick={() => setPreviewDoc(doc)}
                            title="Vorschau"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <a href={doc.file_url} download={doc.file_name}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                              title="Herunterladen"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 bg-red-100 hover:bg-red-200 text-red-600"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {/* Filename editor */}
                        <div className="bg-white/95 rounded p-1">
                          {editingFileName === doc.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                className="h-6 text-xs px-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveFileName(doc.id);
                                  if (e.key === 'Escape') cancelEditingFileName();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveFileName(doc.id);
                                }} 
                                className="h-6 w-6 p-0"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditingFileName();
                                }} 
                                className="h-6 w-6 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-1 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingFileName(doc);
                              }}
                            >
                              <p className="text-xs font-medium text-gray-900 truncate flex-1">
                                {doc.file_name}
                              </p>
                              <Edit className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* List view for non-images */}
              {docs.some(doc => !isImage(doc.file_type)) && (
                <div className="space-y-3">
                  {docs.filter(doc => !isImage(doc.file_type)).map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {editingFileName === doc.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveFileName(doc.id);
                                  if (e.key === 'Escape') cancelEditingFileName();
                                }}
                                autoFocus
                              />
                              <Button size="sm" onClick={() => saveFileName(doc.id)} className="px-2">
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditingFileName} className="px-2">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-gray-900 truncate">{doc.file_name}</p>
                              <p className="text-sm text-gray-500">{formatFileSize(doc.file_size)} • von {doc.uploaded_by || doc.created_by}</p>
                              {doc.description && (
                                <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingFileName !== doc.id && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingFileName(doc)}
                            title="Dateiname bearbeiten"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            title="Vorschau"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <a href={doc.file_url} download={doc.file_name}>
                            <Button size="sm" variant="outline" title="Herunterladen">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-5xl max-h-[90vh] w-full bg-white rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{previewDoc.file_name}</h3>
                  <p className="text-sm text-gray-600">{previewDoc.folder}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={previewDoc.file_url} download={previewDoc.file_name}>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                  <Button onClick={() => setPreviewDoc(null)} variant="outline" size="sm">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="pt-20 pb-4 px-4 max-h-[90vh] overflow-auto">
                {previewDoc.file_type?.includes('image') ? (
                  <img 
                    src={previewDoc.file_url} 
                    alt={previewDoc.file_name} 
                    className="w-full h-auto max-h-[70vh] object-contain mx-auto" 
                  />
                ) : previewDoc.file_type?.includes('pdf') ? (
                  <iframe 
                    src={previewDoc.file_url} 
                    className="w-full h-[70vh] border-0"
                    title={previewDoc.file_name}
                  />
                ) : (
                  <div className="text-center py-16">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 mb-4">Vorschau für diesen Dateityp nicht verfügbar</p>
                    <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button>
                        <Eye className="w-4 h-4 mr-2" />
                        In neuem Tab öffnen
                      </Button>
                    </a>
                  </div>
                )}
                
                {previewDoc.description && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium mb-1">Beschreibung:</p>
                    <p className="text-sm text-gray-700">{previewDoc.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subfolder Dialog */}
      <AnimatePresence>
        {showSubfolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setShowSubfolderDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">Neuer Unterordner</h3>
              <div className="space-y-4">
                <div>
                  <Label>Übergeordneter Ordner</Label>
                  <Input
                    value={selectedParentFolder || "Hauptebene"}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label>Name des Unterordners</Label>
                  <Input
                    value={newSubfolderName}
                    onChange={(e) => setNewSubfolderName(e.target.value)}
                    placeholder="z.B. Projekt-2024"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSubfolder();
                      if (e.key === 'Escape') setShowSubfolderDialog(false);
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSubfolderDialog(false);
                      setNewSubfolderName("");
                      setSelectedParentFolder("");
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreateSubfolder}>
                    <Plus className="w-4 h-4 mr-2" />
                    Erstellen
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
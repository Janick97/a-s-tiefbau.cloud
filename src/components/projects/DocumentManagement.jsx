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
  
  const [uploadForm, setUploadForm] = useState({
    file: null,
    folder: "Bilder",
    description: ""
  });

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

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
    if (!uploadForm.file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file: uploadForm.file });
      
      await ProjectDocument.create({
        project_id: projectId,
        file_name: uploadForm.file.name,
        file_url: file_url,
        file_size: uploadForm.file.size,
        file_type: uploadForm.file.type,
        folder: uploadForm.folder,
        description: uploadForm.description
      });

      setUploadForm({ file: null, folder: "Bilder", description: "" });
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
                    <Label>Datei auswählen</Label>
                    <Input
                      type="file"
                      onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Ordner</Label>
                    <Select
                      value={uploadForm.folder}
                      onValueChange={(value) => setUploadForm({...uploadForm, folder: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {folderOptions.map(folder => (
                          <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Button type="submit" disabled={uploading || !uploadForm.file}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Hochladen"}
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
        {Object.keys(groupedDocuments).length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">Noch keine Dokumente</h3>
            <p className="text-gray-400">Laden Sie die erste Datei hoch, um zu beginnen.</p>
          </div>
        )}

        {Object.entries(groupedDocuments).map(([folder, docs]) => (
          <Card key={folder} className="card-elevation border-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="w-5 h-5 text-orange-600" />
                {folder}
                <Badge variant="outline">{docs.length} Datei(en)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
        ))}
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
    </div>
  );
}
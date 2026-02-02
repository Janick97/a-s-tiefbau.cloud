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
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Edit2,
  Loader2
} from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import ProjectCoverSheet from "./ProjectCoverSheet";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const folderOptions = [
  "Aufmaß",
  "Bauakte", 
  "Baubeginn und Fertigstellung",
  "Besonderheiten",
  "Bilder",
  "Leitungspläne",
  "Montage",
  "Statusmeldung",
  "VAOs",
  "Chat-Dateien"
];

export default function DocumentManagement({ projectId, project, loadData, excavations = [], priceItems = [], user = null }) {
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
  const [editingSubfolder, setEditingSubfolder] = useState(null);
  const [showDeleteSubfolderDialog, setShowDeleteSubfolderDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragTargetFolder, setDragTargetFolder] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMainFolderDialog, setShowNewMainFolderDialog] = useState(false);
  const [newMainFolderName, setNewMainFolderName] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  const coverSheetRef = React.useRef(null);

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
    const totalFiles = uploadForm.files.length;
    setUploadProgress({ current: 0, total: totalFiles });
    
    try {
      for (let i = 0; i < uploadForm.files.length; i++) {
        const file = uploadForm.files[i];
        setUploadProgress({ current: i, total: totalFiles });
        
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

      setUploadProgress({ current: totalFiles, total: totalFiles });
      setUploadForm({ files: [], folder: "Bilder", description: "" });
      setShowUploadForm(false);
      await loadDocuments();
    } catch (error) {
      console.error("Fehler beim Upload:", error);
    }
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
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

  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.file_name.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
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

  const handleCreateMainFolder = () => {
    if (!newMainFolderName.trim()) {
      alert("Bitte geben Sie einen Ordnernamen ein");
      return;
    }
    
    if (allFolders.includes(newMainFolderName.trim())) {
      alert("Dieser Ordner existiert bereits");
      return;
    }
    
    const updatedFolders = [...customFolders, newMainFolderName.trim()];
    saveCustomFolders(updatedFolders);
    
    setShowNewMainFolderDialog(false);
    setNewMainFolderName("");
  };

  const handleRenameSubfolder = async (oldFolder, newName) => {
    if (!newName.trim()) return;

    const oldParts = oldFolder.split('/');
    const parentPath = oldParts.slice(0, -1).join('/');
    const newFolder = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();

    const docsToUpdate = documents.filter(doc => doc.folder === oldFolder);
    
    for (const doc of docsToUpdate) {
      await ProjectDocument.update(doc.id, { folder: newFolder });
    }

    setEditingSubfolder(null);
    await loadDocuments();
  };

  const handleDeleteSubfolder = async (folder) => {
    const docsInFolder = documents.filter(doc => 
      doc.folder === folder || doc.folder.startsWith(folder + '/')
    );

    for (const doc of docsInFolder) {
      await ProjectDocument.delete(doc.id);
    }

    const updatedCustomFolders = customFolders.filter(f => f !== folder && !f.startsWith(folder + '/'));
    saveCustomFolders(updatedCustomFolders);

    setShowDeleteSubfolderDialog(false);
    setFolderToDelete(null);
    await loadDocuments();
  };

  const handleDrop = async (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragTargetFolder(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploading(true);
    const totalFiles = files.length;
    setUploadProgress({ current: 0, total: totalFiles });
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i, total: totalFiles });
        
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
      setUploadProgress({ current: totalFiles, total: totalFiles });
      await loadDocuments();
    } catch (error) {
      console.error("Fehler beim Upload:", error);
    }
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
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

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folder)) {
        newSet.delete(folder);
      } else {
        newSet.add(folder);
      }
      return newSet;
    });
  };

  const hasSubfolders = (folder) => {
    return allFolders.some(f => f.startsWith(folder + '/') && f !== folder);
  };

  const getSubfolderCount = (folder) => {
    return allFolders.filter(f => isSubfolderOf(f, folder)).length;
  };

  const isSubfolderOf = (folder, parentFolder) => {
    if (!folder.startsWith(parentFolder + '/')) return false;
    const remainingPath = folder.substring(parentFolder.length + 1);
    return !remainingPath.includes('/');
  };

  const getTopLevelFolders = () => {
    return allFolders.filter(folder => getFolderDepth(folder) === 0);
  };

  const getDirectSubfolders = (parentFolder) => {
    return allFolders.filter(folder => isSubfolderOf(folder, parentFolder));
  };

  const toggleSubfolder = (folder) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folder)) {
        newSet.delete(folder);
      } else {
        newSet.add(folder);
      }
      return newSet;
    });
  };

  const handleExportCoverSheetPdf = async () => {
    if (!coverSheetRef.current) {
      alert("Fehler: Deckblatt-Komponente konnte nicht gefunden werden.");
      return;
    }

    setIsExportingPdf(true);

    try {
      const element = coverSheetRef.current;
      const originalStyles = {
        position: element.style.position,
        left: element.style.left,
        top: element.style.top,
        zIndex: element.style.zIndex,
        width: element.style.width,
        visibility: element.style.visibility,
        overflow: element.style.overflow
      };

      element.style.position = 'fixed';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '9999';
      element.style.width = '297mm';
      element.style.visibility = 'visible';
      element.style.overflow = 'visible';

      await new Promise(resolve => setTimeout(resolve, 1500));

      const images = element.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 2500);
          });
        })
      );

      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.body.querySelector('[style*="position: fixed"]');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.overflow = 'visible';
          }
        }
      });

      Object.keys(originalStyles).forEach(key => {
        element.style[key] = originalStyles[key];
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('l', 'mm', 'a4');

      const pdfWidth = 297;
      const pdfHeight = 210;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`Deckblatt_${project.project_number}.pdf`);

    } catch (error) {
      console.error("Fehler beim Erstellen des Deckblatt-PDFs:", error);
      alert("Fehler beim Erstellen des Deckblatt-PDFs. Bitte versuchen Sie es erneut.");

      if (coverSheetRef.current) {
        coverSheetRef.current.style.position = 'absolute';
        coverSheetRef.current.style.left = '-9999px';
        coverSheetRef.current.style.visibility = 'hidden';
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Check if user is Bauleiter or Oberfläche
  const showDeckblattExport = user && (user.position === 'Bauleiter' || user.position === 'Oberfläche');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h3 className="text-xl font-bold">Anlagenkorb ({documents.length})</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          {showDeckblattExport && (
            <Button 
              onClick={handleExportCoverSheetPdf} 
              variant="outline"
              disabled={isExportingPdf}
              className="flex-shrink-0 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Export läuft...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Deckblatt Export</span>
                  <span className="sm:hidden">Deckblatt</span>
                </>
              )}
            </Button>
          )}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Dateien durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowNewMainFolderDialog(true)} variant="outline" className="flex-shrink-0">
            <FolderOpen className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Neuer Ordner</span>
          </Button>
          <Button onClick={() => setShowUploadForm(true)} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 flex-shrink-0">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Datei hochladen</span>
          </Button>
        </div>
      </div>
      
      {searchQuery && (
        <div className="text-sm text-gray-600">
          {filteredDocuments.length} Ergebnis(se) für "{searchQuery}"
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="ml-2 h-6 px-2">
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Global Upload Progress Bar */}
      {uploading && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Upload läuft...</span>
                <span className="text-sm font-bold text-orange-600">
                  {uploadProgress.current} / {uploadProgress.total} Dateien
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%` }}
                >
                  {uploadProgress.total > 0 && (
                    <span className="text-xs font-bold text-white">
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <Button type="button" variant="outline" onClick={() => setShowUploadForm(false)} disabled={uploading}>
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

        {getTopLevelFolders().map((folder) => {
          const docs = groupedDocuments[folder] || [];
          const hasSubs = hasSubfolders(folder);
          const isMainExpanded = expandedFolders.has(folder);
          const subfolders = getDirectSubfolders(folder);
          
          return (
            <Card 
              key={folder} 
              className={`card-elevation border-none transition-all ${dragActive && dragTargetFolder === folder ? 'border-2 border-orange-500 bg-orange-50' : ''}`}
              onDrop={(e) => handleDrop(e, folder)}
              onDragOver={(e) => handleDragOver(e, folder)}
              onDragLeave={handleDragLeave}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {hasSubs && (
                      <button
                        onClick={() => toggleFolder(folder)}
                        className="hover:bg-gray-100 rounded p-1 -ml-1 transition-colors"
                      >
                        {isMainExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    )}
                    {!hasSubs && <div className="w-6" />}
                    <FolderOpen className="w-5 h-5 text-orange-600" />
                    {getFolderName(folder)}
                    <Badge variant="outline">{docs.length} Datei(en)</Badge>
                    {hasSubs && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                        {getSubfolderCount(folder)} Unterordner
                      </Badge>
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
              
              {/* Unterordner Liste - immer sichtbar wenn vorhanden */}
              {subfolders.length > 0 && (
                <div className="px-6 pb-3 border-b">
                  <div className="space-y-2">
                    {subfolders.map(subfolder => {
                      const subDocs = groupedDocuments[subfolder] || [];
                      const isSubExpanded = expandedFolders.has(subfolder);
                      const hasSubSubs = hasSubfolders(subfolder);
                      
                      return (
                        <div key={subfolder} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={() => toggleSubfolder(subfolder)}
                                className="hover:bg-gray-200 rounded p-1 transition-colors"
                              >
                                {isSubExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                )}
                              </button>
                              <FolderOpen className="w-4 h-4 text-blue-600" />
                              {editingSubfolder === subfolder ? (
                                <input
                                  type="text"
                                  defaultValue={getFolderName(subfolder)}
                                  className="text-sm font-medium border rounded px-2 py-1"
                                  autoFocus
                                  onBlur={(e) => {
                                    if (e.target.value !== getFolderName(subfolder)) {
                                      handleRenameSubfolder(subfolder, e.target.value);
                                    } else {
                                      setEditingSubfolder(null);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    } else if (e.key === 'Escape') {
                                      setEditingSubfolder(null);
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-sm font-medium">{getFolderName(subfolder)}</span>
                              )}
                              <Badge variant="outline" className="text-xs">{subDocs.length}</Badge>
                              {hasSubSubs && (
                                <Badge className="bg-blue-50 text-blue-700 text-xs border-blue-200">
                                  {getSubfolderCount(subfolder)} Sub
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingSubfolder(subfolder)}
                                title="Umbenennen"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setFolderToDelete(subfolder);
                                  setShowDeleteSubfolderDialog(true);
                                }}
                                title="Löschen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setSelectedParentFolder(subfolder);
                                  setShowSubfolderDialog(true);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Sub
                              </Button>
                            </div>
                          </div>
                          
                          {/* Inhalt des Unterordners wenn aufgeklappt */}
                          {isSubExpanded && (
                            <div className="mt-3 pl-6 space-y-2">
                              {subDocs.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Keine Dateien</p>
                              ) : (
                                <div className="space-y-2">
                                  {subDocs.filter(doc => isImage(doc.file_type)).length > 0 && (
                                    <div className="grid grid-cols-4 gap-2">
                                      {subDocs.filter(doc => isImage(doc.file_type)).map((doc) => (
                                        <div
                                          key={doc.id}
                                          className="aspect-square bg-white rounded border hover:border-orange-400 overflow-hidden cursor-pointer"
                                          onClick={() => setPreviewDoc(doc)}
                                        >
                                          <img 
                                            src={doc.file_url} 
                                            alt={doc.file_name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {subDocs.filter(doc => !isImage(doc.file_type)).map((doc) => (
                                    <div key={doc.id} className="flex items-center gap-2 bg-white p-2 rounded text-xs">
                                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                                      <span className="flex-1 truncate">{doc.file_name}</span>
                                      <a href={doc.file_url} download={doc.file_name}>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                          <Download className="w-3 h-3" />
                                        </Button>
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            <CardContent className={isMainExpanded ? '' : 'hidden'}>
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
                     draggable="true"
                     onDragStart={(e) => {
                       e.dataTransfer.effectAllowed = "copy";
                       e.dataTransfer.setData("DownloadURL", `${doc.file_type}:${doc.file_name}:${doc.file_url}`);
                     }}
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
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "copy";
                        e.dataTransfer.setData("DownloadURL", `${doc.file_type}:${doc.file_name}:${doc.file_url}`);
                      }}
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
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.file_url)}&embedded=true`}
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

      {/* New Main Folder Dialog */}
      <AnimatePresence>
        {showNewMainFolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setShowNewMainFolderDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">Neuer Hauptordner</h3>
              <div className="space-y-4">
                <div>
                  <Label>Name des Ordners</Label>
                  <Input
                    value={newMainFolderName}
                    onChange={(e) => setNewMainFolderName(e.target.value)}
                    placeholder="z.B. Sonderdokumente"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateMainFolder();
                      if (e.key === 'Escape') setShowNewMainFolderDialog(false);
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewMainFolderDialog(false);
                      setNewMainFolderName("");
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreateMainFolder}>
                    <Plus className="w-4 h-4 mr-2" />
                    Erstellen
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Subfolder Dialog */}
      <AnimatePresence>
        {showDeleteSubfolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setShowDeleteSubfolderDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">Ordner löschen</h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Möchten Sie den Ordner <strong>{folderToDelete && getFolderName(folderToDelete)}</strong> wirklich löschen?
                </p>
                <p className="text-sm text-red-600 font-medium">
                  Alle Dateien und Unterordner in diesem Ordner werden ebenfalls gelöscht!
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteSubfolderDialog(false);
                      setFolderToDelete(null);
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteSubfolder(folderToDelete)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deckblatt - versteckt für PDF Export */}
      {showDeckblattExport && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }} ref={coverSheetRef}>
          <ProjectCoverSheet
            project={project}
            excavations={excavations}
            materials={[]}
            timesheets={[]}
            documents={documents}
            priceItems={priceItems}
          />
        </div>
      )}

      {/* Export Progress Dialog */}
      <AnimatePresence>
        {isExportingPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md mx-4"
            >
              <Card className="card-elevation border-none">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Deckblatt wird erstellt...
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Bitte warten Sie einen Moment
                  </p>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-600"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Das PDF wird automatisch heruntergeladen
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { ProjectDocument } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  FolderInput,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoveRight,
  Lock,
  Unlock
} from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import ImageViewer from "./ImageViewer";

const folderOptions = [
  "Aufmaß",
  "Bauakte", 
  "Baubeginn und Fertigstellung",
  "Besonderheiten",
  "Bilder",
  "Leitungspläne",
  "Montage",
  "Statusmeldung",
  "VAO",
  "Chat-Dateien"
];

// Standard-Unterordner die immer vorhanden sein sollen
const DEFAULT_SUBFOLDERS = ["VAO/Anträge", "VAO/Verkehrsrechtliche Anordnung"];
// Ordner in dem Dateien als "abgerechnet" markiert werden können
const BILLED_FOLDER = "VAO/Verkehrsrechtliche Anordnung";
// Passwortgeschützte Ordner: { [folderName]: passwort }
const PROTECTED_FOLDERS = { "Rechnungen": "0000" };
const DEFAULT_MAIN_FOLDERS = ["Rechnungen"];

export default function DocumentManagement({ projectId, project, loadData, readOnly = false }) {
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
  const [editingSubfolderName, setEditingSubfolderName] = useState("");
  const [showDeleteSubfolderDialog, setShowDeleteSubfolderDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragTargetFolder, setDragTargetFolder] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set()); // alle zugeklappt beim Start
  const [editingMainFolder, setEditingMainFolder] = useState(null);
  const [editingMainFolderName, setEditingMainFolderName] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMainFolderDialog, setShowNewMainFolderDialog] = useState(false);
  const [newMainFolderName, setNewMainFolderName] = useState("");
  const [movingDoc, setMovingDoc] = useState(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState("");
  const [billingDoc, setBillingDoc] = useState(null);
  const [billingSmNumber, setBillingSmNumber] = useState("");
  const [unBillingDoc, setUnBillingDoc] = useState(null);
  // Multi-select & bulk move
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [bulkMoveFolder, setBulkMoveFolder] = useState("");
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
  // Sort per folder: { [folderPath]: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc' }
  const [folderSortMap, setFolderSortMap] = useState({});
  // Passwort-geschützte Ordner: Set der entsperrten Ordner (nur in dieser Session)
  const [unlockedFolders, setUnlockedFolders] = useState(new Set());
  const [passwordDialog, setPasswordDialog] = useState(null); // { folder, input, error }
  
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
    const existing = saved ? JSON.parse(saved) : [];
    // Merge with default subfolders and default main folders
    const merged = Array.from(new Set([...existing, ...DEFAULT_SUBFOLDERS, ...DEFAULT_MAIN_FOLDERS]));
    if (merged.length !== existing.length) {
      localStorage.setItem(`custom_folders_${projectId}`, JSON.stringify(merged));
    }
    setCustomFolders(merged);
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

  const handleDownloadFile = async (doc) => {
    try {
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download fehlgeschlagen:', error);
      window.open(doc.file_url, '_blank');
    }
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

    // Nur ein Unterordner-Level erlaubt: selectedParentFolder darf kein '/' enthalten
    const parentIsSubfolder = selectedParentFolder && selectedParentFolder.includes('/');
    if (parentIsSubfolder) {
      alert("Unterordner von Unterordnern sind nicht erlaubt.");
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

  const handleRenameMainFolder = async (oldFolder, newName) => {
    if (!newName.trim() || newName.trim() === oldFolder) {
      setEditingMainFolder(null);
      return;
    }
    const newFolder = newName.trim();
    if (allFolders.includes(newFolder)) {
      alert("Dieser Ordner existiert bereits");
      return;
    }
    // Update all docs in this folder
    const docsToUpdate = documents.filter(doc => doc.folder === oldFolder || doc.folder.startsWith(oldFolder + '/'));
    for (const doc of docsToUpdate) {
      const updatedFolder = doc.folder === oldFolder ? newFolder : newFolder + doc.folder.substring(oldFolder.length);
      await ProjectDocument.update(doc.id, { folder: updatedFolder });
    }
    // Update custom folders
    const updatedCustomFolders = customFolders.map(f => {
      if (f === oldFolder) return newFolder;
      if (f.startsWith(oldFolder + '/')) return newFolder + f.substring(oldFolder.length);
      return f;
    });
    saveCustomFolders(updatedCustomFolders);
    setEditingMainFolder(null);
    await loadDocuments();
  };

  const handleRenameSubfolder = async (oldFolder, newName) => {
    if (!newName.trim() || newName.trim() === getFolderName(oldFolder)) {
      setEditingSubfolder(null);
      return;
    }

    const oldParts = oldFolder.split('/');
    const parentPath = oldParts.slice(0, -1).join('/');
    const newFolder = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();

    const docsToUpdate = documents.filter(doc => doc.folder === oldFolder || doc.folder.startsWith(oldFolder + '/'));
    for (const doc of docsToUpdate) {
      const updatedFolder = doc.folder === oldFolder ? newFolder : newFolder + doc.folder.substring(oldFolder.length);
      await ProjectDocument.update(doc.id, { folder: updatedFolder });
    }

    // Update custom folders too
    const updatedCustomFolders = customFolders.map(f => {
      if (f === oldFolder) return newFolder;
      if (f.startsWith(oldFolder + '/')) return newFolder + f.substring(oldFolder.length);
      return f;
    });
    saveCustomFolders(updatedCustomFolders);

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

  const isFolderProtected = (folder) => !!PROTECTED_FOLDERS[folder];
  const isFolderUnlocked = (folder) => unlockedFolders.has(folder);

  const toggleFolder = (folder) => {
    // If folder is protected and not yet unlocked, show password dialog
    if (isFolderProtected(folder) && !isFolderUnlocked(folder)) {
      setPasswordDialog({ folder, input: "", error: "" });
      return;
    }
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

  const handlePasswordSubmit = () => {
    const { folder, input } = passwordDialog;
    if (input === PROTECTED_FOLDERS[folder]) {
      setUnlockedFolders(prev => new Set([...prev, folder]));
      setPasswordDialog(null);
      setExpandedFolders(prev => new Set([...prev, folder]));
    } else {
      setPasswordDialog(prev => ({ ...prev, error: "Falsches Passwort" }));
    }
  };

  const lockFolder = (folder, e) => {
    e.stopPropagation();
    setUnlockedFolders(prev => {
      const next = new Set(prev);
      next.delete(folder);
      return next;
    });
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.delete(folder);
      return next;
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

  const handleMoveDocument = async () => {
    if (!movingDoc || !moveTargetFolder) return;
    await ProjectDocument.update(movingDoc.id, { folder: moveTargetFolder });
    setMovingDoc(null);
    setMoveTargetFolder("");
    await loadDocuments();
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

  // Multi-select helpers
  const toggleDocSelection = (docId) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleSelectAll = (folderDocs) => {
    const allIds = folderDocs.map(d => d.id);
    const allSelected = allIds.every(id => selectedDocIds.has(id));
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach(id => next.delete(id));
      else allIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkMove = async () => {
    if (!bulkMoveFolder || selectedDocIds.size === 0) return;
    await Promise.all([...selectedDocIds].map(id => ProjectDocument.update(id, { folder: bulkMoveFolder })));
    setSelectedDocIds(new Set());
    setShowBulkMoveDialog(false);
    setBulkMoveFolder("");
    await loadDocuments();
  };

  // Sort docs in a folder
  const getSortedDocs = (docs, folder) => {
    const sort = folderSortMap[folder] || 'date_desc';
    return [...docs].sort((a, b) => {
      if (sort === 'name_asc') return a.file_name.localeCompare(b.file_name);
      if (sort === 'name_desc') return b.file_name.localeCompare(a.file_name);
      if (sort === 'date_asc') return new Date(a.created_date) - new Date(b.created_date);
      return new Date(b.created_date) - new Date(a.created_date); // date_desc
    });
  };

  const cycleSortFolder = (folder, e) => {
    e.stopPropagation();
    const order = ['date_desc', 'date_asc', 'name_asc', 'name_desc'];
    const cur = folderSortMap[folder] || 'date_desc';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setFolderSortMap(prev => ({ ...prev, [folder]: next }));
  };

  const getSortLabel = (folder) => {
    const s = folderSortMap[folder] || 'date_desc';
    if (s === 'date_desc') return 'Neueste';
    if (s === 'date_asc') return 'Älteste';
    if (s === 'name_asc') return 'A–Z';
    return 'Z–A';
  };

  const getSortIcon = (folder) => {
    const s = folderSortMap[folder] || 'date_desc';
    if (s === 'name_asc' || s === 'date_asc') return <ArrowUp className="w-3 h-3" />;
    if (s === 'name_desc' || s === 'date_desc') return <ArrowDown className="w-3 h-3" />;
    return <ArrowUpDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Anlagenkorb ({documents.length})</h3>
          <div className="flex gap-1.5">
            <Button onClick={() => setShowNewMainFolderDialog(true)} variant="outline" size="sm" className="flex-shrink-0 h-9 px-2.5">
              <FolderOpen className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs">Ordner</span>
            </Button>
            <Button onClick={() => setShowUploadForm(true)} size="sm" className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 flex-shrink-0 h-9 px-2.5">
              <Plus className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs">Hochladen</span>
            </Button>
          </div>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Dateien durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
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

      {!readOnly && (
      <>
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
      {!readOnly && (
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
      )}

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
              <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-xl px-3 sm:px-6" onClick={() => toggleFolder(folder)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <button className="hover:bg-gray-100 rounded p-1 flex-shrink-0 transition-colors" onClick={e => { e.stopPropagation(); toggleFolder(folder); }}>
                      {isMainExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    {isFolderProtected(folder) ? (
                      isFolderUnlocked(folder) 
                        ? <Unlock className="w-4 h-4 text-green-600 flex-shrink-0" />
                        : <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    )}

                    {editingMainFolder === folder ? (
                      <input
                        type="text"
                        value={editingMainFolderName}
                        className="text-sm font-semibold border rounded px-2 py-0.5 min-w-0 flex-1"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onChange={e => setEditingMainFolderName(e.target.value)}
                        onBlur={() => handleRenameMainFolder(folder, editingMainFolderName)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.target.blur(); }
                          if (e.key === 'Escape') { setEditingMainFolder(null); }
                        }}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base truncate">{getFolderName(folder)}</span>
                    )}
                    <Badge variant="outline" className="text-xs flex-shrink-0">{docs.length}</Badge>
                    {hasSubs && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs flex-shrink-0 hidden sm:inline-flex">
                        {getSubfolderCount(folder)} Sub
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isFolderProtected(folder) && isFolderUnlocked(folder) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-green-600 hover:text-red-600"
                        title="Ordner sperren"
                        onClick={(e) => lockFolder(folder, e)}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-gray-500 hidden sm:flex items-center gap-1"
                      title="Sortierung ändern"
                      onClick={(e) => cycleSortFolder(folder, e)}
                    >
                      {getSortIcon(folder)}
                      <span className="hidden sm:inline">{getSortLabel(folder)}</span>
                    </Button>
                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Ordner umbenennen"
                          onClick={() => { setEditingMainFolder(folder); setEditingMainFolderName(getFolderName(folder)); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 sm:w-auto sm:px-2"
                          onClick={() => {
                            setSelectedParentFolder(folder);
                            setShowSubfolderDialog(true);
                          }}
                          title="Unterordner erstellen"
                        >
                          <Plus className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline text-xs">Unterordner</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              
            <CardContent className={`${isMainExpanded && (!isFolderProtected(folder) || isFolderUnlocked(folder)) ? '' : 'hidden pb-0'} px-3 sm:px-6`}>
              {(() => {
                const sortedDocs = getSortedDocs(docs, folder);
                const folderSelectedCount = sortedDocs.filter(d => selectedDocIds.has(d.id)).length;
                return (<>
              {/* Selection bar */}
              {sortedDocs.length > 0 && !readOnly && (
                <div className="flex items-center gap-2 mb-3 text-xs">
                   <Checkbox
                     checked={folderSelectedCount === sortedDocs.length && sortedDocs.length > 0}
                     onCheckedChange={() => toggleSelectAll(sortedDocs)}
                     id={`select-all-${folder}`}
                   />
                   <label htmlFor={`select-all-${folder}`} className="text-gray-500 cursor-pointer select-none">Alle auswählen</label>
                   {folderSelectedCount > 0 && (
                     <Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                       onClick={() => { setBulkMoveFolder(""); setShowBulkMoveDialog(true); }}>
                       <MoveRight className="w-3 h-3 mr-1" />
                       {folderSelectedCount} verschieben
                     </Button>
                   )}
                 </div>
              )}

              {sortedDocs.length === 0 && subfolders.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Dateien hochladen oder hierher ziehen</p>
                </div>
              )}
              
              {/* Grid view for images */}
              {sortedDocs.some(doc => isImage(doc.file_type)) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
                  {sortedDocs.filter(doc => isImage(doc.file_type)).map((doc) => (
                    <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`group relative bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${selectedDocIds.has(doc.id) ? 'border-blue-500' : 'border-gray-200 hover:border-orange-400'}`}
                    >
                    {/* Selection checkbox overlay - top right */}
                    <div className="absolute top-1 right-1 z-10" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedDocIds.has(doc.id)}
                        onCheckedChange={() => toggleDocSelection(doc.id)}
                        className="bg-white/90 border-gray-400"
                      />
                    </div>
                    {/* Upload date - top left */}
                    <div className="absolute top-1 left-1 z-10">
                      <span className="text-[9px] bg-black/50 text-white rounded px-1 py-0.5 leading-none">
                        {doc.created_date ? new Date(doc.created_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                      </span>
                    </div>
                    <img 
                      src={doc.file_url} 
                      alt={doc.file_name}
                      className="w-full aspect-square object-cover cursor-pointer"
                      onClick={() => setPreviewDoc(doc)}
                    />
                      
                      {/* Filename always visible at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                        {editingFileName === doc.id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Input
                              value={newFileName}
                              onChange={(e) => setNewFileName(e.target.value)}
                              className="h-5 text-[10px] px-1 py-0 bg-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveFileName(doc.id);
                                if (e.key === 'Escape') cancelEditingFileName();
                              }}
                              autoFocus
                            />
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); saveFileName(doc.id); }} className="h-5 w-5 p-0 flex-shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); cancelEditingFileName(); }} className="h-5 w-5 p-0 flex-shrink-0">
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); startEditingFileName(doc); }}>
                            <p className="text-[10px] text-white truncate flex-1 leading-tight">{doc.file_name}</p>
                            <Edit className="w-2.5 h-2.5 text-white/70 flex-shrink-0" />
                          </div>
                        )}
                      </div>

                      {/* Hover overlay with action buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-start p-1 gap-1 pb-7 pt-6">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white/90 hover:bg-white" onClick={() => setPreviewDoc(doc)} title="Vorschau">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <a href={doc.file_url} download={doc.file_name}>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white/90 hover:bg-white" title="Herunterladen">
                            <Download className="w-3 h-3" />
                          </Button>
                        </a>
                        {!readOnly && (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-blue-50 hover:bg-blue-100 text-blue-600" onClick={(e) => { e.stopPropagation(); setMovingDoc(doc); setMoveTargetFolder(doc.folder); }} title="Verschieben">
                              <FolderInput className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-red-100 hover:bg-red-200 text-red-600" onClick={() => handleDeleteDocument(doc.id)} title="Löschen">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* List view for non-images */}
              {sortedDocs.some(doc => !isImage(doc.file_type)) && (
                <div className="space-y-3">
                  {sortedDocs.filter(doc => !isImage(doc.file_type)).map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors ${selectedDocIds.has(doc.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedDocIds.has(doc.id)}
                          onCheckedChange={() => toggleDocSelection(doc.id)}
                          className="flex-shrink-0"
                        />
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
                             <p className="font-medium text-gray-900 truncate text-sm">{doc.file_name}</p>
                             <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)} • <span className="hidden sm:inline">von </span>{doc.uploaded_by || doc.created_by}</p>
                              {doc.description && (
                                <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingFileName !== doc.id && (
                         <div className="flex items-center gap-1 flex-shrink-0">
                           {!readOnly && (
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-8 w-8 p-0"
                               onClick={() => startEditingFileName(doc)}
                               title="Dateiname bearbeiten"
                             >
                               <Edit className="w-3.5 h-3.5" />
                             </Button>
                           )}
                           <Button 
                             size="sm" 
                             variant="ghost"
                             className="h-8 w-8 p-0"
                             title="Vorschau"
                             onClick={() => setPreviewDoc(doc)}
                           >
                             <Eye className="w-3.5 h-3.5" />
                           </Button>
                           {!readOnly && (
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                               onClick={() => { setMovingDoc(doc); setMoveTargetFolder(doc.folder); }}
                               title="Verschieben"
                             >
                               <FolderInput className="w-3.5 h-3.5" />
                             </Button>
                           )}
                           <a href={doc.file_url} download={doc.file_name}>
                             <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Herunterladen">
                               <Download className="w-3.5 h-3.5" />
                             </Button>
                           </a>
                           {!readOnly && (
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                               onClick={() => handleDeleteDocument(doc.id)}
                               title="Löschen"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                           )}
                         </div>
                       )}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Unterordner Liste - nach den Dateien des Hauptordners */}
              {subfolders.length > 0 && (
                <div className={`${docs.length > 0 ? 'mt-4 border-t pt-4' : ''} space-y-2`}>
                  {subfolders.map(subfolder => {
                      const subDocs = groupedDocuments[subfolder] || [];
                      const isSubExpanded = expandedFolders.has(subfolder);
                      const hasSubSubs = hasSubfolders(subfolder);
                      
                      return (
                        <div key={subfolder} className="bg-gray-50 rounded-lg p-2.5">
                          <div className="flex flex-col gap-1.5">
                            {/* Top row: chevron + icon + name + badges */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                onClick={() => toggleSubfolder(subfolder)}
                                className="hover:bg-gray-200 rounded p-1 transition-colors flex-shrink-0"
                              >
                                {isSubExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                )}
                              </button>
                              <FolderOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              {editingSubfolder === subfolder ? (
                                <input
                                  type="text"
                                  value={editingSubfolderName}
                                  className="text-sm font-medium border rounded px-2 py-0.5 flex-1 min-w-0"
                                  autoFocus
                                  onChange={(e) => setEditingSubfolderName(e.target.value)}
                                  onBlur={() => handleRenameSubfolder(subfolder, editingSubfolderName)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubfolder(subfolder, editingSubfolderName);
                                    else if (e.key === 'Escape') setEditingSubfolder(null);
                                  }}
                                />
                              ) : (
                                <span className="text-sm font-medium truncate min-w-0 flex-1">{getFolderName(subfolder)}</span>
                              )}
                              <Badge variant="outline" className="text-xs flex-shrink-0">{subDocs.length}</Badge>
                            </div>
                            {/* Bottom row: action buttons */}
                             {!readOnly && (
                             <div className="flex items-center gap-1 pl-7">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-7 w-7 p-0"
                                 onClick={() => { setEditingSubfolder(subfolder); setEditingSubfolderName(getFolderName(subfolder)); }}
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

                             </div>
                             )}
                          </div>
                          
                          {/* Inhalt des Unterordners wenn aufgeklappt */}
                          {isSubExpanded && (
                            <div className="mt-3 pl-2 space-y-2">
                              {subDocs.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Keine Dateien</p>
                              ) : (
                                <div className="space-y-2">
                                  {/* Image grid - same as main folder */}
                                  {subDocs.filter(doc => isImage(doc.file_type)).length > 0 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 mb-2">
                                      {subDocs.filter(doc => isImage(doc.file_type)).map((doc) => (
                                        <motion.div
                                          key={doc.id}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className={`group relative bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${selectedDocIds.has(doc.id) ? 'border-blue-500' : 'border-gray-200 hover:border-orange-400'}`}
                                        >
                                          {/* Selection checkbox - top right */}
                                          <div className="absolute top-1 right-1 z-10" onClick={e => e.stopPropagation()}>
                                            <Checkbox
                                              checked={selectedDocIds.has(doc.id)}
                                              onCheckedChange={() => toggleDocSelection(doc.id)}
                                              className="bg-white/90 border-gray-400"
                                            />
                                          </div>
                                          {/* Upload date - top left */}
                                          <div className="absolute top-1 left-1 z-10">
                                            <span className="text-[9px] bg-black/50 text-white rounded px-1 py-0.5 leading-none">
                                              {doc.created_date ? new Date(doc.created_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                                            </span>
                                          </div>
                                          <img
                                            src={doc.file_url}
                                            alt={doc.file_name}
                                            className="w-full aspect-square object-cover cursor-pointer"
                                            onClick={() => setPreviewDoc(doc)}
                                          />
                                          {/* Filename always visible at bottom */}
                                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                            {editingFileName === doc.id ? (
                                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <Input
                                                  value={newFileName}
                                                  onChange={(e) => setNewFileName(e.target.value)}
                                                  className="h-5 text-[10px] px-1 py-0 bg-white"
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveFileName(doc.id);
                                                    if (e.key === 'Escape') cancelEditingFileName();
                                                  }}
                                                  autoFocus
                                                />
                                                <Button size="sm" onClick={(e) => { e.stopPropagation(); saveFileName(doc.id); }} className="h-5 w-5 p-0 flex-shrink-0">
                                                  <Check className="w-2.5 h-2.5" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); cancelEditingFileName(); }} className="h-5 w-5 p-0 flex-shrink-0">
                                                  <X className="w-2.5 h-2.5" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); startEditingFileName(doc); }}>
                                                <p className="text-[10px] text-white truncate flex-1 leading-tight">{doc.file_name}</p>
                                                <Edit className="w-2.5 h-2.5 text-white/70 flex-shrink-0" />
                                              </div>
                                            )}
                                          </div>
                                          {/* Hover overlay with action buttons */}
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-start p-1 gap-1 pb-7 pt-6">
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white/90 hover:bg-white" onClick={() => setPreviewDoc(doc)} title="Vorschau">
                                              <Eye className="w-3 h-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white/90 hover:bg-white" title="Herunterladen" onClick={(e) => { e.stopPropagation(); handleDownloadFile(doc); }}>
                                              <Download className="w-3 h-3" />
                                            </Button>
                                            {!readOnly && (
                                              <>
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-blue-50 hover:bg-blue-100 text-blue-600" onClick={(e) => { e.stopPropagation(); setMovingDoc(doc); setMoveTargetFolder(doc.folder); }} title="Verschieben">
                                                  <FolderInput className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-red-100 hover:bg-red-200 text-red-600" onClick={() => handleDeleteDocument(doc.id)} title="Löschen">
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Non-image list */}
                                  {subDocs.filter(doc => !isImage(doc.file_type)).map((doc) => (
                                    <div key={doc.id} className={`flex items-center gap-2 bg-white p-2 rounded text-xs ${doc.is_billed ? 'border border-green-200 bg-green-50' : ''} ${selectedDocIds.has(doc.id) ? 'border border-blue-300 bg-blue-50' : ''}`}>
                                      <Checkbox
                                        checked={selectedDocIds.has(doc.id)}
                                        onCheckedChange={() => toggleDocSelection(doc.id)}
                                        className="flex-shrink-0 h-3 w-3"
                                      />
                                      <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                      {editingFileName === doc.id ? (
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                          <Input
                                            value={newFileName}
                                            onChange={(e) => setNewFileName(e.target.value)}
                                            className="h-5 text-xs px-1 flex-1"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveFileName(doc.id);
                                              if (e.key === 'Escape') cancelEditingFileName();
                                            }}
                                            autoFocus
                                          />
                                          <Button size="sm" onClick={() => saveFileName(doc.id)} className="h-5 w-5 p-0"><Check className="w-3 h-3" /></Button>
                                          <Button size="sm" variant="outline" onClick={cancelEditingFileName} className="h-5 w-5 p-0"><X className="w-3 h-3" /></Button>
                                        </div>
                                      ) : (
                                        <span
                                          className={`flex-1 truncate cursor-pointer hover:text-orange-600 ${doc.is_billed ? 'text-gray-500' : ''}`}
                                          title="Klicken zum Umbenennen"
                                          onClick={() => startEditingFileName(doc)}
                                        >{doc.file_name}</span>
                                      )}
                                      {subfolder === BILLED_FOLDER && (
                                        <button
                                          title={doc.is_billed ? "Abrechnung entfernen" : "Als abgerechnet markieren"}
                                          onClick={() => {
                                            if (doc.is_billed) { setUnBillingDoc(doc); }
                                            else { setBillingDoc(doc); setBillingSmNumber(""); }
                                          }}
                                          className={`flex flex-col items-end gap-0.5 px-2 py-1 rounded text-xs font-medium flex-shrink-0 transition-colors ${doc.is_billed ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                          {doc.is_billed ? (
                                            <div className="flex flex-col items-end">
                                              {doc.billed_sm_number && <span className="text-[10px] text-green-500 font-normal leading-none mb-0.5">{doc.billed_sm_number}</span>}
                                              <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" />Abgerechnet</span>
                                            </div>
                                          ) : (
                                            <span className="flex items-center gap-1"><Square className="w-3 h-3" />Abrechnen</span>
                                          )}
                                        </button>
                                      )}
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPreviewDoc(doc)} title="Vorschau"><Eye className="w-3 h-3" /></Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700" onClick={() => { setMovingDoc(doc); setMoveTargetFolder(doc.folder); }} title="Verschieben"><FolderInput className="w-3 h-3" /></Button>
                                      <a href={doc.file_url} download={doc.file_name}>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Download className="w-3 h-3" /></Button>
                                      </a>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteDocument(doc.id)} title="Löschen"><Trash2 className="w-3 h-3" /></Button>
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
              )}
              </>); })()}
            </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Image Viewer for images with zoom and navigation */}
      <AnimatePresence>
        {previewDoc && isImage(previewDoc.file_type) && (
          <ImageViewer
            images={filteredDocuments.filter(d => isImage(d.file_type))}
            currentIndex={filteredDocuments.filter(d => isImage(d.file_type)).findIndex(d => d.id === previewDoc.id)}
            onClose={() => setPreviewDoc(null)}
            onNavigate={(index) => setPreviewDoc(filteredDocuments.filter(d => isImage(d.file_type))[index])}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal for non-image files */}
      <AnimatePresence>
        {previewDoc && !isImage(previewDoc.file_type) && (
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
                {previewDoc.file_type?.includes('pdf') || previewDoc.file_name?.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.file_url)}&embedded=true`}
                    className="w-full h-[70vh] border-0"
                    title={previewDoc.file_name}
                  />
                ) : (previewDoc.file_name?.match(/\.(docx?|xlsx?|pptx?|odt|ods|odp)$/i)) ? (
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

      </>
      )}

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

      {!readOnly && (
      <>
      {/* Move Document Dialog */}
      <AnimatePresence>
        {movingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setMovingDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-1">Datei verschieben</h3>
              <p className="text-sm text-gray-500 mb-4 truncate">{movingDoc.file_name}</p>
              <div className="space-y-4">
                <div>
                  <Label>Zielordner</Label>
                  <Select value={moveTargetFolder} onValueChange={setMoveTargetFolder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ordner wählen..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] z-[200]">
                      {allFolders.map(f => (
                        <SelectItem key={f} value={f}>
                          {'  '.repeat(getFolderDepth(f))}{getFolderDepth(f) > 0 ? '└─ ' : ''}{getFolderName(f)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setMovingDoc(null)}>Abbrechen</Button>
                  <Button
                    onClick={handleMoveDocument}
                    disabled={!moveTargetFolder || moveTargetFolder === movingDoc.folder}
                  >
                    <FolderInput className="w-4 h-4 mr-2" />
                    Verschieben
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Move Dialog */}
      <AnimatePresence>
        {showBulkMoveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setShowBulkMoveDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-1">Dateien verschieben</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedDocIds.size} Datei(en) ausgewählt</p>
              <div className="space-y-4">
                <div>
                  <Label>Zielordner</Label>
                  <Select value={bulkMoveFolder} onValueChange={setBulkMoveFolder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ordner wählen..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] z-[200]">
                      {allFolders.map(f => (
                        <SelectItem key={f} value={f}>
                          {'  '.repeat(getFolderDepth(f))}{getFolderDepth(f) > 0 ? '└─ ' : ''}{getFolderName(f)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowBulkMoveDialog(false)}>Abbrechen</Button>
                  <Button onClick={handleBulkMove} disabled={!bulkMoveFolder} className="bg-blue-600 hover:bg-blue-700">
                    <MoveRight className="w-4 h-4 mr-2" />
                    Verschieben
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Billing SM Number Dialog */}
      <AnimatePresence>
        {billingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setBillingDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-1">VAO abrechnen</h3>
              <p className="text-xs text-gray-500 mb-4 truncate">{billingDoc.file_name}</p>
              <div className="space-y-4">
                <div>
                  <Label>SM Nummer der Abrechnung</Label>
                  <Input
                    value={billingSmNumber}
                    onChange={(e) => setBillingSmNumber(e.target.value)}
                    placeholder="z.B. SM-2024-001"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && billingSmNumber.trim()) {
                        ProjectDocument.update(billingDoc.id, { is_billed: true, billed_sm_number: billingSmNumber.trim() })
                          .then(() => loadDocuments());
                        setBillingDoc(null);
                      }
                      if (e.key === 'Escape') setBillingDoc(null);
                    }}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setBillingDoc(null)}>Abbrechen</Button>
                  <Button
                    disabled={!billingSmNumber.trim()}
                    onClick={() => {
                      ProjectDocument.update(billingDoc.id, { is_billed: true, billed_sm_number: billingSmNumber.trim() })
                        .then(() => loadDocuments());
                      setBillingDoc(null);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Als abgerechnet markieren
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Un-Billing Confirmation Dialog */}
      <AnimatePresence>
        {unBillingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setUnBillingDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 to-red-400" />
              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-orange-50 border-4 border-orange-100 flex items-center justify-center">
                    <CheckSquare className="w-7 h-7 text-orange-500" />
                  </div>
                </div>
                <h3 className="text-center text-base font-bold text-gray-900 mb-1">Abrechnung entfernen?</h3>
                <p className="text-center text-xs text-gray-500 mb-4">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Datei:</span>
                    <span className="font-medium text-gray-800 truncate ml-2 max-w-[180px]">{unBillingDoc.file_name}</span>
                  </div>
                  {unBillingDoc.billed_sm_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">SM Nummer:</span>
                      <span className="font-semibold text-gray-800">{unBillingDoc.billed_sm_number}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setUnBillingDoc(null)}>
                    <X className="w-4 h-4 mr-1" />
                    Abbrechen
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      ProjectDocument.update(unBillingDoc.id, { is_billed: false, billed_sm_number: null })
                        .then(() => loadDocuments());
                      setUnBillingDoc(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Ja, entfernen
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Dialog */}
      <AnimatePresence>
        {passwordDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setPasswordDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400" />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Geschützter Ordner</h3>
                    <p className="text-xs text-gray-500">"{passwordDialog.folder}" ist passwortgeschützt</p>
                  </div>
                </div>
                <div>
                  <Label>Passwort eingeben</Label>
                  <Input
                    type="password"
                    value={passwordDialog.input}
                    onChange={(e) => setPasswordDialog(prev => ({ ...prev, input: e.target.value, error: "" }))}
                    placeholder="Passwort..."
                    autoFocus
                    className={passwordDialog.error ? "border-red-400" : ""}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePasswordSubmit();
                      if (e.key === 'Escape') setPasswordDialog(null);
                    }}
                  />
                  {passwordDialog.error && (
                    <p className="text-xs text-red-500 mt-1">{passwordDialog.error}</p>
                  )}
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setPasswordDialog(null)}>Abbrechen</Button>
                  <Button onClick={handlePasswordSubmit} className="bg-red-600 hover:bg-red-700">
                    <Unlock className="w-4 h-4 mr-2" />
                    Entsperren
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </>
      )}

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
    </div>
  );
}
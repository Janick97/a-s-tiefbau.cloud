import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ProjectDocument } from "@/entities/all";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence } from "framer-motion";
import {
  Plus, Upload, FileText, FolderOpen, Search, X, Edit2, Trash2,
  ChevronRight, ChevronDown, FolderInput, ArrowUp, ArrowDown, ArrowUpDown,
  MoveRight, Lock, Unlock, FolderDown, Loader2, Image as ImageIcon, Filter
} from "lucide-react";
import JSZip from "jszip";
import { UploadFile } from "@/integrations/Core";
import ImageViewer from "./ImageViewer";
import DocUploadForm from "./documents/DocUploadForm";
import DocFileItem from "./documents/DocFileItem";
import DocImageItem from "./documents/DocImageItem";
import {
  SubfolderDialog, NewMainFolderDialog, MoveDocDialog, BulkMoveDialog,
  DeleteFolderDialog, BillingDialog, UnBillingDialog, PasswordDialog
} from "./documents/DocDialogs";

const folderOptions = ["Aufmaß", "Bauakte", "Baubeginn und Fertigstellung", "Besonderheiten", "Bilder", "Leitungspläne", "Montage", "Statusmeldung", "VAO", "Chat-Dateien"];
const DEFAULT_SUBFOLDERS = ["VAO/Anträge", "VAO/Verkehrsrechtliche Anordnung"];
const BILLED_FOLDER = "VAO/Verkehrsrechtliche Anordnung";
const PROTECTED_FOLDERS = { "Rechnungen": "0000" };
const DEFAULT_MAIN_FOLDERS = ["Rechnungen"];

export default function DocumentManagement({ projectId, project, loadData, readOnly = false }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadForm, setUploadForm] = useState({ files: [], folder: "Bilder", description: "" });

  // Editing
  const [editingFileName, setEditingFileName] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [loadingDocId, setLoadingDocId] = useState(null);

  // Preview
  const [previewDoc, setPreviewDoc] = useState(null);

  // Folders
  const [customFolders, setCustomFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingMainFolder, setEditingMainFolder] = useState(null);
  const [editingMainFolderName, setEditingMainFolderName] = useState("");
  const [editingSubfolder, setEditingSubfolder] = useState(null);
  const [editingSubfolderName, setEditingSubfolderName] = useState("");
  const [zippingFolder, setZippingFolder] = useState(null);

  // Dialogs
  const [showSubfolderDialog, setShowSubfolderDialog] = useState(false);
  const [selectedParentFolder, setSelectedParentFolder] = useState("");
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [showNewMainFolderDialog, setShowNewMainFolderDialog] = useState(false);
  const [newMainFolderName, setNewMainFolderName] = useState("");
  const [showDeleteSubfolderDialog, setShowDeleteSubfolderDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [movingDoc, setMovingDoc] = useState(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState("");
  const [billingDoc, setBillingDoc] = useState(null);
  const [billingSmNumber, setBillingSmNumber] = useState("");
  const [unBillingDoc, setUnBillingDoc] = useState(null);
  const [passwordDialog, setPasswordDialog] = useState(null);

  // Multi-select
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
  const [bulkMoveFolder, setBulkMoveFolder] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all"); // all | images | files

  // Sort
  const [folderSortMap, setFolderSortMap] = useState({});

  // Drag
  const [dragActive, setDragActive] = useState(false);
  const [dragTargetFolder, setDragTargetFolder] = useState(null);

  // Unlocked protected folders
  const [unlockedFolders, setUnlockedFolders] = useState(new Set());

  useEffect(() => { loadDocuments(); loadCustomFolders(); }, [projectId]);

  const loadCustomFolders = () => {
    const saved = localStorage.getItem(`custom_folders_${projectId}`);
    const existing = saved ? JSON.parse(saved) : [];
    const merged = Array.from(new Set([...existing, ...DEFAULT_SUBFOLDERS, ...DEFAULT_MAIN_FOLDERS]));
    if (merged.length !== existing.length) localStorage.setItem(`custom_folders_${projectId}`, JSON.stringify(merged));
    setCustomFolders(merged);
  };

  const saveCustomFolders = (folders) => {
    localStorage.setItem(`custom_folders_${projectId}`, JSON.stringify(folders));
    setCustomFolders(folders);
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await ProjectDocument.filter({ project_id: projectId }, "-created_date");
      setDocuments(Array.isArray(data) ? data : []);
    } catch { setDocuments([]); }
    setIsLoading(false);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getFolderDepth = (f) => f.split('/').length - 1;
  const getFolderName = (f) => f.split('/').pop();
  const getParentFolder = (f) => f.split('/').slice(0, -1).join('/');
  const isImage = (ft) => ft && ft.includes('image');
  const isFolderProtected = (f) => !!PROTECTED_FOLDERS[f];
  const isFolderUnlocked = (f) => unlockedFolders.has(f);
  const isSubfolderOf = (f, parent) => f.startsWith(parent + '/') && !f.substring(parent.length + 1).includes('/');

  const allFolders = useMemo(() => {
    const s = new Set([...customFolders]);
    documents.forEach((doc) => {
      if (doc.folder) {
        s.add(doc.folder);
        doc.folder.split('/').forEach((_, i, arr) => { if (i > 0) s.add(arr.slice(0, i).join('/')); });
      }
    });
    return Array.from(s).sort();
  }, [documents, customFolders]);

  const filteredDocuments = useMemo(() => {
    let docs = documents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter((d) => d.file_name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q));
    }
    if (fileTypeFilter === 'images') docs = docs.filter((d) => isImage(d.file_type));
    if (fileTypeFilter === 'files') docs = docs.filter((d) => !isImage(d.file_type));
    return docs;
  }, [documents, searchQuery, fileTypeFilter]);

  const groupedDocuments = useMemo(() => filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.folder]) acc[doc.folder] = [];
    acc[doc.folder].push(doc);
    return acc;
  }, {}), [filteredDocuments]);

  const getTopLevelFolders = () => allFolders.filter((f) => getFolderDepth(f) === 0);
  const hasSubfolders = (f) => allFolders.some((x) => x.startsWith(f + '/') && x !== f);
  const getDirectSubfolders = (parent) => allFolders.filter((f) => isSubfolderOf(f, parent));
  const getSubfolderCount = (f) => allFolders.filter((x) => isSubfolderOf(x, f)).length;

  const getSortedDocs = (docs, folder) => {
    const sort = folderSortMap[folder] || 'date_desc';
    return [...docs].sort((a, b) => {
      if (sort === 'name_asc') return a.file_name.localeCompare(b.file_name);
      if (sort === 'name_desc') return b.file_name.localeCompare(a.file_name);
      if (sort === 'date_asc') return new Date(a.created_date) - new Date(b.created_date);
      return new Date(b.created_date) - new Date(a.created_date);
    });
  };

  const cycleSortFolder = (folder, e) => {
    e.stopPropagation();
    const order = ['date_desc', 'date_asc', 'name_asc', 'name_desc'];
    const cur = folderSortMap[folder] || 'date_desc';
    setFolderSortMap((prev) => ({ ...prev, [folder]: order[(order.indexOf(cur) + 1) % order.length] }));
  };

  const getSortLabel = (folder) => {
    const s = folderSortMap[folder] || 'date_desc';
    return { date_desc: 'Neueste', date_asc: 'Älteste', name_asc: 'A–Z', name_desc: 'Z–A' }[s];
  };

  const getSortIcon = (folder) => {
    const s = folderSortMap[folder] || 'date_desc';
    if (s === 'name_asc' || s === 'date_asc') return <ArrowUp className="w-3 h-3" />;
    if (s === 'name_desc' || s === 'date_desc') return <ArrowDown className="w-3 h-3" />;
    return <ArrowUpDown className="w-3 h-3" />;
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.files || uploadForm.files.length === 0) return;
    setUploading(true);
    const total = uploadForm.files.length;
    setUploadProgress({ current: 0, total });
    try {
      for (let i = 0; i < uploadForm.files.length; i++) {
        const file = uploadForm.files[i];
        setUploadProgress({ current: i, total });
        const { file_url } = await UploadFile({ file });
        await ProjectDocument.create({ project_id: projectId, file_name: file.name, file_url, file_size: file.size, file_type: file.type, folder: uploadForm.folder, description: uploadForm.description });
      }
      setUploadProgress({ current: total, total });
      setUploadForm({ files: [], folder: "Bilder", description: "" });
      setShowUploadForm(false);
      await loadDocuments();
    } catch (error) { console.error("Upload error:", error); }
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Dokument wirklich löschen?")) return;
    setLoadingDocId(documentId);
    try { await ProjectDocument.delete(documentId); await loadDocuments(); } catch (e) { console.error(e); }
    setLoadingDocId(null);
  };

  const saveFileName = async (documentId) => {
    if (!newFileName.trim()) return;
    try { await ProjectDocument.update(documentId, { file_name: newFileName.trim() }); setEditingFileName(null); await loadDocuments(); } catch (e) { console.error(e); }
  };

  const handleDrop = async (e, folder) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false); setDragTargetFolder(null);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    setUploading(true);
    const total = files.length;
    setUploadProgress({ current: 0, total });
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i, total });
        const { file_url } = await UploadFile({ file: files[i] });
        await ProjectDocument.create({ project_id: projectId, file_name: files[i].name, file_url, file_size: files[i].size, file_type: files[i].type, folder, description: "" });
      }
      setUploadProgress({ current: total, total });
      await loadDocuments();
    } catch (e) { console.error(e); }
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
  };

  const handleCreateSubfolder = () => {
    if (!newSubfolderName.trim()) return;
    if (selectedParentFolder?.includes('/')) { alert("Unterordner von Unterordnern sind nicht erlaubt."); return; }
    const path = selectedParentFolder ? `${selectedParentFolder}/${newSubfolderName.trim()}` : newSubfolderName.trim();
    if (allFolders.includes(path)) { alert("Dieser Ordner existiert bereits"); return; }
    saveCustomFolders([...customFolders, path]);
    setShowSubfolderDialog(false); setNewSubfolderName(""); setSelectedParentFolder("");
  };

  const handleCreateMainFolder = () => {
    if (!newMainFolderName.trim() || allFolders.includes(newMainFolderName.trim())) { alert("Ordner existiert bereits oder Name fehlt"); return; }
    saveCustomFolders([...customFolders, newMainFolderName.trim()]);
    setShowNewMainFolderDialog(false); setNewMainFolderName("");
  };

  const handleRenameMainFolder = async (oldFolder, newName) => {
    if (!newName.trim() || newName.trim() === oldFolder) { setEditingMainFolder(null); return; }
    const newFolder = newName.trim();
    const docsToUpdate = documents.filter((d) => d.folder === oldFolder || d.folder.startsWith(oldFolder + '/'));
    for (const d of docsToUpdate) await ProjectDocument.update(d.id, { folder: d.folder === oldFolder ? newFolder : newFolder + d.folder.substring(oldFolder.length) });
    saveCustomFolders(customFolders.map((f) => f === oldFolder ? newFolder : f.startsWith(oldFolder + '/') ? newFolder + f.substring(oldFolder.length) : f));
    setEditingMainFolder(null); await loadDocuments();
  };

  const handleRenameSubfolder = async (oldFolder, newName) => {
    if (!newName.trim() || newName.trim() === getFolderName(oldFolder)) { setEditingSubfolder(null); return; }
    const parent = getParentFolder(oldFolder);
    const newFolder = parent ? `${parent}/${newName.trim()}` : newName.trim();
    const docsToUpdate = documents.filter((d) => d.folder === oldFolder || d.folder.startsWith(oldFolder + '/'));
    for (const d of docsToUpdate) await ProjectDocument.update(d.id, { folder: d.folder === oldFolder ? newFolder : newFolder + d.folder.substring(oldFolder.length) });
    saveCustomFolders(customFolders.map((f) => f === oldFolder ? newFolder : f.startsWith(oldFolder + '/') ? newFolder + f.substring(oldFolder.length) : f));
    setEditingSubfolder(null); await loadDocuments();
  };

  const handleDeleteSubfolder = async (folder) => {
    const docsInFolder = documents.filter((d) => d.folder === folder || d.folder.startsWith(folder + '/'));
    for (const d of docsInFolder) await ProjectDocument.delete(d.id);
    saveCustomFolders(customFolders.filter((f) => f !== folder && !f.startsWith(folder + '/')));
    setShowDeleteSubfolderDialog(false); setFolderToDelete(null); await loadDocuments();
  };

  const handleMoveDocument = async () => {
    if (!movingDoc || !moveTargetFolder) return;
    await ProjectDocument.update(movingDoc.id, { folder: moveTargetFolder });
    setMovingDoc(null); setMoveTargetFolder(""); await loadDocuments();
  };

  const handleBulkMove = async () => {
    if (!bulkMoveFolder || !selectedDocIds.size) return;
    await Promise.all([...selectedDocIds].map((id) => ProjectDocument.update(id, { folder: bulkMoveFolder })));
    setSelectedDocIds(new Set()); setShowBulkMoveDialog(false); setBulkMoveFolder(""); await loadDocuments();
  };

  const handleDownloadFolderAsZip = async (folder, e) => {
    e.stopPropagation();
    const folderDocs = documents.filter((d) => d.folder === folder || d.folder.startsWith(folder + '/'));
    if (!folderDocs.length) return;
    setZippingFolder(folder);
    try {
      const zip = new JSZip();
      await Promise.all(folderDocs.map(async (doc) => {
        try {
          const blob = await (await fetch(doc.file_url)).blob();
          const relativePath = doc.folder === folder ? doc.file_name : doc.folder.substring(folder.length + 1) + '/' + doc.file_name;
          zip.file(relativePath, blob);
        } catch (e) { console.error(e); }
      }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a'); a.href = url; a.download = `${getFolderName(folder)}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    setZippingFolder(null);
  };

  const toggleFolder = (folder) => {
    if (isFolderProtected(folder) && !isFolderUnlocked(folder)) { setPasswordDialog({ folder, input: "", error: "" }); return; }
    setExpandedFolders((prev) => { const s = new Set(prev); s.has(folder) ? s.delete(folder) : s.add(folder); return s; });
  };

  const handlePasswordSubmit = () => {
    const { folder, input } = passwordDialog;
    if (input === PROTECTED_FOLDERS[folder]) {
      setUnlockedFolders((prev) => new Set([...prev, folder]));
      setPasswordDialog(null);
      setExpandedFolders((prev) => new Set([...prev, folder]));
    } else { setPasswordDialog((prev) => ({ ...prev, error: "Falsches Passwort" })); }
  };

  const lockFolder = (folder, e) => {
    e.stopPropagation();
    setUnlockedFolders((prev) => { const s = new Set(prev); s.delete(folder); return s; });
    setExpandedFolders((prev) => { const s = new Set(prev); s.delete(folder); return s; });
  };

  const toggleDocSelection = (id) => setSelectedDocIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSelectAll = (docs) => {
    const ids = docs.map((d) => d.id);
    const allSel = ids.every((id) => selectedDocIds.has(id));
    setSelectedDocIds((prev) => { const s = new Set(prev); ids.forEach((id) => allSel ? s.delete(id) : s.add(id)); return s; });
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalImages = documents.filter((d) => isImage(d.file_type)).length;
  const totalFiles = documents.filter((d) => !isImage(d.file_type)).length;

  // ── Render folder content ─────────────────────────────────────────────────
  const renderFolderContent = (folder, docs, subfolders) => {
    const sorted = getSortedDocs(docs, folder);
    const selCount = sorted.filter((d) => selectedDocIds.has(d.id)).length;
    const images = sorted.filter((d) => isImage(d.file_type));
    const files = sorted.filter((d) => !isImage(d.file_type));

    const commonItemProps = {
      readOnly, editingFileName, newFileName, setNewFileName,
      onStartEdit: (doc) => { setEditingFileName(doc.id); setNewFileName(doc.file_name); },
      onCancelEdit: () => { setEditingFileName(null); setNewFileName(""); },
      onSaveEdit: saveFileName,
      onPreview: setPreviewDoc,
      onMove: (doc) => { setMovingDoc(doc); setMoveTargetFolder(doc.folder); },
      onDelete: handleDeleteDocument,
      loadingId: loadingDocId
    };

    return (
      <>
        {/* Selection bar */}
        {sorted.length > 0 && !readOnly && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            <Checkbox checked={selCount === sorted.length && sorted.length > 0} onCheckedChange={() => toggleSelectAll(sorted)} id={`sel-${folder}`} />
            <label htmlFor={`sel-${folder}`} className="text-gray-500 cursor-pointer select-none">Alle auswählen</label>
            {selCount > 0 && (
              <Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={() => { setBulkMoveFolder(""); setShowBulkMoveDialog(true); }}>
                <MoveRight className="w-3 h-3 mr-1" />{selCount} verschieben
              </Button>
            )}
          </div>
        )}

        {sorted.length === 0 && subfolders.length === 0 && (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Leer – Dateien hochladen oder hierher ziehen</p>
          </div>
        )}

        {/* Images grid */}
        {images.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Bilder ({images.length})</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {images.map((doc) => (
                <DocImageItem key={doc.id} doc={doc} isSelected={selectedDocIds.has(doc.id)} onToggleSelect={toggleDocSelection} {...commonItemProps} />
              ))}
            </div>
          </div>
        )}

        {/* Files list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {images.length > 0 && <p className="text-xs font-medium text-gray-400 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Dateien ({files.length})</p>}
            {files.map((doc) => (
              <DocFileItem key={doc.id} doc={doc} isSelected={selectedDocIds.has(doc.id)} onToggleSelect={toggleDocSelection}
                billedFolder={BILLED_FOLDER}
                onBill={(doc) => { setBillingDoc(doc); setBillingSmNumber(""); }}
                onUnBill={(doc) => setUnBillingDoc(doc)}
                {...commonItemProps} />
            ))}
          </div>
        )}

        {/* Subfolders */}
        {subfolders.length > 0 && (
          <div className={`${docs.length > 0 ? 'mt-4 border-t pt-4' : ''} space-y-2`}>
            {subfolders.map((sub) => {
              const subDocs = groupedDocuments[sub] || [];
              const isSubExp = expandedFolders.has(sub);
              const sortedSub = getSortedDocs(subDocs, sub);
              const subImages = sortedSub.filter((d) => isImage(d.file_type));
              const subFiles = sortedSub.filter((d) => !isImage(d.file_type));

              return (
                <div key={sub} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button onClick={() => { setExpandedFolders((prev) => { const s = new Set(prev); s.has(sub) ? s.delete(sub) : s.add(sub); return s; }); }}
                        className="hover:bg-gray-200 rounded p-1 transition-colors flex-shrink-0">
                        {isSubExp ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                      </button>
                      <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      {editingSubfolder === sub ? (
                        <input type="text" value={editingSubfolderName} className="text-sm font-medium border rounded px-2 py-0.5 flex-1 min-w-0"
                          autoFocus onChange={(e) => setEditingSubfolderName(e.target.value)}
                          onBlur={() => handleRenameSubfolder(sub, editingSubfolderName)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubfolder(sub, editingSubfolderName); if (e.key === 'Escape') setEditingSubfolder(null); }} />
                      ) : (
                        <span className="text-sm font-medium truncate flex-1">{getFolderName(sub)}</span>
                      )}
                      <Badge variant="outline" className="text-xs flex-shrink-0">{subDocs.length}</Badge>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1 pl-7">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingSubfolder(sub); setEditingSubfolderName(getFolderName(sub)); }} title="Umbenennen"><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => { setFolderToDelete(sub); setShowDeleteSubfolderDialog(true); }} title="Löschen"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>

                  {isSubExp && (
                    <div className="mt-3 pl-2 space-y-2">
                      {sortedSub.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Keine Dateien</p>
                      ) : (
                        <>
                          {subImages.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-2">
                              {subImages.map((doc) => <DocImageItem key={doc.id} doc={doc} isSelected={selectedDocIds.has(doc.id)} onToggleSelect={toggleDocSelection} {...commonItemProps} />)}
                            </div>
                          )}
                          {subFiles.map((doc) => (
                            <DocFileItem key={doc.id} doc={doc} isSelected={selectedDocIds.has(doc.id)} onToggleSelect={toggleDocSelection}
                              billedFolder={BILLED_FOLDER}
                              onBill={(doc) => { setBillingDoc(doc); setBillingSmNumber(""); }}
                              onUnBill={(doc) => setUnBillingDoc(doc)}
                              {...commonItemProps} />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Stats chips */}
          <span className="text-xs text-gray-400 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{totalFiles} Dateien</span>
          <span className="text-xs text-gray-400 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />{totalImages} Bilder</span>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowUploadForm(!showUploadForm)}>
              <Upload className="w-4 h-4 mr-1.5" />Hochladen
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setNewMainFolderName(""); setShowNewMainFolderDialog(true); }}>
              <Plus className="w-4 h-4 mr-1.5" />Neuer Ordner
            </Button>
          </div>
        )}
      </div>

      {/* Search + Type Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input type="text" placeholder="Dateien durchsuchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
          <SelectTrigger className="w-36">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="images">Nur Bilder</SelectItem>
            <SelectItem value="files">Nur Dateien</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upload Progress */}
      {!readOnly && uploading && (
        <Card className="border-orange-300 bg-orange-50">
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-800 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-orange-500" />Upload läuft...</span>
              <span className="font-bold text-orange-600">{uploadProgress.current}/{uploadProgress.total}</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%` }} />
            </div>
          </div>
        </Card>
      )}

      {/* Upload Form */}
      {!readOnly && (
        <AnimatePresence>
          {showUploadForm && (
            <DocUploadForm
              uploadForm={uploadForm} setUploadForm={setUploadForm}
              handleFileUpload={handleFileUpload} uploading={uploading}
              onClose={() => setShowUploadForm(false)}
              folderOptions={folderOptions} allFolders={allFolders}
              getFolderDepth={getFolderDepth} getFolderName={getFolderName}
              onCreateSubfolder={(parentFolder) => { setSelectedParentFolder(parentFolder); setShowSubfolderDialog(true); }}
            />
          )}
        </AnimatePresence>
      )}

      {/* Search results info */}
      {searchQuery && (
        <p className="text-sm text-gray-500">{filteredDocuments.length} Ergebnis(se) für „{searchQuery}"</p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mr-3" /> Laden...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allFolders.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <h3 className="text-base font-semibold text-gray-500 mb-1">Noch keine Dokumente</h3>
          <p className="text-sm text-gray-400 mb-4">Laden Sie Ihre erste Datei hoch, um zu beginnen.</p>
          {!readOnly && <Button size="sm" onClick={() => setShowUploadForm(true)}><Upload className="w-4 h-4 mr-2" />Jetzt hochladen</Button>}
        </div>
      )}

      {/* Folder list */}
      {!isLoading && (
        <div className="space-y-3">
          {getTopLevelFolders().map((folder) => {
            const docs = groupedDocuments[folder] || [];
            const isExp = expandedFolders.has(folder);
            const subs = getDirectSubfolders(folder);
            const totalInFolder = docs.length + subs.reduce((sum, sub) => sum + (groupedDocuments[sub]?.length || 0), 0);

            return (
              <Card key={folder}
                className={`border transition-all ${dragActive && dragTargetFolder === folder ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}
                onDrop={(e) => handleDrop(e, folder)}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); setDragTargetFolder(folder); }}
                onDragLeave={() => { setDragActive(false); setDragTargetFolder(null); }}>

                <div className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-xl" onClick={() => toggleFolder(folder)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button className="hover:bg-gray-100 rounded p-0.5 flex-shrink-0">
                        {isExp ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      </button>
                      {isFolderProtected(folder)
                        ? isFolderUnlocked(folder) ? <Unlock className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                        : <FolderOpen className="w-4 h-4 text-orange-500 flex-shrink-0" />}

                      {editingMainFolder === folder ? (
                        <input type="text" value={editingMainFolderName} className="text-sm font-semibold border rounded px-2 py-0.5 flex-1"
                          autoFocus onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingMainFolderName(e.target.value)}
                          onBlur={() => handleRenameMainFolder(folder, editingMainFolderName)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingMainFolder(null); }} />
                      ) : (
                        <span className="font-semibold text-sm truncate">{getFolderName(folder)}</span>
                      )}
                      <Badge variant="outline" className="text-xs flex-shrink-0">{totalInFolder}</Badge>
                      {subs.length > 0 && <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-xs flex-shrink-0 hidden sm:inline-flex">{getSubfolderCount(folder)} Sub</Badge>}
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isFolderProtected(folder) && isFolderUnlocked(folder) && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-500 hover:text-red-500" onClick={(e) => lockFolder(folder, e)} title="Sperren"><Lock className="w-3.5 h-3.5" /></Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hidden sm:flex items-center gap-1" onClick={(e) => cycleSortFolder(folder, e)} title="Sortierung">
                        {getSortIcon(folder)}<span className="hidden sm:inline">{getSortLabel(folder)}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-400 hover:text-blue-600" disabled={zippingFolder === folder} onClick={(e) => handleDownloadFolderAsZip(folder, e)} title="Als ZIP herunterladen">
                        {zippingFolder === folder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderDown className="w-3.5 h-3.5" />}
                      </Button>
                      {!readOnly && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingMainFolder(folder); setEditingMainFolderName(getFolderName(folder)); }} title="Umbenennen"><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-auto px-2" onClick={() => { setSelectedParentFolder(folder); setShowSubfolderDialog(true); }} title="Unterordner erstellen">
                            <Plus className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline text-xs">Unterordner</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isExp && (!isFolderProtected(folder) || isFolderUnlocked(folder)) && (
                  <CardContent className="px-4 pb-4">
                    {renderFolderContent(folder, docs, subs)}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Image viewer */}
      <AnimatePresence>
        {previewDoc && isImage(previewDoc.file_type) && (
          <ImageViewer
            images={filteredDocuments.filter((d) => isImage(d.file_type))}
            currentIndex={filteredDocuments.filter((d) => isImage(d.file_type)).findIndex((d) => d.id === previewDoc.id)}
            onClose={() => setPreviewDoc(null)}
            onNavigate={(i) => setPreviewDoc(filteredDocuments.filter((d) => isImage(d.file_type))[i])} />
        )}
      </AnimatePresence>

      {/* Preview modal (non-image) */}
      <AnimatePresence>
        {previewDoc && !isImage(previewDoc.file_type) && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={() => setPreviewDoc(null)}>
            <div className="relative max-w-5xl max-h-[90vh] w-full bg-white rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{previewDoc.file_name}</h3>
                  <p className="text-sm text-gray-500">{previewDoc.folder}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={previewDoc.file_url} download={previewDoc.file_name}><Button variant="outline" size="sm"><FolderDown className="w-4 h-4 mr-2" />Download</Button></a>
                  <Button onClick={() => setPreviewDoc(null)} variant="outline" size="icon"><X className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="pt-20 pb-4 px-4 max-h-[90vh] overflow-auto">
                {previewDoc.file_type?.includes('pdf') || previewDoc.file_name?.toLowerCase().endsWith('.pdf')
                  ? (
                    <div className="w-full h-[75vh]">
                      <embed
                        src={previewDoc.file_url + '#toolbar=1&navpanes=1'}
                        type="application/pdf"
                        className="w-full h-full rounded-lg border"
                      />
                      <p className="text-xs text-center text-gray-400 mt-2">
                        PDF wird nicht angezeigt?{' '}
                        <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Im Browser öffnen</a>
                      </p>
                    </div>
                  ) : previewDoc.file_name?.match(/\.(docx?|xlsx?|pptx?)$/i)
                  ? (
                    <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.file_url)}&embedded=true`} className="w-full h-[70vh] border-0" title={previewDoc.file_name} />
                  )
                  : (
                    <div className="text-center py-16">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                      <p className="text-gray-500 mb-4">Vorschau nicht verfügbar</p>
                      <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer"><Button>In neuem Tab öffnen</Button></a>
                    </div>
                  )}
                {previewDoc.description && <div className="mt-4 p-4 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-600 mb-1">Beschreibung:</p><p className="text-sm text-gray-700">{previewDoc.description}</p></div>}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* All Dialogs */}
      <SubfolderDialog show={showSubfolderDialog} onClose={() => { setShowSubfolderDialog(false); setNewSubfolderName(""); setSelectedParentFolder(""); }}
        selectedParentFolder={selectedParentFolder} newSubfolderName={newSubfolderName} setNewSubfolderName={setNewSubfolderName} onCreate={handleCreateSubfolder} />

      <NewMainFolderDialog show={showNewMainFolderDialog} onClose={() => { setShowNewMainFolderDialog(false); setNewMainFolderName(""); }}
        newMainFolderName={newMainFolderName} setNewMainFolderName={setNewMainFolderName} onCreate={handleCreateMainFolder} />

      <MoveDocDialog movingDoc={movingDoc} allFolders={allFolders} moveTargetFolder={moveTargetFolder} setMoveTargetFolder={setMoveTargetFolder}
        onClose={() => setMovingDoc(null)} onMove={handleMoveDocument} getFolderDepth={getFolderDepth} getFolderName={getFolderName} />

      <BulkMoveDialog show={showBulkMoveDialog} onClose={() => setShowBulkMoveDialog(false)} selectedCount={selectedDocIds.size}
        allFolders={allFolders} bulkMoveFolder={bulkMoveFolder} setBulkMoveFolder={setBulkMoveFolder}
        onMove={handleBulkMove} getFolderDepth={getFolderDepth} getFolderName={getFolderName} />

      <DeleteFolderDialog show={showDeleteSubfolderDialog} onClose={() => { setShowDeleteSubfolderDialog(false); setFolderToDelete(null); }}
        folderToDelete={folderToDelete} getFolderName={getFolderName} onDelete={handleDeleteSubfolder} />

      <BillingDialog billingDoc={billingDoc} billingSmNumber={billingSmNumber} setBillingSmNumber={setBillingSmNumber}
        onClose={() => setBillingDoc(null)}
        onConfirm={() => { ProjectDocument.update(billingDoc.id, { is_billed: true, billed_sm_number: billingSmNumber.trim() }).then(loadDocuments); setBillingDoc(null); }} />

      <UnBillingDialog unBillingDoc={unBillingDoc} onClose={() => setUnBillingDoc(null)}
        onConfirm={() => { ProjectDocument.update(unBillingDoc.id, { is_billed: false, billed_sm_number: null }).then(loadDocuments); setUnBillingDoc(null); }} />

      <PasswordDialog passwordDialog={passwordDialog} setPasswordDialog={setPasswordDialog} onSubmit={handlePasswordSubmit} onClose={() => setPasswordDialog(null)} />
    </div>
  );
}
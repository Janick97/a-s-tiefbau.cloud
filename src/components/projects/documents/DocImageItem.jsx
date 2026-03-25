import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Download, Trash2, Edit, FolderInput, Check, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DocImageItem({
  doc, readOnly, isSelected, onToggleSelect,
  editingFileName, newFileName, onStartEdit, onCancelEdit, onSaveEdit, setNewFileName,
  onPreview, onMove, onDelete, loadingId
}) {
  return (
    <motion.div
      key={doc.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
        isSelected ? 'border-blue-500' : 'border-gray-200 hover:border-orange-400'
      }`}
    >
      {/* Checkbox top-right */}
      {!readOnly && (
        <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(doc.id)} className="bg-white/90 border-gray-400" />
        </div>
      )}
      {/* Date top-left */}
      <div className="absolute top-1 left-1 z-10">
        <span className="text-[9px] bg-black/50 text-white rounded px-1 py-0.5 leading-none">
          {doc.created_date ? new Date(doc.created_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
        </span>
      </div>

      <img src={doc.file_url} alt={doc.file_name} className="w-full aspect-square object-cover cursor-pointer" onClick={() => onPreview(doc)} />

      {/* Filename bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
        {editingFileName === doc.id ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)}
              className="h-5 text-[10px] px-1 py-0 bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(doc.id); if (e.key === 'Escape') onCancelEdit(); }} autoFocus />
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onSaveEdit(doc.id); }} className="h-5 w-5 p-0 flex-shrink-0"><Check className="w-2.5 h-2.5" /></Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} className="h-5 w-5 p-0 flex-shrink-0"><X className="w-2.5 h-2.5" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); onStartEdit(doc); }}>
            <p className="text-[10px] text-white truncate flex-1 leading-tight">{doc.file_name}</p>
            <Edit className="w-2.5 h-2.5 text-white/70 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-start p-1 gap-1 pb-7 pt-6">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white/90 hover:bg-white" onClick={() => onPreview(doc)} title="Vorschau"><Eye className="w-3 h-3" /></Button>
        <a href={doc.file_url} download={doc.file_name}>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white/90 hover:bg-white" title="Herunterladen"><Download className="w-3 h-3" /></Button>
        </a>
        {!readOnly && (
          <>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-blue-50 hover:bg-blue-100 text-blue-600" onClick={(e) => { e.stopPropagation(); onMove(doc); }} title="Verschieben"><FolderInput className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-red-100 hover:bg-red-200 text-red-600" onClick={() => onDelete(doc.id)} title="Löschen" disabled={loadingId === doc.id}>
              {loadingId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
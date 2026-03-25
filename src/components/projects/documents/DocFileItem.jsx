import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Download, Trash2, Edit, FolderInput, Check, X, CheckSquare, Square, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

async function downloadFile(url, fileName) {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function DocFileItem({
  doc, readOnly, isSelected, onToggleSelect,
  editingFileName, newFileName, onStartEdit, onCancelEdit, onSaveEdit, setNewFileName,
  onPreview, onMove, onDelete,
  billedFolder, onBill, onUnBill,
  loadingId
}) {
  const isBilledFolder = doc.folder === billedFolder;

  return (
    <motion.div
      key={doc.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200'
      } ${doc.is_billed ? 'border-green-200 bg-green-50' : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {!readOnly && (
          <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(doc.id)} className="flex-shrink-0" />
        )}
        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {editingFileName === doc.id ? (
            <div className="flex items-center gap-2">
              <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} className="flex-1 h-7 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(doc.id); if (e.key === 'Escape') onCancelEdit(); }} autoFocus />
              <Button size="sm" className="h-7 w-7 p-0" onClick={() => onSaveEdit(doc.id)}><Check className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onCancelEdit}><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <>
              <p className="font-medium text-gray-900 truncate text-sm">{doc.file_name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-400">
                  {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ''} · {doc.uploaded_by || doc.created_by}
                </p>
                {doc.is_billed && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1 py-0 h-4">{doc.billed_sm_number || 'Abgerechnet'}</Badge>}
              </div>
              {doc.description && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}
            </>
          )}
        </div>
      </div>

      {editingFileName !== doc.id && (
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
          {isBilledFolder && (
            <button onClick={() => doc.is_billed ? onUnBill(doc) : onBill(doc)}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors flex-shrink-0 ${
                doc.is_billed ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {doc.is_billed ? <><CheckSquare className="w-3 h-3" /> Abger.</> : <><Square className="w-3 h-3" /> Abr.</>}
            </button>
          )}
          {!readOnly && <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onStartEdit(doc)} title="Umbenennen"><Edit className="w-3.5 h-3.5" /></Button>}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Vorschau" onClick={() => onPreview(doc)}><Eye className="w-3.5 h-3.5" /></Button>
          {!readOnly && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700" onClick={() => onMove(doc)} title="Verschieben"><FolderInput className="w-3.5 h-3.5" /></Button>}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Herunterladen" onClick={() => downloadFile(doc.file_url, doc.file_name)}><Download className="w-3.5 h-3.5" /></Button>
          {!readOnly && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDelete(doc.id)} title="Löschen" disabled={loadingId === doc.id}>
              {loadingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
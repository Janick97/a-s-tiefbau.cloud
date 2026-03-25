import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FolderOpen, X } from "lucide-react";
import { motion } from "framer-motion";

export default function DocUploadForm({ uploadForm, setUploadForm, handleFileUpload, uploading, onClose, folderOptions, allFolders, getFolderDepth, getFolderName, onCreateSubfolder }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      <Card className="border-dashed border-2 border-orange-300 bg-orange-50/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800">Datei hochladen</h4>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <form onSubmit={handleFileUpload} className="space-y-4">
            {/* Drag zone */}
            <div
              className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('doc-file-input').click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-orange-400" />
              {uploadForm.files.length > 0 ? (
                <div>
                  <p className="font-semibold text-orange-700">{uploadForm.files.length} Datei(en) ausgewählt</p>
                  <p className="text-xs text-gray-500 mt-1">{uploadForm.files.map(f => f.name).join(', ')}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700">Klicken zum Auswählen</p>
                  <p className="text-xs text-gray-400 mt-1">Mehrere Dateien möglich</p>
                </div>
              )}
              <Input
                id="doc-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setUploadForm({ ...uploadForm, files: Array.from(e.target.files) })}
              />
            </div>

            <div>
              <Label>Zielordner</Label>
              <div className="flex gap-2 mt-1">
                <Select value={uploadForm.folder} onValueChange={(value) => setUploadForm({ ...uploadForm, folder: value })} className="flex-1">
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {folderOptions.map((folder) => <SelectItem key={folder} value={folder}>{folder}</SelectItem>)}
                    {allFolders.filter((f) => !folderOptions.includes(f)).map((folder) => (
                      <SelectItem key={folder} value={folder}>
                        {'  '.repeat(getFolderDepth(folder))}└─ {getFolderName(folder)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => onCreateSubfolder(uploadForm.folder)} title="Unterordner erstellen">
                  <FolderOpen className="w-4 h-4 mr-2" />Neu
                </Button>
              </div>
            </div>

            <div>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Kurze Beschreibung der Datei..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={uploading || uploadForm.files.length === 0} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Wird hochgeladen..." : `${uploadForm.files.length || 0} Datei(en) hochladen`}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Abbrechen</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
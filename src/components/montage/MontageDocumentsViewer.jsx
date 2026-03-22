import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Folder, Download, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MontageDocumentsViewer({ projectId }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await base44.entities.ProjectDocument.filter({ project_id: projectId });
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (error) {
      console.error("Fehler beim Laden der Dokumente:", error);
    }
    setIsLoading(false);
  };

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  // Gruppiere Dokumente nach Ordner
  const groupedDocuments = documents.reduce((acc, doc) => {
    const folder = doc.folder || "Sonstige";
    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(doc);
    return acc;
  }, {});

  const folders = Object.keys(groupedDocuments).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-center">Keine Dokumente vorhanden</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {folders.map((folder, idx) => (
        <motion.div
          key={folder}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Card className="border-none shadow-sm">
            <CardHeader
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleFolder(folder)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-teal-600" />
                  <CardTitle className="text-base">{folder}</CardTitle>
                  <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">
                    {groupedDocuments[folder].length}
                  </span>
                </div>
                <div className={`transform transition-transform ${expandedFolders[folder] ? 'rotate-90' : ''}`}>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </CardHeader>

            <AnimatePresence>
              {expandedFolders[folder] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="p-0 border-t">
                    <div className="space-y-2 p-4">
                      {groupedDocuments[folder].map((doc) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {doc.file_name}
                              </p>
                              {doc.description && (
                                <p className="text-xs text-gray-500 truncate">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <a
                            href={doc.file_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 ml-2"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Download className="w-4 h-4 text-teal-600" />
                            </Button>
                          </a>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
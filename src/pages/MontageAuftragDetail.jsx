import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MontageAuftrag, User } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wrench, MapPin, FileText, Upload, X, Eye, Download, Image as ImageIcon, Plus, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadFile } from "@/integrations/Core";
import MontageLeistungenManagement from "../components/projects/MontageLeistungenManagement";
import SchaedigerManagement from "../components/projects/SchaedigerManagement";
import DocumentManagement from "../components/projects/DocumentManagement";
import ProjectChat from "../components/projects/ProjectChat";
import MontageLeistungWizard from "../components/montage/MontageLeistungWizard";
import MaterialVerbrauchDialog from "../components/montage/MaterialVerbrauchDialog";
import { motion, AnimatePresence } from "framer-motion";

export default function MontageAuftragDetailPage() {
  const location = useLocation();
  const [montageAuftrag, setMontageAuftrag] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [einmassSkizzen, setEinmassSkizzen] = useState([]);
  const [isUploadingSkizze, setIsUploadingSkizze] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const montageAuftragId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [auftragData, userData] = await Promise.all([
          MontageAuftrag.get(montageAuftragId),
          User.me()
        ]);

        if (!auftragData) {
          throw new Error("Montageauftrag nicht gefunden.");
        }

        setMontageAuftrag(auftragData);
        setUser(userData);
        
        // Load existing Einmaß-Skizzen
        if (auftragData.einmass_skizzen && Array.isArray(auftragData.einmass_skizzen)) {
          setEinmassSkizzen(auftragData.einmass_skizzen);
        }
      } catch (err) {
        console.error("Fehler beim Laden:", err);
        setError(err.message || "Ein Fehler ist aufgetreten.");
      }
      setIsLoading(false);
    };

    if (montageAuftragId) {
      loadData();
    } else {
      setError("Keine Montageauftrag-ID gefunden.");
      setIsLoading(false);
    }
  }, [montageAuftragId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !montageAuftrag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{error || "Montageauftrag nicht gefunden"}</h2>
          <Link to={createPageUrl("MyMontageAuftraege")}>
            <Button>Zurück zur Übersicht</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is authorized (Monteur assigned to this Auftrag, or Admin)
  const isAuthorized = user && (
    user.role === 'admin' || 
    montageAuftrag.assigned_monteur_id === user.id ||
    (Array.isArray(montageAuftrag.assigned_monteure) && montageAuftrag.assigned_monteure.some(m => m && m.id === user.id))
  );

  // Check if user can edit (Admin or assigned monteur)
  const isAssignedMonteur = montageAuftrag.assigned_monteur_id === user?.id ||
    (Array.isArray(montageAuftrag.assigned_monteure) && montageAuftrag.assigned_monteure.some(m => m && m.id === user?.id));
  const readOnly = user?.role !== 'admin' && !isAssignedMonteur;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Zugriff verweigert</h2>
          <p className="text-gray-600 mb-6">Sie haben keine Berechtigung, diesen Montageauftrag zu sehen.</p>
          <Link to={createPageUrl("MyMontageAuftraege")}>
            <Button>Zurück zur Übersicht</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Mobile-optimierte Ansicht für Monteure
  const isMonteur = user?.position === 'Monteur';

  // Upload Einmaß-Skizze
  const handleSkizzeUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingSkizze(true);
    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      const updatedSkizzen = [...einmassSkizzen, ...uploadedUrls];
      setEinmassSkizzen(updatedSkizzen);
      
      // Save to database
      await MontageAuftrag.update(montageAuftrag.id, {
        einmass_skizzen: updatedSkizzen
      });
    } catch (error) {
      console.error("Fehler beim Hochladen der Skizze:", error);
      alert("Fehler beim Hochladen der Skizze");
    }
    setIsUploadingSkizze(false);
    e.target.value = '';
  };

  // Delete Einmaß-Skizze
  const handleDeleteSkizze = async (url) => {
    if (!window.confirm("Möchten Sie diese Skizze wirklich löschen?")) return;

    const updatedSkizzen = einmassSkizzen.filter(s => s !== url);
    setEinmassSkizzen(updatedSkizzen);

    try {
      await MontageAuftrag.update(montageAuftrag.id, {
        einmass_skizzen: updatedSkizzen
      });
    } catch (error) {
      console.error("Fehler beim Löschen der Skizze:", error);
      alert("Fehler beim Löschen der Skizze");
    }
  };

  // Update Status
  const handleStatusChange = async (newStatus) => {
    try {
      await MontageAuftrag.update(montageAuftrag.id, { status: newStatus });
      setMontageAuftrag({ ...montageAuftrag, status: newStatus });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      alert("Fehler beim Aktualisieren des Status");
    }
  };

  // Update Art
  const handleArtChange = async (newArt) => {
    try {
      await MontageAuftrag.update(montageAuftrag.id, { art: newArt });
      setMontageAuftrag({ ...montageAuftrag, art: newArt });
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Auftragsart:", error);
      alert("Fehler beim Aktualisieren der Auftragsart");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-2 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - kompakt */}
        <div className="flex items-center gap-2 mb-4">
          <Link to={createPageUrl("MyMontageAuftraege")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
              {montageAuftrag.project_number}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 truncate">{montageAuftrag.title}</p>
          </div>
          {montageAuftrag.monteur_completed && (
            <Badge className="bg-green-100 text-green-800 text-xs">Erledigt</Badge>
          )}
        </div>

        {/* Info Card - kompakt */}
        <Card className="border-none mb-3">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500">SM-Nr.</p>
                <p className="font-semibold truncate">{montageAuftrag.sm_number || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Kunde</p>
                <p className="font-semibold truncate">{montageAuftrag.client}</p>
              </div>
              {montageAuftrag.city && (
                <div className="col-span-2">
                  <p className="text-gray-500">Standort</p>
                  <p className="font-semibold text-sm flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {montageAuftrag.street && `${montageAuftrag.street}, `}{montageAuftrag.city}
                  </p>
                </div>
              )}
            </div>

            {/* Status und Art - bearbeitbar */}
            {!readOnly && (
              <div className="mt-3 pt-3 border-t space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                  <Select value={montageAuftrag.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auftrag neu">Auftrag neu</SelectItem>
                      <SelectItem value="Tiefbau ausstehend">Tiefbau ausstehend</SelectItem>
                      <SelectItem value="Bereit zur Montage">Bereit zur Montage</SelectItem>
                      <SelectItem value="Montage abgeschlossen">Montage abgeschlossen</SelectItem>
                      <SelectItem value="Rotberichtigung abgeschlossen">Rotberichtigung abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Auftragsart</Label>
                  <Select value={montageAuftrag.art || ""} onValueChange={handleArtChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Wählen Sie eine Art" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ü-Wege">Ü-Wege</SelectItem>
                      <SelectItem value="APL-Straße">APL-Straße</SelectItem>
                      <SelectItem value="Störung">Störung</SelectItem>
                      <SelectItem value="FTTH">FTTH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {montageAuftrag.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">Notizen</p>
                <p className="text-xs text-gray-700 line-clamp-3">{montageAuftrag.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Montage Leistungen */}
        <div className="mb-3">
          <MontageLeistungenManagement montageAuftragId={montageAuftrag.id} readOnly={readOnly} isMonteur={isMonteur} />
        </div>

        {/* Einmaß-Skizzen */}
        <div className="mb-3">
          <Card className="border-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                Einmaß-Skizzen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!readOnly && (
                <div className="mb-4">
                  <label className="block">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleSkizzeUpload}
                      disabled={isUploadingSkizze}
                      className="hidden"
                      id="skizze-upload"
                    />
                    <Button
                      type="button"
                      onClick={() => document.getElementById('skizze-upload').click()}
                      disabled={isUploadingSkizze}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploadingSkizze ? "Wird hochgeladen..." : "Skizze hochladen"}
                    </Button>
                  </label>
                </div>
              )}

              {einmassSkizzen.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {einmassSkizzen.map((url, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                        <img
                          src={url}
                          alt={`Einmaß-Skizze ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setPreviewImage(url)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <a
                          href={url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </a>
                        {!readOnly && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteSkizze(url)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Keine Einmaß-Skizzen vorhanden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Schädiger */}
        <div className="mt-3">
          <SchaedigerManagement montageAuftragId={montageAuftrag.id} readOnly={readOnly} />
        </div>

        {/* Anlagenkorb & Dokumente */}
        {montageAuftrag.project_id && (
          <div className="mt-3">
            <Card className="card-elevation border-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Anlagenkorb & Dokumente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentManagement 
                  projectId={montageAuftrag.project_id} 
                  project={montageAuftrag}
                  loadData={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat-Bereich */}
        {montageAuftrag.project_id && (
          <div className="h-[500px] mt-3">
            <ProjectChat projectId={montageAuftrag.project_id} />
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
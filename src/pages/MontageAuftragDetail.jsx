import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MontageAuftrag, MontagePreisItem, MontageMaterialInventory, User } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Package, MapPin, Loader2, ShieldAlert, MessageCircle, X, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MontageLeistungenManagement from "../components/projects/MontageLeistungenManagement";
import MontageLeistungWizard from "../components/montage/MontageLeistungWizard";
import MaterialVerbrauchDialog from "../components/montage/MaterialVerbrauchDialog";
import BeweissicherungDialog from "../components/montage/BeweissicherungDialog";
import BeweissicherungsAnzeige from "../components/montage/BeweissicherungsAnzeige";
import FehlerortungDialog from "../components/montage/FehlerortungDialog";
import DocumentManagement from "../components/projects/DocumentManagement";
import ProjectChat from "../components/projects/ProjectChat";
import { motion, AnimatePresence } from "framer-motion";

export default function MontageAuftragDetailPage() {
  const location = useLocation();
  const [montageAuftrag, setMontageAuftrag] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLeistungWizard, setShowLeistungWizard] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showBeweissicherungDialog, setShowBeweissicherungDialog] = useState(false);
  const [showFehlerortungDialog, setShowFehlerortungDialog] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [beweissicherungen, setBeweissicherungen] = useState([]);

  const montageAuftragId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [auftragData, userData, beweissicherungenData] = await Promise.all([
        MontageAuftrag.get(montageAuftragId),
        User.me(),
        base44.entities.Beweissicherung.filter({ montage_auftrag_id: montageAuftragId }).catch(() => [])]
        );

        if (!auftragData) {
          throw new Error("Montageauftrag nicht gefunden.");
        }

        setMontageAuftrag(auftragData);
        setUser(userData);
        setBeweissicherungen(Array.isArray(beweissicherungenData) ? beweissicherungenData : []);
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
      </div>);

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
      </div>);

  }

  const isAssignedMonteur = montageAuftrag.assigned_monteur_id === user?.id ||
  Array.isArray(montageAuftrag.assigned_monteure) && montageAuftrag.assigned_monteure.some((m) => m && m.id === user?.id);
  const readOnly = user?.role !== 'admin' && !isAssignedMonteur;
  const isMonteur = user?.position === 'Monteur';

  const handleStatusChange = async (newStatus) => {
    try {
      await MontageAuftrag.update(montageAuftrag.id, { status: newStatus });
      setMontageAuftrag({ ...montageAuftrag, status: newStatus });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      alert("Fehler beim Aktualisieren des Status");
    }
  };

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
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Link to={createPageUrl("MyMontageAuftraege")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            

            
            <p className="text-gray-600 text-sm md:text-sm truncate">{montageAuftrag.title}</p>
          </div>
          {montageAuftrag.monteur_completed &&
          <Badge className="bg-green-100 text-green-800 text-xs">Erledigt</Badge>
          }
        </div>

        {/* Kerninformationen entfernt */}
        <Card className="border-none">
          








          
        </Card>

        {/* Action Buttons - Drei große Buttons für Monteur (nur Mobile) */}
        {isMonteur && !readOnly &&
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
            onClick={() => setShowLeistungWizard(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white h-12 text-base font-semibold">
              <Plus className="w-5 h-5 mr-2" />
              Leistung erfassen
            </Button>
            <Button
            onClick={() => setShowMaterialDialog(true)}
            className="bg-purple-700 hover:bg-purple-800 text-white h-12 text-base font-semibold">
              <Package className="w-5 h-5 mr-2" />
              Material hinzufügen
            </Button>
            <Button
            onClick={() => setShowBeweissicherungDialog(true)}
            className="bg-red-700 hover:bg-red-800 text-white h-12 text-base font-semibold">
              <ShieldAlert className="w-5 h-5 mr-2" />
              Beweissicherung
            </Button>
            <Button
            onClick={() => setShowFehlerortungDialog(true)}
            className="bg-amber-700 hover:bg-amber-800 text-white h-12 text-base font-semibold">
              <MapPin className="w-5 h-5 mr-2" />
              Fehlerortung
            </Button>
            <Button
            onClick={() => setShowDocuments(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white h-12 text-base font-semibold">
              <FileText className="w-5 h-5 mr-2" />
              Dokumente
            </Button>
            <Button
            onClick={() => setShowChat(true)}
            className="bg-slate-700 hover:bg-slate-800 text-white h-12 text-base font-semibold">
              <MessageCircle className="w-5 h-5 mr-2" />
              Chat
            </Button>
          </div>
        }

        {/* Übersicht der Leistungen */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">Erfasste Leistungen & Material</h2>
          <MontageLeistungenManagement montageAuftragId={montageAuftrag.id} readOnly={readOnly} isMonteur={isMonteur} hidePrices={isMonteur} beweissicherungen={beweissicherungen} onReloadBeweissicherungen={async () => {const data = await base44.entities.Beweissicherung.filter({ montage_auftrag_id: montageAuftragId }).catch(() => []);setBeweissicherungen(Array.isArray(data) ? data : []);}} />
        </div>
        </div>

      {/* Leistung Wizard */}
      <AnimatePresence>
        {showLeistungWizard &&
        <MontageLeistungWizard
          montageAuftragId={montageAuftrag.id}
          availableMonteure={Array.isArray(montageAuftrag.assigned_monteure) ? montageAuftrag.assigned_monteure.filter((m) => m.id !== user?.id) : []}
          onComplete={() => {
            setShowLeistungWizard(false);
            setShowMaterialDialog(true);
          }}
          onCancel={() => setShowLeistungWizard(false)} />

        }
      </AnimatePresence>

      {/* Material Dialog */}
      <AnimatePresence>
        {showMaterialDialog &&
        <MaterialVerbrauchDialog
          montageAuftragId={montageAuftrag.id}
          onClose={() => setShowMaterialDialog(false)}
          onSave={() => setShowMaterialDialog(false)} />
        }
      </AnimatePresence>

      {/* Fehlerortung Dialog */}
      <AnimatePresence>
        {showFehlerortungDialog &&
        <FehlerortungDialog
          montageAuftrag={montageAuftrag}
          user={user}
          onClose={() => setShowFehlerortungDialog(false)}
          onReload={async () => {
            const updated = await MontageAuftrag.get(montageAuftragId);
            setMontageAuftrag(updated);
          }}
          onOpenLeistungWizard={() => setShowLeistungWizard(true)} />

        }
      </AnimatePresence>

      {/* Beweissicherung Dialog */}
      <AnimatePresence>
        {showBeweissicherungDialog &&
        <BeweissicherungDialog
          montageAuftragId={montageAuftrag.id}
          onClose={() => setShowBeweissicherungDialog(false)}
          onSave={async () => {
            setShowBeweissicherungDialog(false);
            const data = await base44.entities.Beweissicherung.filter({ montage_auftrag_id: montageAuftragId }).catch(() => []);
            setBeweissicherungen(Array.isArray(data) ? data : []);
          }} />
        }
      </AnimatePresence>

      {/* Documents Modal */}
      <AnimatePresence>
        {showDocuments &&
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white w-full h-full flex flex-col">
            
            <div className="bg-gray-50 px-4 py-1 flex items-center justify-between border-b">
              <h3 className="font-bold text-gray-900 text-lg">Projektdokumente</h3>
              <button onClick={() => setShowDocuments(false)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentManagement projectId={montageAuftrag.project_id || montageAuftrag.id} project={{ id: montageAuftrag.project_id || montageAuftrag.id }} loadData={() => {}} readOnly={user?.position === 'Monteur'} />
            </div>
          </motion.div>
        </div>
        }
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat &&
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white w-full h-full flex flex-col">
            
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-500 to-cyan-500">
              <h3 className="font-bold text-white text-lg">Projekt-Chat</h3>
              <button onClick={() => setShowChat(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ProjectChat projectId={montageAuftrag.id} />
            </div>
          </motion.div>
        </div>
        }
      </AnimatePresence>
    </div>);

}
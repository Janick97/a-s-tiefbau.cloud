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
import { ArrowLeft, Plus, Package, MapPin, Loader2, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MontageLeistungenManagement from "../components/projects/MontageLeistungenManagement";
import MontageLeistungWizard from "../components/montage/MontageLeistungWizard";
import MaterialVerbrauchDialog from "../components/montage/MaterialVerbrauchDialog";
import BeweissicherungDialog from "../components/montage/BeweissicherungDialog";
import BeweissicherungsAnzeige from "../components/montage/BeweissicherungsAnzeige";
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
          base44.entities.Beweissicherung.filter({ montage_auftrag_id: montageAuftragId }).catch(() => [])
        ]);

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
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
              {montageAuftrag.sm_number}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 truncate">{montageAuftrag.title}</p>
          </div>
          {montageAuftrag.monteur_completed &&
          <Badge className="bg-green-100 text-green-800 text-xs">Erledigt</Badge>
          }
        </div>

        {/* Kerninformationen entfernt */}
        <Card className="border-none">
          








          
        </Card>

        {/* Action Buttons - Drei große Buttons für Monteur */}
        {isMonteur && !readOnly &&
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
            onClick={() => setShowLeistungWizard(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white h-12 text-base font-semibold">
              <Plus className="w-5 h-5 mr-2" />
              Leistung erfassen
            </Button>
            <Button
            onClick={() => setShowMaterialDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white h-12 text-base font-semibold">
              <Package className="w-5 h-5 mr-2" />
              Material hinzufügen
            </Button>
            <Button
            onClick={() => setShowBeweissicherungDialog(true)}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white h-12 text-base font-semibold">
              <ShieldAlert className="w-5 h-5 mr-2" />
              Beweissicherung
            </Button>
          </div>
        }

        {/* Übersicht der Leistungen */}
         <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">Erfasste Leistungen & Material</h2>
          <MontageLeistungenManagement montageAuftragId={montageAuftrag.id} readOnly={readOnly} isMonteur={isMonteur} />
        </div>

        {/* Chat */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">Nachrichten</h2>
          <ProjectChat projectId={montageAuftrag.id} />
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

      {/* Beweissicherung Dialog */}
      <AnimatePresence>
        {showBeweissicherungDialog &&
        <BeweissicherungDialog
          montageAuftragId={montageAuftrag.id}
          onClose={() => setShowBeweissicherungDialog(false)}
          onSave={() => setShowBeweissicherungDialog(false)} />
        }
      </AnimatePresence>
    </div>);

}
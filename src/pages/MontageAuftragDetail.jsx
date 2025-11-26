import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MontageAuftrag, User } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wrench, MapPin, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MontageLeistungenManagement from "../components/projects/MontageLeistungenManagement";
import SchaedigerManagement from "../components/projects/SchaedigerManagement";
import DocumentManagement from "../components/projects/DocumentManagement";

export default function MontageAuftragDetailPage() {
  const location = useLocation();
  const [montageAuftrag, setMontageAuftrag] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
      </div>
    </div>
  );
}
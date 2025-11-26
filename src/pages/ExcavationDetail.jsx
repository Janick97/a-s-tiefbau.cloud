
import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Excavation, Project, PriceItem } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, Printer, MapPin, Calendar, Euro, User, Camera, FileText, Ruler, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  approved: "bg-purple-100 text-purple-800"
};

const statusLabels = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  completed: "Abgeschlossen",
  approved: "Genehmigt"
};

const ExcavationDetailSkeleton = () => (
  <div className="max-w-5xl mx-auto p-4 md:p-8">
    <Skeleton className="h-10 w-48 mb-6" />
    <Card className="mb-6">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
    </div>
  </div>
);

export default function ExcavationDetailPage() {
  const location = useLocation();
  const [excavation, setExcavation] = useState(null);
  const [project, setProject] = useState(null);
  const [priceItem, setPriceItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const excavationId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    if (!excavationId) {
      setError("Keine Ausgrabungs-ID in der URL gefunden.");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Ausgrabung laden
        const excavationData = await Excavation.get(excavationId);
        if (!excavationData) {
          throw new Error("Ausgrabung nicht gefunden.");
        }
        setExcavation(excavationData);

        // 2. Abhängige Daten laden (nur wenn IDs vorhanden sind)
        const loadPromises = [];
        
        if (excavationData.project_id) {
          loadPromises.push(
            Project.get(excavationData.project_id).catch(() => null)
          );
        } else {
          loadPromises.push(Promise.resolve(null));
        }

        if (excavationData.price_item_id) {
          loadPromises.push(
            PriceItem.get(excavationData.price_item_id).catch(() => null)
          );
        } else {
          loadPromises.push(Promise.resolve(null));
        }

        const [projectData, priceItemData] = await Promise.all(loadPromises);

        setProject(projectData);
        setPriceItem(priceItemData);

      } catch (err) {
        console.error("Fehler beim Laden der Ausgrabungsdetails:", err);
        setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
        setExcavation(null);
      }
      setIsLoading(false);
    };

    loadData();
  }, [excavationId]);

  const handlePrint = () => window.print();

  if (isLoading) return <ExcavationDetailSkeleton />;

  if (error || !excavation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">{error || "Ausgrabung nicht gefunden"}</h2>
        <p className="text-gray-600">Die angeforderte Ausgrabung konnte nicht geladen werden.</p>
        <Link to={createPageUrl("Excavations")}>
          <Button className="mt-4">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 no-print">
          <Link to={createPageUrl("Excavations")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Bearbeiten
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Drucken / PDF
            </Button>
          </div>
        </div>

        {/* Excavation Overview Card */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="space-y-6">
            {/* Standort */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Standort</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">{excavation.location_name}</span>
                  </div>
                  <div className="text-gray-600">
                    <p>{excavation.street} {excavation.house_number}</p>
                    <p>{excavation.postal_code} {excavation.city}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="outline" className={statusColors[excavation.status]}>
                      {statusLabels[excavation.status]}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bauleiter:</span>
                    <span className="font-medium">{excavation.foreman || 'Nicht zugewiesen'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Menge:</span>
                    <span className="font-medium">{excavation.quantity || 1} {priceItem?.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preis:</span>
                    <span className="font-bold text-green-600">€{excavation.calculated_price?.toLocaleString('de-DE') || '0,00'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tiefbaubegründung */}
            {excavation.construction_justification && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Tiefbaubegründung
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{excavation.construction_justification}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Position Details */}
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Position
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {priceItem ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Positionsnummer</p>
                    <p className="text-lg font-mono">{priceItem.item_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Beschreibung</p>
                    <p className="text-lg">{priceItem.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Menge</p>
                      <p className="text-lg font-bold">{excavation.quantity || 1} {priceItem.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Einzelpreis</p>
                      <p className="text-lg font-bold">€{priceItem.price?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Gesamtpreis</p>
                    <p className="text-2xl font-bold text-green-600">
                      €{excavation.calculated_price?.toLocaleString('de-DE') || '0,00'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">Keine Positionsdaten verfügbar</p>
              )}
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Projektdaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Projektnummer</p>
                    <p className="text-lg font-mono">{project.project_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Projekttitel</p>
                    <p className="text-lg">{project.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kunde</p>
                    <p className="text-lg">{project.client}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bauleiter</p>
                    <p className="text-lg">{excavation.foreman || 'Nicht zugewiesen'}</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">Keine Projektdaten verfügbar</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Photos */}
        {(excavation.photo_before_url || excavation.photo_after_url) && (
          <Card className="card-elevation border-none mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Fotos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {excavation.photo_before_url && (
                  <div>
                    <h4 className="font-medium mb-2">Vorher</h4>
                    <img 
                      src={excavation.photo_before_url} 
                      alt="Vorher-Foto" 
                      className="w-full h-64 object-cover rounded-lg shadow-md"
                    />
                  </div>
                )}
                {excavation.photo_after_url && (
                  <div>
                    <h4 className="font-medium mb-2">Nachher</h4>
                    <img 
                      src={excavation.photo_after_url} 
                      alt="Nachher-Foto" 
                      className="w-full h-64 object-cover rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {excavation.notes && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle>Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{excavation.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

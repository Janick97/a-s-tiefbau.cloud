import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, FileText, Loader2, Shovel, Cable, Wrench, Package, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { jsPDF } from "jspdf";

export default function DailyReport() {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calOpen, setCalOpen] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const relevantUsers = useMemo(() =>
  allUsers.filter((u) => ["Bauleiter", "Oberfläche", "Monteur"].includes(u.position)),
  [allUsers]
  );

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);
  const position = selectedUser?.position;

  // Excavations – for Bauleiter (by foreman_user_id + created on date)
  const { data: bauleiterExcs = [], isLoading: excLoadingB } = useQuery({
    queryKey: ["excavations-bauleiter", selectedUserId, dateStr],
    queryFn: () => base44.entities.Excavation.filter({ foreman_user_id: selectedUserId }, "-created_date", 500),
    enabled: !!selectedUserId && (position === "Bauleiter" || !position),
  });

  // Excavations – for Oberfläche: load all, filter client-side (no $or support)
  const { data: oberflaecheExcs = [], isLoading: excLoadingO } = useQuery({
    queryKey: ["excavations-oberflaeche-all", dateStr],
    queryFn: () => base44.entities.Excavation.list("-created_date", 1000),
    enabled: !!selectedUserId && position === "Oberfläche",
  });

  // PriceItems – to distinguish Grube vs Graben
  const { data: priceItems = [] } = useQuery({
    queryKey: ["price-items"],
    queryFn: () => base44.entities.PriceItem.list(),
    enabled: !!selectedUserId
  });

  // PullingWork – for Bauleiter (Kabel auslegen)
  const { data: pullingWorks = [], isLoading: pullingLoading } = useQuery({
    queryKey: ["pulling-works-daily"],
    queryFn: () => base44.entities.PullingWork.list(),
    enabled: !!selectedUserId && position === "Bauleiter"
  });

  // MontageLeistungen – for Monteur
  const { data: montageLeistungen = [], isLoading: leistungLoading } = useQuery({
    queryKey: ["montage-leistungen-daily"],
    queryFn: () => base44.entities.MontageLeistung.list(),
    enabled: !!selectedUserId && position === "Monteur"
  });

  // MontageLeistungMaterial – for Monteur
  const { data: montageMaterials = [], isLoading: materialLoading } = useQuery({
    queryKey: ["montage-materials-daily"],
    queryFn: () => base44.entities.MontageLeistungMaterial.list(),
    enabled: !!selectedUserId && position === "Monteur"
  });

  // MontageMaterial names
  const { data: montageMaterialDefs = [] } = useQuery({
    queryKey: ["montage-material-defs"],
    queryFn: () => base44.entities.MontageMaterial.list(),
    enabled: !!selectedUserId && position === "Monteur"
  });

  // MontageAuftraege – for project names
  const { data: montageAuftraege = [] } = useQuery({
    queryKey: ["montage-auftraege"],
    queryFn: () => base44.entities.MontageAuftrag.list(),
    enabled: !!selectedUserId && position === "Monteur"
  });

  // MontagePreisItems – for Leistung descriptions
  const { data: montagePreisItems = [] } = useQuery({
    queryKey: ["montage-preis-items"],
    queryFn: () => base44.entities.MontagePreisItem.list(),
    enabled: !!selectedUserId && position === "Monteur"
  });

  const isLoading = excLoadingB || excLoadingO || pullingLoading || leistungLoading || materialLoading;

  // ---- BAULEITER DATA ----
  const bauleiterData = useMemo(() => {
    if (position !== "Bauleiter") return null;
    // Filter by date: created_date starts with dateStr
    const myExcs = bauleiterExcs.filter((e) => e.created_date?.startsWith(dateStr));
    const priceMap = Object.fromEntries(priceItems.map((p) => [p.id, p]));

    const bySurface = {};
    myExcs.forEach((exc) => {
      const surface = exc.surface_type || "Unbekannt";
      const pi = priceMap[exc.price_item_id];
      // Unit "M" = Graben (Meter): Länge steht in excavation_length, nicht quantity
      const isGraben = pi?.unit === "M" || pi?.type === "Graben";
      if (!bySurface[surface]) bySurface[surface] = { gruben: 0, graben: 0 };
      if (isGraben) bySurface[surface].graben += exc.excavation_length || exc.quantity || 0;
      else bySurface[surface].gruben += 1;
    });

    const myPulling = pullingWorks.filter((pw) =>
    pw.created_by === selectedUser?.email &&
    pw.created_date?.startsWith(dateStr)
    );
    const totalKabel = myPulling.reduce((s, pw) => s + (pw.cable_length || 0), 0);

    return { bySurface, pulling: myPulling, totalKabel, count: myExcs.length };
  }, [bauleiterExcs, pullingWorks, priceItems, selectedUserId, dateStr, position, selectedUser]);

  // ---- OBERFLÄCHE DATA ----
  const oberflaecheData = useMemo(() => {
    if (position !== "Oberfläche") return null;
    const priceMap = Object.fromEntries(priceItems.map((p) => [p.id, p]));

    const bySurface = {};
    const addEntry = (exc, dateField, userField) => {
      if (exc[userField] !== selectedUserId) return;
      if (!exc[dateField]?.startsWith(dateStr)) return;
      const surface = exc.surface_type || "Unbekannt";
      if (!bySurface[surface]) bySurface[surface] = { gruben: 0, graben: 0 };
      const pi = priceMap[exc.price_item_id];
      const isGraben = pi?.unit === "M" || pi?.type === "Graben";
      // Graben: Länge steht in excavation_length, nicht quantity
      if (isGraben) bySurface[surface].graben += exc.excavation_length || exc.quantity || 0;
      else bySurface[surface].gruben += 1;
    };

    oberflaecheExcs.forEach((exc) => {
      addEntry(exc, "backfilled_date", "backfilled_by_user_id");
      addEntry(exc, "asphalt_trag_date", "asphalt_trag_by_user_id");
      addEntry(exc, "asphalt_fein_date", "asphalt_fein_by_user_id");
      addEntry(exc, "platten_pflaster_date", "platten_pflaster_by_user_id");
      addEntry(exc, "closed_date", "closed_by_user_id");
    });

    return { bySurface };
  }, [oberflaecheExcs, priceItems, selectedUserId, dateStr, position]);

  // ---- MONTEUR DATA ----
  const monteurData = useMemo(() => {
    if (position !== "Monteur") return null;
    const myLeistungen = montageLeistungen.filter((l) =>
    l.monteur_user_id === selectedUserId && l.completion_date === dateStr
    );
    const myMaterials = montageMaterials.filter((m) =>
    m.used_by_user_id === selectedUserId && m.usage_date === dateStr
    );
    const auftragMap = Object.fromEntries(montageAuftraege.map((a) => [a.id, a]));
    const matMap = Object.fromEntries(montageMaterialDefs.map((m) => [m.id, m]));
    const preisMap = Object.fromEntries(montagePreisItems.map((p) => [p.id, p]));
    return { leistungen: myLeistungen, materials: myMaterials, auftragMap, matMap, preisMap };
  }, [montageLeistungen, montageMaterials, montageAuftraege, montageMaterialDefs, montagePreisItems, selectedUserId, dateStr, position]);

  // ---- PDF EXPORT ----
  const handlePdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const dateFormatted = format(selectedDate, "dd.MM.yyyy", { locale: de });
    let y = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Tagesbericht", 20, y);y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Mitarbeiter: ${selectedUser?.full_name || ""}`, 20, y);y += 6;
    doc.text(`Position: ${position || ""}`, 20, y);y += 6;
    doc.text(`Datum: ${dateFormatted}`, 20, y);y += 10;
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);y += 8;

    if (bauleiterData) {
      doc.setFont("helvetica", "bold");
      doc.text("Ausgrabungen", 20, y);y += 7;
      doc.setFont("helvetica", "normal");
      if (Object.keys(bauleiterData.bySurface).length === 0) {
        doc.text("Keine Ausgrabungen erfasst.", 20, y);y += 6;
      } else {
        Object.entries(bauleiterData.bySurface).forEach(([surface, vals]) => {
          doc.text(`Oberfläche: ${surface}`, 20, y);y += 5;
          doc.text(`  Gruben: ${vals.gruben} Stk`, 20, y);y += 5;
          doc.text(`  Graben: ${vals.graben} m`, 20, y);y += 7;
        });
      }
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Kabel auslegen", 20, y);y += 7;
      doc.setFont("helvetica", "normal");
      if (bauleiterData.pulling.length === 0) {
        doc.text("Keine Kabelverlegung erfasst.", 20, y);y += 6;
      } else {
        bauleiterData.pulling.forEach((pw) => {
          const text = `${pw.work_description || "–"} | ${pw.cable_type || ""} | ${pw.cable_length || 0} m`;
          doc.text(text, 20, y);y += 6;
        });
        doc.text(`Gesamt: ${bauleiterData.totalKabel} m`, 20, y);y += 6;
      }
    }

    if (oberflaecheData) {
      doc.setFont("helvetica", "bold");
      doc.text("Geschlossene Ausgrabungen", 20, y);y += 7;
      doc.setFont("helvetica", "normal");
      if (Object.keys(oberflaecheData.bySurface).length === 0) {
        doc.text("Keine Schließungen erfasst.", 20, y);y += 6;
      } else {
        Object.entries(oberflaecheData.bySurface).forEach(([surface, vals]) => {
          doc.text(`Oberfläche: ${surface}`, 20, y);y += 5;
          doc.text(`  Gruben: ${vals.gruben} Stk`, 20, y);y += 5;
          doc.text(`  Graben: ${vals.graben} m`, 20, y);y += 7;
        });
      }
    }

    if (monteurData) {
      doc.setFont("helvetica", "bold");
      doc.text("Montageleistungen", 20, y);y += 7;
      doc.setFont("helvetica", "normal");
      if (monteurData.leistungen.length === 0) {
        doc.text("Keine Leistungen erfasst.", 20, y);y += 6;
      } else {
        monteurData.leistungen.forEach((l) => {
          const preis = monteurData.preisMap[l.preis_item_id];
          const auftrag = monteurData.auftragMap[l.montage_auftrag_id];
          doc.text(`${preis?.description || "–"} | Menge: ${l.quantity}`, 20, y);y += 5;
          doc.text(`  Projekt: ${auftrag?.title || l.montage_auftrag_id}`, 20, y);y += 6;
        });
      }
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Materialverbrauch", 20, y);y += 7;
      doc.setFont("helvetica", "normal");
      if (monteurData.materials.length === 0) {
        doc.text("Kein Material erfasst.", 20, y);y += 6;
      } else {
        monteurData.materials.forEach((m) => {
          const mat = monteurData.matMap[m.material_id];
          const auftrag = monteurData.auftragMap[m.montage_auftrag_id];
          doc.text(`${mat?.name || m.material_id} | ${m.quantity_used} ${mat?.unit || ""}`, 20, y);y += 5;
          doc.text(`  Projekt: ${auftrag?.title || m.montage_auftrag_id}`, 20, y);y += 6;
        });
      }
    }

    doc.save(`Tagesbericht_${selectedUser?.full_name}_${dateStr}.pdf`);
  };

  const hasData = bauleiterData || oberflaecheData || monteurData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tagesbericht</h1>
            <p className="text-sm text-gray-500">Tagesleistungen je Mitarbeiter</p>
          </div>
          {hasData && !isLoading &&
          <Button onClick={handlePdf} className="bg-orange-500 text-primary-foreground px-4 py-2 text-sm font-medium opacity-100 rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-orange-600">
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
          }
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">Mitarbeiter</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {relevantUsers.map((u) =>
                    <SelectItem key={u.id} value={u.id}>
                        {u.full_name} <span className="text-gray-400 text-xs ml-1">({u.position})</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">Datum</Label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(selectedDate, "dd. MMMM yyyy", { locale: de })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {if (d) {setSelectedDate(d);setCalOpen(false);}}}
                      locale={de}
                      initialFocus />
                    
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {!selectedUserId &&
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <AlertCircle className="w-10 h-10 mb-2" />
            <p>Bitte einen Mitarbeiter auswählen</p>
          </div>
        }

        {selectedUserId && isLoading &&
        <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="ml-3 text-gray-600">Lade Daten...</p>
          </div>
        }

        {selectedUserId && !isLoading &&
        <div className="space-y-5">
            {/* BAULEITER */}
            {bauleiterData &&
          <>
                {/* Ausgrabungen */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shovel className="w-5 h-5 text-orange-500" /> Ausgrabungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(bauleiterData.bySurface).length === 0 ?
                <p className="text-sm text-gray-400">Keine Ausgrabungen heute erfasst.</p> :

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(bauleiterData.bySurface).map(([surface, vals]) =>
                  <div key={surface} className="bg-gray-50 rounded-lg p-3 border">
                            <p className="font-semibold text-sm text-gray-700 mb-2">{surface}</p>
                            <div className="flex gap-4 text-sm">
                              <span><strong>{vals.gruben}</strong> Gruben</span>
                              <span><strong>{vals.graben} m</strong> Graben</span>
                            </div>
                          </div>
                  )}
                      </div>
                }
                  </CardContent>
                </Card>

                {/* Kabel */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cable className="w-5 h-5 text-blue-500" /> Kabel auslegen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bauleiterData.pulling.length === 0 ?
                <p className="text-sm text-gray-400">Keine Kabelverlegung heute erfasst.</p> :

                <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">Gesamt: {bauleiterData.totalKabel} m</Badge>
                        </div>
                        {bauleiterData.pulling.map((pw) =>
                  <div key={pw.id} className="bg-gray-50 rounded-lg p-3 border text-sm">
                            <p className="font-medium">{pw.work_description || "–"}</p>
                            <p className="text-gray-500 text-xs mt-1">{pw.cable_type || ""} · {pw.cable_length || 0} m · {pw.location_name}</p>
                          </div>
                  )}
                      </div>
                }
                  </CardContent>
                </Card>
              </>
          }

            {/* OBERFLÄCHE */}
            {oberflaecheData &&
          <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shovel className="w-5 h-5 text-green-500" /> Geschlossene Ausgrabungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(oberflaecheData.bySurface).length === 0 ?
              <p className="text-sm text-gray-400">Keine Schließungen heute erfasst.</p> :

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(oberflaecheData.bySurface).map(([surface, vals]) =>
                <div key={surface} className="bg-gray-50 rounded-lg p-3 border">
                          <p className="font-semibold text-sm text-gray-700 mb-2">{surface}</p>
                          <div className="flex gap-4 text-sm">
                            <span><strong>{vals.gruben}</strong> Gruben</span>
                            <span><strong>{vals.graben} m</strong> Graben</span>
                          </div>
                        </div>
                )}
                    </div>
              }
                </CardContent>
              </Card>
          }

            {/* MONTEUR */}
            {monteurData &&
          <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wrench className="w-5 h-5 text-purple-500" /> Montageleistungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monteurData.leistungen.length === 0 ?
                <p className="text-sm text-gray-400">Keine Leistungen heute erfasst.</p> :

                <div className="space-y-2">
                        {monteurData.leistungen.map((l) => {
                    const preis = monteurData.preisMap[l.preis_item_id];
                    const auftrag = monteurData.auftragMap[l.montage_auftrag_id];
                    return (
                      <div key={l.id} className="bg-gray-50 rounded-lg p-3 border text-sm">
                              <p className="font-medium">{preis?.description || "–"}</p>
                              <p className="text-gray-500 text-xs mt-0.5">
                                Menge: <strong>{l.quantity} {preis?.unit || ""}</strong>
                                {l.location_name && ` · ${l.location_name}`}
                              </p>
                              <p className="text-gray-400 text-xs mt-0.5">Projekt: {auftrag?.title || auftrag?.sm_number || l.montage_auftrag_id}</p>
                            </div>);

                  })}
                      </div>
                }
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="w-5 h-5 text-teal-500" /> Materialverbrauch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monteurData.materials.length === 0 ?
                <p className="text-sm text-gray-400">Kein Material heute erfasst.</p> :

                <div className="space-y-2">
                        {monteurData.materials.map((m) => {
                    const mat = monteurData.matMap[m.material_id];
                    const auftrag = monteurData.auftragMap[m.montage_auftrag_id];
                    return (
                      <div key={m.id} className="bg-gray-50 rounded-lg p-3 border text-sm">
                              <p className="font-medium">{mat?.name || m.material_id}</p>
                              <p className="text-gray-500 text-xs mt-0.5">
                                Menge: <strong>{m.quantity_used} {mat?.unit || ""}</strong>
                              </p>
                              <p className="text-gray-400 text-xs mt-0.5">Projekt: {auftrag?.title || auftrag?.sm_number || m.montage_auftrag_id}</p>
                              {m.notes && <p className="text-gray-400 text-xs mt-0.5">{m.notes}</p>}
                            </div>);

                  })}
                      </div>
                }
                  </CardContent>
                </Card>
              </>
          }
          </div>
        }
      </div>
    </div>);

}
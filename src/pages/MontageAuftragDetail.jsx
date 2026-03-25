import React, { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { MontageAuftrag, User } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Package, MapPin, Loader2, ShieldAlert, MessageCircle, X, FileText, CheckCircle2, Circle, Users, Tag, Hash, AlertTriangle, ChevronDown, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import MontageLeistungenManagement from "../components/projects/MontageLeistungenManagement";
import MontageLeistungWizard from "../components/montage/MontageLeistungWizard";
import MaterialVerbrauchDialog from "../components/montage/MaterialVerbrauchDialog";
import BeweissicherungDialog from "../components/montage/BeweissicherungDialog";
import FehlerortungDialog from "../components/montage/FehlerortungDialog";
import DocumentManagement from "../components/projects/DocumentManagement";
import MontageAuftragPdfReport from "../components/montage/MontageAuftragPdfReport";
import AuditLog from "../components/montage/AuditLog";
import ProjectChat from "../components/projects/ProjectChat";
import BlowingWorkTab from "../components/projects/BlowingWorkTab";
import PullingWorkManagement from "../components/projects/PullingWorkManagement";
import { motion, AnimatePresence } from "framer-motion";

export default function MontageAuftragDetailPage() {
  const { toast } = useToast();
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
  const [tiefbauHistoryOpen, setTiefbauHistoryOpen] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

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
        if (!auftragData) throw new Error("Montageauftrag nicht gefunden.");
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

  const reloadBeweissicherungen = useCallback(async () => {
    const data = await base44.entities.Beweissicherung.filter({ montage_auftrag_id: montageAuftragId }).catch(() => []);
    setBeweissicherungen(Array.isArray(data) ? data : []);
  }, [montageAuftragId]);

  const appendAuditEntry = useCallback(async (action, from, to, note) => {
    try {
      const current = await MontageAuftrag.get(montageAuftrag.id);
      const log = Array.isArray(current?.audit_log) ? current.audit_log : [];
      const entry = { timestamp: new Date().toISOString(), user: user?.full_name || 'Unbekannt', user_id: user?.id || '', action, from: from || '', to: to || '', note: note || '' };
      await MontageAuftrag.update(montageAuftrag.id, { audit_log: [...log, entry] });
      setMontageAuftrag(prev => ({ ...prev, audit_log: [...log, entry] }));
    } catch (e) {
      console.error('Audit log failed:', e);
    }
  }, [montageAuftrag?.id, user]);

  const handleStatusChange = useCallback(async (newStatus) => {
    try {
      const oldStatus = montageAuftrag.status;
      await MontageAuftrag.update(montageAuftrag.id, { status: newStatus });
      setMontageAuftrag((prev) => ({ ...prev, status: newStatus }));
      toast({ title: "Status aktualisiert ✓" });
      appendAuditEntry('status_change', oldStatus, newStatus);
    } catch {
      toast({ title: "Fehler beim Aktualisieren des Status", variant: "destructive" });
    }
  }, [montageAuftrag?.id, montageAuftrag?.status, toast, appendAuditEntry]);

  const handleArtChange = useCallback(async (newArt) => {
    try {
      const oldArt = montageAuftrag.art || '-';
      await MontageAuftrag.update(montageAuftrag.id, { art: newArt });
      setMontageAuftrag((prev) => ({ ...prev, art: newArt }));
      toast({ title: "Auftragsart aktualisiert ✓" });
      appendAuditEntry('art_change', oldArt, newArt);
    } catch {
      toast({ title: "Fehler beim Aktualisieren der Auftragsart", variant: "destructive" });
    }
  }, [montageAuftrag?.id, montageAuftrag?.art, toast, appendAuditEntry]);

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

  const isAssignedMonteur = montageAuftrag.assigned_monteur_id === user?.id ||
    (Array.isArray(montageAuftrag.assigned_monteure) && montageAuftrag.assigned_monteure.some((m) => m && m.id === user?.id));
  const readOnly = user?.role !== 'admin' && !isAssignedMonteur;
  const isMonteur = user?.position === 'Monteur';

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
            <p className="text-gray-600 text-sm truncate">{montageAuftrag.title}</p>
          </div>
          {montageAuftrag.monteur_completed && (
            <Badge className="bg-green-100 text-green-800 text-xs">Erledigt</Badge>
          )}
        </div>

        {/* Auftragsinformationen */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* SM-Nummer & Status */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="font-mono font-semibold">{montageAuftrag.sm_number}</span>
                {montageAuftrag.project_number && <span className="text-gray-400">· {montageAuftrag.project_number}</span>}
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                montageAuftrag.status === 'Montage abgeschlossen' || montageAuftrag.status === 'Rotberichtigung abgeschlossen'
                  ? 'bg-green-100 text-green-700'
                  : montageAuftrag.status === 'Bereit zur Montage'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {montageAuftrag.status || 'Kein Status'}
              </span>
            </div>

            {/* Art & Standort & Kunde */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {montageAuftrag.art && (
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{montageAuftrag.art}</span>
              )}
              {montageAuftrag.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{montageAuftrag.city}</span>
              )}
              {montageAuftrag.client && (
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{montageAuftrag.client}</span>
              )}
            </div>

            {/* Zugewiesene Monteure */}
            {Array.isArray(montageAuftrag.assigned_monteure) && montageAuftrag.assigned_monteure.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {montageAuftrag.assigned_monteure.map((m) => m && (
                  <span key={m.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                    m.id === user?.id ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    {m.id === user?.id ? '👤 ' : ''}{m.name}
                  </span>
                ))}
              </div>
            )}

            {/* Fortschritts-Checkliste */}
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fortschritt</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Auftrag erhalten', done: true },
                  { label: 'Bereit zur Montage', done: montageAuftrag.status !== 'Tiefbau ausstehend' },
                ].map(({ label, done, warn }) => (
                  <div key={label} className="flex items-center gap-2">
                    {done ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={`text-xs ${done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>{label}</span>
                  </div>
                ))}

                {/* Tiefbau offen – separater Block mit Datum & History */}
                <div>
                  <div className="flex items-center gap-2">
                    {montageAuftrag.tiefbau_offen
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={`text-xs ${montageAuftrag.tiefbau_offen ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                      Tiefbau gemeldet (offen)
                    </span>
                    {montageAuftrag.tiefbau_offen_date && (
                      <span className="text-[10px] text-gray-400 ml-1">
                        {new Date(montageAuftrag.tiefbau_offen_date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {Array.isArray(montageAuftrag.tiefbau_offen_history) && montageAuftrag.tiefbau_offen_history.length > 0 && (
                      <button
                        onClick={() => setTiefbauHistoryOpen(o => !o)}
                        className="ml-auto flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700"
                      >
                        Historie ({montageAuftrag.tiefbau_offen_history.length})
                        <ChevronDown className={`w-3 h-3 transition-transform ${tiefbauHistoryOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {tiefbauHistoryOpen && Array.isArray(montageAuftrag.tiefbau_offen_history) && (
                    <div className="ml-6 mt-1.5 space-y-1">
                      {montageAuftrag.tiefbau_offen_history.map((entry, i) => (
                        <div key={i} className="text-[10px] bg-blue-50 border border-blue-100 rounded px-2 py-1">
                          <span className="text-gray-500">{new Date(entry.date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-blue-700 font-medium ml-1">{entry.user}</span>
                          {entry.text && <p className="text-gray-600 mt-0.5">{entry.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Montage abgeschlossen */}
                <div className="flex items-center gap-2">
                  {montageAuftrag.monteur_completed
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                  <span className={`text-xs ${montageAuftrag.monteur_completed ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                    Montage abgeschlossen
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons - nur Mobile für Monteur */}
        {isMonteur && !readOnly && (
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button onClick={() => setShowLeistungWizard(true)} className="bg-blue-700 hover:bg-blue-800 text-white h-12 text-base font-semibold">
              <Plus className="w-5 h-5 mr-2" />Leistung erfassen
            </Button>
            <Button onClick={() => setShowMaterialDialog(true)} className="bg-purple-700 hover:bg-purple-800 text-white h-12 text-base font-semibold">
              <Package className="w-5 h-5 mr-2" />Material hinzufügen
            </Button>
            <Button onClick={() => setShowBeweissicherungDialog(true)} className="bg-red-700 hover:bg-red-800 text-white h-12 text-base font-semibold">
              <ShieldAlert className="w-5 h-5 mr-2" />Beweissicherung
            </Button>
            <Button onClick={() => setShowFehlerortungDialog(true)} className="bg-amber-700 hover:bg-amber-800 text-white h-12 text-base font-semibold">
              <MapPin className="w-5 h-5 mr-2" />Fehlerortung
            </Button>
            <Button onClick={() => setShowDocuments(true)} className="bg-teal-700 hover:bg-teal-800 text-white h-12 text-base font-semibold">
              <FileText className="w-5 h-5 mr-2" />Dokumente
            </Button>
            <Button onClick={() => setShowChat(true)} className="bg-slate-700 hover:bg-slate-800 text-white h-12 text-base font-semibold">
              <MessageCircle className="w-5 h-5 mr-2" />Chat
            </Button>
          </div>
        )}

        {/* Chat, Dokumente & PDF für Admin/Büro */}
        {!isMonteur && (
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setShowDocuments(true)} variant="outline" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />Dokumente
            </Button>
            <Button onClick={() => setShowChat(true)} variant="outline" className="flex-1">
              <MessageCircle className="w-4 h-4 mr-2" />Chat
            </Button>
            <MontageAuftragPdfReport montageAuftrag={montageAuftrag} />
            <Button onClick={() => setShowAuditLog(true)} variant="outline" className="flex-1 border-slate-300">
              <Clock className="w-4 h-4 mr-2" />Änderungslog
            </Button>
          </div>
        )}

        {/* Einblas- und Einzieharbeiten - nur für Monteure */}
        {isMonteur && !readOnly && (
          <>
            <BlowingWorkTab projectId={montageAuftrag.project_id || montageAuftrag.id} user={user} project={{ id: montageAuftrag.project_id || montageAuftrag.id }} />
            <PullingWorkManagement projectId={montageAuftrag.project_id || montageAuftrag.id} />
          </>
        )}

        {/* Leistungen */}
        <div>
          <MontageLeistungenManagement
            montageAuftragId={montageAuftrag.id}
            readOnly={readOnly}
            isMonteur={isMonteur}
            hidePrices={isMonteur}
            beweissicherungen={beweissicherungen}
            onReloadBeweissicherungen={reloadBeweissicherungen}
          />
        </div>
              <div className="flex-1 overflow-hidden">
                <DocumentManagement projectId={montageAuftrag.project_id || montageAuftrag.id} project={{ id: montageAuftrag.project_id || montageAuftrag.id }} loadData={() => {}} readOnly={user?.position === 'Monteur'} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white w-full h-full flex flex-col">
              <div className="bg-slate-400 px-4 py-2 flex items-center justify-between border-b">
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
        )}
      </AnimatePresence>

      {/* Audit Log Modal */}
      <AnimatePresence>
        {showAuditLog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white w-full max-w-lg mx-4 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
              <div className="bg-slate-700 px-4 py-3 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-white">Änderungslog</h3>
                  <span className="text-slate-300 text-xs">({(montageAuftrag.audit_log || []).length} Einträge)</span>
                </div>
                <button onClick={() => setShowAuditLog(false)} className="p-1.5 rounded hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <AuditLog entries={montageAuftrag.audit_log || []} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
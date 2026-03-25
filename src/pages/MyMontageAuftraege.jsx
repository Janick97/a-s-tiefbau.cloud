import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MontageAuftrag, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Construction, Search, CheckCircle, Clock,
  AlertTriangle, Loader2, Save, RefreshCw, X } from
"lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MontageAuftragCard from "@/components/montage/MontageAuftragCard";

export default function MyMontageAuftraegePage() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [auftraege, setAuftraege] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [notesAuftrag, setNotesAuftrag] = useState(null);
  const [notesText, setNotesText] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userData, auftraegeData] = await Promise.all([
      User.me().catch(() => null),
      MontageAuftrag.list("-created_date").catch(() => [])]
      );
      setUser(userData);
      if (userData?.position === 'Monteur') {
        const mine = (Array.isArray(auftraegeData) ? auftraegeData : []).filter((a) =>
        a.assigned_monteur_id === userData.id ||
        Array.isArray(a.assigned_monteure) && a.assigned_monteure.some((m) => m?.id === userData.id) ||
        a.created_by === userData.email
        );
        setAuftraege(mine);
      } else {
        setAuftraege([]);
      }
    } catch (e) {
      console.error(e);
      setAuftraege([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {loadData();}, [loadData]);

  const filtered = useMemo(() =>
  auftraege.
  filter((a) => showCompleted ? a.monteur_completed : !a.monteur_completed).
  filter((a) => !searchTerm || [a.sm_number, a.project_number, a.title, a.client, a.city].
  some((f) => f?.toLowerCase().includes(searchTerm.toLowerCase()))),
  [auftraege, showCompleted, searchTerm]
  );

  const activeCount = useMemo(() => auftraege.filter((a) => !a.monteur_completed).length, [auftraege]);
  const doneCount = useMemo(() => auftraege.filter((a) => a.monteur_completed).length, [auftraege]);

  const confirmAuftrag = useMemo(() => auftraege.find((a) => a.id === confirmId), [auftraege, confirmId]);

  const handleComplete = useCallback(async () => {
    if (!confirmId) return;
    setCompleting(confirmId);
    setConfirmId(null);
    try {
      await MontageAuftrag.update(confirmId, {
        monteur_completed: true,
        monteur_completed_date: new Date().toISOString().split('T')[0],
        status: 'Montage fertig'
      });
      toast({ title: "Auftrag fertig gemeldet ✓", description: "Der Auftrag wurde erfolgreich abgeschlossen." });
      loadData();
    } catch (e) {
      toast({ title: "Fehler", description: "Der Auftrag konnte nicht aktualisiert werden.", variant: "destructive" });
    }
    setCompleting(null);
  }, [confirmId, loadData, toast]);

  const handleSaveNotes = useCallback(async () => {
    if (!notesAuftrag) return;
    try {
      await MontageAuftrag.update(notesAuftrag.id, { notes: notesText });
      toast({ title: "Notizen gespeichert ✓" });
      setNotesAuftrag(null);
      loadData();
    } catch (e) {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
  }, [notesAuftrag, notesText, loadData, toast]);

  const handleOpenNotes = useCallback((auftrag) => {
    setNotesAuftrag(auftrag);
    setNotesText(auftrag.notes || '');
  }, []);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>);


  if (!user || user.position !== 'Monteur') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">Nur für Monteure zugänglich</p>
      </div>
    </div>);


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Meine Aufträge</h1>
            
          </div>
          <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setShowCompleted(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            !showCompleted ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`
            }>
            
            <Clock className="w-3.5 h-3.5" />
            Aktiv ({activeCount})
          </button>
          <button
            onClick={() => setShowCompleted(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            showCompleted ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`
            }>
            
            <CheckCircle className="w-3.5 h-3.5" />
            Fertig ({doneCount})
          </button>
        </div>

        {/* Suche */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm" />
          
        </div>
      </div>

      {/* Liste */}
      <div className="p-4 space-y-2 max-w-2xl mx-auto">
        {filtered.length === 0 ?
        <div className="text-center py-16">
            <Construction className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {showCompleted ? 'Keine fertig gemeldeten Aufträge' : 'Keine aktiven Aufträge'}
            </p>
          </div> :

        <AnimatePresence>
            {filtered.map((auftrag, i) =>
          <MontageAuftragCard
            key={auftrag.id}
            auftrag={auftrag}
            index={i}
            completing={completing}
            onComplete={(id) => setConfirmId(id)}
            onOpenNotes={handleOpenNotes} />

          )}
          </AnimatePresence>
        }
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmId && confirmAuftrag &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
          onClick={(e) => {if (e.target === e.currentTarget) setConfirmId(null);}}>
          
            <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Auftrag fertig melden?</h3>
                <button onClick={() => setConfirmId(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-800">{confirmAuftrag.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{confirmAuftrag.sm_number}</p>
              </div>
              <p className="text-xs text-gray-500 mb-4">Der Auftrag wird als fertig markiert und erscheint in der Fertigliste.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setConfirmId(null)}>Abbrechen</Button>
                <Button className="flex-1 h-10 bg-green-600 hover:bg-green-700" onClick={handleComplete}>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Bestätigen
                </Button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Notes Dialog */}
      <AnimatePresence>
        {notesAuftrag &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={(e) => {if (e.target === e.currentTarget) setNotesAuftrag(null);}}>
          
            <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg">
            
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Notizen</h3>
                  <p className="text-xs text-gray-500">{notesAuftrag.sm_number} – {notesAuftrag.title}</p>
                </div>
                <button onClick={() => setNotesAuftrag(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <Textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Notizen zur Montage..."
                className="min-h-[200px] text-sm resize-none"
                autoFocus />
              
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setNotesAuftrag(null)}>Abbrechen</Button>
                <Button className="flex-1 h-10 bg-blue-600 hover:bg-blue-700" onClick={handleSaveNotes}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Speichern
                </Button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}
import React, { useState, useEffect, useCallback } from "react";
import { MontageAuftrag, User } from "@/entities/all";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Construction, MapPin, Search, CheckCircle, Clock,
  AlertTriangle, Loader2, FileText, Save, Eye, RefreshCw,
  ChevronRight, X, Building2 } from
"lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MyMontageAuftraegePage() {
  const [user, setUser] = useState(null);
  const [auftraege, setAuftraege] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [notesAuftrag, setNotesAuftrag] = useState(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {loadData();}, []);

  const loadData = async () => {
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
  };

  const filtered = auftraege.
  filter((a) => showCompleted ? a.monteur_completed : !a.monteur_completed).
  filter((a) => !searchTerm || [a.sm_number, a.project_number, a.title, a.client, a.city].
  some((f) => f?.toLowerCase().includes(searchTerm.toLowerCase())));

  const activeCount = auftraege.filter((a) => !a.monteur_completed).length;
  const doneCount = auftraege.filter((a) => a.monteur_completed).length;

  const handleComplete = async () => {
    if (!confirmId) return;
    setCompleting(confirmId);
    setConfirmId(null);
    await MontageAuftrag.update(confirmId, {
      monteur_completed: true,
      monteur_completed_date: new Date().toISOString().split('T')[0],
      status: 'Montage fertig'
    });
    setCompleting(null);
    loadData();
  };

  const handleSaveNotes = async () => {
    if (!notesAuftrag) return;
    await MontageAuftrag.update(notesAuftrag.id, { notes: notesText });
    setNotesAuftrag(null);
    loadData();
  };

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


  const confirmAuftrag = auftraege.find((a) => a.id === confirmId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Meine Aufträge</h1>
            <p className="text-xs text-gray-500">{user.full_name}</p>
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
          <motion.div
            key={auftrag.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            
                {/* Card top bar */}
                <div className={`h-1 w-full ${auftrag.monteur_completed ? 'bg-green-400' : auftrag.tiefbau_offen ? 'bg-blue-500' : 'bg-orange-400'}`} />

                <div className="p-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{auftrag.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{auftrag.sm_number}</p>
                    </div>
                    {auftrag.tiefbau_offen &&
                <span className="flex-shrink-0 inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        <Construction className="w-3 h-3" />
                        Tiefbau offen
                      </span>
                }
                  </div>

                  {/* Notiz oder Meta */}
                  {auftrag.notes ?
              <button
                className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 hover:bg-amber-100 transition-colors"
                onClick={() => {setNotesAuftrag(auftrag);setNotesText(auftrag.notes || '');}}>
                
                      <p className="text-xs text-amber-800 line-clamp-2">{auftrag.notes}</p>
                    </button> :

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                      {auftrag.client &&
                <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{auftrag.client}
                        </span>
                }
                      {auftrag.city &&
                <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{auftrag.city}
                        </span>
                }
                      {auftrag.art &&
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">{auftrag.art}</span>
                }
                    </div>
              }

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link to={createPageUrl(`MontageAuftragDetail?id=${auftrag.id}`)} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Öffnen
                      </Button>
                    </Link>

                    






                

                    {!auftrag.monteur_completed &&
                <Button
                  size="sm"
                  className="h-8 text-xs px-3 gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={() => setConfirmId(auftrag.id)}
                  disabled={completing === auftrag.id}>
                  
                        {completing === auftrag.id ?
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                  <CheckCircle className="w-3.5 h-3.5" />
                  }
                        Fertig
                      </Button>
                }
                  </div>
                </div>
              </motion.div>
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
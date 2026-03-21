import React, { useState, useEffect, useCallback } from "react";
import { MontageAuftrag, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Construction,
  MapPin,
  Calendar,
  Building,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
  Edit3,
  Save,
  Eye,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  'Tiefbau ausstehend': 'bg-orange-100 text-orange-800 border-orange-200',
  'Bereit zur Montage': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Montage abgeschlossen': 'bg-green-100 text-green-800 border-green-200',
  'Rotberichtigung abgeschlossen': 'bg-purple-100 text-purple-800 border-purple-200'
};

export default function MyMontageAuftraegePage() {
  const [user, setUser] = useState(null);
  const [auftraege, setAuftraege] = useState([]);
  const [filteredAuftraege, setFilteredAuftraege] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCompletedAuftraege, setShowCompletedAuftraege] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    auftragId: null,
    auftragTitle: null
  });
  const [completing, setCompleting] = useState(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [currentNotesAuftrag, setCurrentNotesAuftrag] = useState(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, auftraegeData] = await Promise.all([
        User.me().catch(() => null),
        MontageAuftrag.list("-created_date").catch(() => [])
      ]);

      setUser(userData);

      if (userData && userData.position === 'Monteur') {
        const userAssignedAuftraege = (Array.isArray(auftraegeData) ? auftraegeData : []).filter(auftrag => {
          // Prüfe assigned_monteur_id (alte Methode)
          const matchesMonteurId = auftrag.assigned_monteur_id === userData.id;
          
          // Prüfe assigned_monteure Array (neue Methode)
          const matchesMonteureArray = Array.isArray(auftrag.assigned_monteure) && 
                                       auftrag.assigned_monteure.some(m => m && m.id === userData.id);
          
          // Prüfe created_by (als Fallback)
          const matchesCreatedBy = auftrag.created_by === userData.email;
          
          return matchesMonteurId || matchesMonteureArray || matchesCreatedBy;
        });
        setAuftraege(userAssignedAuftraege);
      } else {
        setAuftraege([]);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Montageaufträge:", error);
      setAuftraege([]);
    }
    setIsLoading(false);
  };

  const filterAuftraege = useCallback(() => {
    let filtered = [...auftraege];

    // Filter nach monteur_completed Status
    if (showCompletedAuftraege) {
      filtered = filtered.filter(auftrag => auftrag.monteur_completed === true);
    } else {
      filtered = filtered.filter(auftrag => !auftrag.monteur_completed);
    }

    // Textsuche
    if (searchTerm) {
      filtered = filtered.filter(auftrag =>
        auftrag.sm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auftrag.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auftrag.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auftrag.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auftrag.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status-Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(auftrag => auftrag.status === statusFilter);
    }

    setFilteredAuftraege(filtered);
  }, [auftraege, searchTerm, statusFilter, showCompletedAuftraege]);

  useEffect(() => {
    filterAuftraege();
  }, [filterAuftraege]); // Depend on the memoized function

  const handleMarkAsCompleted = (auftrag) => {
    setConfirmDialog({
      show: true,
      auftragId: auftrag.id,
      auftragTitle: auftrag.title
    });
  };

  const confirmMarkAsCompleted = async () => {
    const { auftragId } = confirmDialog;
    setConfirmDialog({ show: false, auftragId: null, auftragTitle: null });
    setCompleting(auftragId);

    try {
      await MontageAuftrag.update(auftragId, {
        monteur_completed: true,
        monteur_completed_date: new Date().toISOString().split('T')[0],
        status: 'Montage fertig'
      });

      await loadData();
    } catch (error) {
      console.error("Fehler beim Markieren als fertig:", error);
    }
    setCompleting(null);
  };

  const cancelMarkAsCompleted = () => {
    setConfirmDialog({ show: false, auftragId: null, auftragTitle: null });
  };

  const handleNotesClick = (auftrag) => {
    setCurrentNotesAuftrag(auftrag);
    setNotesText(auftrag.notes || '');
    setShowNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    if (!currentNotesAuftrag) return;
    
    try {
      await MontageAuftrag.update(currentNotesAuftrag.id, {
        notes: notesText
      });
      setShowNotesDialog(false);
      setCurrentNotesAuftrag(null);
      setNotesText('');
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern der Notizen:", error);
      alert(`Fehler beim Speichern der Notizen: ${error.message}`);
    }
  };

  const activeAuftraegeCount = auftraege.filter(a => !a.monteur_completed).length;
  const completedAuftraegeCount = auftraege.filter(a => a.monteur_completed).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-gray-900">Montageaufträge werden geladen...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || user.position !== 'Monteur') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Zugriff verweigert</h2>
            <p className="text-gray-600">Diese Seite ist nur für Monteure zugänglich.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 md:mb-6 gap-3"
        >
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              Meine Montageaufträge
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {filteredAuftraege.length} von {showCompletedAuftraege ? completedAuftraegeCount : activeAuftraegeCount} Montageaufträgen
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 hover:text-blue-600" />
          </button>
        </motion.div>

        {/* Toggle zwischen aktiven und abgeschlossenen Aufträgen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4 md:mb-6"
        >
          <div className="flex gap-2">
            <Button
              variant={!showCompletedAuftraege ? "default" : "outline"}
              onClick={() => setShowCompletedAuftraege(false)}
              className={!showCompletedAuftraege ? "bg-gradient-to-r from-blue-500 to-indigo-600" : ""}
            >
              <Clock className="w-4 h-4 mr-2" />
              Aktive Aufträge ({activeAuftraegeCount})
            </Button>
            <Button
              variant={showCompletedAuftraege ? "default" : "outline"}
              onClick={() => setShowCompletedAuftraege(true)}
              className={showCompletedAuftraege ? "bg-gradient-to-r from-red-500 to-pink-600" : ""}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Fertig gemeldet ({completedAuftraegeCount})
            </Button>
          </div>
        </motion.div>

        {/* Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="card-elevation border-none mb-4 md:mb-6">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Suchfeld */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Suche nach SM-Nr., Projektnummer, Titel, Kunde oder Stadt..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 md:gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 text-sm">
                      <Filter className="w-4 h-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="Tiefbau ausstehend">Tiefbau ausstehend</SelectItem>
                      <SelectItem value="Bereit zur Montage">Bereit zur Montage</SelectItem>
                      <SelectItem value="Montage abgeschlossen">Montage abgeschlossen</SelectItem>
                      <SelectItem value="Rotberichtigung abgeschlossen">Rotberichtigung abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Aufträge Grid */}
        {filteredAuftraege.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-8 text-center">
              {showCompletedAuftraege ? (
                <>
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Noch keine fertig gemeldeten Aufträge
                  </h3>
                  <p className="text-gray-600">
                    Markieren Sie aktive Montageaufträge als fertig, um sie hier zu sehen.
                  </p>
                </>
              ) : (
                <>
                  <Construction className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {auftraege.length === 0 ? 'Keine Montageaufträge zugewiesen' : 'Keine Aufträge gefunden'}
                  </h3>
                  <p className="text-gray-600">
                    {auftraege.length === 0
                      ? 'Ihnen wurden noch keine Montageaufträge zugewiesen.'
                      : 'Probieren Sie andere Suchkriterien.'
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            <AnimatePresence>
              {filteredAuftraege.map((auftrag, index) => {
                const isCompleting = completing === auftrag.id;

                return (
                  <motion.div
                    key={auftrag.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card className="card-elevation border-none h-full hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
                      <CardContent className="p-4 space-y-3">
                        {/* Titel */}
                        <div>
                          <CardTitle className="text-base font-bold text-gray-900 line-clamp-2">
                            {auftrag.title}
                          </CardTitle>
                        </div>

                        {/* Tiefbau Status */}
                        {auftrag.tiefbau_offen && (
                          <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-200">
                            <Construction className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-blue-700">Tiefbau offen</span>
                          </div>
                        )}

                        {/* Notizen */}
                        {auftrag.notes && (
                          <div className="bg-gray-50 rounded p-2 border border-gray-200">
                            <p className="text-xs text-gray-600 line-clamp-3">
                              {auftrag.notes}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-1">
                          {!auftrag.monteur_completed && (
                            <Button
                              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-sm h-9"
                              onClick={() => handleMarkAsCompleted(auftrag)}
                              disabled={isCompleting}
                            >
                              {isCompleting ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                  Wird markiert...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-2" />
                                  Fertigstellen
                                </>
                              )}
                            </Button>
                          )}
                          <Link to={createPageUrl(`MontageAuftragDetail?id=${auftrag.id}`)} className="block">
                            <Button variant="default" className="w-full text-sm bg-blue-600 hover:bg-blue-700 h-9">
                              <Eye className="w-3 h-3 mr-2" />
                              Auftrag öffnen
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bestätigungsdialog für Fertigmeldung */}
      <AnimatePresence>
        {confirmDialog.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => { if (e.target === e.currentTarget) cancelMarkAsCompleted(); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md"
            >
              <Card className="card-elevation border-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Montage als fertig melden</h3>
                      <p className="text-sm text-gray-600">Bestätigung erforderlich</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700 mb-3">
                      Möchten Sie den folgenden Montageauftrag wirklich als fertig melden?
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">{confirmDialog.auftragTitle}</p>
                    </div>
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        ✓ Der Auftrag wird als fertig markiert und der Administrator wird benachrichtigt.
                      </p>
                      <p className="text-sm text-red-800 mt-1">
                        ✓ Der Auftrag erscheint in Ihrer Liste der fertig gemeldeten Aufträge.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={cancelMarkAsCompleted}
                      className="flex-1"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={confirmMarkAsCompleted}
                      className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Bestätigen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notizen Dialog */}
      <AnimatePresence>
        {showNotesDialog && currentNotesAuftrag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNotesDialog(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl"
            >
              <Card className="card-elevation border-none">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notizen & Montageinformationen
                  </CardTitle>
                  <p className="text-sm text-blue-100 mt-1">
                    {currentNotesAuftrag.sm_number} - {currentNotesAuftrag.title}
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
                        Montageinformationen und Notizen
                      </Label>
                      <Textarea
                        id="notes"
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Hier können Sie alle relevanten Informationen zur Montage eintragen:
- Durchgeführte Arbeiten
- Besondere Vorkommnisse
- Verwendete Materialien
- Zeitaufwand
- Kontaktpersonen vor Ort
- Weitere Anmerkungen"
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Diese Notizen werden mit dem Montageauftrag gespeichert und können jederzeit bearbeitet werden.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowNotesDialog(false);
                      setCurrentNotesAuftrag(null);
                      setNotesText('');
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button onClick={handleSaveNotes} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Notizen speichern
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { MontageAuftrag, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  MapPin,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2
} from "lucide-react";

export default function MeineMontageAuftraegePage() {
  const [user, setUser] = useState(null);
  const [auftraege, setAuftraege] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAuftrag, setConfirmAuftrag] = useState(null);

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
        const userAssignedAuftraege = (Array.isArray(auftraegeData) ? auftraegeData : []).filter(auftrag =>
          auftrag.assigned_monteur_id === userData.id ||
          auftrag.assigned_monteur_name === userData.full_name ||
          auftrag.assigned_to === userData.full_name
        );
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

  const handleMarkAsCompleted = (auftrag) => {
    setConfirmAuftrag(auftrag);
    setShowConfirm(true);
  };

  const confirmComplete = async () => {
    if (!confirmAuftrag) return;
    
    setCompleting(confirmAuftrag.id);
    setShowConfirm(false);

    try {
      await MontageAuftrag.update(confirmAuftrag.id, {
        monteur_completed: true,
        monteur_completed_date: new Date().toISOString().split('T')[0],
        status: "Montage fertig"
      });

      await loadData();
    } catch (error) {
      console.error("Fehler beim Markieren als fertig:", error);
      alert(`Fehler: ${error.message}`);
    }
    setCompleting(null);
    setConfirmAuftrag(null);
  };

  const activeAuftraege = auftraege.filter(a => !a.monteur_completed);
  const completedAuftraege = auftraege.filter(a => a.monteur_completed);

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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Meine Montageaufträge
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {activeAuftraege.length} offene Aufträge • {completedAuftraege.length} erledigt
          </p>
        </motion.div>

        {/* Offene Aufträge */}
        <div className="mb-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Offene Aufträge ({activeAuftraege.length})
          </h2>
          
          {activeAuftraege.length === 0 ? (
            <Card className="card-elevation border-none">
              <CardContent className="p-8 text-center">
                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Keine offenen Aufträge
                </h3>
                <p className="text-gray-600">
                  Ihnen sind derzeit keine Montageaufträge zugewiesen.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {activeAuftraege.map((auftrag, index) => {
                  const isCompleting = completing === auftrag.id;
                  return (
                    <motion.div
                      key={auftrag.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`card-elevation border-none h-full hover:shadow-xl transition-all ${
                        auftrag.tiefbau_offen ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base md:text-lg font-bold text-gray-900 truncate">
                                {auftrag.sm_number}
                              </CardTitle>
                              {auftrag.project_number && (
                                <p className="text-xs md:text-sm text-gray-600 truncate">
                                  Projekt: {auftrag.project_number}
                                </p>
                              )}
                            </div>
                            {auftrag.tiefbau_offen && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                Tiefbau offen
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <h3 className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2">
                            {auftrag.title}
                          </h3>
                          
                          <div className="space-y-1 text-xs md:text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{auftrag.client}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">
                                {auftrag.street ? `${auftrag.street}, ` : ''}{auftrag.city}
                              </span>
                            </div>
                            {auftrag.start_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span>{new Date(auftrag.start_date).toLocaleDateString('de-DE')}</span>
                              </div>
                            )}
                          </div>

                          {auftrag.tiefbau_offen && auftrag.tiefbau_offen_date && (
                            <div className="bg-blue-100 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
                              Tiefbau gemeldet: {new Date(auftrag.tiefbau_offen_date).toLocaleDateString('de-DE')}
                            </div>
                          )}

                          <Button
                            onClick={() => handleMarkAsCompleted(auftrag)}
                            disabled={isCompleting}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 mt-4"
                          >
                            {isCompleting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Wird markiert...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Als fertig melden
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Erledigte Aufträge */}
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Erledigte Aufträge ({completedAuftraege.length})
          </h2>
          
          {completedAuftraege.length === 0 ? (
            <Card className="card-elevation border-none">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Noch keine erledigten Aufträge
                </h3>
                <p className="text-gray-600">
                  Markieren Sie Aufträge als fertig, um sie hier zu sehen.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {completedAuftraege.map((auftrag, index) => (
                  <motion.div
                    key={auftrag.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="card-elevation border-none h-full bg-red-50 border-l-4 border-l-red-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base md:text-lg font-bold text-gray-900 truncate">
                              {auftrag.sm_number}
                            </CardTitle>
                            {auftrag.project_number && (
                              <p className="text-xs md:text-sm text-gray-600 truncate">
                                Projekt: {auftrag.project_number}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Fertig
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <h3 className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2">
                          {auftrag.title}
                        </h3>
                        
                        <div className="space-y-1 text-xs md:text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{auftrag.client}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                              {auftrag.street ? `${auftrag.street}, ` : ''}{auftrag.city}
                            </span>
                          </div>
                          {auftrag.monteur_completed_date && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4 flex-shrink-0" />
                              <span>
                                Erledigt am {new Date(auftrag.monteur_completed_date).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Bestätigungsdialog */}
      <AnimatePresence>
        {showConfirm && confirmAuftrag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
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
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Montage als fertig melden</h3>
                      <p className="text-sm text-gray-600">Bestätigung erforderlich</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700 mb-3">
                      Möchten Sie die Montage für diesen Auftrag wirklich als fertig melden?
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">{confirmAuftrag.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{confirmAuftrag.sm_number}</p>
                    </div>
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✓ Der Auftrag wird als "Montage fertig" markiert und erscheint rot in Ihrer Liste.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirm(false)}
                      className="flex-1"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={confirmComplete}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
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
    </div>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import { Project, User, Excavation, PriceItem } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  MapPin,
  Calendar,
  User as UserIcon,
  Building,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Euro,
  Loader2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Shovel,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  'completed': 'bg-green-100 text-green-800 border-green-200',
  'active': 'bg-blue-100 text-blue-800 border-blue-200',
  'planning': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'on_hold': 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusLabels = {
  'completed': 'Abgeschlossen',
  'active': 'Aktiv',
  'planning': 'Planung',
  'on_hold': 'Pausiert'
};

const projectStatusColors = {
  'Baustelle fertig': 'bg-green-100 text-green-800 border-green-200',
  'Auftrag komplett abgeschlossen': 'bg-green-100 text-green-800 border-green-200',
  'VAO bei Baubeginn': 'bg-blue-100 text-blue-800 border-blue-200',
  'Auftrag angelegt ohne VAO': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Auftrag neu VAO beantragt': 'bg-orange-100 text-orange-800 border-orange-200'
};

export default function MyProjectsPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    projectId: null,
    projectTitle: null
  });
  const [completing, setCompleting] = useState(null);
  const [closureDialog, setClosureDialog] = useState({ show: false, excavation: null });
  const [backfillDialog, setBackfillDialog] = useState({ show: false, excavation: null });

  const filterProjects = useCallback(() => {
    let filtered = [...projects];

    // Filter nach foreman_completed Status
    if (showCompletedProjects) {
      filtered = filtered.filter(project => project.foreman_completed === true);
    } else {
      filtered = filtered.filter(project => !project.foreman_completed);
    }

    // Textsuche
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.sm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status-Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Projekt-Status-Filter
    if (projectStatusFilter !== 'all') {
      filtered = filtered.filter(project => project.project_status === projectStatusFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, projectStatusFilter, showCompletedProjects]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [filterProjects]); // Now filterProjects is memoized by useCallback, making this dependency stable.

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, projectsData, excavationsData, priceItemsData] = await Promise.all([
        User.me().catch(() => null),
        Project.list("-created_date").catch(() => []),
        Excavation.list("-created_date").catch(() => []),
        PriceItem.list("item_number").catch(() => [])
      ]);

      setUser(userData);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
      setPriceItems(Array.isArray(priceItemsData) ? priceItemsData : []);

      if (userData && userData.position === 'Bauleiter') {
        const userAssignedProjects = (Array.isArray(projectsData) ? projectsData : []).filter(project =>
          project.assigned_foreman_id === userData.id ||
          project.assigned_foreman_name === userData.full_name ||
          project.created_by === userData.email
        );
        setProjects(userAssignedProjects);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Projekte:", error);
      setProjects([]);
      setExcavations([]);
      setPriceItems([]);
    }
    setIsLoading(false);
  };

  const getProjectExcavations = (projectId) => {
    return excavations.filter(exc => exc.project_id === projectId);
  };

  const calculateProjectRevenue = (projectId) => {
    const projectExcavations = getProjectExcavations(projectId);
    return projectExcavations.reduce((sum, exc) => sum + (exc?.calculated_price || 0), 0);
  };

  const getProjectStats = (project) => {
    const projectExcavations = getProjectExcavations(project.id);
    const revenue = calculateProjectRevenue(project.id);
    const completedExcavations = projectExcavations.filter(exc => exc.status === 'completed').length;
    const totalExcavations = projectExcavations.length;

    return {
      totalExcavations,
      completedExcavations,
      revenue,
      completionPercentage: totalExcavations > 0 ? Math.round((completedExcavations / totalExcavations) * 100) : 0
    };
  };

  const handleMarkAsCompleted = (project) => {
    setConfirmDialog({
      show: true,
      projectId: project.id,
      projectTitle: project.title
    });
  };

  const confirmMarkAsCompleted = async () => {
    const { projectId } = confirmDialog;
    setConfirmDialog({ show: false, projectId: null, projectTitle: null });
    setCompleting(projectId);

    try {
      await Project.update(projectId, {
        foreman_completed: true,
        foreman_completed_date: new Date().toISOString().split('T')[0]
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error("Fehler beim Markieren als erledigt:", error);
    }
    setCompleting(null);
  };

  const cancelMarkAsCompleted = () => {
    setConfirmDialog({ show: false, projectId: null, projectTitle: null });
  };

  const toggleProjectExpanded = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleClosureToggle = (excavation, checked) => {
    if (checked) {
      setClosureDialog({ show: true, excavation });
    } else {
      updateExcavationClosure(excavation.id, false, null, null);
    }
  };

  const handleBackfillToggle = (excavation, checked) => {
    if (checked) {
      setBackfillDialog({ show: true, excavation });
    } else {
      updateExcavationBackfill(excavation.id, false, null, null);
    }
  };

  const updateExcavationClosure = async (excavationId, is_closed, closed_date, closed_by) => {
    try {
      await Excavation.update(excavationId, { is_closed, closed_date, closed_by, closed_by_user_id: user?.id });
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
  };

  const updateExcavationBackfill = async (excavationId, is_backfilled, backfilled_date, backfilled_by) => {
    try {
      await Excavation.update(excavationId, { is_backfilled, backfilled_date, backfilled_by, backfilled_by_user_id: user?.id });
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
  };

  const confirmClosure = async () => {
    if (!closureDialog.excavation) return;
    const { excavation } = closureDialog;
    await updateExcavationClosure(
      excavation.id,
      true,
      new Date().toISOString().split('T')[0],
      user?.full_name || 'Nicht angegeben'
    );
    setClosureDialog({ show: false, excavation: null });
  };

  const confirmBackfill = async () => {
    if (!backfillDialog.excavation) return;
    const { excavation } = backfillDialog;
    await updateExcavationBackfill(
      excavation.id,
      true,
      new Date().toISOString().split('T')[0],
      user?.full_name || 'Nicht angegeben'
    );
    setBackfillDialog({ show: false, excavation: null });
  };

  const getPriceItemDescription = (priceItemId) => {
    const item = priceItems.find(p => p.id === priceItemId);
    return item ? `${item.item_number} - ${item.description}` : 'Position unbekannt';
  };

  const activeProjectsCount = projects.filter(p => !p.foreman_completed).length;
  const completedProjectsCount = projects.filter(p => p.foreman_completed).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <Loader2 className="w-8 h-8 text-orange-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-gray-900">Aufträge werden geladen...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || user.position !== 'Bauleiter') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Zugriff verweigert</h2>
            <p className="text-gray-600">Diese Seite ist nur für Bauleiter zugänglich.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-3 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Tablet optimiert */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 md:mb-6 gap-3"
        >
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              Meine Aufträge
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {filteredProjects.length} von {showCompletedProjects ? completedProjectsCount : activeProjectsCount} Aufträgen
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 hover:text-orange-600" />
            </button>
            <Link to={createPageUrl("Analytics")}>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Zur Auswertung
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Toggle zwischen aktiven und abgeschlossenen Projekten */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4 md:mb-6"
        >
          <div className="flex gap-2">
            <Button
              variant={!showCompletedProjects ? "default" : "outline"}
              onClick={() => setShowCompletedProjects(false)}
              className={!showCompletedProjects ? "bg-gradient-to-r from-orange-500 to-amber-600" : ""}
            >
              <Clock className="w-4 h-4 mr-2" />
              Aktive Aufträge ({activeProjectsCount})
            </Button>
            <Button
              variant={showCompletedProjects ? "default" : "outline"}
              onClick={() => setShowCompletedProjects(true)}
              className={showCompletedProjects ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Abgeschlossen ({completedProjectsCount})
            </Button>
          </div>
        </motion.div>

        {/* Filter Section - Tablet optimiert */}
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
                      placeholder="Suche nach Projektnummer, SM-Nr., Titel, Kunde oder Stadt..."
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
                      <SelectItem value="planning">Planung</SelectItem>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="completed">Abgeschlossen</SelectItem>
                      <SelectItem value="on_hold">Pausiert</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                    <SelectTrigger className="w-40 text-sm">
                      <SelectValue placeholder="Projekt-Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Projekt-Status</SelectItem>
                      <SelectItem value="Baustelle fertig">Baustelle fertig</SelectItem>
                      <SelectItem value="Auftrag komplett abgeschlossen">Komplett abgeschlossen</SelectItem>
                      <SelectItem value="VAO bei Baubeginn">VAO bei Baubeginn</SelectItem>
                      <SelectItem value="Auftrag angelegt ohne VAO">Ohne VAO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Projects Grid - Tablet optimiert */}
        {filteredProjects.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-8 text-center">
              {showCompletedProjects ? (
                <>
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Noch keine abgeschlossenen Aufträge
                  </h3>
                  <p className="text-gray-600">
                    Markieren Sie aktive Projekte als erledigt, um sie hier zu sehen.
                  </p>
                </>
              ) : (
                <>
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {projects.length === 0 ? 'Keine Aufträge zugewiesen' : 'Keine Aufträge gefunden'}
                  </h3>
                  <p className="text-gray-600">
                    {projects.length === 0
                      ? 'Ihnen wurden noch keine Aufträge zugewiesen.'
                      : 'Probieren Sie andere Suchkriterien.'
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="card-elevation border-none hover:shadow-lg transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-gray-900">
                                {project.project_number}
                              </h3>
                              <Badge className="text-xs" variant="outline">SM: {project.sm_number}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {project.title}
                            </p>
                          </div>
                          <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                            <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 h-12 px-6">
                              Öffnen
                              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
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

      {/* Bestätigungsdialog */}
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
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Auftrag als erledigt markieren</h3>
                      <p className="text-sm text-gray-600">Bestätigung erforderlich</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700 mb-3">
                      Möchten Sie den folgenden Auftrag wirklich als erledigt markieren?
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">{confirmDialog.projectTitle}</p>
                    </div>
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✓ Der Auftrag wird als erledigt markiert und erscheint in Ihrer Liste der abgeschlossenen Aufträge.
                      </p>
                      <p className="text-sm text-green-800 mt-1">
                        ✓ Der Administrator kann den Auftrag in der Disposition als erledigt sehen.
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

      {/* Closure Dialog */}
      {closureDialog.show && (
        <Dialog open={closureDialog.show} onOpenChange={() => setClosureDialog({ show: false, excavation: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leistung als geschlossen markieren</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Möchten Sie die Leistung "{closureDialog.excavation?.location_name}" als geschlossen markieren?
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✓ Datum: {new Date().toLocaleDateString('de-DE')}<br/>
                ✓ Von: {user?.full_name}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClosureDialog({ show: false, excavation: null })}>
                Abbrechen
              </Button>
              <Button onClick={confirmClosure} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Bestätigen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Backfill Dialog */}
      {backfillDialog.show && (
        <Dialog open={backfillDialog.show} onOpenChange={() => setBackfillDialog({ show: false, excavation: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leistung als verfüllt markieren</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Möchten Sie die Leistung "{backfillDialog.excavation?.location_name}" als verfüllt markieren?
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✓ Datum: {new Date().toLocaleDateString('de-DE')}<br/>
                ✓ Von: {user?.full_name}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBackfillDialog({ show: false, excavation: null })}>
                Abbrechen
              </Button>
              <Button onClick={confirmBackfill} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Bestätigen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
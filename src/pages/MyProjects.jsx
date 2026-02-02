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
  const [myProjects, setMyProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [closedFilter, setClosedFilter] = useState('all');
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  const filterProjects = useCallback(() => {
    let filtered = [...myProjects];

    if (showCompletedProjects) {
      filtered = filtered.filter(project => project.foreman_completed === true);
    } else {
      filtered = filtered.filter(project => !project.foreman_completed);
    }

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.project_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.sm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    if (closedFilter !== 'all') {
      const projectExcs = filtered.map(p => ({
        ...p,
        excavations: excavations.filter(exc => exc.project_id === p.id)
      }));
      
      if (closedFilter === 'open') {
        filtered = projectExcs.filter(p => 
          p.excavations.some(exc => !exc.is_closed && !exc.is_backfilled)
        ).map(p => ({ ...p, excavations: undefined }));
      } else if (closedFilter === 'backfilled') {
        filtered = projectExcs.filter(p => 
          p.excavations.some(exc => exc.is_backfilled && !exc.is_closed)
        ).map(p => ({ ...p, excavations: undefined }));
      } else if (closedFilter === 'closed') {
        filtered = projectExcs.filter(p => 
          p.excavations.some(exc => exc.is_closed)
        ).map(p => ({ ...p, excavations: undefined }));
      }
    }

    setFilteredProjects(filtered);
  }, [myProjects, searchTerm, statusFilter, closedFilter, showCompletedProjects, excavations]);

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
        const userAssignedProjects = (Array.isArray(projectsData) ? projectsData : []).filter(project => {
          if (project.assigned_bauleiter && Array.isArray(project.assigned_bauleiter)) {
            return project.assigned_bauleiter.some(b => b.id === userData.id);
          }
          return project.assigned_foreman_id === userData.id ||
                 project.assigned_foreman_name === userData.full_name ||
                 project.created_by === userData.email;
        });
        setMyProjects(userAssignedProjects);
      } else {
        setMyProjects([]);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Projekte:", error);
      setMyProjects([]);
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

  const handleCompleteProject = async (project) => {
    if (confirm(`Auftrag "${project.project_number}" als erledigt markieren?`)) {
      setCompleting(project.id);
      try {
        await Project.update(project.id, {
          foreman_completed: true,
          foreman_completed_date: new Date().toISOString().split('T')[0]
        });
        await loadData();
      } catch (error) {
        console.error("Fehler beim Markieren als erledigt:", error);
        alert("Fehler beim Markieren des Auftrags");
      }
      setCompleting(null);
    }
  };

  const getPriceItemDescription = (priceItemId) => {
    const item = priceItems.find(p => p.id === priceItemId);
    return item ? `${item.item_number} - ${item.description}` : 'Position unbekannt';
  };

  const activeProjectsCount = myProjects.filter(p => !p.foreman_completed).length;
  const completedProjectsCount = myProjects.filter(p => p.foreman_completed).length;

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-amber-50 p-2 md:p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Toggle aktiv/abgeschlossen */}
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={!showCompletedProjects ? "default" : "outline"}
            onClick={() => setShowCompletedProjects(false)}
            className={`flex-1 ${!showCompletedProjects ? "bg-orange-500" : ""}`}
          >
            <Clock className="w-3 h-3 mr-1" />
            Aktiv ({activeProjectsCount})
          </Button>
          <Button
            size="sm"
            variant={showCompletedProjects ? "default" : "outline"}
            onClick={() => setShowCompletedProjects(true)}
            className={`flex-1 ${showCompletedProjects ? "bg-green-500" : ""}`}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Fertig ({completedProjectsCount})
          </Button>
        </div>



        {/* Kompakte Projekt-Liste */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Keine Aufträge gefunden</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                const projectExcavations = excavations.filter(exc => exc.project_id === project.id);
                const openExcavations = projectExcavations.filter(exc => !exc.is_closed && !exc.is_backfilled).length;
                const closedExcavations = projectExcavations.filter(exc => exc.is_closed).length;
                const totalExcavations = projectExcavations.length;
                const projectRevenue = calculateProjectRevenue(project.id);

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card 
                      className="border-2 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => window.location.href = createPageUrl(`ProjectDetail?id=${project.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-orange-500 text-white text-xs px-2 py-0">
                                {project.project_number}
                              </Badge>
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                {project.sm_number}
                              </Badge>
                              {project.foreman_completed && (
                                <Badge className="bg-green-500 text-white text-xs px-2 py-0">
                                  <CheckCircle className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm text-gray-900 truncate">
                              {project.title}
                            </h3>
                          </div>

                          {!project.foreman_completed && (
                            <div className="flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteProject(project);
                                }}
                                disabled={completing === project.id}
                                className="h-8 px-3 bg-green-600 hover:bg-green-700"
                              >
                                {completing === project.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>


    </div>
  );
}
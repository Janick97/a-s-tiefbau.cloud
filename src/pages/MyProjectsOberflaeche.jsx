import React, { useState, useEffect, useCallback } from "react";
import { Project, User, Excavation } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Package,
  RefreshCw
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

export default function MyProjectsOberflaechePage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workStatusFilter, setWorkStatusFilter] = useState('all');

  const filterProjects = useCallback(() => {
    let filtered = [...projects];

    // Filter nach Arbeitsstatus
    if (workStatusFilter === 'needs_backfill') {
      filtered = filtered.filter(project => {
        const projectExcavations = excavations.filter(exc => exc.project_id === project.id);
        return projectExcavations.some(exc => !exc.is_backfilled);
      });
    } else if (workStatusFilter === 'needs_surface') {
      filtered = filtered.filter(project => {
        const projectExcavations = excavations.filter(exc => exc.project_id === project.id);
        return projectExcavations.some(exc => exc.is_backfilled && !exc.is_closed);
      });
    } else if (workStatusFilter === 'completed') {
      filtered = filtered.filter(project => {
        const projectExcavations = excavations.filter(exc => exc.project_id === project.id);
        return projectExcavations.length > 0 && projectExcavations.every(exc => exc.is_closed);
      });
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

    setFilteredProjects(filtered);
  }, [projects, excavations, searchTerm, statusFilter, workStatusFilter]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [filterProjects]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, projectsData, excavationsData] = await Promise.all([
        User.me().catch(() => null),
        Project.list("-created_date", 200).catch(() => []),
        Excavation.list("-created_date", 500).catch(() => [])
      ]);

      setUser(userData);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);

      // Filter: Nur Projekte anzeigen, bei denen der User zugewiesen ist oder an Leistungen gearbeitet hat
      const myExcavations = excavationsData.filter(exc => 
        exc.backfilled_by_user_id === userData?.id || 
        exc.closed_by_user_id === userData?.id
      );
      const myProjectIds = new Set(myExcavations.map(exc => exc.project_id));
      
      const relevantProjects = (Array.isArray(projectsData) ? projectsData : []).filter(p => 
        p.assigned_foreman_id === userData?.id || myProjectIds.has(p.id)
      );
      
      setProjects(relevantProjects);
    } catch (error) {
      console.error("Fehler beim Laden der Projekte:", error);
      setProjects([]);
      setExcavations([]);
    }
    setIsLoading(false);
  };

  const getProjectExcavations = (projectId) => {
    return excavations.filter(exc => exc.project_id === projectId);
  };

  const getProjectStats = (project) => {
    const projectExcavations = getProjectExcavations(project.id);
    const needsBackfill = projectExcavations.filter(exc => !exc.is_backfilled).length;
    const needsSurface = projectExcavations.filter(exc => exc.is_backfilled && !exc.is_closed).length;
    const completed = projectExcavations.filter(exc => exc.is_closed).length;
    
    let hasBackfillCommission = false;
    let hasSurfaceCommission = false;
    
    projectExcavations.forEach(exc => {
      if (exc.backfilled_by_user_id === user?.id && exc.backfill_commission) {
        hasBackfillCommission = true;
      }
      if (exc.closed_by_user_id === user?.id && exc.surface_commission) {
        hasSurfaceCommission = true;
      }
    });

    return {
      total: projectExcavations.length,
      needsBackfill,
      needsSurface,
      completed,
      hasBackfillCommission,
      hasSurfaceCommission
    };
  };

  const openProjectsCount = projects.filter(p => {
    const stats = getProjectStats(p);
    return stats.needsBackfill > 0 || stats.needsSurface > 0;
  }).length;

  const completedProjectsCount = projects.filter(p => {
    const stats = getProjectStats(p);
    return stats.total > 0 && stats.completed === stats.total;
  }).length;

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

  if (!user || user.position !== 'Oberfläche') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Zugriff verweigert</h2>
            <p className="text-gray-600">Diese Seite ist nur für Oberflächen-Mitarbeiter zugänglich.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-3 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
              {filteredProjects.length} von {projects.length} Aufträgen
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

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 md:mb-6"
        >
          <Card className="card-elevation border-none">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-gray-600">Offen</p>
              </div>
              <p className="text-xl md:text-2xl font-bold">{openProjectsCount}</p>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-xs text-gray-600">Fertig</p>
              </div>
              <p className="text-xl md:text-2xl font-bold">{completedProjectsCount}</p>
            </CardContent>
          </Card>
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
                      placeholder="Suche nach Projektnummer, SM-Nr., Titel, Kunde oder Stadt..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 md:gap-3">
                  <Select value={workStatusFilter} onValueChange={setWorkStatusFilter}>
                    <SelectTrigger className="w-40 text-sm">
                      <Filter className="w-4 h-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Arbeiten</SelectItem>
                      <SelectItem value="needs_backfill">Zu verfüllen</SelectItem>
                      <SelectItem value="needs_surface">Oberfläche offen</SelectItem>
                      <SelectItem value="completed">Fertiggestellt</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 text-sm">
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
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Keine Aufträge gefunden
              </h3>
              <p className="text-gray-600">
                Probieren Sie andere Suchkriterien.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                const stats = getProjectStats(project);

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card className="card-elevation border-none h-full hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base md:text-lg font-bold text-gray-900 truncate">
                              {project.project_number}
                            </CardTitle>
                            <p className="text-xs md:text-sm text-gray-600 truncate">
                              SM: {project.sm_number}
                            </p>
                          </div>
                          <Badge className={`text-xs ${statusColors[project.status] || statusColors.planning}`}>
                            {statusLabels[project.status] || 'Unbekannt'}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 md:space-y-4">
                        {/* Projekt Info */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2 leading-tight">
                            {project.title}
                          </h3>
                          <div className="space-y-1 text-xs md:text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Building className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                              <span className="truncate">{project.client}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                              <span className="truncate">{project.city}</span>
                            </div>
                          </div>
                        </div>

                        {/* Arbeitsstatistiken */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-3 gap-3 text-xs md:text-sm">
                            <div>
                              <div className="flex items-center gap-1 text-gray-600 mb-1">
                                <Package className="w-3 h-3" />
                                <span>Verfüllen</span>
                              </div>
                              <div className="font-semibold text-orange-600">
                                {stats.needsBackfill}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-gray-600 mb-1">
                                <Clock className="w-3 h-3" />
                                <span>Oberfläche</span>
                              </div>
                              <div className="font-semibold text-blue-600">
                                {stats.needsSurface}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-gray-600 mb-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Fertig</span>
                              </div>
                              <div className="font-semibold text-green-600">
                                {stats.completed}
                              </div>
                            </div>
                          </div>

                          {/* Meine Provision - nur Prozente */}
                          {(stats.hasBackfillCommission || stats.hasSurfaceCommission) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-600 mb-1">Meine Provision:</span>
                                <div className="flex gap-2">
                                  {stats.hasBackfillCommission && (
                                    <Badge className="bg-orange-100 text-orange-700 text-xs">
                                      Verfüllung 20%
                                    </Badge>
                                  )}
                                  {stats.hasSurfaceCommission && (
                                    <Badge className="bg-green-100 text-green-700 text-xs">
                                      Oberfläche 30%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <Link to={createPageUrl(`ProjectDetailOberflaeche?id=${project.id}`)}>
                          <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Projekt öffnen
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
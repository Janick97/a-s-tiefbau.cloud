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

export default function MyProjectsOberflaechePage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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

  const handleCompleteProject = async (project) => {
    if (confirm(`Wollen Sie den Auftrag "${project.project_number}" als erledigt markieren?`)) {
      try {
        await Project.update(project.id, {
          foreman_completed: true,
          foreman_completed_date: new Date().toISOString()
        });
        await loadData();
      } catch (error) {
        console.error("Fehler beim Abschließen:", error);
        alert("Fehler beim Abschließen des Auftrags");
      }
    }
  };

  const getProjectExcavations = (projectId) => {
    return excavations.filter(exc => exc.project_id === projectId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-2 md:p-4 pb-20">
      <div className="max-w-7xl mx-auto">


        {/* Kompakte Projekt-Liste */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Keine Aufträge gefunden</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {projects.map((project, index) => {
                const projectExcs = getProjectExcavations(project.id);
                const openExcs = projectExcs.filter(exc => !exc.is_closed && !exc.is_backfilled).length;
                const closedExcs = projectExcs.filter(exc => exc.is_closed).length;

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
                      onClick={() => window.location.href = createPageUrl(`ProjectDetailOberflaeche?id=${project.id}`)}
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
                                className="h-8 px-3 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
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
          </div>
        )}
      </div>
    </div>
  );
}
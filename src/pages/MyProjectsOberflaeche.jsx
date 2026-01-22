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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-3 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-4 md:mb-6"
        >
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              Meine Aufträge
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {projects.length} Aufträge
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 hover:text-orange-600" />
          </button>
        </motion.div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Keine Aufträge gefunden
              </h3>
              <p className="text-gray-600">
                Sie haben noch keine zugewiesenen Aufträge.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            <AnimatePresence>
              {projects.map((project, index) => (
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
                      <CardTitle className="text-base md:text-lg font-bold text-gray-900 truncate">
                        {project.project_number}
                      </CardTitle>
                      <p className="text-xs md:text-sm text-gray-600 truncate">
                        SM: {project.sm_number}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-3 md:space-y-4">
                      <h3 className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2 leading-tight">
                        {project.title}
                      </h3>

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
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
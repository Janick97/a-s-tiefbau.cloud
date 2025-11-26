
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderOpen, 
  Calendar, 
  MapPin, 
  Euro,
  ArrowRight,
  Shovel
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  planning: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-800 border-gray-200",
  on_hold: "bg-orange-100 text-orange-800 border-orange-200"
};

const statusLabels = {
  planning: "Planung",
  active: "Aktiv",
  completed: "Abgeschlossen", 
  on_hold: "Pausiert"
};

export default function RecentProjects({ projects, excavations, isLoading }) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeExcavations = Array.isArray(excavations) ? excavations : [];

  const getProjectExcavations = (projectId) => {
    return safeExcavations.filter(exc => exc && exc.project_id === projectId);
  };

  const getProjectRevenue = (projectId) => {
    return safeExcavations
      .filter(exc => exc && exc.project_id === projectId)
      .reduce((sum, exc) => sum + (exc.calculated_price || 0), 0);
  };

  return (
    <Card className="card-elevation border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-gray-900 text-xl">
          <FolderOpen className="w-6 h-6" />
          Aktuelle Projekte
        </CardTitle>
        <Link to={createPageUrl("Projects")}>
          <Button variant="outline" className="ripple-effect">
            Alle anzeigen
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))
            ) : (
              safeProjects.slice(0, 5).map((project, index) => {
                if (!project) return null; // Defensive check for null/undefined project objects
                const projectExcavations = getProjectExcavations(project.id);
                const revenue = getProjectRevenue(project.id);
                
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/30 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {project.project_number}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>SM: {project.sm_number}</span>
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={statusColors[project.status]}
                      >
                        {statusLabels[project.status]}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {project.start_date ? 
                            new Date(project.start_date).toLocaleDateString('de-DE') : 
                            'Nicht geplant'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shovel className="w-4 h-4" />
                        <span>{projectExcavations.length} Ausgrabungen</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Euro className="w-4 h-4" />
                        <span>€{revenue.toLocaleString('de-DE')}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>

          {!isLoading && safeProjects.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Noch keine Projekte erstellt</p>
              <Link to={createPageUrl("Projects")}>
                <Button className="mt-3 ripple-effect">
                  Erstes Projekt erstellen
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

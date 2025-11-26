import React, { useState, useEffect } from "react";
import { Project } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileText, Calendar, User, CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OpenDocumentationsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectsData = await Project.list("-created_date");
      const safeProjects = Array.isArray(projectsData) ? projectsData : [];
      // Filter nur Projekte ohne Dokumentation
      const openDocProjects = safeProjects.filter(p => p && !p.documentation_completed);
      setProjects(openDocProjects);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setProjects([]);
    }
    setIsLoading(false);
  };

  const markDocumentationComplete = async (projectId) => {
    try {
      await Project.update(projectId, { documentation_completed: true });
      await loadProjects(); // Refresh list
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Offene Dokumentationen</h1>
          <p className="text-gray-600">Projekte bei denen noch keine Dokumentation erfolgt ist</p>
          <div className="mt-4">
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              {projects.length} offene Dokumentationen
            </Badge>
          </div>
        </motion.div>

        <div className="space-y-4">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="card-elevation border-none hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {project.project_number}
                        </span>
                        <span className="font-mono bg-gray-50 text-gray-700 px-2 py-1 rounded">
                          SM: {project.sm_number}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{project.client}</span>
                        </div>
                        {project.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                      <Button 
                        onClick={() => markDocumentationComplete(project.id)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Als erledigt markieren
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {projects.length === 0 && !isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <FileText className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">
                Alle Dokumentationen sind erledigt
              </h3>
              <p className="text-gray-400">
                Derzeit sind keine offenen Dokumentationen vorhanden
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
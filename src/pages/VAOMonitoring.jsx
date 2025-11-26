
import React, { useState, useEffect } from "react";
import { Project } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AlertTriangle, Calendar, FileText, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VAOMonitoringPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectsData = await Project.list("-created_date");
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setProjects([]);
    }
    setIsLoading(false);
  };

  const getVAOStatus = (project) => {
    if (!project || !project.vao_valid_to) return null;
    
    const today = new Date();
    const validTo = new Date(project.vao_valid_to);
    const diffTime = validTo - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', days: Math.abs(diffDays), color: 'bg-red-100 text-red-800' };
    } else if (diffDays <= 3) {
      return { status: 'expiring', days: diffDays, color: 'bg-orange-100 text-orange-800' };
    }
    return null;
  };

  const safeProjects = Array.isArray(projects) ? projects : [];
  const filteredProjects = safeProjects.filter(project => {
    const vaoStatus = getVAOStatus(project);
    return vaoStatus !== null;
  });

  const expiredProjects = filteredProjects.filter(p => getVAOStatus(p)?.status === 'expired');
  const expiringProjects = filteredProjects.filter(p => getVAOStatus(p)?.status === 'expiring');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">VAO-Überwachung</h1>
              <p className="text-gray-600">Übersicht über ablaufende und abgelaufene Verkehrsanordnungen</p>
            </div>
            <Link to={createPageUrl("VAOApplication")}>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
                <FileText className="w-4 h-4 mr-2" />
                Antrag stellen
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Abgelaufene VAOs</p>
                  <p className="text-3xl font-bold text-red-600">{expiredProjects.length}</p>
                </div>
                <div className="p-3 rounded-full bg-red-100">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Laufen in 3 Tagen ab</p>
                  <p className="text-3xl font-bold text-orange-600">{expiringProjects.length}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Kritische Projekte</p>
                  <p className="text-3xl font-bold text-gray-900">{filteredProjects.length}</p>
                </div>
                <div className="p-3 rounded-full bg-gray-100">
                  <Clock className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expired VAOs */}
        {expiredProjects.length > 0 && (
          <Card className="card-elevation border-none mb-8">
            <CardHeader className="bg-red-50 border-b">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                Abgelaufene VAOs ({expiredProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expiredProjects.map((project, index) => {
                const vaoStatus = getVAOStatus(project);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border-b last:border-b-0 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900">{project.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-red-100 text-red-800">
                            Seit {vaoStatus.days} Tagen abgelaufen
                          </Badge>
                          <Badge variant="outline">
                            {project.project_number}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Kunde: {project.client}</span>
                          <span>VAO gültig bis: {new Date(project.vao_valid_to).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                      <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Expiring VAOs */}
        {expiringProjects.length > 0 && (
          <Card className="card-elevation border-none">
            <CardHeader className="bg-orange-50 border-b">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Laufen in den nächsten 3 Tagen ab ({expiringProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expiringProjects.map((project, index) => {
                const vaoStatus = getVAOStatus(project);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border-b last:border-b-0 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900">{project.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-orange-100 text-orange-800">
                            {vaoStatus.days === 0 ? 'Läuft heute ab' : `Läuft in ${vaoStatus.days} Tag${vaoStatus.days === 1 ? '' : 'en'} ab`}
                          </Badge>
                          <Badge variant="outline">
                            {project.project_number}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Kunde: {project.client}</span>
                          <span>VAO gültig bis: {new Date(project.vao_valid_to).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                      <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {filteredProjects.length === 0 && !isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Calendar className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-medium text-gray-500 mb-2">
              Alle VAOs sind aktuell
            </h3>
            <p className="text-gray-400">
              Es gibt keine ablaufenden oder abgelaufenen Verkehrsanordnungen
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

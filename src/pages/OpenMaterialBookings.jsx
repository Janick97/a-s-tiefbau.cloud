
import React, { useState, useEffect } from "react";
import { Project, ProjectMaterial, Material } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Construction, Calendar, User, CheckSquare, Package, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OpenMaterialBookingsPage() {
  const [projects, setProjects] = useState([]);
  const [projectMaterials, setProjectMaterials] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsData, projectMaterialsData, materialsData] = await Promise.all([
        Project.list("-created_date"),
        ProjectMaterial.list(),
        Material.list()
      ]);
      
      const safeProjects = Array.isArray(projectsData) ? projectsData : [];
      const safeProjectMaterials = Array.isArray(projectMaterialsData) ? projectMaterialsData : [];
      const safeMaterials = Array.isArray(materialsData) ? materialsData : [];
      
      // Filter nur Projekte ohne Materialbuchung
      const openMaterialProjects = safeProjects.filter(p => p && !p.material_booking_completed);
      
      setProjects(openMaterialProjects);
      setProjectMaterials(safeProjectMaterials);
      setMaterials(safeMaterials);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setProjects([]);
      setProjectMaterials([]);
      setMaterials([]);
    }
    setIsLoading(false);
  };

  const markMaterialBookingComplete = async (projectId) => {
    try {
      await Project.update(projectId, { material_booking_completed: true });
      await loadData(); // Refresh list
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
  };

  const getProjectMaterials = (projectId) => {
    return projectMaterials.filter(pm => pm.project_id === projectId);
  };

  const getMaterialInfo = (materialId) => {
    return materials.find(m => m.id === materialId);
  };

  const getUnbookedMaterials = (projectId) => {
    const projectMats = getProjectMaterials(projectId);
    return projectMats.filter(pm => !pm.is_booked_in_psl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Offene Materialbuchungen</h1>
          <p className="text-gray-600">Projekte bei denen noch Materialien gebucht werden müssen</p>
          <div className="mt-4">
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {projects.length} offene Materialbuchungen
            </Badge>
          </div>
        </motion.div>

        <div className="space-y-4">
          {projects.map((project, index) => {
            const projectMats = getProjectMaterials(project.id);
            const unbookedMats = getUnbookedMaterials(project.id);
            
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="card-elevation border-none hover:shadow-lg transition-all">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Projekt Info */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
                          <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-gray-600 mb-3">
                            <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
                              {project.project_number}
                            </span>
                            <span className="font-mono bg-gray-50 text-gray-700 px-2 py-1 rounded">
                              SM: {project.sm_number}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{project.client}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              <span>{projectMats.length} Material{projectMats.length !== 1 ? 'ien' : ''} gesamt</span>
                            </div>
                            {project.start_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                              <span className="text-orange-600 font-medium">
                                {unbookedMats.length} nicht gebucht
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Material Details */}
                        {projectMats.length > 0 ? (
                          <div className="border-t pt-3">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              Benötigte Materialien:
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {projectMats.map(pm => {
                                const material = getMaterialInfo(pm.material_id);
                                if (!material) return null;
                                
                                return (
                                  <div 
                                    key={pm.id} 
                                    className={`p-2 md:p-3 rounded-lg border text-sm ${
                                      pm.is_booked_in_psl 
                                        ? 'bg-green-50 border-green-200 text-green-800' 
                                        : 'bg-orange-50 border-orange-200 text-orange-800'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{material.name}</p>
                                        <p className="text-xs opacity-75">Art.-Nr.: {material.article_number}</p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="font-bold">{pm.quantity} {material.unit}</p>
                                        <Badge 
                                          variant={pm.is_booked_in_psl ? 'default' : 'outline'}
                                          className="text-xs mt-1"
                                        >
                                          {pm.is_booked_in_psl ? 'Gebucht' : 'Offen'}
                                        </Badge>
                                      </div>
                                    </div>
                                    {pm.notes && (
                                      <p className="text-xs mt-1 opacity-75">{pm.notes}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="border-t pt-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Keine Materialien für dieses Projekt hinterlegt</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row lg:flex-col gap-2 lg:justify-start lg:items-end">
                        <Link to={createPageUrl(`ProjectDetail?id=${project.id}&tab=materials`)} className="flex-1 lg:flex-none">
                          <Button variant="outline" size="sm" className="w-full">
                            Materialien anzeigen
                          </Button>
                        </Link>
                        <Button 
                          onClick={() => markMaterialBookingComplete(project.id)}
                          className="bg-green-600 hover:bg-green-700 flex-1 lg:flex-none"
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
            );
          })}

          {projects.length === 0 && !isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Construction className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">
                Alle Materialbuchungen sind erledigt
              </h3>
              <p className="text-gray-400">
                Derzeit sind keine offenen Materialbuchungen vorhanden
              </p>
            </motion.div>
          )}

          {isLoading && (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Construction className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-gray-600">Materialbuchungen werden geladen...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from "react";
import { Project } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Layers, Calendar, User as UserIcon, MapPin, Eye, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SURFACE_CATEGORIES = [
  { 
    id: "asphalt_fein", 
    title: "Asphalt Fein", 
    status: "Kann zu Asphalt FEIN",
    color: "bg-slate-100 text-slate-800",
    description: "Projekte bereit für Asphalt-Feinschicht"
  },
  { 
    id: "asphalt_trag", 
    title: "Asphalt Trag", 
    status: "Kann zu Asphalt TRAG",
    color: "bg-gray-100 text-gray-800", 
    description: "Projekte bereit für Asphalt-Tragschicht"
  },
  { 
    id: "platten_pflaster", 
    title: "Platten/Pflaster", 
    status: "Kann zu Pflaster/Platten",
    color: "bg-amber-100 text-amber-800",
    description: "Projekte bereit für Platten- oder Pflasterarbeiten"
  },
  { 
    id: "verfuellen", 
    title: "Verfüllen", 
    status: "Kann zu VERFÜLLEN",
    color: "bg-orange-100 text-orange-800",
    description: "Projekte bereit zum Verfüllen"
  }
];

const NEXT_STATUSES = [
  "Kann zu VERFÜLLEN",
  "Kann zu Pflaster/Platten",
  "Kann zu Asphalt TRAG",
  "Kann zu Asphalt FEIN",
  "Baustelle fertig",
  "Auftrag komplett abgeschlossen"
];

export default function SurfacePage() {
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("asphalt_fein");
  const [searchTerm, setSearchTerm] = useState("");
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
      console.error("Fehler beim Laden der Projekte:", error);
      setProjects([]);
    }
    setIsLoading(false);
  };
  
  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await Project.update(projectId, { project_status: newStatus });
      await loadProjects(); // Refresh the list
    } catch (error) {
      console.error("Fehler bei der Statusänderung:", error);
    }
  };

  const getProjectsForCategory = (categoryId) => {
    const category = SURFACE_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return [];
    
    return projects.filter(project => {
      const matchesStatus = project.project_status === category.status;
      const matchesSearch = !searchTerm || 
        (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.project_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.client || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  };

  const activeCategory = SURFACE_CATEGORIES.find(c => c.id === activeTab);
  const activeProjects = getProjectsForCategory(activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Oberfläche</h1>
              <p className="text-gray-600">Verwaltung von Oberflächenarbeiten nach Kategorien</p>
            </div>
          </div>
        </motion.div>

        {/* Category Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {SURFACE_CATEGORIES.map((category) => {
            const categoryProjects = getProjectsForCategory(category.id);
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className={`card-elevation border-none cursor-pointer transition-all duration-300 ${
                    activeTab === category.id ? 'ring-2 ring-orange-500 shadow-lg' : ''
                  }`}
                  onClick={() => setActiveTab(category.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={category.color}>
                        {categoryProjects.length}
                      </Badge>
                      <Layers className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {category.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Search */}
        <Card className="card-elevation border-none mb-8">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Suche nach Projekt, Nummer oder Kunde..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Category Projects */}
        <Card className="card-elevation border-none">
          <CardContent className="p-0">
            <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{activeCategory?.title}</h2>
                  <p className="text-white/80">{activeProjects.length} Projekt{activeProjects.length !== 1 ? 'e' : ''}</p>
                </div>
                <Badge className="bg-white/20 text-white border-white/30">
                  {activeCategory?.status}
                </Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Lade Projekte...</p>
              </div>
            ) : activeProjects.length === 0 ? (
              <div className="p-16 text-center">
                <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">
                  Keine Projekte gefunden
                </h3>
                <p className="text-gray-400">
                  {searchTerm 
                    ? "Versuchen Sie andere Suchbegriffe" 
                    : `Aktuell sind keine Projekte im Status "${activeCategory?.status}" vorhanden.`
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projektnummer</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Bauleiter</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {activeProjects.map((project, index) => (
                      <motion.tr
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-orange-50/50 transition-colors"
                      >
                        <TableCell 
                          onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
                          className="cursor-pointer"
                        >
                          <span className="font-mono bg-orange-50 text-orange-700 px-3 py-1 rounded font-bold">
                            {project.project_number}
                          </span>
                        </TableCell>
                        <TableCell 
                          onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
                          className="cursor-pointer"
                        >
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                              {project.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              SM: {project.sm_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell 
                          onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{project.client}</span>
                          </div>
                        </TableCell>
                        <TableCell 
                          onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
                          className="cursor-pointer"
                        >
                          {project.start_date ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <div>
                                <div>{new Date(project.start_date).toLocaleDateString('de-DE')}</div>
                                {project.end_date && (
                                  <div className="text-xs text-gray-500">
                                    bis {new Date(project.end_date).toLocaleDateString('de-DE')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Nicht geplant</span>
                          )}
                        </TableCell>
                        <TableCell 
                          onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
                          className="cursor-pointer"
                        >
                          <span className="text-sm text-gray-600">
                            {project.assigned_foreman_name || 'Nicht zugewiesen'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuLabel>Status ändern</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {NEXT_STATUSES.filter(status => status !== project.project_status).map(status => (
                                    <DropdownMenuItem key={status} onClick={() => handleStatusChange(project.id, status)}>
                                        {status}
                                    </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self');
                              }}
                              className="hover:bg-orange-100"
                              title="Details anzeigen"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

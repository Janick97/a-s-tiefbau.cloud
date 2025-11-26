
import React, { useState, useEffect } from "react";
import { Project } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, FolderOpen, Calendar, User, Building } from "lucide-react";

const statusColors = {
  "Auftrag neu im Server": "bg-orange-100 text-orange-800",
  "Auftrag angelegt ohne VAO": "bg-yellow-100 text-yellow-800",
  "Auftrag neu VAO beantragt": "bg-amber-100 text-amber-800",
  "VAO bei Baubeginn": "bg-purple-100 text-purple-800",
  "Auftrag angelegt keine VAO nötig": "bg-green-100 text-green-800",
  "Folgeauftrag": "bg-cyan-100 text-cyan-800",
  "VAO von Projekt": "bg-indigo-100 text-indigo-800",
  "Jahresgenehmigung": "bg-pink-100 text-pink-800",
  "Aufgrabung beantragt": "bg-amber-100 text-amber-800",
  "Privat": "bg-gray-100 text-gray-800",
  "Storniert": "bg-red-100 text-red-800",
  "Baustelle bearbeiten": "bg-lime-100 text-lime-800",
  "Montage neu in Craftnote angelegt": "bg-teal-100 text-teal-800",
  "Montage fertig": "bg-emerald-100 text-emerald-800",
  "Planbare Baustelle begonnen": "bg-violet-100 text-violet-800",
  "Technisch fertig": "bg-sky-100 text-sky-800",
  "Kann zu VERFÜLLEN": "bg-rose-100 text-rose-800",
  "Kann zu Pflaster/Platten": "bg-fuchsia-100 text-fuchsia-800",
  "Kann zu Asphalt TRAG": "bg-slate-100 text-slate-800",
  "Kann zu Asphalt FEIN": "bg-stone-100 text-stone-800",
  "Baustelle fertig": "bg-green-200 text-green-900",
  "Auftrag komplett abgeschlossen": "bg-green-300 text-green-900",
  "Auftrag angelegt mit VAO von prj": "bg-blue-200 text-blue-900"
};

export default function ProjectStatusPage() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
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

  const safeProjects = Array.isArray(projects) ? projects : [];
  const filteredProjects = safeProjects.filter(project => {
    if (!project) return false;

    const matchesSearch =
      (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.project_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.client || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || project.project_status === statusFilter;
    const matchesOrderType = orderTypeFilter === "all" || project.order_type === orderTypeFilter;

    return matchesSearch && matchesStatus && matchesOrderType;
  });

  const statusGroups = {};
  filteredProjects.forEach(project => {
    const status = project.project_status || "Nicht definiert";
    if (!statusGroups[status]) {
      statusGroups[status] = [];
    }
    statusGroups[status].push(project);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Projekt-Status</h1>
            <p className="text-gray-600">Projekte nach Workflow-Status verwalten</p>
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="card-elevation border-none mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Suche nach Projekt, Nummer oder Kunde..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-64">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    {Object.keys(statusColors).map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                  <SelectTrigger className="w-48">
                    <Building className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Auftragsart filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Auftragsarten</SelectItem>
                    <SelectItem value="Kompakt-Entstörung">Kompakt-Entstörung</SelectItem>
                    <SelectItem value="Störung Tiefbau">Störung Tiefbau</SelectItem>
                    <SelectItem value="planbar">planbar</SelectItem>
                    <SelectItem value="Montage">Montage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Groups */}
        <div className="space-y-8">
          {Object.entries(statusGroups).map(([status, statusProjects]) => (
            <Card key={status} className="card-elevation border-none">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`${statusColors[status]} text-sm font-medium px-3 py-1`}
                    >
                      {status}
                    </Badge>
                    <span className="text-gray-500">({statusProjects.length})</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {statusProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-gray-900">{project.title}</h3>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
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
                            {project.contact_person && (
                              <div className="flex items-center gap-1">
                                <span>Ansprechpartner: {project.contact_person}</span>
                              </div>
                            )}
                            {project.order_type && (
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                <span>{project.order_type}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {project.start_date && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium text-gray-500 mb-2">
              Keine Projekte gefunden
            </h3>
            <p className="text-gray-400">
              Versuchen Sie andere Suchbegriffe oder Filter
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { Project } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { AlertTriangle, Calendar, FileText, Clock, AlertCircle, Search, X, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VAOMonitoringPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | expired | expiring
  const [expiryDaysFilter, setExpiryDaysFilter] = useState("3"); // 3 | 7 | 14 | 30 | all
  const [clientFilter, setClientFilter] = useState("all");

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

  const getVAOStatus = (project, warningDays = 30) => {
    if (!project || !project.vao_valid_to) return null;

    const today = new Date();
    const validTo = new Date(project.vao_valid_to);
    const diffTime = validTo - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', days: Math.abs(diffDays), color: 'bg-red-100 text-red-800' };
    } else if (diffDays <= warningDays) {
      return { status: 'expiring', days: diffDays, color: 'bg-orange-100 text-orange-800' };
    }
    return null;
  };

  const warningDays = expiryDaysFilter === "all" ? 9999 : parseInt(expiryDaysFilter);

  // Unique clients for filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = new Set(projects.map(p => p.client).filter(Boolean));
    return Array.from(clients).sort();
  }, [projects]);

  // All relevant projects (with VAO issues within selected warning window)
  const allCriticalProjects = useMemo(() => {
    return projects.filter(p => getVAOStatus(p, warningDays) !== null);
  }, [projects, warningDays]);

  // Apply all filters
  const filteredProjects = useMemo(() => {
    return allCriticalProjects.filter(project => {
      const vaoStatus = getVAOStatus(project, warningDays);

      // Status filter
      if (statusFilter !== "all" && vaoStatus?.status !== statusFilter) return false;

      // Client filter
      if (clientFilter !== "all" && project.client !== clientFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          project.title?.toLowerCase().includes(q) ||
          project.project_number?.toLowerCase().includes(q) ||
          project.client?.toLowerCase().includes(q) ||
          project.city?.toLowerCase().includes(q) ||
          project.sm_number?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allCriticalProjects, statusFilter, clientFilter, searchQuery, warningDays]);

  const expiredProjects = filteredProjects.filter(p => getVAOStatus(p, warningDays)?.status === 'expired');
  const expiringProjects = filteredProjects.filter(p => getVAOStatus(p, warningDays)?.status === 'expiring');

  const hasActiveFilters = searchQuery || statusFilter !== "all" || expiryDaysFilter !== "3" || clientFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setExpiryDaysFilter("3");
    setClientFilter("all");
  };

  const renderProjectRow = (project, index, hoverClass) => {
    const vaoStatus = getVAOStatus(project, warningDays);
    return (
      <motion.div
        key={project.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`p-4 border-b last:border-b-0 ${hoverClass} transition-colors`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={vaoStatus.color}>
                {vaoStatus.status === 'expired'
                  ? `Seit ${vaoStatus.days} Tag${vaoStatus.days === 1 ? '' : 'en'} abgelaufen`
                  : vaoStatus.days === 0
                    ? 'Läuft heute ab'
                    : `Läuft in ${vaoStatus.days} Tag${vaoStatus.days === 1 ? '' : 'en'} ab`}
              </Badge>
              <Badge variant="outline">{project.project_number}</Badge>
              {project.vao_status && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">{project.vao_status}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              {project.client && <span>Kunde: <strong>{project.client}</strong></span>}
              {project.city && <span>Stadt: <strong>{project.city}</strong></span>}
              {project.sm_number && <span>SM-Nr: <strong>{project.sm_number}</strong></span>}
              <span>VAO gültig bis: <strong>{new Date(project.vao_valid_to).toLocaleDateString('de-DE')}</strong></span>
            </div>
          </div>
          <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)} className="flex-shrink-0">
            <Button variant="outline" size="sm">Details</Button>
          </Link>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">VAO-Überwachung</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  <p className="text-sm text-gray-600">Laufen bald ab</p>
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
                  {hasActiveFilters && (
                    <p className="text-xs text-gray-400">von {allCriticalProjects.length} gesamt</p>
                  )}
                </div>
                <div className="p-3 rounded-full bg-gray-100">
                  <Clock className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Projekt, Nummer, Kunde, Stadt suchen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="expired">Abgelaufen</SelectItem>
                  <SelectItem value="expiring">Läuft ab</SelectItem>
                </SelectContent>
              </Select>

              {/* Expiry window filter */}
              <Select value={expiryDaysFilter} onValueChange={setExpiryDaysFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Zeitraum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Nächste 3 Tage</SelectItem>
                  <SelectItem value="7">Nächste 7 Tage</SelectItem>
                  <SelectItem value="14">Nächste 14 Tage</SelectItem>
                  <SelectItem value="30">Nächste 30 Tage</SelectItem>
                  <SelectItem value="all">Alle ablaufenden</SelectItem>
                </SelectContent>
              </Select>

              {/* Client filter */}
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Kunde" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  {uniqueClients.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reset */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-500 hover:text-gray-800">
                  <X className="w-4 h-4 mr-1" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expired VAOs */}
        {expiredProjects.length > 0 && (
          <Card className="card-elevation border-none mb-6">
            <CardHeader className="bg-red-50 border-b py-4">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                Abgelaufene VAOs ({expiredProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expiredProjects.map((project, index) => renderProjectRow(project, index, "hover:bg-red-50"))}
            </CardContent>
          </Card>
        )}

        {/* Expiring VAOs */}
        {expiringProjects.length > 0 && (
          <Card className="card-elevation border-none mb-6">
            <CardHeader className="bg-orange-50 border-b py-4">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Laufen bald ab ({expiringProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expiringProjects.map((project, index) => renderProjectRow(project, index, "hover:bg-orange-50"))}
            </CardContent>
          </Card>
        )}

        {filteredProjects.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            {hasActiveFilters ? (
              <>
                <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">Keine Ergebnisse</h3>
                <p className="text-gray-400 mb-4">Keine Projekte entsprechen den gewählten Filtern.</p>
                <Button variant="outline" onClick={resetFilters}>Filter zurücksetzen</Button>
              </>
            ) : (
              <>
                <Calendar className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">Alle VAOs sind aktuell</h3>
                <p className="text-gray-400">Es gibt keine ablaufenden oder abgelaufenen Verkehrsanordnungen</p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
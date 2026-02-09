import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  FolderOpen, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  Calendar,
  Construction,
  Package,
  FileText,
  Settings,
  DollarSign,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard({ 
  projects, 
  excavations, 
  montageAuftraege, 
  users, 
  tasks,
  widgetSettings,
  onToggleWidget 
}) {
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'completed').length;
    const totalProjects = projects.length;
    const openExcavations = excavations.filter(e => !e.is_closed).length;
    const totalExcavations = excavations.length;
    const openMontage = montageAuftraege.filter(m => m.status !== 'Montage abgeschlossen').length;
    const teamMembers = users.length;
    const openTasks = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;

    // Materialbuchungen und Dokumentation
    const projectsWithoutMaterial = projects.filter(p => 
      p.status !== 'completed' && !p.material_booking_completed
    ).length;
    const projectsWithoutDocs = projects.filter(p => 
      p.status !== 'completed' && !p.documentation_completed
    ).length;

    // VAO-Warnungen (läuft in nächsten 7 Tagen ab)
    const vaoWarnings = projects.filter(p => {
      if (!p.vao_valid_to) return false;
      const daysRemaining = Math.ceil((new Date(p.vao_valid_to) - new Date()) / (1000 * 60 * 60 * 24));
      return daysRemaining > 0 && daysRemaining <= 7;
    }).length;

    // Gesamtumsatz Tiefbau
    const totalRevenue = excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0);

    return {
      activeProjects,
      totalProjects,
      openExcavations,
      totalExcavations,
      openMontage,
      teamMembers,
      openTasks,
      projectsWithoutMaterial,
      projectsWithoutDocs,
      vaoWarnings,
      totalRevenue
    };
  }, [projects, excavations, montageAuftraege, users, tasks]);

  const recentProjects = useMemo(() => {
    return projects
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5);
  }, [projects]);

  const criticalIssues = useMemo(() => {
    const issues = [];
    
    if (stats.vaoWarnings > 0) {
      issues.push({
        type: 'warning',
        title: `${stats.vaoWarnings} VAO(s) laufen bald ab`,
        link: createPageUrl('VAOMonitoring')
      });
    }
    
    if (stats.projectsWithoutMaterial > 0) {
      issues.push({
        type: 'warning',
        title: `${stats.projectsWithoutMaterial} Projekt(e) ohne Materialbuchung`,
        link: createPageUrl('OpenMaterialBookings')
      });
    }
    
    if (stats.projectsWithoutDocs > 0) {
      issues.push({
        type: 'info',
        title: `${stats.projectsWithoutDocs} Projekt(e) ohne Dokumentation`,
        link: createPageUrl('OpenDocumentations')
      });
    }

    return issues;
  }, [stats]);

  const widgets = [
    { id: 'stats', title: 'Übersicht', default: true },
    { id: 'projects', title: 'Aktuelle Projekte', default: true },
    { id: 'issues', title: 'Kritische Punkte', default: true },
    { id: 'team', title: 'Team-Übersicht', default: true },
    { id: 'revenue', title: 'Umsatz', default: true }
  ];

  const isWidgetVisible = (widgetId) => {
    return widgetSettings[widgetId] !== false;
  };

  return (
    <div className="space-y-6">
      {/* Widget Settings */}
      <Card className="card-elevation border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Dashboard anpassen
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {widgets.map(widget => (
              <Button
                key={widget.id}
                variant={isWidgetVisible(widget.id) ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleWidget(widget.id)}
              >
                {widget.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {isWidgetVisible('stats') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aktive Projekte</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.activeProjects}</h3>
                    <p className="text-xs text-gray-500 mt-1">von {stats.totalProjects} gesamt</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Offene Ausgrabungen</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.openExcavations}</h3>
                    <p className="text-xs text-gray-500 mt-1">von {stats.totalExcavations} gesamt</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Construction className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Offene Montageaufträge</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.openMontage}</h3>
                    <p className="text-xs text-gray-500 mt-1">In Bearbeitung</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Offene Aufgaben</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.openTasks}</h3>
                    <p className="text-xs text-gray-500 mt-1">Zu erledigen</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Revenue Widget */}
      {isWidgetVisible('revenue') && (
        <Card className="card-elevation border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Gesamtumsatz Tiefbau
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              €{stats.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-gray-600 mt-2">Basierend auf {stats.totalExcavations} Ausgrabungen</p>
          </CardContent>
        </Card>
      )}

      {/* Critical Issues */}
      {isWidgetVisible('issues') && criticalIssues.length > 0 && (
        <Card className="card-elevation border-none border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Kritische Punkte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalIssues.map((issue, idx) => (
                <Link key={idx} to={issue.link}>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                    <span className="text-sm font-medium text-gray-900">{issue.title}</span>
                    <Badge variant={issue.type === 'warning' ? 'destructive' : 'outline'}>
                      Anzeigen
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        {isWidgetVisible('projects') && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Neueste Projekte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProjects.map(project => (
                  <Link key={project.id} to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{project.project_number}</p>
                        <p className="text-xs text-gray-600">{project.title}</p>
                      </div>
                      <Badge variant="outline">{project.order_type}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Overview */}
        {isWidgetVisible('team') && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team-Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gesamt Mitarbeiter</span>
                  <span className="text-2xl font-bold">{stats.teamMembers}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Bauleiter</span>
                    <span className="font-medium">
                      {users.filter(u => u.position === 'Bauleiter').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Monteure</span>
                    <span className="font-medium">
                      {users.filter(u => u.position === 'Monteur').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Oberfläche</span>
                    <span className="font-medium">
                      {users.filter(u => u.position === 'Oberfläche').length}
                    </span>
                  </div>
                </div>
                <Link to={createPageUrl('KolonnenUebersicht')}>
                  <Button className="w-full" variant="outline" size="sm">
                    Zur Kolonnenübersicht
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
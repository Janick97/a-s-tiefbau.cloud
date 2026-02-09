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
  TrendingUp, 
  Calendar,
  Construction,
  Target,
  Award,
  Clock,
  Settings,
  Zap,
  Package,
  FileText,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import WeatherWidget from "./WeatherWidget";

export default function BauleiterDashboard({ 
  projects, 
  excavations, 
  user,
  tasks,
  sollwert,
  widgetSettings,
  onToggleWidget 
}) {
  // Eigene Projekte filtern
  const myProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.assigned_bauleiter && Array.isArray(p.assigned_bauleiter)) {
        return p.assigned_bauleiter.some(bl => bl.id === user.id);
      }
      return p.assigned_foreman_id === user.id;
    });
  }, [projects, user]);

  const myActiveProjects = useMemo(() => {
    return myProjects.filter(p => !p.foreman_completed);
  }, [myProjects]);

  // Eigene Ausgrabungen
  const myExcavations = useMemo(() => {
    const lowerUserName = user.full_name?.toLowerCase() || '';
    const lowerUserEmail = user.email?.toLowerCase() || '';
    
    return excavations.filter(exc => {
      const lowerForeman = exc.foreman?.toLowerCase() || '';
      const lowerCreatedBy = exc.created_by?.toLowerCase() || '';
      
      return exc.foreman_user_id === user.id ||
             lowerForeman.includes(lowerUserName.split(' ')[0]) ||
             lowerCreatedBy === lowerUserEmail ||
             exc.created_by === user.email;
    });
  }, [excavations, user]);

  // Performance Berechnung
  const performance = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthExcavations = myExcavations.filter(exc => {
      if (!exc.created_date) return false;
      const excMonth = new Date(exc.created_date).toISOString().substring(0, 7);
      return excMonth === currentMonth;
    });

    const earned = monthExcavations.reduce((sum, exc) => sum + (exc.foreman_commission || 0), 0);
    const target = sollwert ? Math.abs(sollwert.sollwert) : 20000;
    const percentage = (earned / target) * 100;

    return {
      earned,
      target,
      percentage: Math.abs(percentage),
      remaining: Math.abs(target - earned)
    };
  }, [myExcavations, sollwert]);

  // Offene Ausgrabungen
  const openExcavations = useMemo(() => {
    return myExcavations.filter(exc => !exc.is_closed);
  }, [myExcavations]);

  // Meine Aufgaben
  const myTasks = useMemo(() => {
    return tasks.filter(t => 
      t.assigned_to_user_id === user.id && 
      (t.status === 'open' || t.status === 'in_progress')
    );
  }, [tasks, user]);

  // Kommende Termine
  const upcomingDeadlines = useMemo(() => {
    const deadlines = [];
    
    myActiveProjects.forEach(project => {
      if (project.vao_valid_to) {
        const daysRemaining = Math.ceil((new Date(project.vao_valid_to) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0 && daysRemaining <= 14) {
          deadlines.push({
            type: 'VAO',
            project: project.project_number,
            date: project.vao_valid_to,
            daysRemaining,
            urgent: daysRemaining <= 7
          });
        }
      }
    });

    myTasks.forEach(task => {
      if (task.due_date) {
        const daysRemaining = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysRemaining >= 0 && daysRemaining <= 7) {
          deadlines.push({
            type: 'Aufgabe',
            task: task.title,
            date: task.due_date,
            daysRemaining,
            urgent: daysRemaining <= 2
          });
        }
      }
    });

    return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [myActiveProjects, myTasks]);

  const recentExcavations = useMemo(() => {
    return myExcavations
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5);
  }, [myExcavations]);

  const widgets = [
    { id: 'performance', title: 'Performance', default: true },
    { id: 'stats', title: 'Statistiken', default: true },
    { id: 'projects', title: 'Projekte', default: true },
    { id: 'deadlines', title: 'Termine', default: true },
    { id: 'tasks', title: 'Aufgaben', default: true },
    { id: 'excavations', title: 'Ausgrabungen', default: false },
    { id: 'quickActions', title: 'Schnellzugriff', default: false },
    { id: 'weather', title: 'Wetter', default: false }
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

      {/* Performance Card */}
      {isWidgetVisible('performance') && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="card-elevation border-none bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Meine Performance - {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Erreicht</p>
                  <p className="text-3xl font-bold text-green-600">€{performance.earned.toLocaleString('de-DE')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Soll</p>
                  <p className="text-3xl font-bold text-gray-900">€{performance.target.toLocaleString('de-DE')}</p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Fortschritt</span>
                  <span className="text-lg font-bold">{Math.round(performance.percentage)}%</span>
                </div>
                <Progress value={Math.min(performance.percentage, 100)} className="h-3" />
              </div>

              <div className="p-3 bg-white/70 rounded-lg">
                <p className="text-sm text-gray-600">
                  {performance.percentage >= 100 
                    ? `🎉 Ziel erreicht! ${Math.round(performance.percentage - 100)}% über Soll`
                    : `Noch €${performance.remaining.toLocaleString('de-DE')} bis zum Ziel`
                  }
                </p>
              </div>

              <Link to={createPageUrl('Analytics')}>
                <Button className="w-full" variant="outline">
                  Detaillierte Auswertung ansehen
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      {isWidgetVisible('stats') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aktive Projekte</p>
                  <h3 className="text-3xl font-bold text-gray-900">{myActiveProjects.length}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Offene Ausgrabungen</p>
                  <h3 className="text-3xl font-bold text-gray-900">{openExcavations.length}</h3>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Construction className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Offene Aufgaben</p>
                  <h3 className="text-3xl font-bold text-gray-900">{myTasks.length}</h3>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Active Projects */}
        {isWidgetVisible('projects') && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Meine aktuellen Projekte
                </CardTitle>
                <Link to={createPageUrl('MyProjects')}>
                  <Button variant="outline" size="sm">Alle ansehen</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myActiveProjects.slice(0, 5).map(project => (
                  <Link key={project.id} to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{project.project_number}</p>
                        <p className="text-xs text-gray-600">{project.city} - {project.street}</p>
                      </div>
                      <Badge variant="outline">{project.project_status}</Badge>
                    </div>
                  </Link>
                ))}
                {myActiveProjects.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Keine aktiven Projekte</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Deadlines */}
        {isWidgetVisible('deadlines') && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Kommende Termine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.map((deadline, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg ${
                      deadline.urgent ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={deadline.urgent ? 'destructive' : 'outline'} className="text-xs">
                            {deadline.type}
                          </Badge>
                          {deadline.urgent && <AlertTriangle className="w-4 h-4 text-red-600" />}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {deadline.project || deadline.task}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(deadline.date).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${deadline.urgent ? 'text-red-600' : 'text-orange-600'}`}>
                          {deadline.daysRemaining}
                        </p>
                        <p className="text-xs text-gray-600">Tage</p>
                      </div>
                    </div>
                  </div>
                ))}
                {upcomingDeadlines.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Keine anstehenden Termine</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Tasks */}
        {isWidgetVisible('tasks') && (
          <Card className="card-elevation border-none lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Meine Aufgaben
                </CardTitle>
                <Link to={createPageUrl('Tasks')}>
                  <Button variant="outline" size="sm">Alle ansehen</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myTasks.slice(0, 6).map(task => (
                  <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm text-gray-900 flex-1">{task.title}</p>
                      <Badge variant={task.priority === 'urgent' ? 'destructive' : 'outline'} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                ))}
                {myTasks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4 col-span-2">Keine offenen Aufgaben</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Excavations */}
        {isWidgetVisible('excavations') && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="w-5 h-5" />
                Letzte Ausgrabungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentExcavations.map(excavation => (
                  <div key={excavation.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-sm text-gray-900">{excavation.location_name}</p>
                    <p className="text-xs text-gray-600">{excavation.street} - {excavation.city}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant={excavation.is_closed ? 'default' : 'outline'} className="text-xs">
                        {excavation.is_closed ? 'Geschlossen' : 'Offen'}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        €{(excavation.foreman_commission || 0).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </div>
                ))}
                {recentExcavations.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Keine Ausgrabungen</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {isWidgetVisible('quickActions') && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Schnellzugriff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link to={createPageUrl('MyProjects')}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <FolderOpen className="w-5 h-5" />
                    <span className="text-xs">Projekte</span>
                  </Button>
                </Link>
                <Link to={createPageUrl('BaustellenModus')}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Construction className="w-5 h-5" />
                    <span className="text-xs">Baustelle</span>
                  </Button>
                </Link>
                <Link to={createPageUrl('Analytics')}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-xs">Auswertung</span>
                  </Button>
                </Link>
                <Link to={createPageUrl('Tasks')}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-xs">Aufgaben</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weather Widget */}
        {isWidgetVisible('weather') && <WeatherWidget />}
      </div>
    </div>
  );
}
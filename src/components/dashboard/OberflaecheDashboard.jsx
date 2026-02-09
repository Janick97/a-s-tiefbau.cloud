import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Layers, 
  CheckCircle, 
  Target,
  Award,
  Clock,
  Settings,
  TrendingUp,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";

export default function OberflaecheDashboard({ 
  excavations, 
  user,
  tasks,
  sollwert,
  widgetSettings,
  onToggleWidget 
}) {
  // Eigene Arbeiten filtern
  const myWork = useMemo(() => {
    const backfilled = excavations.filter(exc => 
      exc.backfilled_by_user_id === user.id || exc.backfilled_by === user.full_name
    );
    
    const closed = excavations.filter(exc => 
      exc.closed_by_user_id === user.id || exc.closed_by === user.full_name
    );

    return { backfilled, closed };
  }, [excavations, user]);

  // Performance Berechnung
  const performance = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const monthBackfills = myWork.backfilled.filter(exc => {
      if (!exc.backfilled_date) return false;
      const excMonth = new Date(exc.backfilled_date).toISOString().substring(0, 7);
      return excMonth === currentMonth;
    });

    const monthClosures = myWork.closed.filter(exc => {
      if (!exc.closed_date) return false;
      const excMonth = new Date(exc.closed_date).toISOString().substring(0, 7);
      return excMonth === currentMonth;
    });

    const backfillRevenue = monthBackfills.reduce((sum, exc) => sum + (exc.backfill_commission || 0), 0);
    const surfaceRevenue = monthClosures.reduce((sum, exc) => sum + (exc.surface_commission || 0), 0);
    const earned = backfillRevenue + surfaceRevenue;
    
    const target = sollwert ? Math.abs(sollwert.sollwert) : 10000;
    const percentage = (earned / target) * 100;

    return {
      earned,
      target,
      percentage: Math.abs(percentage),
      backfillCount: monthBackfills.length,
      closureCount: monthClosures.length,
      remaining: Math.abs(target - earned)
    };
  }, [myWork, sollwert]);

  // Offene Ausgrabungen die auf Oberfläche warten
  const waitingForSurface = useMemo(() => {
    return excavations.filter(exc => 
      exc.is_backfilled && !exc.is_closed
    );
  }, [excavations]);

  // Meine Aufgaben
  const myTasks = useMemo(() => {
    return tasks.filter(t => 
      t.assigned_to_user_id === user.id && 
      (t.status === 'open' || t.status === 'in_progress')
    );
  }, [tasks, user]);

  const widgets = [
    { id: 'performance', title: 'Meine Performance', default: true },
    { id: 'stats', title: 'Übersicht', default: true },
    { id: 'waiting', title: 'Wartend auf Oberfläche', default: true },
    { id: 'tasks', title: 'Aufgaben', default: true }
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
          <Card className="card-elevation border-none bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/70 rounded-lg">
                  <p className="text-xs text-gray-600">Verfüllt</p>
                  <p className="text-2xl font-bold text-blue-600">{performance.backfillCount}</p>
                </div>
                <div className="p-3 bg-white/70 rounded-lg">
                  <p className="text-xs text-gray-600">Geschlossen</p>
                  <p className="text-2xl font-bold text-green-600">{performance.closureCount}</p>
                </div>
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
                  <p className="text-sm text-gray-600">Gesamt verfüllt</p>
                  <h3 className="text-3xl font-bold text-gray-900">{myWork.backfilled.length}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Layers className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gesamt geschlossen</p>
                  <h3 className="text-3xl font-bold text-gray-900">{myWork.closed.length}</h3>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Warten auf Oberfläche</p>
                  <h3 className="text-3xl font-bold text-gray-900">{waitingForSurface.length}</h3>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting for Surface */}
        {isWidgetVisible('waiting') && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Wartend auf Oberfläche
                </CardTitle>
                <Link to={createPageUrl('MyProjectsOberflaeche')}>
                  <Button variant="outline" size="sm">Alle ansehen</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {waitingForSurface.slice(0, 5).map(excavation => (
                  <Link key={excavation.id} to={createPageUrl(`ExcavationDetail?id=${excavation.id}`)}>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{excavation.location_name}</p>
                        <p className="text-xs text-gray-600">{excavation.street} - {excavation.city}</p>
                      </div>
                      <Badge variant="outline">Verfüllt</Badge>
                    </div>
                  </Link>
                ))}
                {waitingForSurface.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Keine wartenden Ausgrabungen</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Tasks */}
        {isWidgetVisible('tasks') && (
          <Card className="card-elevation border-none">
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
              <div className="space-y-3">
                {myTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm text-gray-900 flex-1">{task.title}</p>
                      <Badge variant={task.priority === 'urgent' ? 'destructive' : 'outline'} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                ))}
                {myTasks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Keine offenen Aufgaben</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
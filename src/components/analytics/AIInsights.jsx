import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Activity, 
  Loader2,
  CheckCircle,
  Clock,
  Target,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIInsights({ projects, excavations, selectedMonth, user }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    patterns: true,
    delays: true,
    optimizations: true,
    summary: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateAIInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Daten für den ausgewählten Monat filtern
      const monthExcavations = excavations.filter(exc => {
        if (!exc.created_date) return false;
        const excDate = new Date(exc.created_date);
        const excMonth = excDate.toISOString().substring(0, 7);
        return excMonth === selectedMonth;
      });

      const monthProjects = projects.filter(proj => {
        if (!proj.created_date) return false;
        const projDate = new Date(proj.created_date);
        const projMonth = projDate.toISOString().substring(0, 7);
        return projMonth === selectedMonth;
      });

      // Datenaufbereitung für KI-Analyse
      const excavationStats = {
        total: monthExcavations.length,
        completed: monthExcavations.filter(e => e.is_closed).length,
        backfilled: monthExcavations.filter(e => e.is_backfilled && !e.is_closed).length,
        open: monthExcavations.filter(e => !e.is_backfilled && !e.is_closed).length,
        avgDepth: monthExcavations.reduce((sum, e) => sum + (e.excavation_depth || 0), 0) / monthExcavations.length || 0,
        avgLength: monthExcavations.reduce((sum, e) => sum + (e.excavation_length || 0), 0) / monthExcavations.length || 0,
        totalRevenue: monthExcavations.reduce((sum, e) => sum + (e.calculated_price || 0), 0),
        surfaceTypes: monthExcavations.reduce((acc, e) => {
          if (e.surface_type) {
            acc[e.surface_type] = (acc[e.surface_type] || 0) + 1;
          }
          return acc;
        }, {})
      };

      const projectStats = {
        total: monthProjects.length,
        active: monthProjects.filter(p => p.status === 'active').length,
        completed: monthProjects.filter(p => p.status === 'completed').length,
        planning: monthProjects.filter(p => p.status === 'planning').length,
        onHold: monthProjects.filter(p => p.status === 'on_hold').length,
        orderTypes: monthProjects.reduce((acc, p) => {
          if (p.order_type) {
            acc[p.order_type] = (acc[p.order_type] || 0) + 1;
          }
          return acc;
        }, {})
      };

      // Zeitbasierte Analyse
      const timeAnalysis = monthExcavations.map(exc => {
        const created = exc.created_date ? new Date(exc.created_date) : null;
        const backfilled = exc.backfilled_date ? new Date(exc.backfilled_date) : null;
        const closed = exc.closed_date ? new Date(exc.closed_date) : null;

        let backfillDuration = null;
        let closureDuration = null;

        if (created && backfilled) {
          backfillDuration = Math.floor((backfilled - created) / (1000 * 60 * 60 * 24));
        }

        if (backfilled && closed) {
          closureDuration = Math.floor((closed - backfilled) / (1000 * 60 * 60 * 24));
        }

        return {
          backfillDuration,
          closureDuration,
          surfaceType: exc.surface_type,
          foreman: exc.foreman
        };
      }).filter(item => item.backfillDuration !== null || item.closureDuration !== null);

      const avgBackfillDuration = timeAnalysis
        .filter(t => t.backfillDuration !== null)
        .reduce((sum, t) => sum + t.backfillDuration, 0) / 
        timeAnalysis.filter(t => t.backfillDuration !== null).length || 0;

      const avgClosureDuration = timeAnalysis
        .filter(t => t.closureDuration !== null)
        .reduce((sum, t) => sum + t.closureDuration, 0) / 
        timeAnalysis.filter(t => t.closureDuration !== null).length || 0;

      // Prompt für KI-Analyse erstellen
      const prompt = `Du bist ein Experte für Baustellenmanagement und Tiefbau. Analysiere die folgenden Daten für ${new Date(selectedMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })} und erstelle einen umfassenden Analysebericht:

AUSGRABUNGEN (${excavationStats.total} gesamt):
- Fertiggestellt: ${excavationStats.completed}
- Verfüllt (Oberfläche offen): ${excavationStats.backfilled}
- Offen: ${excavationStats.open}
- Durchschnittliche Tiefe: ${excavationStats.avgDepth.toFixed(2)}m
- Durchschnittliche Länge: ${excavationStats.avgLength.toFixed(2)}m
- Gesamtumsatz: €${Math.round(excavationStats.totalRevenue).toLocaleString('de-DE')}
- Oberflächentypen: ${JSON.stringify(excavationStats.surfaceTypes)}

PROJEKTE (${projectStats.total} gesamt):
- Aktiv: ${projectStats.active}
- Abgeschlossen: ${projectStats.completed}
- In Planung: ${projectStats.planning}
- Pausiert: ${projectStats.onHold}
- Auftragstypen: ${JSON.stringify(projectStats.orderTypes)}

ZEITANALYSE:
- Durchschnittliche Zeit bis Verfüllung: ${avgBackfillDuration.toFixed(1)} Tage
- Durchschnittliche Zeit von Verfüllung bis Fertigstellung: ${avgClosureDuration.toFixed(1)} Tage

Erstelle eine detaillierte Analyse mit folgenden Abschnitten:

1. MUSTER & TRENDS: Erkenne 3-5 signifikante Muster in den Daten (z.B. häufigste Oberflächentypen, Projektverteilung, Effizienztrends)

2. VERZÖGERUNGSRISIKEN: Identifiziere 3-5 potenzielle Risiken oder Verzögerungsquellen basierend auf den Daten (z.B. hohe Anzahl offener Ausgrabungen, lange Bearbeitungszeiten, Engpässe)

3. OPTIMIERUNGSEMPFEHLUNGEN: Gib 4-6 konkrete, umsetzbare Empfehlungen zur Verbesserung der Arbeitsabläufe, Effizienz und Produktivität

4. ZUSAMMENFASSUNG: Erstelle eine Executive Summary (3-4 Sätze) mit den wichtigsten Erkenntnissen und Handlungsempfehlungen

Formatiere die Antwort als JSON mit dieser Struktur:
{
  "patterns": [{"title": "...", "description": "...", "severity": "info|warning|success"}],
  "delays": [{"title": "...", "description": "...", "impact": "low|medium|high", "recommendation": "..."}],
  "optimizations": [{"title": "...", "description": "...", "priority": "low|medium|high", "expectedImpact": "..."}],
  "summary": "..."
}

Sei konkret, datenbasiert und praxisorientiert. Nutze die tatsächlichen Zahlen aus den Daten.`;

      // KI-Analyse durchführen
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "success"] }
                }
              }
            },
            delays: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string", enum: ["low", "medium", "high"] },
                  recommendation: { type: "string" }
                }
              }
            },
            optimizations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  expectedImpact: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setInsights(response);
    } catch (err) {
      console.error("Fehler bei KI-Analyse:", err);
      setError("Die KI-Analyse konnte nicht durchgeführt werden. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-purple-100 text-purple-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="card-elevation border-none bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">KI-gestützte Baustellenanalyse</h3>
              <p className="text-sm text-gray-600">Intelligente Muster- und Optimierungserkennung</p>
            </div>
          </div>
          {!insights && (
            <Button 
              onClick={generateAIInsights}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analysiere...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  KI-Analyse starten
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Fehler</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!insights && !isLoading && !error && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bereit für intelligente Einblicke
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Starten Sie die KI-Analyse, um detaillierte Muster, Verzögerungsrisiken und Optimierungsempfehlungen für Ihre Baustellen zu erhalten.
            </p>
          </div>
        )}

        <AnimatePresence>
          {insights && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Zusammenfassung */}
              <div className="bg-white rounded-xl p-6 border-2 border-indigo-200">
                <button
                  onClick={() => toggleSection('summary')}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-lg font-bold text-gray-900">Executive Summary</h4>
                  </div>
                  {expandedSections.summary ? 
                    <ChevronUp className="w-5 h-5 text-gray-500" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  }
                </button>
                {expandedSections.summary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
                  </motion.div>
                )}
              </div>

              {/* Muster & Trends */}
              <div className="bg-white rounded-xl p-6 border-2 border-blue-200">
                <button
                  onClick={() => toggleSection('patterns')}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-bold text-gray-900">Erkannte Muster & Trends</h4>
                    <Badge variant="outline" className="bg-blue-50">
                      {insights.patterns?.length || 0}
                    </Badge>
                  </div>
                  {expandedSections.patterns ? 
                    <ChevronUp className="w-5 h-5 text-gray-500" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  }
                </button>
                {expandedSections.patterns && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {insights.patterns?.map((pattern, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border-2 ${getSeverityColor(pattern.severity)}`}
                      >
                        <h5 className="font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          {pattern.title}
                        </h5>
                        <p className="text-sm opacity-90">{pattern.description}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Verzögerungsrisiken */}
              <div className="bg-white rounded-xl p-6 border-2 border-orange-200">
                <button
                  onClick={() => toggleSection('delays')}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <h4 className="text-lg font-bold text-gray-900">Verzögerungsrisiken</h4>
                    <Badge variant="outline" className="bg-orange-50">
                      {insights.delays?.length || 0}
                    </Badge>
                  </div>
                  {expandedSections.delays ? 
                    <ChevronUp className="w-5 h-5 text-gray-500" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  }
                </button>
                {expandedSections.delays && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {insights.delays?.map((delay, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-lg border-2 border-gray-200 bg-white"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-600" />
                            {delay.title}
                          </h5>
                          <Badge className={getImpactColor(delay.impact)}>
                            {delay.impact === 'high' ? 'Hoch' : delay.impact === 'medium' ? 'Mittel' : 'Niedrig'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{delay.description}</p>
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Empfehlung:</p>
                          <p className="text-sm text-blue-800">{delay.recommendation}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Optimierungsempfehlungen */}
              <div className="bg-white rounded-xl p-6 border-2 border-green-200">
                <button
                  onClick={() => toggleSection('optimizations')}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-3">
                    <Lightbulb className="w-5 h-5 text-green-600" />
                    <h4 className="text-lg font-bold text-gray-900">Optimierungsempfehlungen</h4>
                    <Badge variant="outline" className="bg-green-50">
                      {insights.optimizations?.length || 0}
                    </Badge>
                  </div>
                  {expandedSections.optimizations ? 
                    <ChevronUp className="w-5 h-5 text-gray-500" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  }
                </button>
                {expandedSections.optimizations && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {insights.optimizations?.map((opt, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-lg border-2 border-gray-200 bg-white"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold flex items-center gap-2">
                            <Target className="w-4 h-4 text-green-600" />
                            {opt.title}
                          </h5>
                          <Badge className={getPriorityColor(opt.priority)}>
                            {opt.priority === 'high' ? 'Hoch' : opt.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{opt.description}</p>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs font-semibold text-green-900 mb-1">Erwarteter Effekt:</p>
                          <p className="text-sm text-green-800">{opt.expectedImpact}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Neue Analyse Button */}
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={generateAIInsights}
                  disabled={isLoading}
                  variant="outline"
                  className="border-2 border-purple-300 hover:bg-purple-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analysiere erneut...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Neue Analyse durchführen
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
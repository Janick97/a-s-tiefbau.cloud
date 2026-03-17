import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  FolderOpen, 
  AlertTriangle, 
  Construction,
  Package,
  FileText,
  Settings,
  BarChart3,
  ClipboardList,
  Layers,
  Network,
  Users,
  Shovel,
  MapPin,
  Wrench,
  CheckSquare,
  TrendingUp,
  Car,
  Upload,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard({ 
  projects, 
  excavations, 
  montageAuftraege, 
  users, 
  tasks
}) {
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'completed').length;
    const totalProjects = projects.length;
    const openMontage = montageAuftraege.filter(m => m.status !== 'Montage abgeschlossen').length;
    const openTasks = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const projectsWithoutMaterial = projects.filter(p => !p.material_booking_completed).length;
    const projectsWithoutDocs = projects.filter(p => !p.documentation_completed).length;
    const vaoWarnings = projects.filter(p => {
      if (!p.vao_valid_to) return false;
      const daysRemaining = Math.ceil((new Date(p.vao_valid_to) - new Date()) / (1000 * 60 * 60 * 24));
      return daysRemaining >= 0 && daysRemaining <= 7;
    }).length;
    const totalRevenue = excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0);

    return { activeProjects, totalProjects, openMontage, openTasks, projectsWithoutMaterial, projectsWithoutDocs, vaoWarnings, totalRevenue };
  }, [projects, excavations, montageAuftraege, tasks]);

  const alerts = useMemo(() => {
    const list = [];
    if (stats.vaoWarnings > 0)
      list.push({ label: `${stats.vaoWarnings} VAO(s) laufen in ≤7 Tagen ab`, link: createPageUrl('VAOMonitoring'), urgent: true });
    if (stats.projectsWithoutMaterial > 0)
      list.push({ label: `${stats.projectsWithoutMaterial} Projekt(e) ohne Materialbuchung`, link: createPageUrl('OpenMaterialBookings'), urgent: false });
    if (stats.projectsWithoutDocs > 0)
      list.push({ label: `${stats.projectsWithoutDocs} Projekt(e) ohne Dokumentation`, link: createPageUrl('OpenDocumentations'), urgent: false });
    return list;
  }, [stats]);

  // Navigation sections
  const navSections = [
    {
      label: "Aufträge & Baustelle",
      items: [
        { title: "Auftragsübersicht", icon: FolderOpen, link: createPageUrl("Projects"), count: stats.totalProjects },
        { title: "Dispo Tiefbau", icon: ClipboardList, link: createPageUrl("Disposition") },
        { title: "Dispo Montage", icon: Construction, link: createPageUrl("DispositionMonteur") },
        { title: "Montageaufträge", icon: Package, link: createPageUrl("MontageAuftraege"), count: stats.openMontage },
        { title: "Oberfläche", icon: Layers, link: createPageUrl("Surface") },
        { title: "FTTH Visioplan", icon: Network, link: createPageUrl("FTTHVisioplan") },
      ]
    },
    {
      label: "Verwaltung",
      items: [
        { title: "VAO-Überwachung", icon: AlertTriangle, link: createPageUrl("VAOMonitoring"), count: stats.vaoWarnings, countUrgent: stats.vaoWarnings > 0 },
        { title: "Materialbuchungen", icon: CheckSquare, link: createPageUrl("OpenMaterialBookings"), count: stats.projectsWithoutMaterial },
        { title: "Dokumentationen", icon: FileText, link: createPageUrl("OpenDocumentations"), count: stats.projectsWithoutDocs },
        { title: "Preisliste", icon: Settings, link: createPageUrl("PriceList") },
        { title: "Materiallager", icon: Package, link: createPageUrl("MaterialInventory") },
        { title: "Montage-Preisliste", icon: Wrench, link: createPageUrl("MontagePriceList") },
        { title: "Montage-Lager", icon: Package, link: createPageUrl("MontageMaterialInventory") },
      ]
    },
    {
      label: "Auswertungen & Berichte",
      items: [
        { title: "Auswertungen", icon: BarChart3, link: createPageUrl("Analytics") },
        { title: "Kolonnen-Übersicht", icon: Users, link: createPageUrl("KolonnenUebersicht") },
        { title: "Leistungs-Historie", icon: TrendingUp, link: createPageUrl("TeamPerformanceHistory") },
        { title: "Büro-Auswertung", icon: BarChart3, link: createPageUrl("BueroUserAuswertung") },
        { title: "Berichte", icon: FileText, link: createPageUrl("Reports") },
      ]
    },
    {
      label: "Sonstiges",
      items: [
        { title: "Projekt-Explorer", icon: MapPin, link: createPageUrl("ProjectExplorer") },
        { title: "Ausgrabungen", icon: Shovel, link: createPageUrl("Excavations") },
        { title: "Fahrzeugpflege", icon: Car, link: createPageUrl("VehicleMaintenanceOverview") },
        { title: "Projekte importieren", icon: Upload, link: createPageUrl("ImportProjects") },
      ]
    }
  ];

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Aktive Projekte", value: stats.activeProjects, sub: `von ${stats.totalProjects} gesamt` },
          { label: "Montageaufträge offen", value: stats.openMontage },
          { label: "Offene Aufgaben", value: stats.openTasks },
          { label: "Gesamtumsatz", value: `€${Math.round(stats.totalRevenue / 1000)}k` },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="card-elevation border-none">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                {kpi.sub && <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Link key={i} to={alert.link}>
              <div className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:brightness-95 ${alert.urgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${alert.urgent ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className="text-sm font-medium text-gray-800">{alert.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Navigation Grid */}
      {navSections.map((section) => (
        <div key={section.label}>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{section.label}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {section.items.map((item) => (
              <Link key={item.title} to={item.link}>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                  <Card className="card-elevation border-none h-full cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div className="relative">
                        <div className="p-2.5 bg-gray-100 rounded-xl">
                          <item.icon className="w-5 h-5 text-gray-600" />
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                          <span className={`absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${item.countUrgent ? 'bg-red-500' : 'bg-orange-500'}`}>
                            {item.count > 9 ? '9+' : item.count}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 leading-tight">{item.title}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}
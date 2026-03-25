import React, { useState, useEffect } from "react";
import { Project, User, Excavation, MontageAuftrag, Task, KolonnenSollwert, PriceItem } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import BauleiterDashboard from "@/components/dashboard/BauleiterDashboard";
import OberflaecheDashboard from "@/components/dashboard/OberflaecheDashboard";
import {
  FolderOpen,
  BarChart3,
  MapPin,
  User as UserIcon,
  Construction,
  Droplets,
  FileText,
  ListRestart,
  AlertCircle,
  Calendar,
  Layers,
  Settings,
  Upload,
  CheckSquare,
  TrendingUp,
  Package,
  Eye,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatsCard from "../components/dashboard/StatsCard";
import QuickStatsBar from "../components/dashboard/QuickStatsBar";

// OPTIMIERUNG: Limits für Dashboard-Daten
const DASHBOARD_PROJECT_LIMIT = 50;
const DASHBOARD_EXCAVATION_LIMIT = 100;

// Navigation Card Komponente
function NavigationCard({ title, description, icon: Icon, color, link, stats }) {
  return (
    <Link to={link} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card className="card-elevation border-none h-full cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
          <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity`} />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-4 rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              {stats !== undefined && (
                <Badge className="bg-white/90 text-gray-900 font-bold text-lg px-3 py-1">
                  {stats}
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {description}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}



export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [montageAuftraege, setMontageAuftraege] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sollwert, setSollwert] = useState(null);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [priceItems, setPriceItems] = useState([]);
  const [widgetSettings, setWidgetSettings] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, projectsData, excavationsData, montageData, usersData, tasksData, sollwerteData, priceItemsData] = await Promise.all([
        User.me().catch(() => null),
        Project.list("-created_date", DASHBOARD_PROJECT_LIMIT).catch(() => []),
        Excavation.list("-created_date", DASHBOARD_EXCAVATION_LIMIT).catch(() => []),
        MontageAuftrag.list().catch(() => []),
        User.list().catch(() => []),
        Task.list().catch(() => []),
        KolonnenSollwert.list().catch(() => []),
        PriceItem.list().catch(() => [])
      ]);

      setUser(userData);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
      setMontageAuftraege(Array.isArray(montageData) ? montageData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setPriceItems(Array.isArray(priceItemsData) ? priceItemsData : []);

      if (userData && (userData.position === 'Bauleiter' || userData.position === 'Oberfläche')) {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const userSollwert = sollwerteData.find(s => s.user_id === userData.id && s.month === currentMonth);
        setSollwert(userSollwert);

        const userAssignedProjects = projectsData.filter(project => {
          if (project.assigned_bauleiter && Array.isArray(project.assigned_bauleiter)) {
            return project.assigned_bauleiter.some(bl => bl.id === userData.id);
          }
          return project.assigned_foreman_id === userData.id ||
                 project.assigned_foreman_name === userData.full_name ||
                 project.created_by === userData.email;
        });
        setAssignedProjects(userAssignedProjects);
      }

    } catch (error) {
      console.error("Fehler beim Laden der Dashboard-Daten:", error);
      setProjects([]);
      setExcavations([]);
      setMontageAuftraege([]);
      setUsers([]);
      setTasks([]);
      setAssignedProjects([]);
    }
    setIsLoading(false);
  };

  const handleToggleWidget = (widgetId) => {
    setWidgetSettings(prev => {
      const newSettings = {
        ...prev,
        [widgetId]: !prev[widgetId]
      };
      localStorage.setItem('dashboardWidgets', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const generalStats = React.useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const openMaterialBookings = projects.filter(p => !p.material_booking_completed).length;
    const openDocumentations = projects.filter(p => !p.documentation_completed).length;
    const totalRevenue = excavations.reduce((sum, exc) => sum + (exc?.calculated_price || 0), 0);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      openMaterialBookings,
      openDocumentations,
      totalRevenue
    };
  }, [projects, excavations]);

  const personalStats = React.useMemo(() => {
    if (!user || user.position !== 'Bauleiter') return null;

    const myExcavations = excavations.filter(exc => 
      exc.foreman === user.full_name ||
      exc.assigned_foreman_id === user.id ||
      exc.created_by === user.email
    );

    const myRevenue = myExcavations.reduce((sum, exc) => sum + (exc?.calculated_price || 0), 0);

    return {
      assignedProjects: assignedProjects.length,
      myExcavations: myExcavations.length,
      myRevenue
    };
  }, [user, assignedProjects, excavations]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BarChart3 className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Dashboard wird geladen...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Bauleiter Dashboard
  if (user && user.position === 'Bauleiter') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 lg:mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-1 truncate">
                  Willkommen, {user.full_name}
                </h1>
                <p className="text-sm text-gray-600">Ihr persönliches Dashboard</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Aktualisieren"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 hover:text-orange-600" />
              </button>
            </div>
          </motion.div>

          <div className="w-full max-w-md space-y-3">
            <NavigationCard
              title="Meine Aufträge"
              description="Alle zugewiesenen Projekte"
              icon={FolderOpen}
              color="from-blue-400 to-blue-600"
              link={createPageUrl("MyProjects")}
              stats={assignedProjects.length}
            />
            <NavigationCard
              title="Fahrzeugpflege"
              description="Fahrzeugzustand erfassen"
              icon={Droplets}
              color="from-slate-400 to-slate-600"
              link={createPageUrl("MyVehicleMaintenance")}
            />
          </div>
        </div>
      </div>
    );
  }

  // Monteur Dashboard
  if (user && user.position === 'Monteur') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 lg:mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-1 truncate">
                  Willkommen, {user.full_name}
                </h1>
                <p className="text-sm text-gray-600">Schnellzugriff auf Ihre Montageaufträge</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Aktualisieren"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 hover:text-orange-600" />
              </button>
            </div>
          </motion.div>

          {/* Navigation */}
           <div className="w-full max-w-md space-y-3">
             <Link to={createPageUrl("MyMontageAuftraege")} className="block">
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 whileHover={{ y: -2 }}
                 transition={{ duration: 0.2 }}
               >
                 <Card className="card-elevation border-none hover:shadow-lg transition-shadow cursor-pointer">
                   <CardContent className="p-6">
                     <div className="flex items-center gap-4">
                       <div className="p-3 rounded-lg bg-slate-100">
                         <Construction className="w-6 h-6 text-slate-700" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <h3 className="text-lg font-semibold text-gray-900">Meine Montageaufträge</h3>
                         <p className="text-sm text-gray-500 mt-1">Zeige alle Aufträge</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             </Link>
             <Link to={createPageUrl("MyVehicleMaintenance")} className="block">
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 whileHover={{ y: -2 }}
                 transition={{ duration: 0.2, delay: 0.05 }}
               >
                 <Card className="card-elevation border-none hover:shadow-lg transition-shadow cursor-pointer">
                   <CardContent className="p-6">
                     <div className="flex items-center gap-4">
                       <div className="p-3 rounded-lg bg-slate-100">
                         <Droplets className="w-6 h-6 text-slate-700" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <h3 className="text-lg font-semibold text-gray-900">Fahrzeugpflege</h3>
                         <p className="text-sm text-gray-500 mt-1">Fahrzeugpflege einreichen</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             </Link>
           </div>
          </div>
          </div>
          );
          }

          // Oberfläche Dashboard
  if (user && user.position === 'Oberfläche') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 lg:mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-1 truncate">
                  Willkommen, {user.full_name}
                </h1>
                <p className="text-sm text-gray-600">Ihr persönliches Dashboard</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Aktualisieren"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 hover:text-orange-600" />
              </button>
            </div>
          </motion.div>

          <div className="w-full max-w-md space-y-3">
            <NavigationCard
              title="Meine Aufträge"
              description="Alle zugewiesenen Projekte"
              icon={FolderOpen}
              color="from-blue-400 to-blue-600"
              link={createPageUrl("MyProjectsOberflaeche")}
              stats={assignedProjects.length}
            />
            <NavigationCard
              title="Fahrzeugpflege"
              description="Fahrzeugzustand erfassen"
              icon={Droplets}
              color="from-slate-400 to-slate-600"
              link={createPageUrl("MyVehicleMaintenance")}
            />
          </div>
        </div>
      </div>
    );
  }

  // Admin/Büro Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 lg:mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl font-light tracking-wide text-gray-800 mb-0.5">Dashboard</h1>
              <p className="text-xs text-gray-400 tracking-wider uppercase">Ihr persönlicher Überblick</p>
            </div>
            <button
              onClick={loadData}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 hover:text-orange-600" />
            </button>
          </div>
        </motion.div>

        <QuickStatsBar
          projects={projects}
          excavations={excavations}
          priceItems={priceItems}
          montageAuftraege={montageAuftraege}
        />

        <AdminDashboard 
          projects={projects}
          excavations={excavations}
          montageAuftraege={montageAuftraege}
          users={users}
          tasks={tasks}
        />


      </div>
    </div>
  );
}
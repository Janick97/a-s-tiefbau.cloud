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
  Clock,
  Eye,
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
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

// Kompaktes Header-Widget: Uhrzeit + Wetter
function AdminHeaderWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadWeather();
    const weatherTimer = setInterval(loadWeather, 30 * 60 * 1000);
    return () => { clearInterval(timer); clearInterval(weatherTimer); };
  }, []);

  const loadWeather = async () => {
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: "Aktuelles Wetter in 52353 Düren, Deutschland. Temperatur in Celsius und kurze Beschreibung.",
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            temperature: { type: "number" },
            description: { type: "string" }
          }
        }
      });
      setWeather(response);
    } catch (e) {
      setWeather(null);
    }
  };

  return (
    <div className="hidden md:flex items-center gap-3 text-sm text-gray-600">
      {weather && (
        <span className="text-gray-500">
          {Math.round(weather.temperature)}°C · {weather.description}
        </span>
      )}
      <span className="font-medium text-gray-700 tabular-nums">
        {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// Uhrzeit & Wetter Widget (groß – nicht mehr genutzt im Admin)
function DateTimeWeatherWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  useEffect(() => {
    // Uhrzeit jede Sekunde aktualisieren
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Wetter laden
    loadWeather();

    // Wetter alle 30 Minuten aktualisieren
    const weatherTimer = setInterval(() => {
      loadWeather();
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(timer);
      clearInterval(weatherTimer);
    };
  }, []);

  const loadWeather = async () => {
    try {
      setIsLoadingWeather(true);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: "Was ist das aktuelle Wetter in 52353 Düren, Deutschland? Gib mir die Temperatur in Celsius, Wetterbeschreibung (sonnig, bewölkt, regnerisch, etc.), Luftfeuchtigkeit in Prozent und Windgeschwindigkeit in km/h.",
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            temperature: { type: "number" },
            description: { type: "string" },
            humidity: { type: "number" },
            wind_speed: { type: "number" }
          }
        }
      });

      setWeather(response);
    } catch (error) {
      console.error("Fehler beim Laden des Wetters:", error);
      setWeather(null);
    }
    setIsLoadingWeather(false);
  };

  const getWeatherIcon = (description) => {
    if (!description) return Sun;
    const desc = description.toLowerCase();
    if (desc.includes('regen') || desc.includes('rain')) return CloudRain;
    if (desc.includes('schnee') || desc.includes('snow')) return CloudSnow;
    if (desc.includes('bewölkt') || desc.includes('cloud') || desc.includes('wolke')) return Cloud;
    return Sun;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.description) : Sun;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="card-elevation border-none bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datum & Uhrzeit */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold tracking-tight">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-sm md:text-base opacity-90 mt-1">
                    {formatDate(currentTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Wetter */}
            <div className="flex flex-col justify-center border-l border-white/20 pl-6">
              {isLoadingWeather ? (
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm animate-pulse">
                    <Cloud className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-lg opacity-90">Wetter wird geladen...</div>
                  </div>
                </div>
              ) : weather ? (
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <WeatherIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold">
                      {Math.round(weather.temperature)}°C
                    </div>
                    <div className="text-sm md:text-base opacity-90 capitalize">
                      {weather.description}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs md:text-sm opacity-80">
                      <div className="flex items-center gap-1">
                        <Droplets className="w-4 h-4" />
                        {weather.humidity}%
                      </div>
                      <div className="flex items-center gap-1">
                        <Wind className="w-4 h-4" />
                        {Math.round(weather.wind_speed)} km/h
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-lg opacity-90">Wetter nicht verfügbar</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  Willkommen, {user.full_name}
                </h1>
                <p className="text-sm md:text-base text-gray-600">Ihr persönliches Dashboard</p>
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

          <BauleiterDashboard 
            projects={projects}
            excavations={excavations}
            user={user}
            tasks={tasks}
            sollwert={sollwert}
            widgetSettings={widgetSettings}
            onToggleWidget={handleToggleWidget}
          />
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
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  Willkommen, {user.full_name}
                </h1>
                <p className="text-sm md:text-base text-gray-600">Schnellzugriff auf Ihre Montageaufträge</p>
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

          {/* Datum, Uhrzeit & Wetter Widget */}
          <DateTimeWeatherWidget />

          {/* Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <NavigationCard
              title="Meine Montageaufträge"
              description="Alle Ihnen zugewiesenen Montageaufträge anzeigen"
              icon={Construction}
              color="from-blue-500 to-blue-600"
              link={createPageUrl("MyMontageAuftraege")}
            />

            <NavigationCard
              title="Mein Profil"
              description="Persönliche Einstellungen bearbeiten"
              icon={UserIcon}
              color="from-orange-500 to-amber-600"
              link={createPageUrl("Profile")}
            />
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
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  Willkommen, {user.full_name}
                </h1>
                <p className="text-sm md:text-base text-gray-600">Ihr persönliches Dashboard</p>
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

          <OberflaecheDashboard 
            excavations={excavations}
            user={user}
            tasks={tasks}
            sollwert={sollwert}
            widgetSettings={widgetSettings}
            onToggleWidget={handleToggleWidget}
          />
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
            <div className="flex items-center gap-3">
              <AdminHeaderWidget />
              <button
                onClick={loadData}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Aktualisieren"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 hover:text-orange-600" />
              </button>
            </div>
          </div>
        </motion.div>

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
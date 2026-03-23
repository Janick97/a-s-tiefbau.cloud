import React, { useState, useEffect, useMemo } from "react";
import { Project, Excavation, User, PriceItem, MontageLeistung, MontageAuftrag } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Euro,
  Shovel,
  Calendar,
  Users as UsersIcon,
  Target,
  Crown,
  Award,
  Activity,
  Building,
  MapPin,
  Clock,
  Zap,
  AlertCircle,
  Loader2,
  Package,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  Construction,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import AIInsights from "../components/analytics/AIInsights";

const MONTHLY_TARGET_BAULEITER = 50000;
const MONTHLY_TARGET_OBERFLAECHE = 10000;
const ANALYTICS_PASSWORD = "AStiefbau2018!";

export default function AnalyticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [montageLeistungen, setMontageLeistungen] = useState([]);
  const [montageAuftraege, setMontageAuftraege] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedForeman, setSelectedForeman] = useState('all');
  const [selectedOberflaeche, setSelectedOberflaeche] = useState('all');
  const [selectedMonteur, setSelectedMonteur] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Initialisierung...');
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('personal');
  const [activeTeamView, setActiveTeamView] = useState('bauleiter');

  useEffect(() => {
    // Prüfe, ob das Passwort in der Session gespeichert ist
    const savedAuth = sessionStorage.getItem('analytics_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadData();
    } else {
      setIsLoading(false); // If not authenticated, stop loading initially to show password form
    }
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ANALYTICS_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      sessionStorage.setItem('analytics_auth', 'true');
      loadData();
    } else {
      setPasswordError(true);
      setPasswordInput("");
    }
  };

  useEffect(() => {
    if (user && isAuthenticated) {
      if (user.position === 'Bauleiter') {
        setSelectedForeman(user.full_name);
        setActiveView('personal');
        setActiveTeamView('bauleiter');
      } else if (user.position === 'Oberfläche') {
        setSelectedOberflaeche(user.full_name);
        setActiveView('personal');
        setActiveTeamView('oberflaeche');
      } else if (user.position === 'Monteur') {
        setSelectedMonteur(user.full_name);
        setActiveView('personal');
        setActiveTeamView('monteur');
      } else {
        setSelectedForeman('all');
        setSelectedOberflaeche('all');
        setSelectedMonteur('all');
        setActiveView('team');
      }
    }
  }, [user, isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      setLoadingStep('Benutzer wird geladen...');
      const userData = await User.me().catch(() => null);
      setUser(userData);
      
      if (!userData) {
        setError('Benutzer konnte nicht geladen werden. Bitte neu anmelden.');
        setIsLoading(false);
        return;
      }

      setLoadingStep('Projekte werden geladen...');
      const projectsData = await Project.list("-created_date").catch(() => []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      setLoadingStep('Ausgrabungen werden geladen...');
      const excavationsData = await Excavation.list("-created_date").catch(() => []);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);

      setLoadingStep('Preisliste wird geladen...');
      const priceData = await PriceItem.list().catch(() => []);
      setPriceItems(Array.isArray(priceData) ? priceData : []);

      setLoadingStep('Team-Daten werden geladen...');
      try {
        const usersData = await User.list();
        const filteredUsers = Array.isArray(usersData) 
          ? usersData.filter(u => u.position === 'Bauleiter' || u.position === 'Oberfläche' || u.position === 'Monteur')
          : [];
        setUsers(filteredUsers);
      } catch (userError) {
        console.warn('Team-Mitglieder konnten nicht geladen werden:', userError);
        setUsers([]);
      }

      setLoadingStep('Montagedaten werden geladen...');
      const montageLeistungenData = await MontageLeistung.list("-created_date").catch(() => []);
      setMontageLeistungen(Array.isArray(montageLeistungenData) ? montageLeistungenData : []);
      
      const montageAuftraegeData = await MontageAuftrag.list("-created_date").catch(() => []);
      setMontageAuftraege(Array.isArray(montageAuftraegeData) ? montageAuftraegeData : []);

      setLoadingStep('Fertig');
    } catch (error) {
      console.error("Fehler beim Laden der Analytics-Daten:", error);
      setError(`Laden fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
    }
    
    setIsLoading(false);
  };

  const filterExcavationsByMonth = (allExcavations, monthString) => {
    return allExcavations.filter(exc => {
      if (!exc) return false;
      
      const datesToCheck = [
        exc.created_date,
        exc.updated_date,
      ];
      
      for (const dateStr of datesToCheck) {
        if (dateStr) {
          try {
            const excDate = new Date(dateStr);
            if (isNaN(excDate.getTime())) continue;
            const excMonth = excDate.toISOString().substring(0, 7);
            if (excMonth === monthString) {
              return true;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      return false;
    });
  };

  const filteredExcavations = filterExcavationsByMonth(
    excavations.filter(exc => !exc.exclude_from_statistics),
    selectedMonth
  );

  const filteredMontageLeistungen = useMemo(() => {
    return montageLeistungen.filter(leistung => {
      if (!leistung || !leistung.completion_date) return false;
      try {
        const completionDate = new Date(leistung.completion_date);
        if (isNaN(completionDate.getTime())) return false;
        const leistungMonth = completionDate.toISOString().substring(0, 7);
        return leistungMonth === selectedMonth;
      } catch (e) {
        return false;
      }
    });
  }, [montageLeistungen, selectedMonth]);

  const getMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthString = date.toISOString().substring(0, 7);
      const displayName = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      options.push({ value: monthString, label: displayName });
    }
    return options;
  };

  const bauleiterUsers = useMemo(() => {
    return users.filter(u => u.position === 'Bauleiter');
  }, [users]);

  const oberflaecheUsers = useMemo(() => {
    return users.filter(u => u.position === 'Oberfläche');
  }, [users]);

  const monteurUsers = useMemo(() => {
    return users.filter(u => u.position === 'Monteur');
  }, [users]);

  const uniqueForemen = useMemo(() => {
    return bauleiterUsers.map(u => u.full_name).filter(Boolean);
  }, [bauleiterUsers]);

  const uniqueOberflaeche = useMemo(() => {
    return oberflaecheUsers.map(u => u.full_name).filter(Boolean);
  }, [oberflaecheUsers]);

  const uniqueMonteure = useMemo(() => {
    return monteurUsers.map(u => u.full_name).filter(Boolean);
  }, [monteurUsers]);

  // Bauleiter Performance (wie vorher)
  const foremanPerformance = useMemo(() => {
    let foremenToProcess = bauleiterUsers.length > 0 ? bauleiterUsers : [];
    
    if (selectedForeman !== 'all') {
      foremenToProcess = foremenToProcess.filter(f => f.full_name === selectedForeman);
    }
    
    if (foremenToProcess.length === 0 && user && user.position === 'Bauleiter' && selectedForeman === user.full_name) {
      foremenToProcess = [user];
    }
    
    const priceItemsMap = new Map((Array.isArray(priceItems) ? priceItems : []).map(p => [p.id, p]));
    
    const calculatedPerformance = foremenToProcess.map(foreman => {
      const foremanName = foreman.full_name;
      const foremanId = foreman.id;
      const foremanEmail = foreman.email;
      
      const foremanExcavations = filteredExcavations.filter(exc => {
        if (!exc) return false;
        
        const lowerForemanName = foremanName?.toLowerCase() || '';
        const lowerExcForeman = exc.foreman?.toLowerCase() || '';
        const lowerExcCreatedBy = exc.created_by?.toLowerCase() || '';
        const lowerForemanEmail = foremanEmail?.toLowerCase() || '';
        
        let foremanFirstName = '';
        if (lowerForemanName.includes('.')) {
          foremanFirstName = lowerForemanName.split('.')[0];
        } else if (lowerForemanName.includes(' ')) {
          foremanFirstName = lowerForemanName.split(' ')[0];
        } else {
          foremanFirstName = lowerForemanName;
        }
        
        let foremanLastName = '';
        if (lowerForemanName.includes('.')) {
          foremanLastName = lowerForemanName.split('.')[1];
        } else if (lowerForemanName.includes(' ')) {
          const parts = lowerForemanName.split(' ');
          foremanLastName = parts[parts.length - 1];
        }
        
        const emailFirstPart = lowerForemanEmail.includes('@')
          ? lowerForemanEmail.split('@')[0].split('.')[0]
          : '';
        
        const emailSecondPart = lowerForemanEmail.includes('@')
          ? (lowerForemanEmail.split('@')[0].split('.')[1] || '')
          : '';
        
        const matches = [
          lowerExcForeman === lowerForemanName,
          exc.assigned_foreman_id === foremanId,
          exc.created_by === foremanEmail,
          lowerExcForeman === foremanFirstName && foremanFirstName.length > 2,
          lowerExcForeman.includes(foremanFirstName) && foremanFirstName.length > 2,
          foremanFirstName.includes(lowerExcForeman) && lowerExcForeman.length > 2,
          lowerExcForeman === foremanLastName && foremanLastName.length > 2,
          lowerExcForeman.includes(foremanLastName) && foremanLastName.length > 2,
          foremanLastName.includes(lowerExcForeman) && lowerExcForeman.length > 2,
          lowerExcCreatedBy.includes(foremanFirstName) && foremanFirstName.length > 2,
          lowerExcCreatedBy.includes(foremanLastName) && foremanLastName.length > 2,
          lowerExcCreatedBy.includes(emailFirstPart) && emailFirstPart.length > 2,
          lowerExcCreatedBy.includes(emailSecondPart) && emailSecondPart.length > 2,
          lowerExcCreatedBy === lowerForemanEmail,
          lowerExcCreatedBy.startsWith(emailFirstPart + '.') && emailFirstPart.length > 2,
        ];
        
        return matches.some(match => match === true);
      });
      
      const totalRevenue = foremanExcavations.reduce((sum, exc) => sum + (exc?.foreman_commission || 0), 0);
      
      let grubenCount = 0;
      let grabenMeter = 0;
      let mauerdurchfuehrungen = 0;
      let sonstige = 0;

      foremanExcavations.forEach(exc => {
        if (!exc || !exc.price_item_id) return;
        const priceItem = priceItemsMap.get(exc.price_item_id);
        if (!priceItem) return;

        if (['10001', '10002', '10003', '10004', '10005'].includes(priceItem.item_number)) {
          grubenCount += 1;
        }
        else if (['10021010', '10021040'].includes(priceItem.item_number)) {
          mauerdurchfuehrungen += parseFloat(exc.quantity || 0);
        }
        else if (priceItem.unit === 'M') {
          grabenMeter += parseFloat(exc.quantity || 0);
        }
        else {
          sonstige += 1;
        }
      });

      const achievementPercentage = (totalRevenue / MONTHLY_TARGET_BAULEITER) * 100;

      return {
        id: foremanId,
        name: foremanName,
        revenue: totalRevenue,
        target: MONTHLY_TARGET_BAULEITER,
        achievementPercentage: achievementPercentage,
        grubenCount,
        grabenMeter: Math.round(grabenMeter),
        mauerdurchfuehrungen,
        sonstige,
        totalJobs: foremanExcavations.length,
        rank: 0,
        matchedExcavations: foremanExcavations
      };
    });

    const ranked = calculatedPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .map((foreman, index) => ({ ...foreman, rank: index + 1 }));
    
    return ranked;
  }, [filteredExcavations, priceItems, bauleiterUsers, selectedForeman, user]);

  // Oberflächen Performance
  const oberflaechePerformance = useMemo(() => {
    let oberflaecheToProcess = oberflaecheUsers.length > 0 ? oberflaecheUsers : [];
    
    if (selectedOberflaeche !== 'all') {
      oberflaecheToProcess = oberflaecheToProcess.filter(o => o.full_name === selectedOberflaeche);
    }
    
    if (oberflaecheToProcess.length === 0 && user && user.position === 'Oberfläche' && selectedOberflaeche === user.full_name) {
      oberflaecheToProcess = [user];
    }
    
    const calculatedPerformance = oberflaecheToProcess.map(oberflaeche => {
      const oberflaecheName = oberflaeche.full_name;
      const oberflaecheId = oberflaeche.id;
      
      // Verfüllungen
      const backfilledExcavations = filteredExcavations.filter(exc => 
        exc && exc.backfilled_by_user_id === oberflaecheId
      );
      
      // Geschlossene (Oberfläche)
      const closedExcavations = filteredExcavations.filter(exc => 
        exc && exc.closed_by_user_id === oberflaecheId
      );
      
      const backfillRevenue = backfilledExcavations.reduce((sum, exc) => sum + (exc.backfill_commission || 0), 0);
      const surfaceRevenue = closedExcavations.reduce((sum, exc) => sum + (exc.surface_commission || 0), 0);
      const totalRevenue = backfillRevenue + surfaceRevenue;
      
      const achievementPercentage = (totalRevenue / MONTHLY_TARGET_OBERFLAECHE) * 100;

      return {
        id: oberflaecheId,
        name: oberflaecheName,
        revenue: totalRevenue,
        backfillRevenue,
        surfaceRevenue,
        target: MONTHLY_TARGET_OBERFLAECHE,
        achievementPercentage: achievementPercentage,
        backfillCount: backfilledExcavations.length,
        surfaceCount: closedExcavations.length,
        totalJobs: backfilledExcavations.length + closedExcavations.length,
        rank: 0
      };
    });

    const ranked = calculatedPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .map((oberflaeche, index) => ({ ...oberflaeche, rank: index + 1 }));
    
    return ranked;
  }, [filteredExcavations, oberflaecheUsers, selectedOberflaeche, user]);

  // Monteur Performance
  const monteurPerformance = useMemo(() => {
    let monteureToProcess = monteurUsers.length > 0 ? monteurUsers : [];
    
    if (selectedMonteur !== 'all') {
      monteureToProcess = monteureToProcess.filter(m => m.full_name === selectedMonteur);
    }
    
    if (monteureToProcess.length === 0 && user && user.position === 'Monteur' && selectedMonteur === user.full_name) {
      monteureToProcess = [user];
    }
    
    const calculatedPerformance = monteureToProcess.map(monteur => {
      const monteurName = monteur.full_name;
      const monteurId = monteur.id;
      
      const monteurLeistungen = filteredMontageLeistungen.filter(leistung => 
        leistung && leistung.monteur_user_id === monteurId
      );
      
      const monteurAuftraege = montageAuftraege.filter(auftrag =>
        auftrag && auftrag.assigned_monteur_id === monteurId && auftrag.monteur_completed
      );
      
      const totalRevenue = monteurLeistungen.reduce((sum, l) => sum + (l.calculated_price || 0), 0);
      
      return {
        id: monteurId,
        name: monteurName,
        revenue: totalRevenue,
        totalLeistungen: monteurLeistungen.length,
        completedAuftraege: monteurAuftraege.length,
        rank: 0
      };
    });

    const ranked = calculatedPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .map((monteur, index) => ({ ...monteur, rank: index + 1 }));
    
    return ranked;
  }, [filteredMontageLeistungen, montageAuftraege, monteurUsers, selectedMonteur, user]);

  const selectedMonthName = new Date(selectedMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const isBauleiter = user?.position === 'Bauleiter';
  const isOberflaeche = user?.position === 'Oberfläche';
  const isMonteur = user?.position === 'Monteur';

  // Passwort-Abfrage anzeigen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="card-elevation border-none">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Zugriff geschützt
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Bitte geben Sie das Passwort ein, um auf die Auswertungen zuzugreifen.
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError(false);
                      }}
                      placeholder="Passwort eingeben..."
                      className={`pr-10 ${passwordError ? 'border-red-500 focus:ring-red-500' : ''}`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Falsches Passwort. Bitte versuchen Sie es erneut.
                    </motion.p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  Zugriff bestätigen
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Auswertungen werden geladen</h2>
            <p className="text-sm text-gray-600">{loadingStep}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Fehler beim Laden</h2>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* KI-Analysebereich - nur für Admins sichtbar */}
        {user?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <AIInsights 
              projects={projects}
              excavations={excavations}
              selectedMonth={selectedMonth}
              user={user}
            />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {(isBauleiter || isOberflaeche) && activeView === 'personal' ? 'Meine Auswertungen' : 'Leistungs-Auswertungen'}
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              {activeView === 'team' ? 'Team-Überblick und Vergleich' : 
               (isBauleiter || isOberflaeche ? 'Persönliche Leistung' : 'Einzelansicht')} für {selectedMonthName}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!isBauleiter && !isOberflaeche && (
              <>
                {activeTeamView === 'bauleiter' && (
                  <Select
                    value={selectedForeman}
                    onValueChange={setSelectedForeman}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <UsersIcon className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Bauleiter wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Bauleiter</SelectItem>
                      {uniqueForemen.map(foreman => (
                        <SelectItem key={foreman} value={foreman}>
                          {foreman}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {activeTeamView === 'oberflaeche' && (
                  <Select
                    value={selectedOberflaeche}
                    onValueChange={setSelectedOberflaeche}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <UsersIcon className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Oberfläche wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Oberfläche</SelectItem>
                      {uniqueOberflaeche.map(oberflaeche => (
                        <SelectItem key={oberflaeche} value={oberflaeche}>
                          {oberflaeche}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {activeTeamView === 'monteur' && (
                  <Select
                    value={selectedMonteur}
                    onValueChange={setSelectedMonteur}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <UsersIcon className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Monteur wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Monteure</SelectItem>
                      {uniqueMonteure.map(monteur => (
                        <SelectItem key={monteur} value={monteur}>
                          {monteur}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={activeView === 'personal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('personal')}
                className="text-xs"
              >
                {(isBauleiter || isOberflaeche) ? 'Meine Daten' : 'Einzelansicht'}
              </Button>
              <Button
                variant={activeView === 'team' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('team')}
                className="text-xs"
              >
                Team-Vergleich
              </Button>
            </div>
          </div>
        </motion.div>

        {activeView === 'personal' && (
          <>
            {/* Bauleiter Personal View */}
            {(isBauleiter || (!isBauleiter && !isOberflaeche && activeTeamView === 'bauleiter')) && (() => {
              const currentUserData = selectedForeman !== 'all' 
                ? foremanPerformance.find(f => f.name === selectedForeman)
                : (isBauleiter
                    ? foremanPerformance.find(f => f.name === user.full_name || f.id === user.id)
                    : foremanPerformance[0]);

              if (!currentUserData || currentUserData.totalJobs === 0) {
                return (
                  <Card className="card-elevation border-none mb-6 lg:mb-8">
                    <CardContent className="p-6 lg:p-8 text-center">
                      <Shovel className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Daten verfügbar</h3>
                      <p className="text-gray-400">
                        Für {currentUserData?.name || selectedForeman} sind für {selectedMonthName} keine Leistungsdaten verfügbar.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-blue-600">{currentUserData.totalJobs}</div>
                        <div className="text-xs md:text-sm text-gray-600">Aufträge</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-green-600">{currentUserData.grubenCount}</div>
                        <div className="text-xs md:text-sm text-gray-600">Gruben</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-orange-600">{currentUserData.grabenMeter}m</div>
                        <div className="text-xs md:text-sm text-gray-600">Graben</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-purple-600">{Math.round(currentUserData.achievementPercentage)}%</div>
                        <div className="text-xs md:text-sm text-gray-600">Soll erreicht</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <Card className="card-elevation border-none">
                      <CardHeader className="pb-3 md:pb-4">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                          Soll-Ist-Vergleich für {selectedMonthName}
                          {(isBauleiter || selectedForeman !== 'all') && (
                            <span className="ml-2 text-sm font-normal text-gray-500"> ({currentUserData.name})</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!isBauleiter && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm md:text-base text-gray-600">Monatssoll</span>
                              <span className="text-sm md:text-base font-semibold">€50.000</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm md:text-base text-gray-600">Erreicht (Provision)</span>
                              <span className="text-sm md:text-base font-semibold text-green-600">€{Math.round(currentUserData.revenue).toLocaleString('de-DE')}</span>
                            </div>
                          </>
                        )}
                        <Progress value={Math.min(currentUserData.achievementPercentage, 100)} className="h-3" />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs md:text-sm">
                          <span className={currentUserData.achievementPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}>
                            {Math.round(currentUserData.achievementPercentage)}% vom Soll erreicht
                          </span>
                          {!isBauleiter && (
                            <span className="text-gray-500">
                              {currentUserData.achievementPercentage >= 100 ? 
                                `+€${Math.round(currentUserData.revenue - 50000).toLocaleString('de-DE')} über Soll` :
                                `€${Math.round(50000 - currentUserData.revenue).toLocaleString('de-DE')} bis Soll`
                              }
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-elevation border-none">
                      <CardHeader className="pb-3 md:pb-4">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <Activity className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                          Projektdetails
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-gray-600">Gruben</span>
                            <span className="text-lg font-bold text-blue-600">{currentUserData.grubenCount}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-sm text-gray-600">Graben</span>
                            <span className="text-lg font-bold text-green-600">{currentUserData.grabenMeter}m</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <span className="text-sm text-gray-600">Mauerdurchführungen</span>
                            <span className="text-lg font-bold text-orange-600">{currentUserData.mauerdurchfuehrungen}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <span className="text-sm text-gray-600">Sonstige Leistungen</span>
                            <span className="text-lg font-bold text-purple-600">{currentUserData.sonstige}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              );
            })()}

            {/* Monteur Personal View */}
            {(isMonteur || (!isBauleiter && !isOberflaeche && !isMonteur && activeTeamView === 'monteur')) && (() => {
              const currentUserData = selectedMonteur !== 'all' 
                ? monteurPerformance.find(m => m.name === selectedMonteur)
                : (isMonteur
                    ? monteurPerformance.find(m => m.name === user.full_name || m.id === user.id)
                    : monteurPerformance[0]);

              if (!currentUserData || currentUserData.totalLeistungen === 0) {
                return (
                  <Card className="card-elevation border-none mb-6 lg:mb-8">
                    <CardContent className="p-6 lg:p-8 text-center">
                      <Construction className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Daten verfügbar</h3>
                      <p className="text-gray-400">
                        Für {currentUserData?.name || selectedMonteur} sind für {selectedMonthName} keine Leistungsdaten verfügbar.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-blue-600">{currentUserData.totalLeistungen}</div>
                        <div className="text-xs md:text-sm text-gray-600">Erfasste Leistungen</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-green-600">{currentUserData.completedAuftraege}</div>
                        <div className="text-xs md:text-sm text-gray-600">Aufträge erledigt</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-orange-600">€{Math.round(currentUserData.revenue).toLocaleString('de-DE')}</div>
                        <div className="text-xs md:text-sm text-gray-600">Gesamt-Umsatz</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="card-elevation border-none">
                    <CardHeader className="pb-3 md:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Activity className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                        Leistungsübersicht für {selectedMonthName}
                        {(isMonteur || selectedMonteur !== 'all') && (
                          <span className="ml-2 text-sm font-normal text-gray-500"> ({currentUserData.name})</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
                          <div className="text-xl md:text-2xl font-bold text-blue-600">{currentUserData.totalLeistungen}</div>
                          <div className="text-xs md:text-sm text-gray-600">Leistungen erfasst</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
                          <div className="text-xl md:text-2xl font-bold text-green-600">{currentUserData.completedAuftraege}</div>
                          <div className="text-xs md:text-sm text-gray-600">Aufträge fertig</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg">
                          <div className="text-xl md:text-2xl font-bold text-orange-600">
                            €{Math.round(currentUserData.revenue).toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Gesamt-Umsatz</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}

            {/* Oberfläche Personal View */}
            {(isOberflaeche || (!isBauleiter && !isOberflaeche && !isMonteur && activeTeamView === 'oberflaeche')) && (() => {
              const currentUserData = selectedOberflaeche !== 'all' 
                ? oberflaechePerformance.find(o => o.name === selectedOberflaeche)
                : (isOberflaeche
                    ? oberflaechePerformance.find(o => o.name === user.full_name || o.id === user.id)
                    : oberflaechePerformance[0]);

              if (!currentUserData || currentUserData.totalJobs === 0) {
                return (
                  <Card className="card-elevation border-none mb-6 lg:mb-8">
                    <CardContent className="p-6 lg:p-8 text-center">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Daten verfügbar</h3>
                      <p className="text-gray-400">
                        Für {currentUserData?.name || selectedOberflaeche} sind für {selectedMonthName} keine Leistungsdaten verfügbar.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-blue-600">{currentUserData.totalJobs}</div>
                        <div className="text-xs md:text-sm text-gray-600">Gesamt Arbeiten</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-orange-600">{currentUserData.backfillCount}</div>
                        <div className="text-xs md:text-sm text-gray-600">Verfüllungen</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-green-600">{currentUserData.surfaceCount}</div>
                        <div className="text-xs md:text-sm text-gray-600">Oberflächen</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevation border-none">
                      <CardContent className="p-3 md:p-4 text-center">
                        <div className="text-lg md:text-2xl font-bold text-purple-600">{Math.round(currentUserData.achievementPercentage)}%</div>
                        <div className="text-xs md:text-sm text-gray-600">Soll erreicht</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="card-elevation border-none mb-6 lg:mb-8">
                    <CardHeader className="pb-3 md:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                        Soll-Ist-Vergleich für {selectedMonthName}
                        {(isOberflaeche || selectedOberflaeche !== 'all') && (
                          <span className="ml-2 text-sm font-normal text-gray-500"> ({currentUserData.name})</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm md:text-base text-gray-600">Monatssoll</span>
                        <span className="text-sm md:text-base font-semibold">€10.000</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm md:text-base text-gray-600">Erreicht (Provision)</span>
                        <span className="text-sm md:text-base font-semibold text-green-600">€{Math.round(currentUserData.revenue).toLocaleString('de-DE')}</span>
                      </div>
                      <Progress value={Math.min(currentUserData.achievementPercentage, 100)} className="h-3" />
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs md:text-sm">
                        <span className={currentUserData.achievementPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}>
                          {Math.round(currentUserData.achievementPercentage)}% vom Soll erreicht
                        </span>
                        <span className="text-gray-500">
                          {currentUserData.achievementPercentage >= 100 ? 
                            `+€${Math.round(currentUserData.revenue - 10000).toLocaleString('de-DE')} über Soll` :
                            `€${Math.round(10000 - currentUserData.revenue).toLocaleString('de-DE')} bis Soll`
                          }
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-elevation border-none">
                    <CardHeader className="pb-3 md:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Activity className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                        Provisionsverteilung
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg">
                          <div className="text-xl md:text-2xl font-bold text-orange-600">
                            €{Math.round(currentUserData.backfillRevenue).toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Verfüll-Provision</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
                          <div className="text-xl md:text-2xl font-bold text-green-600">
                            €{Math.round(currentUserData.surfaceRevenue).toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Oberflächen-Provision</div>
                        </div>
                        <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg md:col-span-1 col-span-2">
                          <div className="text-xl md:text-2xl font-bold text-blue-600">
                            €{Math.round(currentUserData.revenue).toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">Gesamt-Provision</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </>
        )}

        {activeView === 'team' && (
          <>
            {/* Team-Ansicht Toggle */}
            {!isBauleiter && !isOberflaeche && !isMonteur && (
              <div className="flex justify-center mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={activeTeamView === 'bauleiter' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTeamView('bauleiter')}
                    className="text-xs"
                  >
                    <Shovel className="w-4 h-4 mr-2" />
                    Bauleiter
                  </Button>
                  <Button
                    variant={activeTeamView === 'oberflaeche' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTeamView('oberflaeche')}
                    className="text-xs"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Oberfläche
                  </Button>
                  <Button
                    variant={activeTeamView === 'monteur' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTeamView('monteur')}
                    className="text-xs"
                  >
                    <Construction className="w-4 h-4 mr-2" />
                    Monteur
                  </Button>
                </div>
              </div>
            )}

            {/* Bauleiter Team View */}
            {activeTeamView === 'bauleiter' && (
              <>
                <Card className="card-elevation border-none mb-6 lg:mb-8">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                      Bauleiter Team-Vergleich - {selectedMonthName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {foremanPerformance.every(f => f.totalJobs === 0) ? (
                      <div className="text-center py-8 lg:py-12">
                        <UsersIcon className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-base md:text-lg font-medium text-gray-500 mb-2">Keine Team-Daten verfügbar</h3>
                        <p className="text-sm md:text-base text-gray-400">
                          Für {selectedMonthName} sind keine Leistungsdaten für das Team verfügbar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 md:space-y-4">
                        {foremanPerformance.map((foreman, index) => {
                          const isCurrentUser = isBauleiter && foreman.name === user.full_name;

                          return (
                            <Link 
                              key={foreman.id || foreman.name} 
                              to={createPageUrl(`MitarbeiterDetail?id=${foreman.id}`)}
                              className="block"
                            >
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-3 md:p-4 rounded-lg border-2 hover:shadow-lg transition-all cursor-pointer ${
                                  index === 0 ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' :
                                  index === 1 ? 'bg-gray-50 border-gray-200 hover:border-gray-300' :
                                  index === 2 ? 'bg-orange-50 border-orange-200 hover:border-orange-300' :
                                  'bg-white border-gray-100 hover:border-gray-200'
                                } ${isCurrentUser ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm md:text-base flex-shrink-0 ${
                                      index === 0 ? 'bg-yellow-500' :
                                      index === 1 ? 'bg-gray-500' :
                                      index === 2 ? 'bg-orange-500' :
                                      'bg-blue-500'
                                    }`}>
                                      {foreman.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                        {foreman.name}
                                        {isCurrentUser && 
                                         <span className="ml-2 text-blue-600 text-xs">(Sie)</span>}
                                      </h3>
                                      <p className="text-xs md:text-sm text-gray-600">{foreman.totalJobs} Aufträge</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    <div>
                                      {!isBauleiter && (
                                        <div className="font-bold text-base md:text-lg text-green-600">
                                          €{Math.round(foreman.revenue).toLocaleString('de-DE')}
                                        </div>
                                      )}
                                      <div className="text-xs md:text-sm text-gray-600">
                                        {Math.round(foreman.achievementPercentage)}% vom Soll
                                      </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                  </div>
                                </div>
                                
                                <Progress value={Math.min(foreman.achievementPercentage, 100)} className="h-2 mb-3" />
                                
                                <div className="grid grid-cols-4 gap-2 md:gap-4 text-center">
                                  <div className="text-xs">
                                    <div className="font-semibold text-blue-600">{foreman.grubenCount}</div>
                                    <div className="text-gray-600">Gruben</div>
                                  </div>
                                  <div className="text-xs">
                                    <div className="font-semibold text-green-600">{foreman.grabenMeter}m</div>
                                    <div className="text-gray-600">Graben</div>
                                  </div>
                                  <div className="text-xs">
                                    <div className="font-semibold text-orange-600">{foreman.mauerdurchfuehrungen}</div>
                                    <div className="text-gray-600">Mauer-DF</div>
                                  </div>
                                  <div className="text-xs">
                                    <div className="font-semibold text-purple-600">{foreman.sonstige}</div>
                                    <div className="text-gray-600">Sonstige</div>
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Monteur Personal/Team View */}
            {(isMonteur || activeTeamView === 'monteur') && (() => {
              const currentUserData = selectedMonteur !== 'all' 
                ? monteurPerformance.find(m => m.name === selectedMonteur)
                : (isMonteur
                    ? monteurPerformance.find(m => m.name === user.full_name || m.id === user.id)
                    : monteurPerformance[0]);

              if (!currentUserData || currentUserData.totalLeistungen === 0) {
                return (
                  <Card className="card-elevation border-none mb-6 lg:mb-8">
                    <CardContent className="p-6 lg:p-8 text-center">
                      <Construction className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Daten verfügbar</h3>
                      <p className="text-gray-400">
                        Für {currentUserData?.name || selectedMonteur} sind für {selectedMonthName} keine Leistungsdaten verfügbar.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              if (activeView === 'personal') {
                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
                      <Card className="card-elevation border-none">
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-lg md:text-2xl font-bold text-blue-600">{currentUserData.totalLeistungen}</div>
                          <div className="text-xs md:text-sm text-gray-600">Leistungen</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="card-elevation border-none">
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-lg md:text-2xl font-bold text-green-600">{currentUserData.completedAuftraege}</div>
                          <div className="text-xs md:text-sm text-gray-600">Aufträge fertig</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="card-elevation border-none">
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-lg md:text-2xl font-bold text-orange-600">€{Math.round(currentUserData.revenue).toLocaleString('de-DE')}</div>
                          <div className="text-xs md:text-sm text-gray-600">Umsatz</div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                );
              }

              // Team View für Monteure
              return (
                <Card className="card-elevation border-none mb-6 lg:mb-8">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                      Monteur Team-Vergleich - {selectedMonthName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monteurPerformance.every(m => m.totalLeistungen === 0) ? (
                      <div className="text-center py-8 lg:py-12">
                        <Construction className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-base md:text-lg font-medium text-gray-500 mb-2">Keine Team-Daten verfügbar</h3>
                        <p className="text-sm md:text-base text-gray-400">
                          Für {selectedMonthName} sind keine Leistungsdaten für das Team verfügbar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 md:space-y-4">
                        {monteurPerformance.map((monteur, index) => {
                          const isCurrentUser = isMonteur && monteur.name === user.full_name;

                          return (
                            <Link 
                              key={monteur.id || monteur.name} 
                              to={createPageUrl(`MitarbeiterDetail?id=${monteur.id}`)}
                              className="block"
                            >
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-3 md:p-4 rounded-lg border-2 hover:shadow-lg transition-all cursor-pointer ${
                                  index === 0 ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' :
                                  index === 1 ? 'bg-gray-50 border-gray-200 hover:border-gray-300' :
                                  index === 2 ? 'bg-orange-50 border-orange-200 hover:border-orange-300' :
                                  'bg-white border-gray-100 hover:border-gray-200'
                                } ${isCurrentUser ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm md:text-base flex-shrink-0 ${
                                      index === 0 ? 'bg-yellow-500' :
                                      index === 1 ? 'bg-gray-500' :
                                      index === 2 ? 'bg-orange-500' :
                                      'bg-blue-500'
                                    }`}>
                                      {monteur.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                        {monteur.name}
                                        {isCurrentUser && 
                                         <span className="ml-2 text-blue-600 text-xs">(Sie)</span>}
                                      </h3>
                                      <p className="text-xs md:text-sm text-gray-600">{monteur.totalLeistungen} Leistungen</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    <div>
                                      <div className="font-bold text-base md:text-lg text-green-600">
                                        €{Math.round(monteur.revenue).toLocaleString('de-DE')}
                                      </div>
                                      <div className="text-xs md:text-sm text-gray-600">
                                        {monteur.completedAuftraege} Aufträge
                                      </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Oberfläche Team View */}
            {activeTeamView === 'oberflaeche' && (
              <>
                <Card className="card-elevation border-none mb-6 lg:mb-8">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                      Oberfläche Team-Vergleich - {selectedMonthName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {oberflaechePerformance.every(o => o.totalJobs === 0) ? (
                      <div className="text-center py-8 lg:py-12">
                        <Package className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-base md:text-lg font-medium text-gray-500 mb-2">Keine Team-Daten verfügbar</h3>
                        <p className="text-sm md:text-base text-gray-400">
                          Für {selectedMonthName} sind keine Leistungsdaten für das Team verfügbar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 md:space-y-4">
                        {oberflaechePerformance.map((oberflaeche, index) => {
                          const isCurrentUser = isOberflaeche && oberflaeche.name === user.full_name;

                          return (
                            <Link 
                              key={oberflaeche.id || oberflaeche.name} 
                              to={createPageUrl(`MitarbeiterDetail?id=${oberflaeche.id}`)}
                              className="block"
                            >
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-3 md:p-4 rounded-lg border-2 hover:shadow-lg transition-all cursor-pointer ${
                                  index === 0 ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' :
                                  index === 1 ? 'bg-gray-50 border-gray-200 hover:border-gray-300' :
                                  index === 2 ? 'bg-orange-50 border-orange-200 hover:border-orange-300' :
                                  'bg-white border-gray-100 hover:border-gray-200'
                                } ${isCurrentUser ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm md:text-base flex-shrink-0 ${
                                      index === 0 ? 'bg-yellow-500' :
                                      index === 1 ? 'bg-gray-500' :
                                      index === 2 ? 'bg-orange-500' :
                                      'bg-blue-500'
                                    }`}>
                                      {oberflaeche.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                        {oberflaeche.name}
                                        {isCurrentUser && 
                                         <span className="ml-2 text-blue-600 text-xs">(Sie)</span>}
                                      </h3>
                                      <p className="text-xs md:text-sm text-gray-600">{oberflaeche.totalJobs} Arbeiten</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    <div>
                                      <div className="font-bold text-base md:text-lg text-green-600">
                                        €{Math.round(oberflaeche.revenue).toLocaleString('de-DE')}
                                      </div>
                                      <div className="text-xs md:text-sm text-gray-600">
                                        {Math.round(oberflaeche.achievementPercentage)}% vom Soll
                                      </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                  </div>
                                </div>
                                
                                <Progress value={Math.min(oberflaeche.achievementPercentage, 100)} className="h-2 mb-3" />
                                
                                <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                                  <div className="text-xs">
                                    <div className="font-semibold text-orange-600">{oberflaeche.backfillCount}</div>
                                    <div className="text-gray-600">Verfüllungen</div>
                                  </div>
                                  <div className="text-xs">
                                    <div className="font-semibold text-green-600">{oberflaeche.surfaceCount}</div>
                                    <div className="text-gray-600">Oberflächen</div>
                                  </div>
                                  <div className="text-xs">
                                    <div className="font-semibold text-blue-600">
                                      €{Math.round(oberflaeche.revenue).toLocaleString('de-DE')}
                                    </div>
                                    <div className="text-gray-600">Provision</div>
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
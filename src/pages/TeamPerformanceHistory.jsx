import React, { useState, useEffect, useMemo } from "react";
import { Project, Excavation, User, PriceItem, KolonnenSollwert } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target, Calendar, Users, BarChart3, Loader2, AlertCircle, History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TeamPerformanceHistoryPage() {
  const [users, setUsers] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [sollwerte, setSollwerte] = useState([]);
  const [selectedTeamType, setSelectedTeamType] = useState('bauleiter');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedMonthCount, setSelectedMonthCount] = useState(6);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [usersData, excavationsData, priceItemsData, sollwerteData] = await Promise.all([
        User.list().catch(() => []),
        Excavation.list("-created_date").catch(() => []),
        PriceItem.list().catch(() => []),
        KolonnenSollwert.list().catch(() => [])
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
      setPriceItems(Array.isArray(priceItemsData) ? priceItemsData : []);
      setSollwerte(Array.isArray(sollwerteData) ? sollwerteData : []);
    } catch (err) {
      console.error("Fehler beim Laden:", err);
      setError("Daten konnten nicht geladen werden");
    }
    
    setIsLoading(false);
  };

  const teamMembers = useMemo(() => {
    return users.filter(u => {
      if (selectedTeamType === 'bauleiter') return u.position === 'Bauleiter';
      if (selectedTeamType === 'oberflaeche') return u.position === 'Oberfläche';
      if (selectedTeamType === 'monteur') return u.position === 'Monteur';
      return false;
    });
  }, [users, selectedTeamType]);

  const getMonthsArray = () => {
    const months = [];
    for (let i = selectedMonthCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        value: date.toISOString().substring(0, 7),
        label: date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
      });
    }
    return months;
  };

  const historicalData = useMemo(() => {
    const months = getMonthsArray();
    const priceItemsMap = new Map(priceItems.map(p => [p.id, p]));
    
    return months.map(month => {
      const monthData = { month: month.label, monthValue: month.value };
      
      const filteredExcavations = excavations.filter(exc => {
        if (!exc || exc.exclude_from_statistics) return false;
        const datesToCheck = [exc.created_date, exc.updated_date];
        for (const dateStr of datesToCheck) {
          if (dateStr) {
            try {
              const excDate = new Date(dateStr);
              if (isNaN(excDate.getTime())) continue;
              const excMonth = excDate.toISOString().substring(0, 7);
              if (excMonth === month.value) return true;
            } catch (e) {
              continue;
            }
          }
        }
        return false;
      });

      teamMembers.forEach(member => {
        if (selectedUserId !== 'all' && member.id !== selectedUserId) return;

        if (selectedTeamType === 'bauleiter') {
          const memberExcavations = filteredExcavations.filter(exc => {
            const foremanName = member.full_name?.toLowerCase() || '';
            const excForeman = exc.foreman?.toLowerCase() || '';
            const excCreatedBy = exc.created_by?.toLowerCase() || '';
            
            let foremanFirstName = '';
            if (foremanName.includes('.')) {
              foremanFirstName = foremanName.split('.')[0];
            } else if (foremanName.includes(' ')) {
              foremanFirstName = foremanName.split(' ')[0];
            } else {
              foremanFirstName = foremanName;
            }

            return excForeman === foremanName || 
                   exc.foreman_user_id === member.id ||
                   exc.created_by === member.email ||
                   (excForeman.includes(foremanFirstName) && foremanFirstName.length > 2) ||
                   (excCreatedBy.includes(foremanFirstName) && foremanFirstName.length > 2);
          });

          const revenue = memberExcavations.reduce((sum, exc) => sum + (exc.foreman_commission || 0), 0);
          monthData[member.full_name] = revenue;
        } else if (selectedTeamType === 'oberflaeche') {
          const backfilledExcavations = filteredExcavations.filter(exc => 
            exc && exc.backfilled_by_user_id === member.id
          );
          const closedExcavations = filteredExcavations.filter(exc => 
            exc && exc.closed_by_user_id === member.id
          );
          
          const backfillRevenue = backfilledExcavations.reduce((sum, exc) => sum + (exc.backfill_commission || 0), 0);
          const surfaceRevenue = closedExcavations.reduce((sum, exc) => sum + (exc.surface_commission || 0), 0);
          const totalRevenue = backfillRevenue + surfaceRevenue;
          
          monthData[member.full_name] = totalRevenue;
        }

        // Sollwert hinzufügen
        const sollwert = sollwerte.find(s => 
          s.user_id === member.id && s.month === month.value
        );
        if (sollwert) {
          monthData[`${member.full_name}_Soll`] = Math.abs(sollwert.sollwert);
        }
      });

      return monthData;
    });
  }, [excavations, priceItems, teamMembers, selectedUserId, selectedTeamType, sollwerte, selectedMonthCount]);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Historische Daten werden geladen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Fehler beim Laden</h2>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">Erneut versuchen</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <History className="w-8 h-8 text-blue-600" />
              Leistungs-Historie
            </h1>
            <p className="text-gray-600">Historische Team-Performance mit Soll-Ist-Vergleich</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedTeamType} onValueChange={setSelectedTeamType}>
              <SelectTrigger className="w-48">
                <Users className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bauleiter">Bauleiter</SelectItem>
                <SelectItem value="oberflaeche">Oberfläche</SelectItem>
                <SelectItem value="monteur">Monteur</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Mitarbeiter wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle anzeigen</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonthCount.toString()} onValueChange={(v) => setSelectedMonthCount(parseInt(v))}>
              <SelectTrigger className="w-36">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Monate</SelectItem>
                <SelectItem value="6">6 Monate</SelectItem>
                <SelectItem value="12">12 Monate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <Card className="card-elevation border-none mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Leistungsverlauf über Zeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `€${Math.round(value).toLocaleString('de-DE')}`}
                />
                <Legend />
                {teamMembers.map((member, index) => {
                  if (selectedUserId !== 'all' && member.id !== selectedUserId) return null;
                  return (
                    <React.Fragment key={member.id}>
                      <Line
                        type="monotone"
                        dataKey={member.full_name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        name={`${member.full_name} (Ist)`}
                      />
                      <Line
                        type="monotone"
                        dataKey={`${member.full_name}_Soll`}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name={`${member.full_name} (Soll)`}
                      />
                    </React.Fragment>
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamMembers.map((member) => {
            if (selectedUserId !== 'all' && member.id !== selectedUserId) return null;

            const memberData = historicalData.map(d => ({
              month: d.month,
              revenue: d[member.full_name] || 0,
              sollwert: d[`${member.full_name}_Soll`] || 0
            }));

            const totalRevenue = memberData.reduce((sum, d) => sum + d.revenue, 0);
            const totalSoll = memberData.reduce((sum, d) => sum + d.sollwert, 0);
            const achievementPercentage = totalSoll > 0 ? (totalRevenue / totalSoll) * 100 : 0;
            const avgMonthlyRevenue = totalRevenue / memberData.length;

            const trend = memberData.length >= 2 
              ? memberData[memberData.length - 1].revenue - memberData[memberData.length - 2].revenue
              : 0;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="card-elevation border-none">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{member.full_name}</span>
                      {trend > 0 ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          +€{Math.round(trend).toLocaleString('de-DE')}
                        </Badge>
                      ) : trend < 0 ? (
                        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          €{Math.round(trend).toLocaleString('de-DE')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unverändert</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          €{Math.round(totalRevenue).toLocaleString('de-DE')}
                        </div>
                        <div className="text-sm text-gray-600">Gesamt-Umsatz</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(achievementPercentage)}%
                        </div>
                        <div className="text-sm text-gray-600">Soll erreicht</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ø Monatlicher Umsatz</span>
                        <span className="font-semibold">€{Math.round(avgMonthlyRevenue).toLocaleString('de-DE')}</span>
                      </div>
                      {totalSoll > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Gesamt-Soll</span>
                          <span className="font-semibold">€{Math.round(totalSoll).toLocaleString('de-DE')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Trend (zum Vormonat)</span>
                        <span className={`font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trend >= 0 ? '+' : ''}€{Math.round(trend).toLocaleString('de-DE')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
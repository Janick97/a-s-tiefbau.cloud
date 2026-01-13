import React, { useState, useEffect, useMemo } from "react";
import { Project, Excavation, User, PriceItem } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Calendar, Loader2, AlertCircle, Users, TrendingDown, TrendingUp, Minus } from "lucide-react";

const KOLONNEN_AUSGABEN = -20000; // -20.000€ = -100%

export default function KolonnenUebersichtPage() {
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [excavationsData, priceData, usersData] = await Promise.all([
        Excavation.list("-created_date").catch(() => []),
        PriceItem.list().catch(() => []),
        User.list().catch(() => [])
      ]);
      
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
      setPriceItems(Array.isArray(priceData) ? priceData : []);
      
      const bauleiterUsers = Array.isArray(usersData) 
        ? usersData.filter(u => u.position === 'Bauleiter')
        : [];
      setUsers(bauleiterUsers);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setError(`Laden fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
    }
    
    setIsLoading(false);
  };

  const filterExcavationsByMonth = (allExcavations, monthString) => {
    return allExcavations.filter(exc => {
      if (!exc) return false;
      
      const datesToCheck = [exc.created_date, exc.updated_date];
      
      for (const dateStr of datesToCheck) {
        if (dateStr) {
          try {
            const excDate = new Date(dateStr);
            if (isNaN(excDate.getTime())) continue;
            const excMonth = excDate.toISOString().substring(0, 7);
            if (excMonth === monthString) return true;
          } catch (e) {
            continue;
          }
        }
      }
      
      return false;
    });
  };

  const filteredExcavations = filterExcavationsByMonth(excavations, selectedMonth);

  const kolonnenPerformance = useMemo(() => {
    const priceItemsMap = new Map((Array.isArray(priceItems) ? priceItems : []).map(p => [p.id, p]));
    
    return users.map(bauleiter => {
      const foremanName = bauleiter.full_name;
      const foremanId = bauleiter.id;
      const foremanEmail = bauleiter.email;
      
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
      
      // Berechne Prozentsatz basierend auf Ausgaben
      // -20.000€ = -100%
      // 0€ = 0%
      const ausgabenPercentage = (totalRevenue / KOLONNEN_AUSGABEN) * 100;

      let grubenCount = 0;
      let grabenMeter = 0;

      foremanExcavations.forEach(exc => {
        if (!exc || !exc.price_item_id) return;
        const priceItem = priceItemsMap.get(exc.price_item_id);
        if (!priceItem) return;

        if (['10001', '10002', '10003', '10004', '10005'].includes(priceItem.item_number)) {
          grubenCount += 1;
        }
        else if (priceItem.unit === 'M') {
          grabenMeter += parseFloat(exc.quantity || 0);
        }
      });

      return {
        id: foremanId,
        name: foremanName,
        revenue: totalRevenue,
        ausgabenPercentage: Math.abs(ausgabenPercentage),
        grubenCount,
        grabenMeter: Math.round(grabenMeter),
        totalJobs: foremanExcavations.length
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredExcavations, priceItems, users]);

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

  const selectedMonthName = new Date(selectedMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-6 lg:p-8 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Kolonnen-Übersicht wird geladen</h2>
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
            <p className="text-sm text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Kolonnen-Übersicht
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Alle Kolonnen im Vergleich - {selectedMonthName}
            </p>
          </div>
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
        </motion.div>

        {/* Info Card */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Ausgaben-Skala</h3>
                <p className="text-sm text-gray-600">
                  Die Skala zeigt die Kolonnenausgaben pro Tiefbau. <strong>-20.000€ entspricht -100%</strong>, <strong>0€ = 0%</strong> (Nullpunkt), 
                  darüber hinaus wird Plus-Bereich angezeigt. Links = Minus, Rechts = Plus.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {kolonnenPerformance.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Kolonnen gefunden</h3>
              <p className="text-gray-400">
                Für {selectedMonthName} sind keine Bauleiter-Daten verfügbar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {kolonnenPerformance.map((kolonne, index) => (
              <motion.div
                key={kolonne.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`card-elevation border-2 h-full ${
                  index === 0 ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50' :
                  index === 1 ? 'border-gray-400 bg-gradient-to-br from-gray-50 to-slate-50' :
                  index === 2 ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-red-50' :
                  'border-gray-200 bg-white'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-gray-900 mb-1">
                          {kolonne.name}
                        </CardTitle>
                        <div className="text-xs text-gray-600">
                          {kolonne.totalJobs} Aufträge
                        </div>
                      </div>
                      {index < 3 && (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-500' :
                          'bg-orange-500'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Ausgaben/Einnahmen Skala */}
                    <div className="bg-white/50 rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-600">Performance</span>
                        <span className="text-lg font-bold">
                          {kolonne.ausgabenPercentage > 100 ? (
                            <span className="text-green-600">+{Math.round(kolonne.ausgabenPercentage - 100)}%</span>
                          ) : (
                            <span className="text-red-600">-{Math.round(100 - kolonne.ausgabenPercentage)}%</span>
                          )}
                        </span>
                      </div>
                      
                      {/* Skala von -100% bis +100% */}
                      <div className="space-y-2">
                        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                          {/* Mittellinie (Nullpunkt) */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-700 z-20"></div>
                          
                          {/* Minus-Bereich (links von Mitte) */}
                          {kolonne.ausgabenPercentage <= 100 && (
                            <div 
                              className="absolute top-0 bottom-0"
                              style={{ 
                                left: `${50 - (kolonne.ausgabenPercentage / 2)}%`,
                                width: `${kolonne.ausgabenPercentage / 2}%`,
                                background: `linear-gradient(to right, 
                                  rgb(${Math.round(220 - (kolonne.ausgabenPercentage * 0.8))}, 38, 38), 
                                  rgb(${Math.round(254 - (kolonne.ausgabenPercentage * 1.0))}, ${Math.round(202 - (kolonne.ausgabenPercentage * 2.0))}, ${Math.round(202 - (kolonne.ausgabenPercentage * 2.0))})
                                )`
                              }}
                            ></div>
                          )}
                          
                          {/* Plus-Bereich (rechts von Mitte) */}
                          {kolonne.ausgabenPercentage > 100 && (
                            <div 
                              className="absolute left-1/2 top-0 bottom-0"
                              style={{ 
                                width: `${Math.min((kolonne.ausgabenPercentage - 100), 100) / 2}%`,
                                background: `linear-gradient(to right, 
                                  rgb(${Math.round(187 - ((kolonne.ausgabenPercentage - 100) * 0.65))}, ${Math.round(247 - ((kolonne.ausgabenPercentage - 100) * 0.30))}, ${Math.round(208 - ((kolonne.ausgabenPercentage - 100) * 1.08))}),
                                  rgb(${Math.round(34 + ((kolonne.ausgabenPercentage - 100) * 0.20))}, ${Math.round(197 - ((kolonne.ausgabenPercentage - 100) * 0.80))}, ${Math.round(94 - ((kolonne.ausgabenPercentage - 100) * 0.40))})
                                )`
                              }}
                            ></div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>-100%</span>
                          <span className="font-semibold">0%</span>
                          <span>+100%</span>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{kolonne.grubenCount}</div>
                        <div className="text-xs text-gray-600">Gruben</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{kolonne.grabenMeter}m</div>
                        <div className="text-xs text-gray-600">Graben</div>
                      </div>
                    </div>

                    {/* Performance Indikator */}
                    <div className={`text-center py-2 rounded-lg font-semibold text-sm ${
                      kolonne.ausgabenPercentage > 100 ? 'bg-green-100 text-green-800' :
                      kolonne.ausgabenPercentage > 66 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {kolonne.ausgabenPercentage > 100 ? '✓ Im Plus' :
                       kolonne.ausgabenPercentage > 66 ? '○ Nahe Null' :
                       '△ Im Minus'}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
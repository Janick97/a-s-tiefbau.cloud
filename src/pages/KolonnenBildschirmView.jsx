import React, { useState, useEffect, useMemo } from "react";
import { Project, Excavation, User, PriceItem } from "@/entities/all";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";

const KOLONNEN_AUSGABEN = -20000; // -20.000€ = -100%

export default function KolonnenBildschirmViewPage() {
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
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

  const selectedMonthName = new Date(selectedMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Kolonnen-Übersicht wird geladen...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-white mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Fehler beim Laden</h2>
          <p className="text-white/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-[2000px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-white mb-2">
            Kolonnen-Übersicht
          </h1>
          <p className="text-2xl text-white/80">
            {selectedMonthName}
          </p>
        </motion.div>

        {kolonnenPerformance.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-2xl font-medium text-white/60 mb-2">Keine Kolonnen gefunden</h3>
            <p className="text-white/40">
              Für {selectedMonthName} sind keine Bauleiter-Daten verfügbar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {kolonnenPerformance.map((kolonne, index) => (
              <motion.div
                key={kolonne.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border-4 ${
                  index === 0 ? 'border-yellow-400' :
                  index === 1 ? 'border-gray-300' :
                  index === 2 ? 'border-orange-400' :
                  'border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {kolonne.name}
                    </h2>
                    <div className="text-sm text-white/60">
                      {kolonne.totalJobs} Aufträge
                    </div>
                  </div>
                  {index < 3 && (
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-500' :
                      'bg-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Performance Section */}
                <div className="bg-white/20 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-white/80">Performance</span>
                    <span className="text-3xl font-bold">
                      {kolonne.ausgabenPercentage > 100 ? (
                        <span className="text-green-400">+{Math.round(kolonne.ausgabenPercentage - 100)}%</span>
                      ) : (
                        <span className="text-red-400">-{Math.round(100 - kolonne.ausgabenPercentage)}%</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="relative h-8 bg-white/30 rounded-full overflow-hidden">
                      {/* Mittellinie */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white z-20"></div>
                      
                      {/* Roter Bereich (Minus) */}
                      {kolonne.ausgabenPercentage < 100 && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-red-500"
                          style={{ 
                            width: `${50 - (kolonne.ausgabenPercentage / 2)}%`
                          }}
                        ></div>
                      )}
                      
                      {/* Grüner Bereich (Plus) */}
                      {kolonne.ausgabenPercentage > 100 && (
                        <div 
                          className="absolute left-1/2 top-0 bottom-0 bg-green-500"
                          style={{ 
                            width: `${Math.min((kolonne.ausgabenPercentage - 100), 100) / 2}%`
                          }}
                        ></div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-white/60">
                      <span>-100%</span>
                      <span className="font-semibold text-white">0%</span>
                      <span>+100%</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-500/30 rounded-xl p-4 text-center">
                    <div className="text-4xl font-bold text-white">{kolonne.grubenCount}</div>
                    <div className="text-sm text-white/70">Gruben</div>
                  </div>
                  <div className="bg-green-500/30 rounded-xl p-4 text-center">
                    <div className="text-4xl font-bold text-white">{kolonne.grabenMeter}m</div>
                    <div className="text-sm text-white/70">Graben</div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`text-center py-3 rounded-xl font-bold text-lg ${
                  kolonne.ausgabenPercentage > 100 ? 'bg-green-500 text-white' :
                  kolonne.ausgabenPercentage > 66 ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {kolonne.ausgabenPercentage > 100 ? '✓ Im Plus' :
                   kolonne.ausgabenPercentage > 66 ? '○ Nahe Null' :
                   '△ Im Minus'}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
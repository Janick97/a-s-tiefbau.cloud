import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { User, Excavation, MontageLeistung, MontagePreisItem } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Euro, Wrench, Shovel, Calendar } from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function MitarbeiterDetailPage() {
  const location = useLocation();
  const [mitarbeiter, setMitarbeiter] = useState(null);
  const [excavations, setExcavations] = useState([]);
  const [montageLeistungen, setMontageLeistungen] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const userId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    loadData();
  }, [userId, selectedMonth, selectedYear]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, excavationsData, leistungenData, priceItemsData] = await Promise.all([
        User.get(userId),
        Excavation.list("-created_date"),
        MontageLeistung.list("-created_date"),
        MontagePreisItem.list()
      ]);

      setMitarbeiter(userData);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
      setMontageLeistungen(Array.isArray(leistungenData) ? leistungenData : []);
      setPriceItems(Array.isArray(priceItemsData) ? priceItemsData : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  if (isLoading || !mitarbeiter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 flex items-center justify-center">
        <div>Lädt...</div>
      </div>
    );
  }

  // Filter Daten nach Monat/Jahr
  const filteredExcavations = excavations.filter(exc => {
    if (!exc.created_date) return false;
    const date = new Date(exc.created_date);
    return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
  });

  const filteredLeistungen = montageLeistungen.filter(l => {
    if (!l.completion_date) return false;
    const date = new Date(l.completion_date);
    return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
  });

  // Bauleiter-Statistiken
  const bauleiterStats = {
    totalRevenue: 0,
    totalExcavations: 0,
    totalCommission: 0,
    grubenCount: 0,
    grabenCount: 0,
    totalMeterGraben: 0,
  };

  if (mitarbeiter.position === 'Bauleiter' || mitarbeiter.position === 'Oberfläche') {
    filteredExcavations.forEach(exc => {
      if (exc.foreman_user_id === userId) {
        bauleiterStats.totalRevenue += exc.calculated_price || 0;
        bauleiterStats.totalExcavations++;
        bauleiterStats.totalCommission += exc.foreman_commission || 0;

        // Zähle Gruben (ST) und Gräben (M)
        if (exc.quantity) {
          // Prüfe ob es eine Grube oder Graben ist basierend auf price_item
          const isGrube = exc.quantity === 1; // Vereinfachung: ST = Grube
          if (isGrube) {
            bauleiterStats.grubenCount++;
          } else {
            bauleiterStats.grabenCount++;
            bauleiterStats.totalMeterGraben += exc.quantity;
          }
        }
      }
    });
  }

  // Monteur-Statistiken
  const monteurStats = {
    totalRevenue: 0,
    totalLeistungen: 0,
    muffenGebaut: 0,
    daGespleisst: 0,
    fasernGespleisst: 0,
  };

  if (mitarbeiter.position === 'Monteur') {
    filteredLeistungen.forEach(l => {
      if (l.monteur_user_id === userId) {
        monteurStats.totalRevenue += l.calculated_price || 0;
        monteurStats.totalLeistungen++;

        // Zähle spezifische Leistungen basierend auf item_number
        const priceItem = priceItems.find(p => p.id === l.preis_item_id);
        if (priceItem) {
          const itemNumber = priceItem.item_number || '';
          const description = priceItem.description || '';

          // Muffen (Schrumpfmuffe, Wannenmuffe, etc.)
          if (description.toLowerCase().includes('muffe')) {
            monteurStats.muffenGebaut += l.quantity || 0;
          }

          // DA gespleißt (APL, Anschalteinrichtungen, etc.)
          if (description.toLowerCase().includes('apl') || 
              description.toLowerCase().includes('anschalt') ||
              description.toLowerCase().includes('da')) {
            monteurStats.daGespleisst += l.quantity || 0;
          }

          // Fasern gespleißt (Glasfaser-Arbeiten)
          if (description.toLowerCase().includes('glasfaser') ||
              description.toLowerCase().includes('gf') ||
              description.toLowerCase().includes('faser')) {
            monteurStats.fasernGespleisst += l.quantity || 0;
          }
        }
      }
    });
  }

  const months = [
    { value: 1, label: 'Januar' }, { value: 2, label: 'Februar' }, { value: 3, label: 'März' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Dezember' }
  ];

  const years = [2024, 2025, 2026];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Analytics")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{mitarbeiter.full_name}</h1>
            <p className="text-gray-600">{mitarbeiter.position}</p>
          </div>
        </div>

        {/* Monat/Jahr Auswahl */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3 items-center flex-wrap">
              <label className="text-sm font-medium">Zeitraum:</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border rounded px-3 py-1 text-sm"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border rounded px-3 py-1 text-sm"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Bauleiter/Oberfläche Statistiken */}
        {(mitarbeiter.position === 'Bauleiter' || mitarbeiter.position === 'Oberfläche') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Euro className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Umsatz</p>
                        <p className="text-lg font-bold text-gray-900">
                          €{bauleiterStats.totalRevenue.toLocaleString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shovel className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Ausgrabungen</p>
                        <p className="text-lg font-bold text-gray-900">{bauleiterStats.totalExcavations}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Provision</p>
                        <p className="text-lg font-bold text-gray-900">
                          €{bauleiterStats.totalCommission.toLocaleString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Details</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Gruben:</span>
                          <span className="font-semibold">{bauleiterStats.grubenCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gräben:</span>
                          <span className="font-semibold">{bauleiterStats.grabenCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Meter Graben:</span>
                          <span className="font-semibold">{bauleiterStats.totalMeterGraben.toFixed(1)} m</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}

        {/* Monteur Statistiken */}
        {mitarbeiter.position === 'Monteur' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Euro className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Umsatz</p>
                        <p className="text-lg font-bold text-gray-900">
                          €{monteurStats.totalRevenue.toLocaleString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Wrench className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Leistungen</p>
                        <p className="text-lg font-bold text-gray-900">{monteurStats.totalLeistungen}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Muffen</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Gebaut:</span>
                          <span className="font-semibold">{monteurStats.muffenGebaut.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="card-elevation border-none">
                  <CardContent className="p-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Spleiß-Arbeiten</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>DA gespleißt:</span>
                          <span className="font-semibold">{monteurStats.daGespleisst.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fasern gespleißt:</span>
                          <span className="font-semibold">{monteurStats.fasernGespleisst.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from "react";
import { User, Excavation, PriceItem, KolonnenSollwert } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import { Download, Calendar, FileText, Loader2, TrendingUp, TrendingDown, Award, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [sollwerte, setSollwerte] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [reportType, setReportType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, usersData, excavationsData, priceData, sollwerteData] = await Promise.all([
        User.me(),
        User.list(),
        Excavation.list("-created_date"),
        PriceItem.list(),
        KolonnenSollwert.list()
      ]);

      setCurrentUser(userData);
      
      const teamUsers = usersData.filter(u => u.position === 'Bauleiter' || u.position === 'Oberfläche');
      setUsers(teamUsers);
      
      setExcavations(excavationsData);
      setPriceItems(priceData);
      setSollwerte(sollwerteData);

      if (userData && (userData.position === 'Bauleiter' || userData.position === 'Oberfläche')) {
        setSelectedUserId(userData.id);
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  const reportData = useMemo(() => {
    if (!selectedUserId) return null;

    const user = users.find(u => u.id === selectedUserId);
    if (!user) return null;

    let filteredExcavations = [];

    if (reportType === 'month') {
      filteredExcavations = excavations.filter(exc => {
        const excDate = new Date(exc.created_date);
        const excMonth = excDate.toISOString().substring(0, 7);
        return excMonth === selectedMonth;
      });
    } else {
      filteredExcavations = excavations.filter(exc => {
        const excDate = new Date(exc.created_date);
        return excDate.getFullYear().toString() === selectedYear;
      });
    }

    if (user.position === 'Bauleiter') {
      const userExcavations = filteredExcavations.filter(exc => {
        const lowerUserName = user.full_name?.toLowerCase() || '';
        const lowerForeman = exc.foreman?.toLowerCase() || '';
        const lowerCreatedBy = exc.created_by?.toLowerCase() || '';
        
        return exc.foreman_user_id === user.id ||
               lowerForeman.includes(lowerUserName.split(' ')[0]) ||
               lowerCreatedBy === user.email?.toLowerCase() ||
               exc.created_by === user.email;
      });

      const totalRevenue = userExcavations.reduce((sum, exc) => sum + (exc.foreman_commission || 0), 0);
      
      let grubenCount = 0;
      let grabenMeter = 0;
      const priceItemsMap = new Map(priceItems.map(p => [p.id, p]));

      userExcavations.forEach(exc => {
        const priceItem = priceItemsMap.get(exc.price_item_id);
        if (priceItem) {
          if (['10001', '10002', '10003', '10004', '10005'].includes(priceItem.item_number)) {
            grubenCount += 1;
          } else if (priceItem.unit === 'M') {
            grabenMeter += parseFloat(exc.quantity || 0);
          }
        }
      });

      const sollwert = sollwerte.find(s => 
        s.user_id === user.id && 
        s.month === (reportType === 'month' ? selectedMonth : `${selectedYear}-01`)
      );

      return {
        user,
        totalJobs: userExcavations.length,
        totalRevenue,
        grubenCount,
        grabenMeter: Math.round(grabenMeter),
        target: sollwert ? Math.abs(sollwert.sollwert) : 20000,
        achievement: sollwert ? (totalRevenue / Math.abs(sollwert.sollwert)) * 100 : 0,
        excavations: userExcavations
      };
    } else if (user.position === 'Oberfläche') {
      const backfilledExcavations = filteredExcavations.filter(exc => 
        exc.backfilled_by_user_id === user.id || exc.backfilled_by === user.full_name
      );
      
      const closedExcavations = filteredExcavations.filter(exc => 
        exc.closed_by_user_id === user.id || exc.closed_by === user.full_name
      );

      const backfillRevenue = backfilledExcavations.reduce((sum, exc) => sum + (exc.backfill_commission || 0), 0);
      const surfaceRevenue = closedExcavations.reduce((sum, exc) => sum + (exc.surface_commission || 0), 0);
      const totalRevenue = backfillRevenue + surfaceRevenue;

      const sollwert = sollwerte.find(s => 
        s.user_id === user.id && 
        s.month === (reportType === 'month' ? selectedMonth : `${selectedYear}-01`)
      );

      return {
        user,
        totalJobs: backfilledExcavations.length + closedExcavations.length,
        totalRevenue,
        backfillCount: backfilledExcavations.length,
        closureCount: closedExcavations.length,
        backfillRevenue,
        surfaceRevenue,
        target: sollwert ? Math.abs(sollwert.sollwert) : 10000,
        achievement: sollwert ? (totalRevenue / Math.abs(sollwert.sollwert)) * 100 : 0,
        excavations: [...backfilledExcavations, ...closedExcavations]
      };
    }

    return null;
  }, [selectedUserId, reportType, selectedMonth, selectedYear, users, excavations, priceItems, sollwerte]);

  const handleExportPDF = async () => {
    if (!reportData) return;

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let yPos = 20;

      doc.setFontSize(20);
      doc.text('Leistungsbericht', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      const periodText = reportType === 'month' 
        ? new Date(selectedMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        : `Jahr ${selectedYear}`;
      doc.text(periodText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      doc.setFontSize(16);
      doc.text(`${reportData.user.full_name} (${reportData.user.position})`, 20, yPos);
      yPos += 15;

      doc.setFontSize(12);
      doc.text('Übersicht', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text(`Gesamt Aufträge: ${reportData.totalJobs}`, 20, yPos);
      yPos += 7;
      doc.text(`Gesamtumsatz: €${reportData.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, 20, yPos);
      yPos += 7;
      doc.text(`Soll-Wert: €${reportData.target.toLocaleString('de-DE')}`, 20, yPos);
      yPos += 7;
      doc.text(`Zielerreichung: ${Math.round(reportData.achievement)}%`, 20, yPos);
      yPos += 10;

      if (reportData.user.position === 'Bauleiter') {
        doc.text(`Gruben: ${reportData.grubenCount}`, 20, yPos);
        yPos += 7;
        doc.text(`Grabenmeter: ${reportData.grabenMeter}m`, 20, yPos);
        yPos += 15;
      } else {
        doc.text(`Verfüllt: ${reportData.backfillCount} (€${reportData.backfillRevenue.toLocaleString('de-DE')})`, 20, yPos);
        yPos += 7;
        doc.text(`Geschlossen: ${reportData.closureCount} (€${reportData.surfaceRevenue.toLocaleString('de-DE')})`, 20, yPos);
        yPos += 15;
      }

      doc.setFontSize(12);
      doc.text('Detaillierte Auflistung', 20, yPos);
      yPos += 10;

      doc.setFontSize(9);
      reportData.excavations.slice(0, 20).forEach((exc, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const commission = reportData.user.position === 'Bauleiter' 
          ? exc.foreman_commission || 0
          : (exc.backfill_commission || 0) + (exc.surface_commission || 0);

        doc.text(`${idx + 1}. ${exc.location_name} - €${commission.toLocaleString('de-DE')}`, 20, yPos);
        yPos += 6;
        doc.text(`   ${exc.street}, ${exc.city}`, 20, yPos);
        yPos += 8;
      });

      const fileName = `Bericht_${reportData.user.full_name.replace(/\s/g, '_')}_${periodText.replace(/\s/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Fehler beim Export:", error);
    }
    setIsExporting(false);
  };

  const getMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthString = date.toISOString().substring(0, 7);
      const displayName = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      options.push({ value: monthString, label: displayName });
    }
    return options;
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear - i;
      options.push({ value: year.toString(), label: year.toString() });
    }
    return options;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <Card className="card-elevation border-none">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
            <h2 className="text-lg font-semibold">Berichte werden geladen...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 lg:mb-8"
        >
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Leistungsberichte
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Automatisierte Monats- und Jahresberichte generieren
          </p>
        </motion.div>

        {/* Filter Card */}
        <Card className="card-elevation border-none mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Berichtsfilter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Mitarbeiter</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Berichtstyp</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monatsbericht</SelectItem>
                    <SelectItem value="year">Jahresbericht</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === 'month' ? (
                <div className="space-y-2">
                  <Label>Monat</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
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
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Jahr</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getYearOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-end">
                <Button 
                  onClick={handleExportPDF} 
                  disabled={!reportData || isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exportiere...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      PDF Export
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Display */}
        {reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="card-elevation border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Gesamt Aufträge</p>
                      <h3 className="text-3xl font-bold text-gray-900">{reportData.totalJobs}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevation border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Gesamtumsatz</p>
                      <h3 className="text-2xl font-bold text-green-600">
                        €{reportData.totalRevenue.toLocaleString('de-DE')}
                      </h3>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevation border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Soll-Wert</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        €{reportData.target.toLocaleString('de-DE')}
                      </h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevation border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Zielerreichung</p>
                      <h3 className={`text-3xl font-bold ${
                        reportData.achievement >= 100 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {Math.round(reportData.achievement)}%
                      </h3>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      reportData.achievement >= 100 ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {reportData.achievement >= 100 ? (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-orange-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Details Card */}
            <Card className="card-elevation border-none">
              <CardHeader>
                <CardTitle>Detaillierte Leistungsdaten</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.user.position === 'Bauleiter' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Gruben</p>
                      <p className="text-4xl font-bold text-blue-600">{reportData.grubenCount}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Grabenmeter</p>
                      <p className="text-4xl font-bold text-green-600">{reportData.grabenMeter}m</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Ø Umsatz pro Auftrag</p>
                      <p className="text-3xl font-bold text-purple-600">
                        €{reportData.totalJobs > 0 
                          ? Math.round(reportData.totalRevenue / reportData.totalJobs).toLocaleString('de-DE')
                          : '0'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Verfüllt</p>
                      <p className="text-4xl font-bold text-blue-600">{reportData.backfillCount}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Geschlossen</p>
                      <p className="text-4xl font-bold text-green-600">{reportData.closureCount}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Verfüllung Umsatz</p>
                      <p className="text-2xl font-bold text-orange-600">
                        €{reportData.backfillRevenue.toLocaleString('de-DE')}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Oberfläche Umsatz</p>
                      <p className="text-2xl font-bold text-purple-600">
                        €{reportData.surfaceRevenue.toLocaleString('de-DE')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* List of Excavations */}
            <Card className="card-elevation border-none">
              <CardHeader>
                <CardTitle>Auflistung ({reportData.excavations.length} Aufträge)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.excavations.slice(0, 10).map((exc, idx) => {
                    const commission = reportData.user.position === 'Bauleiter' 
                      ? exc.foreman_commission || 0
                      : (exc.backfill_commission || 0) + (exc.surface_commission || 0);

                    return (
                      <div key={exc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{exc.location_name}</p>
                          <p className="text-xs text-gray-600">{exc.street}, {exc.city}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">€{commission.toLocaleString('de-DE')}</Badge>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(exc.created_date).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {reportData.excavations.length > 10 && (
                    <p className="text-sm text-gray-600 text-center py-2">
                      ... und {reportData.excavations.length - 10} weitere
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="card-elevation border-none">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Daten verfügbar</h3>
              <p className="text-gray-400">
                Bitte wählen Sie einen Mitarbeiter und Zeitraum aus.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
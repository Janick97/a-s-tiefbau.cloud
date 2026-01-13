import React, { useState, useEffect } from "react";
import { User, KolonnenSollwert } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Calendar, Save, Loader2, AlertCircle, Users as UsersIcon, CheckCircle } from "lucide-react";

export default function KolonnenKonfigurationPage() {
  const [users, setUsers] = useState([]);
  const [sollwerte, setSollwerte] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [monthSollwerte, setMonthSollwerte] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMonthSollwerte();
  }, [selectedMonth, sollwerte, users]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [usersData, sollwerteData] = await Promise.all([
        User.list().catch(() => []),
        KolonnenSollwert.list('-month').catch(() => [])
      ]);
      
      const bauleiterUsers = Array.isArray(usersData) 
        ? usersData.filter(u => u.position === 'Bauleiter')
        : [];
      setUsers(bauleiterUsers);
      setSollwerte(Array.isArray(sollwerteData) ? sollwerteData : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setError(`Laden fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
    }
    
    setIsLoading(false);
  };

  const loadMonthSollwerte = () => {
    const monthData = {};
    
    users.forEach(user => {
      const existingSollwert = sollwerte.find(
        s => s.user_id === user.id && s.month === selectedMonth
      );
      
      monthData[user.id] = {
        id: existingSollwert?.id || null,
        sollwert: existingSollwert?.sollwert || -20000,
        notes: existingSollwert?.notes || ''
      };
    });
    
    setMonthSollwerte(monthData);
  };

  const handleSollwertChange = (userId, field, value) => {
    setMonthSollwerte({
      ...monthSollwerte,
      [userId]: {
        ...monthSollwerte[userId],
        [field]: value
      }
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    
    try {
      for (const user of users) {
        const data = monthSollwerte[user.id];
        if (!data) continue;
        
        const sollwertData = {
          user_id: user.id,
          user_name: user.full_name,
          month: selectedMonth,
          sollwert: parseFloat(data.sollwert),
          notes: data.notes
        };
        
        if (data.id) {
          await KolonnenSollwert.update(data.id, sollwertData);
        } else {
          await KolonnenSollwert.create(sollwertData);
        }
      }
      
      await loadData();
      alert('Alle Soll-Werte erfolgreich gespeichert!');
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern: " + error.message);
    }
    
    setIsSaving(false);
  };

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
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Konfiguration wird geladen</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Kolonnen-Konfiguration
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Monatliche Soll-Werte für {selectedMonthName}
            </p>
          </div>
          <div className="flex items-center gap-4">
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
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Speichere...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Alle speichern
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {error && (
          <Card className="card-elevation border-red-200 bg-red-50 mb-6">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UsersIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Hinweis</h3>
                <p className="text-sm text-gray-600">
                  Tragen Sie für jeden Bauleiter den Soll-Wert ein. <strong>Negative Werte</strong> (z.B. -20000) bedeuten, 
                  dass die Kolonne mit diesem Betrag im Minus startet. Nach dem Bearbeiten auf <strong>"Alle speichern"</strong> klicken.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {users.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-12 text-center">
              <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Bauleiter gefunden</h3>
              <p className="text-gray-400">
                Es wurden keine Benutzer mit der Position "Bauleiter" gefunden.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="card-elevation border-none hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {user.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:w-auto w-full">
                        <div className="flex-1 sm:w-48">
                          <Label className="text-xs text-gray-600 mb-1 block">Soll-Wert (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={monthSollwerte[user.id]?.sollwert || -20000}
                            onChange={(e) => handleSollwertChange(user.id, 'sollwert', e.target.value)}
                            className="text-right font-semibold"
                          />
                        </div>
                        
                        <div className="flex-1 sm:w-64">
                          <Label className="text-xs text-gray-600 mb-1 block">Notizen (optional)</Label>
                          <Input
                            type="text"
                            value={monthSollwerte[user.id]?.notes || ''}
                            onChange={(e) => handleSollwertChange(user.id, 'notes', e.target.value)}
                            placeholder="Z.B. Urlaubsmonat..."
                          />
                        </div>
                        
                        {monthSollwerte[user.id]?.id && (
                          <div className="flex items-end">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                          </div>
                        )}
                      </div>
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
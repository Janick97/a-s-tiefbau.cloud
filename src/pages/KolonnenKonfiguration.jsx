import React, { useState, useEffect } from "react";
import { User, KolonnenSollwert } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Calendar, Save, Loader2, AlertCircle, Settings, Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function KolonnenKonfigurationPage() {
  const [users, setUsers] = useState([]);
  const [sollwerte, setSollwerte] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSollwert, setEditingSollwert] = useState(null);

  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '',
    month: new Date().toISOString().substring(0, 7),
    sollwert: -20000,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

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

  const handleUserChange = (userId) => {
    const selectedUser = users.find(u => u.id === userId);
    setFormData({
      ...formData,
      user_id: userId,
      user_name: selectedUser?.full_name || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (editingSollwert) {
        await KolonnenSollwert.update(editingSollwert.id, formData);
      } else {
        await KolonnenSollwert.create(formData);
      }
      
      await loadData();
      setShowDialog(false);
      setEditingSollwert(null);
      setFormData({
        user_id: '',
        user_name: '',
        month: new Date().toISOString().substring(0, 7),
        sollwert: -20000,
        notes: ''
      });
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern: " + error.message);
    }
    
    setIsSaving(false);
  };

  const handleEdit = (sollwert) => {
    setEditingSollwert(sollwert);
    setFormData({
      user_id: sollwert.user_id,
      user_name: sollwert.user_name,
      month: sollwert.month,
      sollwert: sollwert.sollwert,
      notes: sollwert.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (sollwertId) => {
    if (!confirm('Möchten Sie diesen Soll-Wert wirklich löschen?')) return;
    
    try {
      await KolonnenSollwert.delete(sollwertId);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      alert("Fehler beim Löschen: " + error.message);
    }
  };

  const getMonthName = (monthString) => {
    return new Date(monthString + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const groupedSollwerte = sollwerte.reduce((acc, sollwert) => {
    if (!acc[sollwert.month]) {
      acc[sollwert.month] = [];
    }
    acc[sollwert.month].push(sollwert);
    return acc;
  }, {});

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
              Monatliche Soll-Werte für Bauleiter verwalten
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingSollwert(null);
              setFormData({
                user_id: '',
                user_name: '',
                month: new Date().toISOString().substring(0, 7),
                sollwert: -20000,
                notes: ''
              });
              setShowDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Soll-Wert
          </Button>
        </motion.div>

        {error && (
          <Card className="card-elevation border-red-200 bg-red-50 mb-6">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {Object.keys(groupedSollwerte).length === 0 ? (
            <Card className="card-elevation border-none">
              <CardContent className="p-12 text-center">
                <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Konfiguration vorhanden</h3>
                <p className="text-gray-400 mb-6">
                  Erstellen Sie monatliche Soll-Werte für Ihre Bauleiter
                </p>
                <Button 
                  onClick={() => setShowDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Soll-Wert anlegen
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.keys(groupedSollwerte).sort().reverse().map(month => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="card-elevation border-none">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      {getMonthName(month)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {groupedSollwerte[month].map((sollwert) => (
                        <div key={sollwert.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {sollwert.user_name}
                              </h3>
                              <div className="flex items-center gap-4 text-sm">
                                <span className={`font-bold ${
                                  sollwert.sollwert < 0 ? 'text-red-600' : 
                                  sollwert.sollwert > 0 ? 'text-green-600' : 
                                  'text-gray-600'
                                }`}>
                                  {sollwert.sollwert < 0 ? '-' : '+'}{Math.abs(sollwert.sollwert).toLocaleString('de-DE')}€
                                </span>
                                {sollwert.notes && (
                                  <span className="text-gray-600">
                                    {sollwert.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(sollwert)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(sollwert.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Dialog für neuen/bearbeiteten Soll-Wert */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSollwert ? 'Soll-Wert bearbeiten' : 'Neuer Soll-Wert'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">Bauleiter *</Label>
                <Select 
                  value={formData.user_id} 
                  onValueChange={handleUserChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bauleiter auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month">Monat *</Label>
                <Input
                  id="month"
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sollwert">
                  Soll-Wert (€) *
                  <span className="text-xs text-gray-500 ml-2">
                    Negativ für Start im Minus, z.B. -20000
                  </span>
                </Label>
                <Input
                  id="sollwert"
                  type="number"
                  step="0.01"
                  value={formData.sollwert}
                  onChange={(e) => setFormData({ ...formData, sollwert: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Z.B. Urlaubsmonat, Krankheit, etc."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  disabled={isSaving}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Speichere...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Speichern
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
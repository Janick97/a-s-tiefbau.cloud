import React, { useState, useEffect } from "react";
import { MontagePreisItem } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function PriceFormDialog({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(item || {
    item_number: "",
    description: "",
    unit: "ST",
    price: 0,
    category: "Installation"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Position bearbeiten" : "Neue Position hinzufügen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Positionsnummer</Label>
            <Input
              value={formData.item_number}
              onChange={(e) => setFormData({...formData, item_number: e.target.value})}
              placeholder="z.B. M-001"
              required
            />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Beschreibung der Leistung"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Einheit</Label>
              <Select value={formData.unit} onValueChange={(val) => setFormData({...formData, unit: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ST">Stück (ST)</SelectItem>
                  <SelectItem value="M">Meter (M)</SelectItem>
                  <SelectItem value="H">Stunden (H)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preis (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                required
              />
            </div>
          </div>
          <div>
            <Label>Kategorie</Label>
            <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Installation">Installation</SelectItem>
                <SelectItem value="Inbetriebnahme">Inbetriebnahme</SelectItem>
                <SelectItem value="Wartung">Wartung</SelectItem>
                <SelectItem value="Reparatur">Reparatur</SelectItem>
                <SelectItem value="Sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
            <Button type="submit">Speichern</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MontagePriceListPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await MontagePreisItem.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setItems([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (data) => {
    try {
      if (editingItem) {
        await MontagePreisItem.update(editingItem.id, data);
      } else {
        await MontagePreisItem.create(data);
      }
      setShowForm(false);
      setEditingItem(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Position wirklich löschen?")) {
      try {
        await MontagePreisItem.delete(id);
        loadData();
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Montage-Preisliste</h1>
            <p className="text-gray-600">Verwaltung der Montageleistungen und Preise</p>
          </div>
          <Button onClick={() => { setEditingItem(null); setShowForm(true); }} className="bg-gradient-to-r from-blue-500 to-blue-600">
            <Plus className="w-5 h-5 mr-2" />
            Neue Position
          </Button>
        </div>

        <Card className="card-elevation border-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">Lädt...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Noch keine Positionen vorhanden</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.item_number}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right font-semibold">€{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setShowForm(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AnimatePresence>
          {showForm && (
            <PriceFormDialog
              item={editingItem}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingItem(null); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
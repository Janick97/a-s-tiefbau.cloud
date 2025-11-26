import React, { useState, useEffect } from "react";
import { PriceItem } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Settings, Plus, Edit, Trash2 } from "lucide-react";

// --- Formular-Komponente (unverändert) ---
function PriceFormDialog({ isOpen, setIsOpen, item, onSubmit }) {
    const [formData, setFormData] = useState({
        item_number: '',
        description: '',
        unit: 'ST',
        price: '',
        type: 'Grube'
    });

    useEffect(() => {
        if (item) {
            setFormData({
                item_number: item.item_number || '',
                description: item.description || '',
                unit: item.unit || 'ST',
                price: item.price || '',
                type: item.type || 'Grube'
            });
        } else {
            setFormData({ item_number: '', description: '', unit: 'ST', price: '', type: 'Grube' });
        }
    }, [item, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...formData, price: parseFloat(formData.price) || 0 });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{item ? 'Position bearbeiten' : 'Neue Position erstellen'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="item_number">Positionsnummer</Label>
                        <Input id="item_number" value={formData.item_number} onChange={(e) => setFormData({...formData, item_number: e.target.value})} required />
                    </div>
                    <div>
                        <Label htmlFor="description">Beschreibung</Label>
                        <Input id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="price">Preis (€)</Label>
                            <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
                        </div>
                        <div>
                            <Label htmlFor="unit">Einheit</Label>
                            <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ST">ST</SelectItem>
                                    <SelectItem value="M">M</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="type">Typ</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Grube">Grube</SelectItem>
                                <SelectItem value="Graben">Graben</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Abbrechen</Button>
                        <Button type="submit">Speichern</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Hauptkomponente: PriceListPage (überarbeitet) ---
export default function PriceListPage() {
  const [priceItems, setPriceItems] = useState(null); // Start mit null um Ladezustand klar zu definieren
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadPriceItems = async () => {
    setIsLoading(true);
    try {
      const items = await PriceItem.list("item_number");
      setPriceItems(Array.isArray(items) ? items : []); // Garantiert, dass es ein Array ist
    } catch (error) {
      console.error("Fehler beim Laden der Preisliste:", error);
      setPriceItems([]); // Im Fehlerfall auf ein leeres Array setzen
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPriceItems();
  }, []);

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm("Sind Sie sicher, dass Sie diese Position löschen möchten?")) {
      try {
        await PriceItem.delete(itemId);
        await loadPriceItems();
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingItem) {
        await PriceItem.update(editingItem.id, formData);
      } else {
        await PriceItem.create(formData);
      }
      setIsFormOpen(false);
      await loadPriceItems();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const renderTableBody = () => {
    // 1. Expliziter Ladezustand
    if (isLoading || priceItems === null) {
      return Array(5).fill(0).map((_, i) => (
        <TableRow key={`loading-${i}`}>
          <TableCell colSpan={6} className="h-12 text-center">Lade Daten...</TableCell>
        </TableRow>
      ));
    }
    
    // 2. Garantiert ein Array
    const safeItems = Array.isArray(priceItems) ? priceItems : [];

    // 3. Leerer Zustand
    if (safeItems.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center text-gray-500">
            Keine Preispositionen gefunden.
          </TableCell>
        </TableRow>
      );
    }

    // 4. Daten-Rendering mit Prüfung auf `item`
    return safeItems.map((item) => {
      if (!item || !item.id) return null; // Ignoriert ungültige Einträge
      return (
        <TableRow key={item.id}>
          <TableCell className="font-mono">{item.item_number}</TableCell>
          <TableCell className="font-medium">{item.description}</TableCell>
          <TableCell>{item.unit}</TableCell>
          <TableCell>€{(item.price || 0).toFixed(2)}</TableCell>
          <TableCell>{item.type}</TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Preisliste</h1>
            <p className="text-gray-600">Verwalten Sie die Preispositionen für Ausgrabungen</p>
          </div>
          <Button onClick={handleAddNew} className="ripple-effect bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            Neue Position
          </Button>
        </motion.div>
        
        <PriceFormDialog
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          item={editingItem}
          onSubmit={handleFormSubmit}
        />

        <Card className="card-elevation border-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Positionsnr.</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Einheit</TableHead>
                  <TableHead>Preis</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableBody()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
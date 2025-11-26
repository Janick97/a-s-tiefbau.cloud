import React, { useState, useEffect } from "react";
import { MontageMaterial } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Package, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

function MaterialFormDialog({ material, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(material || {
    name: "",
    article_number: "",
    unit: "ST",
    category: "Kabel",
    current_stock: 0,
    min_stock: 0,
    unit_cost: 0,
    supplier: "",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? "Material bearbeiten" : "Neues Material hinzufügen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Artikelnummer</Label>
              <Input
                value={formData.article_number}
                onChange={(e) => setFormData({...formData, article_number: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Einheit</Label>
              <Select value={formData.unit} onValueChange={(val) => setFormData({...formData, unit: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Meter (M)</SelectItem>
                  <SelectItem value="ST">Stück (ST)</SelectItem>
                  <SelectItem value="PAK">Paket (PAK)</SelectItem>
                  <SelectItem value="KG">Kilogramm (KG)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategorie</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kabel">Kabel</SelectItem>
                  <SelectItem value="Stecker">Stecker</SelectItem>
                  <SelectItem value="Gehäuse">Gehäuse</SelectItem>
                  <SelectItem value="Befestigung">Befestigung</SelectItem>
                  <SelectItem value="Werkzeug">Werkzeug</SelectItem>
                  <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Aktueller Bestand</Label>
              <Input
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({...formData, current_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Mindestbestand</Label>
              <Input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({...formData, min_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Stückkosten (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div>
            <Label>Lieferant</Label>
            <Input
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
            />
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
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

export default function MontageMaterialInventoryPage() {
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await MontageMaterial.list();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setMaterials([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (data) => {
    try {
      if (editingMaterial) {
        await MontageMaterial.update(editingMaterial.id, data);
      } else {
        await MontageMaterial.create(data);
      }
      setShowForm(false);
      setEditingMaterial(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Material wirklich löschen?")) {
      try {
        await MontageMaterial.delete(id);
        loadData();
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  const filteredMaterials = materials.filter(mat => {
    const matchesSearch = mat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mat.article_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || mat.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockMaterials = materials.filter(m => m.current_stock <= m.min_stock);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Montage-Materiallager</h1>
            <p className="text-gray-600">Verwaltung der Montagematerialien</p>
          </div>
          <Button onClick={() => { setEditingMaterial(null); setShowForm(true); }} className="bg-gradient-to-r from-blue-500 to-blue-600">
            <Plus className="w-5 h-5 mr-2" />
            Neues Material
          </Button>
        </div>

        {lowStockMaterials.length > 0 && (
          <Card className="card-elevation border-l-4 border-l-red-500 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">{lowStockMaterials.length} Material(ien) unter Mindestbestand!</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{materials.length}</p>
                  <p className="text-sm text-gray-600">Gesamt Materialien</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevation border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{lowStockMaterials.length}</p>
                  <p className="text-sm text-gray-600">Niedriger Bestand</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Input
                placeholder="Material suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  <SelectItem value="Kabel">Kabel</SelectItem>
                  <SelectItem value="Stecker">Stecker</SelectItem>
                  <SelectItem value="Gehäuse">Gehäuse</SelectItem>
                  <SelectItem value="Befestigung">Befestigung</SelectItem>
                  <SelectItem value="Werkzeug">Werkzeug</SelectItem>
                  <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevation border-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">Lädt...</div>
            ) : filteredMaterials.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Keine Materialien gefunden</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Artikelnummer</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Bestand</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead className="text-right">Kosten/Einheit</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id} className={material.current_stock <= material.min_stock ? 'bg-red-50' : ''}>
                      <TableCell className="font-semibold">{material.name}</TableCell>
                      <TableCell className="font-mono text-sm">{material.article_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={material.current_stock <= material.min_stock ? 'text-red-600 font-bold' : ''}>
                            {material.current_stock}
                          </span>
                          {material.current_stock <= material.min_stock && (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell className="text-right">€{material.unit_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingMaterial(material); setShowForm(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)}>
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
            <MaterialFormDialog
              material={editingMaterial}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingMaterial(null); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
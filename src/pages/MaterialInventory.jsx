import React, { useState, useEffect } from "react";
import { Material } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Package, Plus, Edit, AlertTriangle, Search, TrendingDown, Euro, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";

export default function MaterialInventoryPage() {
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    article_number: "",
    unit: "ST",
    category: "SNRVe",
    current_stock: 0,
    min_stock: 0,
    unit_cost: 0,
    supplier: "",
    notes: "",
    image_url: ""
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await Material.list();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setMaterials([]);
    }
    setIsLoading(false);
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setFormData({
      name: "",
      article_number: "",
      unit: "ST",
      category: "SNRVe",
      current_stock: 0,
      min_stock: 0,
      unit_cost: 0,
      supplier: "",
      notes: "",
      image_url: ""
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, image_url: file_url }));
    setUploadingImage(false);
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name || "",
      article_number: material.article_number || "",
      unit: material.unit || "ST",
      category: material.category || "SNRVe",
      current_stock: material.current_stock || 0,
      min_stock: material.min_stock || 0,
      unit_cost: material.unit_cost || 0,
      supplier: material.supplier || "",
      notes: material.notes || "",
      image_url: material.image_url || ""
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await Material.update(editingMaterial.id, formData);
      } else {
        await Material.create(formData);
      }
      setShowForm(false);
      loadMaterials();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Materials");
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.article_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockMaterials = materials.filter(m => 
    (m.current_stock || 0) <= (m.min_stock || 0)
  );

  const totalInventoryValue = materials.reduce((sum, m) => 
    sum + ((m.current_stock || 0) * (m.unit_cost || 0)), 0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Materiallager</h1>
              <p className="text-gray-600">Bestandsverwaltung und Übersicht</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{materials.length}</p>
                    <p className="text-sm text-gray-600">Materialien</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{lowStockMaterials.length}</p>
                    <p className="text-sm text-gray-600">Niedriger Bestand</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Euro className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      €{Math.round(totalInventoryValue).toLocaleString('de-DE')}
                    </p>
                    <p className="text-sm text-gray-600">Lagerwert</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {materials.reduce((sum, m) => sum + (m.current_stock || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-600">Gesamt Einheiten</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Filters and Actions */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Suche nach Name, Artikel-Nr. oder Lieferant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                <SelectItem value="SNRVe">SNRVe</SelectItem>
                <SelectItem value="Mikro-Rohr">Mikro-Rohr</SelectItem>
                <SelectItem value="Mauerdurchführung">Mauerdurchführung</SelectItem>
                <SelectItem value="KVz">KVz</SelectItem>
                <SelectItem value="Kabel">Kabel</SelectItem>
                <SelectItem value="Stecker">Stecker</SelectItem>
                <SelectItem value="Gehäuse">Gehäuse</SelectItem>
                <SelectItem value="Befestigung">Befestigung</SelectItem>
                <SelectItem value="Werkzeug">Werkzeug</SelectItem>
                <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} className="bg-gradient-to-r from-orange-500 to-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Material anlegen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Materials Table */}
        <Card className="card-elevation border-none">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bild</TableHead>
                  <TableHead>Material</TableHead>
                    <TableHead>Art-Nr.</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Lagerbestand</TableHead>
                    <TableHead>Min. Bestand</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead>Stückpreis</TableHead>
                    <TableHead>Lagerwert</TableHead>
                    <TableHead>Lieferant</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => {
                    const isLowStock = (material.current_stock || 0) <= (material.min_stock || 0);
                    const stockValue = (material.current_stock || 0) * (material.unit_cost || 0);

                    return (
                      <TableRow key={material.id} className={isLowStock ? 'bg-red-50' : ''}>
                       <TableCell>
                         {material.image_url ? (
                           <img src={material.image_url} alt={material.name} className="w-10 h-10 object-contain rounded border bg-white" />
                         ) : (
                           <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                             <ImageIcon className="w-4 h-4 text-gray-300" />
                           </div>
                         )}
                       </TableCell>
                       <TableCell className="font-semibold">{material.name}</TableCell>
                        <TableCell className="font-mono text-sm">{material.article_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{material.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isLowStock ? 'text-red-600 font-bold' : 'font-semibold'}>
                              {material.current_stock || 0}
                            </span>
                            {isLowStock && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{material.min_stock || 0}</TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell>€{(material.unit_cost || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          €{Math.round(stockValue).toLocaleString('de-DE')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {material.supplier || '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(material)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredMaterials.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Keine Materialien gefunden
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Material Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? 'Material bearbeiten' : 'Neues Material anlegen'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Artikel-Nummer *</Label>
                  <Input
                    value={formData.article_number}
                    onChange={(e) => setFormData({ ...formData, article_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategorie *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                     <SelectItem value="SNRVe">SNRVe</SelectItem>
                     <SelectItem value="Mikro-Rohr">Mikro-Rohr</SelectItem>
                     <SelectItem value="Mauerdurchführung">Mauerdurchführung</SelectItem>
                     <SelectItem value="KVz">KVz</SelectItem>
                     <SelectItem value="Kabel">Kabel</SelectItem>
                     <SelectItem value="Stecker">Stecker</SelectItem>
                     <SelectItem value="Gehäuse">Gehäuse</SelectItem>
                     <SelectItem value="Befestigung">Befestigung</SelectItem>
                     <SelectItem value="Werkzeug">Werkzeug</SelectItem>
                     <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Einheit *</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Meter (M)</SelectItem>
                      <SelectItem value="ST">Stück (ST)</SelectItem>
                      <SelectItem value="PAK">Paket (PAK)</SelectItem>
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
                    onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Mindestbestand</Label>
                  <Input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Stückkosten (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Lieferant</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>

              <div>
                <Label>Foto</Label>
                <div className="flex items-center gap-3 mt-1">
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Vorschau" className="w-16 h-16 object-contain rounded border bg-white" />
                  )}
                  <label className="cursor-pointer flex-1">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors">
                      {uploadingImage ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                          <span className="text-sm text-gray-600">Wird hochgeladen...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{formData.image_url ? 'Foto ändern' : 'Foto hochladen'}</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div>
                <Label>Notizen</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
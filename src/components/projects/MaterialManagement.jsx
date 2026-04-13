import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Package, Loader2, FileDown } from "lucide-react";
import { ProjectMaterial, Material, ExcavationMaterial, MontageLeistungMaterial, MontageLeistung, Excavation } from "@/entities/all";
import { jsPDF } from 'jspdf';

function MaterialForm({ open, setOpen, project, projectMaterial, allMaterials, onSubmit }) {
    const [selectedCategory, setSelectedCategory] = useState('alle');
    const [formData, setFormData] = useState({
        material_id: '',
        quantity: '',
        notes: ''
    });

    useEffect(() => {
        if (open) {
            if (projectMaterial) {
                const material = allMaterials.find(m => m.id === projectMaterial.material_id);
                setSelectedCategory(material?.category || 'alle');
                setFormData({
                    material_id: projectMaterial.material_id || '',
                    quantity: projectMaterial.quantity || '',
                    notes: projectMaterial.notes || ''
                });
            } else {
                setSelectedCategory('alle');
                setFormData({ material_id: '', quantity: '', notes: '' });
            }
        }
    }, [open, projectMaterial, allMaterials]); // Added allMaterials to dependencies as it's used to find material category

    const handleSubmitInternal = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            quantity: parseFloat(formData.quantity) || 0
        });
    };

    const materialCategories = useMemo(() => {
        const categories = new Set(allMaterials.map(m => m.category).filter(Boolean));
        return ['alle', ...Array.from(categories)];
    }, [allMaterials]);

    const filteredMaterials = useMemo(() => {
        if (selectedCategory === 'alle') {
            return allMaterials;
        }
        return allMaterials.filter(m => m.category === selectedCategory);
    }, [selectedCategory, allMaterials]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {projectMaterial ? 'Material bearbeiten' : 'Material hinzufügen'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitInternal} className="space-y-4">
                    <div>
                        <Label htmlFor="category">Kategorie</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Kategorie auswählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {materialCategories.map(category => (
                                    <SelectItem key={category} value={category}>
                                        {category === 'alle' ? 'Alle Kategorien' : category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="material_id">Material</Label>
                        <Select
                            value={formData.material_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, material_id: value }))}
                            disabled={!selectedCategory}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Material auswählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {/* Removed SelectGroup/SelectLabel as filtering is now done by the category select */}
                                {filteredMaterials.map(material => (
                                    <SelectItem key={material.id} value={material.id}>
                                        {material.name} ({material.article_number})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="quantity">Menge</Label>
                        <Input
                            id="quantity"
                            type="number"
                            step="any"
                            value={formData.quantity}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="notes">Notizen</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Optionale Notizen..."
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
                        <Button type="submit">Speichern</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function MaterialManagement({ project, projectMaterials, allMaterials, loadData }) {
    const [showForm, setShowForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [updatingMaterialId, setUpdatingMaterialId] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [excavationMaterials, setExcavationMaterials] = useState([]);
    const [montageMaterials, setMontageMaterials] = useState([]);
    const [montageLeistungen, setMontageLeistungen] = useState([]);

    const allMaterialsMap = useMemo(() => {
        return new Map(allMaterials.map(item => [item.id, item]));
    }, [allMaterials]);

    const allMontageMaterialsMap = useMemo(() => {
        return new Map(montageMaterials.map(item => [item.id, item]));
    }, [montageMaterials]);

    useEffect(() => {
        loadMaterialsData();
    }, [project.id]);

    const loadMaterialsData = async () => {
        try {
            // Lade ExcavationMaterials für dieses Projekt
            const excavations = await Excavation.filter({ project_id: project.id });
            const excavationIds = excavations.map(e => e.id);
            
            let allExcMaterials = [];
            if (excavationIds.length > 0) {
                const results = await Promise.all(
                    excavationIds.map(id => ExcavationMaterial.filter({ excavation_id: id }).catch(() => []))
                );
                allExcMaterials = results.flat();
            }
            setExcavationMaterials(allExcMaterials);

            // Lade MontageLeistungMaterial für dieses Projekt
            if (project.montage_auftrag_id) {
                const [leistungenData, montageMaterialUsageData] = await Promise.all([
                    MontageLeistung.filter({ montage_auftrag_id: project.montage_auftrag_id }).catch(() => []),
                    MontageLeistungMaterial.filter({ montage_auftrag_id: project.montage_auftrag_id }).catch(() => [])
                ]);
                setMontageLeistungen(leistungenData);
                setExcavationMaterials(prev => [...prev, ...montageMaterialUsageData]);
            }
        } catch (error) {
            console.error("Fehler beim Laden der Materialdaten:", error);
        }
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Header
            pdf.setFontSize(18);
            pdf.setFont(undefined, 'bold');
            pdf.text('Materialübersicht', 105, 20, { align: 'center' });
            
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Projekt: ${project.project_number} - ${project.title}`, 105, 30, { align: 'center' });
            pdf.text(`Kunde: ${project.client}`, 105, 37, { align: 'center' });
            
            let yOffset = 50;
            
            // Tabellenkopf
            pdf.setFillColor(240, 240, 240);
            pdf.rect(10, yOffset, 190, 10, 'F');
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('Material', 12, yOffset + 7);
            pdf.text('Art-Nr.', 80, yOffset + 7);
            pdf.text('Menge', 130, yOffset + 7);
            pdf.text('Kategorie', 160, yOffset + 7);
            
            yOffset += 15;
            
            // Materialen
            pdf.setFont(undefined, 'normal');
            projectMaterials.forEach((pm, index) => {
                const material = allMaterialsMap.get(pm.material_id);
                if (!material) return;
                
                if (yOffset > 270) {
                    pdf.addPage();
                    yOffset = 20;
                }
                
                // Alternierende Zeilen
                if (index % 2 === 0) {
                    pdf.setFillColor(250, 250, 250);
                    pdf.rect(10, yOffset - 4, 190, 8, 'F');
                }
                
                pdf.text(material.name, 12, yOffset);
                pdf.text(material.article_number, 80, yOffset);
                pdf.text(`${pm.quantity} ${material.unit}`, 130, yOffset);
                pdf.text(material.category || '-', 160, yOffset);
                
                if (pm.notes) {
                    yOffset += 5;
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`Notiz: ${pm.notes}`, 12, yOffset);
                    pdf.setTextColor(0, 0, 0);
                    pdf.setFontSize(10);
                    yOffset += 2;
                }
                
                yOffset += 8;
            });
            
            // Footer
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 105, 285, { align: 'center' });
            
            pdf.save(`Material_${project.project_number}.pdf`);
        } catch (error) {
            console.error("Fehler beim PDF Export:", error);
            alert("Fehler beim PDF Export: " + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleAdd = () => {
        setEditingMaterial(null);
        setShowForm(true);
    };

    const handleEdit = (pm) => {
        setEditingMaterial(pm);
        setShowForm(true);
    };

    const handleDelete = async (pmId) => {
        if (window.confirm("Sind Sie sicher, dass Sie dieses Material entfernen möchten?")) {
            await ProjectMaterial.delete(pmId);
            loadData();
        }
    };

    const handleSubmit = async (data) => {
        if (editingMaterial) {
            await ProjectMaterial.update(editingMaterial.id, { ...editingMaterial, ...data });
        } else {
            await ProjectMaterial.create({ ...data, project_id: project.id });
        }
        setShowForm(false);
        setEditingMaterial(null);
        loadData();
    };
    
    const handleBookingToggle = async (materialId, newStatus) => {
        setUpdatingMaterialId(materialId);
        try {
            await ProjectMaterial.update(materialId, { is_booked_in_psl: newStatus });
            loadData(); // Reload data to reflect changes
        } catch (error) {
            console.error("Fehler beim Aktualisieren des Buchungsstatus:", error);
            alert("Der Buchungsstatus konnte nicht aktualisiert werden.");
        } finally {
            setUpdatingMaterialId(null);
        }
    };

    // Gruppiere Montagematerialien nach Material-ID
    const montageMaterialsGrouped = useMemo(() => {
        const grouped = new Map();
        excavationMaterials.forEach(em => {
            if (em.montage_auftrag_id) {
                const key = em.material_id;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        material_id: em.material_id,
                        total_quantity: 0,
                        items: []
                    });
                }
                const group = grouped.get(key);
                group.total_quantity += em.quantity_used || 0;
                group.items.push(em);
            }
        });
        return Array.from(grouped.values());
    }, [excavationMaterials]);

    // Gruppiere Tiefbaumaterialien nach Material-ID
    const tiefbauMaterialsGrouped = useMemo(() => {
        const grouped = new Map();
        excavationMaterials.forEach(em => {
            if (!em.montage_auftrag_id && em.excavation_id) {
                const key = em.material_id;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        material_id: em.material_id,
                        total_quantity: 0,
                        items: []
                    });
                }
                const group = grouped.get(key);
                group.total_quantity += em.quantity_used || 0;
                group.items.push(em);
            }
        });
        return Array.from(grouped.values());
    }, [excavationMaterials]);

    const hasAnyMaterials = projectMaterials.length > 0 || tiefbauMaterialsGrouped.length > 0 || montageMaterialsGrouped.length > 0;

    if (!hasAnyMaterials) {
        return (
            <div className="p-4 md:p-6 text-center">
                <p className="text-gray-500 mb-4">Für dieses Projekt wurde noch kein Material hinzugefügt.</p>
                <Button onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    Material hinzufügen
                </Button>
                <MaterialForm open={showForm} setOpen={setShowForm} project={project} projectMaterial={editingMaterial} allMaterials={allMaterials} onSubmit={handleSubmit} />
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-lg sm:text-xl font-bold">Materialien</h3>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleExportPDF} disabled={isExporting} className="flex-1 sm:flex-none text-xs sm:text-sm">
                        <FileDown className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{isExporting ? 'Exportiere...' : 'PDF'}</span>
                    </Button>
                    <Button onClick={handleAdd} className="flex-1 sm:flex-none text-xs sm:text-sm">
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Material hinzufügen</span>
                    </Button>
                </div>
            </div>

            {/* Tiefbaumaterial */}
            {(tiefbauMaterialsGrouped.length > 0 || projectMaterials.length > 0) && (
                <Card className="border-2 border-orange-200">
                    <CardHeader className="bg-orange-50">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-orange-600" />
                            Tiefbaumaterial ({projectMaterials.length + tiefbauMaterialsGrouped.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {/* Projekt-Materialien */}
                        {projectMaterials.map((pm) => {
                            const material = allMaterialsMap.get(pm.material_id);
                            if (!material) return null;
                            return (
                                <div
                                    key={pm.id}
                                    className={`p-3 sm:p-4 border rounded-lg shadow-sm transition-colors duration-300 flex flex-col sm:flex-row sm:items-center gap-3 ${
                                        pm.is_booked_in_psl ? 'bg-green-50/70 border-green-200' : 'bg-white'
                                    }`}
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {updatingMaterialId === pm.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <Checkbox
                                                id={`psl-booked-${pm.id}`}
                                                checked={pm.is_booked_in_psl || false}
                                                onCheckedChange={(checked) => handleBookingToggle(pm.id, checked)}
                                                aria-label="In PSL gebucht"
                                                className="mt-1 flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{material.name}</p>
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Art-Nr.: {material.article_number}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                                        <div className="text-right">
                                            <p className="font-medium text-gray-800 text-sm sm:text-base">{pm.quantity} {material.unit}</p>
                                            <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button 
                                                size="icon" 
                                                onClick={() => handleEdit(pm)} 
                                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </Button>
                                            <Button 
                                                size="icon" 
                                                onClick={() => handleDelete(pm.id)} 
                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Materialien aus Ausgrabungen */}
                        {tiefbauMaterialsGrouped.map((group) => {
                            const material = allMaterialsMap.get(group.material_id);
                            if (!material) return null;
                            return (
                                <div
                                    key={`exc-${group.material_id}`}
                                    className="p-3 sm:p-4 border rounded-lg shadow-sm bg-blue-50/50 border-blue-200"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{material.name}</p>
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Art-Nr.: {material.article_number}</p>
                                            <p className="text-xs text-blue-600 mt-1">Aus Leistungen dokumentiert</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-800 text-sm sm:text-base">{group.total_quantity.toFixed(2)} {material.unit}</p>
                                            <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Montagematerial */}
            {montageMaterialsGrouped.length > 0 && (
                <Card className="border-2 border-blue-200">
                    <CardHeader className="bg-blue-50">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            Montagematerial ({montageMaterialsGrouped.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {montageMaterialsGrouped.map((group) => {
                            const material = allMontageMaterialsMap.get(group.material_id);
                            if (!material) return null;
                            return (
                                <div
                                    key={`montage-${group.material_id}`}
                                    className="p-3 sm:p-4 border rounded-lg shadow-sm bg-purple-50/50 border-purple-200"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{material.name}</p>
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Art-Nr.: {material.article_number}</p>
                                            <p className="text-xs text-purple-600 mt-1">Aus Montageleistungen dokumentiert</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-800 text-sm sm:text-base">{group.total_quantity.toFixed(2)} {material.unit}</p>
                                            <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
            
            <MaterialForm open={showForm} setOpen={setShowForm} project={project} projectMaterial={editingMaterial} allMaterials={allMaterials} onSubmit={handleSubmit} />
        </div>
    );
}
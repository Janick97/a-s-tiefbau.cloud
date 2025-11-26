
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
import { Plus, Edit, Trash2, Package, Loader2 } from "lucide-react";
import { ProjectMaterial, Material } from "@/entities/all";

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

    const allMaterialsMap = useMemo(() => {
        return new Map(allMaterials.map(item => [item.id, item]));
    }, [allMaterials]);

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

    if (!projectMaterials || projectMaterials.length === 0) {
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
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Materialien ({projectMaterials.length})</h3>
                <Button onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    Material hinzufügen
                </Button>
            </div>
            
            <div className="space-y-3">
                {projectMaterials.map((pm) => {
                    const material = allMaterialsMap.get(pm.material_id);
                    if (!material) return null;
                    return (
                        <div
                            key={pm.id}
                            className={`p-4 border rounded-lg shadow-sm transition-colors duration-300 flex items-center gap-4 ${
                                pm.is_booked_in_psl ? 'bg-green-50/70 border-green-200' : 'bg-white'
                            }`}
                        >
                            {updatingMaterialId === pm.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            ) : (
                                <Checkbox
                                    id={`psl-booked-${pm.id}`}
                                    checked={pm.is_booked_in_psl || false}
                                    onCheckedChange={(checked) => handleBookingToggle(pm.id, checked)}
                                    aria-label="In PSL gebucht"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800">{material.name}</p>
                                <p className="text-sm text-gray-500">Art-Nr.: {material.article_number}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-gray-800">{pm.quantity} {material.unit}</p>
                                <Badge variant="outline">{material.category}</Badge>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(pm)}>
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(pm.id)} className="text-red-500 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <MaterialForm open={showForm} setOpen={setShowForm} project={project} projectMaterial={editingMaterial} allMaterials={allMaterials} onSubmit={handleSubmit} />
        </div>
    );
}

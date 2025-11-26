
import React, { useState, useEffect, useMemo } from 'react';
import { TimesheetEntry } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Clock, FileDown, Signature, Construction } from "lucide-react";

// Dialog-Komponente für das Hinzufügen/Bearbeiten von Einträgen
function TimesheetDialog({ isOpen, setIsOpen, editingEntry, onSubmit }) {
    const [formData, setFormData] = useState({ employee_name: '', hours: '', work_description: '' });

    useEffect(() => {
        if (isOpen) {
            if (editingEntry) {
                setFormData({
                    employee_name: editingEntry.employee_name || '',
                    hours: editingEntry.hours || '',
                    work_description: editingEntry.work_description || ''
                });
            } else {
                setFormData({ employee_name: '', hours: '', work_description: '' });
            }
        }
    }, [isOpen, editingEntry]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...formData, hours: parseFloat(formData.hours) || 0 });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingEntry ? 'Eintrag bearbeiten' : 'Neuen Eintrag erstellen'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="employee_name">Mitarbeiter</Label>
                        <Input id="employee_name" value={formData.employee_name} onChange={(e) => setFormData({...formData, employee_name: e.target.value})} required />
                    </div>
                    <div>
                        <Label htmlFor="hours">Stunden</Label>
                        <Input id="hours" type="number" step="0.25" min="0" value={formData.hours} onChange={(e) => setFormData({...formData, hours: e.target.value})} required />
                    </div>
                    <div>
                        <Label htmlFor="work_description">Durchgeführte Arbeiten</Label>
                        <Textarea id="work_description" value={formData.work_description} onChange={(e) => setFormData({...formData, work_description: e.target.value})} required />
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

// Haupt-Komponente für das Stundenzettel-Management
export default function TimesheetManagement({ projectId, project }) {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);

    useEffect(() => {
        loadEntries();
    }, [projectId]);

    const loadEntries = async () => {
        setIsLoading(true);
        try {
            const data = await TimesheetEntry.filter({ project_id: projectId });
            setEntries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fehler beim Laden der Stundenzettel:", error);
            setEntries([]);
        }
        setIsLoading(false);
    };
    
    const handleAdd = () => {
        setEditingEntry(null);
        setShowDialog(true);
    };

    const handleEdit = (entry) => {
        setEditingEntry(entry);
        setShowDialog(true);
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingEntry) {
                await TimesheetEntry.update(editingEntry.id, formData);
            } else {
                await TimesheetEntry.create({ project_id: projectId, ...formData });
            }
            setShowDialog(false);
            await loadEntries();
        } catch (error) {
                console.error("Fehler beim Speichern des Eintrags:", error);
        }
    };

    const handleDelete = async (entryId) => {
        if (window.confirm("Eintrag wirklich löschen?")) {
            try {
                await TimesheetEntry.delete(entryId);
                await loadEntries();
            } catch (error) {
                console.error("Fehler beim Löschen des Eintrags:", error);
            }
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    const totalHours = useMemo(() => {
        return entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    }, [entries]);

    return (
        <>
            <div className="printable-area hidden print:block p-8 bg-white text-black">
                <header className="mb-8 pb-4 border-b-2 border-black">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-orange-500 flex items-center justify-center rounded-lg">
                                 <Construction className="w-7 h-7 text-white" />
                             </div>
                             <div>
                                <h1 className="text-2xl font-bold">A&S Tiefbau.Cloud</h1>
                                <p className="text-lg">Stundenzettel</p>
                            </div>
                        </div>
                        <div className="text-right text-sm">
                            <p>Datum: {new Date().toLocaleDateString('de-DE')}</p>
                        </div>
                    </div>
                </header>

                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-2">Projektdaten</h2>
                    <div className="grid grid-cols-2 gap-4 text-md p-4 border rounded-lg">
                        <div><strong>Projektnummer:</strong> {project.project_number}</div>
                        <div><strong>SM Nummer:</strong> {project.sm_number}</div>
                        <div className="col-span-2"><strong>Adresse:</strong> {project.title}</div>
                        <div className="col-span-2"><strong>Kunde:</strong> {project.client}</div>
                    </div>
                </section>
                
                <section>
                    <h2 className="text-xl font-semibold mb-2">Arbeitsstunden</h2>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">Mitarbeiter</th>
                                <th className="border p-2 text-left">Tätigkeit</th>
                                <th className="border p-2 text-right">Stunden</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id}>
                                    <td className="border p-2">{entry.employee_name}</td>
                                    <td className="border p-2">{entry.work_description}</td>
                                    <td className="border p-2 text-right">{entry.hours.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold bg-gray-100">
                                <td colSpan="2" className="border p-2 text-right">Gesamtstunden</td>
                                <td className="border p-2 text-right">{totalHours.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>
                
                <footer className="mt-24">
                    <div className="grid grid-cols-2 gap-16">
                        <div className="pt-8 border-t border-black">
                             <Signature className="w-5 h-5 mb-1" />
                            Unterschrift Auftraggeber
                        </div>
                        <div className="pt-8 border-t border-black">
                             <Signature className="w-5 h-5 mb-1" />
                            Unterschrift Auftragnehmer
                        </div>
                    </div>
                </footer>
            </div>
            
            <Card className="card-elevation border-none no-print">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Stundenzettel ({entries.length} Einträge)
                    </CardTitle>
                    <div className="flex gap-2">
                         <Button onClick={handlePrint} variant="outline">
                             <FileDown className="w-4 h-4 mr-2" /> PDF Exportieren
                         </Button>
                        <Button onClick={handleAdd}>
                            <Plus className="w-4 h-4 mr-2" />
                            Eintrag hinzufügen
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {entries.length === 0 && !isLoading ? (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>Noch keine Stunden erfasst</p>
                            <Button onClick={handleAdd} className="mt-3">
                                Ersten Eintrag erstellen
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mitarbeiter</TableHead>
                                    <TableHead>Tätigkeit</TableHead>
                                    <TableHead className="text-right">Stunden</TableHead>
                                    <TableHead className="text-right">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {entries.map((entry, index) => (
                                        <motion.tr
                                            key={entry.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <TableCell className="font-medium">{entry.employee_name}</TableCell>
                                            <TableCell className="text-gray-600">{entry.work_description}</TableCell>
                                            <TableCell className="text-right font-semibold">{entry.hours.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}><Edit className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {entries.length > 0 && (
                     <CardFooter className="bg-gray-50 flex justify-end">
                         <div className="text-right">
                            <p className="text-sm text-gray-600">Gesamtstunden</p>
                            <p className="text-xl font-bold">{totalHours.toFixed(2)}</p>
                        </div>
                     </CardFooter>
                )}
            </Card>

            <TimesheetDialog
                isOpen={showDialog}
                setIsOpen={setShowDialog}
                editingEntry={editingEntry}
                onSubmit={handleSubmit}
            />
        </>
    );
}

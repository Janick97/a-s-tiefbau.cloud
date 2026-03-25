import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimesheetEntry } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Clock, FileDown, Signature, Construction, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Dialog-Komponente für das Hinzufügen/Bearbeiten von Einträgen
function TimesheetDialog({ isOpen, setIsOpen, editingEntry, onSubmit }) {
    const [formData, setFormData] = useState({ employee_name: '', hours: '', work_description: '', hours_type: 'normal' });

    useEffect(() => {
        if (isOpen) {
            if (editingEntry) {
                setFormData({
                    employee_name: editingEntry.employee_name || '',
                    hours: editingEntry.hours || '',
                    work_description: editingEntry.work_description || '',
                    hours_type: editingEntry.hours_type || 'normal'
                });
            } else {
                setFormData({ employee_name: '', hours: '', work_description: '', hours_type: 'normal' });
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
                        <Label htmlFor="hours_type">Stundenart</Label>
                        <Select value={formData.hours_type} onValueChange={(value) => setFormData({...formData, hours_type: value})}>
                            <SelectTrigger>
                                <SelectValue placeholder="Stundenart wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Normalstunden</SelectItem>
                                <SelectItem value="overtime">Überstunden</SelectItem>
                                <SelectItem value="night_shift">Nachtzulage</SelectItem>
                            </SelectContent>
                        </Select>
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

// Signature Pad Component
function SignaturePad({ label, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full border border-gray-200 rounded cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clearSignature} className="flex-1">
          Löschen
        </Button>
        <Button type="button" size="sm" onClick={saveSignature} className="flex-1">
          Übernehmen
        </Button>
      </div>
    </div>
  );
}

// Haupt-Komponente für das Stundenzettel-Management
export default function TimesheetManagement({ projectId, project }) {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [signatureAuftraggeber, setSignatureAuftraggeber] = useState(null);
    const [signatureAuftragnehmer, setSignatureAuftragnehmer] = useState(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const pdfRef = useRef(null);

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
    
    const handleExportPdf = () => {
        setShowSignatureDialog(true);
    };

    const generatePdf = async () => {
        if (!signatureAuftraggeber || !signatureAuftragnehmer) {
            alert("Bitte fügen Sie beide Unterschriften hinzu.");
            return;
        }

        setIsExportingPdf(true);
        setShowSignatureDialog(false);

        try {
            const element = pdfRef.current;
            
            // Canvas-Signaturen in img-Elemente einfügen
            const sigAuftraggeberImg = element.querySelector('#sig-auftraggeber-img');
            const sigAuftragnehmerImg = element.querySelector('#sig-auftragnehmer-img');
            
            if (sigAuftraggeberImg) sigAuftraggeberImg.src = signatureAuftraggeber;
            if (sigAuftragnehmerImg) sigAuftragnehmerImg.src = signatureAuftragnehmer;

            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Stundenzettel_${project.project_number}.pdf`);

            // Reset signatures
            setSignatureAuftraggeber(null);
            setSignatureAuftragnehmer(null);
        } catch (error) {
            console.error("Fehler beim PDF-Export:", error);
            alert("Fehler beim Erstellen des PDFs.");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const totalHours = useMemo(() => {
        return entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    }, [entries]);

    return (
        <>
            {/* PDF Export Template */}
            <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', width: '210mm', backgroundColor: 'white' }}>
                <div className="p-8 bg-white text-black">
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
                                <th className="border p-2 text-left">Art</th>
                                <th className="border p-2 text-right">Stunden</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id}>
                                    <td className="border p-2">{entry.employee_name}</td>
                                    <td className="border p-2">{entry.work_description}</td>
                                    <td className="border p-2">
                                        {entry.hours_type === 'overtime' && 'Überstunden'}
                                        {entry.hours_type === 'night_shift' && 'Nachtzulage'}
                                        {(!entry.hours_type || entry.hours_type === 'normal') && 'Normal'}
                                    </td>
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
                
                <footer className="mt-16">
                    <div className="grid grid-cols-2 gap-16">
                        <div>
                            <p className="font-medium mb-2">Unterschrift Auftraggeber</p>
                            <div className="h-24 flex items-end">
                                <img id="sig-auftraggeber-img" alt="" className="max-h-20 max-w-full" />
                            </div>
                            <div className="pt-2 border-t border-black mt-2"></div>
                        </div>
                        <div>
                            <p className="font-medium mb-2">Unterschrift Auftragnehmer</p>
                            <div className="h-24 flex items-end">
                                <img id="sig-auftragnehmer-img" alt="" className="max-h-20 max-w-full" />
                            </div>
                            <div className="pt-2 border-t border-black mt-2"></div>
                        </div>
                    </div>
                </footer>
            </div>
            </div>
            
            <Card className="card-elevation border-none no-print">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span className="hidden sm:inline">Stundenzettel</span>
                        <span className="sm:hidden">Stunden</span>
                        ({entries.length})
                    </CardTitle>
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                         <Button onClick={handleExportPdf} variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm">
                             <FileDown className="w-4 h-4 mr-1 sm:mr-2" />
                             <span className="hidden sm:inline">PDF Export</span>
                             <span className="sm:hidden">PDF</span>
                         </Button>
                        <Button onClick={handleAdd} className="flex-1 sm:flex-none text-xs sm:text-sm">
                            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Eintrag hinzufügen</span>
                            <span className="sm:hidden">Neu</span>
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
                        <>
                            {/* Desktop: Tabelle */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mitarbeiter</TableHead>
                                            <TableHead>Tätigkeit</TableHead>
                                            <TableHead>Art</TableHead>
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
                                                    <TableCell className="text-gray-600 text-sm">{entry.work_description}</TableCell>
                                                    <TableCell>
                                                        {entry.hours_type === 'overtime' && <span className="text-orange-600 font-medium text-sm">Überstunden</span>}
                                                        {entry.hours_type === 'night_shift' && <span className="text-purple-600 font-medium text-sm">Nachtzulage</span>}
                                                        {(!entry.hours_type || entry.hours_type === 'normal') && <span className="text-gray-600 text-sm">Normal</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">{entry.hours.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-0.5">
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(entry)} title="Bearbeiten"><Edit className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(entry.id)} title="Löschen"><Trash2 className="w-4 h-4" /></Button>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile: Card-Liste */}
                            <div className="md:hidden space-y-3">
                                <AnimatePresence>
                                    {entries.map((entry, index) => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="border border-gray-200 rounded-lg p-4 bg-white"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 truncate">{entry.employee_name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry.work_description}</p>
                                                </div>
                                                <p className="text-lg font-bold text-blue-600 flex-shrink-0">{entry.hours.toFixed(2)}h</p>
                                            </div>
                                            
                                            <div className="flex items-center justify-between mb-3">
                                                {entry.hours_type === 'overtime' && <Badge className="bg-orange-100 text-orange-800 text-xs">Überstunden</Badge>}
                                                {entry.hours_type === 'night_shift' && <Badge className="bg-purple-100 text-purple-800 text-xs">Nachtzulage</Badge>}
                                                {(!entry.hours_type || entry.hours_type === 'normal') && <Badge className="bg-gray-100 text-gray-700 text-xs">Normal</Badge>}
                                            </div>
                                            
                                            <div className="flex gap-2 justify-end">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleEdit(entry)}
                                                    className="flex-1 h-9 text-xs"
                                                >
                                                    <Edit className="w-4 h-4 mr-1" /> Bearbeiten
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="flex-1 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" /> Löschen
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </>
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

            {/* Signature Dialog */}
            <AnimatePresence>
                {showSignatureDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowSignatureDialog(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-2xl my-8"
                        >
                            <Card className="card-elevation border-none">
                                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <Signature className="w-6 h-6" />
                                                Unterschriften hinzufügen
                                            </CardTitle>
                                            <p className="text-sm text-white/80 mt-1">
                                                Bitte beide Unterschriften eintragen
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowSignatureDialog(false)}
                                            className="text-white hover:bg-white/20"
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-6 space-y-6">
                                    <SignaturePad
                                        label="Unterschrift Auftraggeber"
                                        onSave={setSignatureAuftraggeber}
                                    />

                                    {signatureAuftraggeber && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Signature className="w-4 h-4 text-green-600" />
                                                <span className="text-sm text-green-800">Auftraggeber-Unterschrift gespeichert</span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setSignatureAuftraggeber(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    <SignaturePad
                                        label="Unterschrift Auftragnehmer"
                                        onSave={setSignatureAuftragnehmer}
                                    />

                                    {signatureAuftragnehmer && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Signature className="w-4 h-4 text-green-600" />
                                                <span className="text-sm text-green-800">Auftragnehmer-Unterschrift gespeichert</span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setSignatureAuftragnehmer(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="flex justify-end gap-3 bg-gray-50">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowSignatureDialog(false);
                                            setSignatureAuftraggeber(null);
                                            setSignatureAuftragnehmer(null);
                                        }}
                                    >
                                        Abbrechen
                                    </Button>
                                    <Button
                                        onClick={generatePdf}
                                        disabled={!signatureAuftraggeber || !signatureAuftragnehmer || isExportingPdf}
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                                    >
                                        {isExportingPdf ? (
                                            <>
                                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                Erstelle PDF...
                                            </>
                                        ) : (
                                            <>
                                                <FileDown className="w-4 h-4 mr-2" />
                                                PDF erstellen
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
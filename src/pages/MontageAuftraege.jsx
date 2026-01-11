import React, { useState, useEffect, useMemo } from "react";
import { MontageAuftrag, Project, User as UserEntity } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Wrench, MapPin, Calendar, User, Plus, Edit, Trash2, Clock, AlertCircle, Building, Save, FileText, Construction, ExternalLink, Link, Edit3, Users, X, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";

function MontageAuftragForm({ auftrag, onSubmit, onCancel, projects }) {
  const [formData, setFormData] = useState(auftrag ? {
    ...auftrag,
    start_date: auftrag.start_date ? new Date(auftrag.start_date).toISOString().split('T')[0] : '',
    completion_date: auftrag.completion_date ? new Date(auftrag.completion_date).toISOString().split('T')[0] : '',
    project_id: auftrag.project_id || ''
  } : {
    sm_number: '',
    title: '',
    client: '',
    street: '',
    city: '',
    assigned_to: '',
    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    status: 'Tiefbau ausstehend',
    notes: '',
    project_id: '',
    order_type: '',
    project_number: '',
    art: '',
    tiefbau_offen: false, // Initialize new field
    tiefbau_offen_date: null // Initialize new field
    });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmitLocal = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      completion_date: formData.completion_date ? new Date(formData.completion_date).toISOString() : null,
      project_id: formData.project_id === "" ? null : formData.project_id
    };
    onSubmit(dataToSubmit);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="card-elevation border-none">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              {auftrag ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {auftrag ? 'Montageauftrag bearbeiten' : 'Neuen Montageauftrag erstellen'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitLocal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_number">Projektnummer</Label>
                <Input id="project_number" value={formData.project_number} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sm_number">SM-Nummer *</Label>
                <Input id="sm_number" value={formData.sm_number} onChange={handleChange} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Titel *</Label>
                <Input id="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Kunde *</Label>
                <Input id="client" value={formData.client} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_type">Auftragsart</Label>
                <Input id="order_type" value={formData.order_type} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="art">Art</Label>
                <Select value={formData.art || ''} onValueChange={(val) => handleSelectChange('art', val)}>
                  <SelectTrigger id="art">
                    <SelectValue placeholder="Art auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Keine Auswahl</SelectItem>
                    <SelectItem value="Ü-Wege">Ü-Wege</SelectItem>
                    <SelectItem value="APL-Straße">APL-Straße</SelectItem>
                    <SelectItem value="Störung">Störung</SelectItem>
                    <SelectItem value="FTTH">FTTH</SelectItem>
                    <SelectItem value="Messauftrag">Messauftrag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Straße</Label>
                <Input id="street" value={formData.street} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Stadt</Label>
                <Input id="city" value={formData.city} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Zuständig</Label>
                <Input id="assigned_to" value={formData.assigned_to} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Startdatum</Label>
                <Input id="start_date" type="date" value={formData.start_date} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completion_date">Fertigstellungsdatum</Label>
                <Input id="completion_date" type="date" value={formData.completion_date} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Status wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tiefbau ausstehend">Tiefbau ausstehend</SelectItem>
                    <SelectItem value="Bereit zur Montage">Bereit zur Montage</SelectItem>
                    <SelectItem value="Montage abgeschlossen">Montage abgeschlossen</SelectItem>
                    <SelectItem value="Rotberichtigung abgeschlossen">Rotberichtigung abgeschlossen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_id">Verknüpftes Projekt</Label>
                <Select value={formData.project_id || "none"} onValueChange={(val) => handleSelectChange('project_id', val === "none" ? "" : val)}>
                  <SelectTrigger id="project_id">
                    <SelectValue placeholder="Projekt auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Projekt</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea id="notes" value={formData.notes} onChange={handleChange} rows={5} />
              </div>
              <div className="flex justify-end gap-3 md:col-span-2 pt-4">
                <Button variant="outline" type="button" onClick={onCancel}>Abbrechen</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function MontageAuftraegePage() {
  const [auftraege, setAuftraege] = useState([]);
  const [filteredAuftraege, setFilteredAuftraege] = useState([]);
  const [projects, setProjects] = useState([]);
  const [monteure, setMonteure] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAuftrag, setEditingAuftrag] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('alle');
  const [artFilter, setArtFilter] = useState('alle');
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [currentNotesAuftrag, setCurrentNotesAuftrag] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [updatingAuftrag, setUpdatingAuftrag] = useState(null);
  const [showTiefbauConfirm, setShowTiefbauConfirm] = useState(false);
  const [tiefbauConfirmAuftrag, setTiefbauConfirmAuftrag] = useState(null);
  const [showMonteurDialog, setShowMonteurDialog] = useState(false);
  const [currentMonteurAuftrag, setCurrentMonteurAuftrag] = useState(null);
  const [selectedMonteure, setSelectedMonteure] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log("Lade Montageaufträge, Projekte und Monteure...");
      const [auftraegeData, projectsData, usersData] = await Promise.all([
        MontageAuftrag.filter({ archived: { $ne: true } }, '-created_date'),
        Project.list(),
        UserEntity.list()
      ]);
      console.log("Geladene Montageaufträge:", auftraegeData);
      console.log("Geladene Projekte:", projectsData);
      
      // Automatisch Status auf "Montage abgeschlossen" setzen, wenn Monteur fertig gemeldet hat
      const updatedAuftraege = Array.isArray(auftraegeData) ? auftraegeData : [];
      for (const auftrag of updatedAuftraege) {
        if (auftrag.monteur_completed && auftrag.status !== 'Montage abgeschlossen') {
          try {
            await MontageAuftrag.update(auftrag.id, { status: 'Montage abgeschlossen' });
            auftrag.status = 'Montage abgeschlossen';
          } catch (error) {
            console.error("Fehler beim automatischen Status-Update:", error);
          }
        }
      }
      
      setAuftraege(updatedAuftraege);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setMonteure(Array.isArray(usersData) ? usersData.filter(u => u.position === 'Monteur') : []);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      setAuftraege([]);
      setProjects([]);
      setMonteure([]);
    }
    setIsLoading(false);
  };

  const handleTiefbauOffen = (auftrag) => {
    if (auftrag.tiefbau_offen) {
      alert("Dieser Auftrag wurde bereits als 'Tiefbau offen' gemeldet.");
      return;
    }
    setTiefbauConfirmAuftrag(auftrag);
    setShowTiefbauConfirm(true);
  };

  const handleConfirmTiefbauOffen = async () => {
    if (!tiefbauConfirmAuftrag) return;
    
    setUpdatingAuftrag(tiefbauConfirmAuftrag.id);
    try {
      await MontageAuftrag.update(tiefbauConfirmAuftrag.id, {
        tiefbau_offen: true,
        tiefbau_offen_date: new Date().toISOString(),
        status: 'Bereit zur Montage'
      });
      setShowTiefbauConfirm(false);
      setTiefbauConfirmAuftrag(null);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
      alert(`Fehler: ${error.message}`);
    }
    setUpdatingAuftrag(null);
  };

  const handleSubmit = async (formData) => {
    try {
      console.log("Speichere Montageauftrag:", formData);
      if (formData.id) {
        await MontageAuftrag.update(formData.id, formData);
      } else {
        await MontageAuftrag.create(formData);
      }
      setShowForm(false);
      setEditingAuftrag(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern des Montageauftrags:", error);
      alert(`Fehler beim Speichern: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sind Sie sicher, dass Sie diesen Montageauftrag löschen möchten?")) {
      try {
        await MontageAuftrag.delete(id);
        loadData();
      } catch (error) {
        console.error("Fehler beim Löschen des Montageauftrags:", error);
        alert(`Fehler beim Löschen: ${error.message}`);
      }
    }
  };

  const handleNotesClick = (auftrag) => {
    setCurrentNotesAuftrag(auftrag);
    setNotesText(auftrag.notes || '');
    setShowNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    if (!currentNotesAuftrag) return;
    
    try {
      await MontageAuftrag.update(currentNotesAuftrag.id, {
        notes: notesText
      });
      setShowNotesDialog(false);
      setCurrentNotesAuftrag(null);
      setNotesText('');
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern der Notizen:", error);
      alert(`Fehler beim Speichern der Notizen: ${error.message}`);
    }
  };

  const handleMonteurClick = (auftrag) => {
    setCurrentMonteurAuftrag(auftrag);
    setSelectedMonteure(auftrag.assigned_monteure || []);
    setShowMonteurDialog(true);
  };

  const handleToggleMonteur = (monteur) => {
    setSelectedMonteure(prev => {
      const exists = prev.find(m => m.id === monteur.id);
      if (exists) {
        return prev.filter(m => m.id !== monteur.id);
      } else {
        return [...prev, { id: monteur.id, name: monteur.full_name }];
      }
    });
  };

  const handleSaveMonteure = async () => {
    if (!currentMonteurAuftrag) return;
    
    try {
      await MontageAuftrag.update(currentMonteurAuftrag.id, {
        assigned_monteure: selectedMonteure
      });
      setShowMonteurDialog(false);
      setCurrentMonteurAuftrag(null);
      setSelectedMonteure([]);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern der Monteure:", error);
      alert(`Fehler beim Speichern: ${error.message}`);
    }
  };

  // Update Status inline
  const handleStatusChange = async (auftrag, newStatus) => {
    try {
      const updateData = { status: newStatus };

      // Automatisch archivieren wenn Status auf "Rotberichtigung abgeschlossen" gesetzt wird
      if (newStatus === 'Rotberichtigung abgeschlossen') {
        updateData.archived = true;
        updateData.archived_date = new Date().toISOString();
      }

      await MontageAuftrag.update(auftrag.id, updateData);
      loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      alert(`Fehler beim Aktualisieren: ${error.message}`);
    }
  };

  // Update Art inline
  const handleArtChange = async (auftrag, newArt) => {
    try {
      await MontageAuftrag.update(auftrag.id, { art: newArt });
      loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Art:", error);
      alert(`Fehler beim Aktualisieren: ${error.message}`);
    }
  };

  useEffect(() => {
    let filtered = Array.isArray(auftraege) ? auftraege : [];

    if (searchTerm) {
      filtered = filtered.filter(auftrag =>
        (auftrag.sm_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.project_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'alle') {
      filtered = filtered.filter(auftrag => auftrag.status === statusFilter);
    }

    if (artFilter !== 'alle') {
      filtered = filtered.filter(auftrag => auftrag.art === artFilter);
    }

    // Sortierung: "Bereit zur Montage" immer oben
    filtered = filtered.sort((a, b) => {
      if (a.status === 'Bereit zur Montage' && b.status !== 'Bereit zur Montage') return -1;
      if (a.status !== 'Bereit zur Montage' && b.status === 'Bereit zur Montage') return 1;
      return 0;
    });

    setFilteredAuftraege(filtered);
  }, [auftraege, searchTerm, statusFilter, artFilter]);

  const getProjectForAuftrag = (auftrag) => {
    if (!auftrag.project_id) return null;
    return projects.find(p => p.id === auftrag.project_id);
  };

  const statusColors = {
    'Tiefbau ausstehend': 'bg-orange-100 text-orange-800 border-orange-200',
    'Bereit zur Montage': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Montage abgeschlossen': 'bg-green-100 text-green-800 border-green-200',
    'Rotberichtigung abgeschlossen': 'bg-purple-100 text-purple-800 border-purple-200'
  };

  const stats = {
    bereitZurMontage: auftraege.filter(a => a.status === 'Bereit zur Montage').length,
    tiefbauAusstehend: auftraege.filter(a => a.status === 'Tiefbau ausstehend').length,
    montageAbgeschlossen: auftraege.filter(a => a.status === 'Montage abgeschlossen').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-2 sm:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-4 md:mb-8">
          {/* Mobile Header - kompakt */}
          <div className="flex items-center justify-between gap-2 mb-3 md:hidden">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Montage</h1>
                <p className="text-xs text-gray-600">{auftraege.length} Aufträge</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={createPageUrl("MontageAuftraegeArchiv")}>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  Archiv
                </Button>
              </a>
              <Button onClick={() => { setEditingAuftrag(null); setShowForm(true); }} size="sm" className="h-8 px-3">
                <Plus className="w-4 h-4 mr-1" />
                Neu
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Wrench className="w-8 h-8 text-blue-600" />
                Montageaufträge
              </h1>
              <p className="text-gray-600 mt-1">Verwaltung aller Montageaufträge</p>
            </div>
            <div className="flex gap-3">
              <a href={createPageUrl("MontageAuftraegeArchiv")}>
                <Button variant="outline" size="lg">
                  Archiv
                </Button>
              </a>
              <Button onClick={() => { setEditingAuftrag(null); setShowForm(true); }} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Neuer Montageauftrag
              </Button>
            </div>
          </div>
        </div>

        <Card className="card-elevation border-none mb-3 md:mb-6">
          <CardContent className="p-2 md:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Suche..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 md:h-10 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Status</SelectItem>
                  <SelectItem value="Tiefbau ausstehend">Tiefbau ausstehend</SelectItem>
                  <SelectItem value="Bereit zur Montage">Bereit zur Montage</SelectItem>
                  <SelectItem value="Montage abgeschlossen">Montage abgeschlossen</SelectItem>
                  <SelectItem value="Rotberichtigung abgeschlossen">Rotberichtigung abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={artFilter} onValueChange={setArtFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <SelectValue placeholder="Art..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Arten</SelectItem>
                  <SelectItem value="Ü-Wege">Ü-Wege</SelectItem>
                  <SelectItem value="APL-Straße">APL-Straße</SelectItem>
                  <SelectItem value="Störung">Störung</SelectItem>
                  <SelectItem value="FTTH">FTTH</SelectItem>
                  <SelectItem value="Messauftrag">Messauftrag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card className="card-elevation border-none">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-sm text-gray-600">Bereit zur Montage</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-600">{stats.bereitZurMontage}</p>
                </div>
                <Clock className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevation border-none">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-sm text-gray-600 truncate">Tiefbau ausstehend</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-600">
                    {stats.tiefbauAusstehend}
                  </p>
                </div>
                <AlertCircle className="w-5 h-5 md:w-8 md:h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="card-elevation border-none">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAuftraege.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-12 text-center">
              <Construction className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                {searchTerm || statusFilter !== 'alle' ? 'Keine Ergebnisse gefunden' : 'Noch keine Montageaufträge'}
              </h3>
              <p className="text-gray-400">
                {searchTerm || statusFilter !== 'alle' 
                  ? 'Versuchen Sie andere Suchkriterien'
                  : 'Erstellen Sie den ersten Montageauftrag'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {filteredAuftraege.map((auftrag, index) => {
                const relatedProject = getProjectForAuftrag(auftrag);
                return (
                  <motion.div
                    key={auftrag.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`card-elevation border-none hover:shadow-xl transition-shadow ${
                      auftrag.tiefbau_offen ? 'bg-blue-50 border-2 border-blue-200' : ''
                    }`}>
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Titel */}
                            <div>
                              <h3 className="text-sm md:text-base font-bold text-gray-900">
                                {auftrag.title}
                              </h3>
                            </div>

                            {/* Status und Art Dropdowns */}
                            <div className="flex gap-2">
                              <Select 
                                value={auftrag.status} 
                                onValueChange={(val) => handleStatusChange(auftrag, val)}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1 max-w-[200px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Tiefbau ausstehend">Tiefbau ausstehend</SelectItem>
                                  <SelectItem value="Bereit zur Montage">Bereit zur Montage</SelectItem>
                                  <SelectItem value="Montage abgeschlossen">Montage abgeschlossen</SelectItem>
                                  <SelectItem value="Rotberichtigung abgeschlossen">Rotberichtigung abgeschlossen</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Select 
                                value={auftrag.art || ""} 
                                onValueChange={(val) => handleArtChange(auftrag, val)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[120px]">
                                  <SelectValue placeholder="Art" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Ü-Wege">Ü-Wege</SelectItem>
                                  <SelectItem value="APL-Straße">APL-Straße</SelectItem>
                                  <SelectItem value="Störung">Störung</SelectItem>
                                  <SelectItem value="FTTH">FTTH</SelectItem>
                                  <SelectItem value="Messauftrag">Messauftrag</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Tiefbau offen Datum */}
                            {auftrag.tiefbau_offen && auftrag.tiefbau_offen_date && (
                              <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                <Construction className="w-3 h-3 flex-shrink-0" />
                                <span className="font-medium">
                                  Offen gemeldet: {new Date(auftrag.tiefbau_offen_date).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                            )}

                            {/* Monteur fertig gemeldet */}
                            {auftrag.monteur_completed && auftrag.monteur_completed_date && (
                              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                <span className="font-medium">
                                  Fertig gemeldet: {new Date(auftrag.monteur_completed_date).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                            )}

                            {/* Notizen */}
                            {auftrag.notes && (
                              <div className="bg-gray-50 rounded p-2 border border-gray-200">
                                <div className="flex items-start gap-2">
                                  <FileText className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-600 line-clamp-2">{auftrag.notes}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <a href={createPageUrl(`MontageAuftragDetail?id=${auftrag.id}`)}>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 w-full">
                                <ExternalLink className="w-3 h-3 md:mr-1" />
                                <span className="hidden md:inline">Auftrag</span>
                              </Button>
                            </a>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMonteurClick(auftrag)}
                              className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 h-8 w-full"
                            >
                              <Users className="w-3 h-3 md:mr-1" />
                              <span className="hidden md:inline">Monteure</span>
                            </Button>
                            {!auftrag.tiefbau_offen && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTiefbauOffen(auftrag)}
                                disabled={updatingAuftrag === auftrag.id}
                                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 h-8 w-full"
                              >
                                <Construction className="w-3 h-3 md:mr-1" />
                                <span className="hidden md:inline">Tiefbau offen</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNotesClick(auftrag)}
                              className="h-8 w-full"
                            >
                              <Edit3 className="w-3 h-3 md:mr-1" />
                              <span className="hidden md:inline">Notizen</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(auftrag.id)}
                              className="text-red-600 hover:text-red-700 h-8 w-full"
                            >
                              <Trash2 className="w-3 h-3 md:mr-1" />
                              <span className="hidden md:inline">Löschen</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {showForm && (
            <MontageAuftragForm
              auftrag={editingAuftrag}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingAuftrag(null); }}
              projects={projects}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNotesDialog && currentNotesAuftrag && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) setShowNotesDialog(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-2xl"
              >
                <Card className="card-elevation border-none">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Notizen & Montageinformationen
                    </CardTitle>
                    <p className="text-sm text-blue-100 mt-1">
                      {currentNotesAuftrag.sm_number} - {currentNotesAuftrag.title}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
                          Montageinformationen und Notizen
                        </Label>
                        <Textarea
                          id="notes"
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Hier können Sie alle relevanten Informationen zur Montage eintragen:
- Durchgeführte Arbeiten
- Besondere Vorkommnisse
- Verwendete Materialien
- Zeitaufwand
- Kontaktpersonen vor Ort
- Weitere Anmerkungen"
                          className="min-h-[300px] font-mono text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Diese Notizen werden mit dem Montageauftrag gespeichert und können jederzeit bearbeitet werden.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowNotesDialog(false);
                        setCurrentNotesAuftrag(null);
                        setNotesText('');
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button onClick={handleSaveNotes} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Notizen speichern
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTiefbauConfirm && tiefbauConfirmAuftrag && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) setShowTiefbauConfirm(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md"
              >
                <Card className="card-elevation border-none">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Construction className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Tiefbau offen melden</h3>
                        <p className="text-sm text-gray-600">
                          {tiefbauConfirmAuftrag.sm_number}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="space-y-3">
                        <p className="text-gray-700">
                          Möchten Sie diesen Montageauftrag als "Tiefbau offen" melden?
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-blue-800 mb-2">
                            ✓ Der Auftrag wird als bereit markiert
                          </p>
                          <p className="text-sm text-blue-700">
                            Die Karte wird blau markiert und das Datum wird gespeichert.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTiefbauConfirm(false);
                          setTiefbauConfirmAuftrag(null);
                        }}
                        className="flex-1"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        onClick={handleConfirmTiefbauOffen}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        disabled={updatingAuftrag === tiefbauConfirmAuftrag?.id}
                      >
                        <Construction className="w-4 h-4 mr-2" />
                        Bestätigen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMonteurDialog && currentMonteurAuftrag && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) setShowMonteurDialog(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg"
              >
                <Card className="card-elevation border-none">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Monteure zuweisen
                    </CardTitle>
                    <p className="text-sm text-purple-100 mt-1">
                      {currentMonteurAuftrag.sm_number} - {currentMonteurAuftrag.title}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-4">
                        Wählen Sie die Monteure aus, die diesem Auftrag zugewiesen werden sollen:
                      </p>
                      
                      {selectedMonteure.length > 0 && (
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm font-medium text-purple-900 mb-2">
                            Zugewiesene Monteure ({selectedMonteure.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedMonteure.map(m => (
                              <Badge key={m.id} className="bg-purple-100 text-purple-800 border-purple-300">
                                {m.name}
                                <button
                                  onClick={() => handleToggleMonteur({ id: m.id, full_name: m.name })}
                                  className="ml-1 hover:text-purple-900"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {monteure.map(monteur => {
                          const isSelected = selectedMonteure.some(m => m.id === monteur.id);
                          return (
                            <div
                              key={monteur.id}
                              onClick={() => handleToggleMonteur(monteur)}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-purple-50 border-purple-300'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleMonteur(monteur)}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{monteur.full_name}</p>
                                <p className="text-sm text-gray-600">{monteur.email}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowMonteurDialog(false);
                        setCurrentMonteurAuftrag(null);
                        setSelectedMonteure([]);
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button onClick={handleSaveMonteure} className="bg-purple-600 hover:bg-purple-700">
                      <Save className="w-4 h-4 mr-2" />
                      Speichern
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
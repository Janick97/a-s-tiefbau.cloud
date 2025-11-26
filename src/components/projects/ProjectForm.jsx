import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { X, Save, FolderPlus, Upload, FileText, Info } from "lucide-react";
import { ContactPerson, City, Project, User, MontageAuftrag } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";

const orderTypeOptions = [
    "Kompakt-Entstörung", "Störung Tiefbau", "Störung + Montage", "planbar",
    "planbar+Montage", "Montage", "Störung Glasfaser o. Montage",
    "Störung Glasfaser +mit Montage", "Einziehen Kabelzug", "Kabelschacht",
    "Reklamation", "KVZ tauschen", "DBPO Messung", "Für Abrechnung", "Lagersicherung",
    "Asphaltarbeiten", "Kabelzug+Montage", "Zerreißen", "Absperrung",
    "Tiefbau Einziehen Kabelzug", "Montage Tiefbau Fremdfirma", "Instandsetzung",
    "Kabelstopp", "Mitverlegung"
];

const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toISOString().split('T')[0];
    } catch {
        return '';
    }
};

const getInitialFormData = (project, parentProject) => {
    if (parentProject) {
        return {
            project_number: '',
            sm_number: '',
            title: `Folgeauftrag zu: ${parentProject.title}`,
            description: '',
            client: parentProject.client || '',
            contact_person: parentProject.contact_person || '',
            street: parentProject.street || '',
            city: parentProject.city || '',
            order_type: parentProject.order_type || '',
            project_status: 'Auftrag neu im Server',
            status: 'planning',
            start_date: '',
            end_date: '',
            vao_status: '',
            vao_valid_from: '',
            vao_valid_to: '',
            vao_document_url: '',
            bil_wep_requested: false,
            material_booking_completed: false,
            documentation_completed: false,
            parent_project_id: parentProject.id,
            is_follow_up: true,
            vao_source_project_id: parentProject.id,
            grube_auf_datum: '',
            kann_zu_meldung_datum: '',
            has_montage: false, // New field for follow-up projects
        };
    }
    
    return {
        project_number: project?.project_number || '',
        sm_number: project?.sm_number || '',
        title: project?.title || '',
        description: project?.description || '',
        client: project?.client || '',
        contact_person: project?.contact_person || '',
        street: project?.street || '',
        city: project?.city || '',
        order_type: project?.order_type || '',
        project_status: project?.project_status || 'Auftrag neu im Server',
        status: project?.status || 'planning',
        start_date: formatDateForInput(project?.start_date),
        end_date: formatDateForInput(project?.end_date),
        vao_status: project?.vao_status || '',
        vao_valid_from: formatDateForInput(project?.vao_valid_from),
        vao_valid_to: formatDateForInput(project?.vao_valid_to),
        vao_document_url: project?.vao_document_url || '',
        bil_wep_requested: project?.bil_wep_requested || false,
        material_booking_completed: project?.material_booking_completed || false,
        documentation_completed: project?.documentation_completed || false,
        parent_project_id: project?.parent_project_id || null,
        is_follow_up: project?.is_follow_up || false,
        vao_source_project_id: project?.vao_source_project_id || null,
        grube_auf_datum: formatDateForInput(project?.grube_auf_datum),
        kann_zu_meldung_datum: formatDateForInput(project?.kann_zu_meldung_datum),
        has_montage: project?.has_montage || false, // New field for existing projects
    };
};

export default function ProjectForm({ project, parentProject, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(getInitialFormData(project, parentProject));
  const [contactPersons, setContactPersons] = useState([]);
  const [cities, setCities] = useState([]);
  const [monteure, setMonteure] = useState([]);
  const [isContactsLoading, setIsContactsLoading] = useState(true);
  const [isCitiesLoading, setIsCitiesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [availableVaoProjects, setAvailableVaoProjects] = useState([]);
  const [selectedMonteure, setSelectedMonteure] = useState([]);

  useEffect(() => {
    setFormData(getInitialFormData(project, parentProject));
    
    // Load assigned monteure if editing a project with montage
    if (project?.montage_auftrag_id && project?.has_montage) {
      const loadAssignedMonteure = async () => {
        try {
          const montageAuftrag = await MontageAuftrag.get(project.montage_auftrag_id);
          if (montageAuftrag?.assigned_monteure) {
            setSelectedMonteure(montageAuftrag.assigned_monteure);
          }
        } catch (error) {
          console.error("Fehler beim Laden der zugewiesenen Monteure:", error);
        }
      };
      loadAssignedMonteure();
    } else {
      setSelectedMonteure([]);
    }
  }, [project, parentProject]);

  // Automatische Generierung des Projekttitels
  useEffect(() => {
    if (parentProject) return; // Für Folgeaufträge nicht automatisch generieren
    
    const parts = [];
    if (formData.project_number) parts.push(formData.project_number);
    if (formData.city) parts.push(formData.city);
    if (formData.street) parts.push(formData.street);
    if (formData.sm_number) parts.push(formData.sm_number);
    
    if (parts.length > 0) {
      const autoTitle = parts.join(' ');
      if (autoTitle !== formData.title) {
        handleInputChange('title', autoTitle);
      }
    }
  }, [formData.project_number, formData.city, formData.street, formData.sm_number]);

  // Load available projects for VAO selection when creating a follow-up
  useEffect(() => {
    const fetchAvailableVaoProjects = async () => {
      if (parentProject) {
        try {
          const projects = [];
          
          // Find the root project
          let rootProject = parentProject;
          if (parentProject.parent_project_id) {
            rootProject = await Project.get(parentProject.parent_project_id);
          }
          
          // Add root project to options
          projects.push(rootProject);
          
          // Find all follow-up projects in this chain
          const followUps = await Project.filter({ parent_project_id: rootProject.id });
          projects.push(...(Array.isArray(followUps) ? followUps : []));
          
          setAvailableVaoProjects(projects);
        } catch (error) {
          console.error("Fehler beim Laden der verfügbaren Projekte:", error);
          setAvailableVaoProjects([parentProject]); // Fallback to just parent
        }
      }
    };
    
    fetchAvailableVaoProjects();
  }, [parentProject]);

  useEffect(() => {
    const fetchData = async () => {
      setIsContactsLoading(true);
      setIsCitiesLoading(true);
      try {
        const [persons, cityData, users] = await Promise.all([
          ContactPerson.list("name").catch(() => []),
          City.list("name").catch(() => []),
          User.list().catch(() => [])
        ]);
        setContactPersons(Array.isArray(persons) ? persons : []);
        setCities(Array.isArray(cityData) ? cityData : []);
        const monteurUsers = users.filter(u => u.position === 'Monteur');
        setMonteure(Array.isArray(monteurUsers) ? monteurUsers : []);
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        setContactPersons([]);
        setCities([]);
        setMonteure([]);
      }
      setIsContactsLoading(false);
      setIsCitiesLoading(false);
    };
    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVAOUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange('vao_document_url', file_url);
    } catch (error) {
      console.error("Fehler beim Upload:", error);
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { 
      ...formData,
      selected_monteure: selectedMonteure 
    };
    onSubmit(submitData);
  };

  const contactPersonOptions = useMemo(() => {
    const safeContactPersons = Array.isArray(contactPersons) ? contactPersons : [];
    const uniqueNames = [...new Set(safeContactPersons.map(p => p.name).filter(Boolean))];
    return uniqueNames.sort();
  }, [contactPersons]);

  const cityOptions = useMemo(() => {
    const safeCities = Array.isArray(cities) ? cities : [];
    const uniqueCityNames = [...new Set(safeCities.map(c => c.name).filter(Boolean))];
    return uniqueCityNames.sort();
  }, [cities]);

  const isVAOInherited = !!formData.vao_source_project_id;

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
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="card-elevation border-none">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              {parentProject ? 'Folgeauftrag erstellen' : (project ? 'Projekt bearbeiten' : 'Neues Projekt erstellen')}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-8">
              
              {parentProject && availableVaoProjects.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                    <h3 className="text-md font-semibold text-blue-800">VAO-Auswahl für Folgeauftrag</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="vao_self"
                          name="vao_option"
                          checked={!formData.vao_source_project_id}
                          onChange={() => handleInputChange('vao_source_project_id', null)}
                        />
                        <Label htmlFor="vao_self" className="font-medium">
                          Neue, eigene VAO für diesen Auftrag anlegen
                        </Label>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="vao_existing"
                            name="vao_option"
                            checked={!!formData.vao_source_project_id}
                            onChange={() => {
                              if (!formData.vao_source_project_id) {
                                handleInputChange('vao_source_project_id', availableVaoProjects[0]?.id || '');
                              }
                            }}
                          />
                          <Label htmlFor="vao_existing" className="font-medium">
                            VAO von bestehendem Projekt verwenden:
                          </Label>
                        </div>
                        
                        {formData.vao_source_project_id && (
                          <div className="ml-6">
                            <Select
                              value={formData.vao_source_project_id}
                              onValueChange={(value) => handleInputChange('vao_source_project_id', value)}
                            >
                              <SelectTrigger className="w-full max-w-md">
                                <SelectValue placeholder="Projekt für VAO auswählen..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableVaoProjects.map(proj => (
                                  <SelectItem key={proj.id} value={proj.id}>
                                    {proj.project_number} - {proj.title}
                                    {!proj.parent_project_id && " (Hauptprojekt)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              )}

              {/* Grunddaten */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Grunddaten</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="project_number">Projektnummer *</Label>
                    <Input
                      id="project_number"
                      value={formData.project_number}
                      onChange={(e) => handleInputChange('project_number', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sm_number">SM Nummer *</Label>
                    <Input
                      id="sm_number"
                      value={formData.sm_number}
                      onChange={(e) => handleInputChange('sm_number', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Projekttitel * (wird automatisch generiert)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                    className="bg-gray-50"
                    readOnly={!parentProject}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="client">Kunde/Auftraggeber *</Label>
                    <Select
                      value={formData.client}
                      onValueChange={(value) => handleInputChange('client', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auftraggeber auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Deutsche Telekom">Deutsche Telekom</SelectItem>
                        <SelectItem value="Relaix">Relaix</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Ansprechpartner</Label>
                    <Select
                      value={formData.contact_person}
                      onValueChange={(value) => handleInputChange('contact_person', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isContactsLoading ? "Lade..." : "Ansprechpartner auswählen..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {contactPersonOptions.map((person) => (
                          <SelectItem key={person} value={person}>
                            {person}
                          </SelectItem>
                        ))}
                        {contactPersonOptions.length === 0 && !isContactsLoading && (
                          <SelectItem value={null} disabled>
                            Keine Ansprechpartner verfügbar
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="street">Straße</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      placeholder="Straße und Hausnummer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Stadt</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) => handleInputChange('city', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isCitiesLoading ? "Lade..." : "Stadt auswählen..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                        {cityOptions.length === 0 && !isCitiesLoading && (
                          <SelectItem value={null} disabled>
                            Keine Städte verfügbar
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="order_type">Auftragsart</Label>
                  <Select value={formData.order_type} onValueChange={(value) => handleInputChange('order_type', value)}>
                    <SelectTrigger><SelectValue placeholder="Auftragsart auswählen..." /></SelectTrigger>
                    <SelectContent>
                      {orderTypeOptions.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="min-h-24"
                  />
                </div>

                {/* Montage Option */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="has_montage"
                      checked={formData.has_montage}
                      onCheckedChange={(checked) => handleInputChange('has_montage', checked)}
                    />
                    <Label htmlFor="has_montage" className="cursor-pointer font-medium">
                      Auftrag mit Montagearbeiten
                    </Label>
                  </div>
                  {formData.has_montage && (
                    <>
                      <p className="text-sm text-blue-600 ml-7">
                        Ein Montageauftrag wird automatisch erstellt und unter "Montageaufträge" angezeigt.
                      </p>
                      <div className="ml-7 space-y-2">
                        <Label>Monteure zuweisen</Label>
                        <div className="border rounded-lg p-3 bg-white space-y-2 max-h-48 overflow-y-auto">
                          {monteure.length > 0 ? (
                            monteure.map(monteur => (
                              <div key={monteur.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`monteur-${monteur.id}`}
                                  checked={selectedMonteure.some(m => m.id === monteur.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMonteure([...selectedMonteure, { id: monteur.id, name: monteur.full_name }]);
                                    } else {
                                      setSelectedMonteure(selectedMonteure.filter(m => m.id !== monteur.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`monteur-${monteur.id}`} className="cursor-pointer text-sm">
                                  {monteur.full_name}
                                </Label>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">Keine Monteure verfügbar</p>
                          )}
                        </div>
                        {selectedMonteure.length > 0 && (
                          <p className="text-xs text-gray-600">
                            {selectedMonteure.length} Monteur(e) ausgewählt
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* VAO Section */}
              <div className={`space-y-6 ${isVAOInherited ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Verkehrsanordnung (VAO)</h3>
                  {isVAOInherited && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-100 p-2 rounded-md">
                      <Info className="w-4 h-4" />
                      <span>VAO wird von einem anderen Projekt geerbt.</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vao_status">VAO Status</Label>
                    <Select value={formData.vao_status} onValueChange={(value) => handleInputChange('vao_status', value)} disabled={isVAOInherited}>
                      <SelectTrigger><SelectValue placeholder="VAO Status auswählen" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beantragt">Beantragt</SelectItem>
                        <SelectItem value="liegt vor">Liegt vor</SelectItem>
                        <SelectItem value="abgelaufen">Abgelaufen</SelectItem>
                        <SelectItem value="Verlängerung beantragt">Verlängerung beantragt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>VAO-Dokument</Label>
                    <div className="flex gap-2">
                      <Input
                        id="vao_upload"
                        type="file"
                        className="hidden"
                        onChange={(e) => handleVAOUpload(e.target.files[0])}
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={isVAOInherited || uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('vao_upload').click()}
                        disabled={isVAOInherited || uploading}
                        className="flex-shrink-0"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Upload...' : 'Hochladen'}
                      </Button>
                      <Input
                        type="text"
                        value={formData.vao_document_url}
                        readOnly
                        placeholder="Kein Dokument hochgeladen"
                        className="flex-grow"
                        disabled={isVAOInherited}
                      />
                      {formData.vao_document_url && (
                        <a href={formData.vao_document_url} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="outline" size="icon" disabled={isVAOInherited}>
                            <FileText className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vao_valid_from">VAO gültig von</Label>
                    <Input
                      id="vao_valid_from"
                      type="date"
                      value={formData.vao_valid_from}
                      onChange={(e) => handleInputChange('vao_valid_from', e.target.value)}
                      disabled={isVAOInherited}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vao_valid_to">VAO gültig bis</Label>
                    <Input
                      id="vao_valid_to"
                      type="date"
                      value={formData.vao_valid_to}
                      onChange={(e) => handleInputChange('vao_valid_to', e.target.value)}
                      disabled={isVAOInherited}
                    />
                  </div>
                </div>
              </div>

              {/* Zusätzliche Angaben */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Zusätzliche Angaben</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bil_wep_requested"
                      checked={formData.bil_wep_requested}
                      onCheckedChange={(checked) => handleInputChange('bil_wep_requested', checked)}
                    />
                    <Label htmlFor="bil_wep_requested">BIL / WEP wurde abgefragt</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="material_booking_completed"
                      checked={formData.material_booking_completed}
                      onCheckedChange={(checked) => handleInputChange('material_booking_completed', checked)}
                    />
                    <Label htmlFor="material_booking_completed">Materialbuchung erfolgt</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="documentation_completed"
                      checked={formData.documentation_completed}
                      onCheckedChange={(checked) => handleInputChange('documentation_completed', checked)}
                    />
                    <Label htmlFor="documentation_completed">Dokumentation erfolgt</Label>
                  </div>
                </div>
              </div>

              {/* Status und Termine */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Status und Termine</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="project_status">Projekt-Status</Label>
                    <Select value={formData.project_status} onValueChange={(value) => handleInputChange('project_status', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auftrag neu im Server">Auftrag neu im Server</SelectItem>
                        <SelectItem value="Auftrag angelegt ohne VAO">Auftrag angelegt ohne VAO</SelectItem>
                        <SelectItem value="Auftrag neu VAO beantragt">Auftrag neu VAO beantragt</SelectItem>
                        <SelectItem value="VAO bei Baubeginn">VAO bei Baubeginn</SelectItem>
                        <SelectItem value="Auftrag angelegt keine VAO nötig">Auftrag angelegt keine VAO nötig</SelectItem>
                        <SelectItem value="Folgeauftrag">Folgeauftrag</SelectItem>
                        <SelectItem value="VAO von Projekt">VAO von Projekt</SelectItem>
                        <SelectItem value="Jahresgenehmigung">Jahresgenehmigung</SelectItem>
                        <SelectItem value="Aufgrabung beantragt">Aufgrabung beantragt</SelectItem>
                        <SelectItem value="Privat">Privat</SelectItem>
                        <SelectItem value="Storniert">Storniert</SelectItem>
                        <SelectItem value="Baustelle bearbeiten">Baustelle bearbeiten</SelectItem>
                        <SelectItem value="Montage neu in Craftnote angelegt">Montage neu in Craftnote angelegt</SelectItem>
                        <SelectItem value="Montage fertig">Montage fertig</SelectItem>
                        <SelectItem value="Planbare Baustelle begonnen">Planbare Baustelle begonnen</SelectItem>
                        <SelectItem value="Technisch fertig">Technisch fertig</SelectItem>
                        <SelectItem value="Kann zu VERFÜLLEN">Kann zu VERFÜLLEN</SelectItem>
                        <SelectItem value="Kann zu Pflaster/Platten">Kann zu Pflaster/Platten</SelectItem>
                        <SelectItem value="Kann zu Asphalt TRAG">Kann zu Asphalt TRAG</SelectItem>
                        <SelectItem value="Kann zu Asphalt FEIN">Kann zu Asphalt FEIN</SelectItem>
                        <SelectItem value="Baustelle fertig">Baustelle fertig</SelectItem>
                        <SelectItem value="Auftrag komplett abgeschlossen">Auftrag komplett abgeschlossen</SelectItem>
                        <SelectItem value="Auftrag angelegt mit VAO von prj">Auftrag angelegt mit VAO von prj</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Auftragseingang</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Baustelle Fertig</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grube_auf_datum">Grube auf</Label>
                    <Input
                      id="grube_auf_datum"
                      type="date"
                      value={formData.grube_auf_datum}
                      onChange={(e) => handleInputChange('grube_auf_datum', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kann_zu_meldung_datum">"Kann zu" Meldung</Label>
                    <Input
                      id="kann_zu_meldung_datum"
                      type="date"
                      value={formData.kann_zu_meldung_datum}
                      onChange={(e) => handleInputChange('kann_zu_meldung_datum', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
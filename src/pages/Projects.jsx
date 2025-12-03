import React, { useState, useEffect, useMemo } from "react";
import { Project, Excavation, User, MontageAuftrag } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, FolderOpen, Shovel, Calendar, Edit, CornerDownRight, CheckCircle, Construction, FileText, ListRestart, AlertTriangle, Loader2, Download, FileSpreadsheet } from "lucide-react";
import { createPageUrl } from "@/utils";
import ProjectForm from "../components/projects/ProjectForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";

const statusColors = {
  planning: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-800 border-gray-200",
  on_hold: "bg-orange-100 text-orange-800 border-orange-200"
};

const statusLabels = {
  planning: "Planung",
  active: "Aktiv",
  completed: "Abgeschlossen",
  on_hold: "Pausiert"
};

const projectStatusColors = {
  "Auftrag neu im Server": "bg-yellow-200 border-yellow-300",
  "Auftrag angelegt ohne VAO": "bg-yellow-100 border-yellow-200",
  "Auftrag neu VAO beantragt": "bg-green-100 border-green-200",
  "VAO bei Baubeginn": "bg-red-200 border-red-300",
  "Auftrag angelegt keine VAO nötig": "bg-green-100 border-green-200",
  "Folgeauftrag": "bg-yellow-100 border-yellow-200",
  "VAO von Projekt": "bg-gradient-to-r from-yellow-200 to-green-200 border-yellow-300",
  "Jahresgenehmigung": "bg-green-200 border-green-300",
  "Aufgrabung beantragt": "bg-red-200 border-red-300",
  "Privat": "bg-purple-200 border-purple-300",
  "Storniert": "bg-red-200 border-red-300",
  "Baustelle bearbeiten": "bg-pink-200 border-pink-300",
  "Montage neu in Craftnote angelegt": "bg-yellow-100 border-yellow-200",
  "Montage fertig": "bg-gray-200 border-gray-300",
  "Planbare Baustelle begonnen": "bg-orange-200 border-orange-300",
  "Technisch fertig": "bg-amber-700 text-white border-amber-800",
  "Kann zu VERFÜLLEN": "bg-blue-200 border-blue-300",
  "Kann zu Pflaster/Platten": "bg-blue-200 border-blue-300",
  "Kann zu Asphalt TRAG": "bg-blue-200 border-blue-300",
  "Kann zu Asphalt FEIN": "bg-blue-200 border-blue-300",
  "Baustelle fertig": "bg-green-300 border-green-400",
  "Auftrag komplett abgeschlossen": "bg-green-400 border-green-500",
  "Auftrag angelegt mit VAO von prj": "bg-blue-100 border-blue-200"
};

// OPTIMIERUNG: Limit für initiales Laden
const INITIAL_LOAD_LIMIT = 200;

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [parentForNewProject, setParentForNewProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    project_number: [],
    sm_number: [],
    order_type: [],
    contact_person: [],
    project_status: [],
    material_booking_completed: 'all',
    documentation_completed: 'all',
    city: [],
    street: [],
    vao_status: [],
    vao_valid_from: '',
    vao_valid_to: '',
    vao_days_remaining: '',
    date_filter_type: 'all',
    date_filter_value: ''
  });
  const [tempVaoDaysRemaining, setTempVaoDaysRemaining] = useState('');
  const [user, setUser] = useState(null);
  const [updatingProject, setUpdatingProject] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ 
    show: false, 
    projectId: null, 
    field: null, 
    value: null,
    oldValue: null 
  });

  const [vaoEditDialog, setVaoEditDialog] = useState({
    show: false,
    projectId: null,
    projectNumber: null,
    vaoStatus: '',
    vaoValidFrom: '',
    vaoValidTo: ''
  });
  const [updatingVao, setUpdatingVao] = useState(null);

  const loadData = async (currentUser) => {
    setError(null);
    try {
      let projectsPromise;
      if (currentUser && currentUser.position === 'Bauleiter') {
        projectsPromise = Project.filter({ assigned_foreman_id: currentUser.id }, "-created_date", INITIAL_LOAD_LIMIT);
      } else {
        // OPTIMIERUNG: Nur die letzten X Projekte laden (nach Erstellungsdatum sortiert)
        projectsPromise = Project.list("-created_date", INITIAL_LOAD_LIMIT);
      }

      // OPTIMIERUNG: Excavations erstmal nicht laden - werden nur für Umsatz benötigt, den wir hier nicht anzeigen
      const projectsData = await projectsPromise.catch(() => []);
      
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setExcavations([]); // Set to empty array, as per optimization
    } catch (err) {
      console.error("Fehler beim Laden der Projekte:", err);
      setError("Projektdaten konnten nicht geladen werden.");
      setProjects([]);
      setExcavations([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);
            await loadData(currentUser);
        } catch (e) {
            console.error("Fehler beim Laden des Benutzers oder der Initialdaten:", e);
            setError("Bitte melden Sie sich an, um Projekte zu sehen oder ein Fehler ist aufgetreten.");
            setIsLoading(false);
        }
    };
    loadInitialData();
  }, []);

  // Debounce für VAO Tage Filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, vao_days_remaining: tempVaoDaysRemaining }));
    }, 500);

    return () => clearTimeout(timer);
  }, [tempVaoDaysRemaining]);

  const handleProjectSubmit = async (projectData) => {
    try {
      let savedProject;
      if (editingProject) {
        await Project.update(editingProject.id, projectData);
        savedProject = { ...editingProject, ...projectData };
        
        // Update assigned monteure if project has montage
        if (editingProject.montage_auftrag_id && projectData.selected_monteure) {
          try {
            await MontageAuftrag.update(editingProject.montage_auftrag_id, {
              assigned_monteure: projectData.selected_monteure
            });
          } catch (error) {
            console.error("Fehler beim Aktualisieren der zugewiesenen Monteure:", error);
          }
        }
      } else {
        savedProject = await Project.create(projectData);
        console.log("Projekt erstellt:", savedProject);
        
        if (projectData.has_montage && savedProject && savedProject.id) {
          console.log("Erstelle Montageauftrag für Projekt:", savedProject.id);
          try {
            const montageAuftragData = {
              project_id: savedProject.id,
              project_number: savedProject.project_number,
              sm_number: savedProject.sm_number || '',
              title: savedProject.title || '',
              client: savedProject.client || '',
              street: savedProject.street || '',
              city: savedProject.city || '',
              order_type: savedProject.order_type || '',
              status: "Auftrag neu",
              created_from_project: true,
              notes: "",
              assigned_monteure: projectData.selected_monteure || []
            };
            
            console.log("Montageauftrag-Daten:", montageAuftragData);
            const montageAuftrag = await MontageAuftrag.create(montageAuftragData);
            console.log("Montageauftrag erstellt:", montageAuftrag);

            if (montageAuftrag && montageAuftrag.id) {
              await Project.update(savedProject.id, {
                montage_auftrag_id: montageAuftrag.id
              });
              console.log("Projekt aktualisiert mit montage_auftrag_id:", montageAuftrag.id);
            }
          } catch (montageError) {
            console.error("Fehler beim Erstellen des Montageauftrags:", montageError);
            alert(`Projekt wurde erstellt, aber Montageauftrag konnte nicht erstellt werden: ${montageError.message}`);
          }
        }
      }
      
      setShowProjectForm(false);
      setEditingProject(null);
      setParentForNewProject(null);
      await loadData(user);
    } catch (error) {
      console.error("Fehler beim Speichern des Projekts:", error);
      alert(`Fehler beim Speichern des Projekts: ${error.message}`);
    }
  };

  const handleEdit = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setShowProjectForm(true);
  };
  
  const handleAddNew = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleVaoClick = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (project.vao_source_project_id) {
      alert('VAO-Daten werden von einem anderen Projekt geerbt und können dort nicht direkt bearbeitet werden.');
      return;
    }
    
    setVaoEditDialog({
      show: true,
      projectId: project.id,
      projectNumber: project.project_number,
      vaoStatus: project.vao_status || '',
      vaoValidFrom: project.vao_valid_from ? new Date(project.vao_valid_from).toISOString().split('T')[0] : '',
      vaoValidTo: project.vao_valid_to ? new Date(project.vao_valid_to).toISOString().split('T')[0] : ''
    });
  };

  const handleVaoSave = async () => {
    const { projectId, vaoStatus, vaoValidFrom, vaoValidTo } = vaoEditDialog;
    
    setUpdatingVao(projectId);
    try {
      const updatedData = {
        vao_status: vaoStatus,
        vao_valid_from: vaoValidFrom || null,
        vao_valid_to: vaoValidTo || null
      };

      await Project.update(projectId, updatedData);
      
      setProjects(prevProjects => prevProjects.map(p => 
        p.id === projectId 
          ? { ...p, ...updatedData } 
          : p
      ));
      
      setVaoEditDialog({
        show: false,
        projectId: null,
        projectNumber: null,
        vaoStatus: '',
        vaoValidFrom: '',
        vaoValidTo: ''
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren der VAO:", error);
      alert(`Fehler beim Speichern der VAO-Daten: ${error.message}`);
    }
    setUpdatingVao(null);
  };

  const handleVaoCancel = () => {
    setVaoEditDialog({
      show: false,
      projectId: null,
      projectNumber: null,
      vaoStatus: '',
      vaoValidFrom: '',
      vaoValidTo: ''
    });
  };

  const handleStatusChange = async (projectId, newStatus) => {
    const project = projects.find(p => p.id === projectId);
    const oldStatus = project?.project_status;
    
    setConfirmDialog({ 
      show: true, 
      projectId, 
      field: 'project_status', 
      value: newStatus,
      oldValue: oldStatus 
    });
  };

  const handleCheckboxChange = async (projectId, field, value) => {
    if (value === true) {
      setConfirmDialog({ show: true, projectId, field, value, oldValue: false });
      return;
    }
    
    setUpdatingProject(projectId);
    try {
      await Project.update(projectId, { [field]: value });
      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, [field]: value } : p
      ));
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
    setUpdatingProject(null);
  };

  const handleConfirmCheckbox = async () => {
    const { projectId, field, value } = confirmDialog;
    setConfirmDialog({ show: false, projectId: null, field: null, value: null, oldValue: null });
    
    setUpdatingProject(projectId);
    try {
      await Project.update(projectId, { [field]: value });
      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, [field]: value } : p
      ));
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
    setUpdatingProject(null);
  };

  const handleCancelCheckbox = () => {
    setConfirmDialog({ show: false, projectId: null, field: null, value: null, oldValue: null });
  };

  const handleExportExcel = () => {
    const allFilteredProjects = [
      ...mainProjects,
      ...Array.from(followUpsByParent.values()).flat()
    ].sort((a, b) => (a.project_number || '').localeCompare(b.project_number || ''));

    const headers = [
      'Projektnummer', 'SM-Nummer', 'Titel', 'Kunde', 'Auftragsart', 
      'Stadt', 'Straße', 'Ansprechpartner', 'Status', 'VAO-Status',
      'VAO gültig von', 'VAO gültig bis', 'Auftragseingang', 'Baustelle Fertig',
      'Grube auf', 'Kann zu Meldung', 'Material gebucht', 'Dokumentation erledigt'
    ];

    const rows = allFilteredProjects.map(p => {
      const vaoInfo = getVAOInfo(p);
      return [
        p.project_number || '',
        p.sm_number || '',
        p.title || '',
        p.client || '',
        p.order_type || '',
        p.city || '',
        p.street || '',
        p.contact_person || '',
        p.project_status || '',
        p.vao_status || '',
        p.vao_valid_from ? new Date(p.vao_valid_from).toLocaleDateString('de-DE') : '',
        p.vao_valid_to ? new Date(p.vao_valid_to).toLocaleDateString('de-DE') : '',
        p.start_date ? new Date(p.start_date).toLocaleDateString('de-DE') : '',
        p.end_date ? new Date(p.end_date).toLocaleDateString('de-DE') : '',
        p.grube_auf_datum ? new Date(p.grube_auf_datum).toLocaleDateString('de-DE') : '',
        p.kann_zu_meldung_datum ? new Date(p.kann_zu_meldung_datum).toLocaleDateString('de-DE') : '',
        p.material_booking_completed ? 'Ja' : 'Nein',
        p.documentation_completed ? 'Ja' : 'Nein'
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Projekte_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    const allFilteredProjects = [
      ...mainProjects,
      ...Array.from(followUpsByParent.values()).flat()
    ].sort((a, b) => (a.project_number || '').localeCompare(b.project_number || ''));

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('l', 'mm', 'a4');
    
    // Header
    pdf.setFillColor(249, 115, 22);
    pdf.rect(0, 0, 297, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.text('Auftragsübersicht', 14, 12);
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Exportiert am: ${new Date().toLocaleDateString('de-DE')} | Anzahl: ${allFilteredProjects.length} Projekte`, 14, 19);
    
    // Tabellenkopf
    pdf.setTextColor(0, 0, 0);
    pdf.setFillColor(250, 250, 250);
    pdf.rect(10, 28, 277, 8, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'bold');
    pdf.text('Projekt-Nr.', 12, 33);
    pdf.text('SM-Nr.', 45, 33);
    pdf.text('Kunde', 70, 33);
    pdf.text('Stadt', 115, 33);
    pdf.text('Straße', 145, 33);
    pdf.text('Status', 190, 33);
    pdf.text('VAO', 240, 33);
    
    let y = 40;
    const rowHeight = 6;
    const pageHeight = 195;
    
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(7);
    
    allFilteredProjects.forEach((p, index) => {
      if (y > pageHeight) {
        pdf.addPage();
        
        // Header auf neuer Seite
        pdf.setFillColor(249, 115, 22);
        pdf.rect(0, 0, 297, 25, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.text('Auftragsübersicht', 14, 12);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Seite ${pdf.internal.pages.length - 1}`, 14, 19);
        
        // Tabellenkopf
        pdf.setTextColor(0, 0, 0);
        pdf.setFillColor(250, 250, 250);
        pdf.rect(10, 28, 277, 8, 'F');
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'bold');
        pdf.text('Projekt-Nr.', 12, 33);
        pdf.text('SM-Nr.', 45, 33);
        pdf.text('Kunde', 70, 33);
        pdf.text('Stadt', 115, 33);
        pdf.text('Straße', 145, 33);
        pdf.text('Status', 190, 33);
        pdf.text('VAO', 240, 33);
        
        y = 40;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
      }
      
      // Zebrastreifen
      if (index % 2 === 0) {
        pdf.setFillColor(252, 252, 252);
        pdf.rect(10, y - 4, 277, rowHeight, 'F');
      }
      
      const vaoInfo = getVAOInfo(p);
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'bold');
      pdf.text((p.project_number || '-').substring(0, 20), 12, y);
      
      pdf.setFont(undefined, 'normal');
      pdf.text((p.sm_number || '-').substring(0, 15), 45, y);
      pdf.text((p.client || '-').substring(0, 25), 70, y);
      pdf.text((p.city || '-').substring(0, 20), 115, y);
      pdf.text((p.street || '-').substring(0, 30), 145, y);
      
      const statusText = (p.project_status || '-').substring(0, 30);
      pdf.setFontSize(6);
      pdf.text(statusText, 190, y);
      
      pdf.setFontSize(7);
      const vaoText = vaoInfo.daysInfo 
        ? `${vaoInfo.text} (${vaoInfo.daysInfo})`.substring(0, 30)
        : (vaoInfo.text || '-').substring(0, 30);
      
      if (vaoInfo.color === 'text-red-600') {
        pdf.setTextColor(220, 38, 38);
      } else if (vaoInfo.color === 'text-orange-600') {
        pdf.setTextColor(234, 88, 12);
      } else if (vaoInfo.color === 'text-green-600') {
        pdf.setTextColor(22, 163, 74);
      }
      pdf.text(vaoText, 240, y);
      pdf.setTextColor(0, 0, 0);
      
      y += rowHeight;
    });
    
    // Footer auf letzter Seite
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text('A&S Tief- u. Straßenbau GmbH', 14, 205);
    
    pdf.save(`Projekte_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  // OPTIMIERUNG: useMemo für VAO-Berechnung
  const getVAOInfo = useMemo(() => {
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    
    const calculateVaoInfo = (currentProject) => {
      if (currentProject.vao_source_project_id) {
          const parent = projectsMap.get(currentProject.vao_source_project_id);
          if (parent) {
              const parentVaoInfo = calculateVaoInfo(parent); // Recursive call
              return { 
                ...parentVaoInfo, 
                text: `(VAO von ${parent.project_number})`,
                inherited: true
              };
          }
      }
        
      if (!currentProject.vao_status && !currentProject.vao_valid_to && !currentProject.vao_valid_from) {
        return { 
          text: "Nicht angegeben", 
          dateFrom: null,
          dateTo: null,
          daysInfo: null,
          color: "text-gray-500",
          inherited: false
        };
      }
      
      let dateFrom = null;
      let dateTo = null;
      
      if (currentProject.vao_valid_from) {
        const validFrom = new Date(currentProject.vao_valid_from);
        dateFrom = validFrom.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
      }
      
      if (currentProject.vao_valid_to) {
        const validTo = new Date(currentProject.vao_valid_to);
        validTo.setHours(23, 59, 59, 999);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = validTo.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        dateTo = validTo.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
        
        if (diffDays < 0) {
          return { 
            text: currentProject.vao_status || 'VAO',
            dateFrom: dateFrom,
            dateTo: dateTo,
            daysInfo: `${Math.abs(diffDays)}T überfällig`, 
            color: "text-red-600",
            inherited: false
          };
        } else if (diffDays <= 7 && diffDays >= 0) {
          return { 
            text: currentProject.vao_status || 'VAO',
            dateFrom: dateFrom,
            dateTo: dateTo,
            daysInfo: `${diffDays}T`, 
            color: "text-orange-600",
            inherited: false
          };
        } else {
          return { 
            text: currentProject.vao_status || 'VAO',
            dateFrom: dateFrom,
            dateTo: dateTo,
            daysInfo: `${diffDays}T`, 
            color: "text-green-600",
            inherited: false
          };
        }
      }
      
      return { 
        text: currentProject.vao_status || "Nicht angegeben", 
        dateFrom: dateFrom,
        dateTo: dateTo,
        daysInfo: null,
        color: "text-gray-600",
        inherited: false
      };
    };
    return calculateVaoInfo;
  }, [projects]);

  const projectRevenues = useMemo(() => {
    // Excavations are not loaded initially for performance reasons,
    // so this will always be an empty map.
    const revenues = new Map();
    const safeExcavations = Array.isArray(excavations) ? excavations : [];
    for (const exc of safeExcavations) {
      if (!exc || !exc.project_id) continue;
      const currentRevenue = revenues.get(exc.project_id) || 0;
      revenues.set(exc.project_id, currentRevenue + (exc.calculated_price || 0));
    }
    return revenues;
  }, [excavations]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      project_number: [],
      sm_number: [],
      order_type: [],
      contact_person: [],
      project_status: [],
      material_booking_completed: 'all',
      documentation_completed: 'all',
      city: [],
      street: [],
      vao_status: [],
      vao_valid_from: '',
      vao_valid_to: '',
      vao_days_remaining: '',
      date_filter_type: 'all',
      date_filter_value: ''
    });
    setSearchTerm('');
    setTempVaoDaysRemaining('');
  };
  
  // OPTIMIERUNG: Filter-Optionen mit useMemo cachen
  const projectNumberOptions = useMemo(() => {
    const options = projects
      .map(p => p.project_number)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  const smNumberOptions = useMemo(() => {
    const options = projects
      .map(p => p.sm_number)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  const orderTypeOptions = useMemo(() => {
    const options = projects
      .map(p => p.order_type)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  const contactPersonOptions = useMemo(() => {
    const options = projects
      .map(p => p.contact_person)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  const projectStatusOptions = useMemo(() => {
    const options = projects
      .map(p => p.project_status)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  const cityOptions = useMemo(() => {
    const options = projects
      .map(p => p.city)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  const streetOptions = useMemo(() => {
    const options = projects
      .map(p => p.street)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  const vaoStatusOptions = useMemo(() => {
    const options = projects
      .map(p => p.vao_status)
      .filter(Boolean)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    return [...new Set(options)].sort().map(opt => ({ value: opt, label: opt }));
  }, [projects]);

  // OPTIMIERUNG: Filtere und gruppiere Projekte effizienter
  const { mainProjects, followUpsByParent } = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    
    const filteredProjects = safeProjects.filter(p => {
        if (!p) return false;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            (p.title || '').toLowerCase().includes(searchLower) ||
            (p.project_number || '').toLowerCase().includes(searchLower) ||
            (p.sm_number || '').toLowerCase().includes(searchLower) ||
            (p.client || '').toLowerCase().includes(searchLower) ||
            (p.city || '').toLowerCase().includes(searchLower) ||
            (p.street || '').toLowerCase().includes(searchLower);

        const matchesProjectNumber = filters.project_number.length === 0 || filters.project_number.includes(p.project_number);
        const matchesSmNumber = filters.sm_number.length === 0 || filters.sm_number.includes(p.sm_number);
        const matchesOrderType = filters.order_type.length === 0 || filters.order_type.includes(p.order_type);
        const matchesContactPerson = filters.contact_person.length === 0 || filters.contact_person.includes(p.contact_person);
        const matchesProjectStatus = filters.project_status.length === 0 || filters.project_status.includes(p.project_status);
        const matchesMaterial = filters.material_booking_completed === 'all'
            || (filters.material_booking_completed === 'yes' && p.material_booking_completed)
            || (filters.material_booking_completed === 'no' && !p.material_booking_completed);
        const matchesDocumentation = filters.documentation_completed === 'all'
            || (filters.documentation_completed === 'yes' && p.documentation_completed)
            || (filters.documentation_completed === 'no' && !p.documentation_completed);
        const matchesCity = filters.city.length === 0 || filters.city.includes(p.city);
        const matchesStreet = filters.street.length === 0 || filters.street.includes(p.street);
        const matchesVaoStatus = filters.vao_status.length === 0 || filters.vao_status.includes(p.vao_status);
        
        const matchesVaoValidFrom = !filters.vao_valid_from || (p.vao_valid_from && new Date(p.vao_valid_from) >= new Date(filters.vao_valid_from));
        const matchesVaoValidTo = !filters.vao_valid_to || (p.vao_valid_to && new Date(p.vao_valid_to) <= new Date(filters.vao_valid_to));
        
        let matchesVaoDaysRemaining = true;
        if (filters.vao_days_remaining && filters.vao_days_remaining.trim() !== '') {
          // Ermittle das effektive Projekt für VAO-Daten
          let effectiveProject = p;
          if (p.vao_source_project_id) {
            const sourceProj = safeProjects.find(proj => proj.id === p.vao_source_project_id);
            if (sourceProj) {
              effectiveProject = sourceProj;
            }
          }
          
          if (effectiveProject.vao_valid_to) {
            const validTo = new Date(effectiveProject.vao_valid_to);
            validTo.setHours(23, 59, 59, 999);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = validTo.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const maxDays = parseInt(filters.vao_days_remaining);
            // Zeige alle Projekte die innerhalb der maxDays ablaufen (auch bereits abgelaufene)
            matchesVaoDaysRemaining = !isNaN(maxDays) && (diffDays <= maxDays);
          } else {
            matchesVaoDaysRemaining = false;
          }
        }
        
        let matchesDateFilter = true;
        if (filters.date_filter_type !== 'all' && filters.date_filter_value) {
          const filterDate = new Date(filters.date_filter_value);
          filterDate.setHours(0, 0, 0, 0);
          
          if (filters.date_filter_type === 'grube_auf') {
            if (p.grube_auf_datum) {
              const projectDate = new Date(p.grube_auf_datum);
              projectDate.setHours(0, 0, 0, 0);
              matchesDateFilter = projectDate.getTime() === filterDate.getTime();
            } else {
              matchesDateFilter = false;
            }
          } else if (filters.date_filter_type === 'kann_zu') {
            if (p.kann_zu_meldung_datum) {
              const projectDate = new Date(p.kann_zu_meldung_datum);
              projectDate.setHours(0, 0, 0, 0);
              matchesDateFilter = projectDate.getTime() === filterDate.getTime();
            } else {
              matchesDateFilter = false;
            }
          }
        }

        return matchesSearch && matchesProjectNumber && matchesSmNumber && matchesOrderType && matchesContactPerson && matchesProjectStatus && 
               matchesMaterial && matchesDocumentation && matchesCity && matchesStreet && matchesVaoStatus && matchesVaoValidFrom && matchesVaoValidTo && matchesVaoDaysRemaining && matchesDateFilter;
    });

    const projectMap = new Map(safeProjects.map(p => [p.id, p]));
    const currentMainProjects = [];
    const currentFollowUpsByParent = new Map();

    for (const project of filteredProjects) {
        if (project.parent_project_id && projectMap.has(project.parent_project_id)) {
            const parentId = project.parent_project_id;
            if (!currentFollowUpsByParent.has(parentId)) {
                currentFollowUpsByParent.set(parentId, []);
            }
            currentFollowUpsByParent.get(parentId).push(project);
        } else {
            currentMainProjects.push(project);
        }
    }
    
    const finalMainProjectSet = new Set(currentMainProjects.map(p => p.id));

    for (const children of currentFollowUpsByParent.values()) {
        for (const child of children) {
            const parentId = child.parent_project_id;
            if (parentId && projectMap.has(parentId) && !finalMainProjectSet.has(parentId)) {
                const parentProject = projectMap.get(parentId);
                if (parentProject) {
                    currentMainProjects.push(parentProject);
                    finalMainProjectSet.add(parentId);
                }
            }
        }
    }

    currentMainProjects.sort((a, b) => (a.project_number || '').localeCompare(b.project_number || ''));

    for (const [parentId, followUps] of currentFollowUpsByParent.entries()) {
      currentFollowUpsByParent.set(parentId, followUps.sort((a, b) => (a.project_number || '').localeCompare(b.project_number || '')));
    }

    return { mainProjects: currentMainProjects, followUpsByParent: currentFollowUpsByParent };
  }, [projects, searchTerm, filters]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Card className="card-elevation border-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="py-2">Projektnummer</TableHead>
                  <TableHead className="py-2">Auftragsart</TableHead>
                  <TableHead className="py-2">SM</TableHead>
                  <TableHead className="py-2">Stadt</TableHead>
                  <TableHead className="py-2">Straße</TableHead>
                  <TableHead className="py-2">Ansprechpartner</TableHead>
                  <TableHead className="py-2">VAO-Status</TableHead>
                  <TableHead className="py-2">Termine</TableHead>
                  <TableHead className="py-2 text-center">Status</TableHead>
                  <TableHead className="py-2 text-center">Material</TableHead>
                  <TableHead className="py-2 text-center">Dokumentation</TableHead>
                </TableRow>
                <TableRow>
                  <TableCell className="py-2" colSpan={11}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array(5).fill(0).map((_, i) => (
                  <TableRow key={i} className="h-12">
                    <TableCell className="py-2" colSpan={11}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return <div className="text-center text-red-500 py-8">{error}</div>;
    }



    // OPTIMIERUNG: React.memo für ProjectRow um unnötige Rerenders zu vermeiden
    const ProjectRow = React.memo(({ project, isFollowUp = false, rowIndex = 0 }) => {
        const vaoInfo = getVAOInfo(project); // Call the memoized function
        const isEvenRow = rowIndex % 2 === 0;
        const isVaoInherited = !!project.vao_source_project_id;
        
        return (
            <motion.tr
              key={project.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`h-12 hover:bg-orange-50/70 transition-colors group cursor-pointer ${
                isFollowUp ? 'bg-gray-50' : (isEvenRow ? 'bg-white' : 'bg-gray-50')
              }`}
              onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
            >
              <TableCell className="py-2 w-40" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    {isFollowUp && <CornerDownRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded font-bold text-sm whitespace-nowrap">
                        {project.project_number}
                    </span>
                </div>
              </TableCell>
              <TableCell className="py-2 w-32">
                <span className="text-gray-700 text-xs truncate block">
                  {project.order_type || 'Nicht angegeben'}
                </span>
              </TableCell>
              <TableCell className="py-2 w-28">
                 <span className="text-gray-700 text-xs truncate block">
                    {project.sm_number || 'Nicht angegeben'}
                  </span>
              </TableCell>
              <TableCell className="py-2 w-32">
                <span className="text-gray-700 text-xs truncate block font-medium">
                  {project.city || 'Nicht angegeben'}
                </span>
              </TableCell>
              <TableCell className="py-2 w-48">
                 <span className="text-gray-700 text-xs truncate block">
                    {project.street || 'Nicht angegeben'}
                  </span>
              </TableCell>
              <TableCell className="py-2 w-36">
                <span className="text-gray-700 text-xs truncate block">
                  {project.contact_person || 'Nicht angegeben'}
                </span>
              </TableCell>
              <TableCell 
                className="py-2 w-56"
                onClick={(e) => handleVaoClick(e, project)}
              >
                <button 
                  className={`text-xs font-medium w-full text-left ${vaoInfo.color} ${
                    isVaoInherited ? 'cursor-not-allowed opacity-60' : 'hover:underline cursor-pointer'
                  }`}
                  disabled={updatingVao === project.id}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{vaoInfo.text}</span>
                      {!isVaoInherited && <Edit className="w-3 h-3 inline-block flex-shrink-0" />}
                    </div>
                    {(vaoInfo.dateFrom || vaoInfo.dateTo) && (
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="font-mono">
                          {vaoInfo.dateFrom && vaoInfo.dateTo ? (
                            `${vaoInfo.dateFrom} - ${vaoInfo.dateTo}`
                          ) : vaoInfo.dateFrom ? (
                            `ab ${vaoInfo.dateFrom}`
                          ) : (
                            `bis ${vaoInfo.dateTo}`
                          )}
                        </span>
                        {vaoInfo.daysInfo && (
                          <span className="font-semibold ml-1">({vaoInfo.daysInfo})</span>
                        )}
                      </div>
                    )}
                    {vaoInfo.inherited && (
                      <span className="text-blue-600 text-xs italic">
                        {vaoInfo.text}
                      </span>
                    )}
                  </div>
                </button>
              </TableCell>
              <TableCell className="py-2 w-48">
                <div className="text-xs space-y-1">
                  {project.start_date && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Calendar className="w-3 h-3" />
                      <span>Eingang: {new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                    </div>
                  )}
                  {project.end_date && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Calendar className="w-3 h-3" />
                      <span>Fertig: {new Date(project.end_date).toLocaleDateString('de-DE')}</span>
                    </div>
                  )}
                  {project.grube_auf_datum && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Shovel className="w-3 h-3" />
                      <span>Grube auf: {new Date(project.grube_auf_datum).toLocaleDateString('de-DE')}</span>
                    </div>
                  )}
                  {project.kann_zu_meldung_datum && (
                    <div className="flex items-center gap-1 text-purple-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Kann zu: {new Date(project.kann_zu_meldung_datum).toLocaleDateString('de-DE')}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-2 w-64" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={project.project_status || ''}
                  onValueChange={(value) => handleStatusChange(project.id, value)}
                  disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'project_status')}
                >
                  <SelectTrigger className={`w-full h-8 text-xs ${projectStatusColors[project.project_status] || 'bg-gray-100'}`}>
                    <SelectValue placeholder="Status wählen"/>
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="py-2 text-center w-24" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={project.material_booking_completed || false}
                  onChange={(e) => handleCheckboxChange(project.id, 'material_booking_completed', e.target.checked)}
                  disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'material_booking_completed')}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                />
              </TableCell>
              <TableCell className="py-2 text-center w-28" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={project.documentation_completed || false}
                  onChange={(e) => handleCheckboxChange(project.id, 'documentation_completed', e.target.checked)}
                  disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'documentation_completed')}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                />
              </TableCell>
            </motion.tr>
        );
    });

    return (
      <>
        <Card className="card-elevation border-none hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="py-2 w-40">Projektnummer</TableHead>
                  <TableHead className="py-2 w-32">Auftragsart</TableHead>
                  <TableHead className="py-2 w-28">SM</TableHead>
                  <TableHead className="py-2 w-32">Stadt</TableHead>
                  <TableHead className="py-2 w-48">Straße</TableHead>
                  <TableHead className="py-2 w-36">Ansprechpartner</TableHead>
                  <TableHead className="py-2 w-56">VAO-Status</TableHead>
                  <TableHead className="py-2 w-48">Termine</TableHead>
                  <TableHead className="py-2 w-64">Status</TableHead>
                  <TableHead className="py-2 w-24 text-center">Material</TableHead>
                  <TableHead className="py-2 w-28 text-center">Dokumentation</TableHead>
                </TableRow>
                <TableRow className="bg-gray-50/50">
                   <TableCell className="p-1">
                     <MultiSelect
                       options={projectNumberOptions}
                       value={filters.project_number}
                       onValueChange={(v) => handleFilterChange('project_number', v)}
                       placeholder="Nr..."
                       searchPlaceholder="Projektnummer suchen..."
                       className="h-8 text-xs"
                     />
                   </TableCell>
                   <TableCell className="p-1">
                     <MultiSelect
                       options={orderTypeOptions}
                       value={filters.order_type}
                       onValueChange={(v) => handleFilterChange('order_type', v)}
                       placeholder="Filtern..."
                       searchPlaceholder="Auftragsart suchen..."
                       className="h-8 text-xs"
                     />
                   </TableCell>
                   <TableCell className="p-1">
                     <MultiSelect
                       options={smNumberOptions}
                       value={filters.sm_number}
                       onValueChange={(v) => handleFilterChange('sm_number', v)}
                       placeholder="SM..."
                       searchPlaceholder="SM-Nummer suchen..."
                       className="h-8 text-xs"
                     />
                   </TableCell>
                   <TableCell className="p-1">
                     <MultiSelect
                       options={cityOptions}
                       value={filters.city}
                       onValueChange={(v) => handleFilterChange('city', v)}
                       placeholder="Stadt..."
                       searchPlaceholder="Stadt suchen..."
                       className="h-8 text-xs"
                     />
                   </TableCell>
                   <TableCell className="p-1">
                     <MultiSelect
                       options={streetOptions}
                       value={filters.street}
                       onValueChange={(v) => handleFilterChange('street', v)}
                       placeholder="Straße..."
                       searchPlaceholder="Straße suchen..."
                       className="h-8 text-xs"
                     />
                   </TableCell>
                   <TableCell className="p-1">
                     <MultiSelect
                       options={contactPersonOptions}
                       value={filters.contact_person}
                       onValueChange={(v) => handleFilterChange('contact_person', v)}
                       placeholder="Filtern..."
                       searchPlaceholder="Ansprechpartner suchen..."
                       className="h-8 text-xs"
                     />
                   </TableCell>
                   <TableCell className="p-1">
                     <div className="space-y-1">
                       <MultiSelect
                         options={vaoStatusOptions}
                         value={filters.vao_status}
                         onValueChange={(v) => handleFilterChange('vao_status', v)}
                         placeholder="VAO..."
                         searchPlaceholder="VAO-Status suchen..."
                         className="h-8 text-xs"
                       />
                       <div className="flex gap-1">
                         <Input
                           type="date"
                           value={filters.vao_valid_from}
                           onChange={(e) => handleFilterChange('vao_valid_from', e.target.value)}
                           placeholder="Von..."
                           className="h-7 text-xs"
                         />
                         <Input
                           type="date"
                           value={filters.vao_valid_to}
                           onChange={(e) => handleFilterChange('vao_valid_to', e.target.value)}
                           placeholder="Bis..."
                           className="h-7 text-xs"
                         />
                       </div>
                       <Input
                         type="number"
                         value={tempVaoDaysRemaining}
                         onChange={(e) => setTempVaoDaysRemaining(e.target.value)}
                         placeholder="Max. Resttage..."
                         className="h-7 text-xs"
                         min="0"
                       />
                     </div>
                   </TableCell>
                   <TableCell className="p-1">
                      <div className="space-y-1">
                        <Select 
                          value={filters.date_filter_type} 
                          onValueChange={(v) => handleFilterChange('date_filter_type', v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="grube_auf">Grube auf</SelectItem>
                            <SelectItem value="kann_zu">Kann zu</SelectItem>
                          </SelectContent>
                        </Select>
                        {filters.date_filter_type !== 'all' && (
                          <Input
                            type="date"
                            value={filters.date_filter_value}
                            onChange={(e) => handleFilterChange('date_filter_value', e.target.value)}
                            placeholder="Datum..."
                            className="h-7 text-xs"
                          />
                        )}
                      </div>
                    </TableCell>
                   <TableCell className="p-1">
                     <MultiSelect
                       options={projectStatusOptions}
                       value={filters.project_status}
                       onValueChange={(v) => handleFilterChange('project_status', v)}
                       placeholder="Filtern..."
                       searchPlaceholder="Status suchen..."
                       className="h-8 text-xs"
                     />
                   </TableCell>
                   <TableCell className="p-1">
                     <Select value={filters.material_booking_completed} onValueChange={(v) => handleFilterChange('material_booking_completed', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filtern..."/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="yes">Ja</SelectItem>
                          <SelectItem value="no">Nein</SelectItem>
                        </SelectContent>
                     </Select>
                   </TableCell>
                   <TableCell className="p-1">
                     <Select value={filters.documentation_completed} onValueChange={(v) => handleFilterChange('documentation_completed', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filtern..."/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="yes">Ja</SelectItem>
                          <SelectItem value="no">Nein</SelectItem>
                        </SelectContent>
                     </Select>
                   </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                    {mainProjects.length === 0 && followUpsByParent.size === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-64">
                          <div className="text-center py-16">
                            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-xl font-medium text-gray-500 mb-2">Keine Projekte gefunden</h3>
                            <p className="text-gray-400 mb-6">Versuchen Sie, Ihre Suche anzupassen oder ein neues Projekt zu erstellen.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      mainProjects.map((project, mainIndex) => {
                        let rowIndex = mainIndex;
                        const rows = [<ProjectRow key={project.id} project={project} rowIndex={rowIndex} />];
                        
                        if (followUpsByParent.has(project.id)) {
                            followUpsByParent.get(project.id).forEach(followUp => {
                                rowIndex++;
                                rows.push(<ProjectRow key={followUp.id} project={followUp} isFollowUp={true} rowIndex={rowIndex} />);
                            });
                        }
                        
                        return rows;
                      })
                    )}
                </AnimatePresence>
                </TableBody>
                </Table>
                </div>
                </CardContent>
                </Card>

        <div className="md:hidden space-y-4">
          <AnimatePresence>
            {[...mainProjects, ...Array.from(followUpsByParent.values()).flat()]
              .sort((a, b) => (a.project_number || '').localeCompare(b.project_number || ''))
              .map((project, index) => {
                const vaoInfo = getVAOInfo(project);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="card-elevation border-l-4 border-orange-400"
                      onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">
                               <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{project.project_number}</span>
                            </p>
                            <p className="text-sm text-gray-500">
                               SM: {project.sm_number}
                            </p>
                          </div>
                        </div>
                        <div className="border-t pt-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Stadt</span>
                            <span className="font-medium text-gray-800">{project.city || 'Nicht angegeben'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Straße</span>
                            <span className="font-medium text-gray-800">{project.street || 'Nicht angegeben'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Auftragsart</span>
                            <span className="font-medium text-gray-800">{project.order_type || 'Nicht angegeben'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Ansprechpartner</span>
                            <span className="font-medium text-gray-800">{project.contact_person || 'Nicht angegeben'}</span>
                          </div>
                          <div className="flex justify-between" onClick={(e) => {
                            e.stopPropagation();
                            handleVaoClick(e, project);
                          }}>
                            <span className="text-gray-500">VAO-Status</span>
                            <button
                              className={`flex flex-col items-end gap-0.5 font-medium ${vaoInfo.color} ${
                                project.vao_source_project_id ? 'cursor-not-allowed opacity-60' : 'hover:underline cursor-pointer'
                              }`}
                              disabled={project.vao_source_project_id || updatingVao === project.id}
                            >
                              <div className="flex items-center gap-1">
                                <span>{vaoInfo.text}</span>
                                {!project.vao_source_project_id && <Edit className="w-3 h-3 flex-shrink-0" />}
                              </div>
                              {(vaoInfo.dateFrom || vaoInfo.dateTo) && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Calendar className="w-3 h-3" />
                                  <span className="font-mono">
                                    {vaoInfo.dateFrom && vaoInfo.dateTo ? (
                                      `${vaoInfo.dateFrom} - ${vaoInfo.dateTo}`
                                    ) : vaoInfo.dateFrom ? (
                                      `ab ${vaoInfo.dateFrom}`
                                    ) : (
                                      `bis ${vaoInfo.dateTo}`
                                    )}
                                  </span>
                                  {vaoInfo.daysInfo && <span>({vaoInfo.daysInfo})</span>}
                                </div>
                              )}
                              {vaoInfo.inherited && (
                                <span className="text-blue-600 text-xs italic">
                                  {vaoInfo.text}
                                </span>
                              )}
                            </button>
                          </div>
                          {project.start_date && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Auftragseingang</span>
                              <span className="font-medium text-blue-600">{new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                          {project.end_date && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Baustelle Fertig</span>
                              <span className="font-medium text-green-600">{new Date(project.end_date).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                          {project.grube_auf_datum && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Grube auf</span>
                              <span className="font-medium text-orange-600">{new Date(project.grube_auf_datum).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                          {project.kann_zu_meldung_datum && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Kann zu Meldung</span>
                              <span className="font-medium text-purple-600">{new Date(project.kann_zu_meldung_datum).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                           <div className="flex justify-between items-center">
                            <span className="text-gray-500">Status</span>
                            <span className={`font-medium text-gray-800 rounded px-2 py-1 text-xs ${projectStatusColors[project.project_status] || 'bg-gray-100'}`}>{project.project_status || 'Nicht angegeben'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Material gebucht</span>
                            <input
                              type="checkbox"
                              checked={project.material_booking_completed || false}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleCheckboxChange(project.id, 'material_booking_completed', e.target.checked);
                              }}
                              disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'material_booking_completed')}
                              className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Dokumentation</span>
                            <input
                              type="checkbox"
                              checked={project.documentation_completed || false}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleCheckboxChange(project.id, 'documentation_completed', e.target.checked);
                              }}
                              disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'documentation_completed')}
                              className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(e, project);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Bearbeiten
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="mx-auto" style={{maxWidth: '100%', width: '100%'}}>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Auftragsübersicht
            </h1>
            <p className="text-gray-600 mt-2">Verwalten Sie alle Ihre Bauprojekte</p>
            {projects.length >= INITIAL_LOAD_LIMIT && (
              <p className="text-xs text-orange-600 mt-1">
                Die letzten {INITIAL_LOAD_LIMIT} Projekte werden angezeigt
              </p>
            )}
          </div>
          <Button onClick={handleAddNew} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            Neues Projekt
          </Button>
        </div>

        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Suche nach Projektnummer, SM-Nummer, Stadt, Straße oder Kunde..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="h-12 whitespace-nowrap"
              >
                <ListRestart className="w-4 h-4 mr-2" />
                Filter zurücksetzen
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="h-12 whitespace-nowrap bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="h-12 whitespace-nowrap bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {renderContent()}

        <AnimatePresence>
          {showProjectForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) { setShowProjectForm(false); setEditingProject(null); setParentForNewProject(null); } }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-4xl"
              >
                <ProjectForm
                  project={editingProject}
                  parentProject={parentForNewProject}
                  onSubmit={handleProjectSubmit}
                  onCancel={() => {
                    setShowProjectForm(false);
                    setEditingProject(null);
                    setParentForNewProject(null);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VAO Edit Dialog */}
        <AnimatePresence>
          {vaoEditDialog.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) handleVaoCancel(); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md"
              >
                <Card className="card-elevation border-none">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      VAO bearbeiten - {vaoEditDialog.projectNumber}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vao_status">VAO Status</Label>
                      <Select
                        value={vaoEditDialog.vaoStatus}
                        onValueChange={(value) => setVaoEditDialog({...vaoEditDialog, vaoStatus: value})}
                        disabled={updatingVao !== null}
                      >
                        <SelectTrigger id="vao_status">
                          <SelectValue placeholder="Status auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Kein Status</SelectItem>
                          <SelectItem value="beantragt">Beantragt</SelectItem>
                          <SelectItem value="liegt vor">Liegt vor</SelectItem>
                          <SelectItem value="Verlängerung beantragt">Verlängerung beantragt</SelectItem>
                          <SelectItem value="Nicht notwendig">Nicht notwendig</SelectItem>
                          <SelectItem value="Nicht verlängern">Nicht verlängern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vao_valid_from">VAO gültig von</Label>
                      <Input
                        id="vao_valid_from"
                        type="date"
                        value={vaoEditDialog.vaoValidFrom}
                        onChange={(e) => setVaoEditDialog({...vaoEditDialog, vaoValidFrom: e.target.value})}
                        disabled={updatingVao !== null}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vao_valid_to">VAO gültig bis</Label>
                      <Input
                        id="vao_valid_to"
                        type="date"
                        value={vaoEditDialog.vaoValidTo}
                        onChange={(e) => setVaoEditDialog({...vaoEditDialog, vaoValidTo: e.target.value})}
                        disabled={updatingVao !== null}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={handleVaoCancel}
                        className="flex-1"
                        disabled={updatingVao !== null}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        onClick={handleVaoSave}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                        disabled={updatingVao !== null}
                      >
                        {updatingVao ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Speichern...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Speichern
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmDialog.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={(e) => { if (e.target === e.currentTarget) handleCancelCheckbox(); }}
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
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        {confirmDialog.field === 'material_booking_completed' ? (
                          <Construction className="w-6 h-6 text-orange-600" />
                        ) : confirmDialog.field === 'documentation_completed' ? (
                          <FileText className="w-6 h-6 text-blue-600" />
                        ) : (
                          <ListRestart className="w-6 h-6 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Bestätigung erforderlich</h3>
                        <p className="text-sm text-gray-600">
                          {confirmDialog.field === 'material_booking_completed' 
                            ? 'Materialbuchung als erledigt markieren' 
                            : confirmDialog.field === 'documentation_completed'
                            ? 'Dokumentation als erledigt markieren'
                            : 'Status ändern'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      {confirmDialog.field === 'material_booking_completed' ? (
                        <p className="text-gray-700">
                          Wurde die Materialbuchung wirklich durchgeführt? Diese Aktion markiert das Projekt als "Material gebucht".
                        </p>
                      ) : confirmDialog.field === 'documentation_completed' ? (
                        <p className="text-gray-700">
                          Wurde die Dokumentation wirklich durchgeführt? Diese Aktion markiert das Projekt als "Dokumentation erledigt".
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-gray-700">
                            Möchten Sie den Projekt-Status wirklich ändern?
                          </p>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Von:</span>
                              <Badge className={`${projectStatusColors[confirmDialog.oldValue] || 'bg-gray-100'}`}>
                                {confirmDialog.oldValue || 'Nicht definiert'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Zu:</span>
                              <Badge className={`${projectStatusColors[confirmDialog.value] || 'bg-gray-100'}`}>
                                {confirmDialog.value}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleCancelCheckbox}
                        className="flex-1"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        onClick={handleConfirmCheckbox}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Bestätigen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
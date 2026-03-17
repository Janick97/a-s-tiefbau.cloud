import React, { useState, useEffect, useMemo } from "react";
import { Project, Excavation, User, MontageAuftrag } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Construction, FileText, ListRestart, AlertTriangle, Loader2, Download, FileSpreadsheet, RefreshCw, ArrowUp, ArrowDown, Filter, X, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import ProjectForm from "../components/projects/ProjectForm";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ProjectsTable from "@/components/projects/ProjectsTable";
import QuickFilters from "@/components/projects/QuickFilters";

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
    ev_ta: 'all',
    ev_sa: 'all',
    ba_status: [],
    fa_status: [],
    city: [],
    street: [],
    vao_status: [],
    vao_valid_from: '',
    vao_valid_to: '',
    vao_days_remaining: '',
    date_filter_type: 'all',
    date_filter_value: '',
    assigned_bauleiter: [],
    foreman_completed: 'all',
    is_follow_up: 'all'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [tempVaoDaysRemaining, setTempVaoDaysRemaining] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
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
    // Für Material und Dokumentation immer Bestätigung anfordern
    if (field === 'material_booking_completed' || field === 'documentation_completed') {
      const project = projects.find(p => p.id === projectId);
      const oldValue = project?.[field] || false;
      setConfirmDialog({ show: true, projectId, field, value, oldValue });
      return;
    }
    
    if (value === true) {
      setConfirmDialog({ show: true, projectId, field, value, oldValue: false });
      return;
    }
    
    setUpdatingProject(projectId);
    try {
      const updateData = { [field]: value };
      
      // Wenn BA auf rot gesetzt wird, setze auch FA auf rot
      if (field === 'ba_status' && value === 'rot') {
        updateData.fa_status = 'rot';
      }
      
      await Project.update(projectId, updateData);
      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, ...updateData } : p
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
    
    let y = 42;
    const rowHeight = 9;
    const pageHeight = 195;

    const drawTableHeader = () => {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(10, 28, 277, 8, 'F');
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Projekt-Nr.', 12, 33);
      pdf.text('SM-Nr.', 45, 33);
      pdf.text('Kunde', 70, 33);
      pdf.text('Stadt', 115, 33);
      pdf.text('Straße', 145, 33);
      pdf.text('Status', 190, 33);
      pdf.text('VAO', 240, 33);
    };
    
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
        
        drawTableHeader();
        
        y = 42;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
      }
      
      // Zebrastreifen
      if (index % 2 === 0) {
        pdf.setFillColor(252, 252, 252);
        pdf.rect(10, y - 5, 277, rowHeight, 'F');
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
      
      // VAO: Status + Datum
      pdf.setFontSize(7);
      if (vaoInfo.color === 'text-red-600') {
        pdf.setTextColor(220, 38, 38);
      } else if (vaoInfo.color === 'text-orange-600') {
        pdf.setTextColor(234, 88, 12);
      } else if (vaoInfo.color === 'text-green-600') {
        pdf.setTextColor(22, 163, 74);
      } else {
        pdf.setTextColor(80, 80, 80);
      }

      const vaoStatusLine = vaoInfo.daysInfo
        ? `${vaoInfo.text} (${vaoInfo.daysInfo})`.substring(0, 35)
        : (vaoInfo.text || '-').substring(0, 35);
      pdf.text(vaoStatusLine, 240, y);

      // Datumszeile direkt darunter
      if (vaoInfo.dateFrom || vaoInfo.dateTo) {
        pdf.setFontSize(6);
        const dateLine = [
          vaoInfo.dateFrom ? `von ${vaoInfo.dateFrom}` : '',
          vaoInfo.dateTo ? `bis ${vaoInfo.dateTo}` : ''
        ].filter(Boolean).join('  ');
        pdf.text(dateLine.substring(0, 35), 240, y + 4);
      }

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
      ev_ta: 'all',
      ev_sa: 'all',
      ba_status: [],
      fa_status: [],
      city: [],
      street: [],
      vao_status: [],
      vao_valid_from: '',
      vao_valid_to: '',
      vao_days_remaining: '',
      date_filter_type: 'all',
      date_filter_value: '',
      assigned_bauleiter: [],
      foreman_completed: 'all',
      is_follow_up: 'all'
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

  const assignedBauleiterOptions = useMemo(() => {
    const bauleiterSet = new Set();
    projects.forEach(p => {
      if (p.assigned_bauleiter && Array.isArray(p.assigned_bauleiter)) {
        p.assigned_bauleiter.forEach(bl => {
          if (bl.name) bauleiterSet.add(bl.name);
        });
      }
      if (p.assigned_foreman_name) {
        bauleiterSet.add(p.assigned_foreman_name);
      }
    });
    return [...bauleiterSet].sort().map(name => ({ value: name, label: name }));
  }, [projects]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.project_number.length > 0) count++;
    if (filters.sm_number.length > 0) count++;
    if (filters.order_type.length > 0) count++;
    if (filters.contact_person.length > 0) count++;
    if (filters.project_status.length > 0) count++;
    if (filters.material_booking_completed !== 'all') count++;
    if (filters.documentation_completed !== 'all') count++;
    if (filters.ev_ta !== 'all') count++;
    if (filters.ev_sa !== 'all') count++;
    if (filters.ba_status.length > 0) count++;
    if (filters.fa_status.length > 0) count++;
    if (filters.city.length > 0) count++;
    if (filters.street.length > 0) count++;
    if (filters.vao_status.length > 0) count++;
    if (filters.vao_valid_from) count++;
    if (filters.vao_valid_to) count++;
    if (filters.vao_days_remaining) count++;
    if (filters.date_filter_type !== 'all') count++;
    if (filters.assigned_bauleiter.length > 0) count++;
    if (filters.foreman_completed !== 'all') count++;
    if (filters.is_follow_up !== 'all') count++;
    return count;
  }, [filters]);

  // OPTIMIERUNG: Filtere und gruppiere Projekte effizienter
  const { mainProjects, followUpsByParent } = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    
    // Sortiere alle Projekte nach Projektnummer
    const sortedProjects = [...safeProjects].sort((a, b) => {
      const numA = a.project_number || '';
      const numB = b.project_number || '';
      
      if (sortOrder === 'asc') {
        return numA.localeCompare(numB, 'de', { numeric: true });
      } else {
        return numB.localeCompare(numA, 'de', { numeric: true });
      }
    });
    
    const filteredProjects = sortedProjects.filter(p => {
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
        const matchesEvTa = filters.ev_ta === 'all'
            || (filters.ev_ta === 'yes' && p.ev_ta)
            || (filters.ev_ta === 'no' && !p.ev_ta);
        const matchesEvSa = filters.ev_sa === 'all'
            || (filters.ev_sa === 'yes' && p.ev_sa)
            || (filters.ev_sa === 'no' && !p.ev_sa);
        const matchesBaStatus = filters.ba_status.length === 0 || filters.ba_status.includes(p.ba_status);
        const matchesFaStatus = filters.fa_status.length === 0 || filters.fa_status.includes(p.fa_status);
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

        const matchesAssignedBauleiter = filters.assigned_bauleiter.length === 0 || 
          (p.assigned_bauleiter && Array.isArray(p.assigned_bauleiter) && 
           p.assigned_bauleiter.some(bl => filters.assigned_bauleiter.includes(bl.name))) ||
          (p.assigned_foreman_name && filters.assigned_bauleiter.includes(p.assigned_foreman_name));

        const matchesForemanCompleted = filters.foreman_completed === 'all' ||
          (filters.foreman_completed === 'yes' && p.foreman_completed) ||
          (filters.foreman_completed === 'no' && !p.foreman_completed);

        const matchesIsFollowUp = filters.is_follow_up === 'all' ||
          (filters.is_follow_up === 'yes' && p.is_follow_up) ||
          (filters.is_follow_up === 'no' && !p.is_follow_up);

        return matchesSearch && matchesProjectNumber && matchesSmNumber && matchesOrderType && matchesContactPerson && matchesProjectStatus && 
               matchesMaterial && matchesDocumentation && matchesEvTa && matchesEvSa && matchesBaStatus && matchesFaStatus && matchesCity && matchesStreet && matchesVaoStatus && matchesVaoValidFrom && matchesVaoValidTo && matchesVaoDaysRemaining && matchesDateFilter && matchesAssignedBauleiter && matchesForemanCompleted && matchesIsFollowUp;
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

    return { mainProjects: currentMainProjects, followUpsByParent: currentFollowUpsByParent };
  }, [projects, searchTerm, filters, sortOrder]);

  const handleQuickFilterApply = (savedFilters, savedSearch) => {
    if (!savedFilters) {
      handleResetFilters();
      return;
    }
    setFilters(savedFilters);
    setSearchTerm(savedSearch || "");
    if (savedFilters.vao_days_remaining) setTempVaoDaysRemaining(savedFilters.vao_days_remaining);
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
            <div className="flex flex-col gap-4">
              {/* Schnellfilter */}
              <QuickFilters
                currentFilters={filters}
                currentSearch={searchTerm}
                onApply={handleQuickFilterApply}
                userId={user?.id}
              />

              {/* Suchleiste und Hauptaktionen */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Suche nach Projektnummer, SM-Nummer, Stadt, Straße oder Kunde..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`h-12 whitespace-nowrap ${activeFiltersCount > 0 ? 'border-orange-500 bg-orange-50' : ''}`}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                    {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="h-12 whitespace-nowrap hidden md:flex"
                  >
                    {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadData(user)}
                    className="h-12 whitespace-nowrap hidden md:flex"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    className="h-12 whitespace-nowrap hidden lg:flex bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    className="h-12 whitespace-nowrap hidden lg:flex bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Aktive Filter Badges */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.project_number.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      Projekt-Nr: {filters.project_number.length}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('project_number', [])} />
                    </Badge>
                  )}
                  {filters.sm_number.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      SM: {filters.sm_number.length}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('sm_number', [])} />
                    </Badge>
                  )}
                  {filters.order_type.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      Auftragsart: {filters.order_type.length}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('order_type', [])} />
                    </Badge>
                  )}
                  {filters.project_status.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      Status: {filters.project_status.length}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('project_status', [])} />
                    </Badge>
                  )}
                  {filters.city.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      Stadt: {filters.city.length}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('city', [])} />
                    </Badge>
                  )}
                  {filters.assigned_bauleiter.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      Bauleiter: {filters.assigned_bauleiter.length}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('assigned_bauleiter', [])} />
                    </Badge>
                  )}
                  {activeFiltersCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleResetFilters}
                      className="h-6 text-xs"
                    >
                      Alle zurücksetzen
                    </Button>
                  )}
                </div>
              )}

              {/* Erweiterte Filter */}
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleContent>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t pt-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* Projekt-Identifikation */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Projektnummer</Label>
                        <MultiSelect
                          options={projectNumberOptions}
                          value={filters.project_number}
                          onValueChange={(v) => handleFilterChange('project_number', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">SM-Nummer</Label>
                        <MultiSelect
                          options={smNumberOptions}
                          value={filters.sm_number}
                          onValueChange={(v) => handleFilterChange('sm_number', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Auftragsart</Label>
                        <MultiSelect
                          options={orderTypeOptions}
                          value={filters.order_type}
                          onValueChange={(v) => handleFilterChange('order_type', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Projekt-Status</Label>
                        <MultiSelect
                          options={projectStatusOptions}
                          value={filters.project_status}
                          onValueChange={(v) => handleFilterChange('project_status', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      {/* Standort */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Stadt</Label>
                        <MultiSelect
                          options={cityOptions}
                          value={filters.city}
                          onValueChange={(v) => handleFilterChange('city', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Straße</Label>
                        <MultiSelect
                          options={streetOptions}
                          value={filters.street}
                          onValueChange={(v) => handleFilterChange('street', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Ansprechpartner</Label>
                        <MultiSelect
                          options={contactPersonOptions}
                          value={filters.contact_person}
                          onValueChange={(v) => handleFilterChange('contact_person', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      {/* Team & Zuweisungen */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Zugewiesener Bauleiter</Label>
                        <MultiSelect
                          options={assignedBauleiterOptions}
                          value={filters.assigned_bauleiter}
                          onValueChange={(v) => handleFilterChange('assigned_bauleiter', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      {/* VAO-Filter */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">VAO-Status</Label>
                        <MultiSelect
                          options={vaoStatusOptions}
                          value={filters.vao_status}
                          onValueChange={(v) => handleFilterChange('vao_status', v)}
                          placeholder="Auswählen..."
                          searchPlaceholder="Suchen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">VAO gültig von</Label>
                        <Input
                          type="date"
                          value={filters.vao_valid_from}
                          onChange={(e) => handleFilterChange('vao_valid_from', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">VAO gültig bis</Label>
                        <Input
                          type="date"
                          value={filters.vao_valid_to}
                          onChange={(e) => handleFilterChange('vao_valid_to', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">VAO Resttage (max.)</Label>
                        <Input
                          type="number"
                          value={tempVaoDaysRemaining}
                          onChange={(e) => setTempVaoDaysRemaining(e.target.value)}
                          placeholder="z.B. 7 für letzte Woche"
                          min="0"
                        />
                      </div>

                      {/* Status & Abschluss */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">BA-Status</Label>
                        <MultiSelect
                          options={[
                            { value: 'rot', label: '🔴 Rot' },
                            { value: 'gelb', label: '🟡 Gelb' },
                            { value: 'grün', label: '🟢 Grün' }
                          ]}
                          value={filters.ba_status}
                          onValueChange={(v) => handleFilterChange('ba_status', v)}
                          placeholder="Auswählen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">FA-Status</Label>
                        <MultiSelect
                          options={[
                            { value: 'rot', label: '🔴 Rot' },
                            { value: 'gelb', label: '🟡 Gelb' },
                            { value: 'grün', label: '🟢 Grün' }
                          ]}
                          value={filters.fa_status}
                          onValueChange={(v) => handleFilterChange('fa_status', v)}
                          placeholder="Auswählen..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Material gebucht</Label>
                        <Select value={filters.material_booking_completed} onValueChange={(v) => handleFilterChange('material_booking_completed', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="yes">Ja</SelectItem>
                            <SelectItem value="no">Nein</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Dokumentation erledigt</Label>
                        <Select value={filters.documentation_completed} onValueChange={(v) => handleFilterChange('documentation_completed', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="yes">Ja</SelectItem>
                            <SelectItem value="no">Nein</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Bauleiter abgeschlossen</Label>
                        <Select value={filters.foreman_completed} onValueChange={(v) => handleFilterChange('foreman_completed', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="yes">Ja</SelectItem>
                            <SelectItem value="no">Nein</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">EV - TA</Label>
                        <Select value={filters.ev_ta} onValueChange={(v) => handleFilterChange('ev_ta', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="yes">Ja</SelectItem>
                            <SelectItem value="no">Nein</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">EV - SA</Label>
                        <Select value={filters.ev_sa} onValueChange={(v) => handleFilterChange('ev_sa', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="yes">Ja</SelectItem>
                            <SelectItem value="no">Nein</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Folgeauftrag</Label>
                        <Select value={filters.is_follow_up} onValueChange={(v) => handleFilterChange('is_follow_up', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="yes">Ja</SelectItem>
                            <SelectItem value="no">Nein</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Datums-Filter */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Datum-Filter</Label>
                        <Select value={filters.date_filter_type} onValueChange={(v) => handleFilterChange('date_filter_type', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            <SelectItem value="grube_auf">Grube auf</SelectItem>
                            <SelectItem value="kann_zu">Kann zu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {filters.date_filter_type !== 'all' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-gray-700">Datum</Label>
                          <Input
                            type="date"
                            value={filters.date_filter_value}
                            onChange={(e) => handleFilterChange('date_filter_value', e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={handleResetFilters}
                        size="sm"
                      >
                        <ListRestart className="w-4 h-4 mr-2" />
                        Alle Filter zurücksetzen
                      </Button>
                    </div>
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        <ProjectsTable
          isLoading={isLoading}
          error={error}
          mainProjects={mainProjects}
          followUpsByParent={followUpsByParent}
          getVAOInfo={getVAOInfo}
          handleVaoClick={handleVaoClick}
          updatingVao={updatingVao}
          handleCheckboxChange={handleCheckboxChange}
          updatingProject={updatingProject}
          confirmDialog={confirmDialog}
          handleStatusChange={handleStatusChange}
          projectStatusOptions={projectStatusOptions}
        />

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
                          {confirmDialog.value ? 
                            'Wurde die Materialbuchung wirklich durchgeführt? Diese Aktion markiert das Projekt als "Material gebucht".' :
                            'Möchten Sie die Materialbuchung wirklich als nicht erledigt markieren?'
                          }
                        </p>
                      ) : confirmDialog.field === 'documentation_completed' ? (
                        <p className="text-gray-700">
                          {confirmDialog.value ?
                            'Wurde die Dokumentation wirklich durchgeführt? Diese Aktion markiert das Projekt als "Dokumentation erledigt".' :
                            'Möchten Sie die Dokumentation wirklich als nicht erledigt markieren?'
                          }
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
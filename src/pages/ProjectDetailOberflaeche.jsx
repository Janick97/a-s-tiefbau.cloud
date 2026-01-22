import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Project, Excavation, PriceItem, User, ExcavationClosure, PullingWork, ProjectMaterial, Material, TimesheetEntry, ProjectDocument } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProjectChat from "../components/projects/ProjectChat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import ExcavationWizard from "../components/excavations/ExcavationWizard";
import PullingWorkForm from "../components/projects/PullingWorkForm";
import MaterialManagement from "../components/projects/MaterialManagement";
import TimesheetManagement from "../components/projects/TimesheetManagement";
import DocumentManagement from "../components/projects/DocumentManagement";
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Euro,
  MapPin,
  Calendar,
  Loader2,
  AlertTriangle,
  X,
  Check,
  Image as ImageIcon,
  Ruler,
  Layers,
  Navigation,
  Eye,
  Upload,
  Trash2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Shovel,
  ListRestart,
  Clock,
  FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PartialClosureDialog from "../components/excavations/PartialClosureDialog";

export default function ProjectDetailOberflaechePage() {
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [pullingWorks, setPullingWorks] = useState([]);
  const [projectMaterials, setProjectMaterials] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeAction, setActiveAction] = useState(null);
  const [showExcavationForm, setShowExcavationForm] = useState(false);
  const [editingExcavation, setEditingExcavation] = useState(null);
  const [showPullingForm, setShowPullingForm] = useState(false);
  const [editingPulling, setEditingPulling] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    type: null, // 'backfill' or 'surface'
    excavation: null
  });
  const [photoUploadDialog, setPhotoUploadDialog] = useState({ // New state for photo upload dialog
    show: false,
    type: null, // 'backfill' or 'surface'
    excavation: null,
    photos: [], // Array of uploaded image URLs
    isUploading: false
  });
  const [detailDialog, setDetailDialog] = useState({
    show: false,
    excavation: null,
    priceItem: null
  });
  const [imagePreview, setImagePreview] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
    title: ''
  });
  const [partialClosureDialog, setPartialClosureDialog] = useState({
    show: false,
    excavation: null,
    remainingMeters: 0
  });

  const projectId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [userData, projectData, excavationsData, priceItemsData, pullingWorksData, projectMaterialsData, materialsData, timesheetsData, documentsData] = await Promise.all([
        User.me().catch(() => null),
        Project.get(projectId),
        Excavation.filter({ project_id: projectId }).catch(() => []),
        PriceItem.list().catch(() => []),
        PullingWork.filter({ project_id: projectId }).catch(() => []),
        ProjectMaterial.filter({ project_id: projectId }).catch(() => []),
        Material.list().catch(() => []),
        TimesheetEntry.filter({ project_id: projectId }).catch(() => []),
        ProjectDocument.filter({ project_id: projectId }).catch(() => [])
      ]);

      setUser(userData);
      setProject(projectData);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
      setPriceItems(Array.isArray(priceItemsData) ? priceItemsData : []);
      setPullingWorks(Array.isArray(pullingWorksData) ? pullingWorksData : []);
      setProjectMaterials(Array.isArray(projectMaterialsData) ? projectMaterialsData : []);
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (err) {
      console.error("Fehler beim Laden:", err);
      setError(err.message || "Ein Fehler ist aufgetreten.");
    }
    setIsLoading(false);
  };

  const handleExcavationClick = (excavation) => {
    const priceItem = priceItems.find(p => p.id === excavation.price_item_id);
    setDetailDialog({
      show: true,
      excavation,
      priceItem
    });
  };

  const handleCloseDetailDialog = () => {
    setDetailDialog({
      show: false,
      excavation: null,
      priceItem: null
    });
  };

  const handleMarkBackfilledClick = (excavation, event) => {
    event?.stopPropagation();
    setConfirmDialog({
      show: true,
      type: 'backfill',
      excavation: excavation
    });
  };

  const handleMarkClosedClick = async (excavation, event) => {
    event?.stopPropagation();
    
    // Für alle: Normaler Bestätigungsdialog für kompletten Abschluss
    setConfirmDialog({
      show: true,
      type: 'surface',
      excavation: excavation
    });
  };

  const handlePartialClosureClick = async (excavation, event) => {
    event?.stopPropagation();
    
    // Lade bestehende closures
    const closures = await ExcavationClosure.filter({ excavation_id: excavation.id }).catch(() => []);
    const totalClosedMeters = closures.reduce((sum, c) => sum + (c.meters_closed || 0), 0);
    const remainingMeters = Math.max(0, excavation.excavation_length - totalClosedMeters);
    
    setPartialClosureDialog({
      show: true,
      excavation,
      remainingMeters
    });
  };

  const handleConfirmAction = () => { // Modified to open photo upload dialog
    const { type, excavation } = confirmDialog;
    
    // Bestätigungsdialog schließen
    setConfirmDialog({ show: false, type: null, excavation: null });
    
    // Foto-Upload-Dialog öffnen
    setPhotoUploadDialog({
      show: true,
      type: type,
      excavation: excavation,
      photos: [], // Start with an empty array for new photos
      isUploading: false
    });
  };

  const handleCancelAction = () => {
    setConfirmDialog({ show: false, type: null, excavation: null });
  };

  const handlePhotoUpload = async (event) => { // New function for photo upload
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const currentPhotos = photoUploadDialog.photos.length;
    const remainingSlots = 10 - currentPhotos; // Max 10 photos
    const filesToUpload = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      alert(`Sie können maximal 10 Bilder hochladen. Es werden nur die ersten ${filesToUpload.length} Bilder berücksichtigt.`);
    }

    if (filesToUpload.length === 0) return;

    setPhotoUploadDialog(prev => ({ ...prev, isUploading: true }));

    try {
      const uploadPromises = filesToUpload.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploadedFiles = await Promise.all(uploadPromises);
      const newImageUrls = uploadedFiles.map(res => res.file_url);
      
      setPhotoUploadDialog(prev => ({
        ...prev,
        photos: [...prev.photos, ...newImageUrls],
        isUploading: false
      }));
    } catch (error) {
      console.error("Fehler beim Hochladen der Bilder:", error);
      alert("Ein Fehler ist beim Hochladen aufgetreten.");
      setPhotoUploadDialog(prev => ({ ...prev, isUploading: false }));
    }

    event.target.value = null; // Clear input to allow re-uploading same file
  };

  const handleDeletePhoto = (urlToDelete) => { // New function to delete a photo from preview
    setPhotoUploadDialog(prev => ({
      ...prev,
      photos: prev.photos.filter(url => url !== urlToDelete)
    }));
  };

  const handleCancelPhotoUpload = () => { // New function to cancel photo upload dialog
    setPhotoUploadDialog({
      show: false,
      type: null,
      excavation: null,
      photos: [],
      isUploading: false
    });
  };

  const handleConfirmPhotoUpload = async () => { // New function to confirm photo upload and update excavation
    const { type, excavation, photos } = photoUploadDialog;

    // Validierung: Mindestens 2 Fotos erforderlich
    if (photos.length < 2) {
      alert("Bitte laden Sie mindestens 2 Fotos hoch.");
      return;
    }

    setUpdating(excavation.id);
    setPhotoUploadDialog({ show: false, type: null, excavation: null, photos: [], isUploading: false });

    try {
      const updateData = {};
      
      if (type === 'backfill') {
        const backfillCommission = (excavation.calculated_price || 0) * 0.2;
        const existingBackfillPhotos = Array.isArray(excavation.photos_backfill) ? excavation.photos_backfill : [];
        
        updateData.is_backfilled = true;
        updateData.backfilled_date = new Date().toISOString().split('T')[0];
        updateData.backfilled_by = user.full_name;
        updateData.backfilled_by_user_id = user.id;
        updateData.backfill_commission = backfillCommission;
        updateData.photos_backfill = [...existingBackfillPhotos, ...photos]; // Append new photos
      } else if (type === 'surface') {
        const surfaceCommission = (excavation.calculated_price || 0) * 0.3;
        const existingSurfacePhotos = Array.isArray(excavation.photos_surface) ? excavation.photos_surface : [];
        
        updateData.is_closed = true;
        updateData.closed_date = new Date().toISOString().split('T')[0];
        updateData.closed_by = user.full_name;
        updateData.closed_by_user_id = user.id;
        updateData.surface_commission = surfaceCommission;
        updateData.photos_surface = [...existingSurfacePhotos, ...photos]; // Append new photos
      }
      
      await Excavation.update(excavation.id, updateData);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Markieren:", error);
      alert("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
    }
    setUpdating(null);
  };

  const filteredExcavations = excavations.filter(exc => {
    if (filterStatus === 'needs_backfill') return !exc.is_backfilled;
    if (filterStatus === 'needs_surface') return exc.is_backfilled && !exc.is_closed;
    if (filterStatus === 'completed') return exc.is_closed;
    return true;
  });

  const stats = {
    needsBackfill: excavations.filter(exc => !exc.is_backfilled).length,
    needsSurface: excavations.filter(exc => exc.is_backfilled && !exc.is_closed).length,
    completed: excavations.filter(exc => exc.is_closed).length,
    totalRevenue: excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0)
  };

  const getGoogleMapsLink = (excavation) => {
    if (excavation?.latitude && excavation?.longitude) {
      return `https://www.google.com/maps?q=${excavation.latitude},${excavation.longitude}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-orange-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold">Projekt wird geladen...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{error || "Projekt nicht gefunden"}</h2>
            <Link to={createPageUrl("MyProjectsOberflaeche")}>
              <Button>Zurück zur Übersicht</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || user.position !== 'Oberfläche') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Zugriff verweigert</h2>
            <p className="text-gray-600 mb-4">Diese Seite ist nur für Oberflächen-Mitarbeiter zugänglich.</p>
            <Link to={createPageUrl("Dashboard")}>
              <Button>Zum Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExcavationFormSubmit = async (data, excavationId) => {
    try {
      const dataWithProject = { ...data, project_id: data.project_id || projectId };
      if (excavationId) {
        await Excavation.update(excavationId, dataWithProject);
      } else {
        await Excavation.create(dataWithProject);
      }
      setShowExcavationForm(false);
      setEditingExcavation(null);
      setActiveAction(null);
      loadData();
    } catch (error) {
      console.error("Fehler beim Speichern der Ausgrabung:", error);
    }
  };

  const handlePullingFormSubmit = async (data) => {
    if (editingPulling) {
      await PullingWork.update(editingPulling.id, data);
    } else {
      await PullingWork.create({ ...data, project_id: project.id });
    }
    setShowPullingForm(false);
    setEditingPulling(null);
    setActiveAction(null);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Link to={createPageUrl("MyProjectsOberflaeche")}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{project.project_number}</h1>
              <p className="text-xs text-gray-600 truncate">{project.title}</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-orange-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Verfüllen</p>
              <p className="text-sm font-bold text-orange-700">{stats.needsBackfill}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Oberfläche</p>
              <p className="text-sm font-bold text-blue-700">{stats.needsSurface}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Fertig</p>
              <p className="text-sm font-bold text-green-700">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hauptaktionen - Große Buttons */}
      <div className="p-3 space-y-2">
        <Button
          onClick={() => {
            setEditingExcavation(null);
            setShowExcavationForm(true);
            setActiveAction('excavation');
          }}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
          size="lg"
        >
          <Shovel className="w-6 h-6 mr-3" />
          TIEFBAU
        </Button>

        <Button
          onClick={() => {
            setEditingPulling(null);
            setShowPullingForm(true);
            setActiveAction('pulling');
          }}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          size="lg"
        >
          <ListRestart className="w-6 h-6 mr-3" />
          EINZIEHEN
        </Button>

        <Button
          onClick={() => setActiveAction('material')}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          size="lg"
        >
          <Package className="w-6 h-6 mr-3" />
          MATERIAL
        </Button>

        <Button
          onClick={() => setActiveAction('timesheet')}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          size="lg"
        >
          <Clock className="w-6 h-6 mr-3" />
          STUNDENZETTEL
        </Button>

        <Button
          onClick={() => setActiveAction('backfill')}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700"
          size="lg"
        >
          <Package className="w-6 h-6 mr-3" />
          VERFÜLLEN ({stats.needsBackfill})
        </Button>

        <Button
          onClick={() => setActiveAction('surface')}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          size="lg"
        >
          <Layers className="w-6 h-6 mr-3" />
          OBERFLÄCHE ({stats.needsSurface})
        </Button>

        <Button
          onClick={() => setActiveAction('documents')}
          variant="outline"
          className="w-full h-14 text-xl font-bold border-2"
          size="lg"
        >
          <FileText className="w-5 h-5 mr-2" />
          DOKUMENTE ({documents.length})
        </Button>
      </div>

      {/* Chat-Bereich */}
      <div className="h-[400px] mx-3 mb-3">
        <ProjectChat projectId={project.id} />
      </div>

      {/* Projekt Info */}
      <div className="p-3">
        <Card className="card-elevation border-none mb-3">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500 mb-0.5">SM-Nr</p>
                <p className="font-medium">{project.sm_number}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Kunde</p>
                <p className="font-medium truncate">{project.client}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Stadt</p>
                <p className="font-medium truncate">{project.city}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Straße</p>
                <p className="font-medium truncate">{project.street}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leistungen Übersicht */}
        {excavations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shovel className="w-4 h-4" />
                Leistungen ({excavations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {excavations.slice(0, 3).map((exc) => (
                <div
                  key={exc.id}
                  onClick={() => handleExcavationClick(exc)}
                  className="p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm text-gray-900 truncate flex-1">{exc.location_name}</p>
                    <p className="text-sm font-bold text-green-700 ml-2">
                      €{Math.round(exc.calculated_price || 0).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{exc.street}, {exc.city}</p>
                </div>
              ))}
              {excavations.length > 3 && (
                <Button variant="ghost" className="w-full text-sm" onClick={() => setFilterStatus('all')}>
                  +{excavations.length - 3} weitere anzeigen
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Excavation Form Modal */}
      <AnimatePresence>
        {showExcavationForm && (
          <ExcavationWizard
            excavation={editingExcavation}
            projects={[project]}
            defaultProjectId={project.id}
            onSubmit={handleExcavationFormSubmit}
            onCancel={() => {
              setShowExcavationForm(false);
              setEditingExcavation(null);
              setActiveAction(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Pulling Form Modal */}
      <AnimatePresence>
        {showPullingForm && (
          <PullingWorkForm
            pullingWork={editingPulling}
            project={project}
            onSubmit={handlePullingFormSubmit}
            onCancel={() => {
              setShowPullingForm(false);
              setEditingPulling(null);
              setActiveAction(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Material Modal */}
      <AnimatePresence>
        {activeAction === 'material' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Material verwalten</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <MaterialManagement
                project={project}
                projectMaterials={projectMaterials}
                allMaterials={materials}
                loadData={loadData}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timesheet Modal */}
      <AnimatePresence>
        {activeAction === 'timesheet' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Stunden verwalten</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <TimesheetManagement
                projectId={project.id}
                project={project}
                loadData={loadData}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backfill Modal */}
      <AnimatePresence>
        {activeAction === 'backfill' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Leistungen zum Verfüllen</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {excavations.filter(exc => !exc.is_backfilled).map((excavation) => {
                    const priceItem = priceItems.find(p => p.id === excavation.price_item_id);
                    const isUpdating = updating === excavation.id;
                    
                    return (
                      <motion.div
                        key={excavation.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Card className="card-elevation border-none cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleExcavationClick(excavation)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm truncate">{excavation.location_name}</h3>
                                  <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                </div>
                                <p className="text-xs text-gray-600 truncate">{excavation.street}, {excavation.city}</p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 mb-2">
                              <div className="text-xs space-y-1">
                                <p className="text-gray-500">Position: <span className="font-medium text-gray-900">{priceItem?.description || 'N/A'}</span></p>
                                <p className="text-gray-500">Preis: <span className="font-semibold text-green-600">€{(excavation.calculated_price || 0).toLocaleString('de-DE')}</span></p>
                              </div>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkBackfilledClick(excavation, e);
                              }}
                              disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-sm"
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Wird gespeichert...
                                </>
                              ) : (
                                <>
                                  <Package className="w-4 h-4 mr-2" />
                                  Als verfüllt markieren
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {excavations.filter(exc => !exc.is_backfilled).length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">Alle Leistungen wurden bereits verfüllt</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surface Modal */}
      <AnimatePresence>
        {activeAction === 'surface' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Leistungen für Oberfläche</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {excavations.filter(exc => exc.is_backfilled && !exc.is_closed).map((excavation) => {
                    const priceItem = priceItems.find(p => p.id === excavation.price_item_id);
                    const isUpdating = updating === excavation.id;
                    const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
                    const anderePositionNumbers = [
                      '10021010', '10010413', '10037473', '10037352',
                      '10037463', '10037372', '10021040', '10037342', '10037363'
                    ];
                    const isGrabenPosition = priceItem?.unit === 'M' && 
                      !detailDimensionPositions.includes(priceItem?.item_number) &&
                      !anderePositionNumbers.includes(priceItem?.item_number);
                    
                    return (
                      <motion.div
                        key={excavation.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Card className="card-elevation border-none cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleExcavationClick(excavation)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm truncate">{excavation.location_name}</h3>
                                  <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                </div>
                                <p className="text-xs text-gray-600 truncate">{excavation.street}, {excavation.city}</p>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800 text-xs ml-2">
                                Verfüllt
                              </Badge>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 mb-2">
                              <div className="text-xs space-y-1">
                                <p className="text-gray-500">Position: <span className="font-medium text-gray-900">{priceItem?.description || 'N/A'}</span></p>
                                <p className="text-gray-500">Verfüllt am: <span className="font-medium text-gray-900">{excavation.backfilled_date ? new Date(excavation.backfilled_date).toLocaleDateString('de-DE') : '-'}</span></p>
                                <p className="text-gray-500">Preis: <span className="font-semibold text-green-600">€{(excavation.calculated_price || 0).toLocaleString('de-DE')}</span></p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {isGrabenPosition ? (
                                <>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePartialClosureClick(excavation, e);
                                    }}
                                    disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-sm"
                                  >
                                    <Ruler className="w-4 h-4 mr-2" />
                                    Teilabschluss verbuchen
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkClosedClick(excavation, e);
                                    }}
                                    disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-sm"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Komplett abschließen
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkClosedClick(excavation, e);
                                  }}
                                  disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-sm"
                                >
                                  {isUpdating ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Wird gespeichert...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Oberfläche fertigstellen
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {excavations.filter(exc => exc.is_backfilled && !exc.is_closed).length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">Keine Leistungen warten auf Oberflächenherstellung</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents Modal */}
      <AnimatePresence>
        {activeAction === 'documents' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Dokumente</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <DocumentManagement
                projectId={project.id}
                project={project}
                loadData={loadData}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alte Filter-basierte Leistungsliste - wird nicht mehr verwendet */}
      <div className="hidden">
        <div className="space-y-3">
          <AnimatePresence>
            {filteredExcavations.map((excavation) => {
              const priceItem = priceItems.find(p => p.id === excavation.price_item_id);
              const isUpdating = updating === excavation.id;
              
              return (
                <motion.div
                  key={excavation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card 
                    className="card-elevation border-none cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleExcavationClick(excavation)}
                  >
                    <CardContent className="p-3">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm truncate">{excavation.location_name}</h3>
                            <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          </div>
                          <p className="text-xs text-gray-600 truncate">{excavation.street}, {excavation.city}</p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {excavation.is_closed ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Fertig
                            </Badge>
                          ) : excavation.is_backfilled ? (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              Verfüllt
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              Offen
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="bg-gray-50 rounded-lg p-2 mb-2">
                        <div className="text-xs space-y-2">
                          <div>
                            <p className="text-gray-500">Position</p>
                            <p className="font-medium truncate">{priceItem?.description || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">
                              {(() => {
                                const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
                                const anderePositionNumbers = [
                                  '10021010', '10010413', '10037473', '10037352',
                                  '10037463', '10037372', '10021040', '10037342', '10037363'
                                ];
                                const isGrabenPosition = priceItem?.unit === 'M' && 
                                  !detailDimensionPositions.includes(priceItem?.item_number) &&
                                  !anderePositionNumbers.includes(priceItem?.item_number);
                                
                                return isGrabenPosition ? 'Abmessungen' : 'Menge';
                              })()}
                            </p>
                            <p className="font-medium text-orange-600">
                              {(() => {
                                const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
                                const anderePositionNumbers = [
                                  '10021010', '10010413', '10037473', '10037352',
                                  '10037463', '10037372', '10021040', '10037342', '10037363'
                                ];
                                const isGrabenPosition = priceItem?.unit === 'M' && 
                                  !detailDimensionPositions.includes(priceItem?.item_number) &&
                                  !anderePositionNumbers.includes(priceItem?.item_number);
                                
                                if (isGrabenPosition) {
                                  return `${(excavation.excavation_length || 0).toFixed(2)}m × ${(excavation.excavation_depth || 0).toFixed(2)}m × ${(excavation.excavation_width || 0).toFixed(2)}m`;
                                } else {
                                  return `${excavation.quantity} ${priceItem?.unit || 'ST'}`;
                                }
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Preis</p>
                            <p className="font-semibold text-green-600">
                              €{(excavation.calculated_price || 0).toLocaleString('de-DE')}
                            </p>
                          </div>
                        </div>
                      </div>



                      {/* Fotos Anzeige */}
                      {(excavation.photos_backfill?.length > 0 || excavation.photos_surface?.length > 0) && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Fotos vorhanden
                          </p>
                        </div>
                      )}

                      {/* Status Info */}
                      {excavation.is_backfilled && (
                        <div className="text-xs text-gray-600 mb-2">
                          <p>Verfüllt am: {new Date(excavation.backfilled_date).toLocaleDateString('de-DE')}</p>
                          <p>Verfüllt von: {excavation.backfilled_by}</p>
                        </div>
                      )}
                      {excavation.is_closed && (
                        <div className="text-xs text-gray-600 mb-2">
                          <p>Geschlossen am: {new Date(excavation.closed_date).toLocaleDateString('de-DE')}</p>
                          <p>Geschlossen von: {excavation.closed_by}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {!excavation.is_backfilled && (
                          <Button
                            onClick={(e) => handleMarkBackfilledClick(excavation, e)}
                            disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-sm"
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Wird gespeichert...
                              </>
                            ) : (
                              <>
                                <Package className="w-4 h-4 mr-2" />
                                Als verfüllt markieren
                              </>
                            )}
                          </Button>
                        )}
                        
                        {excavation.is_backfilled && !excavation.is_closed && (() => {
                          const priceItem = priceItems.find(p => p.id === excavation.price_item_id);
                          const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
                          const anderePositionNumbers = [
                            '10021010', '10010413', '10037473', '10037352',
                            '10037463', '10037372', '10021040', '10037342', '10037363'
                          ];
                          const isGrabenPosition = priceItem?.unit === 'M' && 
                            !detailDimensionPositions.includes(priceItem?.item_number) &&
                            !anderePositionNumbers.includes(priceItem?.item_number);
                          
                          return isGrabenPosition ? (
                            // Graben: Zwei Buttons
                            <div className="space-y-2">
                              <Button
                                onClick={(e) => handlePartialClosureClick(excavation, e)}
                                disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-sm"
                              >
                                <Ruler className="w-4 h-4 mr-2" />
                                Teilabschluss verbuchen
                              </Button>
                              <Button
                                onClick={(e) => handleMarkClosedClick(excavation, e)}
                                disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Komplett abschließen
                              </Button>
                            </div>
                          ) : (
                            // Grube: Ein Button
                            <Button
                              onClick={(e) => handleMarkClosedClick(excavation, e)}
                              disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-sm"
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Wird gespeichert...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Oberfläche fertigstellen
                                </>
                              )}
                            </Button>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredExcavations.length === 0 && (
            <Card className="card-elevation border-none">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Keine Leistungen gefunden
                </h3>
                <p className="text-gray-600 text-sm">
                  {filterStatus === 'needs_backfill' && 'Alle Leistungen wurden bereits verfüllt.'}
                  {filterStatus === 'needs_surface' && 'Keine Leistungen warten auf Oberflächenherstellung.'}
                  {filterStatus === 'completed' && 'Noch keine Leistungen abgeschlossen.'}
                  {filterStatus === 'all' && 'Dieses Projekt hat noch keine Leistungen.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detail-Dialog */}
      <AnimatePresence>
        {detailDialog.show && detailDialog.excavation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseDetailDialog(); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl my-8"
            >
              <Card className="card-elevation border-none">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{detailDialog.excavation.location_name}</CardTitle>
                      <p className="text-sm text-white/80 mt-1">
                        {detailDialog.priceItem?.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseDetailDialog}
                      className="text-white hover:bg-white/20"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Standort */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-orange-600" />
                      Standort
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-medium text-gray-900">
                        {detailDialog.excavation.street} {detailDialog.excavation.house_number}
                      </p>
                      <p className="text-gray-600">
                        {detailDialog.excavation.postal_code} {detailDialog.excavation.city}
                      </p>
                      {detailDialog.excavation.latitude && detailDialog.excavation.longitude && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(getGoogleMapsLink(detailDialog.excavation), '_blank')}
                            className="w-full"
                          >
                            <Navigation className="w-4 h-4 mr-2" />
                            In Google Maps öffnen
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Größe */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Ruler className="w-5 h-5 text-orange-600" />
                      Größe & Abmessungen
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {(() => {
                        const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
                        const anderePositionNumbers = [
                          '10021010', '10010413', '10037473', '10037352',
                          '10037463', '10037372', '10021040', '10037342', '10037363'
                        ];
                        const isGrabenPosition = detailDialog.priceItem?.unit === 'M' && 
                          !detailDimensionPositions.includes(detailDialog.priceItem?.item_number) &&
                          !anderePositionNumbers.includes(detailDialog.priceItem?.item_number);
                        
                        if (isGrabenPosition) {
                          // Graben-Position
                          return (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Länge</p>
                                  <p className="font-semibold text-gray-900">
                                    {(detailDialog.excavation.excavation_length || 0).toFixed(2)} m
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Tiefe</p>
                                  <p className="font-semibold text-gray-900">
                                    {(detailDialog.excavation.excavation_depth || 0).toFixed(2)} m
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Breite</p>
                                  <p className="font-semibold text-gray-900">
                                    {(detailDialog.excavation.excavation_width || 0).toFixed(2)} m
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (detailDialog.priceItem?.type === 'Grube') {
                          // Grube-Position
                          return (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Länge</p>
                                  <p className="font-semibold text-gray-900">
                                    {(detailDialog.excavation.excavation_length || 0).toFixed(2)} m
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Breite</p>
                                  <p className="font-semibold text-gray-900">
                                    {(detailDialog.excavation.excavation_width || 0).toFixed(2)} m
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Tiefe</p>
                                  <p className="font-semibold text-gray-900">
                                    {(detailDialog.excavation.excavation_depth || 0).toFixed(2)} m
                                  </p>
                                </div>
                              </div>
                              {detailDialog.excavation.excavation_factor !== 1 && (
                                <div className="pt-2 border-t border-gray-200">
                                  <p className="text-sm text-gray-600">Faktor: {detailDialog.excavation.excavation_factor}</p>
                                </div>
                              )}
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-sm text-gray-600">Gesamtvolumen:</p>
                                <p className="text-lg font-bold text-orange-600">
                                  {detailDialog.excavation.quantity.toFixed(2)} m³
                                </p>
                              </div>
                            </div>
                          );
                        } else {
                          // Andere Positionen
                          return (
                            <div>
                              <p className="text-sm text-gray-600">Menge:</p>
                              <p className="text-lg font-bold text-orange-600">
                                {detailDialog.excavation.quantity.toFixed(2)} {detailDialog.priceItem?.unit}
                              </p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Oberfläche */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-orange-600" />
                      Oberfläche
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Oberflächentypen:</p>
                        <div className="flex gap-2 flex-wrap">
                          {detailDialog.excavation.surface_type && (
                            <Badge className="bg-blue-100 text-blue-800">
                              {detailDialog.excavation.surface_type}
                            </Badge>
                          )}
                          {detailDialog.excavation.surface_type_2 && (
                            <Badge className="bg-purple-100 text-purple-800">
                              {detailDialog.excavation.surface_type_2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Material */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-orange-600" />
                      Verwendetes Material
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {(detailDialog.excavation.concrete_base_used || 
                        detailDialog.excavation.mortar_used || 
                        detailDialog.excavation.gravel_used) ? (
                        <div className="flex gap-2 flex-wrap">
                          {detailDialog.excavation.concrete_base_used && (
                            <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Unterbeton
                            </Badge>
                          )}
                          {detailDialog.excavation.mortar_used && (
                            <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mörtel
                            </Badge>
                          )}
                          {detailDialog.excavation.gravel_used && (
                            <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Splitt
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Keine Materialien erfasst</p>
                      )}
                    </div>
                  </div>

                  {/* Fotos */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-orange-600" />
                      Fotos
                    </h3>
                    <div className="space-y-4">
                      {/* Vorher-Fotos */}
                      {detailDialog.excavation.photos_before?.length > 0 && (
                       <div>
                         <p className="text-sm font-medium text-gray-700 mb-2">Vorher ({detailDialog.excavation.photos_before.length})</p>
                         <div className="grid grid-cols-3 gap-2">
                           {detailDialog.excavation.photos_before.map((url, index) => (
                             <div
                               key={index}
                               onClick={() => setImagePreview({
                                 isOpen: true,
                                 images: detailDialog.excavation.photos_before,
                                 currentIndex: index,
                                 title: 'Vorher-Fotos'
                               })}
                               className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                             >
                               <img src={url} alt={`Vorher ${index + 1}`} className="w-full h-full object-cover" />
                             </div>
                           ))}
                         </div>
                       </div>
                      )}

                      {/* Umfeld-Fotos */}
                      {detailDialog.excavation.photos_environment?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Umfeld ({detailDialog.excavation.photos_environment.length})</p>
                          <div className="grid grid-cols-3 gap-2">
                            {detailDialog.excavation.photos_environment.map((url, index) => (
                              <div
                                key={index}
                                onClick={() => setImagePreview({
                                  isOpen: true,
                                  images: detailDialog.excavation.photos_environment,
                                  currentIndex: index,
                                  title: 'Umfeld-Fotos'
                                })}
                                className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <img src={url} alt={`Umfeld ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verfüllungs-Fotos */}
                      {detailDialog.excavation.photos_backfill?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Verfüllung ({detailDialog.excavation.photos_backfill.length})</p>
                          <div className="grid grid-cols-3 gap-2">
                            {detailDialog.excavation.photos_backfill.map((url, index) => (
                              <div
                                key={index}
                                onClick={() => setImagePreview({
                                  isOpen: true,
                                  images: detailDialog.excavation.photos_backfill,
                                  currentIndex: index,
                                  title: 'Verfüllungs-Fotos'
                                })}
                                className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <img src={url} alt={`Verfüllung ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Oberflächen-Fotos */}
                      {detailDialog.excavation.photos_surface?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Oberfläche ({detailDialog.excavation.photos_surface.length})</p>
                          <div className="grid grid-cols-3 gap-2">
                            {detailDialog.excavation.photos_surface.map((url, index) => (
                              <div
                                key={index}
                                onClick={() => setImagePreview({
                                  isOpen: true,
                                  images: detailDialog.excavation.photos_surface,
                                  currentIndex: index,
                                  title: 'Oberflächen-Fotos'
                                })}
                                className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <img src={url} alt={`Oberfläche ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nachher-Fotos */}
                      {detailDialog.excavation.photos_after?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Nachher ({detailDialog.excavation.photos_after.length})</p>
                          <div className="grid grid-cols-3 gap-2">
                            {detailDialog.excavation.photos_after.map((url, index) => (
                              <div
                                key={index}
                                onClick={() => setImagePreview({
                                  isOpen: true,
                                  images: detailDialog.excavation.photos_after,
                                  currentIndex: index,
                                  title: 'Nachher-Fotos'
                                })}
                                className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <img src={url} alt={`Nachher ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!detailDialog.excavation.photos_before?.length && 
                       !detailDialog.excavation.photos_environment?.length &&
                       !detailDialog.excavation.photos_backfill?.length &&
                       !detailDialog.excavation.photos_surface?.length &&
                       !detailDialog.excavation.photos_after?.length && (
                        <p className="text-gray-500 text-sm text-center py-4">Keine Fotos vorhanden</p>
                      )}
                    </div>
                  </div>


                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bestätigungsdialog */}
      <AnimatePresence>
        {confirmDialog.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => { if (e.target === e.currentTarget) handleCancelAction(); }}
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
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      confirmDialog.type === 'backfill' ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                      {confirmDialog.type === 'backfill' ? (
                        <Package className="w-6 h-6 text-orange-600" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Bestätigung erforderlich</h3>
                      <p className="text-sm text-gray-600">
                        {confirmDialog.type === 'backfill' ? 'Verfüllung bestätigen' : 'Oberfläche bestätigen'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    {confirmDialog.type === 'backfill' ? (
                      <>
                        <p className="text-gray-700 mb-3">
                          Wurde die folgende Leistung wirklich <strong>verfüllt</strong>?
                        </p>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <p className="font-semibold text-gray-900">{confirmDialog.excavation?.location_name}</p>
                          <p className="text-sm text-gray-600">
                            {confirmDialog.excavation?.street}, {confirmDialog.excavation?.city}
                          </p>

                        </div>
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            ⚠️ <strong>Wichtig:</strong> Bestätigen Sie nur, wenn die Verfüllung tatsächlich durchgeführt wurde. 
                            Im nächsten Schritt müssen Sie mindestens 2 Fotos der Verfüllung hochladen.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-700 mb-3">
                          Wurde die <strong>Oberflächenherstellung</strong> der folgenden Leistung wirklich fertiggestellt?
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="font-semibold text-gray-900">{confirmDialog.excavation?.location_name}</p>
                          <p className="text-sm text-gray-600">
                            {confirmDialog.excavation?.street}, {confirmDialog.excavation?.city}
                          </p>

                        </div>
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            ⚠️ <strong>Wichtig:</strong> Bestätigen Sie nur, wenn die Oberfläche komplett fertiggestellt wurde. 
                            Im nächsten Schritt müssen Sie mindestens 2 Fotos der fertigen Oberfläche hochladen.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelAction}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleConfirmAction}
                      className={`flex-1 ${
                        confirmDialog.type === 'backfill' 
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      }`}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Ja, weiter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teilabschluss-Dialog für Gräben */}
      <AnimatePresence>
        {partialClosureDialog.show && (
          <PartialClosureDialog
            excavation={partialClosureDialog.excavation}
            user={user}
            remainingMeters={partialClosureDialog.remainingMeters}
            onClose={() => setPartialClosureDialog({ show: false, excavation: null, remainingMeters: 0 })}
            onSuccess={() => {
              setPartialClosureDialog({ show: false, excavation: null, remainingMeters: 0 });
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* Foto-Upload-Dialog */}
      <AnimatePresence>
        {photoUploadDialog.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget && !photoUploadDialog.isUploading) handleCancelPhotoUpload(); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl my-8"
            >
              <Card className="card-elevation border-none">
                <CardHeader className={`${
                  photoUploadDialog.type === 'backfill'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600'
                } text-white`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Camera className="w-6 h-6" />
                        {photoUploadDialog.type === 'backfill' ? 'Verfüllungs-Fotos hochladen' : 'Oberflächen-Fotos hochladen'}
                      </CardTitle>
                      <p className="text-sm text-white/80 mt-1">
                        Mindestens 2 Fotos erforderlich (maximal 10)
                      </p>
                    </div>
                    {!photoUploadDialog.isUploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelPhotoUpload}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-900">Wichtiger Hinweis:</p>
                          <p className="text-sm text-yellow-800">
                            Bitte laden Sie mindestens 2 Fotos hoch, die die {photoUploadDialog.type === 'backfill' ? 'Verfüllung' : 'fertige Oberfläche'} deutlich zeigen.
                            Dies dient als Nachweis für die durchgeführte Arbeit.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Foto-Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {photoUploadDialog.photos.map((url, index) => (
                        <div key={url + index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                          <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                          {!photoUploadDialog.isUploading && (
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(url)}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                      
                      {photoUploadDialog.isUploading && (
                        <div className="flex items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Upload Button */}
                    <Input
                      id="photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={photoUploadDialog.isUploading || photoUploadDialog.photos.length >= 10}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload').click()}
                      disabled={photoUploadDialog.isUploading || photoUploadDialog.photos.length >= 10}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {photoUploadDialog.isUploading 
                        ? 'Lädt hoch...' 
                        : `Fotos auswählen (${photoUploadDialog.photos.length}/10)`
                      }
                    </Button>

                    {photoUploadDialog.photos.length >= 10 && (
                      <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Maximale Anzahl von 10 Bildern erreicht.
                      </p>
                    )}

                    {photoUploadDialog.photos.length > 0 && photoUploadDialog.photos.length < 2 && (
                      <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Bitte laden Sie noch mindestens {2 - photoUploadDialog.photos.length} Foto(s) hoch.
                      </p>
                    )}

                    {photoUploadDialog.photos.length >= 2 && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Mindestanzahl erreicht. Sie können nun fortfahren.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelPhotoUpload}
                      className="flex-1"
                      disabled={photoUploadDialog.isUploading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleConfirmPhotoUpload}
                      className={`flex-1 ${
                        photoUploadDialog.type === 'backfill'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      }`}
                      disabled={photoUploadDialog.photos.length < 2 || photoUploadDialog.isUploading}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Bestätigen & Speichern
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bildvorschau-Modal */}
      <AnimatePresence>
        {imagePreview.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setImagePreview({ isOpen: false, images: [], currentIndex: 0, title: '' })}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 text-white">
                <div>
                  <h3 className="text-lg font-semibold">{imagePreview.title}</h3>
                  <p className="text-sm text-gray-300">
                    Bild {imagePreview.currentIndex + 1} von {imagePreview.images.length}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setImagePreview({ isOpen: false, images: [], currentIndex: 0, title: '' })}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Bild */}
              <div className="relative flex-1 flex items-center justify-center">
                <img
                  src={imagePreview.images[imagePreview.currentIndex]}
                  alt={`${imagePreview.title} ${imagePreview.currentIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                />

                {/* Navigation Pfeile */}
                {imagePreview.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setImagePreview(prev => ({
                        ...prev,
                        currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1
                      }))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 rounded-full p-2"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setImagePreview(prev => ({
                        ...prev,
                        currentIndex: prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0
                      }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 rounded-full p-2"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {imagePreview.images.length > 1 && (
                <div className="flex justify-center mt-4 space-x-2 max-w-full overflow-x-auto pb-2 px-4 scrollbar-hide">
                  {imagePreview.images.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setImagePreview(prev => ({ ...prev, currentIndex: index }))}
                      className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                        index === imagePreview.currentIndex 
                          ? 'border-white shadow-lg' 
                          : 'border-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
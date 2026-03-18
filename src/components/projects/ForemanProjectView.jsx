import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Excavation, PullingWork, ExcavationClosure } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Edit, MapPin, FileText, Shovel, Camera, Plus, Trash2,
  Eye, CheckCircle, X, Clock, Package, ListRestart, Construction, Layers,
  Loader2, Check, Upload, Ruler, Image as ImageIcon, Navigation, AlertTriangle, Wind
} from "lucide-react";
import ExcavationWizard from "./../../components/excavations/ExcavationWizard";
import PullingWorkForm from "./PullingWorkForm";
import BlowingWorkWizard from "./BlowingWorkWizard";
import ExcavationsManagement from "./ExcavationsManagement";
import PullingWorkManagement from "./PullingWorkManagement";
import MaterialManagement from "./MaterialManagement";
import TimesheetManagement from "./TimesheetManagement";
import DocumentManagement from "./DocumentManagement";
import PartialClosureDialog from "./../excavations/PartialClosureDialog";
import ProjectChat from "./ProjectChat";

export default function ForemanProjectView({
  project,
  excavations,
  pullingWorks,
  projectMaterials,
  timesheets,
  documents,
  priceItems,
  allMaterials,
  onExcavationSubmit,
  onExcavationDelete,
  loadData,
  user
}) {
  const [activeAction, setActiveAction] = useState(null);
  const [showTiefbauMenu, setShowTiefbauMenu] = useState(false);
  const [showOberflaecheMenu, setShowOberflaecheMenu] = useState(false);
  const [showExcavationForm, setShowExcavationForm] = useState(false);
  const [editingExcavation, setEditingExcavation] = useState(null);
  const [showPullingForm, setShowPullingForm] = useState(false);
  const [editingPulling, setEditingPulling] = useState(null);
  const [showBlowingWizard, setShowBlowingWizard] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, type: null, excavation: null });
  const [photoUploadDialog, setPhotoUploadDialog] = useState({ show: false, type: null, excavation: null, photos: [], isUploading: false });
  const [detailDialog, setDetailDialog] = useState({ show: false, excavation: null, priceItem: null });
  const [partialClosureDialog, setPartialClosureDialog] = useState({ show: false, excavation: null, remainingMeters: 0 });

  const handleExcavationFormSubmit = async (data) => {
    await onExcavationSubmit(data, editingExcavation?.id);
    setShowExcavationForm(false);
    setEditingExcavation(null);
    setActiveAction(null);
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

  const handleMarkBackfilledClick = (excavation, event) => {
    event?.stopPropagation();
    setConfirmDialog({ show: true, type: 'backfill', excavation });
  };

  const handlePartialClosureClick = async (excavation, event) => {
    event?.stopPropagation();
    const closures = await ExcavationClosure.filter({ excavation_id: excavation.id }).catch(() => []);
    const totalClosedMeters = closures.reduce((sum, c) => sum + (c.meters_closed || 0), 0);
    const remainingMeters = Math.max(0, excavation.excavation_length - totalClosedMeters);
    setPartialClosureDialog({ show: true, excavation, remainingMeters });
  };

  const handleConfirmAction = () => {
    const { type, excavation } = confirmDialog;
    setConfirmDialog({ show: false, type: null, excavation: null });
    setPhotoUploadDialog({ show: true, type, excavation, photos: [], isUploading: false });
  };

  const handleCancelAction = () => setConfirmDialog({ show: false, type: null, excavation: null });

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    const currentPhotos = photoUploadDialog.photos.length;
    const remainingSlots = 10 - currentPhotos;
    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) alert(`Maximal 10 Bilder. Es werden nur die ersten ${filesToUpload.length} berücksichtigt.`);
    if (filesToUpload.length === 0) return;
    setPhotoUploadDialog(prev => ({ ...prev, isUploading: true }));
    try {
      const uploadedFiles = await Promise.all(filesToUpload.map(file => base44.integrations.Core.UploadFile({ file })));
      const newImageUrls = uploadedFiles.map(res => res.file_url);
      setPhotoUploadDialog(prev => ({ ...prev, photos: [...prev.photos, ...newImageUrls], isUploading: false }));
    } catch (error) {
      alert("Fehler beim Hochladen.");
      setPhotoUploadDialog(prev => ({ ...prev, isUploading: false }));
    }
    event.target.value = null;
  };

  const handleDeletePhoto = (urlToDelete) => setPhotoUploadDialog(prev => ({ ...prev, photos: prev.photos.filter(url => url !== urlToDelete) }));
  const handleCancelPhotoUpload = () => setPhotoUploadDialog({ show: false, type: null, excavation: null, photos: [], isUploading: false });

  const handleConfirmPhotoUpload = async () => {
    const { type, excavation, photos } = photoUploadDialog;
    if (photos.length < 2) { alert("Bitte laden Sie mindestens 2 Fotos hoch."); return; }
    setUpdating(excavation.id);
    setPhotoUploadDialog({ show: false, type: null, excavation: null, photos: [], isUploading: false });
    try {
      const updateData = {};
      if (type === 'backfill') {
        updateData.is_backfilled = true;
        updateData.backfilled_date = new Date().toISOString().split('T')[0];
        updateData.backfilled_by = user.full_name;
        updateData.backfilled_by_user_id = user.id;
        updateData.backfill_commission = (excavation.calculated_price || 0) * 0.2;
        updateData.photos_backfill = [...(excavation.photos_backfill || []), ...photos];
      } else if (type === 'asphalt_trag') {
        updateData.asphalt_trag_completed = true;
        updateData.asphalt_trag_date = new Date().toISOString().split('T')[0];
        updateData.asphalt_trag_by = user.full_name;
        updateData.asphalt_trag_by_user_id = user.id;
        updateData.asphalt_trag_commission = (excavation.calculated_price || 0) * 0.15;
        updateData.photos_asphalt_trag = photos;
        updateData.photos_surface = [...(excavation.photos_surface || []), ...photos];
      } else if (type === 'asphalt_fein') {
        updateData.asphalt_fein_completed = true;
        updateData.asphalt_fein_date = new Date().toISOString().split('T')[0];
        updateData.asphalt_fein_by = user.full_name;
        updateData.asphalt_fein_by_user_id = user.id;
        updateData.asphalt_fein_commission = (excavation.calculated_price || 0) * 0.15;
        updateData.photos_asphalt_fein = photos;
        updateData.photos_surface = [...(excavation.photos_surface || []), ...photos];
        updateData.is_closed = true;
        updateData.closed_date = new Date().toISOString().split('T')[0];
        updateData.closed_by = user.full_name;
        updateData.closed_by_user_id = user.id;
      } else if (type === 'platten_pflaster') {
        updateData.platten_pflaster_completed = true;
        updateData.platten_pflaster_date = new Date().toISOString().split('T')[0];
        updateData.platten_pflaster_by = user.full_name;
        updateData.platten_pflaster_by_user_id = user.id;
        updateData.platten_pflaster_commission = (excavation.calculated_price || 0) * 0.3;
        updateData.photos_platten_pflaster = photos;
        updateData.photos_surface = [...(excavation.photos_surface || []), ...photos];
        updateData.is_closed = true;
        updateData.closed_date = new Date().toISOString().split('T')[0];
        updateData.closed_by = user.full_name;
        updateData.closed_by_user_id = user.id;
      }
      await Excavation.update(excavation.id, updateData);
      await loadData();
    } catch (error) {
      alert("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
    }
    setUpdating(null);
  };

  const handleExcavationClick = (excavation) => {
    const priceItem = priceItems.find(p => p.id === excavation.price_item_id);
    setDetailDialog({ show: true, excavation, priceItem });
  };

  const stats = {
    needsBackfill: excavations.filter(exc => !exc.is_backfilled).length,
    needsAsphaltTrag: excavations.filter(exc => exc.is_backfilled && !exc.asphalt_trag_completed && (exc.surface_type === 'Asphalt' || exc.surface_type_2 === 'Asphalt')).length,
    needsAsphaltFein: excavations.filter(exc => exc.asphalt_trag_completed && !exc.asphalt_fein_completed && (exc.surface_type === 'Asphalt' || exc.surface_type_2 === 'Asphalt')).length,
    needsPlattenPflaster: excavations.filter(exc => exc.is_backfilled && !exc.platten_pflaster_completed && exc.surface_type !== 'Asphalt' && exc.surface_type_2 !== 'Asphalt' && exc.surface_type !== 'unbefestigt').length,
  };

  const ExcavationListModal = ({ filterFn, title, actionType, buttonLabel, buttonClass }) => (
    <AnimatePresence>
      {activeAction === actionType && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
          onClick={() => setActiveAction(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold">{title}</h3>
              <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 space-y-3">
              {excavations.filter(filterFn).map(excavation => {
                const priceItem = priceItems.find(p => p.id === excavation.price_item_id);
                const isUpdating = updating === excavation.id;
                return (
                  <Card key={excavation.id} className="card-elevation border-none cursor-pointer hover:shadow-lg" onClick={() => handleExcavationClick(excavation)}>
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
                      <div className="bg-gray-50 rounded-lg p-2 mb-2 text-xs space-y-1">
                        <p className="text-gray-500">Position: <span className="font-medium text-gray-900">{priceItem?.description || 'N/A'}</span></p>
                        <p className="text-gray-500">Preis: <span className="font-semibold text-green-600">€{(excavation.calculated_price || 0).toLocaleString('de-DE')}</span></p>
                      </div>
                      <Button
                        onClick={e => { e.stopPropagation(); setConfirmDialog({ show: true, type: actionType, excavation }); }}
                        disabled={isUpdating || confirmDialog.show || photoUploadDialog.show}
                        className={`w-full text-sm ${buttonClass}`}
                      >
                        {isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird gespeichert...</> : <><CheckCircle className="w-4 h-4 mr-2" />{buttonLabel}</>}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {excavations.filter(filterFn).length === 0 && (
                <div className="text-center py-12"><CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" /><p className="text-gray-600">Keine ausstehenden Einträge</p></div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Link to={createPageUrl("MyProjects")}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{project.project_number}</h1>
              <p className="text-xs text-gray-600 truncate">{project.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <Button onClick={() => setShowTiefbauMenu(true)} className="w-full h-16 text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700" size="lg">
          <Shovel className="w-6 h-6 mr-3" />TIEFBAU
        </Button>
        <Button onClick={() => setActiveAction('backfill')} className="w-full h-16 text-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700" size="lg">
          <Package className="w-6 h-6 mr-3" />VERFÜLLEN ({stats.needsBackfill})
        </Button>
        <Button onClick={() => setShowOberflaecheMenu(true)} className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700" size="lg">
          <Layers className="w-6 h-6 mr-3" />OBERFLÄCHE ({stats.needsAsphaltTrag + stats.needsAsphaltFein + stats.needsPlattenPflaster})
        </Button>
        <Button onClick={() => setActiveAction('documents')} variant="outline" className="w-full h-14 text-xl font-bold border-2" size="lg">
          <FileText className="w-5 h-5 mr-2" />DOKUMENTE ({documents.length})
        </Button>
      </div>

      {/* Tiefbau Menu */}
      <AnimatePresence>
        {showTiefbauMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setShowTiefbauMenu(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Tiefbau Optionen</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowTiefbauMenu(false)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="space-y-2">
                <Button onClick={() => { setShowTiefbauMenu(false); setEditingExcavation(null); setShowExcavationForm(true); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700" size="lg">
                  <Shovel className="w-5 h-5 mr-2" />Leistung erfassen
                </Button>
                <Button onClick={() => { setShowTiefbauMenu(false); setShowBlowingWizard(true); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700" size="lg">
                  <Wind className="w-5 h-5 mr-2" />Einblasen
                </Button>
                <Button onClick={() => { setShowTiefbauMenu(false); setEditingPulling(null); setShowPullingForm(true); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-600" size="lg">
                  <ListRestart className="w-5 h-5 mr-2" />Einziehen
                </Button>
                <Button onClick={() => { setShowTiefbauMenu(false); setActiveAction('material'); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-green-600" size="lg">
                  <Package className="w-5 h-5 mr-2" />Material
                </Button>
                <Button onClick={() => { setShowTiefbauMenu(false); setActiveAction('timesheet'); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-500 to-purple-600" size="lg">
                  <Clock className="w-5 h-5 mr-2" />Stundenzettel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Oberfläche Menu */}
      <AnimatePresence>
        {showOberflaecheMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setShowOberflaecheMenu(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Oberfläche Optionen</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowOberflaecheMenu(false)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="space-y-2">
                <Button onClick={() => { setShowOberflaecheMenu(false); setActiveAction('asphalt_trag'); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-800" size="lg">
                  <Layers className="w-5 h-5 mr-2" />ASPHALT TRAG ({stats.needsAsphaltTrag})
                </Button>
                <Button onClick={() => { setShowOberflaecheMenu(false); setActiveAction('asphalt_fein'); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-gray-900 to-black" size="lg">
                  <Layers className="w-5 h-5 mr-2" />ASPHALT FEIN ({stats.needsAsphaltFein})
                </Button>
                <Button onClick={() => { setShowOberflaecheMenu(false); setActiveAction('platten_pflaster'); }} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-cyan-500 to-blue-600" size="lg">
                  <Layers className="w-5 h-5 mr-2" />PLATTEN/PFLASTER ({stats.needsPlattenPflaster})
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[400px] mx-3 mb-3">
        <ProjectChat projectId={project.id} />
      </div>

      {/* Leistungen */}
      <div className="p-3 space-y-3">
        {excavations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Shovel className="w-4 h-4" />Leistungen ({excavations.length})</span>
                <Button size="sm" variant="outline" onClick={() => { setEditingExcavation(null); setShowExcavationForm(true); }} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />Neu
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {excavations.map(exc => {
                const priceItem = priceItems.find(p => p.id === exc.price_item_id);
                return (
                  <div key={exc.id} className="border-2 rounded-lg p-3 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{exc.location_name}</p>
                        <p className="text-xs text-gray-600 truncate">{exc.street}, {exc.city}</p>
                      </div>
                      {exc.is_closed ? <Badge className="bg-green-100 text-green-800 text-xs ml-2">Fertig</Badge>
                        : exc.is_backfilled ? <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-2">Verfüllt</Badge>
                        : <Badge className="bg-orange-100 text-orange-800 text-xs ml-2">Offen</Badge>}
                    </div>
                    {priceItem && (
                      <div className="bg-gray-50 rounded p-2 mb-2">
                        <p className="text-xs text-gray-600 truncate">{priceItem.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>L: {exc.excavation_length?.toFixed(1)}m</span>
                          <span>B: {exc.excavation_width?.toFixed(1)}m</span>
                          <span>T: {exc.excavation_depth?.toFixed(1)}m</span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleExcavationClick(exc)} className="flex-1 h-8 text-xs"><Eye className="w-3 h-3 mr-1" />Details</Button>
                      <Button size="sm" onClick={() => { setEditingExcavation(exc); setShowExcavationForm(true); }} className="flex-1 h-8 text-xs bg-orange-600 hover:bg-orange-700"><Edit className="w-3 h-3 mr-1" />Bearbeiten</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Excavation List Modals */}
      <ExcavationListModal
        filterFn={exc => !exc.is_backfilled}
        title="Leistungen zum Verfüllen"
        actionType="backfill"
        buttonLabel="Als verfüllt markieren"
        buttonClass="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
      />
      <ExcavationListModal
        filterFn={exc => exc.is_backfilled && !exc.asphalt_trag_completed && (exc.surface_type === 'Asphalt' || exc.surface_type_2 === 'Asphalt')}
        title="Asphalt Tragschicht"
        actionType="asphalt_trag"
        buttonLabel="Tragschicht fertigstellen"
        buttonClass="bg-gradient-to-r from-gray-700 to-gray-800"
      />
      <ExcavationListModal
        filterFn={exc => exc.asphalt_trag_completed && !exc.asphalt_fein_completed && (exc.surface_type === 'Asphalt' || exc.surface_type_2 === 'Asphalt')}
        title="Asphalt Feinschicht"
        actionType="asphalt_fein"
        buttonLabel="Feinschicht fertigstellen"
        buttonClass="bg-gradient-to-r from-gray-900 to-black"
      />
      <ExcavationListModal
        filterFn={exc => exc.is_backfilled && !exc.platten_pflaster_completed && exc.surface_type !== 'Asphalt' && exc.surface_type_2 !== 'Asphalt' && exc.surface_type !== 'unbefestigt'}
        title="Platten/Pflaster Oberfläche"
        actionType="platten_pflaster"
        buttonLabel="Oberfläche fertigstellen"
        buttonClass="bg-gradient-to-r from-cyan-500 to-blue-600"
      />

      {/* Material Modal */}
      <AnimatePresence>
        {activeAction === 'material' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Material verwalten</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}><X className="w-5 h-5" /></Button>
              </div>
              <MaterialManagement project={project} projectMaterials={projectMaterials} allMaterials={allMaterials} loadData={loadData} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timesheet Modal */}
      <AnimatePresence>
        {activeAction === 'timesheet' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Stunden verwalten</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}><X className="w-5 h-5" /></Button>
              </div>
              <TimesheetManagement projectId={project.id} project={project} loadData={loadData} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents Modal */}
      <AnimatePresence>
        {activeAction === 'documents' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setActiveAction(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Dokumente</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}><X className="w-5 h-5" /></Button>
              </div>
              <DocumentManagement projectId={project.id} project={project} loadData={loadData} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Excavation Form */}
      <AnimatePresence>
        {showExcavationForm && (
          <ExcavationWizard
            excavation={editingExcavation}
            projects={[project]}
            defaultProjectId={project.id}
            onSubmit={handleExcavationFormSubmit}
            onCancel={() => { setShowExcavationForm(false); setEditingExcavation(null); }}
          />
        )}
      </AnimatePresence>

      {/* Pulling Form */}
      <AnimatePresence>
        {showPullingForm && (
          <PullingWorkForm
            pullingWork={editingPulling}
            project={project}
            onSubmit={handlePullingFormSubmit}
            onCancel={() => { setShowPullingForm(false); setEditingPulling(null); }}
          />
        )}
      </AnimatePresence>

      {/* Bestätigungsdialog */}
      <AnimatePresence>
        {confirmDialog.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={e => { if (e.target === e.currentTarget) handleCancelAction(); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md">
              <Card className="card-elevation border-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${confirmDialog.type === 'backfill' ? 'bg-orange-100' : 'bg-green-100'}`}>
                      {confirmDialog.type === 'backfill' ? <Package className="w-6 h-6 text-orange-600" /> : <CheckCircle className="w-6 h-6 text-green-600" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Bestätigung erforderlich</h3>
                      <p className="text-sm text-gray-600">
                        {confirmDialog.type === 'backfill' && 'Verfüllung bestätigen'}
                        {confirmDialog.type === 'asphalt_trag' && 'Asphalt Tragschicht bestätigen'}
                        {confirmDialog.type === 'asphalt_fein' && 'Asphalt Feinschicht bestätigen'}
                        {confirmDialog.type === 'platten_pflaster' && 'Platten/Pflaster bestätigen'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">⚠️ Im nächsten Schritt müssen Sie mindestens 2 Fotos hochladen.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleCancelAction} className="flex-1"><X className="w-4 h-4 mr-2" />Abbrechen</Button>
                    <Button onClick={handleConfirmAction} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"><Check className="w-4 h-4 mr-2" />Ja, weiter</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foto-Upload-Dialog */}
      <AnimatePresence>
        {photoUploadDialog.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget && !photoUploadDialog.isUploading) handleCancelPhotoUpload(); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-2xl my-8">
              <Card className="card-elevation border-none">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2"><Camera className="w-6 h-6" />Fotos hochladen</CardTitle>
                    {!photoUploadDialog.isUploading && (
                      <Button variant="ghost" size="icon" onClick={handleCancelPhotoUpload} className="text-white hover:bg-white/20"><X className="w-5 h-5" /></Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">Mindestens 2 Fotos erforderlich (max. 10)</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {photoUploadDialog.photos.map((url, index) => (
                      <div key={url + index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                        <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                        {!photoUploadDialog.isUploading && (
                          <button type="button" onClick={() => handleDeletePhoto(url)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {photoUploadDialog.isUploading && (
                      <div className="flex items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  <Input id="photo-upload-foreman" type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden"
                    disabled={photoUploadDialog.isUploading || photoUploadDialog.photos.length >= 10} />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('photo-upload-foreman').click()}
                    disabled={photoUploadDialog.isUploading || photoUploadDialog.photos.length >= 10} className="w-full mb-4">
                    <Upload className="w-4 h-4 mr-2" />
                    {photoUploadDialog.isUploading ? 'Lädt hoch...' : `Fotos auswählen (${photoUploadDialog.photos.length}/10)`}
                  </Button>
                  {photoUploadDialog.photos.length >= 2 && (
                    <p className="text-sm text-green-600 mb-4 flex items-center gap-1"><CheckCircle className="w-4 h-4" />Mindestanzahl erreicht.</p>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleCancelPhotoUpload} className="flex-1" disabled={photoUploadDialog.isUploading}><X className="w-4 h-4 mr-2" />Abbrechen</Button>
                    <Button onClick={handleConfirmPhotoUpload} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                      disabled={photoUploadDialog.photos.length < 2 || photoUploadDialog.isUploading}>
                      <Check className="w-4 h-4 mr-2" />Bestätigen & Speichern
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teilabschluss-Dialog */}
      <AnimatePresence>
        {partialClosureDialog.show && (
          <PartialClosureDialog
            excavation={partialClosureDialog.excavation}
            user={user}
            remainingMeters={partialClosureDialog.remainingMeters}
            onClose={() => setPartialClosureDialog({ show: false, excavation: null, remainingMeters: 0 })}
            onSuccess={() => { setPartialClosureDialog({ show: false, excavation: null, remainingMeters: 0 }); loadData(); }}
          />
        )}
      </AnimatePresence>

      {/* Detail-Dialog */}
      <AnimatePresence>
        {detailDialog.show && detailDialog.excavation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) setDetailDialog({ show: false, excavation: null, priceItem: null }); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-2xl my-8">
              <Card className="card-elevation border-none">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{detailDialog.excavation.location_name}</CardTitle>
                      <p className="text-sm text-white/80 mt-1">{detailDialog.priceItem?.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setDetailDialog({ show: false, excavation: null, priceItem: null })} className="text-white hover:bg-white/20"><X className="w-5 h-5" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">{detailDialog.excavation.street} {detailDialog.excavation.house_number}</p>
                    <p className="text-gray-600">{detailDialog.excavation.postal_code} {detailDialog.excavation.city}</p>
                    {detailDialog.excavation.latitude && detailDialog.excavation.longitude && (
                      <Button variant="outline" size="sm" className="mt-2 w-full"
                        onClick={() => window.open(`https://www.google.com/maps?q=${detailDialog.excavation.latitude},${detailDialog.excavation.longitude}`, '_blank')}>
                        <Navigation className="w-4 h-4 mr-2" />In Google Maps öffnen
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm bg-gray-50 rounded-lg p-4">
                    <div><p className="text-gray-600">Länge</p><p className="font-semibold">{(detailDialog.excavation.excavation_length || 0).toFixed(2)} m</p></div>
                    <div><p className="text-gray-600">Breite</p><p className="font-semibold">{(detailDialog.excavation.excavation_width || 0).toFixed(2)} m</p></div>
                    <div><p className="text-gray-600">Tiefe</p><p className="font-semibold">{(detailDialog.excavation.excavation_depth || 0).toFixed(2)} m</p></div>
                  </div>
                  {/* Photos */}
                  {[
                    { photos: detailDialog.excavation.photos_before, label: 'Vorher' },
                    { photos: detailDialog.excavation.photos_backfill, label: 'Verfüllung' },
                    { photos: detailDialog.excavation.photos_surface, label: 'Oberfläche' },
                    { photos: detailDialog.excavation.photos_after, label: 'Nachher' },
                  ].filter(g => g.photos?.length > 0).map(group => (
                    <div key={group.label}>
                      <p className="text-sm font-medium text-gray-700 mb-2">{group.label} ({group.photos.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {group.photos.map((url, index) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden">
                            <img src={url} alt={`${group.label} ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
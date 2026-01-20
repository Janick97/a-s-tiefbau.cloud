import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { Project, Excavation, PriceItem, PullingWork, ProjectMaterial, Material, TimesheetEntry, ProjectDocument, MontageAuftrag, User, MontageLeistung, MontagePreisItem } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { SendEmail } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence }
from "framer-motion";
import {
  ArrowLeft,
  Edit,
  MapPin,
  Calendar,
  Euro,
  User as UserIcon,
  Building,
  FileText,
  CheckSquare,
  AlertTriangle,
  Shovel,
  Camera,
  Plus,
  Trash2,
  Info,
  FolderPlus,
  Eye,
  CheckCircle,
  Mail,
  Copy,
  X,
  Clock,
  Package,
  ListRestart,
  Construction
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProjectForm from "../components/projects/ProjectForm";
import MaterialManagement from "../components/projects/MaterialManagement";
import TimesheetManagement from "../components/projects/TimesheetManagement";
import { Label } from "@/components/ui/label";

import ProjectStatsCard from "../components/projects/ProjectStatsCard";
import ProjectDetails from "../components/projects/ProjectDetails";
import VaoInfo from "../components/projects/VaoInfo";
import StatusInfo from "../components/projects/StatusInfo";
import ExcavationsManagement from "../components/projects/ExcavationsManagement";
import DocumentManagement from "../components/projects/DocumentManagement";
import PullingWorkManagement from "../components/projects/PullingWorkManagement";
import ProjectPrintLayout from "../components/projects/ProjectPrintLayout";
import ProjectChat from "../components/projects/ProjectChat";
import ProjectCoverSheet from "../components/projects/ProjectCoverSheet";
import ServicesOverview from "../components/projects/ServicesOverview";
import MontageAuftragSection from "../components/projects/MontageAuftragSection";
import ExcavationWizard from "../components/excavations/ExcavationWizard";
import PullingWorkForm from "../components/projects/PullingWorkForm";
import EVergabeExport from "../components/projects/EVergabeExport";
import EVergabeEditor from "../components/projects/EVergabeEditor";
import MontageLeistungenManagement from "../components/projects/MontageLeistungenManagement";
import ProjectHistory from "../components/projects/ProjectHistory";

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ProjectDetailSkeleton = () => (
  <div className="max-w-7xl mx-auto p-4 md:p-8">
    <Skeleton className="h-10 w-48 mb-6" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
      <div className="space-y-6">
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    </div>
  </div>
);

// Vereinfachte Bauleiter-Ansicht Komponente
function ForemanProjectView({ 
  project, 
  excavations, 
  pullingWorks, 
  projectMaterials, 
  timesheets,
  documents,
  priceItems, // Added for ExcavationForm
  allMaterials, // Added for MaterialManagement
  onExcavationSubmit,
  onExcavationDelete,
  loadData,
  user
}) {
  const [activeAction, setActiveAction] = useState(null);
  const [showExcavationForm, setShowExcavationForm] = useState(false);
  const [editingExcavation, setEditingExcavation] = useState(null);
  const [showPullingForm, setShowPullingForm] = useState(false);
  const [editingPulling, setEditingPulling] = useState(null);

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

  const totalRevenue = excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pb-20">
      {/* Kompakter Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Link to={createPageUrl("MyProjects")}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{project.project_number}</h1>
              <p className="text-xs text-gray-600 truncate">{project.title}</p>
            </div>
          </div>
          
          {/* Kompakte Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {user?.position !== 'Bauleiter' && (
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xs text-gray-600">Umsatz</p>
                <p className="text-sm font-bold text-green-700">€{Math.round(totalRevenue).toLocaleString('de-DE')}</p>
              </div>
            )}
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Leistungen</p>
              <p className="text-sm font-bold text-blue-700">{excavations.length}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Stadt</p>
              <p className="text-sm font-bold text-orange-700 truncate">{project.city || '-'}</p>
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
          className="w-full h-16 text-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
          size="lg"
        >
          <Shovel className="w-6 h-6 mr-3" />
          Leistung erfassen
        </Button>

        <Button
          onClick={() => {
            setEditingPulling(null);
            setShowPullingForm(true);
            setActiveAction('pulling');
          }}
          className="w-full h-16 text-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          size="lg"
        >
          <ListRestart className="w-6 h-6 mr-3" />
          Einziehen erfassen
        </Button>

        <Button
          onClick={() => setActiveAction('material')}
          className="w-full h-16 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          size="lg"
        >
          <Package className="w-6 h-6 mr-3" />
          Material hinzufügen
        </Button>

        <Button
          onClick={() => setActiveAction('timesheet')}
          className="w-full h-16 text-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          size="lg"
        >
          <Clock className="w-6 h-6 mr-3" />
          Stunden erfassen
        </Button>

        <Button
          onClick={() => setActiveAction('documents')}
          variant="outline"
          className="w-full h-14 text-base border-2"
          size="lg"
        >
          <FileText className="w-5 h-5 mr-2" />
          Dokumente ({documents.length})
        </Button>
      </div>

      {/* Chat-Bereich */}
      <div className="h-[400px] mx-3 mb-3">
        <ProjectChat projectId={project.id} />
      </div>

      {/* Übersichten - Kompakt */}
      <div className="p-3 space-y-3">
        {/* Leistungen Übersicht */}
        {excavations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shovel className="w-4 h-4" />
                  Leistungen ({excavations.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {excavations.slice(0, 3).map((exc) => (
                <div
                  key={exc.id}
                  onClick={() => {
                    setEditingExcavation(exc);
                    setShowExcavationForm(true);
                  }}
                  className="p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm text-gray-900 truncate flex-1">{exc.location_name}</p>
                    {user?.position !== 'Bauleiter' && (
                      <p className="text-sm font-bold text-green-700 ml-2">
                        €{Math.round(exc.calculated_price || 0).toLocaleString('de-DE')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 truncate">{exc.street}, {exc.city}</p>
                </div>
              ))}
              {excavations.length > 3 && (
                <Button variant="ghost" className="w-full text-sm" onClick={() => setActiveAction('excavationsList')}>
                  +{excavations.length - 3} weitere anzeigen
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Einziehen Übersicht */}
        {pullingWorks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ListRestart className="w-4 h-4" />
                Einziehen ({pullingWorks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pullingWorks.slice(0, 3).map((pw) => (
                <div
                  key={pw.id}
                  onClick={() => {
                    setEditingPulling(pw);
                    setShowPullingForm(true);
                  }}
                  className="p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
                >
                  <p className="font-medium text-sm text-gray-900 truncate">{pw.location_name}</p>
                  <p className="text-xs text-gray-600 truncate">{pw.work_description}</p>
                </div>
              ))}
              {pullingWorks.length > 3 && (
                <Button variant="ghost" className="w-full text-sm" onClick={() => setActiveAction('pullingList')}>
                  +{pullingWorks.length - 3} weitere anzeigen
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Material Übersicht */}
        {projectMaterials.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Material ({projectMaterials.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectMaterials.slice(0, 3).map((pm) => {
                const material = allMaterials.find(m => m.id === pm.material_id);
                return material ? (
                  <div key={pm.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{material.name}</p>
                      <p className="text-xs text-gray-600">{material.article_number}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 ml-2">{pm.quantity} {material.unit}</p>
                  </div>
                ) : null;
              })}
              {projectMaterials.length > 3 && (
                <Button variant="ghost" className="w-full text-sm" onClick={() => setActiveAction('material')}>
                  +{projectMaterials.length - 3} weitere anzeigen
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stunden Übersicht */}
        {timesheets.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Stunden ({timesheets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {timesheets.slice(0, 3).map((ts) => (
                <div key={ts.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{ts.employee_name}</p>
                    <p className="text-xs text-gray-600 truncate">{ts.work_description}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 ml-2">{ts.hours}h</p>
                </div>
              ))}
              {timesheets.length > 3 && (
                <Button variant="ghost" className="w-full text-sm" onClick={() => setActiveAction('timesheet')}>
                  +{timesheets.length - 3} weitere anzeigen
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
            projects={[project]} // Pass current project for context
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
            project={project} // Pass current project for context
            onSubmit={handlePullingFormSubmit}
            onCancel={() => {
              setShowPullingForm(false);
              setEditingPulling(null);
              setActiveAction(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Excavations List Modal (if more than 3) */}
      <AnimatePresence>
        {activeAction === 'excavationsList' && (
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
                <h3 className="text-lg font-bold">Alle Leistungen</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4">
                <ExcavationsManagement
                  excavations={excavations}
                  priceItems={priceItems}
                  projectId={project.id}
                  onExcavationSubmit={onExcavationSubmit}
                  onExcavationDelete={onExcavationDelete}
                  loadData={loadData}
                  project={project}
                  showAddButton={true} // Allow adding from this list
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulling List Modal (if more than 3) */}
      <AnimatePresence>
        {activeAction === 'pullingList' && (
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
                <h3 className="text-lg font-bold">Alle Einzieharbeiten</h3>
                <Button variant="ghost" size="icon" onClick={() => setActiveAction(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4">
                <PullingWorkManagement
                  projectId={project.id}
                  loadData={loadData}
                  initialPullingWorks={pullingWorks} // Pass current pulling works
                />
              </div>
            </motion.div>
          </motion.div>
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
                allMaterials={allMaterials}
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
    </div>
  );
}

export default function ProjectDetailPage() {
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [vaoSourceProject, setVaoSourceProject] = useState(null);
  const [excavations, setExcavations] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [pullingWorks, setPullingWorks] = useState([]);
  const [projectMaterials, setProjectMaterials] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [followUpProjects, setFollowUpProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [parentForNewProject, setParentForNewProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [montageAuftrag, setMontageAuftrag] = useState(null);
  const [monteure, setMonteure] = useState([]);
  const [user, setUser] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingServicesOverview, setIsExportingServicesOverview] = useState(false);
  const [isExportingEVergabe, setIsExportingEVergabe] = useState(false);
  const [montageLeistungen, setMontageLeistungen] = useState([]);
  const [montagePreisItems, setMontagePreisItems] = useState([]);
  const [showMontageConfirmModal, setShowMontageConfirmModal] = useState(false);
  const [currentProjectForCoverSheet, setCurrentProjectForCoverSheet] = useState(null);

  const coverSheetRef = useRef(null);
  const servicesOverviewRef = useRef(null);
  const evergabeRef = useRef(null);

  const projectId = new URLSearchParams(location.search).get("id");
  const tabParam = new URLSearchParams(location.search).get("tab");

  // Bauakten filtern
  const bauakten = React.useMemo(() => {
    return documents.filter(doc => doc.folder === 'Bauakte');
  }, [documents]);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.log("Benutzer nicht angemeldet oder Fehler beim Laden:", error);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const loadProjectData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setVaoSourceProject(null);
    setMontageAuftrag(null);
    setMonteure([]);
    try {
      const projectData = await Project.get(projectId);
      if (!projectData) {
        throw new Error("Projekt nicht gefunden.");
      }
      setProject(projectData);

      // Setze initialen "aktuellen" Auftrag für Deckblatt (standardmäßig das aktuelle Projekt)
      if (!currentProjectForCoverSheet) {
        setCurrentProjectForCoverSheet(projectData.id);
      }

      if (tabParam && ['overview', 'excavations', 'pulling', 'materials', 'timesheets', 'documents'].includes(tabParam)) {
        setActiveTab(tabParam);
      }

      if (projectData.vao_source_project_id) {
          const sourceProject = await Project.get(projectData.vao_source_project_id);
          setVaoSourceProject(sourceProject);
      }

      if (projectData.montage_auftrag_id) {
        try {
          const projectMontage = await MontageAuftrag.get(projectData.montage_auftrag_id);
          setMontageAuftrag(projectMontage || null);
        } catch (error) {
          console.error("Fehler beim Laden des Montageauftrags:", error);
          setMontageAuftrag(null);
        }
      }

      try {
        const users = await User.list();
        const monteureList = users.filter(u => u.position === 'Monteur');
        setMonteure(monteureList);
      } catch (error) {
        console.error("Fehler beim Laden der Monteure:", error);
        setMonteure([]);
      }

      let relatedProjectIds = [projectId];
      let followUps = [];
      
      const isMainProject = !projectData.parent_project_id;

      if (isMainProject) {
        followUps = await Project.filter({ parent_project_id: projectId }).catch(() => []);
        setFollowUpProjects(Array.isArray(followUps) ? followUps : []);
        relatedProjectIds = [projectId, ...followUps.map(f => f.id)];
      } else {
        setFollowUpProjects([]);
        relatedProjectIds = [projectId];
      }

      const [
        excavationsData, priceItemsData, pullingWorksData,
        projectMaterialsData, materialsData, timesheetsData, documentsData,
        montageLeistungenData, montagePreisItemsData
      ] = await Promise.all([
        Promise.all(relatedProjectIds.map(id => 
          Excavation.filter({ project_id: id }).catch(() => [])
        )).then(results => results.flat()),
        PriceItem.list().catch(() => []),
        Promise.all(relatedProjectIds.map(id => 
          PullingWork.filter({ project_id: id }).catch(() => [])
        )).then(results => results.flat()),
        Promise.all(relatedProjectIds.map(id => 
          ProjectMaterial.filter({ project_id: id }).catch(() => [])
        )).then(results => results.flat()),
        Material.list().catch(() => []),
        Promise.all(relatedProjectIds.map(id => 
          TimesheetEntry.filter({ project_id: id }).catch(() => [])
        )).then(results => results.flat()),
        Promise.all(relatedProjectIds.map(id => 
          ProjectDocument.filter({ project_id: id }).catch(() => [])
        )).then(results => results.flat()),
        montageAuftrag ? MontageLeistung.filter({ montage_auftrag_id: montageAuftrag.id }).catch(() => []) : Promise.resolve([]),
        MontagePreisItem.list().catch(() => [])
      ]);

      // Sortiere Ausgrabungen nach Erstellungsdatum (älteste zuerst)
      const sortedExcavations = Array.isArray(excavationsData) 
        ? excavationsData.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
        : [];
      
      setExcavations(sortedExcavations);
      setPriceItems(Array.isArray(priceItemsData) ? priceItemsData : []);
      setPullingWorks(Array.isArray(pullingWorksData) ? pullingWorksData : []);
      setProjectMaterials(Array.isArray(projectMaterialsData) ? projectMaterialsData : []);
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
      setMontageLeistungen(Array.isArray(montageLeistungenData) ? montageLeistungenData : []);
      setMontagePreisItems(Array.isArray(montagePreisItemsData) ? montagePreisItemsData : []);

    } catch (err) {
      console.error("Fehler beim Laden der Projektdetails:", err);
      setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
      setProject(null);
    }
    setIsLoading(false);
  }, [projectId, tabParam]);

  useEffect(() => {
    if (!projectId) {
      setError("Keine Projekt-ID in der URL gefunden.");
      setIsLoading(false);
      return;
    }
    loadProjectData();
  }, [projectId, loadProjectData]);

  // Scroll to top when component mounts or projectId changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [projectId]);

  const handleExcavationSubmit = async (excavationData, excavationId = null) => {
    try {
      const dataWithProject = { ...excavationData, project_id: excavationData.project_id || projectId };
      if (excavationId) {
        await Excavation.update(excavationId, dataWithProject);
      } else {
        await Excavation.create(dataWithProject);
      }
      loadProjectData();
    } catch (error) {
      console.error("Fehler beim Speichern der Ausgrabung:", error);
    }
  };

  const handleExcavationDelete = async (excavationId) => {
    if (window.confirm("Sind Sie sicher, dass Sie diese Position löschen möchten?")) {
      try {
        await Excavation.delete(excavationId);
        loadProjectData();
      } catch (error) {
            console.error("Fehler beim Löschen:", error);
      }
    }
  };

  const handleShowEditForm = () => {
    setEditingProject(project);
    setParentForNewProject(null);
    setShowProjectForm(true);
  };
  
  const handleShowFollowUpForm = () => {
    setEditingProject(null);
    setParentForNewProject(project);
    setShowProjectForm(true);
  };

  const generateEmailContent = () => {
    if (!project) return { subject: '', body: '' };

    const subject = `Montage erledigt - Tiefbau kann geschlossen werden - ${project.project_number}`;

    const body = `Sehr geehrte Damen und Herren,

  hiermit teilen wir Ihnen mit, dass die Montagearbeiten abgeschlossen wurden und der Tiefbau ab sofort geschlossen werden kann:

  Projektnummer: ${project.project_number}
  SM-Nummer: ${project.sm_number || 'Nicht angegeben'}
  Projekttitel: ${project.title}
  Standort: ${project.street ? `${project.street}, ` : ''}${project.city || 'Nicht angegeben'}

  Status: Montage erledigt - Tiefbau kann geschlossen werden

  Mit freundlichen Grüßen
  A&S Tief- u. Straßenbau GmbH`;

    return { subject, body };
  };

  const handleSendCompletionEmail = () => {
    setShowEmailModal(true);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${type} wurde in die Zwischenablage kopiert!`);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      alert('Fehler beim Kopieren. Bitte manuell markieren und kopieren.');
    }
  };

  const handleExportServicesOverviewPdf = async () => {
    if (!servicesOverviewRef.current) {
      alert("Fehler: Leistungsübersicht-Komponente konnte nicht gefunden werden.");
      return;
    }

    setIsExportingServicesOverview(true);

    try {
      const originalPosition = servicesOverviewRef.current.style.position;
      const originalLeft = servicesOverviewRef.current.style.left;
      const originalWidth = servicesOverviewRef.current.style.width;
      
      servicesOverviewRef.current.style.position = 'fixed';
      servicesOverviewRef.current.style.left = '0';
      servicesOverviewRef.current.style.top = '0';
      servicesOverviewRef.current.style.zIndex = '9999';
      servicesOverviewRef.current.style.width = '1400px';
      
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(servicesOverviewRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        foreignObjectRendering: false,
        imageTimeout: 0,
        removeContainer: true,
      });

      servicesOverviewRef.current.style.position = originalPosition;
      servicesOverviewRef.current.style.left = originalLeft;
      servicesOverviewRef.current.style.top = '';
      servicesOverviewRef.current.style.zIndex = '';
      servicesOverviewRef.current.style.width = originalWidth;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('l', 'mm', 'a4');

      const imgWidth = 297;
      const pageHeight = 210;
      const imgHeight = canvas.height * imgWidth / canvas.width;
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

      pdf.save(`Leistungsuebersicht_${project.project_number}.pdf`);

    } catch (error) {
      console.error("Fehler beim Erstellen des Leistungsübersicht-PDFs:", error);
      alert("Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.");
      
      if (servicesOverviewRef.current) {
        servicesOverviewRef.current.style.position = 'absolute';
        servicesOverviewRef.current.style.left = '-9999px';
        servicesOverviewRef.current.style.width = '';
      }
    } finally {
      setIsExportingServicesOverview(false);
    }
  };

  const handleExportCoverSheetPdf = async () => {
    if (!coverSheetRef.current) {
      console.error("Deckblatt-Komponente nicht für den PDF-Export gefunden.");
      alert("Fehler: Deckblatt-Komponente konnte nicht gefunden werden.");
      return;
    }

    setIsExportingPdf(true);

    try {
      // Element temporär sichtbar machen mit optimaler Größe
      const element = coverSheetRef.current;
      const originalStyles = {
        position: element.style.position,
        left: element.style.left,
        top: element.style.top,
        zIndex: element.style.zIndex,
        width: element.style.width,
        visibility: element.style.visibility,
        overflow: element.style.overflow
      };

      // Element für Rendering vorbereiten - A4 Landscape optimiert
      element.style.position = 'fixed';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '9999';
      element.style.width = '297mm'; // A4 Landscape Breite
      element.style.visibility = 'visible';
      element.style.overflow = 'visible';

      // Warten auf vollständiges Rendering
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Alle Bilder laden lassen
      const images = element.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 2500);
          });
        })
      );

      const canvas = await html2canvas(element, {
        scale: 4, // Höchste Qualität
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.body.querySelector('[style*="position: fixed"]');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.overflow = 'visible';
          }
        }
      });

      // Originale Styles wiederherstellen
      Object.keys(originalStyles).forEach(key => {
        element.style[key] = originalStyles[key];
      });

      // PNG verwenden für verlustfreie Qualität
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('l', 'mm', 'a4');

      const pdfWidth = 297; // A4 landscape width
      const pdfHeight = 210; // A4 landscape height
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Erste Seite
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Weitere Seiten bei Bedarf
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`Deckblatt_${project.project_number}.pdf`);

    } catch (error) {
      console.error("Fehler beim Erstellen des Deckblatt-PDFs:", error);
      alert("Fehler beim Erstellen des Deckblatt-PDFs. Bitte versuchen Sie es erneut.");

      // Element wieder verstecken bei Fehler
      if (coverSheetRef.current) {
        coverSheetRef.current.style.position = 'absolute';
        coverSheetRef.current.style.left = '-9999px';
        coverSheetRef.current.style.visibility = 'hidden';
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportEVergabePdf = async () => {
    if (!evergabeRef.current) {
      alert("Fehler: E-Vergabe-Komponente konnte nicht gefunden werden.");
      return;
    }

    setIsExportingEVergabe(true);

    try {
      // Position auf dem Bildschirm anzeigen für Rendering
      const originalPosition = evergabeRef.current.style.position;
      const originalLeft = evergabeRef.current.style.left;

      evergabeRef.current.style.position = 'fixed';
      evergabeRef.current.style.left = '0';
      evergabeRef.current.style.top = '0';
      evergabeRef.current.style.zIndex = '9999';

      await new Promise(resolve => setTimeout(resolve, 500));

      // Finde alle Positionen einzeln
      const positions = evergabeRef.current.querySelectorAll('.evergabe-position');
      const header = evergabeRef.current.querySelector('.evergabe-header');

      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;

      // Render Header
      if (header) {
        const headerCanvas = await html2canvas(header, {
          scale: 1.5,
          backgroundColor: '#ffffff',
          logging: false,
        });
        const headerImg = headerCanvas.toDataURL('image/jpeg', 0.9);
        const headerHeight = (headerCanvas.height * 190) / headerCanvas.width;
        pdf.addImage(headerImg, 'JPEG', 10, 10, 190, headerHeight);
      }

      // Render jede Position einzeln
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];

        if (!isFirstPage) {
          pdf.addPage();
        }

        const canvas = await html2canvas(position, {
          scale: 1.2,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Wenn zu hoch, auf mehrere Seiten verteilen
        if (imgHeight > 250) {
          let yOffset = 0;
          const maxHeight = 250;

          while (yOffset < imgHeight) {
            if (yOffset > 0) {
              pdf.addPage();
            } else if (!isFirstPage) {
              // Bereits neue Seite oben hinzugefügt
            }

            pdf.addImage(imgData, 'JPEG', 10, 20 - yOffset, imgWidth, imgHeight);
            yOffset += maxHeight;

            if (yOffset < imgHeight) {
              isFirstPage = false;
            }
          }
        } else {
          pdf.addImage(imgData, 'JPEG', 10, 20, imgWidth, imgHeight);
        }

        isFirstPage = false;

        // Kleine Pause zwischen den Renderings
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wiederherstellen
      evergabeRef.current.style.position = originalPosition;
      evergabeRef.current.style.left = originalLeft;

      pdf.save(`EVergabe_${project.project_number}.pdf`);

    } catch (error) {
      console.error("Fehler beim Erstellen des E-Vergabe-PDFs:", error);
      alert(`Fehler beim Erstellen des E-Vergabe-PDFs: ${error.message}`);
    } finally {
      setIsExportingEVergabe(false);
    }
  };

  const handleCreateMontageAuftrag = async () => {
    if (!project) {
      alert("Projektdaten nicht geladen!");
      console.error("Fehler: Projektdaten sind null, Montageauftrag kann nicht erstellt werden.");
      return;
    }

    if (project.montage_auftrag_id) {
      alert("Für dieses Projekt existiert bereits ein Montageauftrag!");
      console.warn(`Montageauftrag bereits vorhanden für Projekt ${project.id}. ID: ${project.montage_auftrag_id}`);
      return;
    }

    // Öffne Bestätigungsmodal
    setShowMontageConfirmModal(true);
  };

  const confirmCreateMontageAuftrag = async () => {
    setShowMontageConfirmModal(false);
    console.log("Starte Montageauftrag-Erstellung für Projekt:", project);

    try {
      const montageAuftragData = {
        project_id: project.id,
        project_number: project.project_number || '',
        sm_number: project.sm_number || '',
        title: project.title || '',
        client: project.client || '',
        street: project.street || '',
        city: project.city || '',
        order_type: project.order_type || '',
        status: "Auftrag neu",
        created_from_project: true,
        notes: ""
      };

      console.log("Montageauftrag-Daten vorbereitet:", montageAuftragData);
      const montageAuftrag = await MontageAuftrag.create(montageAuftragData);
      console.log("Montageauftrag erfolgreich erstellt:", montageAuftrag);

      if (montageAuftrag && montageAuftrag.id) {
        await Project.update(project.id, {
          has_montage: true,
          montage_auftrag_id: montageAuftrag.id
        });
        console.log("Projekt erfolgreich aktualisiert mit montage_auftrag_id:", montageAuftrag.id);

        alert("Montageauftrag wurde erfolgreich erstellt!");
        await loadProjectData();
      } else {
        throw new Error("Montageauftrag wurde nicht korrekt erstellt (keine ID in der Antwort).");
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Montageauftrags:", error);
      alert(`Fehler beim Erstellen des Montageauftrags: ${error.message || "Unbekannter Fehler"}`);
    }
  };

  const handleAssignMonteur = async (monteure) => {
    if (!montageAuftrag) return;

    try {
      await MontageAuftrag.update(montageAuftrag.id, {
        assigned_monteure: monteure
      });

      alert("Monteure wurden erfolgreich zugewiesen!");
      await loadProjectData();
    } catch (error) {
      console.error("Fehler beim Zuweisen der Monteure:", error);
      alert(`Fehler: ${error.message}`);
    }
  };

  const emailContent = generateEmailContent();

  if (isLoading) return <ProjectDetailSkeleton />;

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">{error || "Projekt nicht gefunden"}</h2>
          <p className="text-gray-600 mb-6">Das angeforderte Projekt konnte nicht geladen werden.</p>
          <Link to={createPageUrl("Projects")}>
            <Button>Zurück zur Übersicht</Button>
          </Link>
        </div>
      </div>
    );
  }

  // BAULEITER-ANSICHT: Vereinfachte Mobile-First View
  if (user && user.position === 'Bauleiter') {
    return (
      <>
        <ForemanProjectView
          project={project}
          excavations={excavations}
          pullingWorks={pullingWorks}
          projectMaterials={projectMaterials}
          timesheets={timesheets}
          documents={documents}
          priceItems={priceItems}
          allMaterials={materials}
          onExcavationSubmit={handleExcavationSubmit}
          onExcavationDelete={handleExcavationDelete}
          loadData={loadProjectData}
          user={user}
        />

        {/* Project Cover Sheet (hidden, für PDF export) - Nur für Admin, nicht Bauleiter-Ansicht*/}
        <div className="hidden" ref={coverSheetRef}>
          <ProjectCoverSheet
            project={project}
            excavations={excavations}
            materials={materials}
            timesheets={timesheets}
            documents={documents}
            priceItems={priceItems}
          />
        </div>

        {/* Services Overview (hidden, für PDF export) */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }} ref={servicesOverviewRef}>
          <ServicesOverview
            project={project}
            excavations={excavations}
            priceItems={priceItems}
            allProjects={[project, ...followUpProjects]}
          />
        </div>
      </>
    );
  }

  // ADMIN/BÜRO-ANSICHT: Vollständige Desktop-Ansicht
  const TABS = [
    { id: 'overview', name: 'Übersicht' },
    { id: 'deckblatt', name: 'Deckblatt' },
    { id: 'evergabe', name: 'E-Vergabe' },
    { id: 'excavations', name: `Leistungen (${excavations.length})` },
    { id: 'pulling', name: 'Einziehen' },
    { id: 'materials', name: 'Material' },
    { id: 'timesheets', name: 'Stunden' },
    { id: 'montage', name: 'Montageleistungen' },
    { id: 'documents', name: 'Dokumente' },
    { id: 'history', name: 'Historie' },
  ];

  const isMainProject = !project.parent_project_id;

  const groupDataByProject = (dataArray, currentProject, allFollowUpProjects) => {
    const grouped = {};
    
    grouped[currentProject.id] = {
      project: currentProject,
      data: dataArray.filter(item => item.project_id === currentProject.id)
    };
    
    if (isMainProject) {
      allFollowUpProjects.forEach(followUp => {
        const followUpData = dataArray.filter(item => item.project_id === followUp.id);
        if (followUpData.length > 0) {
          grouped[followUp.id] = {
            project: followUp,
            data: followUpData
          };
        }
      });
    }
    
    return grouped;
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-2 sm:p-4 lg:p-8">
        <div className="max-w-full mx-auto overflow-hidden">
          
          {/* Mobile Header - Kompakter */}
          <div className="block xl:hidden mb-3">
            <div className="flex items-start gap-2 mb-2">
              <Link to={createPageUrl("Projects")}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <h1 className="text-sm font-bold text-gray-900 truncate">
                    {project.project_number}
                  </h1>
                  {!!project.parent_project_id && <Badge variant="outline" className="text-xs flex-shrink-0">Folge</Badge>}
                  {project.has_montage && <Badge className="bg-blue-100 text-blue-800 text-xs flex-shrink-0">Montage</Badge>}
                </div>
                <p className="text-xs text-gray-600 truncate">{project.title}</p>
              </div>
            </div>
            
            {/* Mobile Action Buttons - Kompakter */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSendCompletionEmail}
                className="no-print h-7 px-2 text-xs whitespace-nowrap flex-shrink-0"
                title="Kann zu verschicken"
              >
                <Mail className="w-3 h-3 mr-1" />
                Kann zu
              </Button>

              <Button variant="ghost" size="sm" onClick={handleExportCoverSheetPdf} className="no-print h-7 px-2 text-xs whitespace-nowrap flex-shrink-0">
                <FileText className="w-3 h-3 mr-1" />
                PDF
              </Button>

              <Button variant="ghost" size="sm" onClick={handleShowEditForm} className="no-print h-7 px-2 text-xs whitespace-nowrap flex-shrink-0">
                <Edit className="w-3 h-3 mr-1" />
                Bearb.
              </Button>
              {isMainProject && (
                <Button variant="ghost" size="sm" onClick={handleShowFollowUpForm} className="no-print h-7 px-2 text-xs whitespace-nowrap flex-shrink-0">
                  <FolderPlus className="w-3 h-3 mr-1" />
                  Folge
                </Button>
              )}
              {!project.montage_auftrag_id && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCreateMontageAuftrag}
                    className="no-print h-7 px-2 text-xs whitespace-nowrap flex-shrink-0 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Montage
                  </Button>
                )}
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden xl:block">
            <div className="flex justify-between items-center mb-6 no-print">
              <div className="flex items-center gap-4">
                <Link to={createPageUrl("Projects")}>
                  <Button variant="outline" size="icon">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{project.project_number} - {project.title}</h1>
                    {!!project.parent_project_id && <Badge variant="outline">Folgeauftrag</Badge>}
                    {project.has_montage && <Badge className="bg-blue-100 text-blue-800">Mit Montage</Badge>}
                  </div>
                  <p className="text-gray-600">
                    {isMainProject && followUpProjects.length > 0 
                      ? `Hauptprojekt mit ${followUpProjects.length} Folgeauftrag${followUpProjects.length === 1 ? '' : 'en'}`
                      : 'Projektdetails und -verwaltung'
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={handleSendCompletionEmail}
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Kann zu verschicken
                </Button>

                <Button variant="outline" onClick={handleExportServicesOverviewPdf} className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100">
                  <FileText className="w-4 h-4 mr-2" />
                  Leistungsübersicht Export
                </Button>
                <Button variant="outline" onClick={handleExportCoverSheetPdf}>
                  <FileText className="w-4 h-4 mr-2" />
                  Deckblatt Export
                </Button>

                {!project.montage_auftrag_id && (
                  <Button 
                    variant="outline" 
                    onClick={handleCreateMontageAuftrag}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Montageauftrag erstellen
                  </Button>
                )}
                {isMainProject && (
                  <Button variant="outline" onClick={handleShowFollowUpForm}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Folgeauftrag
                  </Button>
                )}
                <Button onClick={handleShowEditForm}>
                  <Edit className="w-4 h-4 mr-2" />
                  Bearbeiten
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile: Kompakte Projekt-Info */}
          <div className="xl:hidden mb-3">
            <Card className="card-elevation border-none">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-gray-500 mb-0.5">SM-Nr</p>
                    <p className="font-medium truncate text-xs">{project.sm_number}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 mb-0.5">Status</p>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 truncate max-w-full">
                      {project.project_status}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 mb-0.5">Kunde</p>
                    <p className="font-medium truncate text-xs">{project.client}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 mb-0.5">Stadt</p>
                    <p className="font-medium truncate text-xs">{project.city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: Kompakte Stats */}
          <div className="xl:hidden mb-3">
            <Card className="card-elevation border-none">
              <CardContent className="p-3">
                <div className="flex justify-between items-center text-xs">
                  {user?.position !== 'Bauleiter' && (
                    <>
                      <div className="text-center flex-1">
                        <p className="text-gray-500 mb-0.5 text-[10px]">Umsatz</p>
                        <p className="text-sm font-bold text-green-600 truncate">
                          €{excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0).toLocaleString('de-DE')}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-gray-200 mx-2"></div>
                    </>
                  )}
                  <div className="text-center flex-1">
                    <p className="text-gray-500 mb-0.5 text-[10px]">Leistungen</p>
                    <p className="text-sm font-bold text-orange-600">{excavations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation - Mobile optimiert */}
          <div className="mt-3">
            <div className="card-elevation bg-white rounded-lg p-1 no-print mb-3 overflow-hidden">
              {/* Mobile Tab Navigation */}
              <div className="xl:hidden flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map(tab => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "secondary" : "ghost"}
                    onClick={() => setActiveTab(tab.id)}
                    className="whitespace-nowrap text-[11px] px-2 py-1.5 h-auto min-w-fit flex-shrink-0"
                  >
                    {tab.name}
                  </Button>
                ))}
              </div>
              
              {/* Desktop Tab Navigation */}
              <div className="hidden xl:flex gap-2">
                {TABS.map(tab => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "secondary" : "ghost"}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1"
                  >
                    {tab.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tab Content - Mobile optimiert */}
            <div className="card-elevation bg-white rounded-lg overflow-hidden">
              {activeTab === 'overview' && (
                <div className="p-2 sm:p-4 lg:p-6">
                  {/* Mobile: Gestacktes Layout */}
                  <div className="block xl:hidden space-y-3">
                    <ProjectStatsCard project={project} excavations={excavations} totalRevenue={excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0)} />
                    <ProjectDetails project={project} />
                    <MontageAuftragSection
                      project={project}
                      montageAuftrag={montageAuftrag}
                      monteure={monteure}
                      onCreateMontageAuftrag={handleCreateMontageAuftrag}
                      onAssignMonteur={handleAssignMonteur}
                    />
                    <VaoInfo project={project} vaoSourceProject={vaoSourceProject} />
                    <StatusInfo project={project} />
                    
                    {/* Beschreibung */}
                    <Card className="card-elevation border-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Beschreibung</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                          {project.description || "Keine Beschreibung vorhanden."}
                        </p>
                      </CardContent>
                    </Card>
                    
                    {/* Chat */}
                    <div className="h-[400px]">
                      <ProjectChat projectId={project.id} />
                    </div>
                  </div>

                  {/* Desktop: Original Layout */}
                  <div className="hidden xl:block">
                    <div className="space-y-6">
                      {/* Oberer Bereich - Projektdetails */}
                      <ProjectDetails project={project} />

                      {/* Zweite Reihe - VAO, Status, Montage */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
                        <div className="flex">
                          <VaoInfo project={project} vaoSourceProject={vaoSourceProject} />
                        </div>
                        <div className="flex">
                          <StatusInfo project={project} />
                        </div>
                        <div className="flex">
                          <MontageAuftragSection
                            project={project}
                            montageAuftrag={montageAuftrag}
                            monteure={monteure}
                            onCreateMontageAuftrag={handleCreateMontageAuftrag}
                            onAssignMonteur={handleAssignMonteur}
                          />
                        </div>
                      </div>

                      {/* Chat - volle Breite unten */}
                      <div className="h-[500px]">
                        <ProjectChat projectId={project.id} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'deckblatt' && (
                <div className="p-2 sm:p-4 lg:p-6">
                  <ProjectCoverSheet
                    project={project}
                    excavations={excavations}
                    materials={materials}
                    timesheets={timesheets}
                    documents={documents}
                    priceItems={priceItems}
                    allProjects={[project, ...followUpProjects]}
                  />
                </div>
              )}

              {activeTab === 'evergabe' && (
                <div className="p-2 sm:p-4 lg:p-6">
                  <EVergabeEditor
                    project={project}
                    excavations={excavations}
                    priceItems={priceItems}
                    montageLeistungen={montageLeistungen}
                    montagePreisItems={montagePreisItems}
                    allProjects={[project, ...followUpProjects]}
                    documents={documents}
                  />
                </div>
              )}
              
              {activeTab === 'excavations' && (
                <div className="p-2 sm:p-4 lg:p-6 overflow-hidden">
                  {isMainProject && followUpProjects.length > 0 ? (
                    <div className="space-y-6 md:space-y-8">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg md:text-xl font-bold">Alle Leistungen ({excavations.length})</h3>
                      </div>
                      
                      {Object.entries(groupDataByProject(excavations, project, followUpProjects)).map(([currentSubProjectId, group]) => (
                        <div key={currentSubProjectId} className="space-y-4">
                          <div className="border-l-4 border-orange-400 pl-4 mb-4">
                            <h4 className="text-base md:text-lg font-semibold text-gray-900">
                              {group.project.project_number} - {group.project.title}
                              {currentSubProjectId !== project.id && <Badge variant="outline" className="ml-2">Folgeauftrag</Badge>}
                            </h4>
                            <p className="text-sm text-gray-600">{group.data.length} Leistung(en)</p>
                          </div>
                          
                          <ExcavationsManagement
                            excavations={group.data}
                            priceItems={priceItems}
                            projectId={group.project.id}
                            onExcavationSubmit={handleExcavationSubmit}
                            onExcavationDelete={handleExcavationDelete}
                            loadData={loadProjectData}
                            project={group.project}
                            showAddButton={currentSubProjectId === project.id}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ExcavationsManagement
                      excavations={excavations}
                      priceItems={priceItems}
                      projectId={projectId}
                      onExcavationSubmit={handleExcavationSubmit}
                      onExcavationDelete={handleExcavationDelete}
                      loadData={loadProjectData}
                      project={project}
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'pulling' && (
                <div className="p-2 sm:p-4 lg:p-6 overflow-hidden">
                  <PullingWorkManagement projectId={project.id} loadData={loadProjectData} initialPullingWorks={pullingWorks} />
                </div>
              )}
              
              {activeTab === 'materials' && (
                <div className="p-2 sm:p-4 lg:p-6 overflow-hidden">
                  <MaterialManagement
                    project={project}
                    projectMaterials={projectMaterials}
                    allMaterials={materials}
                    loadData={loadProjectData}
                  />
                </div>
              )}
              
              {activeTab === 'timesheets' && (
                <div className="p-2 sm:p-4 lg:p-6 overflow-hidden">
                  <TimesheetManagement
                    projectId={project.id}
                    project={project}
                    loadData={loadProjectData}
                  />
                </div>
              )}
              
              {activeTab === 'montage' && (
                <div className="p-2 sm:p-4 lg:p-6 overflow-hidden">
                  {montageAuftrag ? (
                    <MontageLeistungenManagement montageAuftragId={montageAuftrag.id} />
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-gray-500 mb-4">Für dieses Projekt existiert noch kein Montageauftrag.</p>
                      <Button onClick={handleCreateMontageAuftrag} className="bg-blue-600 hover:bg-blue-700">
                        Montageauftrag erstellen
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'documents' && (
                <div className="p-2 sm:p-4 lg:p-6 overflow-hidden">
                  <DocumentManagement
                    projectId={project.id}
                    project={project}
                    loadData={loadProjectData}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="p-2 sm:p-4 lg:p-6">
                  <ProjectHistory projectId={project.id} />
                </div>
              )}
              </div>
              </div>

          {/* Bauakten - Mobile optimiert */}
          {bauakten.length > 0 && (
            <div className="mb-4 mt-4 no-print">
              <Card className="card-elevation border-none border-l-4 border-blue-500">
                <CardHeader className="pb-2 px-3 py-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    Bauakten ({bauakten.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-2">
                    {bauakten.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-xs">
                            {doc.file_name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {new Date(doc.created_date).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Follow-up projects - Mobile optimiert */}
          {isMainProject && followUpProjects.length > 0 && (
            <div className="mb-4 mt-4 no-print">
              <Card className="card-elevation border-none">
                <CardHeader className="pb-2 px-3 py-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FolderPlus className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    Folgeaufträge ({followUpProjects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-2">
                    {followUpProjects.map(followUp => (
                      <div key={followUp.id} className="border rounded-lg p-2 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 text-xs truncate">{followUp.project_number}</h4>
                            <p className="text-[10px] text-gray-600 truncate">{followUp.title}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Status: {followUp.project_status}</p>
                          </div>
                          <Link to={createPageUrl(`ProjectDetail?id=${followUp.id}`)} className="ml-2 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Project Form */}
          <AnimatePresence>
            {showProjectForm && (
              <ProjectForm
                project={editingProject}
                parentProject={parentForNewProject}
                onSubmit={async (projectData) => {
                  if (editingProject) {
                    await Project.update(editingProject.id, projectData);
                  } else {
                    await Project.create(projectData);
                  }
                  setShowProjectForm(false);
                  setEditingProject(null);
                  setParentForNewProject(null);
                  loadProjectData();
                }}
                onCancel={() => {
                  setShowProjectForm(false);
                  setEditingProject(null);
                  setParentForNewProject(null);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* PDF Export Progress Dialog - Deckblatt */}
      <AnimatePresence>
        {isExportingPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md mx-4"
            >
              <Card className="card-elevation border-none">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Deckblatt wird erstellt...
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Bitte warten Sie einen Moment
                  </p>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-600"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Das PDF wird automatisch heruntergeladen
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Export Progress Dialog - Leistungsübersicht */}
      <AnimatePresence>
        {isExportingServicesOverview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md mx-4"
            >
              <Card className="card-elevation border-none">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Leistungsübersicht wird erstellt...
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Bitte warten Sie einen Moment
                  </p>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-600"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Das PDF wird automatisch heruntergeladen
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Montageauftrag Bestätigungsmodal */}
      <AnimatePresence>
        {showMontageConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => { if (e.target === e.currentTarget) setShowMontageConfirmModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md"
            >
              <Card className="card-elevation border-none">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Construction className="w-5 h-5" />
                    Montageauftrag erstellen
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <Construction className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Möchten Sie einen Montageauftrag erstellen?
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                      <p className="text-sm text-gray-700">
                        <strong>Projekt:</strong> {project.project_number}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Titel:</strong> {project.title}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        <strong>SM-Nummer:</strong> {project.sm_number || 'Nicht angegeben'}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      Es wird ein neuer Montageauftrag mit den Projektdaten angelegt.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowMontageConfirmModal(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={confirmCreateMontageAuftrag}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Erstellen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Modal */}
      <AnimatePresence>
      {showEmailModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmailModal(false); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg"
          >
            <Card className="card-elevation border-none">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Tiefbau-Abschluss E-Mail
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowEmailModal(false)} className="text-white hover:bg-white/20">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">E-Mail kann nicht automatisch geöffnet werden</p>
                      <p>Bitte kopieren Sie die E-Mail-Inhalte und senden Sie diese manuell an: <strong>auftrag@as-tief-strassenbau.de</strong></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium text-gray-700">An:</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('auftrag@as-tief-strassenbau.de', 'E-Mail-Adresse')}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Kopieren
                      </Button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border font-mono text-sm">
                      auftrag@as-tief-strassenbau.de
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium text-gray-700">Betreff:</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(emailContent.subject, 'Betreff')}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Kopieren
                      </Button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border font-mono text-sm">
                      {emailContent.subject}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium text-gray-700">Nachricht:</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(emailContent.body, 'Nachricht')}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Kopieren
                      </Button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {emailContent.body}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(`An: auftrag@as-tief-strassenbau.de\nBetreff: ${emailContent.subject}\n\n${emailContent.body}`, 'Komplette E-Mail')}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Komplette E-Mail kopieren
                  </Button>
                  <Button onClick={() => setShowEmailModal(false)} className="flex-1">
                    Schließen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Project Cover Sheet - positioned off-screen for PDF export */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }} ref={coverSheetRef}>
        <ProjectCoverSheet
          project={project}
          excavations={excavations}
          materials={materials}
          timesheets={timesheets}
          documents={documents}
          priceItems={priceItems}
          allProjects={[project, ...followUpProjects]}
        />
      </div>

      {/* Services Overview - positioned off-screen for PDF export */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }} ref={servicesOverviewRef}>
        <ServicesOverview
          project={project}
          excavations={excavations}
          priceItems={priceItems}
          allProjects={[project, ...followUpProjects]}
        />
      </div>

      {/* E-Vergabe Export - positioned off-screen for PDF export */}
      <div ref={evergabeRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <EVergabeExport
          project={project}
          excavations={Array.isArray(excavations) ? excavations : []}
          priceItems={Array.isArray(priceItems) ? priceItems : []}
          montageLeistungen={Array.isArray(montageLeistungen) ? montageLeistungen : []}
          montagePreisItems={Array.isArray(montagePreisItems) ? montagePreisItems : []}
        />
      </div>

      {/* E-Vergabe Export Progress Dialog */}
      <AnimatePresence>
        {isExportingEVergabe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md mx-4"
            >
              <Card className="card-elevation border-none">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    E-Vergabe PDF wird erstellt...
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Positionen werden verarbeitet
                  </p>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-600"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Das PDF wird automatisch heruntergeladen
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Print Layout (for general print functionality) */}
      <ProjectPrintLayout
        project={project}
        excavations={excavations}
        pullingWorks={pullingWorks}
        projectMaterials={projectMaterials}
        timesheets={timesheets}
        documents={documents}
        priceItems={priceItems}
        materials={materials}
      />


      </>
  );
}
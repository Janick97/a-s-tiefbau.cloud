import React, { useState, useEffect } from "react";
import { ProjectActivity, Excavation, ProjectMaterial, TimesheetEntry, ProjectDocument, PullingWork, Material, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Shovel,
  Package,
  FileText,
  Users,
  CheckCircle,
  Trash2,
  Edit,
  Upload,
  ListRestart,
  MessageSquare,
  Construction,
  Activity
} from "lucide-react";

const activityIcons = {
  excavation_created: Shovel,
  excavation_updated: Edit,
  excavation_deleted: Trash2,
  excavation_backfilled: Package,
  excavation_closed: CheckCircle,
  material_added: Package,
  material_removed: Trash2,
  document_uploaded: Upload,
  document_deleted: Trash2,
  timesheet_added: Clock,
  timesheet_updated: Edit,
  project_updated: Edit,
  comment_added: MessageSquare,
  pulling_work_added: ListRestart,
  montage_created: Construction
};

const activityColors = {
  excavation_created: 'bg-blue-100 text-blue-800',
  excavation_updated: 'bg-yellow-100 text-yellow-800',
  excavation_deleted: 'bg-red-100 text-red-800',
  excavation_backfilled: 'bg-orange-100 text-orange-800',
  excavation_closed: 'bg-green-100 text-green-800',
  material_added: 'bg-purple-100 text-purple-800',
  material_removed: 'bg-red-100 text-red-800',
  document_uploaded: 'bg-blue-100 text-blue-800',
  document_deleted: 'bg-red-100 text-red-800',
  timesheet_added: 'bg-indigo-100 text-indigo-800',
  timesheet_updated: 'bg-yellow-100 text-yellow-800',
  project_updated: 'bg-gray-100 text-gray-800',
  comment_added: 'bg-teal-100 text-teal-800',
  pulling_work_added: 'bg-cyan-100 text-cyan-800',
  montage_created: 'bg-blue-100 text-blue-800'
};

export default function ProjectHistory({ projectId }) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [projectId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      // Lade alle relevanten Daten für das Projekt
      const [
        projectActivities,
        excavations,
        materials,
        timesheets,
        documents,
        pullingWorks,
        allMaterials
      ] = await Promise.all([
        ProjectActivity.filter({ project_id: projectId }).catch(() => []),
        Excavation.filter({ project_id: projectId }).catch(() => []),
        ProjectMaterial.filter({ project_id: projectId }).catch(() => []),
        TimesheetEntry.filter({ project_id: projectId }).catch(() => []),
        ProjectDocument.filter({ project_id: projectId }).catch(() => []),
        PullingWork.filter({ project_id: projectId }).catch(() => []),
        Material.list().catch(() => [])
      ]);

      // Kombiniere alle Aktivitäten
      const combined = [];

      // ProjectActivity Einträge
      projectActivities.forEach(activity => {
        combined.push({
          id: activity.id,
          timestamp: new Date(activity.created_date),
          type: activity.activity_type,
          description: activity.description,
          user: activity.user_name,
          metadata: activity.metadata
        });
      });

      // Leistungen
      excavations.forEach(exc => {
        combined.push({
          id: `exc-${exc.id}`,
          timestamp: new Date(exc.created_date),
          type: 'excavation_created',
          description: `Leistung erstellt: ${exc.location_name}`,
          user: exc.created_by,
          metadata: { excavation_id: exc.id }
        });

        if (exc.is_backfilled && exc.backfilled_date) {
          combined.push({
            id: `exc-backfill-${exc.id}`,
            timestamp: new Date(exc.backfilled_date),
            type: 'excavation_backfilled',
            description: `Leistung verfüllt: ${exc.location_name}`,
            user: exc.backfilled_by || 'Unbekannt',
            metadata: { excavation_id: exc.id }
          });
        }

        if (exc.is_closed && exc.closed_date) {
          combined.push({
            id: `exc-closed-${exc.id}`,
            timestamp: new Date(exc.closed_date),
            type: 'excavation_closed',
            description: `Oberfläche fertiggestellt: ${exc.location_name}`,
            user: exc.closed_by || 'Unbekannt',
            metadata: { excavation_id: exc.id }
          });
        }
      });

      // Material
      materials.forEach(mat => {
        const material = allMaterials.find(m => m.id === mat.material_id);
        combined.push({
          id: `mat-${mat.id}`,
          timestamp: new Date(mat.created_date),
          type: 'material_added',
          description: `Material hinzugefügt: ${material?.name || 'Unbekannt'} (${mat.quantity} ${material?.unit || ''})`,
          user: mat.created_by,
          metadata: { material_id: mat.material_id }
        });
      });

      // Stunden
      timesheets.forEach(ts => {
        combined.push({
          id: `ts-${ts.id}`,
          timestamp: new Date(ts.created_date),
          type: 'timesheet_added',
          description: `Stunden erfasst: ${ts.employee_name} - ${ts.hours}h`,
          user: ts.created_by,
          metadata: { timesheet_id: ts.id }
        });
      });

      // Dokumente
      documents.forEach(doc => {
        combined.push({
          id: `doc-${doc.id}`,
          timestamp: new Date(doc.created_date),
          type: 'document_uploaded',
          description: `Dokument hochgeladen: ${doc.file_name} (${doc.folder})`,
          user: doc.uploaded_by || doc.created_by,
          metadata: { document_id: doc.id }
        });
      });

      // Einzieharbeiten
      pullingWorks.forEach(pw => {
        combined.push({
          id: `pw-${pw.id}`,
          timestamp: new Date(pw.created_date),
          type: 'pulling_work_added',
          description: `Einziehen erfasst: ${pw.location_name}`,
          user: pw.created_by,
          metadata: { pulling_work_id: pw.id }
        });
      });

      // Sortiere nach Datum (neueste zuerst)
      combined.sort((a, b) => b.timestamp - a.timestamp);

      setActivities(combined);
    } catch (error) {
      console.error("Fehler beim Laden der Historie:", error);
      setActivities([]);
    }
    setIsLoading(false);
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min.`;
    if (hours < 24) return `vor ${hours} Std.`;
    if (days < 7) return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    
    return timestamp.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="w-8 h-8 text-orange-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-600">Historie wird geladen...</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Keine Aktivitäten
        </h3>
        <p className="text-gray-600">
          Für dieses Projekt wurden noch keine Aktivitäten aufgezeichnet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-600" />
          Projekt-Historie ({activities.length})
        </h3>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.type] || Activity;
            const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-800';
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="card-elevation border-none hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {activity.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {activity.user}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
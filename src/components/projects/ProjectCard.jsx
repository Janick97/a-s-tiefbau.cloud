import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { 
  Edit, 
  Eye, 
  FolderOpen, 
  AlertTriangle, 
  Calendar,
  MapPin,
  Building,
  CheckSquare,
  Square,
  Package,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Project } from "@/entities/all";

const statusColors = {
  planning: "bg-blue-100 text-blue-600",
  active: "bg-green-100 text-green-600",
  completed: "bg-gray-100 text-gray-600",
  on_hold: "bg-yellow-100 text-yellow-600",
};

export default function ProjectCard({ project, onEdit, onDelete, index }) {
  const getVAOStatus = () => {
    if (!project.vao_valid_to) return null;
    
    const today = new Date();
    const validTo = new Date(project.vao_valid_to);
    const diffTime = validTo - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', days: Math.abs(diffDays), color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (diffDays <= 7) {
      return { status: 'expiring', days: diffDays, color: 'text-orange-600', bgColor: 'bg-orange-100' };
    }
    return { status: 'valid', days: diffDays, color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  const vaoStatus = getVAOStatus();

  const handleMaterialBookingToggle = async (checked) => {
    try {
      await Project.update(project.id, { material_booking_completed: checked });
      // Reload will be handled by parent component
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Materialbuchung:", error);
    }
  };

  const handleDocumentationToggle = async (checked) => {
    try {
      await Project.update(project.id, { documentation_completed: checked });
      // Reload will be handled by parent component
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Dokumentation:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="card-elevation border-none hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-bold text-gray-900 truncate mb-1">
                {project.project_number}
                {project.is_follow_up && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Folgeauftrag
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 truncate">{project.title}</p>
            </div>
            <div className="flex gap-1 ml-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onEdit(project)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Auftragsart */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Auftragsart:</span>
            <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
              {project.order_type || 'Nicht angegeben'}
            </span>
          </div>

          {/* Stadt */}
          {project.city && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Stadt:</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {project.city}
                </span>
              </div>
            </div>
          )}

          {/* Straße */}
          {project.street && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Straße:</span>
              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                {project.street}
              </span>
            </div>
          )}

          {/* VAO Gültigkeit */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">VAO:</span>
            <div className="flex items-center gap-1">
              {vaoStatus ? (
                <Badge className={`text-xs ${vaoStatus.bgColor} ${vaoStatus.color}`}>
                  {vaoStatus.status === 'expired' && `${vaoStatus.days}T abgelaufen`}
                  {vaoStatus.status === 'expiring' && `${vaoStatus.days}T verbleibend`}
                  {vaoStatus.status === 'valid' && `${vaoStatus.days}T gültig`}
                </Badge>
              ) : (
                <span className="text-xs text-gray-500">Nicht angegeben</span>
              )}
            </div>
          </div>

          {/* Projektstatus */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status:</span>
            <Badge variant="outline" className="text-xs">
              {project.project_status}
            </Badge>
          </div>

          {/* Materialbuchung */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Materialbuchung:</span>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`material-${project.id}`}
                checked={project.material_booking_completed || false}
                onCheckedChange={handleMaterialBookingToggle}
              />
              <Label htmlFor={`material-${project.id}`} className="text-xs">
                {project.material_booking_completed ? 'Erledigt' : 'Offen'}
              </Label>
            </div>
          </div>

          {/* Dokumentation */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Dokumentation:</span>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`docs-${project.id}`}
                checked={project.documentation_completed || false}
                onCheckedChange={handleDocumentationToggle}
              />
              <Label htmlFor={`docs-${project.id}`} className="text-xs">
                {project.documentation_completed ? 'Erledigt' : 'Offen'}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
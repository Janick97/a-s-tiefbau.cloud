import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Edit, FolderPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProjectHeader({ project, onEditProjectClick, onNewFollowUpClick, onPrint }) {
  return (
    <div className="flex justify-between items-center mb-6 no-print">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Projects")}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.project_number} - {project.title}</h1>
          <p className="text-gray-600">Projektdetails und -verwaltung</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onPrint}>
          <Printer className="w-4 h-4 mr-2" />
          Drucken
        </Button>
        <Button variant="outline" onClick={onNewFollowUpClick}>
          <FolderPlus className="w-4 h-4 mr-2" />
          Folgeauftrag
        </Button>
        <Button onClick={onEditProjectClick}>
          <Edit className="w-4 h-4 mr-2" />
          Bearbeiten
        </Button>
      </div>
    </div>
  );
}
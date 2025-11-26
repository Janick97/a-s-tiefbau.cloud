
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Calendar, 
  FileText,
  CheckCircle,
  Clock,
  Info // Added Info icon
} from "lucide-react";

const vaoStatusColors = {
  'beantragt': 'bg-yellow-100 text-yellow-800',
  'liegt vor': 'bg-green-100 text-green-800', 
  'abgelaufen': 'bg-red-100 text-red-800',
  'Verlängerung beantragt': 'bg-orange-100 text-orange-800'
};

export default function VaoInfo({ project, vaoSourceProject }) {
  // Determine which project's VAO info to display
  const vaoProject = vaoSourceProject || project;

  const getVAOStatus = () => {
    if (!vaoProject.vao_valid_to) return null;
    
    const today = new Date();
    const validTo = new Date(vaoProject.vao_valid_to);
    const diffTime = validTo - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', days: Math.abs(diffDays), color: 'text-red-600' };
    } else if (diffDays <= 7) {
      return { status: 'expiring', days: diffDays, color: 'text-orange-600' };
    }
    return { status: 'valid', days: diffDays, color: 'text-green-600' };
  };

  const vaoStatus = getVAOStatus();

  return (
    <Card className="card-elevation border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Verkehrsanordnung (VAO)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {vaoSourceProject && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 p-3 rounded-lg">
            <Info className="w-5 h-5 flex-shrink-0" />
            <span>
              VAO-Informationen werden von Projekt <strong>{vaoSourceProject.project_number}</strong> übernommen.
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">VAO Status</label>
              <div className="mt-1">
                {vaoProject.vao_status ? (
                  <Badge className={vaoStatusColors[vaoProject.vao_status]}>
                    {vaoProject.vao_status}
                  </Badge>
                ) : (
                  <span className="text-gray-500">Nicht angegeben</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Gültigkeitszeitraum</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">
                  {vaoProject.vao_valid_from && vaoProject.vao_valid_to ? (
                    `${new Date(vaoProject.vao_valid_from).toLocaleDateString('de-DE')} - ${new Date(vaoProject.vao_valid_to).toLocaleDateString('de-DE')}`
                  ) : (
                    'Nicht angegeben'
                  )}
                </span>
              </div>
            </div>

            {vaoStatus && (
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className={`mt-1 font-medium ${vaoStatus.color}`}>
                  {vaoStatus.status === 'expired' && `Seit ${vaoStatus.days} Tagen abgelaufen`}
                  {vaoStatus.status === 'expiring' && `Läuft in ${vaoStatus.days} Tag${vaoStatus.days === 1 ? '' : 'en'} ab`}
                  {vaoStatus.status === 'valid' && `Noch ${vaoStatus.days} Tage gültig`}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">VAO-Dokument</label>
              <div className="mt-1">
                {vaoProject.vao_document_url ? (
                  <a 
                    href={vaoProject.vao_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <FileText className="w-4 h-4" />
                    Dokument anzeigen
                  </a>
                ) : (
                  <span className="text-gray-500">Kein Dokument hochgeladen</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

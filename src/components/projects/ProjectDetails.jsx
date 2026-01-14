import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Building, User, FileText, Hash, Shovel, CheckCircle, AlertTriangle, Square, CheckSquare as CheckSquareIcon, Info } from 'lucide-react';

const vaoStatusColors = {
  'beantragt': 'bg-yellow-100 text-yellow-800',
  'liegt vor': 'bg-green-100 text-green-800', 
  'abgelaufen': 'bg-red-100 text-red-800',
  'Verlängerung beantragt': 'bg-orange-100 text-orange-800'
};

export default function ProjectDetails({ project, vaoSourceProject }) {
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
          <FileText className="w-5 h-5" />
          Projektdetails
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SM Nummer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Hash className="w-4 h-4" />
              SM Nummer
            </div>
            <p className="font-mono bg-gray-100 px-3 py-2 rounded text-lg font-bold">
              {project.sm_number || 'Nicht angegeben'}
            </p>
          </div>

          {/* Standort */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <MapPin className="w-4 h-4" />
              Standort
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">
                {project.city || 'Nicht angegeben'}
              </p>
              <p className="text-gray-600">
                {project.street || 'Straße nicht angegeben'}
              </p>
            </div>
          </div>

          {/* Auftragsart */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Building className="w-4 h-4" />
              Auftragsart
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-sm px-3 py-1">
              {project.order_type || 'Nicht angegeben'}
            </Badge>
          </div>

          {/* Ansprechpartner */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <User className="w-4 h-4" />
              Ansprechpartner
            </div>
            <p className="text-gray-900">
              {project.contact_person || 'Nicht angegeben'}
            </p>
          </div>

          {/* Projekt-Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Calendar className="w-4 h-4" />
              Projekt-Status
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-sm px-3 py-1">
              {project.project_status || 'Nicht angegeben'}
            </Badge>
          </div>

          {/* Auftragseingang */}
          {project.start_date && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Calendar className="w-4 h-4 text-blue-600" />
                Auftragseingang
              </div>
              <p className="text-gray-900 font-semibold">
                {new Date(project.start_date).toLocaleDateString('de-DE')}
              </p>
            </div>
          )}

          {/* Baustelle Fertig */}
          {project.end_date && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Calendar className="w-4 h-4 text-green-600" />
                Baustelle Fertig
              </div>
              <p className="text-gray-900 font-semibold">
                {new Date(project.end_date).toLocaleDateString('de-DE')}
              </p>
            </div>
          )}

          {/* Grube auf Datum */}
          {project.grube_auf_datum && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Shovel className="w-4 h-4 text-orange-600" />
                Grube auf
              </div>
              <p className="text-gray-900 font-semibold">
                {new Date(project.grube_auf_datum).toLocaleDateString('de-DE')}
              </p>
            </div>
          )}

          {/* Kann zu Meldung Datum */}
          {project.kann_zu_meldung_datum && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                "Kann zu" Meldung
              </div>
              <p className="text-gray-900 font-semibold">
                {new Date(project.kann_zu_meldung_datum).toLocaleDateString('de-DE')}
              </p>
            </div>
          )}
        </div>

        {/* Beschreibung */}
        {project.description && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Projektbeschreibung</h3>
            <p className="text-gray-700 leading-relaxed">{project.description}</p>
          </div>
        )}

        {!project.description && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Projektbeschreibung</h3>
            <p className="text-gray-500 italic">Keine Beschreibung vorhanden.</p>
          </div>
        )}

        {/* Verkehrsanordnung (VAO) */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Verkehrsanordnung (VAO)
          </h3>
          
          {vaoSourceProject && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 p-3 rounded-lg mb-4">
              <Info className="w-5 h-5 flex-shrink-0" />
              <span>
                VAO-Informationen werden von Projekt <strong>{vaoSourceProject.project_number}</strong> übernommen.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {vaoStatus && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className={`mt-1 font-medium ${vaoStatus.color}`}>
                {vaoStatus.status === 'expired' && `Seit ${vaoStatus.days} Tagen abgelaufen`}
                {vaoStatus.status === 'expiring' && `Läuft in ${vaoStatus.days} Tag${vaoStatus.days === 1 ? '' : 'en'} ab`}
                {vaoStatus.status === 'valid' && `Noch ${vaoStatus.days} Tage gültig`}
              </div>
            </div>
          )}
        </div>

        {/* Zusätzliche Informationen */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckSquareIcon className="w-5 h-5" />
            Zusätzliche Informationen
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              {project.bil_wep_requested ? (
                <CheckSquareIcon className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-gray-900">BIL / WEP wurde abgefragt</span>
            </div>

            <div className="flex items-center gap-3">
              {project.material_booking_completed ? (
                <CheckSquareIcon className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-gray-900">Materialbuchung erfolgt</span>
            </div>

            <div className="flex items-center gap-3">
              {project.documentation_completed ? (
                <CheckSquareIcon className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-gray-900">Dokumentation erfolgt</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
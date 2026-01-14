import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Building, User, FileText, Hash, Shovel, CheckCircle } from 'lucide-react';

export default function ProjectDetails({ project }) {
  return (
    <Card className="card-elevation border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Projektdetails
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Linke Spalte */}
          <div className="space-y-4">
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
          </div>

          {/* Mittlere Spalte - Standort & Auftragsart */}
          <div className="space-y-4">
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
          </div>

          {/* Rechte Spalte - Datumsinformationen */}
          <div className="space-y-4">
            {/* Auftragseingang */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Calendar className="w-4 h-4 text-blue-600" />
                Auftragseingang
              </div>
              <p className="text-gray-900 font-semibold">
                {project.start_date ? new Date(project.start_date).toLocaleDateString('de-DE') : 'Nicht angegeben'}
              </p>
            </div>

            {/* Grube auf */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Shovel className="w-4 h-4 text-orange-600" />
                Grube auf
              </div>
              <p className="text-gray-900 font-semibold">
                {project.grube_auf_datum ? new Date(project.grube_auf_datum).toLocaleDateString('de-DE') : 'Nicht angegeben'}
              </p>
            </div>

            {/* Baustelle fertig */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Baustelle fertig
              </div>
              <p className="text-gray-900 font-semibold">
                {project.end_date ? new Date(project.end_date).toLocaleDateString('de-DE') : 'Nicht angegeben'}
              </p>
            </div>

            {/* Kann zu Meldung */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Calendar className="w-4 h-4 text-purple-600" />
                "Kann zu" Meldung
              </div>
              <p className="text-gray-900 font-semibold">
                {project.kann_zu_meldung_datum ? new Date(project.kann_zu_meldung_datum).toLocaleDateString('de-DE') : 'Nicht angegeben'}
              </p>
            </div>
          </div>
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
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Square } from "lucide-react";

export default function StatusInfo({ project }) {
  return (
    <Card className="card-elevation border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Zusätzliche Informationen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {project.bil_wep_requested ? (
                <CheckSquare className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-gray-900">BIL / WEP wurde abgefragt</span>
            </div>

            <div className="flex items-center gap-3">
              {project.material_booking_completed ? (
                <CheckSquare className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-gray-900">Materialbuchung erfolgt</span>
            </div>

            <div className="flex items-center gap-3">
              {project.documentation_completed ? (
                <CheckSquare className="w-5 h-5 text-green-600" />
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
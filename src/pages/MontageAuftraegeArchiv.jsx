import React, { useState, useEffect } from "react";
import { MontageAuftrag, User as UserEntity } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Search, Archive, ArrowLeft, ExternalLink, Calendar, MapPin, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function MontageAuftraegeArchivPage() {
  const [auftraege, setAuftraege] = useState([]);
  const [filteredAuftraege, setFilteredAuftraege] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const auftraegeData = await MontageAuftrag.filter({ archived: true }, '-archived_date');
      setAuftraege(Array.isArray(auftraegeData) ? auftraegeData : []);
    } catch (error) {
      console.error("Fehler beim Laden der archivierten Aufträge:", error);
      setAuftraege([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let filtered = Array.isArray(auftraege) ? auftraege : [];

    if (searchTerm) {
      filtered = filtered.filter(auftrag =>
        (auftrag.sm_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auftrag.project_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAuftraege(filtered);
  }, [auftraege, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-2 md:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link to={createPageUrl("MontageAuftraege")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Archive className="w-7 h-7 md:w-8 md:h-8 text-red-600" />
                Montageaufträge Archiv
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                {filteredAuftraege.length} archivierte Aufträge
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card className="card-elevation border-none mb-4 md:mb-6">
          <CardContent className="p-3 md:p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Suche nach SM-Nr., Titel, Kunde, Stadt oder Projektnummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {filteredAuftraege.length === 0 ? (
          <Card className="card-elevation border-none">
            <CardContent className="p-8 text-center">
              <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Keine Ergebnisse gefunden' : 'Keine archivierten Aufträge'}
              </h3>
              <p className="text-gray-600 text-sm">
                {searchTerm ? 'Versuchen Sie andere Suchkriterien' : 'Abgeschlossene Aufträge erscheinen automatisch hier'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredAuftraege.map((auftrag, index) => (
              <motion.div
                key={auftrag.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="card-elevation border-none hover:shadow-lg transition-all bg-red-50 border-l-4 border-l-red-500">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
                        {/* SM-Nummer & Projektnummer */}
                        <div>
                          <p className="text-xs text-gray-500">SM-Nr. / Projekt-Nr.</p>
                          <p className="font-semibold text-sm truncate">{auftrag.sm_number}</p>
                          {auftrag.project_number && (
                            <p className="text-xs text-gray-600 truncate">{auftrag.project_number}</p>
                          )}
                        </div>

                        {/* Titel */}
                        <div>
                          <p className="text-xs text-gray-500">Titel</p>
                          <p className="font-semibold text-sm truncate">{auftrag.title}</p>
                        </div>

                        {/* Kunde & Ort */}
                        <div>
                          <p className="text-xs text-gray-500">Kunde & Ort</p>
                          <div className="flex items-center gap-1 text-sm">
                            <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{auftrag.client}</span>
                          </div>
                          {auftrag.city && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{auftrag.city}</span>
                            </div>
                          )}
                        </div>

                        {/* Archiviert am */}
                        <div>
                          <p className="text-xs text-gray-500">Archiviert am</p>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span>{auftrag.archived_date ? new Date(auftrag.archived_date).toLocaleDateString('de-DE') : '-'}</span>
                          </div>
                          {auftrag.art && (
                            <Badge className="bg-red-200 text-red-800 text-xs mt-1">{auftrag.art}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <a href={createPageUrl(`MontageAuftragDetail?id=${auftrag.id}`)}>
                        <Button size="sm" variant="outline" className="flex-shrink-0 h-8">
                          <ExternalLink className="w-3 h-3 md:mr-2" />
                          <span className="hidden md:inline">Details</span>
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
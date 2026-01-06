import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, MapPin, Calendar, User, FileText, Euro, Shovel, Camera, CheckCircle } from "lucide-react";

export default function ProjectCoverSheet({ project, excavations, materials, timesheets, documents, priceItems = [], allProjects = [] }) {
  if (!project) return null;

  const bauakten = documents.filter(doc => doc.folder === 'Bauakte');
  const totalRevenue = excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0);
  const totalHours = timesheets.reduce((sum, ts) => sum + (ts.hours || 0), 0);

  // Gruppiere Excavations nach Projekt
  const excavationsByProject = React.useMemo(() => {
    const groups = {};
    
    excavations.forEach(exc => {
      const projectId = exc.project_id;
      if (!groups[projectId]) {
        groups[projectId] = {
          project: allProjects.find(p => p.id === projectId) || project,
          excavations: []
        };
      }
      groups[projectId].excavations.push(exc);
    });
    
    return groups;
  }, [excavations, allProjects, project]);

  const getStatusBadge = (status) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      approved: 'bg-purple-100 text-purple-800'
    };
    const labels = {
      planned: 'Geplant',
      in_progress: 'In Arbeit',
      completed: 'Fertig',
      approved: 'Genehmigt'
    };
    return <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800'} text-xs px-2 py-1`}>{labels[status] || status}</Badge>;
  };

  // Formatiere Datum für die Anzeige
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Bestimme, welche Art von Oberfläche eingebaut wurde
  const getSurfaceWork = (exc) => {
    const surface1 = exc.surface_type?.toLowerCase() || '';
    const surface2 = exc.surface_type_2?.toLowerCase() || '';
    
    const hasAsphalt = surface1.includes('asphalt') || surface2.includes('asphalt');
    const hasBeton = exc.concrete_base_used || surface1.includes('beton') || surface2.includes('beton');
    const hasPlatten = surface1.includes('platten') || surface1.includes('pflaster') || 
                       surface2.includes('platten') || surface2.includes('pflaster') ||
                       surface1.includes('naturstein') || surface2.includes('naturstein');

    return { hasAsphalt, hasBeton, hasPlatten };
  };

  // Generiere Material-Info-Text - AUSGESCHRIEBEN
  const getMaterialInfo = (exc) => {
    const materialsList = [];
    if (exc.concrete_base_used) materialsList.push('Unterbeton');
    if (exc.mortar_used) materialsList.push('Mörtel');
    if (exc.gravel_used) materialsList.push('Splitt');
    return materialsList.length > 0 ? materialsList.join(', ') : '-';
  };

  // Bestimme Typ (Grube/Graben) basierend auf price_item_id
  const getExcavationType = (exc) => {
    if (!exc.price_item_id || priceItems.length === 0) return '-';
    const priceItem = priceItems.find(p => p.id === exc.price_item_id);
    return priceItem?.type || '-';
  };

  // Generiere Baustellendetails-Text
  const getBaustellenDetails = (exc) => {
    const details = [];
    
    if (exc.iron_plate_laid) {
      details.push('✓ Eisenplatte');
    }
    
    if (exc.curb_length && exc.curb_length > 0) {
      details.push(`Bordstein: ${exc.curb_length}m`);
    }
    
    if (exc.edge_stone_length && exc.edge_stone_length > 0) {
      details.push(`Kantenstein: ${exc.edge_stone_length}m`);
    }
    
    if (exc.gutter_length && exc.gutter_length > 0) {
      details.push(`Rinne: ${exc.gutter_length}m`);
    }
    
    if (exc.excavated_material_left_onsite) {
      details.push('✓ Aushub vor Ort');
    }
    
    return details.length > 0 ? details : ['-'];
  };

  // Spezielle Positionen nach item_number
  const specialItemNumbers = [
    '10021010', '10010413', '10037473', '10037352',
    '10037463', '10037372', '10021040', '10037342', '10037363'
  ];

  const getItemNumber = (exc) => {
    const priceItem = priceItems.find(p => p.id === exc.price_item_id);
    return priceItem?.item_number || '';
  };

  // Gruppiere Excavations: Normal und Spezial
  const groupedExcavations = React.useMemo(() => {
    const grouped = { normal: {}, special: {} };
    
    excavations.forEach(exc => {
      const itemNumber = getItemNumber(exc);
      const isSpecial = specialItemNumbers.includes(itemNumber);
      const targetGroup = isSpecial ? grouped.special : grouped.normal;
      const projectId = exc.project_id;
      
      if (!targetGroup[projectId]) {
        targetGroup[projectId] = {
          project: allProjects.find(p => p.id === projectId) || project,
          excavations: []
        };
      }
      targetGroup[projectId].excavations.push(exc);
    });
    
    return grouped;
  }, [excavations, allProjects, project, priceItems]);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          * {
            max-width: none !important;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: none !important;
          }
          
          /* Seitenumbruch-Kontrolle */
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: always !important;
          }
          .page-break-before {
            page-break-before: always !important;
            break-after: always !important;
          }
          .project-group {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            display: block !important;
          }
          .info-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            display: block !important;
          }
          table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Ensure all borders are visible in print */
          table {
            border-collapse: collapse !important;
            border: 2px solid rgb(31, 41, 55) !important;
          }
          table, th, td {
            border-color: rgb(31, 41, 55) !important;
            border-style: solid !important;
          }
          th {
            border-width: 2px !important;
            border: 2px solid rgb(31, 41, 55) !important;
          }
          td {
            border-width: 2px !important;
            border: 2px solid rgb(31, 41, 55) !important;
          }
          tr {
            border-bottom: 2px solid rgb(31, 41, 55) !important;
          }
          .border {
            border-width: 2px !important;
          }
          .border-2 {
            border-width: 3px !important;
          }
          .border-r {
            border-right-width: 2px !important;
          }
          .border-b {
            border-bottom-width: 2px !important;
          }
          .border-r-2 {
            border-right-width: 2.5px !important;
          }
          .border-b-2 {
            border-bottom-width: 3px !important;
          }
          .border-gray-300 {
            border-color: rgb(31, 41, 55) !important;
          }
          .border-gray-400 {
            border-color: rgb(31, 41, 55) !important;
          }
          .border-gray-700 {
            border-color: rgb(31, 41, 55) !important;
          }
          .border-orange-500 {
            border-color: rgb(249, 115, 22) !important;
          }
          /* Ensure background colors are printed */
          .bg-gray-50,
          .bg-gray-100,
          .bg-blue-50,
          .bg-orange-50,
          .bg-yellow-50,
          .bg-green-50,
          .bg-amber-50,
          .bg-purple-50 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      
      <div className="print-full-width w-full h-full bg-white" style={{ width: '100%' }}>
        <div className="w-full h-full border-2 border-gray-300" style={{ padding: '0.5cm' }}>
          
          {/* Header - Logo und Titel */}
          <div className="w-full mb-4 pb-4 border-b-2 border-orange-500">
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-5">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d76156ea9_logo_a-s_tiefbaupdf.png" 
                  alt="Logo" 
                  className="h-16"
                />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">PROJEKTDOKUMENTATION</h1>
                  <p className="text-base text-gray-600">Deckblatt & Leistungsübersicht</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">Erstellt am:</div>
                <div className="text-lg font-semibold">{new Date().toLocaleDateString('de-DE')}</div>
                <div className="text-sm text-gray-600 mt-1">{new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</div>
              </div>
            </div>
          </div>

          {/* Projektinformationen - 3 Spalten (Kennzahlen & Bauakten entfernt) */}
          <div className="w-full grid grid-cols-3 gap-4 mb-4 info-section page-break-after">
            
            {/* Spalte 1 - Basis-Infos */}
            <div className="space-y-2.5">
              <h2 className="text-lg font-bold text-orange-600 mb-2">Projektinformationen</h2>
              
              <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                <div className="text-xs text-gray-600 mb-1">Projektnummer</div>
                <div className="text-2xl font-bold text-gray-500">{project.project_number}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">SM-Nummer</div>
                <div className="text-base font-semibold text-gray-900">{project.sm_number || 'Nicht angegeben'}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Projekttitel</div>
                <div className="text-base font-semibold text-gray-900 leading-tight">{project.title}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Auftragsart</div>
                <div className="text-sm text-gray-900">{project.order_type || 'Nicht angegeben'}</div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600">Kunde</span>
                </div>
                <div className="text-base font-semibold text-gray-900">{project.client}</div>
              </div>
            </div>

            {/* Spalte 2 - Standort & Kontakt */}
            <div className="space-y-2.5">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Standort & Kontakt</h3>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600">Standort</span>
                </div>
                <div className="text-sm text-gray-900">
                  {project.street && <div className="font-medium">{project.street}</div>}
                  {project.city && <div>{project.city}</div>}
                </div>
              </div>

              {project.contact_person && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600">Ansprechpartner</span>
                  </div>
                  <div className="text-sm text-gray-900">{project.contact_person}</div>
                </div>
              )}

              {/* Projekt-Status Checkboxen */}
              <div className="border border-gray-200 rounded-lg p-2.5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Projekt-Status</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    {project.bil_wep_requested ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded"></div>
                    )}
                    <span>BIL / WEP abgefragt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.material_booking_completed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded"></div>
                    )}
                    <span>Materialbuchung erfolgt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.documentation_completed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded"></div>
                    )}
                    <span>Dokumentation erfolgt</span>
                  </div>
                </div>
              </div>

              {project.description && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Beschreibung</div>
                  <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto leading-snug">
                    {project.description}
                  </div>
                </div>
              )}
            </div>

            {/* Spalte 3 - Status & Termine & VAO */}
            <div className="space-y-2.5">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Status & Termine</h3>
              
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Projekt-Status</div>
                <Badge className="text-sm px-2 py-1">{project.project_status || 'Nicht angegeben'}</Badge>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-2.5 space-y-2">
                {project.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="text-gray-600">Eingang: </span>
                      <span className="font-semibold">{new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                )}

                {project.end_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="text-gray-600">Fertig: </span>
                      <span className="font-semibold">{new Date(project.end_date).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                )}

                {project.grube_auf_datum && (
                  <div className="flex items-center gap-2">
                    <Shovel className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="text-gray-600">Grube auf: </span>
                      <span className="font-semibold">{new Date(project.grube_auf_datum).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                )}

                {project.kann_zu_meldung_datum && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="text-gray-600">"Kann zu": </span>
                      <span className="font-semibold">{new Date(project.kann_zu_meldung_datum).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* VAO Information - erweitert */}
              {project.vao_status && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-3 mt-3">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">VAO-Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Status: </span>
                      <span className="font-semibold">{project.vao_status}</span>
                    </div>
                    {project.vao_valid_from && (
                      <div>
                        <span className="text-gray-600">Gültig von: </span>
                        <span className="font-semibold">
                          {new Date(project.vao_valid_from).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                    {project.vao_valid_to && (
                      <div>
                        <span className="text-gray-600">Gültig bis: </span>
                        <span className="font-semibold">
                          {new Date(project.vao_valid_to).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leistungsübersicht - Standard Positionen */}
          {Object.keys(groupedExcavations.normal).length > 0 && (
            <div className="w-full">
              <h2 className="text-xl font-bold text-orange-600 mb-3 flex items-center gap-2 pb-2 border-b-2 border-orange-500">
                <Shovel className="w-6 h-6" />
                Leistungsübersicht ({Object.values(groupedExcavations.normal).reduce((sum, g) => sum + g.excavations.length, 0)} Positionen)
              </h2>
              
              <div className="space-y-4">
                {Object.entries(groupedExcavations.normal).map(([projectId, group], groupIndex) => {
                  // Erste Seite: max 4 Positionen, weitere Seiten: max 10 Positionen
                  const chunks = [];
                  if (group.excavations.length > 0) {
                    // Erste Seite mit max 4 Items
                    chunks.push(group.excavations.slice(0, 4));
                    // Restliche Items in 10er Gruppen
                    for (let i = 4; i < group.excavations.length; i += 10) {
                      chunks.push(group.excavations.slice(i, i + 10));
                    }
                  }
                  
                  return chunks.map((chunk, chunkIndex) => (
                  <div key={`${projectId}-${chunkIndex}`} className={`w-full project-group page-break-inside-avoid ${(groupIndex > 0 || chunkIndex > 0) ? 'page-break-before' : ''}`}>
                    {/* Projektüberschrift - nur beim ersten Chunk */}
                    {chunkIndex === 0 && Object.keys(excavationsByProject).length > 1 && (
                      <div className="bg-gradient-to-r from-orange-100 to-amber-50 border-l-4 border-orange-500 p-3 mb-2 rounded">
                        <h3 className="text-base font-bold text-gray-900">
                          {group.project.project_number} - {group.project.title}
                          {group.project.id !== project.id && (
                            <Badge variant="outline" className="ml-2 text-xs">Folgeauftrag</Badge>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{group.excavations.length} Leistung(en)</p>
                      </div>
                    )}
                    
                    {/* Leistungstabelle */}
                    <div className="w-full border-3 border-gray-700 rounded-lg overflow-hidden shadow-sm page-break-inside-avoid">
                      <Table className="w-full border-collapse" style={{ border: '2px solid rgb(31, 41, 55)' }}>
                        <TableHeader className="bg-gradient-to-r from-gray-100 to-gray-50">
                          <TableRow className="border-b-2 border-gray-700" style={{ borderBottom: '2px solid rgb(31, 41, 55)' }}>
                            <TableHead className="font-bold text-sm p-3 w-[10%] border-r-2 border-gray-700">Standort</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[5%] border-r-2 border-gray-700 text-center">Typ</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[7%] border-r-2 border-gray-700">Oberfl.</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[8%] border-r-2 border-gray-700">Material</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[10%] border-r-2 border-gray-700">Auf</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[10%] border-r-2 border-gray-700">Verfüllung</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[9%] border-r-2 border-gray-700">Trag</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[9%] border-r-2 border-gray-700">Fein</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[10%] border-r-2 border-gray-700">Beton/<br/>Naturstein</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[10%] border-r-2 border-gray-700">Platten/<br/>Pflaster</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[12%]">Baustellendetails</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chunk.map((exc, index) => {
                            const surfaceWork = getSurfaceWork(exc);
                            const excavationType = getExcavationType(exc);
                            const baustellenDetails = getBaustellenDetails(exc);
                            
                            return (
                              <TableRow key={exc.id} className={`border-b-2 border-gray-700 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ borderBottom: '2px solid rgb(31, 41, 55)' }}>
                                <TableCell className="p-3 text-sm border-r-2 border-gray-700">
                                  <div className="font-semibold leading-tight">{exc.location_name}</div>
                                  <div className="text-gray-600 leading-tight text-xs">
                                    {exc.street} {exc.house_number}, {exc.city}
                                  </div>
                                </TableCell>
                                
                                <TableCell className="p-3 text-sm border-r-2 border-gray-700">
                                  <div className="flex flex-col items-center justify-center">
                                    <Badge className={`text-xs mb-1 px-2 py-0.5 ${
                                      excavationType === 'Grube' 
                                        ? 'bg-orange-100 text-orange-800 border-orange-200' 
                                        : excavationType === 'Graben'
                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {excavationType}
                                    </Badge>
                                    <div className="font-medium text-xs text-center">{exc.excavation_length || 0}×{exc.excavation_width || 0}×{exc.excavation_depth || 0}</div>
                                    {exc.excavation_factor && exc.excavation_factor !== 1 && (
                                      <div className="text-gray-600 text-xs text-center">F:{exc.excavation_factor}</div>
                                    )}
                                  </div>
                                </TableCell>
                                
                                <TableCell className="p-3 text-sm border-r-2 border-gray-700">
                                  {exc.surface_type && (
                                    <div className="font-semibold text-xs">{exc.surface_type}</div>
                                  )}
                                  {exc.surface_type_2 && (
                                    <div className="text-purple-700 font-medium text-xs">+{exc.surface_type_2}</div>
                                  )}
                                  {!exc.surface_type && !exc.surface_type_2 && '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs font-semibold bg-amber-50 border-r-2 border-gray-700">
                                  {getMaterialInfo(exc)}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-blue-50 border-r-2 border-gray-700">
                                  {exc.foreman ? (
                                    <>
                                      <div className="font-semibold">{exc.foreman}</div>
                                      {exc.created_date && (
                                        <div className="text-gray-600 text-[11px]">{formatDate(exc.created_date)}</div>
                                      )}
                                    </>
                                  ) : '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-orange-50 border-r-2 border-gray-700">
                                  {exc.is_backfilled && exc.backfilled_by ? (
                                    <>
                                      <div className="font-semibold">{exc.backfilled_by}</div>
                                      {exc.backfilled_date && (
                                        <div className="text-gray-600 text-[11px]">{formatDate(exc.backfilled_date)}</div>
                                      )}
                                    </>
                                  ) : '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-yellow-50 border-r-2 border-gray-700">
                                  {surfaceWork.hasAsphalt && exc.is_closed && exc.closed_by ? (
                                    <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date && (
                                        <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                      )}
                                      <div className="text-[11px] text-gray-500">(Trag)</div>
                                    </>
                                  ) : '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-green-50 border-r-2 border-gray-700">
                                  {surfaceWork.hasAsphalt && exc.is_closed && exc.closed_by ? (
                                    <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date && (
                                        <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                      )}
                                      <div className="text-[11px] text-gray-500">(Fein)</div>
                                    </>
                                  ) : '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-gray-100 border-r-2 border-gray-700">
                                  {surfaceWork.hasBeton && exc.is_closed && exc.closed_by ? (
                                    <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date && (
                                        <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                      )}
                                    </>
                                  ) : '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-purple-50 border-r-2 border-gray-700">
                                  {surfaceWork.hasPlatten && exc.is_closed && exc.closed_by ? (
                                    <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date && (
                                        <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                      )}
                                    </>
                                  ) : '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-yellow-50">
                                  {baustellenDetails.map((detail, idx) => (
                                    <div key={idx} className="leading-tight">{detail}</div>
                                  ))}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  ));
                })}
              </div>
            </div>
          )}

          {/* Spezielle Positionen - Separat dargestellt */}
          {Object.keys(groupedExcavations.special).length > 0 && (
            <div className="w-full mt-6 page-break-before">
              <h2 className="text-xl font-bold text-purple-600 mb-3 flex items-center gap-2 pb-2 border-b-2 border-purple-500">
                <Shovel className="w-6 h-6" />
                Spezielle Leistungen ({Object.values(groupedExcavations.special).reduce((sum, g) => sum + g.excavations.length, 0)} Positionen)
              </h2>
              
              <div className="space-y-4">
                {Object.entries(groupedExcavations.special).map(([projectId, group], groupIndex) => {
                  // Erste Seite: max 4 Positionen, weitere Seiten: max 10 Positionen
                  const chunks = [];
                  if (group.excavations.length > 0) {
                    // Erste Seite mit max 4 Items
                    chunks.push(group.excavations.slice(0, 4));
                    // Restliche Items in 10er Gruppen
                    for (let i = 4; i < group.excavations.length; i += 10) {
                      chunks.push(group.excavations.slice(i, i + 10));
                    }
                  }
                  
                  return chunks.map((chunk, chunkIndex) => (
                  <div key={`${projectId}-special-${chunkIndex}`} className={`w-full project-group page-break-inside-avoid ${(groupIndex > 0 || chunkIndex > 0) ? 'page-break-before' : ''}`}>
                    {/* Projektüberschrift - nur beim ersten Chunk */}
                    {chunkIndex === 0 && Object.keys(groupedExcavations.special).length > 1 && (
                      <div className="bg-gradient-to-r from-purple-100 to-purple-50 border-l-4 border-purple-500 p-3 mb-2 rounded">
                        <h3 className="text-base font-bold text-gray-900">
                          {group.project.project_number} - {group.project.title}
                          {group.project.id !== project.id && (
                            <Badge variant="outline" className="ml-2 text-xs">Folgeauftrag</Badge>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{group.excavations.length} Spezielle Leistung(en)</p>
                      </div>
                    )}
                    
                    {/* Vereinfachte Leistungstabelle - Nur Name, Menge, Hinzugefügt von */}
                    <div className="w-full border-3 border-gray-700 rounded-lg overflow-hidden shadow-sm page-break-inside-avoid">
                      <Table className="w-full border-collapse" style={{ border: '2px solid rgb(31, 41, 55)' }}>
                        <TableHeader className="bg-gradient-to-r from-purple-100 to-purple-50">
                          <TableRow className="border-b-2 border-gray-700" style={{ borderBottom: '2px solid rgb(31, 41, 55)' }}>
                            <TableHead className="font-bold text-sm p-3 w-[50%] border-r-2 border-gray-700">Leistungsbezeichnung</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[25%] border-r-2 border-gray-700 text-center">Menge</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[25%]">Hinzugefügt von</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chunk.map((exc, index) => {
                            const priceItem = priceItems.find(p => p.id === exc.price_item_id);
                            const leistungsName = priceItem ? `${priceItem.item_number} - ${priceItem.description}` : exc.location_name;
                            
                            return (
                              <TableRow key={exc.id} className={`border-b-2 border-gray-700 ${index % 2 === 0 ? 'bg-white' : 'bg-purple-50'}`} style={{ borderBottom: '2px solid rgb(31, 41, 55)' }}>
                                <TableCell className="p-3 text-sm border-r-2 border-gray-700">
                                  <div className="font-semibold leading-tight">{leistungsName}</div>
                                </TableCell>
                                
                                <TableCell className="p-3 text-sm border-r-2 border-gray-700 text-center">
                                  <div className="font-medium">
                                    {exc.quantity} {priceItem?.unit || 'ST'}
                                  </div>
                                </TableCell>
                                
                                <TableCell className="p-3 text-sm">
                                  {exc.foreman ? (
                                    <>
                                      <div className="font-semibold">{exc.foreman}</div>
                                      {exc.created_date && (
                                        <div className="text-gray-600 text-xs">{formatDate(exc.created_date)}</div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                            })}
                            </TableBody>
                            </Table>
                            </div>
                            </div>
                            ));
                            })}
                            </div>
                            </div>
                            )}

                            {/* Footer */}
          <div className="w-full mt-3 pt-2 border-t border-gray-300">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <div>
                <strong>A&S Tief- u. Straßenbau GmbH</strong>
              </div>
              <div className="text-center">
                <strong>Projekt: {project.project_number}</strong> | {project.title}
              </div>
              <div className="text-right">
                {new Date().toLocaleDateString('de-DE')} | {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
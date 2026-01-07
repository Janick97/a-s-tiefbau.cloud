import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, MapPin, Calendar, User, FileText, Euro, Shovel, Camera, CheckCircle } from "lucide-react";

export default function ProjectCoverSheet({ project, excavations, materials, timesheets, documents, priceItems = [], allProjects = [], currentProjectId = null }) {
  if (!project) return null;

  // Verwende currentProjectId für die "Aktuell"-Markierung, fallback auf project.id
  const selectedCurrentId = currentProjectId || project.id;

  const bauakten = documents.filter((doc) => doc.folder === 'Bauakte');
  const totalRevenue = excavations.reduce((sum, exc) => sum + (exc.calculated_price || 0), 0);
  const totalHours = timesheets.reduce((sum, ts) => sum + (ts.hours || 0), 0);

  // Gruppiere Excavations nach Projekt
  const excavationsByProject = React.useMemo(() => {
    const groups = {};

    excavations.forEach((exc) => {
      const projectId = exc.project_id;
      if (!groups[projectId]) {
        groups[projectId] = {
          project: allProjects.find((p) => p.id === projectId) || project,
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
    const priceItem = priceItems.find((p) => p.id === exc.price_item_id);
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
  '10037463', '10037372', '10021040', '10037342', '10037363'];


  const getItemNumber = (exc) => {
    const priceItem = priceItems.find((p) => p.id === exc.price_item_id);
    return priceItem?.item_number || '';
  };

  // Gruppiere Excavations: Normal und Spezial
  const groupedExcavations = React.useMemo(() => {
    const grouped = { normal: {}, special: {} };

    excavations.forEach((exc) => {
      const itemNumber = getItemNumber(exc);
      const isSpecial = specialItemNumbers.includes(itemNumber);
      const targetGroup = isSpecial ? grouped.special : grouped.normal;
      const projectId = exc.project_id;

      if (!targetGroup[projectId]) {
        targetGroup[projectId] = {
          project: allProjects.find((p) => p.id === projectId) || project,
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
            border: 3px solid rgb(31, 41, 55) !important;
            table-layout: fixed !important;
            width: 100% !important;
          }
          table, th, td {
            border-color: rgb(31, 41, 55) !important;
            border-style: solid !important;
          }
          th {
            border: 3px solid rgb(31, 41, 55) !important;
            padding: 8px !important;
            font-weight: bold !important;
            background-color: rgb(243, 244, 246) !important;
          }
          td {
            border: 3px solid rgb(31, 41, 55) !important;
            padding: 8px !important;
            overflow: visible !important;
            word-wrap: break-word !important;
          }
          tr {
            border-bottom: 3px solid rgb(31, 41, 55) !important;
          }
          .border {
            border-width: 3px !important;
            border-style: solid !important;
          }
          .border-2 {
            border-width: 3px !important;
            border-style: solid !important;
          }
          .border-r {
            border-right-width: 3px !important;
            border-right-style: solid !important;
          }
          .border-b {
            border-bottom-width: 3px !important;
            border-bottom-style: solid !important;
          }
          .border-r-2 {
            border-right-width: 3px !important;
            border-right-style: solid !important;
          }
          .border-b-2 {
            border-bottom-width: 3px !important;
            border-bottom-style: solid !important;
          }
          .border-gray-300,
          .border-gray-400,
          .border-gray-700 {
            border-color: rgb(31, 41, 55) !important;
          }
          .border-orange-500,
          .border-orange-400,
          .border-orange-300 {
            border-color: rgb(249, 115, 22) !important;
          }
          .border-blue-200 {
            border-color: rgb(191, 219, 254) !important;
          }
          .rounded,
          .rounded-lg {
            border-radius: 0 !important;
          }
          /* Ensure proper spacing */
          .p-2, .p-3, .p-4 {
            padding: 8px !important;
          }
          .gap-2, .gap-3, .gap-4 {
            gap: 8px !important;
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
            <div className="flex justify-end w-full">
              <div className="text-right">
                <div className="text-sm text-gray-600">{new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</div>
              </div>
            </div>
          </div>

          {/* Projektinformationen - Kompakte Anordnung */}
          <div className="w-full mb-4 info-section page-break-after">
            
            {/* Hauptinfos - Neue kompakte Anordnung */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 rounded-lg p-4 mb-3">
              {/* Obere Reihe: Projektnummer, Stadt, Ansprechpartner, Auftragseingang, SM-Nummer, VAO */}
              <div className="grid grid-cols-6 gap-4 mb-3">
                <div className="bg-white border-2 border-orange-300 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Projektnummer</div>
                  <div className="text-2xl font-bold text-gray-900">{project.project_number}</div>
                </div>
                <div className="bg-white border-2 border-orange-300 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Stadt</div>
                  <div className="text-lg font-semibold text-gray-900">{project.city || '-'}</div>
                </div>
                <div className="bg-white border-2 border-orange-300 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Ansprechpartner</div>
                  <div className="text-lg font-semibold text-gray-900">{project.contact_person || '-'}</div>
                </div>
                <div className="bg-white border-2 border-orange-300 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Auftragseingang</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {project.start_date ? new Date(project.start_date).toLocaleDateString('de-DE') : '-'}
                  </div>
                </div>
                <div className="bg-white border-2 border-orange-300 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">SM-Nummer</div>
                  <div className="text-xl font-bold text-gray-900">{project.sm_number || '-'}</div>
                </div>
                <div className="bg-white border-2 border-orange-300 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">VAO</div>
                  {project.vao_status ? (
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-gray-900">{project.vao_status}</div>
                      {(project.vao_valid_from || project.vao_valid_to) && (
                        <div className="text-[10px] text-gray-600">
                          {project.vao_valid_from && (
                            <div>von {new Date(project.vao_valid_from).toLocaleDateString('de-DE')}</div>
                          )}
                          {project.vao_valid_to && (
                            <div>bis {new Date(project.vao_valid_to).toLocaleDateString('de-DE')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">-</div>
                  )}
                </div>
              </div>

              {/* Zweite Reihe: Folgeaufträge */}
              <div className="pt-3 border-t border-orange-200">
                {allProjects.length > 1 ? (() => {
                  const isFollowUp = !!project.parent_project_id;
                  const mainProject = isFollowUp ?
                  allProjects.find((p) => p.id === project.parent_project_id) :
                  project;
                  const followUps = allProjects.filter((p) => p.parent_project_id === mainProject?.id);

                  return (
                    <>
                      <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Auftragsübersicht
                      </h3>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {/* Hauptauftrag */}
                        {mainProject &&
                        <div className={`flex flex-col gap-1 p-2 rounded ${
                        mainProject.id === selectedCurrentId ?
                        'bg-orange-200 border-2 border-orange-500 font-semibold' :
                        'bg-white border border-gray-200'}`
                        }>
                            <div className="flex items-center gap-2">
                              {mainProject.foreman_completed ?
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> :
                            <div className="w-3.5 h-3.5 border-2 border-gray-400 rounded flex-shrink-0"></div>
                            }
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-semibold">{mainProject.project_number}</div>
                              </div>
                              {mainProject.id === selectedCurrentId &&
                            <Badge className="bg-orange-500 text-white text-[9px] px-1 py-0">Aktuell</Badge>
                            }
                            </div>
                            <div className="text-[10px] text-gray-600 truncate">{mainProject.title}</div>
                            <div className="text-[10px] text-gray-500">Hauptauftrag</div>
                          </div>
                        }
                        
                        {/* Folgeaufträge */}
                        {followUps.map((followUp, idx) =>
                        <div key={followUp.id} className={`flex flex-col gap-1 p-2 rounded ${
                        followUp.id === selectedCurrentId ?
                        'bg-orange-200 border-2 border-orange-500 font-semibold' :
                        'bg-white border border-gray-200'}`
                        }>
                            <div className="flex items-center gap-2">
                              {followUp.foreman_completed ?
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> :
                            <div className="w-3.5 h-3.5 border-2 border-gray-400 rounded flex-shrink-0"></div>
                            }
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-semibold">{followUp.project_number}</div>
                              </div>
                              {followUp.id === selectedCurrentId &&
                            <Badge className="bg-orange-500 text-white text-[9px] px-1 py-0">Aktuell</Badge>
                            }
                            </div>
                            <div className="text-[10px] text-gray-600 truncate">{followUp.title}</div>
                            <div className="text-[10px] text-gray-500">Folgeauftrag {idx + 1}</div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })() : (
                  <div className="text-sm text-gray-600">Keine Folgeaufträge</div>
                )}
              </div>
            </div>
          </div>

          {/* Leistungsübersicht - Standard Positionen */}
          {Object.keys(groupedExcavations.normal).length > 0 &&
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

                return chunks.map((chunk, chunkIndex) =>
                <div key={`${projectId}-${chunkIndex}`} className={`w-full project-group page-break-inside-avoid ${groupIndex > 0 || chunkIndex > 0 ? 'page-break-before' : ''}`}>
                    {/* Projektüberschrift - nur beim ersten Chunk */}
                    {chunkIndex === 0 && Object.keys(excavationsByProject).length > 1 &&
                  <div className="bg-gradient-to-r from-orange-100 to-amber-50 border-l-4 border-orange-500 p-3 mb-2 rounded">
                        <h3 className="text-base font-bold text-gray-900">
                          {group.project.project_number} - {group.project.title}
                          {group.project.id !== project.id &&
                      <Badge variant="outline" className="ml-2 text-xs">Folgeauftrag</Badge>
                      }
                        </h3>
                        <p className="text-sm text-gray-600">{group.excavations.length} Leistung(en)</p>
                      </div>
                  }
                    
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
                            <TableHead className="font-bold text-sm p-3 w-[10%] border-r-2 border-gray-700">Beton/<br />Naturstein</TableHead>
                            <TableHead className="font-bold text-sm p-3 w-[10%] border-r-2 border-gray-700">Platten/<br />Pflaster</TableHead>
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
                                  excavationType === 'Grube' ?
                                  'bg-orange-100 text-orange-800 border-orange-200' :
                                  excavationType === 'Graben' ?
                                  'bg-blue-100 text-blue-800 border-blue-200' :
                                  'bg-gray-100 text-gray-800'}`
                                  }>
                                      {excavationType}
                                    </Badge>
                                    <div className="font-medium text-xs text-center">{exc.excavation_length || 0}×{exc.excavation_width || 0}×{exc.excavation_depth || 0}</div>
                                    {exc.excavation_factor && exc.excavation_factor !== 1 &&
                                  <div className="text-gray-600 text-xs text-center">F:{exc.excavation_factor}</div>
                                  }
                                  </div>
                                </TableCell>
                                
                                <TableCell className="p-3 text-sm border-r-2 border-gray-700">
                                  {exc.surface_type &&
                                <div className="font-semibold text-xs">{exc.surface_type}</div>
                                }
                                  {exc.surface_type_2 &&
                                <div className="text-purple-700 font-medium text-xs">+{exc.surface_type_2}</div>
                                }
                                  {!exc.surface_type && !exc.surface_type_2 && '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs font-semibold bg-amber-50 border-r-2 border-gray-700">
                                  {getMaterialInfo(exc)}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-blue-50 border-r-2 border-gray-700">
                                  {exc.foreman ?
                                <>
                                      <div className="font-semibold">{exc.foreman}</div>
                                      {exc.created_date &&
                                  <div className="text-gray-600 text-[11px]">{formatDate(exc.created_date)}</div>
                                  }
                                    </> :
                                '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-orange-50 border-r-2 border-gray-700">
                                  {exc.is_backfilled && exc.backfilled_by ?
                                <>
                                      <div className="font-semibold">{exc.backfilled_by}</div>
                                      {exc.backfilled_date &&
                                  <div className="text-gray-600 text-[11px]">{formatDate(exc.backfilled_date)}</div>
                                  }
                                    </> :
                                '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-yellow-50 border-r-2 border-gray-700">
                                  {surfaceWork.hasAsphalt && exc.is_closed && exc.closed_by ?
                                <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date &&
                                  <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                  }
                                      <div className="text-[11px] text-gray-500">(Trag)</div>
                                    </> :
                                '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-green-50 border-r-2 border-gray-700">
                                  {surfaceWork.hasAsphalt && exc.is_closed && exc.closed_by ?
                                <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date &&
                                  <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                  }
                                      <div className="text-[11px] text-gray-500">(Fein)</div>
                                    </> :
                                '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-gray-100 border-r-2 border-gray-700">
                                  {surfaceWork.hasBeton && exc.is_closed && exc.closed_by ?
                                <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date &&
                                  <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                  }
                                    </> :
                                '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-purple-50 border-r-2 border-gray-700">
                                  {surfaceWork.hasPlatten && exc.is_closed && exc.closed_by ?
                                <>
                                      <div className="font-semibold">{exc.closed_by}</div>
                                      {exc.closed_date &&
                                  <div className="text-gray-600 text-[11px]">{formatDate(exc.closed_date)}</div>
                                  }
                                    </> :
                                '-'}
                                </TableCell>
                                
                                <TableCell className="p-3 text-xs bg-yellow-50">
                                  {baustellenDetails.map((detail, idx) =>
                                <div key={idx} className="leading-tight">{detail}</div>
                                )}
                                </TableCell>
                              </TableRow>);

                        })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          }

          {/* Spezielle Positionen - Separat dargestellt */}
          {Object.keys(groupedExcavations.special).length > 0 &&
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

                return chunks.map((chunk, chunkIndex) =>
                <div key={`${projectId}-special-${chunkIndex}`} className={`w-full project-group page-break-inside-avoid ${groupIndex > 0 || chunkIndex > 0 ? 'page-break-before' : ''}`}>
                    {/* Projektüberschrift - nur beim ersten Chunk */}
                    {chunkIndex === 0 && Object.keys(groupedExcavations.special).length > 1 &&
                  <div className="bg-gradient-to-r from-purple-100 to-purple-50 border-l-4 border-purple-500 p-3 mb-2 rounded">
                        <h3 className="text-base font-bold text-gray-900">
                          {group.project.project_number} - {group.project.title}
                          {group.project.id !== project.id &&
                      <Badge variant="outline" className="ml-2 text-xs">Folgeauftrag</Badge>
                      }
                        </h3>
                        <p className="text-sm text-gray-600">{group.excavations.length} Spezielle Leistung(en)</p>
                      </div>
                  }
                    
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
                          const priceItem = priceItems.find((p) => p.id === exc.price_item_id);
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
                                  {exc.foreman ?
                                <>
                                      <div className="font-semibold">{exc.foreman}</div>
                                      {exc.created_date &&
                                  <div className="text-gray-600 text-xs">{formatDate(exc.created_date)}</div>
                                  }
                                    </> :

                                <span className="text-gray-500">-</span>
                                }
                                </TableCell>
                              </TableRow>);

                        })}
                            </TableBody>
                            </Table>
                            </div>
                            </div>
                );
              })}
                            </div>
                            </div>
          }

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
    </>);

}
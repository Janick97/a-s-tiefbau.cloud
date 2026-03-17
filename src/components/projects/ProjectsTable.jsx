import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Shovel, Calendar, Edit, CornerDownRight, CheckCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { createPageUrl } from "@/utils";

const projectStatusColors = {
  "Auftrag neu im Server": "bg-yellow-200 border-yellow-300",
  "Auftrag angelegt ohne VAO": "bg-yellow-100 border-yellow-200",
  "Auftrag neu VAO beantragt": "bg-green-100 border-green-200",
  "VAO bei Baubeginn": "bg-red-200 border-red-300",
  "Auftrag angelegt keine VAO nötig": "bg-green-100 border-green-200",
  "Folgeauftrag": "bg-yellow-100 border-yellow-200",
  "VAO von Projekt": "bg-gradient-to-r from-yellow-200 to-green-200 border-yellow-300",
  "Jahresgenehmigung": "bg-green-200 border-green-300",
  "Aufgrabung beantragt": "bg-red-200 border-red-300",
  "Privat": "bg-purple-200 border-purple-300",
  "Storniert": "bg-red-200 border-red-300",
  "Baustelle bearbeiten": "bg-pink-200 border-pink-300",
  "Montage neu in Craftnote angelegt": "bg-yellow-100 border-yellow-200",
  "Montage fertig": "bg-gray-200 border-gray-300",
  "Planbare Baustelle begonnen": "bg-orange-200 border-orange-300",
  "Technisch fertig": "bg-amber-700 text-white border-amber-800",
  "Kann zu VERFÜLLEN": "bg-blue-200 border-blue-300",
  "Kann zu Pflaster/Platten": "bg-blue-200 border-blue-300",
  "Kann zu Asphalt TRAG": "bg-blue-200 border-blue-300",
  "Kann zu Asphalt FEIN": "bg-blue-200 border-blue-300",
  "Baustelle fertig": "bg-green-300 border-green-400",
  "Auftrag komplett abgeschlossen": "bg-green-400 border-green-500",
  "Auftrag angelegt mit VAO von prj": "bg-blue-100 border-blue-200"
};

// Kleine Input-Komponente für Spaltenfilter
function ColFilter({ value, onChange, placeholder }) {
  return (
    <div className="relative mt-1">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Filter..."}
        className="h-6 text-xs px-1.5 pr-5 border-gray-200 bg-white focus:border-orange-400"
        onClick={e => e.stopPropagation()}
      />
      {value && (
        <button
          onClick={e => { e.stopPropagation(); onChange(""); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Select-Filter für Spalten
function ColSelectFilter({ value, onChange, options, placeholder }) {
  return (
    <div className="mt-1" onClick={e => e.stopPropagation()}>
      <Select value={value || "__all__"} onValueChange={v => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="h-6 text-xs px-1.5 border-gray-200 bg-white focus:border-orange-400">
          <SelectValue placeholder={placeholder || "Alle"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Alle</SelectItem>
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ProjectsTable({
  isLoading, error, mainProjects, followUpsByParent,
  getVAOInfo, handleVaoClick, updatingVao, handleCheckboxChange,
  updatingProject, confirmDialog, handleStatusChange, projectStatusOptions
}) {
  // Spalten-Filter State
  const [colFilters, setColFilters] = useState({
    project_number: "",
    order_type: "",
    sm_number: "",
    city: "",
    street: "",
    contact_person: "",
    project_status: "",
  });

  const setColFilter = (col, val) => setColFilters(prev => ({ ...prev, [col]: val }));

  const hasColFilters = Object.values(colFilters).some(v => v !== "");

  // Alle Projekte aus mainProjects + followUps zusammenführen für unique-Optionen
  const allRows = [...mainProjects, ...Array.from(followUpsByParent.values()).flat()];
  const unique = (field) => [...new Set(allRows.map(p => p[field]).filter(Boolean))].sort();

  // Spaltenfilter anwenden
  const applyColFilters = (project) => {
    const cf = colFilters;
    if (cf.project_number && !(project.project_number || '').toLowerCase().includes(cf.project_number.toLowerCase())) return false;
    if (cf.order_type && (project.order_type || '') !== cf.order_type) return false;
    if (cf.sm_number && !(project.sm_number || '').toLowerCase().includes(cf.sm_number.toLowerCase())) return false;
    if (cf.city && (project.city || '') !== cf.city) return false;
    if (cf.street && !(project.street || '').toLowerCase().includes(cf.street.toLowerCase())) return false;
    if (cf.contact_person && (project.contact_person || '') !== cf.contact_person) return false;
    if (cf.project_status && (project.project_status || '') !== cf.project_status) return false;
    return true;
  };

  // Gefilterte mainProjects + followUps
  const filteredMain = mainProjects.filter(applyColFilters);
  // Für followUps: entweder parent sichtbar und child passt, oder child passt direkt
  const filteredFollowUps = new Map();
  followUpsByParent.forEach((children, parentId) => {
    const filtered = children.filter(applyColFilters);
    if (filtered.length > 0) filteredFollowUps.set(parentId, filtered);
  });

  if (isLoading) {
    return (
      <Card className="card-elevation border-none">
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {Array(5).fill(0).map((_, i) => (
                <TableRow key={i} className="h-12">
                  <TableCell className="py-2" colSpan={13}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (error) return <div className="text-center text-red-500 py-8">{error}</div>;

  const ProjectRow = React.memo(({ project, isFollowUp = false, rowIndex = 0 }) => {
    const vaoInfo = getVAOInfo(project);
    const isEvenRow = rowIndex % 2 === 0;
    const isVaoInherited = !!project.vao_source_project_id;
    return (
      <motion.tr
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`h-9 hover:bg-orange-50/70 transition-colors group cursor-pointer ${isFollowUp ? 'bg-gray-50' : (isEvenRow ? 'bg-white' : 'bg-gray-50')}`}
        onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}
      >
        <TableCell className="py-1 px-2 w-32" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {isFollowUp && <CornerDownRight className="w-3 h-3 text-gray-400" />}
            <span className="font-mono bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-bold text-xs whitespace-nowrap">{project.project_number}</span>
          </div>
        </TableCell>
        <TableCell className="py-1 px-2 w-28"><span className="text-gray-700 text-xs truncate block">{project.order_type || '-'}</span></TableCell>
        <TableCell className="py-1 px-2 w-24"><span className="text-gray-700 text-xs truncate block">{project.sm_number || '-'}</span></TableCell>
        <TableCell className="py-1 px-2 w-28"><span className="text-gray-700 text-xs truncate block font-medium">{project.city || '-'}</span></TableCell>
        <TableCell className="py-1 px-2 w-36"><span className="text-gray-700 text-xs truncate block">{project.street || '-'}</span></TableCell>
        <TableCell className="py-1 px-2 w-28"><span className="text-gray-700 text-xs truncate block">{project.contact_person || '-'}</span></TableCell>
        <TableCell className="py-1 px-2 w-44" onClick={e => handleVaoClick(e, project)}>
          <button className={`text-xs font-medium w-full text-left ${vaoInfo.color} ${isVaoInherited ? 'cursor-not-allowed opacity-60' : 'hover:underline cursor-pointer'}`} disabled={updatingVao === project.id}>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs">{vaoInfo.text}</span>
                {!isVaoInherited && <Edit className="w-2.5 h-2.5 inline-block flex-shrink-0" />}
              </div>
              {(vaoInfo.dateFrom || vaoInfo.dateTo) && (
                <div className="flex items-center gap-0.5 text-xs">
                  <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="font-mono text-xs">
                    {vaoInfo.dateFrom && vaoInfo.dateTo ? `${vaoInfo.dateFrom}-${vaoInfo.dateTo}` : vaoInfo.dateFrom ? `ab ${vaoInfo.dateFrom}` : `bis ${vaoInfo.dateTo}`}
                  </span>
                  {vaoInfo.daysInfo && <span className="font-semibold text-xs">({vaoInfo.daysInfo})</span>}
                </div>
              )}
              {vaoInfo.inherited && <span className="text-blue-600 text-xs italic">{vaoInfo.text}</span>}
            </div>
          </button>
        </TableCell>
        <TableCell className="py-1 px-2 w-20 text-center" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">BA</span>
              {project.ba_status ? (
                <div onClick={() => handleCheckboxChange(project.id, 'ba_status', null)} className={`w-4 h-4 rounded-full border cursor-pointer transition-all ${project.ba_status === 'rot' ? 'bg-red-500 border-red-600' : project.ba_status === 'gelb' ? 'bg-yellow-500 border-yellow-600' : 'bg-green-500 border-green-600'}`} title="Klicken zum Zurücksetzen" />
              ) : (
                <Select value="" onValueChange={v => handleCheckboxChange(project.id, 'ba_status', v)} disabled={updatingProject === project.id}>
                  <SelectTrigger className="h-5 w-12 text-xs p-0 border-dashed"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rot">🔴</SelectItem>
                    <SelectItem value="gelb">🟡</SelectItem>
                    <SelectItem value="grün">🟢</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">FA</span>
              {project.fa_status ? (
                <div onClick={() => handleCheckboxChange(project.id, 'fa_status', null)} className={`w-4 h-4 rounded-full border cursor-pointer transition-all ${project.fa_status === 'rot' ? 'bg-red-500 border-red-600' : project.fa_status === 'gelb' ? 'bg-yellow-500 border-yellow-600' : 'bg-green-500 border-green-600'}`} title="Klicken zum Zurücksetzen" />
              ) : (
                <Select value="" onValueChange={v => handleCheckboxChange(project.id, 'fa_status', v)} disabled={updatingProject === project.id}>
                  <SelectTrigger className="h-5 w-12 text-xs p-0 border-dashed"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rot">🔴</SelectItem>
                    <SelectItem value="gelb">🟡</SelectItem>
                    <SelectItem value="grün">🟢</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="py-1 px-2 w-36">
          <div className="text-xs space-y-0.5">
            {project.start_date && <div className="flex items-center gap-0.5 text-blue-600"><Calendar className="w-2.5 h-2.5" /><span className="text-xs">E: {new Date(project.start_date).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit'})}</span></div>}
            {project.end_date && <div className="flex items-center gap-0.5 text-green-600"><Calendar className="w-2.5 h-2.5" /><span className="text-xs">F: {new Date(project.end_date).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit'})}</span></div>}
            {project.grube_auf_datum && <div className="flex items-center gap-0.5 text-orange-600"><Shovel className="w-2.5 h-2.5" /><span className="text-xs">G: {new Date(project.grube_auf_datum).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit'})}</span></div>}
            {project.kann_zu_meldung_datum && <div className="flex items-center gap-0.5 text-purple-600"><CheckCircle className="w-2.5 h-2.5" /><span className="text-xs">K: {new Date(project.kann_zu_meldung_datum).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit'})}</span></div>}
          </div>
        </TableCell>
        <TableCell className="py-1 px-2 w-52" onClick={e => e.stopPropagation()}>
          <Select value={project.project_status || ''} onValueChange={v => handleStatusChange(project.id, v)} disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'project_status')}>
            <SelectTrigger className={`w-full h-7 text-xs ${projectStatusColors[project.project_status] || 'bg-gray-100'}`}><SelectValue placeholder="Status"/></SelectTrigger>
            <SelectContent>{projectStatusOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-1 px-2 text-center w-16" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={project.material_booking_completed || false} onChange={e => handleCheckboxChange(project.id, 'material_booking_completed', e.target.checked)} disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'material_booking_completed')} className="w-3.5 h-3.5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500" />
        </TableCell>
        <TableCell className="py-1 px-2 text-center w-16" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={project.documentation_completed || false} onChange={e => handleCheckboxChange(project.id, 'documentation_completed', e.target.checked)} disabled={updatingProject === project.id || (confirmDialog.show && confirmDialog.projectId === project.id && confirmDialog.field === 'documentation_completed')} className="w-3.5 h-3.5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500" />
        </TableCell>
        <TableCell className="py-1 px-2 text-center w-16" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-0.5">
              <input type="checkbox" checked={project.ev_ta || false} onChange={e => handleCheckboxChange(project.id, 'ev_ta', e.target.checked)} disabled={updatingProject === project.id} className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
              <span className="text-xs text-gray-600">TA</span>
            </div>
            <div className="flex items-center gap-0.5">
              <input type="checkbox" checked={project.ev_sa || false} onChange={e => handleCheckboxChange(project.id, 'ev_sa', e.target.checked)} disabled={updatingProject === project.id} className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
              <span className="text-xs text-gray-600">SA</span>
            </div>
          </div>
        </TableCell>
      </motion.tr>
    );
  });

  return (
    <>
      <Card className="card-elevation border-none hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                {/* Spalten-Titel Zeile */}
                <TableRow className="h-8 bg-gray-50">
                  <TableHead className="py-1 px-2 w-32 text-xs font-semibold text-gray-700">Projekt-Nr.</TableHead>
                  <TableHead className="py-1 px-2 w-28 text-xs font-semibold text-gray-700">Auftragsart</TableHead>
                  <TableHead className="py-1 px-2 w-24 text-xs font-semibold text-gray-700">SM</TableHead>
                  <TableHead className="py-1 px-2 w-28 text-xs font-semibold text-gray-700">Stadt</TableHead>
                  <TableHead className="py-1 px-2 w-36 text-xs font-semibold text-gray-700">Straße</TableHead>
                  <TableHead className="py-1 px-2 w-28 text-xs font-semibold text-gray-700">Ansprechp.</TableHead>
                  <TableHead className="py-1 px-2 w-44 text-xs font-semibold text-gray-700">VAO</TableHead>
                  <TableHead className="py-1 px-2 w-20 text-center text-xs font-semibold text-gray-700">BA/FA</TableHead>
                  <TableHead className="py-1 px-2 w-36 text-xs font-semibold text-gray-700">Termine</TableHead>
                  <TableHead className="py-1 px-2 w-52 text-xs font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="py-1 px-2 w-16 text-center text-xs font-semibold text-gray-700">Mat.</TableHead>
                  <TableHead className="py-1 px-2 w-16 text-center text-xs font-semibold text-gray-700">Dok.</TableHead>
                  <TableHead className="py-1 px-2 w-16 text-center text-xs font-semibold text-gray-700">EV</TableHead>
                </TableRow>
                {/* Spalten-Filter Zeile */}
                <TableRow className="bg-orange-50/40 border-b border-orange-100">
                  <TableHead className="py-1 px-2 w-32">
                    <ColFilter value={colFilters.project_number} onChange={v => setColFilter('project_number', v)} placeholder="Nr..." />
                  </TableHead>
                  <TableHead className="py-1 px-2 w-28">
                    <ColSelectFilter value={colFilters.order_type} onChange={v => setColFilter('order_type', v)} options={unique('order_type')} />
                  </TableHead>
                  <TableHead className="py-1 px-2 w-24">
                    <ColFilter value={colFilters.sm_number} onChange={v => setColFilter('sm_number', v)} placeholder="SM..." />
                  </TableHead>
                  <TableHead className="py-1 px-2 w-28">
                    <ColSelectFilter value={colFilters.city} onChange={v => setColFilter('city', v)} options={unique('city')} />
                  </TableHead>
                  <TableHead className="py-1 px-2 w-36">
                    <ColFilter value={colFilters.street} onChange={v => setColFilter('street', v)} placeholder="Straße..." />
                  </TableHead>
                  <TableHead className="py-1 px-2 w-28">
                    <ColSelectFilter value={colFilters.contact_person} onChange={v => setColFilter('contact_person', v)} options={unique('contact_person')} />
                  </TableHead>
                  <TableHead className="py-1 px-2 w-44">
                    {/* VAO hat keinen einfachen Spaltenfilter */}
                    {hasColFilters && (
                      <button onClick={() => setColFilters({ project_number:"", order_type:"", sm_number:"", city:"", street:"", contact_person:"", project_status:"" })} className="text-xs text-orange-600 hover:underline flex items-center gap-1 mt-1">
                        <X className="w-3 h-3" /> Leeren
                      </button>
                    )}
                  </TableHead>
                  <TableHead className="py-1 px-2 w-20"></TableHead>
                  <TableHead className="py-1 px-2 w-36"></TableHead>
                  <TableHead className="py-1 px-2 w-52">
                    <ColSelectFilter value={colFilters.project_status} onChange={v => setColFilter('project_status', v)} options={unique('project_status')} />
                  </TableHead>
                  <TableHead className="py-1 px-2 w-16"></TableHead>
                  <TableHead className="py-1 px-2 w-16"></TableHead>
                  <TableHead className="py-1 px-2 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredMain.length === 0 && filteredFollowUps.size === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-64">
                        <div className="text-center py-16">
                          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-xl font-medium text-gray-500 mb-2">Keine Projekte gefunden</h3>
                          <p className="text-gray-400">Versuchen Sie, Ihre Filter anzupassen.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMain.map((project, mainIndex) => {
                      let rowIndex = mainIndex;
                      const rows = [<ProjectRow key={project.id} project={project} rowIndex={rowIndex} />];
                      if (filteredFollowUps.has(project.id)) {
                        filteredFollowUps.get(project.id).forEach(followUp => {
                          rowIndex++;
                          rows.push(<ProjectRow key={followUp.id} project={followUp} isFollowUp={true} rowIndex={rowIndex} />);
                        });
                      }
                      return rows;
                    })
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        <AnimatePresence>
          {[...mainProjects, ...Array.from(followUpsByParent.values()).flat()]
            .filter(applyColFilters)
            .sort((a, b) => (a.project_number || '').localeCompare(b.project_number || ''))
            .map((project, index) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: index * 0.05 }}>
                <Card className="card-elevation border-l-4 border-orange-400" onClick={() => window.open(createPageUrl(`ProjectDetail?id=${project.id}`), '_self')}>
                  <CardContent className="p-4 space-y-3">
                    <p className="font-semibold text-gray-800"><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{project.project_number}</span></p>
                    <div className="border-t pt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Stadt</span><span className="font-medium text-gray-800">{project.city || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Auftragsart</span><span className="font-medium text-gray-800">{project.order_type || '-'}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Status</span>
                        <span className={`font-medium text-gray-800 rounded px-2 py-1 text-xs ${projectStatusColors[project.project_status] || 'bg-gray-100'}`}>{project.project_status || '-'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </>
  );
}
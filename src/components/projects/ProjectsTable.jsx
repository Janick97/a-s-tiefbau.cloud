import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Shovel, Calendar, Edit, CornerDownRight, CheckCircle, ChevronDown, ChevronUp, X, Search } from "lucide-react";
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

// Native-style Text-Input-Filter mit Chevrons
function TextColFilter({ value, onChange, placeholder }) {
  return (
    <div className="relative mt-1" onClick={e => e.stopPropagation()}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Filter..."}
        className={`w-full h-7 px-2 pr-6 text-xs rounded border transition-colors focus:outline-none focus:border-blue-400 ${
          value ? "border-blue-400 bg-blue-50 text-blue-800" : "border-gray-300 bg-white text-gray-600"
        }`}
        onClick={e => e.stopPropagation()}
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col pointer-events-none">
        <ChevronUp className="w-2.5 h-2.5 text-gray-400" />
        <ChevronDown className="w-2.5 h-2.5 text-gray-400 -mt-0.5" />
      </div>
      {value && (
        <button onClick={e => { e.stopPropagation(); onChange(""); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Dropdown-Filter mit Suchfeld und Radio-Buttons (native select style)
function ColFilter({ selected, onChange, options, placeholder, searchPlaceholder, renderOption }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => String(o).toLowerCase().includes(search.toLowerCase()));
  const isActive = selected !== "" && selected !== null && selected !== undefined;

  const select = (val) => {
    onChange(val === selected ? "" : val);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative mt-1" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between h-7 px-2 rounded border text-xs transition-colors ${
          isActive
            ? "border-blue-400 bg-blue-50 text-blue-800"
            : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
        }`}
      >
        <span className="truncate max-w-[75%] text-left">
          {isActive ? selected : (placeholder || "Alle")}
        </span>
        <div className="flex flex-col flex-shrink-0 ml-1">
          <ChevronUp className="w-2.5 h-2.5 text-gray-400" />
          <ChevronDown className="w-2.5 h-2.5 text-gray-400 -mt-0.5" />
        </div>
      </button>

      {open && (
        <div className="absolute top-8 left-0 z-[100] w-72 bg-white border border-gray-200 rounded shadow-xl">
          <div className="p-1.5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder || "Suchen..."}
                className="w-full h-7 pl-6 pr-2 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-3">Keine Ergebnisse</div>
            ) : (
              filtered.map(opt => (
                <label
                  key={opt}
                  onClick={() => select(opt)}
                  className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer ${selected === opt ? 'bg-blue-50' : ''}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected === opt ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {selected === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  {renderOption ? renderOption(opt) : <span className="text-xs text-gray-700 whitespace-normal leading-tight">{opt}</span>}
                </label>
              ))
            )}
          </div>
          {isActive && (
            <div className="border-t border-gray-100 p-1.5">
              <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-xs text-gray-500 hover:text-red-500 text-center py-0.5">
                Auswahl aufheben
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Ja/Nein Filter als kleines Dropdown
function BoolColFilter({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = value === 'yes' ? 'Ja' : value === 'no' ? 'Nein' : 'Alle';
  const isActive = value !== "";

  return (
    <div ref={ref} className="relative mt-1" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between h-7 px-2 rounded border text-xs ${
          isActive ? "border-blue-400 bg-blue-50 text-blue-800" : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
        }`}
      >
        <span>{label}</span>
        <div className="flex flex-col flex-shrink-0 ml-1">
          <ChevronUp className="w-2.5 h-2.5 text-gray-400" />
          <ChevronDown className="w-2.5 h-2.5 text-gray-400 -mt-0.5" />
        </div>
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-[100] w-28 bg-white border border-gray-200 rounded shadow-xl py-1">
          {[{ val: "", label: "Alle" }, { val: "yes", label: "Ja" }, { val: "no", label: "Nein" }].map(o => (
            <label
              key={o.val}
              onClick={() => { onChange(o.val); setOpen(false); }}
              className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs ${value === o.val ? 'bg-blue-50' : ''}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${value === o.val ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                {value === o.val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// BA/FA Farb-Filter als Dropdown
function ColorColFilter({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    { val: "rot", label: "Rot", circle: "bg-red-500" },
    { val: "gelb", label: "Gelb", circle: "bg-yellow-400" },
    { val: "grün", label: "Grün", circle: "bg-green-500" },
  ];
  const isActive = value !== "";
  const selected = options.find(o => o.val === value);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between h-7 px-2 rounded border text-xs ${
          isActive ? "border-blue-400 bg-blue-50 text-blue-800" : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
        }`}
      >
        <span className="flex items-center gap-1">
          {selected && <span className={`w-2.5 h-2.5 rounded-full ${selected.circle} flex-shrink-0`} />}
          {selected ? selected.label : `${label}...`}
        </span>
        <div className="flex flex-col flex-shrink-0 ml-1">
          <ChevronUp className="w-2.5 h-2.5 text-gray-400" />
          <ChevronDown className="w-2.5 h-2.5 text-gray-400 -mt-0.5" />
        </div>
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-[100] w-44 bg-white border border-gray-200 rounded shadow-xl">
          <div className="p-1.5 border-b border-gray-100">
            <div className="flex items-center gap-1 px-1">
              <Search className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{label}-Status...</span>
            </div>
          </div>
          <div className="py-1">
            {options.map(o => (
              <label
                key={o.val}
                onClick={() => { onChange(value === o.val ? "" : o.val); setOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${value === o.val ? 'bg-blue-50' : ''}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${value === o.val ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {value === o.val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className={`w-3 h-3 rounded-full ${o.circle} flex-shrink-0`} />
                <span className="text-xs text-gray-700">{o.label}</span>
              </label>
            ))}
          </div>
          {isActive && (
            <div className="border-t border-gray-100 p-1">
              <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-xs text-gray-400 hover:text-red-500 text-center py-0.5">
                Auswahl aufheben
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// VAO Filter: Dropdown + Von/Bis Datum + Max Resttage
function VaoColFilter({ statusValue, onStatusChange, vaoFrom, onVaoFrom, vaoTo, onVaoTo, vaoDays, onVaoDays, options }) {
  return (
    <div className="mt-1 space-y-1" onClick={e => e.stopPropagation()}>
      <ColFilter
        selected={statusValue}
        onChange={onStatusChange}
        options={options}
        placeholder="VAO..."
        searchPlaceholder="VAO-Status suchen..."
      />
      <div className="flex gap-1">
        <input
          type="date"
          value={vaoFrom}
          onChange={e => onVaoFrom(e.target.value)}
          className={`flex-1 h-7 px-1.5 text-xs rounded border focus:outline-none focus:border-blue-400 ${vaoFrom ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white text-gray-500"}`}
          placeholder="TT.mm.jjjj"
        />
        <input
          type="date"
          value={vaoTo}
          onChange={e => onVaoTo(e.target.value)}
          className={`flex-1 h-7 px-1.5 text-xs rounded border focus:outline-none focus:border-blue-400 ${vaoTo ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white text-gray-500"}`}
          placeholder="TT.mm.jjjj"
        />
      </div>
      <input
        type="number"
        value={vaoDays}
        onChange={e => onVaoDays(e.target.value)}
        placeholder="Max. Resttage..."
        min="0"
        className={`w-full h-7 px-2 text-xs rounded border focus:outline-none focus:border-blue-400 ${vaoDays ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white text-gray-500"}`}
      />
    </div>
  );
}

const EMPTY_FILTERS = {
  project_number: "",
  order_type: "",
  sm_number: "",
  city: "",
  street: "",
  contact_person: "",
  vao_status: "",
  vao_from: "",
  vao_to: "",
  vao_days: "",
  ba_status: "",
  fa_status: "",
  project_status: "",
  material_booking_completed: "",
  documentation_completed: "",
  ev_ta: "",
  ev_sa: "",
};

export default function ProjectsTable({
  isLoading, error, mainProjects, followUpsByParent,
  getVAOInfo, handleVaoClick, updatingVao, handleCheckboxChange,
  updatingProject, confirmDialog, handleStatusChange, projectStatusOptions
}) {
  const [colFilters, setColFilters] = useState(EMPTY_FILTERS);
  const setColFilter = (col, val) => setColFilters(prev => ({ ...prev, [col]: val }));

  const hasColFilters = Object.values(colFilters).some(v => v !== "");

  const allRows = [...mainProjects, ...Array.from(followUpsByParent.values()).flat()];
  const unique = (field) => [...new Set(allRows.map(p => p[field]).filter(Boolean))].sort();
  const uniqueVaoStatus = [...new Set(allRows.map(p => p.vao_status).filter(Boolean))].sort();

  const applyColFilters = (p) => {
    const cf = colFilters;
    if (cf.project_number && !(p.project_number || '').toLowerCase().includes(cf.project_number.toLowerCase())) return false;
    if (cf.sm_number && !(p.sm_number || '').toLowerCase().includes(cf.sm_number.toLowerCase())) return false;
    if (cf.street && !(p.street || '').toLowerCase().includes(cf.street.toLowerCase())) return false;
    if (cf.order_type && (p.order_type || '') !== cf.order_type) return false;
    if (cf.city && (p.city || '') !== cf.city) return false;
    if (cf.contact_person && (p.contact_person || '') !== cf.contact_person) return false;
    if (cf.vao_status && (p.vao_status || '') !== cf.vao_status) return false;
    if (cf.vao_from && !(p.vao_valid_from && new Date(p.vao_valid_from) >= new Date(cf.vao_from))) return false;
    if (cf.vao_to && !(p.vao_valid_to && new Date(p.vao_valid_to) <= new Date(cf.vao_to))) return false;
    if (cf.vao_days && cf.vao_days.trim() !== '') {
      let effectiveProject = p;
      if (p.vao_source_project_id) {
        const src = allRows.find(r => r.id === p.vao_source_project_id);
        if (src) effectiveProject = src;
      }
      if (effectiveProject.vao_valid_to) {
        const validTo = new Date(effectiveProject.vao_valid_to);
        validTo.setHours(23, 59, 59, 999);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((validTo - today) / (1000 * 60 * 60 * 24));
        if (isNaN(parseInt(cf.vao_days)) || diffDays > parseInt(cf.vao_days)) return false;
      } else return false;
    }
    if (cf.ba_status && (p.ba_status || '') !== cf.ba_status) return false;
    if (cf.fa_status && (p.fa_status || '') !== cf.fa_status) return false;
    if (cf.project_status && (p.project_status || '') !== cf.project_status) return false;
    if (cf.material_booking_completed === 'yes' && !p.material_booking_completed) return false;
    if (cf.material_booking_completed === 'no' && p.material_booking_completed) return false;
    if (cf.documentation_completed === 'yes' && !p.documentation_completed) return false;
    if (cf.documentation_completed === 'no' && p.documentation_completed) return false;
    if (cf.ev_ta === 'yes' && !p.ev_ta) return false;
    if (cf.ev_ta === 'no' && p.ev_ta) return false;
    if (cf.ev_sa === 'yes' && !p.ev_sa) return false;
    if (cf.ev_sa === 'no' && p.ev_sa) return false;
    return true;
  };

  const filteredMain = mainProjects.filter(applyColFilters);
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
        <TableCell className="py-1 px-2 w-24 text-center" onClick={e => e.stopPropagation()}>
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
        <TableCell className="py-1 px-2 text-center w-20" onClick={e => e.stopPropagation()}>
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

  const totalActive = filteredMain.length + Array.from(filteredFollowUps.values()).flat().length;
  const boolLabel = (val) => val === 'yes' ? '✅ Ja' : val === 'no' ? '❌ Nein' : '';

  return (
    <>
      <Card className="card-elevation border-none hidden md:block">
        <CardContent className="p-0">
          {hasColFilters && (
            <div className="px-3 py-2 border-b border-blue-100 bg-blue-50/60 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Spaltenfilter aktiv:</span>
              {colFilters.project_number && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Nr: {colFilters.project_number}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('project_number', '')} /></Badge>}
              {colFilters.sm_number && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">SM: {colFilters.sm_number}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('sm_number', '')} /></Badge>}
              {colFilters.street && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Straße: {colFilters.street}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('street', '')} /></Badge>}
              {colFilters.order_type && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Art: {colFilters.order_type}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('order_type', '')} /></Badge>}
              {colFilters.city && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Stadt: {colFilters.city}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('city', '')} /></Badge>}
              {colFilters.contact_person && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Ansp.: {colFilters.contact_person}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('contact_person', '')} /></Badge>}
              {colFilters.vao_status && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">VAO: {colFilters.vao_status}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('vao_status', '')} /></Badge>}
              {colFilters.vao_from && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">VAO von: {colFilters.vao_from}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('vao_from', '')} /></Badge>}
              {colFilters.vao_to && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">VAO bis: {colFilters.vao_to}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('vao_to', '')} /></Badge>}
              {colFilters.vao_days && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Resttage ≤{colFilters.vao_days}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('vao_days', '')} /></Badge>}
              {colFilters.ba_status && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">BA: {colFilters.ba_status}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('ba_status', '')} /></Badge>}
              {colFilters.fa_status && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">FA: {colFilters.fa_status}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('fa_status', '')} /></Badge>}
              {colFilters.project_status && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Status: {colFilters.project_status}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('project_status', '')} /></Badge>}
              {colFilters.material_booking_completed && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Mat.: {boolLabel(colFilters.material_booking_completed)}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('material_booking_completed', '')} /></Badge>}
              {colFilters.documentation_completed && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">Dok.: {boolLabel(colFilters.documentation_completed)}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('documentation_completed', '')} /></Badge>}
              {colFilters.ev_ta && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">EV-TA: {boolLabel(colFilters.ev_ta)}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('ev_ta', '')} /></Badge>}
              {colFilters.ev_sa && <Badge variant="outline" className="text-xs gap-1 bg-blue-100 border-blue-300 text-blue-700">EV-SA: {boolLabel(colFilters.ev_sa)}<X className="w-3 h-3 cursor-pointer" onClick={() => setColFilter('ev_sa', '')} /></Badge>}
              <button onClick={() => setColFilters(EMPTY_FILTERS)} className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Alle leeren
              </button>
              <span className="text-xs text-gray-400">{totalActive} Treffer</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableHeader>
                <TableRow className="bg-white border-b border-gray-200 align-top">
                  <TableHead className="py-2 px-2 w-32 text-xs font-semibold text-gray-700 align-top">
                    Projektnummer
                    <TextColFilter value={colFilters.project_number} onChange={v => setColFilter('project_number', v)} placeholder="Nr..." />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-36 text-xs font-semibold text-gray-700 align-top">
                    Auftragsart
                    <ColFilter selected={colFilters.order_type} onChange={v => setColFilter('order_type', v)} options={unique('order_type')} placeholder="Filtern..." searchPlaceholder="Auftragsart suchen..." />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-24 text-xs font-semibold text-gray-700 align-top">
                    SM
                    <TextColFilter value={colFilters.sm_number} onChange={v => setColFilter('sm_number', v)} placeholder="SM..." />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-28 text-xs font-semibold text-gray-700 align-top">
                    Stadt
                    <ColFilter selected={colFilters.city} onChange={v => setColFilter('city', v)} options={unique('city')} placeholder="Stadt..." searchPlaceholder="Stadt suchen..." />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-36 text-xs font-semibold text-gray-700 align-top">
                    Straße
                    <TextColFilter value={colFilters.street} onChange={v => setColFilter('street', v)} placeholder="Straße..." />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-28 text-xs font-semibold text-gray-700 align-top">
                    Ansprechpartner
                    <ColFilter selected={colFilters.contact_person} onChange={v => setColFilter('contact_person', v)} options={unique('contact_person')} placeholder="Filtern..." searchPlaceholder="Person suchen..." />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-52 text-xs font-semibold text-gray-700 align-top">
                    VAO-Status
                    <VaoColFilter
                      statusValue={colFilters.vao_status}
                      onStatusChange={v => setColFilter('vao_status', v)}
                      vaoFrom={colFilters.vao_from}
                      onVaoFrom={v => setColFilter('vao_from', v)}
                      vaoTo={colFilters.vao_to}
                      onVaoTo={v => setColFilter('vao_to', v)}
                      vaoDays={colFilters.vao_days}
                      onVaoDays={v => setColFilter('vao_days', v)}
                      options={uniqueVaoStatus}
                    />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-36 text-xs font-semibold text-gray-700 align-top">
                    BA/FA
                    <div className="mt-1 space-y-1" onClick={e => e.stopPropagation()}>
                      <ColorColFilter value={colFilters.ba_status} onChange={v => setColFilter('ba_status', v)} label="BA" />
                      <ColorColFilter value={colFilters.fa_status} onChange={v => setColFilter('fa_status', v)} label="FA" />
                    </div>
                  </TableHead>
                  <TableHead className="py-2 px-2 w-36 text-xs font-semibold text-gray-700 align-top">
                    Termine
                  </TableHead>
                  <TableHead className="py-2 px-2 w-52 text-xs font-semibold text-gray-700 align-top">
                    Status
                    <ColFilter selected={colFilters.project_status} onChange={v => setColFilter('project_status', v)} options={unique('project_status')} placeholder="Filtern..." searchPlaceholder="Status suchen..." />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-20 text-xs font-semibold text-gray-700 align-top">
                    Material
                    <BoolColFilter value={colFilters.material_booking_completed} onChange={v => setColFilter('material_booking_completed', v)} />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-24 text-xs font-semibold text-gray-700 align-top">
                    Dokumentation
                    <BoolColFilter value={colFilters.documentation_completed} onChange={v => setColFilter('documentation_completed', v)} />
                  </TableHead>
                  <TableHead className="py-2 px-2 w-20 text-xs font-semibold text-gray-700 align-top">
                    EV
                    <div className="mt-1 space-y-1" onClick={e => e.stopPropagation()}>
                      <BoolColFilter value={colFilters.ev_ta} onChange={v => setColFilter('ev_ta', v)} />
                      <BoolColFilter value={colFilters.ev_sa} onChange={v => setColFilter('ev_sa', v)} />
                    </div>
                  </TableHead>
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
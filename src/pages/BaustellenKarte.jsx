import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Project, Excavation } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Filter, Eye, Navigation, Calendar, Save, Trash2, Route, Layers, Maximize2, Minimize2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Komponente um Map-Instanz zu speichern
function MapEvents({ setMapInstance }) {
  const map = useMapEvents({});
  
  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);
  
  return null;
}

// Custom Marker Icons
const createCustomIcon = (isBackfilled, isClosed) => {
  let color = '#f97316'; // Orange = Offen
  
  if (isClosed) {
    color = '#16a34a'; // Grün = Fertiggestellt
  } else if (isBackfilled) {
    color = '#eab308'; // Gelb = Verfüllt
  }
  
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="3"/>
        <circle cx="16" cy="16" r="5" fill="white" opacity="0.9"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: 'custom-marker-icon'
  });
};

// Custom Cluster Icon
const createClusterCustomIcon = function (cluster) {
  const childCount = cluster.getChildCount();
  let size = 60;
  let fontSize = 20;
  
  // Größere Cluster = größeres Icon
  if (childCount > 100) {
    size = 90;
    fontSize = 28;
  } else if (childCount > 50) {
    size = 75;
    fontSize = 24;
  }
  
  const svgSize = size;
  const trianglePoints = `${svgSize/2},${svgSize*0.15} ${svgSize*0.9},${svgSize*0.85} ${svgSize*0.1},${svgSize*0.85}`;
  
  return new L.DivIcon({
    html: `<div style="
      width: ${svgSize}px;
      height: ${svgSize}px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="${svgSize}" height="${svgSize}" style="position: absolute; top: 0; left: 0;">
        <polygon points="${trianglePoints}" 
          fill="#dc2626" 
          stroke="white" 
          stroke-width="4"
          filter="url(#shadow)" />
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(220, 38, 38, 0.6)"/>
          </filter>
        </defs>
      </svg>
      <div style="
        position: relative;
        color: #f97316;
        font-weight: 900;
        font-size: ${fontSize}px;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 1;
        margin-top: ${svgSize * 0.1}px;
      ">${childCount}</div>
    </div>`,
    className: 'custom-cluster-marker',
    iconSize: new L.Point(svgSize, svgSize),
    iconAnchor: new L.Point(svgSize / 2, svgSize * 0.7)
  });
};

export default function BaustellenKartePage() {
  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mapCenter, setMapCenter] = useState([51.1657, 10.4515]);
  const [mapZoom, setMapZoom] = useState(6);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Interaktive Legende
  const [showOpen, setShowOpen] = useState(true);
  const [showBackfilled, setShowBackfilled] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  
  // Gespeicherte Ansichten
  const [savedViews, setSavedViews] = useState([]);
  const [viewName, setViewName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  useEffect(() => {
    loadData();
    loadSavedViews();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsData, excavationsData] = await Promise.all([
        Project.list().catch(() => []),
        Excavation.list().catch(() => [])
      ]);
      
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setExcavations(Array.isArray(excavationsData) ? excavationsData : []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setProjects([]);
      setExcavations([]);
    }
    setIsLoading(false);
  };

  const loadSavedViews = () => {
    try {
      const views = localStorage.getItem('baustellenkarteViews');
      if (views) {
        setSavedViews(JSON.parse(views));
      }
    } catch (error) {
      console.error("Fehler beim Laden der Ansichten:", error);
    }
  };

  const saveCurrentView = () => {
    if (!viewName.trim()) return;
    
    const newView = {
      id: Date.now(),
      name: viewName,
      filters: {
        searchTerm,
        workflowStatusFilter,
        startDate,
        endDate,
        showOpen,
        showBackfilled,
        showClosed
      }
    };
    
    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem('baustellenkarteViews', JSON.stringify(updatedViews));
    setViewName("");
    setShowSaveDialog(false);
  };

  const loadView = (view) => {
    setSearchTerm(view.filters.searchTerm);
    setWorkflowStatusFilter(view.filters.workflowStatusFilter);
    setStartDate(view.filters.startDate || "");
    setEndDate(view.filters.endDate || "");
    setShowOpen(view.filters.showOpen);
    setShowBackfilled(view.filters.showBackfilled);
    setShowClosed(view.filters.showClosed);
  };

  const deleteView = (id) => {
    const updatedViews = savedViews.filter(v => v.id !== id);
    setSavedViews(updatedViews);
    localStorage.setItem('baustellenkarteViews', JSON.stringify(updatedViews));
  };

  // Baustellen mit GPS-Koordinaten vorbereiten
  const baustellenMitKoordinaten = useMemo(() => {
    const baustellen = [];
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    
    excavations.forEach(exc => {
      if (exc.latitude && exc.longitude) {
        const project = projectsMap.get(exc.project_id);
        if (project) {
          baustellen.push({
            id: exc.id,
            projectId: project.id,
            projectNumber: project.project_number,
            projectTitle: project.title,
            projectStatus: project.status,
            projectStatusLabel: project.project_status,
            client: project.client,
            orderType: project.order_type,
            startDate: project.start_date,
            endDate: project.end_date,
            locationName: exc.location_name,
            street: exc.street,
            city: exc.city,
            latitude: exc.latitude,
            longitude: exc.longitude,
            excavationStatus: exc.status,
            foreman: exc.foreman,
            surfaceType: exc.surface_type,
            surfaceType2: exc.surface_type_2,
            excavationLength: exc.excavation_length,
            excavationWidth: exc.excavation_width,
            excavationDepth: exc.excavation_depth,
            calculatedPrice: exc.calculated_price,
            isBackfilled: exc.is_backfilled,
            isClosed: exc.is_closed,
            backfilledBy: exc.backfilled_by,
            backfilledDate: exc.backfilled_date,
            closedBy: exc.closed_by,
            closedDate: exc.closed_date,
            createdDate: exc.created_date
          });
        }
      }
    });
    
    return baustellen;
  }, [projects, excavations]);

  // Gefilterte Baustellen
  const filteredBaustellen = useMemo(() => {
    return baustellenMitKoordinaten.filter(baustelle => {
      // Suchfilter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (baustelle.projectNumber || '').toLowerCase().includes(searchLower) ||
        (baustelle.projectTitle || '').toLowerCase().includes(searchLower) ||
        (baustelle.locationName || '').toLowerCase().includes(searchLower) ||
        (baustelle.city || '').toLowerCase().includes(searchLower);
      
      // Workflow-Status
      const matchesWorkflowStatus = workflowStatusFilter === "all" || baustelle.projectStatusLabel === workflowStatusFilter;
      
      // Datumsfilter
      let matchesDate = true;
      if (startDate || endDate) {
        const baustelleDate = baustelle.createdDate ? new Date(baustelle.createdDate) : null;
        if (baustelleDate) {
          if (startDate && new Date(startDate) > baustelleDate) matchesDate = false;
          if (endDate && new Date(endDate) < baustelleDate) matchesDate = false;
        }
      }
      
      // Legende-Filter (Status)
      let matchesLegend = false;
      if (baustelle.isClosed && showClosed) matchesLegend = true;
      if (baustelle.isBackfilled && !baustelle.isClosed && showBackfilled) matchesLegend = true;
      if (!baustelle.isBackfilled && !baustelle.isClosed && showOpen) matchesLegend = true;
      
      return matchesSearch && matchesWorkflowStatus && matchesDate && matchesLegend;
    });
  }, [baustellenMitKoordinaten, searchTerm, workflowStatusFilter, startDate, endDate, showOpen, showBackfilled, showClosed]);

  const handleBaustelleClick = (baustelle) => {
    if (mapInstance) {
      mapInstance.setView([baustelle.latitude, baustelle.longitude], 15, { animate: true });
    }
  };

  const openRoute = (baustelle) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${baustelle.latitude},${baustelle.longitude}`;
    window.open(url, '_blank');
  };

  const statusLabels = {
    planning: "Planung",
    active: "Aktiv",
    completed: "Abgeschlossen",
    on_hold: "Pausiert"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <style>{`
        .custom-marker-icon {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-marker-icon {
          transition: transform 0.2s ease;
        }
        .leaflet-marker-icon:hover {
          transform: scale(1.2);
        }
        .custom-cluster-marker {
          background: transparent !important;
          border: none !important;
        }
        .custom-cluster-marker > div:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 20px rgba(220, 38, 38, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-tooltip {
          background: white !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-radius: 8px !important;
          padding: 0 !important;
          max-width: 280px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        .leaflet-tooltip:before {
          display: none !important;
        }
      `}</style>
      
      <div className="max-w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Baustellenkarte</h1>
              <p className="text-gray-600">Übersicht aller Baustellen mit Standorten</p>
            </div>
            <div className="bg-white rounded-lg px-6 py-3 shadow-md">
              <p className="text-sm text-gray-600">Baustellen</p>
              <p className="text-3xl font-bold text-orange-600">{filteredBaustellen.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Filter und Suche */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Zeile 1: Suche und Status */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Suche nach Projektnummer, Titel, Standort..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={workflowStatusFilter} onValueChange={setWorkflowStatusFilter}>
                  <SelectTrigger className="w-full md:w-64">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Auftragsstatus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Auftragsstatus</SelectItem>
                    <SelectItem value="Auftrag neu im Server">Auftrag neu im Server</SelectItem>
                    <SelectItem value="Auftrag angelegt ohne VAO">Auftrag angelegt ohne VAO</SelectItem>
                    <SelectItem value="Auftrag neu VAO beantragt">Auftrag neu VAO beantragt</SelectItem>
                    <SelectItem value="VAO bei Baubeginn">VAO bei Baubeginn</SelectItem>
                    <SelectItem value="Auftrag angelegt keine VAO nötig">Auftrag angelegt keine VAO nötig</SelectItem>
                    <SelectItem value="Folgeauftrag">Folgeauftrag</SelectItem>
                    <SelectItem value="VAO von Projekt">VAO von Projekt</SelectItem>
                    <SelectItem value="Jahresgenehmigung">Jahresgenehmigung</SelectItem>
                    <SelectItem value="Aufgrabung beantragt">Aufgrabung beantragt</SelectItem>
                    <SelectItem value="Privat">Privat</SelectItem>
                    <SelectItem value="Storniert">Storniert</SelectItem>
                    <SelectItem value="Baustelle bearbeiten">Baustelle bearbeiten</SelectItem>
                    <SelectItem value="Montage neu in Craftnote angelegt">Montage neu in Craftnote angelegt</SelectItem>
                    <SelectItem value="Montage fertig">Montage fertig</SelectItem>
                    <SelectItem value="Planbare Baustelle begonnen">Planbare Baustelle begonnen</SelectItem>
                    <SelectItem value="Technisch fertig">Technisch fertig</SelectItem>
                    <SelectItem value="Kann zu VERFÜLLEN">Kann zu VERFÜLLEN</SelectItem>
                    <SelectItem value="Kann zu Pflaster/Platten">Kann zu Pflaster/Platten</SelectItem>
                    <SelectItem value="Kann zu Asphalt TRAG">Kann zu Asphalt TRAG</SelectItem>
                    <SelectItem value="Kann zu Asphalt FEIN">Kann zu Asphalt FEIN</SelectItem>
                    <SelectItem value="Baustelle fertig">Baustelle fertig</SelectItem>
                    <SelectItem value="Auftrag komplett abgeschlossen">Auftrag komplett abgeschlossen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zeile 2: Datumsfilter */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Von Datum
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Bis Datum
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                  >
                    Datum zurücksetzen
                  </Button>
                </div>
              </div>

              {/* Zeile 3: Gespeicherte Ansichten */}
              <div className="border-t pt-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Label className="text-sm font-semibold text-gray-700">Gespeicherte Ansichten:</Label>
                  {savedViews.map(view => (
                    <div key={view.id} className="flex items-center gap-1 bg-gray-100 rounded-lg px-3 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadView(view)}
                        className="h-7 px-2 text-xs"
                      >
                        {view.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteView(view.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {showSaveDialog ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Ansichtsname..."
                        value={viewName}
                        onChange={(e) => setViewName(e.target.value)}
                        className="w-40 h-8"
                        onKeyPress={(e) => e.key === 'Enter' && saveCurrentView()}
                      />
                      <Button size="sm" onClick={saveCurrentView} className="h-8">
                        Speichern
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)} className="h-8">
                        Abbrechen
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="h-8"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Aktuelle Ansicht speichern
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hauptbereich mit Karte und Liste */}
        <div className={`grid grid-cols-1 gap-6 ${isMapExpanded ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
          {/* Karte */}
          <div className={isMapExpanded ? 'lg:col-span-1' : 'lg:col-span-2'}>
            <Card className="card-elevation border-none overflow-hidden relative">
              <Button
                variant="default"
                size="sm"
                className="absolute top-4 right-4 z-[1000] shadow-lg hidden lg:flex"
                onClick={() => setIsMapExpanded(!isMapExpanded)}
              >
                {isMapExpanded ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                <span>{isMapExpanded ? 'Verkleinern' : 'Vergrößern'}</span>
              </Button>
              <CardContent className="p-0">
                <div className="h-[calc(100vh-280px)] min-h-[600px] relative">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <MapContainer
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapEvents setMapInstance={setMapInstance} />
                      
                      <MarkerClusterGroup
                        chunkedLoading
                        iconCreateFunction={createClusterCustomIcon}
                      >
                        {filteredBaustellen.map((baustelle) => (
                          <Marker
                            key={baustelle.id}
                            position={[baustelle.latitude, baustelle.longitude]}
                            icon={createCustomIcon(baustelle.isBackfilled, baustelle.isClosed)}
                          >
                            <Tooltip 
                              direction="right" 
                              offset={[10, 0]}
                              opacity={1}
                              permanent={false}
                            >
                              {/* Kompakte Header */}
                              <div style={{ 
                                background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                                padding: '8px 12px',
                                color: 'white'
                              }}>
                                <div style={{ 
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  marginBottom: '2px'
                                }}>
                                  {baustelle.projectNumber}
                                </div>
                                <div style={{ 
                                  fontSize: '11px',
                                  opacity: 0.9,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {baustelle.projectTitle}
                                </div>
                              </div>

                              {/* Content */}
                              <div style={{ 
                                padding: '10px',
                                background: 'white',
                                fontSize: '11px'
                              }}>
                                {/* Standort */}
                                <div style={{ marginBottom: '8px' }}>
                                  <div style={{ 
                                    fontWeight: '600',
                                    color: '#111827',
                                    marginBottom: '2px',
                                    fontSize: '11px'
                                  }}>
                                    {baustelle.locationName}
                                  </div>
                                  <div style={{ color: '#6b7280', fontSize: '10px' }}>
                                    {baustelle.street}, {baustelle.city}
                                  </div>
                                </div>
                                
                                {/* Maße */}
                                {(baustelle.excavationLength || baustelle.excavationWidth || baustelle.excavationDepth) && (
                                  <div style={{ 
                                    background: '#f9fafb',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    marginBottom: '6px',
                                    fontSize: '10px'
                                  }}>
                                    <div style={{ 
                                      display: 'flex',
                                      gap: '8px',
                                      flexWrap: 'wrap'
                                    }}>
                                      <span><strong>L:</strong> {baustelle.excavationLength?.toFixed(1)}m</span>
                                      <span><strong>B:</strong> {baustelle.excavationWidth?.toFixed(1)}m</span>
                                      <span><strong>T:</strong> {baustelle.excavationDepth?.toFixed(1)}m</span>
                                    </div>
                                  </div>
                                )}

                                {/* Oberflächen */}
                                {(baustelle.surfaceType || baustelle.surfaceType2) && (
                                  <div style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', fontSize: '9px' }}>
                                      {baustelle.surfaceType && (
                                        <span style={{ 
                                          background: '#dbeafe',
                                          color: '#1e40af',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontWeight: '500'
                                        }}>
                                          {baustelle.surfaceType}
                                        </span>
                                      )}
                                      {baustelle.surfaceType2 && (
                                        <span style={{ 
                                          background: '#e9d5ff',
                                          color: '#7c3aed',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontWeight: '500'
                                        }}>
                                          {baustelle.surfaceType2}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Status */}
                                <div style={{ 
                                  background: baustelle.isClosed ? '#dcfce7' : baustelle.isBackfilled ? '#fef9c3' : '#fee2e2',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  marginBottom: '6px',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  color: baustelle.isClosed ? '#166534' : baustelle.isBackfilled ? '#854d0e' : '#991b1b'
                                }}>
                                  {baustelle.isClosed ? '✅ Fertig' : baustelle.isBackfilled ? '🟡 Verfüllt' : '🔴 Offen'}
                                </div>

                                {baustelle.foreman && (
                                  <div style={{ 
                                    fontSize: '10px',
                                    color: '#6b7280',
                                    marginBottom: '6px'
                                  }}>
                                    <strong>Bauleiter:</strong> {baustelle.foreman}
                                  </div>
                                )}

                                {baustelle.calculatedPrice && (
                                  <div style={{ 
                                    fontSize: '10px',
                                    color: '#15803d',
                                    fontWeight: '600',
                                    marginBottom: '6px'
                                  }}>
                                    €{baustelle.calculatedPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <a 
                                    href={createPageUrl(`ProjectDetail?id=${baustelle.projectId}`)}
                                    style={{ 
                                      flex: 1,
                                      padding: '6px',
                                      background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                                      color: 'white',
                                      textAlign: 'center',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    Details →
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openRoute(baustelle);
                                    }}
                                    style={{ 
                                      padding: '6px',
                                      background: '#3b82f6',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    🗺️
                                  </button>
                                </div>
                              </div>
                            </Tooltip>
                          </Marker>
                        ))}
                      </MarkerClusterGroup>
                    </MapContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste der Baustellen */}
          {!isMapExpanded && (
          <div className="lg:col-span-1">
            <Card className="card-elevation border-none">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Baustellen-Liste</h3>
                <div className="space-y-3 max-h-[calc(100vh-340px)] min-h-[540px] overflow-y-auto">
                  {filteredBaustellen.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Keine Baustellen gefunden</p>
                    </div>
                  ) : (
                    filteredBaustellen.map((baustelle) => (
                      <motion.div
                        key={baustelle.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border-2 rounded-lg p-3 hover:bg-orange-50 transition-colors cursor-pointer ${
                          baustelle.isClosed ? 'border-green-400 bg-green-50/50' : 
                          baustelle.isBackfilled ? 'border-yellow-400 bg-yellow-50/50' : 
                          'border-orange-400 bg-orange-50/50'
                        }`}
                        onClick={() => handleBaustelleClick(baustelle)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                baustelle.isClosed ? 'bg-green-500' : 
                                baustelle.isBackfilled ? 'bg-yellow-500' : 
                                'bg-orange-500'
                              }`}></span>
                              <h4 className="font-semibold text-sm text-gray-900 truncate">
                                {baustelle.projectNumber}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-600 truncate">
                              {baustelle.locationName}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ml-2 flex-shrink-0 ${
                              baustelle.isClosed ? 'bg-green-100 text-green-800 border-green-300' : 
                              baustelle.isBackfilled ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                              'bg-orange-100 text-orange-800 border-orange-300'
                            }`}
                          >
                            {baustelle.isClosed ? 'Fertig' : baustelle.isBackfilled ? 'Verfüllt' : 'Offen'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{baustelle.city}</span>
                          {baustelle.street && <span className="truncate">• {baustelle.street}</span>}
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBaustelleClick(baustelle);
                            }}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Karte
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRoute(baustelle);
                            }}
                          >
                            <Route className="w-3 h-3 mr-1" />
                            Route
                          </Button>
                          <Link to={createPageUrl(`ProjectDetail?id=${baustelle.projectId}`)} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="text-xs h-7">
                              <Eye className="w-3 h-3 mr-1" />
                              Details
                            </Button>
                          </Link>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </div>

        {/* Interaktive Legende */}
        <Card className="card-elevation border-none mt-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Interaktive Legende - Leistungsstatus</h3>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="show-open"
                  checked={showOpen}
                  onCheckedChange={setShowOpen}
                />
                <Label htmlFor="show-open" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-orange-500 border-3 border-white shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Offen (nicht verfüllt)</span>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="show-backfilled"
                  checked={showBackfilled}
                  onCheckedChange={setShowBackfilled}
                />
                <Label htmlFor="show-backfilled" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-yellow-500 border-3 border-white shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Verfüllt (Oberfläche offen)</span>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="show-closed"
                  checked={showClosed}
                  onCheckedChange={setShowClosed}
                />
                <Label htmlFor="show-closed" className="flex items-center gap-2 cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-green-600 border-3 border-white shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Fertiggestellt</span>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
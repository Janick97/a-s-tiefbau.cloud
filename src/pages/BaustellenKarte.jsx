import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Project, Excavation } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { MapPin, Search, Filter, Eye, Navigation } from "lucide-react";
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

// Custom Marker Icons - IMMER sichtbar mit orangenen Punkten
const createCustomIcon = (isBackfilled, isClosed) => {
  // Verschiedene Farben je nach Status
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

export default function BaustellenKartePage() {
  const [projects, setProjects] = useState([]);
  const [excavations, setExcavations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mapCenter, setMapCenter] = useState([51.1657, 10.4515]); // Deutschland Zentrum
  const [mapZoom, setMapZoom] = useState(6);
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    loadData();
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
            excavationFactor: exc.excavation_factor,
            concreteBaseUsed: exc.concrete_base_used,
            mortarUsed: exc.mortar_used,
            gravelUsed: exc.gravel_used,
            photosBefore: exc.photos_before || [],
            photosAfter: exc.photos_after || [],
            photosEnvironment: exc.photos_environment || [],
            photosBackfill: exc.photos_backfill || [],
            photosSurface: exc.photos_surface || [],
            constructionJustification: exc.construction_justification,
            calculatedPrice: exc.calculated_price,
            isBackfilled: exc.is_backfilled,
            isClosed: exc.is_closed,
            backfilledBy: exc.backfilled_by,
            backfilledDate: exc.backfilled_date,
            closedBy: exc.closed_by,
            closedDate: exc.closed_date,
            excavationStatus: exc.status
          });
        }
      }
    });
    
    return baustellen;
  }, [projects, excavations]);

  // Gefilterte Baustellen
  const filteredBaustellen = useMemo(() => {
    return baustellenMitKoordinaten.filter(baustelle => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (baustelle.projectNumber || '').toLowerCase().includes(searchLower) ||
        (baustelle.projectTitle || '').toLowerCase().includes(searchLower) ||
        (baustelle.locationName || '').toLowerCase().includes(searchLower) ||
        (baustelle.city || '').toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || baustelle.projectStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [baustellenMitKoordinaten, searchTerm, statusFilter]);

  const handleBaustelleClick = (baustelle) => {
    if (mapInstance) {
      mapInstance.setView([baustelle.latitude, baustelle.longitude], 15, { animate: true });
    }
  };

  const statusLabels = {
    planning: "Planung",
    active: "Aktiv",
    completed: "Abgeschlossen",
    on_hold: "Pausiert"
  };

  // Helper: Alle Fotos einer Baustelle sammeln
  const getAllPhotos = (baustelle) => {
    const allPhotos = [];
    
    if (Array.isArray(baustelle.photosBefore) && baustelle.photosBefore.length > 0) {
      baustelle.photosBefore.forEach(url => allPhotos.push({ url, type: 'Vorher' }));
    }
    if (Array.isArray(baustelle.photosEnvironment) && baustelle.photosEnvironment.length > 0) {
      baustelle.photosEnvironment.forEach(url => allPhotos.push({ url, type: 'Umfeld' }));
    }
    if (Array.isArray(baustelle.photosBackfill) && baustelle.photosBackfill.length > 0) {
      baustelle.photosBackfill.forEach(url => allPhotos.push({ url, type: 'Verfüllung' }));
    }
    if (Array.isArray(baustelle.photosSurface) && baustelle.photosSurface.length > 0) {
      baustelle.photosSurface.forEach(url => allPhotos.push({ url, type: 'Oberfläche' }));
    }
    if (Array.isArray(baustelle.photosAfter) && baustelle.photosAfter.length > 0) {
      baustelle.photosAfter.forEach(url => allPhotos.push({ url, type: 'Nachher' }));
    }
    
    return allPhotos;
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
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .photo-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .photo-item:hover {
          transform: scale(1.05);
        }
        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-badge {
          position: absolute;
          bottom: 4px;
          left: 4px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
        }
        .scrollable-photos {
          max-height: 200px;
          overflow-y: auto;
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="planning">Planung</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="on_hold">Pausiert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Hauptbereich mit Karte und Liste */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Karte */}
          <div className="lg:col-span-2">
            <Card className="card-elevation border-none overflow-hidden">
              <CardContent className="p-0">
                <div className="h-[600px] relative">
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
                      
                      {filteredBaustellen.map((baustelle) => {
                      const allPhotos = getAllPhotos(baustelle);

                      return (
                        <Marker
                          key={baustelle.id}
                          position={[baustelle.latitude, baustelle.longitude]}
                          icon={createCustomIcon(baustelle.isBackfilled, baustelle.isClosed)}
                        >
                            <Tooltip 
                              direction="right" 
                              offset={[10, 0]}
                              opacity={1}
                              permanent={false}>
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

                                {/* Oberflächen & Material kompakt */}
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

                                {/* Status der Leistung */}
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

                                <a 
                                  href={createPageUrl(`ProjectDetail?id=${baustelle.projectId}`)}
                                  style={{ 
                                    display: 'inline-block',
                                    width: '100%',
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
                                  Details ansehen →
                                </a>
                              </div>
                            </Tooltip>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste der Baustellen */}
          <div className="lg:col-span-1">
            <Card className="card-elevation border-none">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Baustellen-Liste</h3>
                <div className="space-y-3 max-h-[540px] overflow-y-auto">
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
                        {baustelle.surfaceType && (
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="font-medium">Oberfläche:</span> {baustelle.surfaceType}
                            {baustelle.surfaceType2 && `, ${baustelle.surfaceType2}`}
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBaustelleClick(baustelle);
                            }}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Auf Karte
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
        </div>

        {/* Legende */}
        <Card className="card-elevation border-none mt-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Legende - Leistungsstatus</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-500 border-3 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm text-gray-700 font-medium">Offen (nicht verfüllt)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-500 border-3 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm text-gray-700 font-medium">Verfüllt (Oberfläche offen)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-600 border-3 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm text-gray-700 font-medium">Fertiggestellt</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
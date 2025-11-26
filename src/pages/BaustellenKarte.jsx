
import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Fix für Leaflet Marker Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Komponente zum Anpassen der Kartenansicht
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Marker Icons basierend auf Status
const createCustomIcon = (status) => {
  const colors = {
    planning: '#3b82f6',
    active: '#22c55e',
    completed: '#6b7280',
    on_hold: '#f97316'
  };
  
  const color = colors[status] || '#f97316';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
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
            calculatedPrice: exc.calculated_price
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
    setMapCenter([baustelle.latitude, baustelle.longitude]);
    setMapZoom(15);
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
        .leaflet-popup-content-wrapper {
          background: white !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
          border-radius: 16px !important;
          padding: 0 !important;
          overflow: hidden !important;
          max-width: 400px !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 400px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        .leaflet-popup-tip {
          background: white !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }
        .leaflet-popup-close-button {
          color: white !important;
          font-size: 24px !important;
          padding: 8px 12px !important;
          z-index: 10 !important;
        }
        .leaflet-popup-close-button:hover {
          color: rgba(255, 255, 255, 0.8) !important;
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
                      <MapController center={mapCenter} zoom={mapZoom} />
                      
                      {filteredBaustellen.map((baustelle) => {
                        const allPhotos = getAllPhotos(baustelle);
                        
                        return (
                          <Marker
                            key={baustelle.id}
                            position={[baustelle.latitude, baustelle.longitude]}
                            icon={createCustomIcon(baustelle.projectStatus)}
                          >
                            <Popup maxWidth={400} minWidth={350}>
                              {/* Header mit Gradient */}
                              <div style={{ 
                                background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                                padding: '20px',
                                color: 'white'
                              }}>
                                <div style={{ 
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  marginBottom: '4px'
                                }}>
                                  {baustelle.projectNumber}
                                </div>
                                <div style={{ 
                                  fontSize: '14px',
                                  opacity: 0.95
                                }}>
                                  {baustelle.projectTitle}
                                </div>
                              </div>
                              
                              {/* Content */}
                              <div style={{ 
                                padding: '20px',
                                background: 'white'
                              }}>
                                {/* Standort */}
                                <div style={{ marginBottom: '16px' }}>
                                  <div style={{ 
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    marginBottom: '8px'
                                  }}>
                                    <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      width="16" 
                                      height="16" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                      style={{ 
                                        color: '#6b7280',
                                        marginTop: '2px',
                                        flexShrink: 0
                                      }}
                                    >
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                      <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    <div style={{ fontSize: '14px' }}>
                                      <div style={{ 
                                        fontWeight: '500',
                                        color: '#111827',
                                        marginBottom: '2px'
                                      }}>
                                        {baustelle.locationName}
                                      </div>
                                      <div style={{ color: '#6b7280' }}>
                                        {baustelle.street}
                                      </div>
                                      <div style={{ color: '#6b7280' }}>
                                        {baustelle.city}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Maße */}
                                {(baustelle.excavationLength || baustelle.excavationWidth || baustelle.excavationDepth) && (
                                  <div style={{ 
                                    background: '#f9fafb',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    marginBottom: '12px'
                                  }}>
                                    <div style={{ 
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#f97316',
                                      marginBottom: '8px'
                                    }}>
                                      Abmessungen
                                    </div>
                                    <div style={{ 
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: '8px',
                                      fontSize: '13px'
                                    }}>
                                      <div>
                                        <span style={{ color: '#6b7280' }}>Länge:</span>{' '}
                                        <span style={{ fontWeight: '600' }}>{baustelle.excavationLength?.toFixed(2) || '0.00'}m</span>
                                      </div>
                                      <div>
                                        <span style={{ color: '#6b7280' }}>Breite:</span>{' '}
                                        <span style={{ fontWeight: '600' }}>{baustelle.excavationWidth?.toFixed(2) || '0.00'}m</span>
                                      </div>
                                      <div>
                                        <span style={{ color: '#6b7280' }}>Tiefe:</span>{' '}
                                        <span style={{ fontWeight: '600' }}>{baustelle.excavationDepth?.toFixed(2) || '0.00'}m</span>
                                      </div>
                                      {baustelle.excavationFactor && baustelle.excavationFactor !== 1 && (
                                        <div>
                                          <span style={{ color: '#6b7280' }}>Faktor:</span>{' '}
                                          <span style={{ fontWeight: '600' }}>{baustelle.excavationFactor}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Oberflächen & Material */}
                                {(baustelle.surfaceType || baustelle.surfaceType2 || baustelle.concreteBaseUsed || baustelle.mortarUsed || baustelle.gravelUsed) && (
                                  <div style={{ marginBottom: '12px' }}>
                                    {(baustelle.surfaceType || baustelle.surfaceType2) && (
                                      <div style={{ marginBottom: '8px' }}>
                                        <div style={{ 
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          color: '#3b82f6',
                                          marginBottom: '4px'
                                        }}>
                                          Oberfläche
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                          {baustelle.surfaceType && (
                                            <span style={{ 
                                              background: '#dbeafe',
                                              color: '#1e40af',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              fontSize: '11px',
                                              fontWeight: '500'
                                            }}>
                                              {baustelle.surfaceType}
                                            </span>
                                          )}
                                          {baustelle.surfaceType2 && (
                                            <span style={{ 
                                              background: '#e9d5ff',
                                              color: '#7c3aed',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              fontSize: '11px',
                                              fontWeight: '500'
                                            }}>
                                              {baustelle.surfaceType2}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {(baustelle.concreteBaseUsed || baustelle.mortarUsed || baustelle.gravelUsed) && (
                                      <div>
                                        <div style={{ 
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          color: '#10b981',
                                          marginBottom: '4px'
                                        }}>
                                          Material
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                          {baustelle.concreteBaseUsed && (
                                            <span style={{ 
                                              background: '#d1fae5',
                                              color: '#065f46',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              fontSize: '11px'
                                            }}>
                                              Unterbeton
                                            </span>
                                          )}
                                          {baustelle.mortarUsed && (
                                            <span style={{ 
                                              background: '#d1fae5',
                                              color: '#065f46',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              fontSize: '11px'
                                            }}>
                                              Mörtel
                                            </span>
                                          )}
                                          {baustelle.gravelUsed && (
                                            <span style={{ 
                                              background: '#d1fae5',
                                              color: '#065f46',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              fontSize: '11px'
                                            }}>
                                              Splitt
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Tiefbaubegründung */}
                                {baustelle.constructionJustification && (
                                  <div style={{ 
                                    background: '#fef3c7',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    marginBottom: '12px'
                                  }}>
                                    <div style={{ 
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      color: '#92400e',
                                      marginBottom: '4px'
                                    }}>
                                      Tiefbaubegründung
                                    </div>
                                    <div style={{ 
                                      fontSize: '12px',
                                      color: '#78350f',
                                      lineHeight: '1.4'
                                    }}>
                                      {baustelle.constructionJustification}
                                    </div>
                                  </div>
                                )}

                                {/* Fotos */}
                                {allPhotos.length > 0 && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <div style={{ 
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#6b7280',
                                      marginBottom: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        width="14" 
                                        height="14" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                      >
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                      </svg>
                                      Fotos ({allPhotos.length})
                                    </div>
                                    <div className="photo-grid scrollable-photos">
                                      {allPhotos.slice(0, 6).map((photo, idx) => (
                                        <div key={idx} className="photo-item" onClick={() => window.open(photo.url, '_blank')}>
                                          <img src={photo.url} alt={`Foto ${idx + 1}`} />
                                          <div className="photo-badge">{photo.type}</div>
                                        </div>
                                      ))}
                                    </div>
                                    {allPhotos.length > 6 && (
                                      <div style={{ 
                                        textAlign: 'center',
                                        marginTop: '8px',
                                        fontSize: '11px',
                                        color: '#6b7280'
                                      }}>
                                        +{allPhotos.length - 6} weitere Fotos
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Status & Info */}
                                <div style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  paddingTop: '12px',
                                  borderTop: '1px solid #f3f4f6',
                                  marginBottom: '12px'
                                }}>
                                  <span style={{ 
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    background: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    color: '#374151'
                                  }}>
                                    {statusLabels[baustelle.projectStatus]}
                                  </span>
                                  {baustelle.orderType && (
                                    <span style={{ 
                                      fontSize: '11px',
                                      color: '#6b7280',
                                      marginLeft: '8px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {baustelle.orderType}
                                    </span>
                                  )}
                                </div>
                                
                                {baustelle.foreman && (
                                  <div style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    marginBottom: '12px'
                                  }}>
                                    <div style={{ 
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      background: '#fed7aa',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <span style={{ 
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#c2410c'
                                      }}>
                                        {baustelle.foreman.charAt(0)}
                                      </span>
                                    </div>
                                    <span>{baustelle.foreman}</span>
                                  </div>
                                )}
                                
                                {baustelle.calculatedPrice && (
                                  <div style={{ 
                                    background: '#dcfce7',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    marginBottom: '12px'
                                  }}>
                                    <div style={{ 
                                      fontSize: '11px',
                                      color: '#166534',
                                      marginBottom: '2px'
                                    }}>
                                      Kalkulierter Preis
                                    </div>
                                    <div style={{ 
                                      fontSize: '18px',
                                      fontWeight: 'bold',
                                      color: '#15803d'
                                    }}>
                                      €{baustelle.calculatedPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                )}
                                
                                <a 
                                  href={createPageUrl(`ProjectDetail?id=${baustelle.projectId}`)}
                                  style={{ 
                                    display: 'inline-block',
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                                    color: 'white',
                                    textAlign: 'center',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)';
                                  }}
                                >
                                  Details ansehen
                                </a>
                              </div>
                            </Popup>
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
                        className="border rounded-lg p-3 hover:bg-orange-50 transition-colors cursor-pointer"
                        onClick={() => handleBaustelleClick(baustelle)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">
                              {baustelle.projectNumber}
                            </h4>
                            <p className="text-xs text-gray-600 truncate">
                              {baustelle.locationName}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                            {statusLabels[baustelle.projectStatus]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{baustelle.city}</span>
                        </div>
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
            <h3 className="font-semibold text-gray-900 mb-3">Legende</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                <span className="text-sm text-gray-700">Planung</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
                <span className="text-sm text-gray-700">Aktiv</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow"></div>
                <span className="text-sm text-gray-700">Abgeschlossen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow"></div>
                <span className="text-sm text-gray-700">Pausiert</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

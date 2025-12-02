import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

export default function EVergabeExport({ project, excavations, priceItems, montageLeistungen = [], montagePreisItems = [] }) {
  const getPriceItemName = (priceItemId) => {
    const item = priceItems.find(p => p.id === priceItemId);
    return item ? item.description : 'Unbekannt';
  };

  const getSurfaceDescription = (excavation) => {
    const surfaces = [];
    if (excavation.surface_type) surfaces.push(excavation.surface_type);
    if (excavation.surface_type_2) surfaces.push(excavation.surface_type_2);
    return surfaces.length > 0 ? surfaces.join(', ') : 'Nicht angegeben';
  };

  const getMaterialDescription = (excavation) => {
    const materials = [];
    if (excavation.concrete_base_used) materials.push('Unterbeton');
    if (excavation.mortar_used) materials.push('Mörtel');
    if (excavation.gravel_used) materials.push('Splitt');
    return materials.length > 0 ? materials.join(', ') : 'Nicht angegeben';
  };

  const getMontagePriceItemName = (priceItemId) => {
    const item = montagePreisItems.find(p => p.id === priceItemId);
    return item ? `${item.item_number} - ${item.description}` : 'Unbekannt';
  };

  return (
    <div className="bg-white p-8 evergabe-export-container" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
      <style>
        {`
          .evergabe-export-container {
            font-family: Arial, sans-serif;
            color: #1a1a1a;
          }
          
          .evergabe-header {
            border-bottom: 3px solid #f97316;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .evergabe-position {
            page-break-inside: avoid;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            background-color: #fafafa;
          }
          
          .evergabe-position-header {
            background-color: #f97316;
            color: white;
            padding: 12px 16px;
            border-radius: 6px 6px 0 0;
            margin: -20px -20px 15px -20px;
            font-weight: bold;
            font-size: 16px;
          }
          
          .evergabe-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          
          .evergabe-info-item {
            background-color: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
          }
          
          .evergabe-info-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
          }
          
          .evergabe-info-value {
            font-size: 14px;
            color: #1f2937;
            font-weight: 500;
          }
          
          .evergabe-photos {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
          }
          
          .evergabe-photo-container {
            background-color: white;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .evergabe-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .evergabe-photo-placeholder {
            color: #9ca3af;
            font-size: 14px;
            text-align: center;
            padding: 20px;
          }
          
          .evergabe-section {
            background-color: white;
            padding: 12px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
            margin-bottom: 15px;
          }
          
          .evergabe-section-title {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 8px;
          }
          
          .evergabe-section-content {
            font-size: 14px;
            color: #1f2937;
            white-space: pre-wrap;
          }
          
          @media print {
            body * {
              visibility: hidden;
            }
            
            .evergabe-print-container,
            .evergabe-print-container * {
              visibility: visible !important;
            }
            
            .evergabe-print-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
            }
            
            .evergabe-export-container {
              width: 100%;
              padding: 15mm;
            }
            
            .evergabe-position {
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="evergabe-header">
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px', color: '#1f2937' }}>
          E-Vergabe Export
        </h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>PROJEKTNUMMER: </span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f97316' }}>{project.project_number}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>SM-NUMMER: </span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f97316' }}>{project.sm_number}</span>
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin style={{ width: '16px', height: '16px', color: '#6b7280' }} />
          <span style={{ fontSize: '14px', color: '#374151' }}>
            {project.street ? `${project.street}, ` : ''}{project.city || 'Nicht angegeben'}
          </span>
        </div>
      </div>

      {/* Tiefbau-Leistungen */}
      {excavations.length > 0 && (
        <>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937', borderBottom: '2px solid #f97316', paddingBottom: '10px' }}>
            Tiefbau-Leistungen
          </h2>
          {excavations.map((excavation, index) => {
          // Get first 2 photos - with safety checks
          const allPhotos = [
            ...(Array.isArray(excavation.photos_before) ? excavation.photos_before : []),
            ...(Array.isArray(excavation.photos_after) ? excavation.photos_after : []),
            ...(Array.isArray(excavation.photos_environment) ? excavation.photos_environment : []),
            ...(Array.isArray(excavation.photos_backfill) ? excavation.photos_backfill : []),
            ...(Array.isArray(excavation.photos_surface) ? excavation.photos_surface : [])
          ].filter(photo => photo && typeof photo === 'string');
          const photos = allPhotos.slice(0, 2);

          return (
            <div key={excavation.id} className="evergabe-position">
              <div className="evergabe-position-header">
                Position {index + 1}: {excavation.location_name}
              </div>

              <div className="evergabe-info-grid">
                <div className="evergabe-info-item">
                  <div className="evergabe-info-label">Leistung</div>
                  <div className="evergabe-info-value">{getPriceItemName(excavation.price_item_id)}</div>
                </div>

                <div className="evergabe-info-item">
                  <div className="evergabe-info-label">Aufmaß</div>
                  <div className="evergabe-info-value">
                    {excavation.quantity} {excavation.price_item_id ? (priceItems.find(p => p.id === excavation.price_item_id)?.unit || 'ST') : 'ST'}
                  </div>
                </div>

                <div className="evergabe-info-item">
                  <div className="evergabe-info-label">Adresse</div>
                  <div className="evergabe-info-value" style={{ fontSize: '12px' }}>
                    {excavation.street} {excavation.house_number}, {excavation.city}
                  </div>
                </div>

                <div className="evergabe-info-item">
                  <div className="evergabe-info-label">Preis</div>
                  <div className="evergabe-info-value" style={{ color: '#059669' }}>
                    €{Math.round(excavation.calculated_price || 0).toLocaleString('de-DE')}
                  </div>
                </div>
              </div>

              {/* Tiefbaubegründung */}
              {excavation.construction_justification && (
                <div className="evergabe-section">
                  <div className="evergabe-section-title">Tiefbaubegründung</div>
                  <div className="evergabe-section-content">{excavation.construction_justification}</div>
                </div>
              )}

              {/* Oberfläche */}
              <div className="evergabe-section">
                <div className="evergabe-section-title">Oberfläche</div>
                <div className="evergabe-section-content">{getSurfaceDescription(excavation)}</div>
              </div>

              {/* Material */}
              <div className="evergabe-section">
                <div className="evergabe-section-title">Verwendete Materialien</div>
                <div className="evergabe-section-content">{getMaterialDescription(excavation)}</div>
              </div>

              {/* Abmessungen */}
              <div className="evergabe-info-grid" style={{ marginTop: '15px' }}>
                <div className="evergabe-info-item">
                  <div className="evergabe-info-label">Länge</div>
                  <div className="evergabe-info-value">{excavation.excavation_length || 1.2} m</div>
                </div>
                <div className="evergabe-info-item">
                  <div className="evergabe-info-label">Breite</div>
                  <div className="evergabe-info-value">{excavation.excavation_width || 1.0} m</div>
                </div>
                <div className="evergabe-info-item">
                  <div className="evergabe-info-label">Tiefe</div>
                  <div className="evergabe-info-value">{excavation.excavation_depth || 1.0} m</div>
                </div>
                {excavation.excavation_factor && excavation.excavation_factor !== 1 && (
                  <div className="evergabe-info-item">
                    <div className="evergabe-info-label">Faktor</div>
                    <div className="evergabe-info-value">{excavation.excavation_factor}</div>
                  </div>
                )}
              </div>

              {/* Photos - Platzhalter ohne tatsächliche Bilder */}
              <div className="evergabe-photos">
                <div className="evergabe-photo-container">
                  <div className="evergabe-photo-placeholder">Foto 1 (später einfügen)</div>
                </div>
                <div className="evergabe-photo-container">
                  <div className="evergabe-photo-placeholder">Foto 2 (später einfügen)</div>
                </div>
              </div>
            </div>
          );
        })}
        </>
      )}

      {/* Montage-Leistungen */}
      {montageLeistungen.length > 0 && (
        <>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '40px', marginBottom: '20px', color: '#1f2937', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
            Montage-Leistungen
          </h2>
          {montageLeistungen.map((leistung, index) => {
            const photos = (Array.isArray(leistung.photos) ? leistung.photos.filter(p => p && typeof p === 'string') : []).slice(0, 2);

            return (
              <div key={leistung.id} className="evergabe-position" style={{ borderColor: '#2563eb' }}>
                <div className="evergabe-position-header" style={{ backgroundColor: '#2563eb' }}>
                  Montage Position {index + 1}: {leistung.location_name || 'Standort nicht angegeben'}
                </div>

                <div className="evergabe-info-grid">
                  <div className="evergabe-info-item">
                    <div className="evergabe-info-label">Leistung</div>
                    <div className="evergabe-info-value" style={{ fontSize: '12px' }}>{getMontagePriceItemName(leistung.preis_item_id)}</div>
                  </div>

                  <div className="evergabe-info-item">
                    <div className="evergabe-info-label">Menge</div>
                    <div className="evergabe-info-value">
                      {leistung.quantity} {montagePreisItems.find(p => p.id === leistung.preis_item_id)?.unit || 'ST'}
                    </div>
                  </div>

                  <div className="evergabe-info-item">
                    <div className="evergabe-info-label">Preis</div>
                    <div className="evergabe-info-value" style={{ color: '#059669' }}>
                      €{(leistung.calculated_price || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="evergabe-info-item">
                    <div className="evergabe-info-label">Datum</div>
                    <div className="evergabe-info-value">
                      {leistung.completion_date ? new Date(leistung.completion_date).toLocaleDateString('de-DE') : '-'}
                    </div>
                  </div>

                  <div className="evergabe-info-item">
                    <div className="evergabe-info-label">Monteur</div>
                    <div className="evergabe-info-value">{leistung.monteur_name || 'Nicht angegeben'}</div>
                  </div>

                  {leistung.location_name && (
                    <div className="evergabe-info-item">
                      <div className="evergabe-info-label">Standort</div>
                      <div className="evergabe-info-value">{leistung.location_name}</div>
                    </div>
                  )}
                </div>

                {/* Arbeitsbeschreibung */}
                {leistung.work_description && (
                  <div className="evergabe-section">
                    <div className="evergabe-section-title">Arbeitsbeschreibung</div>
                    <div className="evergabe-section-content">{leistung.work_description}</div>
                  </div>
                )}

                {/* Notizen */}
                {leistung.notes && (
                  <div className="evergabe-section">
                    <div className="evergabe-section-title">Notizen</div>
                    <div className="evergabe-section-content">{leistung.notes}</div>
                  </div>
                )}

                {/* Photos - Platzhalter ohne tatsächliche Bilder */}
                <div className="evergabe-photos">
                  <div className="evergabe-photo-container">
                    <div className="evergabe-photo-placeholder">Foto 1 (später einfügen)</div>
                  </div>
                  <div className="evergabe-photo-container">
                    <div className="evergabe-photo-placeholder">Foto 2 (später einfügen)</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Keine Leistungen vorhanden */}
      {excavations.length === 0 && montageLeistungen.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          Keine Leistungen vorhanden
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '2px solid #e5e7eb',
        fontSize: '11px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        <p><strong>A&amp;S Tief- u. Straßenbau GmbH</strong></p>
        <p>Erstellt am: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
        <p>Seite 1 | Projekt: {project.project_number}</p>
      </div>
    </div>
  );
}
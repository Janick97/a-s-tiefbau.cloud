
import React from 'react';
import { Shovel, MapPin, Euro, Calendar, User, FileText, CheckSquare, Square, Package, Ruler, Calculator, Camera, Cable, Palette, Clock, FolderIcon, Construction } from 'lucide-react';

// ProjectCoverSheet component - created from the original "COVER PAGE" section
const ProjectCoverSheet = ({ project, excavations, materials, timesheets, documents }) => {
    if (!project) return null;

    return (
        <div className="flex flex-col h-[24cm] justify-between">
            <div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-orange-500 flex items-center justify-center rounded-lg">
                        <Construction className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800">Bauakte</h1>
                </div>
                <div className="pl-20">
                    <h2 className="text-2xl font-semibold text-gray-700">{project.title}</h2>
                    <p className="text-lg text-gray-500">Projekt-Nr: {project.project_number} / SM-Nr: {project.sm_number}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-8 p-6 border rounded-lg">
                <div><strong className="block text-gray-500">Kunde:</strong> {project.client}</div>
                <div><strong className="block text-gray-500">Zeitraum:</strong> {project.start_date ? new Date(project.start_date).toLocaleDateString('de-DE') : ''} - {project.end_date ? new Date(project.end_date).toLocaleDateString('de-DE') : ''}</div>
                <div><strong className="block text-gray-500">Ansprechpartner:</strong> {project.contact_person || '-'}</div>
                <div><strong className="block text-gray-500">Status:</strong> {project.project_status || '-'}</div>
            </div>
        </div>
    );
};

const PageBreak = () => <div style={{ pageBreakBefore: 'always' }} />;

const PrintImageGallery = ({ title, images = [] }) => {
    if (images.length === 0) return null;
    return (
        <div className="mb-4 page-break-inside-avoid">
            <h4 className="font-semibold text-gray-700 mb-2">{title}</h4>
            <div className="grid grid-cols-3 gap-2">
                {images.map((url, index) => (
                    <div key={index} className="aspect-square">
                        <img src={url} className="w-full h-full object-cover rounded border" alt={`${title} ${index + 1}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function ProjectPrintLayout({ project, excavations, pullingWorks, projectMaterials, timesheets, documents, priceItems, materials }) {
    if (!project) return null;

    const getPriceItem = (id) => priceItems.find(p => p.id === id) || {};
    const getMaterial = (id) => materials.find(m => m.id === id) || {};
    
    const COLOR_PALETTE = [
        { hex: '#FF0000', name: 'Rot' }, { hex: '#90EE90', name: 'Hellgrün' }, { hex: '#0000FF', name: 'Blau' },
        { hex: '#FFFF00', name: 'Gelb' }, { hex: '#FFFFFF', name: 'Weiß' }, { hex: '#808080', name: 'Grau' },
        { hex: '#8B4513', name: 'Braun' }, { hex: '#800080', name: 'Lila' }, { hex: '#00FFFF', name: 'Cyan' },
        { hex: '#000000', name: 'Schwarz' }, { hex: '#FFA500', name: 'Orange' }
    ];
    const getColorName = (hex) => COLOR_PALETTE.find(c => c.hex === hex)?.name || hex;

    const totalHours = timesheets.reduce((sum, entry) => sum + (entry.hours || 0), 0);

    return (
        <div className="printable-area hidden print:block bg-white text-black font-sans text-sm">
            {/* Header for all pages */}
            <style>{`
                @media print {
                    @page { size: A4; margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .page-break-before { page-break-before: always; }
                    .page-break-inside-avoid { page-break-inside: avoid; }
                    .no-break-after { page-break-after: avoid; }
                    .header-print { position: fixed; top: 0; left: 1.5cm; right: 1.5cm; height: 1.5cm; text-align: right; font-size: 0.8em; color: #888; border-bottom: 1px solid #ddd; }
                    .footer-print { position: fixed; bottom: 0; left: 1.5cm; right: 1.5cm; height: 1.5cm; text-align: right; font-size: 0.8em; color: #888; border-top: 1px solid #ddd; }
                    .content-print { margin-top: 1.5cm; margin-bottom: 1.5cm; }
                    h1, h2, h3, h4 { page-break-after: avoid; }
                }
            `}</style>
            
            {/* === DECKBLATT === */}
            <ProjectCoverSheet
                project={project}
                excavations={excavations}
                materials={materials}
                timesheets={timesheets}
                documents={documents}
            />
            
            <div style={{ pageBreakBefore: 'always' }} /> {/* Page break after the cover sheet */}
            
            <div className="header-print flex justify-between items-center">
                <span>Bauakte: {project.project_number}</span>
                <span>A&S Tiefbau.Cloud</span>
            </div>
            
            <div className="footer-print flex justify-between items-center">
                <span>Datum: {new Date().toLocaleDateString('de-DE')}</span>
                <span>Seite <span className="page-number"></span></span>
            </div>
            
            <div className="content-print">
                {/* The original COVER PAGE content has been moved to ProjectCoverSheet component */}

                {/* === EXCAVATIONS SECTION === */}
                {excavations.length > 0 && <PageBreak />}
                <h2 className="text-2xl font-bold text-gray-800 border-b-2 pb-2 mb-6">Leistungen / Ausgrabungen</h2>
                {excavations.map((exc, index) => (
                    <div key={exc.id} className="mb-6 border rounded-lg p-4 page-break-inside-avoid no-break-after">
                        <h3 className="text-lg font-semibold text-orange-600 mb-2">{index + 1}. {exc.location_name}</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div><strong className="block text-gray-500">Adresse:</strong> {exc.street} {exc.house_number}, {exc.city}</div>
                            <div><strong className="block text-gray-500">Position:</strong> {getPriceItem(exc.price_item_id)?.item_number} - {getPriceItem(exc.price_item_id)?.description}</div>
                            <div><strong className="block text-gray-500">Status:</strong> {exc.status}</div>
                        </div>
                        {exc.construction_justification && <p className="mb-2"><strong className="text-gray-500">Begründung:</strong> {exc.construction_justification}</p>}
                        
                        {getPriceItem(exc.price_item_id)?.type === 'Grube' && (
                             <div className="bg-gray-50 p-3 rounded-md my-2">
                                <h4 className="font-semibold mb-1">Abmessungen (Grube):</h4>
                                <p>L: {exc.excavation_length}m x B: {exc.excavation_width}m x T: {exc.excavation_depth}m (Faktor: {exc.excavation_factor}) = <strong>{exc.quantity.toFixed(2)} m³</strong></p>
                            </div>
                        )}
                         <div className="bg-gray-50 p-3 rounded-md my-2">
                            <h4 className="font-semibold mb-1">Oberfläche & Materialien:</h4>
                            <p><strong>Typ:</strong> {exc.surface_type || '-'}</p>
                            <p><strong>Materialien:</strong> {exc.concrete_base_used && "Unterbeton "}{exc.mortar_used && "Mörtel "}{exc.gravel_used && "Splitt"}</p>
                        </div>
                        
                        <div className="mt-4 space-y-4">
                            <PrintImageGallery title="Vorher-Bilder" images={exc.photos_before} />
                            <PrintImageGallery title="Umfeld-Bilder" images={exc.photos_environment} />
                            <PrintImageGallery title="Verfüllungs-Bilder" images={exc.photos_backfill} />
                            <PrintImageGallery title="Oberflächen-Bilder" images={exc.photos_surface} />
                            <PrintImageGallery title="Nachher-Bilder" images={exc.photos_after} />
                        </div>
                    </div>
                ))}

                {/* === PULLING WORKS SECTION === */}
                {pullingWorks.length > 0 && <PageBreak />}
                <h2 className="text-2xl font-bold text-gray-800 border-b-2 pb-2 mb-6">Einzieharbeiten</h2>
                {pullingWorks.map((work, index) => (
                    <div key={work.id} className="mb-4 border p-4 rounded-lg page-break-inside-avoid">
                        <h3 className="text-lg font-semibold text-orange-600 mb-2">{index + 1}. {work.location_name}</h3>
                        <p><strong className="text-gray-500">Beschreibung:</strong> {work.work_description}</p>
                        <p><strong className="text-gray-500">Material:</strong> {getMaterial(work.material_id)?.name || work.cable_type} ({work.cable_length}m)</p>
                        {work.connected_colors?.length > 0 && (
                            <div><strong className="text-gray-500">Konnektierte Farben:</strong> {work.connected_colors.map(getColorName).join(', ')}</div>
                        )}
                    </div>
                ))}
                
                {/* === MATERIAL SECTION === */}
                {projectMaterials.length > 0 && <PageBreak />}
                <h2 className="text-2xl font-bold text-gray-800 border-b-2 pb-2 mb-6">Materialliste</h2>
                <table className="w-full">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">Material</th><th className="p-2 text-left">Art.-Nr.</th><th className="p-2 text-right">Menge</th><th className="p-2 text-left">Einheit</th></tr></thead>
                    <tbody>
                        {projectMaterials.map(pm => {
                            const mat = getMaterial(pm.material_id);
                            return <tr key={pm.id}><td className="p-2 border-b">{mat.name}</td><td className="p-2 border-b">{mat.article_number}</td><td className="p-2 border-b text-right">{pm.quantity}</td><td className="p-2 border-b">{mat.unit}</td></tr>;
                        })}
                    </tbody>
                </table>
                
                {/* === TIMESHEET SECTION === */}
                {timesheets.length > 0 && <PageBreak />}
                <h2 className="text-2xl font-bold text-gray-800 border-b-2 pb-2 mb-6">Stundenzettel</h2>
                <table className="w-full">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">Mitarbeiter</th><th className="p-2 text-left">Tätigkeit</th><th className="p-2 text-right">Stunden</th></tr></thead>
                    <tbody>
                        {timesheets.map(entry => <tr key={entry.id}><td className="p-2 border-b">{entry.employee_name}</td><td className="p-2 border-b">{entry.work_description}</td><td className="p-2 border-b text-right">{entry.hours.toFixed(2)}</td></tr>)}
                    </tbody>
                    <tfoot><tr className="font-bold"><td colSpan="2" className="p-2 text-right">Gesamtstunden:</td><td className="p-2 text-right">{totalHours.toFixed(2)}</td></tr></tfoot>
                </table>
                 <div className="grid grid-cols-2 gap-16 mt-32">
                    <div className="pt-8 border-t border-black">Unterschrift Auftraggeber</div>
                    <div className="pt-8 border-t border-black">Unterschrift Auftragnehmer</div>
                </div>

                {/* === DOCUMENTS SECTION === */}
                {documents.length > 0 && <PageBreak />}
                <h2 className="text-2xl font-bold text-gray-800 border-b-2 pb-2 mb-6">Anlagenkorb / Dokumente</h2>
                 {folderStructure.map(folder => {
                    const folderDocs = documents.filter(doc => doc.folder === folder.name);
                    if (folderDocs.length === 0) return null;
                    return (
                        <div key={folder.name} className="mb-4 page-break-inside-avoid">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">{folder.name}</h3>
                            <ul className="list-disc pl-5">
                                {folderDocs.map(doc => <li key={doc.id}>{doc.file_name}</li>)}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Helper data used in the component
const folderStructure = [
  { name: "Aufmaß" }, { name: "Bauakte" }, { name: "Baubeginn und Fertigstellung" }, 
  { name: "Besonderheiten" }, { name: "Bilder" }, { name: "Montage" }, 
  { name: "Statusmeldung" }, { name: "VAOs" }
];

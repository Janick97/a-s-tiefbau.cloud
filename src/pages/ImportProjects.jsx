import React, { useState } from "react";
import { Project } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Info } from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core"; // Changed InvokeLLM to ExtractDataFromUploadedFile

export default function ImportProjectsPage() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/plain'
      ];
      
      const isValidType = validTypes.includes(selectedFile.type) || 
                         selectedFile.name.endsWith('.csv') || 
                         selectedFile.name.endsWith('.xlsx') || 
                         selectedFile.name.endsWith('.xls');
      
      if (isValidType) {
        setFile(selectedFile);
        setResults(null);
      } else {
        alert('Bitte wählen Sie eine Excel (.xlsx, .xls) oder CSV-Datei aus.');
      }
    }
  };

  const processImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(10);

    try {
      // 1. Datei hochladen
      const { file_url } = await UploadFile({ file });
      setProgress(30);

      // 2. Daten mit der direkten Extraktionsmethode extrahieren
      setIsProcessing(true);
      setProgress(50);
      
      const projectSchema = {
          type: "object",
          properties: {
            projects: {
              type: "array",
              description: "Eine Liste von Projekten, die aus der Datei extrahiert wurden.",
              items: {
                type: "object",
                properties: {
                  project_number: { type: "string", description: "Die eindeutige Projektnummer." },
                  sm_number: { type: "string", description: "Die SM-Nummer des Projekts." },
                  title: { type: "string", description: "Der Titel des Projekts. Kann automatisch generiert werden aus project_number, city, street und sm_number." },
                  client: { type: "string", description: "Der Kunde oder Auftraggeber." },
                  contact_person: { type: "string", description: "Der Name des Ansprechpartners für das Projekt." },
                  order_type: { type: "string", description: "Die Art des Auftrags, z.B. 'Störung Tiefbau', 'Kompakt-Entstörung', 'planbar'." },
                  project_status: { type: "string", description: "Der aktuelle Status des Projekts, z.B. 'Auftrag neu im Server', 'Baustelle fertig', 'VAO bei Baubeginn'." },
                  street: { type: "string", description: "Die Straße, in der das Projekt stattfindet." },
                  city: { type: "string", description: "Die Stadt des Projekts." },
                  start_date: { type: "string", format: "date", description: "Auftragseingang - Das Startdatum des Projekts." },
                  vao_valid_from: { type: "string", format: "date", description: "VAO gültig von - Startdatum der Verkehrsanordnung." },
                  vao_valid_to: { type: "string", format: "date", description: "VAO gültig bis - Enddatum der Verkehrsanordnung." },
                  grube_auf_datum: { type: "string", format: "date", description: "Datum, an dem die Grube aufgemacht wurde." },
                },
                required: ["project_number", "sm_number", "city"]
              }
            }
          },
          required: ["projects"]
      };

      const extractionResult = await ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: projectSchema,
      });

      if (extractionResult.status !== 'success') {
          throw new Error(`Daten konnten nicht extrahiert werden: ${extractionResult.details}`);
      }
      
      setProgress(70);

      // 3. Projekte in die Datenbank importieren
      const projectsData = (extractionResult.output && Array.isArray(extractionResult.output.projects))
        ? extractionResult.output.projects
        : [];
        
      let imported = 0;
      let errors = [];

      setProgress(80);

      for (const projectData of projectsData) {
        try {
          // Validierung und Bereinigung der Daten
          const cleanedProject = {
            project_number: projectData.project_number || `IMPORT-${Date.now()}-${imported}`,
            sm_number: projectData.sm_number || projectData.project_number || `SM-${imported}`,
            title: projectData.title || `${projectData.project_number || ''} ${projectData.city || ''} ${projectData.street || ''} ${projectData.sm_number || ''}`.trim(),
            client: projectData.client || 'Deutsche Telekom',
            contact_person: projectData.contact_person || '',
            order_type: projectData.order_type || 'Nicht angegeben',
            project_status: projectData.project_status || 'Auftrag neu im Server',
            street: projectData.street || '',
            city: projectData.city || '',
            status: 'planning',
            start_date: projectData.start_date || null,
            end_date: projectData.end_date || null,
            vao_valid_from: projectData.vao_valid_from || null,
            vao_valid_to: projectData.vao_valid_to || null,
            grube_auf_datum: projectData.grube_auf_datum || null,
          };

          await Project.create(cleanedProject);
          imported++;
        } catch (error) {
          errors.push(`Projekt ${projectData.project_number || imported + 1}: ${error.message}`);
        }
      }

      setProgress(100);
      setResults({
        total: projectsData.length,
        imported,
        errors
      });

    } catch (error) {
      console.error("Import-Fehler:", error);
      setResults({
        total: 0,
        imported: 0,
        errors: [`Allgemeiner Fehler: ${error.message}`]
      });
    }

    setIsUploading(false);
    setIsProcessing(false);
  };

  const downloadTemplate = () => {
    // Deutsche CSV-Template erstellen (mit Semikolon) - alle wichtigen Felder
    const csvContent = `Projektnummer;SM-Nummer;Auftragsart;Stadt;Straße;Ansprechpartner;VAO von;VAO bis;Grube Auf Datum;Projekt-Status;Auftragseingang;Kunde
TB-2024-001;SM-001;planbar;Berlin;Hauptstraße 123;Max Mustermann;01.01.2024;31.03.2024;15.01.2024;Auftrag neu im Server;10.01.2024;Deutsche Telekom
TB-2024-002;SM-002;Störung Tiefbau;Hamburg;Nebenweg 45;Maria Muster;15.01.2024;28.02.2024;20.01.2024;VAO bei Baubeginn;12.01.2024;Deutsche Telekom
TB-2024-003;SM-003;Kompakt-Entstörung;München;Musterweg 7;Peter Schmidt;;;;;;05.01.2024;Relaix`;
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'projekt-import-vorlage.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Projekte importieren</h1>
          <p className="text-gray-600">Importieren Sie Ihre bestehenden Projekte aus Excel oder CSV</p>
        </motion.div>

        {/* Information */}
        <Card className="card-elevation border-none mb-8">
          <CardContent className="p-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Import-Tipp:</strong> Diese Funktion verwendet KI-Technologie und kann mit verschiedenen Dateiformaten umgehen:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Excel-Dateien (.xlsx, .xls)</li>
                  <li>CSV-Dateien (mit Komma oder Semikolon getrennt)</li>
                  <li>Verschiedene Spaltennamen werden automatisch erkannt</li>
                  <li>Deutsche und englische Beschriftungen werden verstanden</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Template Download */}
        <Card className="card-elevation border-none mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Vorlage herunterladen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Laden Sie sich eine deutsche Vorlage herunter, um zu sehen, welche Daten erfasst werden können.
            </p>
            <Button onClick={downloadTemplate} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Deutsche CSV-Vorlage herunterladen
            </Button>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="card-elevation border-none mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Ihre Datei hochladen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
              />
              <p className="text-sm text-gray-500 mt-2">
                Unterstützte Formate: Excel (.xlsx, .xls) und CSV
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Die KI erkennt automatisch verschiedene Spaltenformate und deutsche Beschriftungen
              </p>
            </div>

            {file && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Datei ausgewählt: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}

            {file && !isUploading && !isProcessing && (
              <Button onClick={processImport} className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
                <Upload className="w-4 h-4 mr-2" />
                Import starten
              </Button>
            )}

            {(isUploading || isProcessing) && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-gray-600">
                  {isUploading && !isProcessing && "Datei wird hochgeladen..."}
                  {isProcessing && "Daten werden extrahiert und importiert..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card className="card-elevation border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.errors.length === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                )}
                Import-Ergebnisse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{results.total}</p>
                  <p className="text-sm text-blue-600">Gefundene Projekte</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{results.imported}</p>
                  <p className="text-sm text-green-600">Erfolgreich importiert</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Fehler beim Import:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {results.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {results.errors.length > 10 && (
                        <li>... und {results.errors.length - 10} weitere Fehler</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {results.imported > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{results.imported} Projekte</strong> wurden erfolgreich importiert!
                    Sie können diese jetzt in der Projektübersicht einsehen.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
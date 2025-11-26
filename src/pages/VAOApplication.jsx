import React, { useState, useEffect } from "react";
import { Project, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Städte-Konfiguration mit E-Mail-Adressen und Vorlagen
const CITIES_CONFIG = {
  "Aachen": {
    name: "Aachen",
    email: "baustelle@mail.aachen.de",
    template: "aachen"
  },
  "Elsdorf": {
    name: "Elsdorf", 
    email: "fred.wanitzeck@elsdorf.de",
    template: "elsdorf"
  },
  "Übach-Palenberg": {
    name: "Übach-Palenberg",
    email: "ml.hermanns@uebach-palenberg.de", 
    template: "uebach_palenberg"
  },
  "Alsdorf": {
    name: "Alsdorf",
    email: "ordnung@alsdorf.de",
    template: "alsdorf"
  },
  "Baesweiler": {
    name: "Baesweiler",
    email: "Lara.Roosen@stadt.baesweiler.de",
    template: "baesweiler"  
  },
  "Bedburg": {
    name: "Bedburg",
    email: "g.heinrichs@bedburg.de",
    template: "bedburg"
  },
  "Geilenkirchen": {
    name: "Geilenkirchen", 
    email: "Theo.Janssen@geilenkirchen.de",
    template: "geilenkirchen"
  },
  "Heinsberg": {
    name: "Heinsberg",
    email: "strassenverkehrsamt@kreis-heinsberg.de",
    template: "heinsberg"
  },
  "Herzogenrath": {
    name: "Herzogenrath",
    email: "strassenverkehrsbehoerde@herzogenrath.de", 
    template: "herzogenrath"
  },
  "Hückelhoven": {
    name: "Hückelhoven",
    email: "hannah.meerts@hueckelhoven.de",
    template: "hueckelhoven"
  },
  "Jülich": {
    name: "Jülich", 
    email: "ordnungsamt@juelich.de",
    template: "juelich"
  },
  "Stolberg": {
    name: "Stolberg",
    email: "marcel.poque@stolberg.de",
    template: "stolberg"
  },
  "Kerpen": {
    name: "Kerpen",
    email: "michele.maske@stadt-kerpen.de", 
    template: "kerpen"
  }
};

export default function VAOApplicationPage() {
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    // Allgemeine Felder
    work_type: "Tiefbau, Muffe freilegen, Baugrube/Graben, Telekommunikation",
    work_description: "",
    location: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    work_area: [], // ["fahrbahn", "gehweg", "parkplatz", etc.]
    traffic_regulation: "halbseitige_sperrung",
    rsa_plan: "RSA 2021",
    special_notes: "Auftrag der Deutschen Telekom",
    responsible_person: "Ahmet Salim",
    responsible_address: "Krokusstr. 16, 52353 Düren",
    responsible_phone: "0151-18313936",
    remaining_width: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, userData] = await Promise.all([
        Project.list("-created_date").catch(() => []),
        User.me().catch(() => null)
      ]);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setFormData(prev => ({
        ...prev,
        work_description: `${project.order_type || 'Tiefbauarbeiten'} - ${project.title}`,
        location: project.title,
        start_date: project.start_date || "",
        end_date: project.end_date || ""
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkAreaChange = (area, checked) => {
    setFormData(prev => ({
      ...prev,
      work_area: checked 
        ? [...prev.work_area, area]
        : prev.work_area.filter(a => a !== area)
    }));
  };

  const generateEmailContent = () => {
    const cityConfig = CITIES_CONFIG[selectedCity];
    const project = projects.find(p => p.id === selectedProject);
    
    const subject = `VAO-Antrag - Projekt ${project?.project_number || ''} - ${formData.location}`;
    
    const body = `Sehr geehrte Damen und Herren,

hiermit beantragen wir eine Verkehrsanordnung gemäß § 45 StVO für folgende Arbeiten:

Projekt: ${project?.project_number || ''} - ${project?.title || ''}
Auftraggeber: Deutsche Telekom AG
Art der Arbeiten: ${formData.work_type}
Beschreibung: ${formData.work_description}

Ort: ${formData.street} ${formData.house_number}, ${formData.postal_code} ${formData.city}
Zeitraum: ${formData.start_date} bis ${formData.end_date}
${formData.start_time ? `Uhrzeiten: ${formData.start_time} - ${formData.end_time}` : ''}

Verkehrsregelung: ${formData.traffic_regulation}
Betroffene Bereiche: ${formData.work_area.join(', ')}
${formData.remaining_width ? `Verbleibende Breite: ${formData.remaining_width}m` : ''}

RSA-Plan: ${formData.rsa_plan}
${formData.special_notes ? `Besonderes: ${formData.special_notes}` : ''}

Verantwortliche Person: ${formData.responsible_person}
Adresse: ${formData.responsible_address}  
Telefon: ${formData.responsible_phone}

Ausführende Firma: A&S Tief- u. Straßenbau GmbH
Schulstr. 41, 52353 Düren
Tel: 02421/27 67 721

Mit freundlichen Grüßen
A&S Tief- u. Straßenbau GmbH`;

    return { subject, body };
  };

  const handleSendEmail = () => {
    const cityConfig = CITIES_CONFIG[selectedCity];
    const { subject, body } = generateEmailContent();
    
    // Erstelle mailto-Link
    const mailtoLink = `mailto:${cityConfig.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Öffne Standard-E-Mail-Client
    window.location.href = mailtoLink;
  };

  const isFormValid = selectedCity && selectedProject && formData.work_description && formData.street && formData.start_date;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Link to={createPageUrl("VAOMonitoring")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">VAO-Antrag stellen</h1>
              <p className="text-gray-600">Verkehrsanordnung für verschiedene Städte beantragen</p>
            </div>
          </div>
        </motion.div>

        {/* Stadt und Projekt auswählen */}
        <Card className="card-elevation border-none mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Grunddaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Stadt auswählen *</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Stadt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CITIES_CONFIG).map(city => (
                      <SelectItem key={city.name} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCity && (
                  <p className="text-sm text-gray-500">
                    E-Mail: {CITIES_CONFIG[selectedCity].email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Projekt auswählen *</Label>
                <Select value={selectedProject} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedCity && selectedProject && (
          <>
            {/* Arbeitsdetails */}
            <Card className="card-elevation border-none mb-8">
              <CardHeader>
                <CardTitle>Arbeitsdetails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Art der Arbeiten *</Label>
                  <Input
                    value={formData.work_type}
                    onChange={(e) => handleInputChange('work_type', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Beschreibung der Arbeiten *</Label>
                  <Textarea
                    value={formData.work_description}
                    onChange={(e) => handleInputChange('work_description', e.target.value)}
                    className="min-h-20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Straße *</Label>
                    <Input
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      placeholder="Straßenname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hausnummer</Label>
                    <Input
                      value={formData.house_number}
                      onChange={(e) => handleInputChange('house_number', e.target.value)}
                      placeholder="Nr."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ort</Label>
                    <Input
                      value={formData.city || selectedCity}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Zeitraum */}
            <Card className="card-elevation border-none mb-8">
              <CardHeader>
                <CardTitle>Zeitraum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Beginn *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ende</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Uhrzeit von</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => handleInputChange('start_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Uhrzeit bis</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verkehrsregelung */}
            <Card className="card-elevation border-none mb-8">
              <CardHeader>
                <CardTitle>Verkehrsregelung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Betroffene Bereiche</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { id: 'fahrbahn', label: 'Fahrbahn' },
                      { id: 'gehweg', label: 'Gehweg' },
                      { id: 'parkplatz', label: 'Parkplatz' },
                      { id: 'radweg', label: 'Radweg' },
                      { id: 'gruenstreifen', label: 'Grünstreifen' },
                      { id: 'seitenstreifen', label: 'Seitenstreifen' }
                    ].map(area => (
                      <div key={area.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={area.id}
                          checked={formData.work_area.includes(area.id)}
                          onCheckedChange={(checked) => handleWorkAreaChange(area.id, checked)}
                        />
                        <Label htmlFor={area.id} className="text-sm">{area.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Art der Sperrung</Label>
                    <Select 
                      value={formData.traffic_regulation} 
                      onValueChange={(value) => handleInputChange('traffic_regulation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="halbseitige_sperrung">Halbseitige Sperrung</SelectItem>
                        <SelectItem value="vollsperrung">Vollsperrung</SelectItem>
                        <SelectItem value="ampelregelung">Ampelregelung</SelectItem>
                        <SelectItem value="wechselseitig">Wechselseitige Sperrung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Verbleibende Fahrbahnbreite (m)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.remaining_width}
                      onChange={(e) => handleInputChange('remaining_width', e.target.value)}
                      placeholder="z.B. 3.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>RSA-Plan</Label>
                  <Input
                    value={formData.rsa_plan}
                    onChange={(e) => handleInputChange('rsa_plan', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Besondere Hinweise</Label>
                  <Textarea
                    value={formData.special_notes}
                    onChange={(e) => handleInputChange('special_notes', e.target.value)}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Verantwortliche Person */}
            <Card className="card-elevation border-none mb-8">
              <CardHeader>
                <CardTitle>Verantwortliche Person</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.responsible_person}
                      onChange={(e) => handleInputChange('responsible_person', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      value={formData.responsible_address}
                      onChange={(e) => handleInputChange('responsible_address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={formData.responsible_phone}
                      onChange={(e) => handleInputChange('responsible_phone', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Absenden */}
            <Card className="card-elevation border-none">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">Antrag per E-Mail versenden</h3>
                    <p className="text-sm text-gray-600">
                      Der Antrag wird an {CITIES_CONFIG[selectedCity]?.email} gesendet
                    </p>
                  </div>
                  <Button 
                    onClick={handleSendEmail}
                    disabled={!isFormValid}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Per E-Mail versenden
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
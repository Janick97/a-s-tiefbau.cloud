import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Shovel, Upload, Camera, AlertTriangle, Trash2, Loader2, MapPin, Navigation, Info, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { PriceItem, Material, User, Excavation, ExcavationMaterial } from "@/entities/all";

// Helper Component for Image Upload Sections
function ImageUploadSection({ title, description, images = [], onImagesChange, maxFiles = 10 }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const filesToUpload = files.slice(0, maxFiles - images.length);
    if (files.length + images.length > maxFiles) {
      alert(`Sie können maximal ${maxFiles} Bilder hochladen.`);
    }

    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = filesToUpload.map(file => UploadFile({ file }));
      const uploadedFiles = await Promise.all(uploadPromises);
      const newImageUrls = uploadedFiles.map(res => res.file_url);
      onImagesChange([...images, ...newImageUrls]);
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen der Bilder.");
    } finally {
      setIsUploading(false);
      event.target.value = null;
    }
  };

  const handleDeleteImage = (urlToDelete) => {
    onImagesChange(images.filter(url => url !== urlToDelete));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-600" />
          {title}
        </Label>
        <span className="text-xs text-gray-500">{images.length}/{maxFiles}</span>
      </div>
      
      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {images.map((url, index) => (
            <div key={url + index} className="relative group aspect-square rounded overflow-hidden border">
              <img src={url} alt={`${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleDeleteImage(url)}
                className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <Input
        id={`file-upload-${title.replace(/\s+/g, '-')}`}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading || images.length >= maxFiles}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => document.getElementById(`file-upload-${title.replace(/\s+/g, '-')}`).click()}
        disabled={isUploading || images.length >= maxFiles}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? 'Lädt hoch...' : 'Bilder hinzufügen'}
      </Button>
    </div>
  );
}

const WIZARD_STEPS = [
  { id: 1, title: 'Leistungsart', icon: Shovel },
  { id: 2, title: 'Standort', icon: MapPin },
  { id: 3, title: 'Leistungsdetails', icon: Info },
  { id: 4, title: 'Oberfläche', icon: Check },
  { id: 5, title: 'Fotos & Notizen', icon: Camera },
];

export default function ExcavationWizard({ excavation, projects = [], defaultProjectId, onSubmit, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [priceItems, setPriceItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceCategory, setServiceCategory] = useState('grube');
  const [selectedCable, setSelectedCable] = useState(null);
  const [cableLayingMethod, setCableLayingMethod] = useState('auslegen');
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    project_id: defaultProjectId || '',
    price_item_id: '',
    quantity: 1,
    location_name: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    latitude: null,
    longitude: null,
    excavation_length: 0,
    excavation_depth: 0.6,
    excavation_width: 0.3,
    excavation_factor: 1,
    surface_type: '',
    surface_type_2: null,
    surface_1_sqm: '',
    surface_2_sqm: '',
    asphalt_thickness: '',
    concrete_thickness: '',
    concrete_base_used: false,
    mortar_used: false,
    gravel_used: false,
    iron_plate_laid: false,
    curb_length: '',
    edge_stone_length: '',
    gutter_length: '',
    excavated_material_left_onsite: false,
    photos_before: [],
    photos_after: [],
    photos_environment: [],
    photos_backfill: [],
    photos_surface: [],
    foreman: '',
    calculated_price: 0,
    foreman_commission: 0,
    backfill_commission: 0,
    surface_commission: 0,
    foreman_user_id: null,
    notes: '',
    construction_justification: '',
  });

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setCurrentUser(userData);
        setFormData(prev => ({ ...prev, foreman: userData?.full_name || 'Nicht zugewiesen' }));
      } catch (error) {
        console.log("Fehler beim Laden des Benutzers:", error);
      }
    };
    loadUser();
  }, []);

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      setIsLoadingData(true);
      try {
        const [priceData, materialsData] = await Promise.all([
          PriceItem.list('item_number').catch(() => []),
          Material.filter({ category: 'Kabel' }).catch(() => []),
        ]);
        setPriceItems(Array.isArray(priceData) ? priceData : []);
        setMaterials(Array.isArray(materialsData) ? materialsData : []);
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      }
      setIsLoadingData(false);
    };
    loadDropdownData();
  }, []);

  // Initialize with project data
  useEffect(() => {
    const project = projects.find(p => p.id === defaultProjectId);
    if (project) {
      setFormData(prev => ({
        ...prev,
        street: project.street || '',
        city: project.city || '',
      }));
    }
  }, [projects, defaultProjectId]);

  // Auto-calculate factor
  useEffect(() => {
    const selectedItem = priceItems.find(p => p.id === formData.price_item_id);
    if (!selectedItem) return;

    const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
    if (detailDimensionPositions.includes(selectedItem.item_number)) {
      const length = parseFloat(formData.excavation_length) || 0;
      const width = parseFloat(formData.excavation_width) || 0;
      
      const intermediateValue = (((length * width) - 1.2) / 0.25) / 10;
      const roundedValue = Math.ceil(intermediateValue * 10) / 10;
      const calculatedFactor = roundedValue + 1;
      const finalFactor = Math.max(1, calculatedFactor);
      
      if (finalFactor !== formData.excavation_factor) {
        setFormData(prev => ({ ...prev, excavation_factor: finalFactor }));
      }
    }
  }, [formData.excavation_length, formData.excavation_width, formData.price_item_id, priceItems]);

  const calculatePrice = useCallback(() => {
    const priceItem = priceItems.find(item => item.id === formData.price_item_id);
    if (!priceItem) return 0;

    const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
    const anderePositionNumbers = ['10021010', '10010413', '10037473', '10037352', '10037463', '10037372', '10021040', '10037342', '10037363'];

    if (detailDimensionPositions.includes(priceItem.item_number)) {
      const factor = parseFloat(formData.excavation_factor) || 0;
      return factor * priceItem.price;
    }

    const isGrabenPosition = priceItem.unit === 'M' && !anderePositionNumbers.includes(priceItem.item_number);
    if (isGrabenPosition) {
      const length = parseFloat(formData.excavation_length) || 0;
      return length * priceItem.price;
    }

    return parseFloat(formData.quantity || 0) * priceItem.price;
  }, [formData.price_item_id, formData.quantity, formData.excavation_length, formData.excavation_factor, priceItems]);

  // Update price
  useEffect(() => {
    if (priceItems.length > 0 && formData.price_item_id) {
      const newPrice = calculatePrice();
      setFormData(prev => ({ ...prev, calculated_price: newPrice }));
    }
  }, [formData.price_item_id, formData.quantity, formData.excavation_length, formData.excavation_factor, priceItems, calculatePrice]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFetchLocation = async () => {
    if (!navigator.geolocation) {
      alert("GPS wird nicht unterstützt.");
      return;
    }
    setIsFetchingLocation(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          { headers: { 'Accept-Language': 'de' } }
        );
        const data = await response.json();
        
        if (data.address) {
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            street: data.address.road || prev.street,
            house_number: data.address.house_number || '',
            postal_code: data.address.postcode || prev.postal_code,
            city: data.address.city || data.address.town || data.address.village || prev.city,
          }));
          alert("Standort erfolgreich erfasst!");
        }
      } catch (geocodeError) {
        const project = projects.find(p => p.id === formData.project_id);
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          street: project?.street || prev.street,
          city: project?.city || prev.city,
        }));
        alert("GPS erfasst! Adresse mit Projektdaten vorausgefüllt.");
      }
    } catch (error) {
      alert("Standort konnte nicht abgerufen werden.");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const calculatedPrice = calculatePrice();
      const totalPrice = calculatedPrice || 0;
      const autoLocationName = [formData.city, formData.street, formData.house_number].filter(Boolean).join(' ');
      
      const dataToSubmit = {
        ...formData,
        location_name: autoLocationName || formData.location_name,
        asphalt_thickness: formData.asphalt_thickness === '' ? null : parseFloat(formData.asphalt_thickness),
        concrete_thickness: formData.concrete_thickness === '' ? null : parseFloat(formData.concrete_thickness),
        surface_1_sqm: formData.surface_1_sqm === '' ? null : formData.surface_1_sqm,
        surface_2_sqm: formData.surface_2_sqm === '' ? null : formData.surface_2_sqm,
        curb_length: formData.curb_length === '' ? null : formData.curb_length,
        edge_stone_length: formData.edge_stone_length === '' ? null : formData.edge_stone_length,
        gutter_length: formData.gutter_length === '' ? null : formData.gutter_length,
        calculated_price: calculatedPrice,
        foreman_commission: totalPrice * 0.5,
        backfill_commission: totalPrice * 0.2,
        surface_commission: totalPrice * 0.3,
        foreman_user_id: currentUser?.id || null,
      };

      if (excavation) {
        await onSubmit(dataToSubmit);
        onCancel();
      } else {
        const selectedItem = priceItems.find(p => p.id === dataToSubmit.price_item_id);
        const anderePositionNumbers = ['10021010', '10010413', '10037473', '10037352', '10037463', '10037372', '10021040', '10037342', '10037363'];
        const isGrabenPosition = selectedItem?.unit === 'M' && !anderePositionNumbers.includes(selectedItem?.item_number);
        
        const createdExcavation = await Excavation.create(dataToSubmit);
        
        // Kabelverlegung für Graben
        if (isGrabenPosition && selectedCable && createdExcavation?.id) {
          const cablePriceItem = cableLayingMethod === 'auslegen' 
            ? priceItems.find(p => p.description && p.description.toLowerCase().includes('kabel bis 30 mm auslegen'))
            : priceItems.find(p => p.description && p.description.toLowerCase().includes('kabel in leerer rohr eingezogen'));
          
          if (cablePriceItem) {
            const cablePrice = (dataToSubmit.excavation_length || 0) * cablePriceItem.price;
            
            const cableExcavationData = {
              project_id: dataToSubmit.project_id,
              price_item_id: cablePriceItem.id,
              quantity: dataToSubmit.excavation_length,
              excavation_length: dataToSubmit.excavation_length,
              excavation_width: 0.3,
              excavation_depth: 0.3,
              excavation_factor: 1,
              location_name: dataToSubmit.location_name,
              street: dataToSubmit.street,
              house_number: dataToSubmit.house_number,
              city: dataToSubmit.city,
              latitude: dataToSubmit.latitude,
              longitude: dataToSubmit.longitude,
              foreman: dataToSubmit.foreman,
              foreman_user_id: currentUser?.id || null,
              calculated_price: cablePrice,
              foreman_commission: cablePrice * 0.5,
              backfill_commission: cablePrice * 0.2,
              surface_commission: cablePrice * 0.3,
              notes: `Automatisch angelegt - Kabel: ${selectedCable.name}`,
              surface_type: dataToSubmit.surface_type || 'unbefestigt',
            };
            
            const cableExcavation = await Excavation.create(cableExcavationData);
            
            if (cableExcavation?.id) {
              await ExcavationMaterial.create({
                excavation_id: cableExcavation.id,
                material_id: selectedCable.id,
                quantity_used: dataToSubmit.excavation_length,
                used_by: currentUser?.full_name || dataToSubmit.foreman,
                used_by_user_id: currentUser?.id,
                usage_date: new Date().toISOString().split('T')[0],
                notes: 'Automatisch gebucht',
              });
            }
          }
        }
        
        // Dialog anzeigen statt sofort zu schließen
        setShowContinueDialog(true);
      }
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    // Formular zurücksetzen für neue Leistung
    setCurrentStep(1);
    setServiceCategory('grube');
    setSelectedCable(null);
    setFormData({
      project_id: defaultProjectId || '',
      price_item_id: '',
      quantity: 1,
      location_name: '',
      street: formData.street, // Behalte Adressdaten
      house_number: '',
      postal_code: formData.postal_code,
      city: formData.city,
      latitude: formData.latitude, // Behalte GPS
      longitude: formData.longitude,
      excavation_length: 0,
      excavation_depth: 0.6,
      excavation_width: 0.3,
      excavation_factor: 1,
      surface_type: '',
      surface_type_2: null,
      surface_1_sqm: '',
      surface_2_sqm: '',
      asphalt_thickness: '',
      concrete_thickness: '',
      concrete_base_used: false,
      mortar_used: false,
      gravel_used: false,
      iron_plate_laid: false,
      curb_length: '',
      edge_stone_length: '',
      gutter_length: '',
      excavated_material_left_onsite: false,
      photos_before: [],
      photos_after: [],
      photos_environment: [],
      photos_backfill: [],
      photos_surface: [],
      foreman: currentUser?.full_name || 'Nicht zugewiesen',
      calculated_price: 0,
      foreman_commission: 0,
      backfill_commission: 0,
      surface_commission: 0,
      foreman_user_id: currentUser?.id || null,
      notes: '',
      construction_justification: '',
    });
    setShowContinueDialog(false);
  };

  const handleFinish = () => {
    onCancel();
  };

  const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
  const anderePositionNumbers = ['10021010', '10010413', '10037473', '10037352', '10037463', '10037372', '10021040', '10037342', '10037363'];

  const grubenItems = useMemo(() => {
    return priceItems.filter(item => detailDimensionPositions.includes(item.item_number));
  }, [priceItems]);

  const grabenItems = useMemo(() => {
    return priceItems.filter(item => 
      !detailDimensionPositions.includes(item.item_number) && 
      !anderePositionNumbers.includes(item.item_number) &&
      item.unit === 'M'
    );
  }, [priceItems]);

  const andereItems = useMemo(() => {
    return priceItems.filter(item => 
      !detailDimensionPositions.includes(item.item_number) && 
      (item.unit !== 'M' || anderePositionNumbers.includes(item.item_number))
    );
  }, [priceItems]);

  const filteredPriceItems = useMemo(() => {
    if (serviceCategory === 'grube') return grubenItems;
    if (serviceCategory === 'graben') return grabenItems;
    if (serviceCategory === 'andere') return andereItems;
    return priceItems;
  }, [serviceCategory, grubenItems, grabenItems, andereItems, priceItems]);

  const selectedPriceItem = useMemo(() => {
    return priceItems.find(p => p.id === formData.price_item_id);
  }, [formData.price_item_id, priceItems]);

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return serviceCategory !== '';
      case 2:
        return formData.street && formData.city;
      case 3:
        return formData.price_item_id !== '';
      case 4:
        return formData.surface_type !== '';
      default:
        return true;
    }
  };

  const getGoogleMapsLink = () => {
    if (formData.latitude && formData.longitude) {
      return `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`;
    }
    return null;
  };

  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  return (
    <>
    {!showContinueDialog && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-[70] touch-none"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full h-full md:h-auto md:max-w-4xl md:mx-4 md:mb-8 md:rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-none shadow-2xl h-full md:h-auto rounded-none md:rounded-lg max-h-none md:max-h-[90vh] flex flex-col">
          <style>
            {`
              [data-radix-popper-content-wrapper] {
                z-index: 80 !important;
              }
            `}
          </style>
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-2xl md:rounded-t-lg flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Shovel className="w-5 h-5 md:w-6 md:h-6" />
                {excavation ? 'Leistung bearbeiten' : 'Neue Leistung erfassen'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:text-white/80 h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2 bg-white/20" />
              <div className="flex justify-between text-xs text-white/80">
                <span>Schritt {currentStep} von {WIZARD_STEPS.length}</span>
                <span className="hidden sm:inline">{WIZARD_STEPS[currentStep - 1].title}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              {/* Schritt 1: Leistungsart */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Welche Art von Leistung möchten Sie erfassen?</h3>
                    <p className="text-gray-600">Wählen Sie die Kategorie, die am besten zu Ihrer Arbeit passt</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-lg ${serviceCategory === 'grube' ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
                      onClick={() => setServiceCategory('grube')}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                          <Shovel className="w-6 h-6 text-orange-600" />
                        </div>
                        <h4 className="font-bold text-base">Grube</h4>
                        {serviceCategory === 'grube' && (
                          <Badge className="mt-2 bg-orange-500">Ausgewählt</Badge>
                        )}
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-lg ${serviceCategory === 'graben' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                      onClick={() => setServiceCategory('graben')}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                          <Shovel className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-base">Graben</h4>
                        {serviceCategory === 'graben' && (
                          <Badge className="mt-2 bg-blue-500">Ausgewählt</Badge>
                        )}
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-lg ${serviceCategory === 'andere' ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
                      onClick={() => setServiceCategory('andere')}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                          <Shovel className="w-6 h-6 text-purple-600" />
                        </div>
                        <h4 className="font-bold text-base">Andere</h4>
                        {serviceCategory === 'andere' && (
                          <Badge className="mt-2 bg-purple-500">Ausgewählt</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* Schritt 2: Standort */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Wo befindet sich die Baustelle?</h3>
                    <p className="text-gray-600">Erfassen Sie den GPS-Standort oder geben Sie die Adresse manuell ein</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <Label className="mb-2 block font-semibold">GPS-Standort erfassen</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleFetchLocation}
                          disabled={isFetchingLocation}
                          className="bg-blue-600 hover:bg-blue-700 flex-1"
                        >
                          {isFetchingLocation ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <MapPin className="w-4 h-4 mr-2" />
                          )}
                          Standort erfassen
                        </Button>
                        {formData.latitude && formData.longitude && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.open(getGoogleMapsLink(), '_blank')}
                            className="flex-1"
                          >
                            <Navigation className="w-4 h-4 mr-2" />
                            Karte öffnen
                          </Button>
                        )}
                      </div>
                      {formData.latitude && formData.longitude && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ GPS erfasst: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Straße *</Label>
                        <Input
                          id="street"
                          value={formData.street}
                          onChange={(e) => handleInputChange('street', e.target.value)}
                          placeholder="Per GPS erfassen oder manuell eingeben..."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="house_number">Hausnummer</Label>
                        <Input
                          id="house_number"
                          value={formData.house_number}
                          onChange={(e) => handleInputChange('house_number', e.target.value)}
                          placeholder="Nr."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Stadt *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Per GPS erfassen oder manuell eingeben..."
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Schritt 3: Leistungsdetails */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Leistungsdetails erfassen</h3>
                    <p className="text-gray-600">Wählen Sie die Position und geben Sie die Abmessungen ein</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="price_item_id">Position aus Preisliste *</Label>
                      <Select 
                        value={formData.price_item_id} 
                        onValueChange={(value) => handleInputChange('price_item_id', value)}
                      >
                        <SelectTrigger className="h-auto min-h-[44px]">
                          <SelectValue placeholder="Position auswählen..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[60vh]">
                          {filteredPriceItems.map(item => (
                            <SelectItem key={item.id} value={item.id} className="py-2 text-xs">
                              <div className="flex flex-col gap-0.5">
                                <div className="font-semibold">{item.item_number}</div>
                                <div className="line-clamp-2">{item.description}</div>
                                <div className="font-semibold text-[10px]">
                                  {item.unit}{currentUser?.position !== 'Bauleiter' && ` • €${item.price.toFixed(2)}`}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedPriceItem && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border">
                          <div className="font-medium text-gray-900">{selectedPriceItem.item_number}</div>
                          <div className="mt-1">{selectedPriceItem.description}</div>
                          <div className="mt-1 text-green-700 font-semibold">{selectedPriceItem.unit}{currentUser?.position !== 'Bauleiter' && ` • €${selectedPriceItem.price.toFixed(2)}`}</div>
                        </div>
                      )}
                    </div>

                    {serviceCategory === 'andere' && (
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Menge *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.quantity}
                          onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                    )}

                    {serviceCategory === 'graben' && (
                      <Card className="bg-blue-50/50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Kabelverlegung (optional)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Kabel auswählen</Label>
                            <Select 
                              value={selectedCable?.id || ''} 
                              onValueChange={(value) => {
                                const cable = materials.find(m => m.id === value);
                                setSelectedCable(cable || null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Optional: Kabel auswählen..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={null}>Kein Kabel</SelectItem>
                                {materials.map(material => (
                                  <SelectItem key={material.id} value={material.id}>
                                    {material.name} ({material.article_number})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedCable && (
                            <div className="space-y-2">
                              <Label>Verlegeart</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant={cableLayingMethod === 'auslegen' ? 'default' : 'outline'}
                                  onClick={() => setCableLayingMethod('auslegen')}
                                  className={cableLayingMethod === 'auslegen' ? 'bg-blue-500' : ''}
                                >
                                  Auslegen
                                </Button>
                                <Button
                                  type="button"
                                  variant={cableLayingMethod === 'einziehen' ? 'default' : 'outline'}
                                  onClick={() => setCableLayingMethod('einziehen')}
                                  className={cableLayingMethod === 'einziehen' ? 'bg-blue-500' : ''}
                                >
                                  Einziehen
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="excavation_length">Länge (m)</Label>
                        <Input
                          id="excavation_length"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.excavation_length}
                          onChange={(e) => handleInputChange('excavation_length', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="excavation_width">Breite (m)</Label>
                        <Input
                          id="excavation_width"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.excavation_width}
                          onChange={(e) => handleInputChange('excavation_width', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="excavation_depth">Tiefe (m)</Label>
                        <Input
                          id="excavation_depth"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.excavation_depth}
                          onChange={(e) => handleInputChange('excavation_depth', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excavation_factor">
                        Faktor
                        {selectedPriceItem && detailDimensionPositions.includes(selectedPriceItem.item_number) && (
                          <span className="text-xs text-blue-600 ml-2">(automatisch berechnet)</span>
                        )}
                      </Label>
                      <Input
                        id="excavation_factor"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.excavation_factor}
                        onChange={(e) => handleInputChange('excavation_factor', parseFloat(e.target.value))}
                        readOnly={selectedPriceItem && detailDimensionPositions.includes(selectedPriceItem.item_number)}
                        className={selectedPriceItem && detailDimensionPositions.includes(selectedPriceItem.item_number) ? 'bg-gray-100' : ''}
                      />
                    </div>

                    {selectedPriceItem && currentUser?.position !== 'Bauleiter' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-green-800">Berechneter Preis:</span>
                          <span className="text-xl font-bold text-green-700">
                            €{formData.calculated_price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Schritt 4: Oberfläche */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Oberflächendetails</h3>
                    <p className="text-gray-600">Beschreiben Sie die Oberfläche und zusätzliche Details</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="surface_type">Oberfläche 1 *</Label>
                        <Select 
                          value={formData.surface_type} 
                          onValueChange={(value) => handleInputChange('surface_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Oberfläche auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Naturstein">Naturstein</SelectItem>
                            <SelectItem value="Beton">Beton</SelectItem>
                            <SelectItem value="Platten">Platten</SelectItem>
                            <SelectItem value="Pflaster">Pflaster</SelectItem>
                            <SelectItem value="unbefestigt">Unbefestigt</SelectItem>
                            <SelectItem value="Asphalt">Asphalt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="surface_type_2">Oberfläche 2 (optional)</Label>
                        <Select 
                          value={formData.surface_type_2 || "none"} 
                          onValueChange={(value) => handleInputChange('surface_type_2', value === "none" ? null : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Keine" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Keine</SelectItem>
                            <SelectItem value="Naturstein">Naturstein</SelectItem>
                            <SelectItem value="Beton">Beton</SelectItem>
                            <SelectItem value="Platten">Platten</SelectItem>
                            <SelectItem value="Pflaster">Pflaster</SelectItem>
                            <SelectItem value="unbefestigt">Unbefestigt</SelectItem>
                            <SelectItem value="Asphalt">Asphalt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(formData.surface_type === 'Asphalt' || formData.surface_type_2 === 'Asphalt') && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                        <Label htmlFor="asphalt_thickness">Asphaltdicke (cm) *</Label>
                        <Input
                          id="asphalt_thickness"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.asphalt_thickness}
                          onChange={(e) => handleInputChange('asphalt_thickness', e.target.value)}
                          placeholder="z.B. 5.0"
                        />
                      </div>
                    )}

                    {(formData.surface_type === 'Beton' || formData.surface_type_2 === 'Beton') && (
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 space-y-2">
                        <Label htmlFor="concrete_thickness">Betondicke (cm) *</Label>
                        <Input
                          id="concrete_thickness"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.concrete_thickness}
                          onChange={(e) => handleInputChange('concrete_thickness', e.target.value)}
                          placeholder="z.B. 10.0"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="concrete_base_used"
                          checked={formData.concrete_base_used}
                          onCheckedChange={(checked) => handleInputChange('concrete_base_used', checked)}
                        />
                        <Label htmlFor="concrete_base_used" className="cursor-pointer">Unterbeton</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="mortar_used"
                          checked={formData.mortar_used}
                          onCheckedChange={(checked) => handleInputChange('mortar_used', checked)}
                        />
                        <Label htmlFor="mortar_used" className="cursor-pointer">Mörtel</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gravel_used"
                          checked={formData.gravel_used}
                          onCheckedChange={(checked) => handleInputChange('gravel_used', checked)}
                        />
                        <Label htmlFor="gravel_used" className="cursor-pointer">Splitt</Label>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="iron_plate_laid"
                        checked={formData.iron_plate_laid}
                        onCheckedChange={(checked) => handleInputChange('iron_plate_laid', checked)}
                      />
                      <Label htmlFor="iron_plate_laid" className="cursor-pointer">Eisenplatte vor Ort</Label>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="curb_length">Bordstein (m)</Label>
                        <Input
                          id="curb_length"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.curb_length}
                          onChange={(e) => handleInputChange('curb_length', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edge_stone_length">Kantenstein (m)</Label>
                        <Input
                          id="edge_stone_length"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.edge_stone_length}
                          onChange={(e) => handleInputChange('edge_stone_length', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gutter_length">Rinne (m)</Label>
                        <Input
                          id="gutter_length"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.gutter_length}
                          onChange={(e) => handleInputChange('gutter_length', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Schritt 5: Fotos & Notizen */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Fotodokumentation & Notizen</h3>
                    <p className="text-gray-600">Dokumentieren Sie die Baustelle mit Fotos und Notizen</p>
                  </div>

                  <div className="space-y-4">
                    <ImageUploadSection 
                      title="Vorher Bilder"
                      images={formData.photos_before}
                      onImagesChange={(urls) => handleInputChange('photos_before', urls)}
                    />
                    <ImageUploadSection 
                      title="Bilder mit Zollstock"
                      images={formData.photos_after}
                      onImagesChange={(urls) => handleInputChange('photos_after', urls)}
                    />
                    <ImageUploadSection 
                      title="Bilder Umfeld/Absperrung"
                      images={formData.photos_environment}
                      onImagesChange={(urls) => handleInputChange('photos_environment', urls)}
                    />

                    <Card className="bg-gray-50/50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          Tiefbaubegründung
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={formData.construction_justification}
                          onChange={(e) => handleInputChange('construction_justification', e.target.value)}
                          placeholder="Begründung für die Tiefbaumaßnahme..."
                          className="min-h-20"
                        />
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-50/50">
                      <CardHeader>
                        <CardTitle className="text-base">Zusätzliche Notizen</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          placeholder="Optionale Notizen..."
                          className="min-h-24"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-between gap-2 md:gap-3 bg-gray-50 rounded-none md:rounded-b-lg p-4 md:p-6 flex-shrink-0 border-t">
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
                className="h-12 md:h-10 text-base md:text-sm"
              >
                Abbrechen
              </Button>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={isSubmitting}
                  className="h-12 md:h-10 text-base md:text-sm"
                >
                  <ChevronLeft className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                  <span className="hidden md:inline">Zurück</span>
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep < WIZARD_STEPS.length ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canGoNext() || isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 h-12 md:h-10 text-base md:text-sm px-8"
                >
                  Weiter
                  <ChevronRight className="w-5 h-5 md:w-4 md:h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 h-12 md:h-10 text-base md:text-sm px-8"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 md:w-4 md:h-4 mr-2 animate-spin" />
                      Speichere...
                    </>
                  ) : (
                    <>
                      Weiter
                      <ChevronRight className="w-5 h-5 md:w-4 md:h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
    )}

    {/* Dialog für "Weitere Leistung erfassen" */}
    {showContinueDialog && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
        onClick={handleFinish}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Leistung erfasst!</h3>
            <p className="text-gray-600">Möchten Sie eine weitere Leistung erfassen?</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={handleFinish}
              className="flex-1 h-12 text-base"
            >
              Fertig
            </Button>
            <Button 
              onClick={handleContinue}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base"
            >
              Weitere Leistung
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
    </>
  );
}
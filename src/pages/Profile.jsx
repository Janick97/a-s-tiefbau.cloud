import React, { useState, useEffect } from "react";
import { User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Save, User as UserIcon, LogOut, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: "", position: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        const userData = await User.me();
        setUser(userData);
        setFormData({
          full_name: userData.full_name || "",
          position: userData.position || ""
        });
      } catch (error) {
        console.error("Fehler beim Laden des Benutzers:", error);
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await User.updateMyUserData(formData);
      const updatedUser = await User.me();
      setUser(updatedUser);
      alert("Profil erfolgreich aktualisiert!");
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Profils.");
    }
    setIsSaving(false);
  };
  
  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
            </CardContent>
            <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Mein Profil</h1>
          <p className="text-gray-600">Verwalten Sie Ihre persönlichen Informationen.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSaveChanges}>
              <Card className="card-elevation border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserIcon /> Benutzerdaten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" value={user?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Voller Name</Label>
                    <Input 
                      id="full_name" 
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Büro">Büro</SelectItem>
                        <SelectItem value="Bauleiter">Bauleiter</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rolle</Label>
                    <Input value={user?.role || ""} disabled />
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Speichern..." : "Änderungen speichern"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
          
          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-800 flex items-center gap-2"><Info className="w-5 h-5"/>Information</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-700 text-sm space-y-2">
                    <p>Ihre E-Mail-Adresse und Ihr Passwort werden über Ihr Google-Konto verwaltet. Änderungen müssen direkt bei Google vorgenommen werden.</p>
                    <p>Das Einladen neuer Benutzer oder die Zuweisung der Admin-Rolle erfolgt über das base44-Dashboard.</p>
                </CardContent>
            </Card>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
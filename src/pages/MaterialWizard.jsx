import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Material, Project, ProjectMaterial } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, ChevronRight, ChevronLeft, Check, User,
  Warehouse, FolderOpen, Plus, Minus, X, Loader2, ImageIcon
} from "lucide-react";

const CATEGORIES = [
  "SNRVe", "Mikro-Rohr", "Mauerdurchführung", "KVz", "Kabel",
  "Stecker", "Gehäuse", "Befestigung", "Werkzeug", "Sonstiges"
];

const CATEGORY_COLORS = {
  "SNRVe": "bg-blue-100 text-blue-800 border-blue-200",
  "Mikro-Rohr": "bg-purple-100 text-purple-800 border-purple-200",
  "Mauerdurchführung": "bg-orange-100 text-orange-800 border-orange-200",
  "KVz": "bg-green-100 text-green-800 border-green-200",
  "Kabel": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Stecker": "bg-pink-100 text-pink-800 border-pink-200",
  "Gehäuse": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Befestigung": "bg-red-100 text-red-800 border-red-200",
  "Werkzeug": "bg-teal-100 text-teal-800 border-teal-200",
  "Sonstiges": "bg-gray-100 text-gray-800 border-gray-200",
};

// ─── STEP 1: User Selection ───────────────────────────────────────────────────
function StepUserLogin({ onNext }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.User.list().then(data => {
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="p-5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg">
        <Warehouse className="w-16 h-16 text-white" />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Materialentnahme</h1>
        <p className="text-gray-500 text-lg">Bitte Mitarbeiter auswählen</p>
      </div>
      <div className="w-full max-w-sm space-y-4">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
        ) : (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="h-14 text-base">
              <SelectValue placeholder="Mitarbeiter auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id} className="text-base py-2">
                  {u.full_name} {u.role === 'admin' ? '(Admin)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          onClick={() => onNext(selectedUser)}
          disabled={!selectedUserId}
          className="w-full h-14 text-base bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
        >
          <User className="w-5 h-5 mr-2" />
          Anmelden & Weiter
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 2: Material Catalog ─────────────────────────────────────────────────
function StepMaterialCatalog({ onNext, onBack, cart, setCart }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    Material.list().then(data => {
      setMaterials(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const filtered = materials.filter(m => {
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.article_number?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const categoriesWithMaterials = CATEGORIES.filter(cat =>
    materials.some(m => m.category === cat)
  );

  const displayList = selectedCategory || search ? filtered : [];

  const addToCart = (material) => {
    setCart(prev => {
      const existing = prev.find(i => i.material.id === material.id);
      if (existing) return prev.map(i => i.material.id === material.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { material, quantity: 1 }];
    });
  };

  const getCartQty = (id) => cart.find(i => i.material.id === id)?.quantity || 0;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold text-gray-900">Materialkatalog</h2>
        {cart.length > 0 && (
          <Badge className="ml-auto bg-orange-500 text-white">{cart.reduce((s, i) => s + i.quantity, 0)} Pos.</Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Name oder Artikelnummer suchen..."
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
          className="pl-10 h-12 text-base"
        />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : !selectedCategory && !search ? (
        /* Category Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {categoriesWithMaterials.map(cat => {
            const count = materials.filter(m => m.category === cat).length;
            const inCart = cart.filter(i => i.material.category === cat).length;
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedCategory(cat)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${CATEGORY_COLORS[cat] || 'bg-gray-100 border-gray-200'}`}
              >
                <Package className="w-6 h-6 mb-2 opacity-70" />
                <p className="font-semibold text-sm">{cat === 'Mauerdurchführung' ? 'Mauerdurchf.' : cat}</p>
                <p className="text-xs opacity-60">{count} Artikel</p>
                {inCart > 0 && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {inCart}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      ) : (
        /* Material List */
        <div>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-sm text-orange-600 mb-3 hover:underline">
              <ChevronLeft className="w-4 h-4" /> Zurück zu Kategorien
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {displayList.map(mat => {
              const qty = getCartQty(mat.id);
              return (
                <Card key={mat.id} className={`border transition-all ${qty > 0 ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {mat.image_url ? (
                      <img src={mat.image_url} alt={mat.name} className="w-14 h-14 object-contain rounded-lg border bg-white flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg border bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{mat.name}</p>
                      <p className="text-xs text-gray-500">{mat.article_number}</p>
                      <p className="text-xs text-gray-400">Bestand: {mat.current_stock} {mat.unit}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setCart(prev => prev.map(i => i.material.id === mat.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0))} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-bold text-sm">{qty}</span>
                          <button onClick={() => addToCart(mat)} className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(mat)} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 border border-orange-300">
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {displayList.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-400">Keine Materialien gefunden</div>
            )}
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="mt-auto pt-4 border-t">
          <Button onClick={onNext} className="w-full h-12 text-base bg-gradient-to-r from-orange-500 to-amber-600">
            Weiter zur Mengeneingabe ({cart.reduce((s, i) => s + i.quantity, 0)} Pos.)
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── STEP 3: Quantity Confirmation ───────────────────────────────────────────
function StepQuantity({ cart, setCart, onNext, onBack }) {
  const updateQty = (id, val) => {
    const q = parseFloat(val) || 0;
    if (q <= 0) setCart(prev => prev.filter(i => i.material.id !== id));
    else setCart(prev => prev.map(i => i.material.id === id ? { ...i, quantity: q } : i));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold text-gray-900">Mengen bestätigen</h2>
      </div>
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {cart.map(({ material, quantity }) => (
          <Card key={material.id} className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-4">
              {material.image_url ? (
                <img src={material.image_url} alt={material.name} className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{material.name}</p>
                <p className="text-xs text-gray-500">{material.article_number}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => updateQty(material.id, quantity - 1)} className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 text-lg font-bold">-</button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={e => updateQty(material.id, e.target.value)}
                  className="w-20 text-center font-bold text-base h-9"
                  min="0.1"
                  step="0.1"
                />
                <button onClick={() => updateQty(material.id, quantity + 1)} className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 text-lg font-bold">+</button>
                <span className="text-sm text-gray-500 w-8">{material.unit}</span>
                <button onClick={() => setCart(prev => prev.filter(i => i.material.id !== material.id))} className="ml-1 text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {cart.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Warenkorb ist leer</div>
      ) : (
        <Button onClick={onNext} className="w-full h-12 text-base bg-gradient-to-r from-orange-500 to-amber-600 mt-auto">
          Weiter zur Projektzuordnung
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      )}
    </div>
  );
}

// ─── STEP 4: Project Assignment ───────────────────────────────────────────────
function StepProjectAssignment({ cart, user, onFinish, onBack }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Project.list().then(data => {
      setProjects(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return !q || p.project_number?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.sm_number?.toLowerCase().includes(q);
  });

  const handleFinish = async () => {
    if (!selectedProject) return;
    setSaving(true);
    try {
      for (const { material, quantity } of cart) {
        // 1. Reduce stock
        const newStock = Math.max(0, (material.current_stock || 0) - quantity);
        await Material.update(material.id, { current_stock: newStock });

        // 2. Check if ProjectMaterial exists
        const existing = await ProjectMaterial.filter({ project_id: selectedProject.id, material_id: material.id });
        if (existing && existing.length > 0) {
          await ProjectMaterial.update(existing[0].id, { quantity: (existing[0].quantity || 0) + quantity });
        } else {
          await ProjectMaterial.create({
            project_id: selectedProject.id,
            material_id: material.id,
            quantity: quantity
          });
        }
      }
      onFinish(selectedProject);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern. Bitte erneut versuchen.");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold text-gray-900">Projekt zuordnen</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Projektnummer, Titel oder SM-Nummer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-12 text-base" />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : (
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {filtered.slice(0, 30).map(p => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedProject(p)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedProject?.id === p.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  <p className="text-sm text-gray-500">
                    #{p.project_number} · SM: {p.sm_number} · {p.client}
                  </p>
                </div>
                {selectedProject?.id === p.id && (
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400">Kein Projekt gefunden</div>}
        </div>
      )}

      {selectedProject && (
        <div className="mt-auto pt-4 border-t space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
            <p className="font-semibold text-orange-800 mb-1">Zusammenfassung</p>
            <p className="text-gray-600">Projekt: <span className="font-medium">{selectedProject.title}</span></p>
            <p className="text-gray-600">Materialien: {cart.map(i => `${i.quantity}x ${i.material.name}`).join(', ')}</p>
            <p className="text-gray-600">Mitarbeiter: {user?.full_name}</p>
          </div>
          <Button onClick={handleFinish} disabled={saving} className="w-full h-12 text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird gespeichert...</> : <><Check className="w-5 h-5 mr-2" />Entnahme bestätigen</>}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────
function SuccessScreen({ project, user, cart, onReset }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-12 h-12 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Entnahme erfasst!</h2>
        <p className="text-gray-600">{cart.length} Material{cart.length !== 1 ? 'ien' : ''} dem Projekt</p>
        <p className="font-semibold text-gray-800">„{project?.title}"</p>
        <p className="text-gray-500 text-sm mt-1">zugeordnet von {user?.full_name}</p>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 w-full max-w-sm text-left space-y-1">
        {cart.map(({ material, quantity }) => (
          <div key={material.id} className="flex justify-between text-sm">
            <span className="text-gray-700">{material.name}</span>
            <span className="font-medium">{quantity} {material.unit}</span>
          </div>
        ))}
      </div>
      <Button onClick={onReset} className="w-full max-w-sm h-12 text-base bg-gradient-to-r from-orange-500 to-amber-600">
        Neue Entnahme starten
      </Button>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const STEPS = ["Anmeldung", "Material", "Menge", "Projekt"];

export default function MaterialWizardPage() {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [finishedProject, setFinishedProject] = useState(null);
  const [finishedCart, setFinishedCart] = useState([]);

  const handleReset = () => {
    setStep(0);
    setUser(null);
    setCart([]);
    setFinishedProject(null);
    setFinishedCart([]);
  };

  if (finishedProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <SuccessScreen project={finishedProject} user={user} cart={finishedCart} onReset={handleReset} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        {/* Progress */}
        {step > 0 && (
          <div className="flex items-center justify-between mb-6">
            {STEPS.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < step ? 'bg-orange-500 border-orange-500 text-white' : i === step ? 'bg-white border-orange-500 text-orange-600' : 'bg-white border-gray-300 text-gray-400'}`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${i <= step ? 'text-orange-600' : 'text-gray-400'}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`absolute hidden`} />}
              </div>
            ))}
          </div>
        )}

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                {step === 0 && (
                  <StepUserLogin onNext={(u) => { setUser(u); setStep(1); }} />
                )}
                {step === 1 && (
                  <StepMaterialCatalog
                    cart={cart}
                    setCart={setCart}
                    onNext={() => setStep(2)}
                    onBack={() => setStep(0)}
                  />
                )}
                {step === 2 && (
                  <StepQuantity
                    cart={cart}
                    setCart={setCart}
                    onNext={() => setStep(3)}
                    onBack={() => setStep(1)}
                  />
                )}
                {step === 3 && (
                  <StepProjectAssignment
                    cart={cart}
                    user={user}
                    onBack={() => setStep(2)}
                    onFinish={(project) => {
                      setFinishedProject(project);
                      setFinishedCart([...cart]);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Pencil, Trash2, ShieldAlert } from 'lucide-react';

const POSITIONS = ['Bauleiter', 'Monteur', 'Oberfläche', 'Büro'];
const ROLES = ['admin', 'user'];

const emptyForm = {
  email: '', full_name: '', role: 'user', position: '', phone: '', is_active: true, password: '',
};

export default function UserManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setProfiles(data ?? []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.email, p.full_name, p.role, p.position]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [profiles, search]);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <CardTitle>Kein Zugriff</CardTitle>
          </CardHeader>
          <CardContent>Nur Administratoren können User verwalten.</CardContent>
        </Card>
      </div>
    );
  }

  const openNew = () => { setForm(emptyForm); setEditing('new'); };
  const openEdit = (p) => {
    setForm({
      email: p.email ?? '',
      full_name: p.full_name ?? '',
      role: p.role ?? 'user',
      position: p.position ?? '',
      phone: p.phone ?? '',
      is_active: p.is_active ?? true,
      password: '',
    });
    setEditing(p);
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      if (editing === 'new') {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.full_name } },
        });
        if (authErr) throw authErr;
        const newId = authData.user?.id;
        if (newId) {
          const { error: upErr } = await supabase
            .from('profiles').update({
              full_name: form.full_name || null,
              role: form.role,
              position: form.position || null,
              phone: form.phone || null,
              is_active: !!form.is_active,
            }).eq('id', newId);
          if (upErr) throw upErr;
        }
      } else {
        const { error: upErr } = await supabase
          .from('profiles').update({
            full_name: form.full_name || null,
            role: form.role,
            position: form.position || null,
            phone: form.phone || null,
            is_active: !!form.is_active,
          }).eq('id', editing.id);
        if (upErr) throw upErr;
      }
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (p.id === user?.id) { alert('Eigenen Account nicht löschen.'); return; }
    if (!confirm(`Wirklich ${p.email} entfernen? (Löscht Profil-Zeile; Auth-User bleibt ggf. bestehen und muss in Supabase manuell gelöscht werden.)`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', p.id);
    if (error) { setError(error.message); return; }
    await reload();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Benutzerverwaltung</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Neuer Benutzer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing === 'new' ? 'Neuen Benutzer anlegen' : 'Benutzer bearbeiten'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>E-Mail</Label>
                  <Input value={form.email}
                    disabled={editing !== 'new'}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                {editing === 'new' && (
                  <div>
                    <Label>Initial-Passwort</Label>
                    <Input type="password" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    <p className="text-xs text-slate-500 mt-1">
                      Min. 6 Zeichen. Der Nutzer kann es nach dem ersten Login ändern.
                    </p>
                  </div>
                )}
                <div>
                  <Label>Name</Label>
                  <Input value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Rolle</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Select value={form.position || '__none'} onValueChange={(v) => setForm({ ...form, position: v === '__none' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— keine —</SelectItem>
                        {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Aktiv (darf sich einloggen)
                </label>
                {error && <div className="text-sm text-red-600">{error}</div>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Abbrechen</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && !editing && <div className="text-sm text-red-600">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.full_name ?? '—'}</TableCell>
                    <TableCell>
                      <span className={p.role === 'admin' ? 'font-medium text-red-700' : ''}>{p.role}</span>
                    </TableCell>
                    <TableCell>{p.position ?? '—'}</TableCell>
                    <TableCell>{p.is_active ? 'Ja' : 'Nein'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      Keine Benutzer gefunden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

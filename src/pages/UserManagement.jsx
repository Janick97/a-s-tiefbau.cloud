// src/pages/UserManagement.jsx
// Admin Center — verwaltet Nutzer über die Supabase Edge Function `admin-users`.
// Voraussetzung: Edge Function deployed, aktueller Nutzer hat profiles.role = 'admin'.
//
// Ersetzt die alte client-side signUp Variante komplett.

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const ROLES = ["admin", "bauleiter", "foreman", "monteur", "user"];

// ---- Edge-function caller -------------------------------------------------
async function callAdmin(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("bright-function", {
    body: { action, ...payload },
  });
  if (error) {
    let msg = error.message || String(error);
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const btn = "inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = "inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50";
const btnDanger = "inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50";
const inputCls = "w-full px-2 py-1.5 border rounded-md text-sm";

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("de-DE"); } catch { return String(d); }
}

function isBanned(u) {
  if (!u?.banned_until) return false;
  const t = new Date(u.banned_until).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export default function UserManagement() {
  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(user || null);
      if (!user) { setIsAdmin(false); return; }
      const { data: prof } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(prof?.role === "admin");
    })();
  }, []);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const res = await callAdmin("list");
      setUsers(res?.users || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) reload(); }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  }, [users, filter]);

  async function handleSetRole(u, newRole) {
    if (newRole === u.role) return;
    if (u.id === me?.id && newRole !== "admin") {
      alert("Du kannst dich nicht selbst degradieren.");
      return;
    }
    setBusyId(u.id);
    try {
      await callAdmin("set_role", { user_id: u.id, role: newRole });
      await reload();
    } catch (e) {
      alert("Rolle ändern fehlgeschlagen: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleBan(u) {
    if (u.id === me?.id) { alert("Du kannst dich nicht selbst sperren."); return; }
    if (!confirm(`Nutzer ${u.email} wirklich sperren?`)) return;
    setBusyId(u.id);
    try {
      await callAdmin("ban", { user_id: u.id });
      await reload();
    } catch (e) {
      alert("Sperren fehlgeschlagen: " + e.message);
    } finally { setBusyId(null); }
  }

  async function handleUnban(u) {
    setBusyId(u.id);
    try {
      await callAdmin("unban", { user_id: u.id });
      await reload();
    } catch (e) {
      alert("Entsperren fehlgeschlagen: " + e.message);
    } finally { setBusyId(null); }
  }

  if (isAdmin === null) {
    return <div className="p-6 text-gray-500">Lade…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Admin Center</h1>
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          Zugriff verweigert. Du benötigst die Rolle <code>admin</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin Center · Nutzerverwaltung</h1>
        <div className="flex gap-2">
          <button className={btn} onClick={reload} disabled={loading}>
            {loading ? "Lädt…" : "Neu laden"}
          </button>
          <button className={btnPrimary} onClick={() => setInviteOpen(true)}>
            + Nutzer einladen
          </button>
        </div>
      </div>

      <input
        className={inputCls + " mb-3 max-w-sm"}
        placeholder="Suchen (E-Mail, Name, Rolle)…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {err && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          {err}
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">E-Mail</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Rolle</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Letzter Login</th>
              <th className="px-3 py-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const banned = isBanned(u);
              const meRow = u.id === me?.id;
              const busy = busyId === u.id;
              return (
                <tr key={u.id} className="border-t hover:bg-gray-50/50">
                  <td className="px-3 py-2">
                    {u.email}
                    {meRow && <span className="ml-2 text-xs text-gray-400">(du)</span>}
                  </td>
                  <td className="px-3 py-2">{u.full_name || "—"}</td>
                  <td className="px-3 py-2">
                    <select
                      className="border rounded px-1 py-0.5 text-sm bg-white"
                      value={u.role || "user"}
                      disabled={busy || (meRow)}
                      onChange={(e) => handleSetRole(u, e.target.value)}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {banned ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">gesperrt</span>
                    ) : u.email_confirmed_at ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">aktiv</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs">eingeladen</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(u.last_sign_in_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button className={btn} disabled={busy} onClick={() => setPwOpen(u)}>
                        Passwort
                      </button>
                      {banned ? (
                        <button className={btn} disabled={busy} onClick={() => handleUnban(u)}>
                          Entsperren
                        </button>
                      ) : (
                        <button className={btnDanger} disabled={busy || meRow} onClick={() => handleBan(u)}>
                          Sperren
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Keine Nutzer.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onDone={async () => { setInviteOpen(false); await reload(); }}
      />

      <PasswordDialog
        user={pwOpen}
        onClose={() => setPwOpen(null)}
        onDone={() => setPwOpen(null)}
      />
    </div>
  );
}

function InviteDialog({ open, onClose, onDone }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { if (open) { setEmail(""); setFullName(""); setRole("user"); setErr(null); } }, [open]);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await callAdmin("invite", { email: email.trim(), full_name: fullName.trim() || null, role });
      onDone();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} title="Nutzer einladen" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">E-Mail</label>
          <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Voller Name (optional)</label>
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rolle</label>
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btn} onClick={onClose} disabled={busy}>Abbrechen</button>
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Sende…" : "Einladung senden"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordDialog({ user, onClose, onDone }) {
  const open = !!user;
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { if (open) { setPw(""); setErr(null); } }, [open]);

  function gen() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setPw(s);
  }

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 6) { setErr("Mindestens 6 Zeichen."); return; }
    setBusy(true); setErr(null);
    try {
      await callAdmin("set_password", { user_id: user.id, password: pw });
      alert(`Neues Passwort für ${user.email}:\n\n${pw}\n\nBitte sicher übermitteln.`);
      onDone();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} title={`Passwort setzen · ${user?.email || ""}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Neues Passwort</label>
          <div className="flex gap-2">
            <input className={inputCls} type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="min. 6 Zeichen" />
            <button type="button" className={btn} onClick={gen}>Generieren</button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Übermittle das Passwort dem Nutzer auf sicherem Weg.</p>
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btn} onClick={onClose} disabled={busy}>Abbrechen</button>
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Speichere…" : "Passwort setzen"}</button>
        </div>
      </form>
    </Modal>
  );
}

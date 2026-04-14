// Entity barrel.
// - `User` is backed by Supabase (Auth + profiles table).
// - `Project` is backed by Supabase (projects table).
// - All other entities still come from the Base44 stub for now; migrate incrementally.

import { supabase } from "@/lib/supabase";
import { base44 } from "@/api/base44Client";

// --- Supabase-backed User ---
async function fetchProfile(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function currentAuthUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export const User = {
  async me() {
    const id = await currentAuthUserId();
    if (!id) throw new Error("Nicht eingeloggt");
    const profile = await fetchProfile(id);
    if (!profile) throw new Error("Kein Profil für diesen Account");
    return profile;
  },
  async list() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },
  async get(id) {
    return fetchProfile(id);
  },
  async updateMyUserData(updates) {
    const id = await currentAuthUserId();
    if (!id) throw new Error("Nicht eingeloggt");
    const allowed = ["full_name", "phone"];
    const patch = Object.fromEntries(
      Object.entries(updates || {}).filter(([k]) => allowed.includes(k))
    );
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async logout() {
    await supabase.auth.signOut();
  },
};

// --- Supabase-backed Project ---
function parseSort(sort) {
  if (!sort) return { column: "created_at", ascending: false };
  let column = sort;
  let ascending = true;
  if (column.startsWith("-")) {
    ascending = false;
    column = column.slice(1);
  }
  if (column === "created_date") column = "created_at";
  if (column === "updated_date") column = "updated_at";
  return { column, ascending };
}

function normalizeProjectPayload(data) {
  if (!data) return data;
  const out = { ...data };
  delete out.created_date;
  delete out.updated_date;
  return out;
}

async function projectQuery({ filter, sort, limit } = {}) {
  let q = supabase.from("projects").select("*");
  if (filter && typeof filter === "object") {
    for (const [k, v] of Object.entries(filter)) {
      if (v === undefined) continue;
      if (v === null) q = q.is(k, null);
      else if (Array.isArray(v)) q = q.in(k, v);
      else q = q.eq(k, v);
    }
  }
  const { column, ascending } = parseSort(sort);
  q = q.order(column, { ascending, nullsFirst: false });
  if (typeof limit === "number" && limit > 0) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export const Project = {
  async list(sort, limit) {
    return projectQuery({ sort, limit });
  },
  async filter(criteria, sort, limit) {
    return projectQuery({ filter: criteria, sort, limit });
  },
  async get(id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async find(criteria) {
    const rows = await projectQuery({ filter: criteria, limit: 1 });
    return rows[0] ?? null;
  },
  async findOne(criteria) {
    return this.find(criteria);
  },
  async create(payload) {
    const row = normalizeProjectPayload(payload);
    const { data, error } = await supabase
      .from("projects")
      .insert(row)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id, patch) {
    const row = normalizeProjectPayload(patch);
    const { data, error } = await supabase
      .from("projects")
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
};

// --- Base44-backed entities (unchanged, migrate later) ---
export const Excavation = base44.entities.Excavation;
export const PriceItem = base44.entities.PriceItem;
export const ContactPerson = base44.entities.ContactPerson;
export const City = base44.entities.City;
export const Material = base44.entities.Material;
export const ProjectMaterial = base44.entities.ProjectMaterial;
export const TimesheetEntry = base44.entities.TimesheetEntry;
export const ProjectDocument = base44.entities.ProjectDocument;
export const PullingWork = base44.entities.PullingWork;
export const ProjectComment = base44.entities.ProjectComment;
export const MontageAuftrag = base44.entities.MontageAuftrag;
export const ExcavationMaterial = base44.entities.ExcavationMaterial;
export const MontagePreisItem = base44.entities.MontagePreisItem;
export const MontageLeistung = base44.entities.MontageLeistung;
export const MontageLeistungMaterial = base44.entities.MontageLeistungMaterial;
export const MontageMaterial = base44.entities.MontageMaterial;
export const Schaediger = base44.entities.Schaediger;
export const ExcavationClosure = base44.entities.ExcavationClosure;
export const ProjectActivity = base44.entities.ProjectActivity;
export const KolonnenSollwert = base44.entities.KolonnenSollwert;
export const Task = base44.entities.Task;
export const Notification = base44.entities.Notification;
export const BueroUserActivity = base44.entities.BueroUserActivity;
export const VisioNode = base44.entities.VisioNode;
export const VisioConnection = base44.entities.VisioConnection;
export const VehicleMaintenance = base44.entities.VehicleMaintenance;
export const BlowingWork = base44.entities.BlowingWork;
export const Beweissicherung = base44.entities.Beweissicherung;
export const Ticket = base44.entities.Ticket;
export const MaterialWithdrawal = base44.entities.MaterialWithdrawal;

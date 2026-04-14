// Entity barrel — all entities now backed by Supabase.
// Base44 stub is retained as a no-op fallback during transition (unused).

import { supabase } from "@/lib/supabase";

// --- Common helpers ---------------------------------------------------------
async function currentAuthUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

// Base44 sort format: "-field" = DESC, "field" = ASC.
// Base44 `created_date`/`updated_date` → Supabase `created_at`/`updated_at`.
function parseSort(sort, defaultCol = "created_at") {
  if (!sort) return { column: defaultCol, ascending: false };
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

// Drop fields that don't belong on Supabase rows. Everything else passes through.
function normalizePayload(data) {
  if (!data) return data;
  const out = { ...data };
  delete out.created_date;
  delete out.updated_date;
  return out;
}

// Generic Supabase entity adapter — mirrors the Base44 SDK shape.
function makeEntity(table) {
  async function query({ filter, sort, limit } = {}) {
    let q = supabase.from(table).select("*");
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

  return {
    async list(sort, limit) {
      return query({ sort, limit });
    },
    async filter(criteria, sort, limit) {
      return query({ filter: criteria, sort, limit });
    },
    async get(id) {
      if (!id) return null;
      const { data, error } = await supabase
        .from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async find(criteria) {
      const rows = await query({ filter: criteria, limit: 1 });
      return rows[0] ?? null;
    },
    async findOne(criteria) {
      return this.find(criteria);
    },
    async findById(id) {
      return this.get(id);
    },
    async create(payload) {
      const row = normalizePayload(payload);
      const { data, error } = await supabase
        .from(table).insert(row).select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    async update(id, patch) {
      const row = normalizePayload(patch);
      const { data, error } = await supabase
        .from(table).update(row).eq("id", id).select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    async upsert(payload) {
      const row = normalizePayload(payload);
      const { data, error } = await supabase
        .from(table).upsert(row).select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    },
    async remove(id) {
      return this.delete(id);
    },
  };
}

// --- User (Supabase Auth + profiles) ---------------------------------------
async function fetchProfile(id) {
  const { data, error } = await supabase
    .from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function currentAuthUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user ?? null;
}

export const User = {
  async me() {
    const authUser = await currentAuthUser();
    if (!authUser) throw new Error("Nicht eingeloggt");
    let profile = await fetchProfile(authUser.id);
    if (!profile) {
      const fallback = {
        id: authUser.id,
        email: authUser.email ?? null,
        full_name:
          authUser.user_metadata?.full_name || authUser.email || "Neuer Benutzer",
        role: "user",
      };
      const { data: created, error: createErr } = await supabase
        .from("profiles").insert(fallback).select("*").maybeSingle();
      if (createErr) {
        // eslint-disable-next-line no-console
        console.warn("[User.me] could not auto-create profile", createErr);
        profile = { ...fallback };
      } else {
        profile = created ?? fallback;
      }
    }
    return profile;
  },
  async list() {
    const { data, error } = await supabase
      .from("profiles").select("*")
      .order("full_name", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },
  async filter(criteria = {}) {
    let q = supabase.from("profiles").select("*");
    for (const [k, v] of Object.entries(criteria)) {
      if (v === undefined) continue;
      if (v === null) q = q.is(k, null);
      else if (Array.isArray(v)) q = q.in(k, v);
      else q = q.eq(k, v);
    }
    const { data, error } = await q;
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
      .from("profiles").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id, updates) {
    const { data, error } = await supabase
      .from("profiles").update(updates).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
  async logout() {
    await supabase.auth.signOut();
  },
};

// --- Project + alle anderen Entitäten über den generischen Adapter ---
export const Project                 = makeEntity("projects");
export const Excavation              = makeEntity("excavations");
export const PriceItem               = makeEntity("price_items");
export const ContactPerson           = makeEntity("contact_persons");
export const City                    = makeEntity("cities");
export const Material                = makeEntity("materials");
export const ProjectMaterial         = makeEntity("project_materials");
export const TimesheetEntry          = makeEntity("timesheet_entries");
export const ProjectDocument         = makeEntity("project_documents");
export const PullingWork             = makeEntity("pulling_works");
export const ProjectComment          = makeEntity("project_comments");
export const MontageAuftrag          = makeEntity("montage_auftraege");
export const ExcavationMaterial      = makeEntity("excavation_materials");
export const MontagePreisItem        = makeEntity("montage_preis_items");
export const MontageLeistung         = makeEntity("montage_leistungen");
export const MontageLeistungMaterial = makeEntity("montage_leistung_materials");
export const MontageMaterial         = makeEntity("montage_materials");
export const Schaediger              = makeEntity("schaediger");
export const ExcavationClosure       = makeEntity("excavation_closures");
export const ProjectActivity         = makeEntity("project_activities");
export const KolonnenSollwert        = makeEntity("kolonnen_sollwerte");
export const Task                    = makeEntity("tasks");
export const Notification            = makeEntity("notifications");
export const BueroUserActivity       = makeEntity("buero_user_activities");
export const VisioNode               = makeEntity("visio_nodes");
export const VisioConnection         = makeEntity("visio_connections");
export const VehicleMaintenance      = makeEntity("vehicle_maintenances");
export const BlowingWork             = makeEntity("blowing_works");
export const Beweissicherung         = makeEntity("beweissicherungen");
export const Ticket                  = makeEntity("tickets");
export const MaterialWithdrawal      = makeEntity("material_withdrawals");

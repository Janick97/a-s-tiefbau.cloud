// Entity barrel.
// - `User` is backed by Supabase (Auth + profiles table) — no Base44 dependency.
// - All other entities still come from the Base44 SDK for now; migrate incrementally.
//
// The `User` adapter exposes the same shape the app already uses:
//   User.me()              -> profile row  { id, email, full_name, role, position, ... }
//   User.list()            -> profile rows (admins see all, others visible via RLS)
//   User.get(id)           -> single profile
//   User.updateMyUserData  -> update own profile
//   User.logout()          -> sign out of supabase
//
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

// --- Base44-backed entities (unchanged, migrate later) ---
export const Project = base44.entities.Project;
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
// src/entities/all.js

export const Project = base44.entities.Project;
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

export const User = base44.auth;

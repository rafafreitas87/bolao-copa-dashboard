import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { listDevParticipants } from "@/lib/dev-store";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const cookieStore = await cookies();

    if (cookieStore.get("dev_admin_session")?.value === "true") {
      return {
        id: "dev-admin",
        email: "admin@local.test",
        name: "Admin Local",
        role: "ADMIN",
        participant_id: null,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      } satisfies Profile;
    }

    const participantId = cookieStore.get("dev_participant_session")?.value;

    if (participantId) {
      const participants = await listDevParticipants();
      const participant = participants.find((row) => row.id === participantId);

      if (participant) {
        return {
          id: `dev-participant-${participant.id}`,
          email: participant.email ?? `${slugify(participant.displayName)}@local.test`,
          name: participant.displayName,
          role: "PARTICIPANT",
          participant_id: participant.id,
          created_at: participant.createdAt,
          updated_at: participant.updatedAt,
        } satisfies Profile;
      }
    }

    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile as Profile;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
}

export async function requireUser() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export async function requireAdmin() {
  const profile = await requireUser();

  if (profile.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return profile;
}

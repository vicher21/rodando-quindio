
import { supabase } from "./supabase";

export type ClientProfile = {
  id: string;
  full_name: string;
  phone: string;
  role: "client";
};

export async function getClientProfile(): Promise<ClientProfile | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;

  // Si la sesión pertenece a un administrador o conductor,
  // no la tratamos como una sesión de cliente.
  if (!data || data.role !== "client") {
    return null;
  }

  return data as ClientProfile;
}

export async function registerClient(
  fullName: string,
  phone: string
): Promise<ClientProfile> {
  const cleanName = fullName.trim();
  const cleanPhone = phone.trim();

  if (cleanName.length < 2) {
    throw new Error("Escribe tu nombre completo.");
  }

  if (cleanPhone.replace(/\D/g, "").length < 7) {
    throw new Error("Escribe un número de celular válido.");
  }

  let {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (session) {
    const { data: existingProfile, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (existingProfile?.role === "client") {
      return existingProfile as ClientProfile;
    }

    if (existingProfile && existingProfile.role !== "client") {
      throw new Error(
        "Tienes una sesión de administrador o conductor abierta. Cierra esa sesión antes de registrarte como cliente."
      );
    }
  } else {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) throw error;

    if (!data.session) {
      throw new Error("No se pudo iniciar la sesión del cliente.");
    }

    session = data.session;
  }

  const { data: profile, error: profileError } = await supabase.rpc(
    "create_client_profile",
    {
      p_full_name: cleanName,
      p_phone: cleanPhone,
    }
  );

  if (profileError) throw profileError;

  if (!profile) {
    throw new Error("No se pudo guardar el perfil del cliente.");
  }

  return profile as ClientProfile;
}

export async function logoutClient(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}


import { supabase } from "./supabase";

export type ClientProfile = {
  id: string;
  full_name: string;
  phone: string;
  role: "client";
};

/**
 * Recupera el perfil del cliente que tiene una sesión activa.
 * Devuelve null si no hay sesión o todavía no existe un perfil.
 */
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
  if (!data) return null;

  if (data.role !== "client") {
    throw new Error(
      "Esta sesión pertenece a otro tipo de usuario. Utiliza el acceso correspondiente."
    );
  }

  return data as ClientProfile;
}

/**
 * Registra al cliente una sola vez.
 * Si ya tiene una sesión anónima, la reutiliza.
 */
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

  // Si ya existe una sesión, comprobamos si tiene un perfil.
  if (session) {
    const existingProfile = await getClientProfile();

    if (existingProfile) {
      return existingProfile;
    }
  } else {
    // Primera visita: crear una identidad anónima.
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) throw error;
    if (!data.session) {
      throw new Error("No se pudo iniciar la sesión del cliente.");
    }

    session = data.session;
  }

  // Guardar los datos del cliente mediante nuestra función SQL.
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

/**
 * Cierra la sesión del cliente en este dispositivo.
 */
export async function logoutClient(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

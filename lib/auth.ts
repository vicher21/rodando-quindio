
import { supabase } from "./supabase";

export type UserRole = "client" | "driver" | "admin";

export type RegisterData = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: "client" | "driver";

  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  licensePlate?: string;
  licenseNumber?: string;
  capacity?: number;
};

export async function registerUser(data: RegisterData) {
  const metadata: Record<string, string | number> = {
    full_name: data.fullName.trim(),
    phone: data.phone.trim(),
    role: data.role,
  };

  if (data.role === "driver") {
    Object.assign(metadata, {
      vehicle_brand: data.vehicleBrand?.trim() || "",
      vehicle_model: data.vehicleModel?.trim() || "",
      vehicle_year: data.vehicleYear || "",
      vehicle_color: data.vehicleColor?.trim() || "",
      license_plate: data.licensePlate?.trim().toUpperCase() || "",
      license_number: data.licenseNumber?.trim() || "",
      capacity: data.capacity || 4,
    });
  }

  const { data: result, error } = await supabase.auth.signUp({
    email: data.email.trim(),
    password: data.password,
    options: {
      data: metadata,
    },
  });

  if (error) throw error;

  return result;
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;

  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function getCurrentProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return profile;
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { logoutUser } from "../../lib/auth";

type DriverData = {
  id: string;
  full_name: string;
  phone: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string;
  license_plate: string;
  status: string;
  available: boolean;
};

export default function DriverDashboard() {
  const router = useRouter();

  const [driver, setDriver] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDriver() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/driver/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, phone, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile || profile.role !== "driver") {
          await supabase.auth.signOut();
          router.replace("/driver/login");
          return;
        }

        const { data: driverProfile, error: driverError } = await supabase
          .from("driver_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (driverError) throw driverError;

        if (!driverProfile) {
          throw new Error(
            "No encontramos tu perfil de conductor. Contacta con administración."
          );
        }

        if (!active) return;

        if (driverProfile.status !== "approved") {
          router.replace("/driver/login");
          return;
        }

        setDriver({
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          vehicle_brand: driverProfile.vehicle_brand,
          vehicle_model: driverProfile.vehicle_model,
          vehicle_year: driverProfile.vehicle_year,
          vehicle_color: driverProfile.vehicle_color,
          license_plate: driverProfile.license_plate,
          status: driverProfile.status,
          available: driverProfile.available,
        });
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No pudimos cargar tu panel."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDriver();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await logoutUser();
      router.replace("/driver/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cerrar la sesión."
      );
    }
  }

  if (loading) {
    return (
      <main className="driver-dashboard-loading">
        <div className="driver-loading-symbol">🚘</div>
        <p>Preparando tu espacio de conductor...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="driver-dashboard-loading">
        <div className="driver-dashboard-error">
          <h2>No pudimos abrir tu panel</h2>
          <p>{error}</p>
          <button onClick={() => router.replace("/driver/login")}>
            Volver al acceso
          </button>
        </div>
      </main>
    );
  }

  if (!driver) return null;

  return (
    <main className="driver-dashboard">
      <header className="driver-dashboard-header">
        <a href="/" className="driver-dashboard-brand">
          <span>↗</span>
          <strong>rodando</strong>
          <small>QUINDÍO</small>
        </a>

        <button
          className="driver-dashboard-logout"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </header>

      <section className="driver-dashboard-welcome">
        <span className="driver-dashboard-kicker">
          PORTAL DE CONDUCTORES
        </span>

        <h1>
          ¡Hola, {driver.full_name.split(" ")[0]}!
        </h1>

        <p>
          Este es tu espacio de trabajo en Rodando Quindío.
        </p>

        <div className="driver-dashboard-status">
          <span className="driver-status-dot" />
          Conductor aprobado
        </div>
      </section>

      <section className="driver-dashboard-grid">
        <article className="driver-dashboard-card">
          <span className="driver-card-icon">🚘</span>
          <span className="driver-card-label">MI VEHÍCULO</span>
          <h2>
            {driver.vehicle_brand} {driver.vehicle_model}
          </h2>
          <p>
            {driver.vehicle_year} · {driver.vehicle_color}
          </p>
          <div className="driver-card-plate">
            {driver.license_plate}
          </div>
        </article>

        <article className="driver-dashboard-card">
          <span className="driver-card-icon">📋</span>
          <span className="driver-card-label">MI CUENTA</span>
          <h2>Perfil activo</h2>
          <p>{driver.full_name}</p>
          <p>{driver.phone}</p>
        </article>

        <article className="driver-dashboard-card">
          <span className="driver-card-icon">🟢</span>
          <span className="driver-card-label">DISPONIBILIDAD</span>
          <h2>
            {driver.available ? "Disponible" : "No disponible"}
          </h2>
          <p>
            {driver.available
              ? "Tu perfil figura como disponible en el sistema."
              : "Tu perfil figura como no disponible en el sistema."}
          </p>
        </article>
      </section>

      <section className="driver-dashboard-next">
        <div>
          <span className="driver-dashboard-kicker">
            TU SIGUIENTE PASO
          </span>
          <h2>Prepárate para rodar.</h2>
          <p>
            Aquí podrás consultar las solicitudes de servicio que
            administración envíe a tu cuenta.
          </p>
        </div>

        <span className="driver-next-icon">✳</span>
      </section>

      <footer className="driver-dashboard-footer">
        Rodando Quindío · Conectamos caminos, acercamos destinos.
      </footer>
    </main>
  );
}

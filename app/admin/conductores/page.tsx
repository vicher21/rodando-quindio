
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth";

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: number | string;
  vehicle_color: string;
  license_plate: string;
  capacity: number;
  license_number: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  available: boolean;
  approved_at: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  phone: string;
};

const statusLabels = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  suspended: "Suspendido",
};

export default function AdminDriversPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const profile = await getCurrentProfile();

      if (!profile || profile.role !== "admin") {
        router.replace("/admin/login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("driver_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (driverError) throw driverError;

      const ids = (driverData ?? []).map((driver) => driver.id);
      let profiles: Profile[] = [];

      if (ids.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", ids);

        if (profileError) throw profileError;
        profiles = (profileData ?? []) as Profile[];
      }

      const merged = (driverData ?? []).map((driver) => {
        const person = profiles.find((item) => item.id === driver.id);

        return {
          ...driver,
          full_name: person?.full_name ?? "Nombre no disponible",
          phone: person?.phone ?? "Teléfono no disponible",
        };
      });

      setDrivers(merged as Driver[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los conductores."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  async function updateDriver(
    driverId: string,
    newStatus: Driver["status"]
  ) {
    const actionLabels = {
      approved: "aprobar",
      rejected: "rechazar",
      suspended: "suspender",
      pending: "reactivar",
    };

    const confirmed = window.confirm(
      `¿Deseas ${actionLabels[newStatus]} este conductor?`
    );

    if (!confirmed) return;

    setUpdating(driverId);
    setMessage("");
    setError("");

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        available: false,
      };

      if (newStatus === "approved") {
        updateData.approved_at = new Date().toISOString();
      }

      if (newStatus === "pending") {
        updateData.approved_at = null;
      }

      const { error: updateError } = await supabase
        .from("driver_profiles")
        .update(updateData)
        .eq("id", driverId);

      if (updateError) throw updateError;

      setMessage("El estado del conductor se actualizó correctamente.");
      await loadDrivers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el conductor."
      );
    } finally {
      setUpdating(null);
    }
  }

  const filteredDrivers =
    filter === "all"
      ? drivers
      : drivers.filter((driver) => driver.status === filter);

  const pendingCount = drivers.filter(
    (driver) => driver.status === "pending"
  ).length;

  const approvedCount = drivers.filter(
    (driver) => driver.status === "approved"
  ).length;

  const suspendedCount = drivers.filter(
    (driver) => driver.status === "suspended"
  ).length;

  if (loading) {
    return (
      <main className="admin-loading">
        <p>Cargando conductores...</p>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-brand-mark">RQ</span>
          <div>
            <strong>Rodando</strong>
            <small>QUINDÍO</small>
          </div>
        </div>

        <p className="admin-menu-label">ADMINISTRACIÓN</p>

        <nav className="admin-menu">
          <a href="/admin">▦ Resumen</a>
          <a href="/admin#solicitudes">◷ Solicitudes</a>
          <a href="/admin/conductores" className="active">
            ♙ Conductores
          </a>
          <a href="/admin#tarifas">＄ Tarifas</a>
        </nav>

        <a href="/admin" className="admin-logout-button">
          Volver al resumen
        </a>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">GESTIÓN DE CONDUCTORES</span>
            <h1>Conductores</h1>
            <p>Revisa registros y administra las autorizaciones.</p>
          </div>

          <button
            className="admin-refresh-button"
            onClick={loadDrivers}
          >
            ↻ Actualizar
          </button>
        </header>

        <section className="admin-driver-stats">
          <article>
            <span>Total registrados</span>
            <strong>{drivers.length}</strong>
          </article>
          <article>
            <span>Pendientes</span>
            <strong>{pendingCount}</strong>
          </article>
          <article>
            <span>Aprobados</span>
            <strong>{approvedCount}</strong>
          </article>
          <article>
            <span>Suspendidos</span>
            <strong>{suspendedCount}</strong>
          </article>
        </section>

        {message && (
          <p className="admin-success-message">{message}</p>
        )}

        {error && (
          <p className="admin-error-message">{error}</p>
        )}

        <section className="admin-driver-section">
          <div className="admin-driver-heading">
            <div>
              <h2>Solicitudes de conductores</h2>
              <p>Consulta la información de cada vehículo y su propietario.</p>
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="admin-empty-state">
              <span>🚘</span>
              <h3>No hay conductores en esta categoría</h3>
              <p>Cuando existan registros, aparecerán aquí.</p>
            </div>
          ) : (
            <div className="admin-driver-list">
              {filteredDrivers.map((driver) => (
                <article className="admin-driver-card" key={driver.id}>
                  <div className="admin-driver-card-header">
                    <div>
                      <span className="admin-driver-plate">
                        {driver.license_plate}
                      </span>
                      <h3>{driver.full_name}</h3>
                      <p>{driver.phone}</p>
                    </div>

                    <span className={`driver-status ${driver.status}`}>
                      {statusLabels[driver.status]}
                    </span>
                  </div>

                  <div className="admin-driver-details">
                    <div>
                      <small>Vehículo</small>
                      <strong>
                        {driver.vehicle_brand} {driver.vehicle_model}
                      </strong>
                    </div>
                    <div>
                      <small>Año</small>
                      <strong>{driver.vehicle_year}</strong>
                    </div>
                    <div>
                      <small>Color</small>
                      <strong>{driver.vehicle_color}</strong>
                    </div>
                    <div>
                      <small>Capacidad</small>
                      <strong>{driver.capacity} pasajeros</strong>
                    </div>
                    <div>
                      <small>Licencia</small>
                      <strong>{driver.license_number}</strong>
                    </div>
                    <div>
                      <small>Disponibilidad</small>
                      <strong>
                        {driver.available ? "Disponible" : "No disponible"}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-driver-card-footer">
                    <small>
                      Registro:{" "}
                      {new Date(driver.created_at).toLocaleDateString("es-CO")}
                    </small>

                    <div className="admin-driver-actions">
                      {driver.status === "pending" && (
                        <>
                          <button
                            className="driver-reject-button"
                            disabled={updating === driver.id}
                            onClick={() =>
                              updateDriver(driver.id, "rejected")
                            }
                          >
                            Rechazar
                          </button>
                          <button
                            className="driver-approve-button"
                            disabled={updating === driver.id}
                            onClick={() =>
                              updateDriver(driver.id, "approved")
                            }
                          >
                            {updating === driver.id
                              ? "Guardando..."
                              : "Aprobar conductor"}
                          </button>
                        </>
                      )}

                      {driver.status === "approved" && (
                        <button
                          className="driver-reject-button"
                          disabled={updating === driver.id}
                          onClick={() =>
                            updateDriver(driver.id, "suspended")
                          }
                        >
                          Suspender
                        </button>
                      )}

                      {(driver.status === "rejected" ||
                        driver.status === "suspended") && (
                        <button
                          className="driver-approve-button"
                          disabled={updating === driver.id}
                          onClick={() =>
                            updateDriver(driver.id, "pending")
                          }
                        >
                          Reactivar revisión
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

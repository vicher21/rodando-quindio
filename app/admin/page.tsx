
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, logoutUser } from "@/lib/auth";

type AdminProfile = {
  full_name?: string;
  email?: string;
  role: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      try {
        const currentProfile = await getCurrentProfile();

        if (!currentProfile || currentProfile.role !== "admin") {
          router.replace("/admin/login");
          return;
        }

        if (active) {
          setProfile(currentProfile as AdminProfile);
        }
      } catch {
        router.replace("/admin/login");
      } finally {
        if (active) setLoading(false);
      }
    }

    verifyAdmin();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await logoutUser();
    router.replace("/admin/login");
  }

  if (loading || !profile) {
    return (
      <main className="admin-loading">
        <p>Verificando acceso administrativo...</p>
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
          <a href="/admin" className="active">▦ Resumen</a>
          <a href="#solicitudes">◷ Solicitudes</a>
          <a href="/admin/conductores">♙ Conductores</a>
          <a href="#tarifas">＄ Tarifas</a>
        </nav>

        <button
          className="admin-logout-button"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">CENTRO DE CONTROL</span>
            <h1>¡Hola, {profile.full_name || "Administrador"}!</h1>
            <p>Este es el estado general de Rodando Quindío.</p>
          </div>

          <span className="admin-role-badge">ADMINISTRADOR</span>
        </header>

        <section className="admin-welcome-panel">
          <div>
            <span>RODANDO QUINDÍO</span>
            <h2>Tu operación, en un solo lugar.</h2>
            <p>
              Desde aquí podrás supervisar solicitudes, conductores
              y el funcionamiento de la plataforma.
            </p>
          </div>
          <div className="admin-welcome-icon">🚘</div>
        </section>

        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <span>Solicitudes</span>
            <strong>—</strong>
            <small>En total</small>
          </article>

          <article className="admin-stat-card">
            <span>Conductores</span>
            <strong>—</strong>
            <small>Registrados</small>
          </article>

          <article className="admin-stat-card">
            <span>Por aprobar</span>
            <strong>—</strong>
            <small>Conductores pendientes</small>
          </article>

          <article className="admin-stat-card">
            <span>En servicio</span>
            <strong>—</strong>
            <small>Solicitudes activas</small>
          </article>
        </section>

        <section className="admin-modules">
          <h2>Módulos de gestión</h2>
          <div className="admin-module-grid">
            <article id="solicitudes">
              <span>◷</span>
              <h3>Solicitudes</h3>
              <p>Consulta y gestiona los viajes y envíos solicitados.</p>
              <small>Próximamente</small>
            </article>

            <article id="conductores">
              <span>♙</span>
              <h3>Conductores</h3>
              <p>Revisa registros, documentos y disponibilidad.</p>
              <small>Próximamente</small>
            </article>

            <article id="tarifas">
              <span>＄</span>
              <h3>Tarifas</h3>
              <p>Configura los precios de los servicios.</p>
              <small>Próximamente</small>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, getCurrentProfile, logoutUser } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      await loginUser(email, password);

      const profile = await getCurrentProfile();

      if (profile?.role !== "admin") {
        await logoutUser();
        setErrorMessage(
          "Esta cuenta no tiene permisos de administrador."
        );
        return;
      }

      router.replace("/admin");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos iniciar sesión. Verifica tus datos."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-brand-mark">RQ</div>

        <span className="admin-eyebrow">RODANDO QUINDÍO</span>
        <h1>Panel administrativo</h1>
        <p className="admin-login-description">
          Ingresa con tu cuenta autorizada para gestionar la plataforma.
        </p>

        <form onSubmit={handleLogin} className="admin-login-form">
          <label htmlFor="admin-email">Correo electrónico</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            placeholder="admin@rodandoquindio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="admin-password">Contraseña</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {errorMessage && (
            <p className="admin-login-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Verificando acceso..." : "Ingresar al panel"}
          </button>
        </form>

        <a href="/" className="admin-back-link">
          ← Volver al inicio
        </a>
      </section>
    </main>
  );
}

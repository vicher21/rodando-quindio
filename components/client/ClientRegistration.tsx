
"use client";

import { useState, type FormEvent } from "react";
import {
  registerClient,
  type ClientProfile,
} from "../../lib/client-auth";

type Props = {
  onRegistered: (profile: ClientProfile) => void;
};

export default function ClientRegistration({ onRegistered }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (fullName.trim().length < 2) {
      setError("Por favor, escribe tu nombre completo.");
      return;
    }

    if (phone.replace(/\D/g, "").length < 7) {
      setError("Por favor, escribe un celular válido.");
      return;
    }

    setLoading(true);

    try {
      const profile = await registerClient(fullName, phone);
      onRegistered(profile);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos crear tu perfil. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="client-registration">
      <div className="registration-heading">
        <span className="section-kicker">BIENVENIDO A RODANDO</span>
        <h2>Empecemos por conocerte.</h2>
        <p>
          Solo necesitamos tu nombre y celular. Guardaremos tus datos
          para que no tengas que escribirlos cada vez que quieras viajar.
        </p>
      </div>

      <form className="registration-form" onSubmit={handleSubmit}>
        <label className="registration-field">
          <span>Nombre completo</span>
          <input
            type="text"
            autoComplete="name"
            placeholder="¿Cómo te llamas?"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={100}
            required
          />
        </label>

        <label className="registration-field">
          <span>Número de celular</span>
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Tu número de contacto"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={20}
            required
          />
        </label>

        {error && (
          <p className="registration-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="button button-primary registration-submit"
          disabled={loading}
        >
          {loading ? "Creando tu perfil..." : "Comenzar a rodar"}
          {!loading && <span>↗</span>}
        </button>

        <p className="registration-privacy">
          Tus datos se utilizarán para gestionar tus solicitudes de servicio.
        </p>
      </form>
    </section>
  );
}

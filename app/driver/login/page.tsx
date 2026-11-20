
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  loginUser,
  registerUser,
} from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

type Mode = "login" | "register";

export default function DriverLoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  function showMessage(text: string, type: "error" | "success" = "error") {
    setMessage(text);
    setMessageType(type);
  }

  async function checkDriverAccess() {
    const profile = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    if (profile.error) throw profile.error;

    if (!profile.data || profile.data.role !== "driver") {
      throw new Error(
        "Esta cuenta no está registrada como conductor. Utiliza el acceso correspondiente."
      );
    }

    const { data: driver, error } = await supabase
      .from("driver_profiles")
      .select("status, available")
      .eq("id", profile.data.id)
      .maybeSingle();

    if (error) throw error;

    if (!driver) {
      throw new Error(
        "No encontramos tu solicitud de conductor. Contacta con administración."
      );
    }

    if (driver.status === "pending") {
      showMessage(
        "Tu registro fue recibido. Estamos esperando la aprobación de administración.",
        "success"
      );
      return;
    }

    if (driver.status === "rejected") {
      showMessage(
        "Tu solicitud de conductor no fue aprobada. Contacta con administración."
      );
      return;
    }

    if (driver.status === "suspended") {
      showMessage(
        "Tu cuenta de conductor está suspendida. Contacta con administración."
      );
      return;
    }

    if (driver.status !== "approved") {
      showMessage("Tu cuenta todavía no está habilitada.");
      return;
    }

    router.push("/driver");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await loginUser(email, password);
      await checkDriverAccess();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
      }

      if (phone.replace(/\D/g, "").length < 7) {
        throw new Error("Escribe un número de celular válido.");
      }

      await registerUser({
        fullName,
        email,
        password,
        phone,
        role: "driver",
        vehicleBrand,
        vehicleModel,
        vehicleYear,
        vehicleColor,
        licensePlate,
        licenseNumber,
        capacity: 4,
      });

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        showMessage(
          "Tu registro fue enviado. Si Supabase solicita confirmar el correo, revisa tu bandeja de entrada. Después podrás iniciar sesión.",
          "success"
        );
        setMode("login");
        return;
      }

      await checkDriverAccess();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "No fue posible completar el registro."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="driver-auth-page">
      <div className="driver-auth-decoration driver-auth-decoration-one" />
      <div className="driver-auth-decoration driver-auth-decoration-two" />

      <a href="/" className="driver-auth-brand">
        <span className="driver-auth-brand-icon">↗</span>
        <span>
          <strong>rodando</strong>
          <small>QUINDÍO</small>
        </span>
      </a>

      <section className="driver-auth-card">
        <a href="/" className="driver-auth-back">
          ← Volver al inicio
        </a>

        <div className="driver-auth-icon">🚘</div>

        <span className="driver-auth-kicker">
          {mode === "login" ? "PORTAL DE CONDUCTORES" : "ÚNETE A RODANDO"}
        </span>

        <h1>
          {mode === "login"
            ? "Bienvenido de nuevo."
            : "Conduce con nosotros."}
        </h1>

        <p className="driver-auth-description">
          {mode === "login"
            ? "Ingresa a tu cuenta para gestionar tus servicios y recorridos."
            : "Completa tus datos para solicitar tu registro como conductor."}
        </p>

        <div className="driver-auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
          >
            Registrarme
          </button>
        </div>

        <form
          className="driver-auth-form"
          onSubmit={mode === "login" ? handleLogin : handleRegister}
        >
          {mode === "register" && (
            <>
              <div className="driver-auth-field">
                <label>Nombre completo</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                />
              </div>

              <div className="driver-auth-field">
                <label>Celular</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Tu número de contacto"
                  inputMode="tel"
                  required
                />
              </div>
            </>
          )}

          <div className="driver-auth-field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="driver-auth-field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>

          {mode === "register" && (
            <>
              <div className="driver-auth-divider">
                <span>INFORMACIÓN DEL VEHÍCULO</span>
              </div>

              <div className="driver-auth-field">
                <label>Marca del vehículo</label>
                <input
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  placeholder="Ej. Chevrolet"
                  required
                />
              </div>

              <div className="driver-auth-field">
                <label>Modelo</label>
                <input
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ej. Aveo"
                  required
                />
              </div>

              <div className="driver-auth-row">
                <div className="driver-auth-field">
                  <label>Año</label>
                  <input
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="Ej. 2018"
                    inputMode="numeric"
                    required
                  />
                </div>

                <div className="driver-auth-field">
                  <label>Color</label>
                  <input
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="Ej. Blanco"
                    required
                  />
                </div>
              </div>

              <div className="driver-auth-field">
                <label>Placa</label>
                <input
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Ej. ABC123"
                  required
                />
              </div>

              <div className="driver-auth-field">
                <label>Número de licencia de conducción</label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Número de licencia"
                  required
                />
              </div>

              <p className="driver-auth-notice">
                Tu registro quedará pendiente de revisión. Administración
                deberá aprobarlo antes de que puedas recibir servicios.
              </p>
            </>
          )}

          {message && (
            <div
              className={`driver-auth-message ${messageType}`}
              role="status"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="driver-auth-submit"
            disabled={loading}
          >
            {loading
              ? "Un momento..."
              : mode === "login"
                ? "Ingresar a mi cuenta"
                : "Enviar solicitud de registro"}
            {!loading && <span>↗</span>}
          </button>
        </form>

        <p className="driver-auth-footer">
          Rodando Quindío · Conectamos caminos, acercamos destinos.
        </p>
      </section>
    </main>
  );
}

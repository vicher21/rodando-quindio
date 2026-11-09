
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentProfile,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Role = "cliente" | "conductor" | "admin";
type AuthMode = "login" | "register";
type DriverStatus = "approved" | "rejected";

type Driver = {
  id: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  license_plate: string | null;
  license_number: string | null;
  capacity: number;
  status: string;
  created_at: string;
  profile?: {
    full_name: string;
    phone: string | null;
  };
};

const roleInfo = {
  cliente: {
    title: "¡Hola! ¿A dónde vamos?",
    subtitle: "Tu próximo destino está más cerca.",
  },
  conductor: {
    title: "Tu camino comienza aquí",
    subtitle: "Conecta con nuevos servicios en el Quindío.",
  },
  admin: {
    title: "Panel de Rodando",
    subtitle: "Gestiona la operación de tu comunidad.",
  },
};

const databaseRoles = {
  cliente: "client",
  conductor: "driver",
  admin: "admin",
};

export default function Home() {
  // NAVEGACIÓN Y AUTENTICACIÓN

  const [role, setRole] = useState<Role | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [profile, setProfile] = useState<any>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // INFORMACIÓN DEL VEHÍCULO

  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [capacity, setCapacity] = useState("4");

  // ADMINISTRACIÓN

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverMessage, setDriverMessage] = useState("");
  const [processingDriver, setProcessingDriver] = useState<string | null>(null);

  // CLIENTE

  const [service, setService] = useState<"carro" | "mensajeria">("carro");
  const [passengers, setPassengers] = useState("1");

  // --------------------------------------------------
  // NAVEGACIÓN
  // --------------------------------------------------

  function selectRole(selectedRole: Role) {
    setRole(selectedRole);
    setAuthMode("login");
    setProfile(null);

    setNotice("");
    setError("");
    setDriverMessage("");

    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");

    setVehicleBrand("");
    setVehicleModel("");
    setVehicleYear("");
    setVehicleColor("");
    setLicensePlate("");
    setLicenseNumber("");
    setCapacity("4");

    setDrivers([]);
  }

  function goHome() {
    setRole(null);
    setProfile(null);
    setNotice("");
    setError("");
    setDriverMessage("");
    setDrivers([]);
  }

  // --------------------------------------------------
  // REGISTRO E INICIO DE SESIÓN
  // --------------------------------------------------

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!role) return;

    setLoading(true);
    setNotice("");
    setError("");

    try {
      if (authMode === "register") {
        if (role === "admin") {
          throw new Error("El registro de administradores no está permitido.");
        }

        if (password.length < 8) {
          throw new Error("La contraseña debe tener al menos 8 caracteres.");
        }

        if (!/^[0-9+\s()-]{7,20}$/.test(phone.trim())) {
          throw new Error("Ingresa un número de teléfono válido.");
        }

        if (role === "conductor") {
          const currentYear = new Date().getFullYear();

          if (
            !vehicleYear ||
            Number(vehicleYear) < 1990 ||
            Number(vehicleYear) > currentYear + 1
          ) {
            throw new Error("Verifica el año del vehículo.");
          }

          if (!/^[A-Za-z0-9-]{5,8}$/.test(licensePlate.trim())) {
            throw new Error("Verifica el formato de la placa.");
          }

          if (!licenseNumber.trim()) {
            throw new Error("Ingresa tu número de licencia de conducción.");
          }
        }

        const result = await registerUser({
          fullName,
          email,
          password,
          phone,
          role: databaseRoles[role] as "client" | "driver",

          ...(role === "conductor" && {
            vehicleBrand,
            vehicleModel,
            vehicleYear,
            vehicleColor,
            licensePlate,
            licenseNumber,
            capacity: Number(capacity),
          }),
        });

        if (!result.session) {
          setNotice(
            "¡Tu cuenta fue creada! Revisa tu correo para confirmar el registro. Después podrás iniciar sesión."
          );
        } else {
          const currentProfile = await getCurrentProfile();

          setProfile(currentProfile);

          if (role === "conductor") {
            setNotice(
              "¡Tu solicitud fue recibida! Tu cuenta está pendiente de aprobación."
            );
          } else {
            setNotice("¡Bienvenido a Rodando Quindío!");
          }
        }
      } else {
        await loginUser(email, password);

        const currentProfile = await getCurrentProfile();

        if (!currentProfile) {
          await logoutUser();
          throw new Error("No encontramos tu perfil. Contacta a administración.");
        }

        if (currentProfile.role !== databaseRoles[role]) {
          await logoutUser();

          throw new Error(
            "Esta cuenta no corresponde al tipo de acceso seleccionado."
          );
        }

        if (role === "conductor") {
          const { data: driver, error: driverError } = await supabase
            .from("driver_profiles")
            .select("status")
            .eq("id", currentProfile.id)
            .single();

          if (driverError) throw driverError;

          if (driver.status !== "approved") {
            await logoutUser();

            throw new Error(
              driver.status === "rejected"
                ? "Tu solicitud no fue aprobada. Contacta a administración."
                : "Tu cuenta está pendiente de aprobación. Te avisaremos cuando puedas recibir servicios."
            );
          }
        }

        setProfile(currentProfile);
        setNotice("¡Has iniciado sesión correctamente!");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // CERRAR SESIÓN
  // --------------------------------------------------

  async function handleLogout() {
    try {
      await logoutUser();
      goHome();
    } catch {
      setError("No fue posible cerrar la sesión.");
    }
  }

  // --------------------------------------------------
  // CONSULTAR SOLICITUDES DE CONDUCTORES
  // --------------------------------------------------

  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    setDriverMessage("");

    try {
      const { data: driverData, error: driverError } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (driverError) throw driverError;

      if (!driverData || driverData.length === 0) {
        setDrivers([]);
        return;
      }

      const ids = driverData.map((driver) => driver.id);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ids);

      if (profilesError) throw profilesError;

      const combined: Driver[] = driverData.map((driver) => ({
        ...driver,
        profile: profilesData?.find((p) => p.id === driver.id),
      }));

      setDrivers(combined);
    } catch (err) {
      setDriverMessage(
        err instanceof Error
          ? err.message
          : "No pudimos cargar las solicitudes."
      );
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === "admin") {
      void loadDrivers();
    }
  }, [profile, loadDrivers]);

  // --------------------------------------------------
  // APROBAR O RECHAZAR CONDUCTORES
  // --------------------------------------------------

  async function updateDriverStatus(
    driverId: string,
    status: DriverStatus
  ) {
    const action = status === "approved" ? "aprobar" : "rechazar";

    if (!window.confirm(`¿Deseas ${action} esta solicitud?`)) {
      return;
    }

    setProcessingDriver(driverId);
    setDriverMessage("");

    try {
      const { data, error: updateError } = await supabase
        .from("driver_profiles")
        .update({
          status,
          available: false,
          approved_at:
            status === "approved"
              ? new Date().toISOString()
              : null,
        })
        .eq("id", driverId)
        .eq("status", "pending")
        .select("id");

      if (updateError) throw updateError;

      if (!data || data.length === 0) {
        throw new Error(
          "No se pudo actualizar la solicitud. Verifica sus permisos o su estado."
        );
      }

      setDriverMessage(
        status === "approved"
          ? "¡Conductor aprobado correctamente!"
          : "La solicitud fue rechazada."
      );

      await loadDrivers();
    } catch (err) {
      setDriverMessage(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar la solicitud."
      );
    } finally {
      setProcessingDriver(null);
    }
  }

  // --------------------------------------------------
  // SOLICITUD DE SERVICIO (PRÓXIMA ETAPA)
  // --------------------------------------------------

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setNotice(
      "Tu solicitud está preparada. Próximamente podrás enviarla directamente a los conductores."
    );
  }

  // --------------------------------------------------
  // INTERFAZ
  // --------------------------------------------------

  return (
    <main className="min-h-screen overflow-hidden">

      {/* ENCABEZADO */}

      <header className="site-header">
        <a className="brand" href="#" onClick={goHome}>
          <span className="brand-mark">rq</span>
          <span>
            <strong>Rodando</strong>
            <small>QUINDÍO</small>
          </span>
        </a>

        <div className="header-note">
          <span className="status-dot" />
          Hecho con cariño en el Quindío
        </div>
      </header>

      {/* INICIO */}

      {!role ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                MOVILIDAD CON ESENCIA CAFETERA
              </span>

              <h1>
                Los caminos del Quindío,
                <br />
                <em>más cerca de ti.</em>
              </h1>

              <p>
                Muévete, envía y conecta. Encuentra una forma sencilla
                y cercana de llegar a donde necesitas.
              </p>

              <div className="hero-actions">
                <a className="button button-primary" href="#elige">
                  Comenzar <span>↗</span>
                </a>
                <span className="micro-copy">
                  Un viaje a la vez, juntos.
                </span>
              </div>
            </div>

            <div
              className="landscape"
              aria-label="Ilustración de montañas cafeteras"
            >
              <div className="sun" />
              <div className="mountain mountain-back" />
              <div className="mountain mountain-mid" />
              <div className="mountain mountain-front" />

              <div className="coffee-hill">
                <span className="palm palm-one">♧</span>
                <span className="palm palm-two">♧</span>
                <span className="coffee-leaf leaf-one">❧</span>
                <span className="coffee-leaf leaf-two">❧</span>
              </div>

              <div className="landscape-label">
                Entre montañas y cafetales
              </div>
            </div>
          </section>

          <section className="choose-section" id="elige">
            <div className="section-heading">
              <span className="eyebrow">BIENVENIDO A CASA</span>
              <h2>¿Cómo quieres ingresar?</h2>
              <p>Elige tu espacio para continuar.</p>
            </div>

            <div className="role-grid">
              <button
                className="role-card"
                onClick={() => selectRole("cliente")}
              >
                <span className="role-icon sage">♡</span>
                <span className="role-title">Soy cliente</span>
                <span className="role-desc">
                  Quiero solicitar un viaje o una mensajería.
                </span>
                <span className="role-link">Ingresar <b>↗</b></span>
              </button>

              <button
                className="role-card"
                onClick={() => selectRole("conductor")}
              >
                <span className="role-icon latte">⌁</span>
                <span className="role-title">Soy conductor</span>
                <span className="role-desc">
                  Quiero recibir solicitudes y realizar servicios.
                </span>
                <span className="role-link">Ingresar <b>↗</b></span>
              </button>

              <button
                className="role-card"
                onClick={() => selectRole("admin")}
              >
                <span className="role-icon clay">✳</span>
                <span className="role-title">Administración</span>
                <span className="role-desc">
                  Quiero gestionar solicitudes y conductores.
                </span>
                <span className="role-link">Ingresar <b>↗</b></span>
              </button>
            </div>
          </section>
        </>
      ) : (

        <section className="workspace">

          <button className="back-link" onClick={goHome}>
            ← Volver al inicio
          </button>

          <div className="workspace-heading">
            <span className="eyebrow">
              {role.toUpperCase()} · RODANDO QUINDÍO
            </span>
            <h1>{roleInfo[role].title}</h1>
            <p>{roleInfo[role].subtitle}</p>
          </div>

          {/* FORMULARIOS DE AUTENTICACIÓN */}

          {!profile ? (
            <div className="content-card auth-card">

              <div className="tabs">
                <button
                  className={authMode === "login" ? "tab active" : "tab"}
                  onClick={() => {
                    setAuthMode("login");
                    setNotice("");
                    setError("");
                  }}
                >
                  Iniciar sesión
                </button>

                {role !== "admin" && (
                  <button
                    className={authMode === "register" ? "tab active" : "tab"}
                    onClick={() => {
                      setAuthMode("register");
                      setNotice("");
                      setError("");
                    }}
                  >
                    Crear cuenta
                  </button>
                )}
              </div>

              <form onSubmit={handleAuth} className="request-form">

                <div className="form-grid">

                  {authMode === "register" && (
                    <>
                      <div className="full">
                        <span className="eyebrow">DATOS PERSONALES</span>
                      </div>

                      <label className="full">
                        Nombre completo
                        <input
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Tu nombre y apellido"
                          autoComplete="name"
                        />
                      </label>

                      <label className="full">
                        Número de teléfono
                        <input
                          required
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="300 000 0000"
                          autoComplete="tel"
                        />
                      </label>
                    </>
                  )}

                  {role === "conductor" && authMode === "register" && (
                    <>
                      <div className="full">
                        <span className="eyebrow">
                          INFORMACIÓN DEL VEHÍCULO
                        </span>
                      </div>

                      <label>
                        Marca del vehículo
                        <input
                          required
                          value={vehicleBrand}
                          onChange={(e) => setVehicleBrand(e.target.value)}
                          placeholder="Ej. Chevrolet"
                        />
                      </label>

                      <label>
                        Modelo
                        <input
                          required
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          placeholder="Ej. Onix"
                        />
                      </label>

                      <label>
                        Año
                        <input
                          required
                          type="number"
                          min="1990"
                          max={new Date().getFullYear() + 1}
                          value={vehicleYear}
                          onChange={(e) => setVehicleYear(e.target.value)}
                          placeholder="2022"
                        />
                      </label>

                      <label>
                        Color
                        <input
                          required
                          value={vehicleColor}
                          onChange={(e) => setVehicleColor(e.target.value)}
                          placeholder="Ej. Blanco"
                        />
                      </label>

                      <label>
                        Placa
                        <input
                          required
                          value={licensePlate}
                          onChange={(e) =>
                            setLicensePlate(e.target.value.toUpperCase())
                          }
                          placeholder="ABC123"
                          maxLength={8}
                        />
                      </label>

                      <label>
                        Número de licencia de conducción
                        <input
                          required
                          value={licenseNumber}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          placeholder="Número de licencia"
                        />
                      </label>

                      <label>
                        Capacidad de pasajeros
                        <select
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                        >
                          {[1, 2, 3, 4].map((number) => (
                            <option key={number} value={number}>
                              {number} pasajeros
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="full">
                        <p>
                          Tu solicitud será revisada por administración
                          antes de que puedas recibir servicios.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="full">
                    <span className="eyebrow">
                      DATOS DE ACCESO
                    </span>
                  </div>

                  <label className="full">
                    Correo electrónico
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      autoComplete="email"
                    />
                  </label>

                  <label className="full">
                    Contraseña
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      autoComplete={
                        authMode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                    />
                  </label>

                </div>

                <div className="form-footer">
                  <span>
                    {authMode === "register"
                      ? "Tu información estará protegida."
                      : "Qué bueno tenerte de vuelta."}
                  </span>

                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Procesando..."
                      : authMode === "register"
                        ? "Crear mi cuenta ↗"
                        : "Ingresar ↗"}
                  </button>
                </div>

              </form>

              {error && <div className="notice">{error}</div>}
              {notice && <div className="notice">{notice}</div>}

            </div>
          ) : (

            <>

              {/* SESIÓN ACTIVA */}

              <div className="content-card">
                <span className="eyebrow">SESIÓN ACTIVA</span>
                <h3>¡Hola, {profile.full_name}!</h3>
                <p>Has ingresado correctamente a Rodando Quindío.</p>

                {role === "admin" && (
                  <p>Bienvenida al espacio de administración.</p>
                )}

                {role === "conductor" && (
                  <p>
                    Tu cuenta de conductor está aprobada.
                    Ya puedes prepararte para recibir servicios.
                  </p>
                )}

                <button
                  className="button button-primary"
                  onClick={handleLogout}
                >
                  Cerrar sesión ↗
                </button>
              </div>

              {/* ESPACIO DEL CLIENTE */}

              {role === "cliente" && (
                <div className="content-card">

                  <div className="tabs">
                    <button
                      className={service === "carro" ? "tab active" : "tab"}
                      onClick={() => setService("carro")}
                    >
                      ♧ Transporte en carro
                    </button>

                    <button
                      className={
                        service === "mensajeria" ? "tab active" : "tab"
                      }
                      onClick={() => setService("mensajeria")}
                    >
                      ▣ Mensajería
                    </button>
                  </div>

                  <form onSubmit={submitRequest} className="request-form">
                    <div className="form-grid">

                      <label>
                        Punto de recogida
                        <input required placeholder="¿Dónde te recogemos?" />
                      </label>

                      <label>
                        Destino
                        <input required placeholder="¿A dónde vamos?" />
                      </label>

                      {service === "carro" ? (
                        <label>
                          Pasajeros (máximo 4)
                          <select
                            value={passengers}
                            onChange={(e) => setPassengers(e.target.value)}
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <>
                          <label>
                            Nombre del destinatario
                            <input required placeholder="¿Quién recibe?" />
                          </label>

                          <label className="full">
                            Descripción del paquete
                            <textarea
                              required
                              placeholder="Cuéntanos qué debemos recoger y entregar."
                            />
                          </label>
                        </>
                      )}

                      <label className="full">
                        Detalles adicionales
                        <textarea placeholder="Indicaciones para el conductor (opcional)." />
                      </label>
                    </div>

                    <div className="form-footer">
                      <span>La tarifa será confirmada por nuestro equipo.</span>
                      <button className="button button-primary" type="submit">
                        Solicitar servicio ↗
                      </button>
                    </div>
                  </form>

                  {notice && <div className="notice">{notice}</div>}
                </div>
              )}

              {/* PANEL DE ADMINISTRACIÓN */}

              {role === "admin" && (
                <div className="dashboard-grid">

                  <div className="metric-card">
                    <span>Solicitudes pendientes</span>
                    <strong>{drivers.length}</strong>
                    <small>Por revisar</small>
                  </div>

                  <div className="metric-card">
                    <span>Conductores pendientes</span>
                    <strong>{drivers.length}</strong>
                    <small>Esperando aprobación</small>
                  </div>

                  <div className="metric-card">
                    <span>Servicios activos</span>
                    <strong>—</strong>
                    <small>Próximamente</small>
                  </div>

                  <div className="content-card full">

                    <div className="section-heading">
                      <span className="eyebrow">
                        GESTIÓN DE CONDUCTORES
                      </span>
                      <h2>Solicitudes de registro</h2>
                      <p>
                        Revisa y aprueba a quienes quieren conducir
                        con nosotros.
                      </p>
                    </div>

                    {driverMessage && (
                      <div className="notice">{driverMessage}</div>
                    )}

                    {loadingDrivers ? (
                      <p>Cargando solicitudes...</p>
                    ) : drivers.length === 0 ? (
                      <div className="soft-card">
                        <span className="big-icon">☼</span>
                        <h3>Todo al día</h3>
                        <p>
                          No hay solicitudes pendientes por el momento.
                        </p>
                      </div>
                    ) : (
                      <div className="driver-list">
                        {drivers.map((driver) => (
                          <div className="soft-card" key={driver.id}>

                            <span className="eyebrow">
                              NUEVA SOLICITUD
                            </span>

                            <h3>
                              {driver.profile?.full_name || "Conductor"}
                            </h3>

                            <p>
                              Teléfono:{" "}
                              {driver.profile?.phone || "No registrado"}
                            </p>

                            <p>
                              Marca: {driver.vehicle_brand || "No registrada"}
                            </p>

                            <p>
                              Modelo: {driver.vehicle_model || "No registrado"}
                            </p>

                            <p>
                              Año: {driver.vehicle_year || "No registrado"}
                            </p>

                            <p>
                              Color: {driver.vehicle_color || "No registrado"}
                            </p>

                            <p>
                              Placa: {driver.license_plate || "No registrada"}
                            </p>

                            <p>
                              Licencia: {driver.license_number || "No registrada"}
                            </p>

                            <p>
                              Capacidad: {driver.capacity} pasajeros
                            </p>

                            <p>
                              Fecha de solicitud:{" "}
                              {new Date(driver.created_at).toLocaleDateString("es-CO")}
                            </p>

                            <badge-placeholder />

                            <div className="form-footer">
                              <button
                                className="button button-primary"
                                disabled={processingDriver === driver.id}
                                onClick={() =>
                                  updateDriverStatus(driver.id, "approved")
                                }
                              >
                                {processingDriver === driver.id
                                  ? "Procesando..."
                                  : "Aprobar conductor"}
                              </button>

                              <button
                                className="button"
                                disabled={processingDriver === driver.id}
                                onClick={() =>
                                  updateDriverStatus(driver.id, "rejected")
                                }
                              >
                                Rechazar
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className="button button-primary"
                      onClick={loadDrivers}
                      disabled={loadingDrivers}
                    >
                      {loadingDrivers
                        ? "Actualizando..."
                        : "Actualizar solicitudes ↻"}
                    </button>

                  </div>
                </div>
              )}

            </>
          )}

        </section>
      )}

      {/* PIE DE PÁGINA */}

      <footer>
        <div className="footer-brand">
          Rodando <span>Quindío</span>
        </div>

        <p>Conectamos caminos, acercamos destinos.</p>

        <small>
          © 2026 Rodando Quindío · Hecho en el corazón del Eje Cafetero.
        </small>
      </footer>

    </main>
  );
}

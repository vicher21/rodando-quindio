
"use client";

import { useCallback, useEffect, useState } from "react";
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
type ServiceType = "ride" | "delivery";

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
  profile?: { full_name: string; phone: string | null };
};

type ServiceRequest = {
  id: string;
  guest_name: string | null;
  guest_phone: string | null;
  service_type: ServiceType;
  origin: string;
  destination: string;
  passenger_count: number | null;
  package_description: string | null;
  client_notes: string | null;
  status: string;
  estimated_price: number | null;
  final_price: number | null;
  requested_at: string;
  driver_id: string | null;
};

type DriverOffer = {
  request_id: string;
  status: string;
  created_at: string;
  request?: ServiceRequest;
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

  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [capacity, setCapacity] = useState("4");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverMessage, setDriverMessage] = useState("");
  const [processingDriver, setProcessingDriver] = useState<string | null>(null);

  // SOLICITUD PÚBLICA DE SERVICIOS

  const [service, setService] = useState<ServiceType>("ride");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [packageDescription, setPackageDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const [createdRequest, setCreatedRequest] = useState<{
    request_id: string;
    tracking_token: string;
  } | null>(null);

  const [trackingId, setTrackingId] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // PANEL OPERATIVO

  const [adminRequests, setAdminRequests] = useState<ServiceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState<string | null>(null);
  const [driverAvailability, setDriverAvailability] = useState(false);

  // NAVEGACIÓN

  function selectRole(selectedRole: Role) {
    if (selectedRole === "cliente") {
      setRole(null);
      document.getElementById("solicitar")?.scrollIntoView({
        behavior: "smooth",
      });
      return;
    }

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
    setDrivers([]);
    setOffers([]);
    setAdminRequests([]);
  }

  function goHome() {
    setRole(null);
    setProfile(null);
    setNotice("");
    setError("");
    setDriverMessage("");
    setDrivers([]);
    setOffers([]);
    setAdminRequests([]);
  }

  // AUTENTICACIÓN Y REGISTRO

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
          const year = Number(vehicleYear);

          if (
            !vehicleYear ||
            year < 1990 ||
            year > new Date().getFullYear() + 1
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

          if (!currentProfile) {
            await logoutUser();
            throw new Error(
              "La cuenta se creó, pero no pudimos cargar tu perfil. Intenta iniciar sesión."
            );
          }

          // VALIDACIÓN REAL DEL ESTADO DEL CONDUCTOR

          if (role === "conductor") {
            const { data: driver, error: driverError } = await supabase
              .from("driver_profiles")
              .select("status, available")
              .eq("id", currentProfile.id)
              .single();

            if (driverError) {
              await logoutUser();
              throw driverError;
            }

            if (driver.status !== "approved") {
              await logoutUser();
              setProfile(null);

              setNotice(
                driver.status === "rejected"
                  ? "Tu solicitud no fue aprobada. Si necesitas más información, contacta a administración."
                  : "¡Tu solicitud fue recibida! Está pendiente de revisión. Podrás iniciar sesión y recibir servicios cuando administración la apruebe."
              );

              return;
            }

            setDriverAvailability(Boolean(driver.available));
          }

          setProfile(currentProfile);

          setNotice(
            role === "conductor"
              ? "¡Bienvenido! Tu cuenta está aprobada."
              : "¡Bienvenido a Rodando Quindío!"
          );
        }
      } else {
        // INICIO DE SESIÓN

        await loginUser(email, password);

        const currentProfile = await getCurrentProfile();

        if (!currentProfile) {
          await logoutUser();
          throw new Error(
            "No encontramos tu perfil. Contacta a administración."
          );
        }

        if (currentProfile.role !== databaseRoles[role]) {
          await logoutUser();
          throw new Error(
            "Esta cuenta no corresponde al tipo de acceso seleccionado."
          );
        }

        // UN CONDUCTOR PENDIENTE NO PUEDE ENTRAR AL PANEL

        if (role === "conductor") {
          const { data: driver, error: driverError } = await supabase
            .from("driver_profiles")
            .select("status, available")
            .eq("id", currentProfile.id)
            .single();

          if (driverError) {
            await logoutUser();
            throw driverError;
          }

          if (driver.status !== "approved") {
            await logoutUser();

            throw new Error(
              driver.status === "rejected"
                ? "Tu solicitud no fue aprobada. Contacta a administración."
                : "Tu cuenta está pendiente de aprobación. Podrás ingresar cuando administración la apruebe."
            );
          }

          setDriverAvailability(Boolean(driver.available));
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

  // CERRAR SESIÓN

  async function handleLogout() {
    try {
      await logoutUser();
      goHome();
    } catch {
      setError("No fue posible cerrar la sesión.");
    }
  }

  // CARGAR SOLICITUDES DE CONDUCTORES

  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    setDriverMessage("");

    try {
      const { data, error: queryError } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      const rows = data || [];

      if (!rows.length) {
        setDrivers([]);
        return;
      }

      const ids = rows.map((driver: any) => driver.id);

      const { data: people, error: peopleError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ids);

      if (peopleError) throw peopleError;

      setDrivers(
        rows.map((driver: any) => ({
          ...driver,
          profile: people?.find((person: any) => person.id === driver.id),
        }))
      );
    } catch (err) {
      setDriverMessage(
        err instanceof Error
          ? err.message
          : "No pudimos cargar los conductores."
      );
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  // CARGAR SOLICITUDES DE SERVICIO PARA ADMINISTRACIÓN

  const loadAdminRequests = useCallback(async () => {
    setLoadingRequests(true);

    try {
      const { data, error: queryError } = await supabase
        .from("service_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      setAdminRequests((data || []) as ServiceRequest[]);
    } catch (err) {
      setDriverMessage(
        err instanceof Error
          ? err.message
          : "No pudimos cargar las solicitudes de servicio."
      );
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // CARGAR OFERTAS PARA EL CONDUCTOR

  const loadOffers = useCallback(async () => {
    if (!profile?.id) return;

    setLoadingOffers(true);

    try {
      const { data: offerRows, error: offerError } = await supabase
        .from("driver_offers")
        .select("request_id, status, created_at")
        .eq("driver_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (offerError) throw offerError;

      const rows = offerRows || [];

      if (!rows.length) {
        setOffers([]);
        return;
      }

      const ids = rows.map((offer: any) => offer.request_id);

      const { data: requestRows, error: requestError } = await supabase
        .from("service_requests")
        .select("*")
        .in("id", ids)
        .eq("status", "awaiting_acceptance");

      if (requestError) throw requestError;

      setOffers(
        rows
          .map((offer: any) => ({
            ...offer,
            request: requestRows?.find(
              (request: any) => request.id === offer.request_id
            ),
          }))
          .filter((offer: DriverOffer) => offer.request)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos cargar tus ofertas."
      );
    } finally {
      setLoadingOffers(false);
    }
  }, [profile?.id]);

  // CARGAS INICIALES SEGÚN ROL

  useEffect(() => {
    if (profile?.role === "admin") {
      void loadDrivers();
      void loadAdminRequests();
    }

    if (profile?.role === "driver") {
      void loadOffers();
    }
  }, [profile, loadDrivers, loadAdminRequests, loadOffers]);

  // APROBAR O RECHAZAR CONDUCTORES

  async function updateDriverStatus(
    driverId: string,
    status: DriverStatus
  ) {
    const action = status === "approved" ? "aprobar" : "rechazar";

    if (!window.confirm(`¿Deseas ${action} esta solicitud?`)) return;

    setProcessingDriver(driverId);
    setDriverMessage("");

    try {
      const { data, error: updateError } = await supabase
        .from("driver_profiles")
        .update({
          status,
          available: false,
          approved_at:
            status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", driverId)
        .eq("status", "pending")
        .select("id");

      if (updateError) throw updateError;

      if (!data?.length) {
        throw new Error(
          "No se pudo actualizar la solicitud. Verifica los permisos."
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

  // CREAR SOLICITUD SIN REGISTRO

  async function submitRequest(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmittingRequest(true);
    setNotice("");
    setError("");
    setCreatedRequest(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "create_guest_service_request",
        {
          p_guest_name: guestName.trim(),
          p_guest_phone: guestPhone.trim(),
          p_service_type: service,
          p_origin: origin.trim(),
          p_destination: destination.trim(),
          p_passenger_count: service === "ride" ? Number(passengers) : 1,
          p_package_description:
            service === "delivery"
              ? `${
                  recipientName.trim()
                    ? `Destinatario: ${recipientName.trim()}. `
                    : ""
                }${packageDescription.trim()}`
              : null,
          p_client_notes: clientNotes.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      const result = data as {
        request_id: string;
        tracking_token: string;
        offers_created: number;
      };

      if (!result?.request_id || !result?.tracking_token) {
        throw new Error(
          "La solicitud se creó, pero no recibimos los datos de seguimiento. Contacta a Rodando."
        );
      }

      setCreatedRequest({
        request_id: result.request_id,
        tracking_token: result.tracking_token,
      });

      setTrackingId(result.request_id);
      setTrackingToken(result.tracking_token);

      setNotice(
        result.offers_created > 0
          ? "¡Solicitud enviada! Estamos avisando a los conductores disponibles."
          : "Recibimos tu solicitud. Nuestro equipo revisará la disponibilidad y te contactará."
      );

      setGuestName("");
      setGuestPhone("");
      setOrigin("");
      setDestination("");
      setPackageDescription("");
      setRecipientName("");
      setClientNotes("");
      setPassengers("1");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos enviar tu solicitud. Inténtalo nuevamente."
      );
    } finally {
      setSubmittingRequest(false);
    }
  }

  // CONSULTAR SEGUIMIENTO

  async function checkTracking(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setTrackingMessage("");
    setTrackingResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_guest_service_status",
        {
          p_request_id: trackingId.trim(),
          p_tracking_token: trackingToken.trim(),
        }
      );

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        throw new Error(
          "No encontramos la solicitud. Revisa el código y el token."
        );
      }

      setTrackingResult(data[0]);
    } catch (err) {
      setTrackingMessage(
        err instanceof Error
          ? err.message
          : "No fue posible consultar el servicio."
      );
    }
  }

  // ACEPTAR OFERTA

  async function acceptOffer(requestId: string) {
    setAcceptingOffer(requestId);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "accept_driver_offer",
        { p_request_id: requestId }
      );

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error(
          "Otro conductor ya aceptó este servicio o la oferta venció."
        );
      }

      setNotice("¡Servicio aceptado! Ya está asignado a ti.");
      setDriverAvailability(false);

      await loadOffers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo aceptar el servicio."
      );
    } finally {
      setAcceptingOffer(null);
    }
  }

  // CAMBIAR DISPONIBILIDAD

  async function toggleAvailability() {
    if (!profile?.id) return;

    try {
      const next = !driverAvailability;

      const { error: updateError } = await supabase
        .from("driver_profiles")
        .update({ available: next })
        .eq("id", profile.id)
        .eq("status", "approved");

      if (updateError) throw updateError;

      setDriverAvailability(next);

      setNotice(
        next
          ? "Ahora estás disponible para recibir solicitudes."
          : "Has pausado la recepción de solicitudes."
      );

      if (next) await loadOffers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos cambiar tu disponibilidad."
      );
    }
  }

  // ENLACE DE WHATSAPP

  function whatsappLink(number: string) {
    const digits = number.replace(/\D/g, "");
    const international = digits.startsWith("57") ? digits : `57${digits}`;

    return `https://wa.me/${international}`;
  }

  // INTERFAZ

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            goHome();
          }}
        >
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
                Muévete, envía y conecta. Encuentra una forma sencilla y
                cercana de llegar a donde necesitas.
              </p>

              <div className="hero-actions">
                <a className="button button-primary" href="#solicitar">
                  Solicitar servicio <span>↗</span>
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

          <section className="choose-section" id="solicitar">
            <div className="section-heading">
              <span className="eyebrow">VIAJA O ENVÍA</span>
              <h2>¿Qué necesitas hoy?</h2>
              <p>No necesitas crear una cuenta para solicitar tu servicio.</p>
            </div>

            <div className="content-card">
              <div className="tabs">
                <button
                  type="button"
                  className={service === "ride" ? "tab active" : "tab"}
                  onClick={() => setService("ride")}
                >
                  ♧ Transporte en carro
                </button>

                <button
                  type="button"
                  className={service === "delivery" ? "tab active" : "tab"}
                  onClick={() => setService("delivery")}
                >
                  ▣ Mensajería
                </button>
              </div>

              <form onSubmit={submitRequest} className="request-form">
                <div className="form-grid">
                  <label className="full">
                    Nombre completo
                    <input
                      required
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder="¿Cómo te llamas?"
                      autoComplete="name"
                    />
                  </label>

                  <label className="full">
                    WhatsApp de contacto
                    <input
                      required
                      type="tel"
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                      placeholder="300 000 0000"
                      autoComplete="tel"
                    />
                  </label>

                  <label>
                    Punto de recogida
                    <input
                      required
                      value={origin}
                      onChange={(event) => setOrigin(event.target.value)}
                      placeholder="Barrio, dirección o referencia"
                    />
                  </label>

                  <label>
                    Destino
                    <input
                      required
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="¿A dónde vamos o enviamos?"
                    />
                  </label>

                  {service === "ride" ? (
                    <label>
                      Pasajeros (máximo 4)
                      <select
                        value={passengers}
                        onChange={(event) =>
                          setPassengers(event.target.value)
                        }
                      >
                        {[1, 2, 3, 4].map((number) => (
                          <option key={number} value={number}>
                            {number}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label>
                        Nombre del destinatario
                        <input
                          value={recipientName}
                          onChange={(event) =>
                            setRecipientName(event.target.value)
                          }
                          placeholder="¿Quién recibe?"
                        />
                      </label>

                      <label className="full">
                        Descripción del paquete
                        <textarea
                          required
                          value={packageDescription}
                          onChange={(event) =>
                            setPackageDescription(event.target.value)
                          }
                          placeholder="Cuéntanos qué debemos recoger y entregar."
                        />
                      </label>
                    </>
                  )}

                  <label className="full">
                    Detalles adicionales
                    <textarea
                      value={clientNotes}
                      onChange={(event) =>
                        setClientNotes(event.target.value)
                      }
                      placeholder="Indicaciones para el conductor (opcional)."
                    />
                  </label>
                </div>

                <div className="form-footer">
                  <span>La tarifa será confirmada por nuestro equipo.</span>

                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={submittingRequest}
                  >
                    {submittingRequest
                      ? "Enviando..."
                      : "Solicitar servicio ↗"}
                  </button>
                </div>
              </form>

              {error && <div className="notice">{error}</div>}
              {notice && <div className="notice">{notice}</div>}

              {createdRequest && (
                <div className="soft-card">
                  <h3>Guarda los datos de seguimiento</h3>
                  <p>
                    Conserva estos dos códigos para consultar el estado de tu
                    servicio desde esta página.
                  </p>
                  <p>
                    <strong>Código de solicitud:</strong>{" "}
                    {createdRequest.request_id}
                  </p>
                  <p>
                    <strong>Token privado:</strong>{" "}
                    {createdRequest.tracking_token}
                  </p>

                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `Solicitud: ${createdRequest.request_id}\nToken: ${createdRequest.tracking_token}`
                      )
                    }
                  >
                    Copiar datos de seguimiento
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="choose-section">
            <div className="section-heading">
              <span className="eyebrow">CONSULTA TU SERVICIO</span>
              <h2>¿Ya tienes una solicitud?</h2>
              <p>Ingresa el código y el token que recibiste al solicitarla.</p>
            </div>

            <div className="content-card">
              <form onSubmit={checkTracking} className="request-form">
                <div className="form-grid">
                  <label className="full">
                    Código de solicitud
                    <input
                      required
                      value={trackingId}
                      onChange={(event) => setTrackingId(event.target.value)}
                      placeholder="UUID de tu solicitud"
                    />
                  </label>

                  <label className="full">
                    Token privado
                    <input
                      required
                      value={trackingToken}
                      onChange={(event) =>
                        setTrackingToken(event.target.value)
                      }
                      placeholder="Token de seguimiento"
                    />
                  </label>
                </div>

                <button className="button button-primary" type="submit">
                  Consultar estado ↗
                </button>
              </form>

              {trackingMessage && (
                <div className="notice">{trackingMessage}</div>
              )}

              {trackingResult && (
                <div className="soft-card">
                  <h3>Estado de tu servicio</h3>
                  <p>
                    <strong>Estado:</strong> {trackingResult.service_status}
                  </p>
                  <p>
                    <strong>Tipo:</strong>{" "}
                    {trackingResult.service_type === "ride"
                      ? "Transporte"
                      : "Mensajería"}
                  </p>
                  <p>
                    <strong>Origen:</strong> {trackingResult.origin}
                  </p>
                  <p>
                    <strong>Destino:</strong> {trackingResult.destination}
                  </p>
                  <p>
                    <strong>Tarifa final:</strong>{" "}
                    {trackingResult.final_price ?? "Pendiente"}
                  </p>

                  {trackingResult.driver_name && (
                    <>
                      <h3>Datos de tu conductor</h3>
                      <p>{trackingResult.driver_name}</p>
                      <p>
                        Vehículo: {trackingResult.driver_vehicle || "Por confirmar"}
                      </p>
                      <p>
                        Placa: {trackingResult.driver_plate || "Por confirmar"}
                      </p>

                      {trackingResult.driver_phone && (
                        <a
                          className="button button-primary"
                          href={whatsappLink(trackingResult.driver_phone)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Contactar por WhatsApp ↗
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="choose-section">
            <div className="section-heading">
              <span className="eyebrow">ÚNETE A RODANDO</span>
              <h2>¿Quieres formar parte?</h2>
              <p>Accede a tu espacio de conductor o administración.</p>
            </div>

            <div className="role-grid">
              <button
                className="role-card"
                onClick={() => selectRole("conductor")}
              >
                <span className="role-icon">♧</span>
                <span className="role-title">Conductores</span>
                <span className="role-desc">
                  Quiero recibir servicios y conducir con nosotros.
                </span>
                <span className="role-link">
                  Ingresar <b>↗</b>
                </span>
              </button>

              <button
                className="role-card"
                onClick={() => selectRole("admin")}
              >
                <span className="role-icon clay">✳</span>
                <span className="role-title">Administración</span>
                <span className="role-desc">
                  Gestionar solicitudes y conductores.
                </span>
                <span className="role-link">
                  Ingresar <b>↗</b>
                </span>
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

                {role === "conductor" && (
                  <button
                    className={
                      authMode === "register" ? "tab active" : "tab"
                    }
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
                          onChange={(event) =>
                            setFullName(event.target.value)
                          }
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
                          onChange={(event) => setPhone(event.target.value)}
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
                        Marca
                        <input
                          required
                          value={vehicleBrand}
                          onChange={(event) =>
                            setVehicleBrand(event.target.value)
                          }
                          placeholder="Ej. Chevrolet"
                        />
                      </label>

                      <label>
                        Modelo
                        <input
                          required
                          value={vehicleModel}
                          onChange={(event) =>
                            setVehicleModel(event.target.value)
                          }
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
                          onChange={(event) =>
                            setVehicleYear(event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Color
                        <input
                          required
                          value={vehicleColor}
                          onChange={(event) =>
                            setVehicleColor(event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Placa
                        <input
                          required
                          value={licensePlate}
                          onChange={(event) =>
                            setLicensePlate(event.target.value.toUpperCase())
                          }
                          maxLength={8}
                        />
                      </label>

                      <label>
                        Licencia de conducción
                        <input
                          required
                          value={licenseNumber}
                          onChange={(event) =>
                            setLicenseNumber(event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Capacidad
                        <select
                          value={capacity}
                          onChange={(event) => setCapacity(event.target.value)}
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
                          Tu solicitud será revisada por administración antes
                          de que puedas recibir servicios.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="full">
                    <span className="eyebrow">DATOS DE ACCESO</span>
                  </div>

                  <label className="full">
                    Correo electrónico
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
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
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
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
              <div className="content-card">
                <span className="eyebrow">SESIÓN ACTIVA</span>
                <h3>¡Hola, {profile.full_name}!</h3>
                <p>Has ingresado correctamente a Rodando Quindío.</p>

                {role === "admin" && (
                  <p>Bienvenida al espacio de administración.</p>
                )}

                {role === "conductor" && (
                  <p>
                    Tu cuenta de conductor está aprobada. Ya puedes gestionar
                    tu disponibilidad y recibir servicios.
                  </p>
                )}

                <button
                  className="button button-primary"
                  onClick={handleLogout}
                >
                  Cerrar sesión ↗
                </button>
              </div>

              {role === "conductor" && (
                <div className="content-card">
                  <div className="section-heading">
                    <span className="eyebrow">TU DISPONIBILIDAD</span>
                    <h2>
                      {driverAvailability
                        ? "Estás disponible"
                        : "No estás disponible"}
                    </h2>
                    <p>
                      {driverAvailability
                        ? "Puedes recibir ofertas de servicios."
                        : "Activa tu disponibilidad cuando estés listo para trabajar."}
                    </p>
                  </div>

                  <button
                    className="button button-primary"
                    onClick={toggleAvailability}
                  >
                    {driverAvailability
                      ? "Pausar solicitudes"
                      : "Activar disponibilidad"}
                  </button>

                  <div className="form-footer">
                    <h3>Servicios disponibles</h3>
                    <button
                      className="button"
                      onClick={loadOffers}
                      disabled={loadingOffers}
                    >
                      {loadingOffers ? "Actualizando..." : "Actualizar ↻"}
                    </button>
                  </div>

                  {error && <div className="notice">{error}</div>}

                  {offers.length === 0 ? (
                    <div className="soft-card">
                      <p>No tienes ofertas pendientes en este momento.</p>
                    </div>
                  ) : (
                    <div className="driver-list">
                      {offers.map((offer) => (
                        <div className="soft-card" key={offer.request_id}>
                          <span className="eyebrow">
                            {offer.request?.service_type === "ride"
                              ? "TRANSPORTE"
                              : "MENSAJERÍA"}
                          </span>

                          <h3>
                            {offer.request?.origin} →{" "}
                            {offer.request?.destination}
                          </h3>

                          {offer.request?.guest_name && (
                            <p>Cliente: {offer.request.guest_name}</p>
                          )}

                          <p>
                            Pasajeros:{" "}
                            {offer.request?.passenger_count ?? "No aplica"}
                          </p>

                          {offer.request?.package_description && (
                            <p>
                              Paquete: {offer.request.package_description}
                            </p>
                          )}

                          {offer.request?.client_notes && (
                            <p>
                              Indicaciones: {offer.request.client_notes}
                            </p>
                          )}

                          <button
                            className="button button-primary"
                            disabled={
                              !driverAvailability ||
                              acceptingOffer === offer.request_id
                            }
                            onClick={() => acceptOffer(offer.request_id)}
                          >
                            {acceptingOffer === offer.request_id
                              ? "Aceptando..."
                              : "Aceptar servicio ↗"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {role === "admin" && (
                <div className="dashboard-grid">
                  <div className="metric-card">
                    <span>Solicitudes registradas</span>
                    <strong>{adminRequests.length}</strong>
                    <small>Últimas 100</small>
                  </div>

                  <div className="metric-card">
                    <span>Conductores pendientes</span>
                    <strong>{drivers.length}</strong>
                    <small>Esperando aprobación</small>
                  </div>

                  <div className="metric-card">
                    <span>Servicios por asignar</span>
                    <strong>
                      {
                        adminRequests.filter(
                          (request) =>
                            request.status === "awaiting_acceptance" ||
                            request.status === "pending_quote"
                        ).length
                      }
                    </strong>
                    <small>Requieren seguimiento</small>
                  </div>

                  <div className="content-card full">
                    <div className="section-heading">
                      <span className="eyebrow">GESTIÓN DE CONDUCTORES</span>
                      <h2>Solicitudes de registro</h2>
                      <p>
                        Revisa y aprueba a quienes quieren conducir con
                        nosotros.
                      </p>
                    </div>

                    {driverMessage && (
                      <div className="notice">{driverMessage}</div>
                    )}

                    {loadingDrivers ? (
                      <p>Cargando solicitudes...</p>
                    ) : drivers.length === 0 ? (
                      <div className="soft-card">
                        <h3>Todo al día</h3>
                        <p>
                          No hay solicitudes pendientes por el momento.
                        </p>
                      </div>
                    ) : (
                      <div className="driver-list">
                        {drivers.map((driver) => (
                          <div className="soft-card" key={driver.id}>
                            <span className="eyebrow">NUEVA SOLICITUD</span>

                            <h3>
                              {driver.profile?.full_name || "Conductor"}
                            </h3>

                            <p>
                              Teléfono:{" "}
                              {driver.profile?.phone || "No registrado"}
                            </p>

                            <p>
                              Vehículo:{" "}
                              {[
                                driver.vehicle_brand,
                                driver.vehicle_model,
                                driver.vehicle_color,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>

                            <p>
                              Año: {driver.vehicle_year || "No registrado"} ·
                              Placa: {driver.license_plate || "No registrada"}
                            </p>

                            <p>
                              Licencia:{" "}
                              {driver.license_number || "No registrada"}
                            </p>

                            <p>Capacidad: {driver.capacity} pasajeros</p>

                            <p>
                              Solicitud:{" "}
                              {new Date(driver.created_at).toLocaleDateString(
                                "es-CO"
                              )}
                            </p>

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
                      className="button"
                      onClick={loadDrivers}
                      disabled={loadingDrivers}
                    >
                      {loadingDrivers
                        ? "Actualizando..."
                        : "Actualizar conductores ↻"}
                    </button>
                  </div>

                  <div className="content-card full">
                    <div className="section-heading">
                      <span className="eyebrow">OPERACIÓN</span>
                      <h2>Solicitudes de servicio</h2>
                      <p>
                        Solicitudes de transporte y mensajería recibidas por
                        Rodando.
                      </p>
                    </div>

                    <button
                      className="button"
                      onClick={loadAdminRequests}
                      disabled={loadingRequests}
                    >
                      {loadingRequests
                        ? "Actualizando..."
                        : "Actualizar solicitudes ↻"}
                    </button>

                    {loadingRequests ? (
                      <p>Cargando solicitudes...</p>
                    ) : adminRequests.length === 0 ? (
                      <div className="soft-card">
                        <p>Aún no hay solicitudes registradas.</p>
                      </div>
                    ) : (
                      <div className="driver-list">
                        {adminRequests.map((request) => (
                          <div className="soft-card" key={request.id}>
                            <span className="eyebrow">
                              {request.service_type === "ride"
                                ? "TRANSPORTE"
                                : "MENSAJERÍA"}{" "}
                              · {request.status}
                            </span>

                            <h3>
                              {request.origin} → {request.destination}
                            </h3>

                            <p>
                              Cliente:{" "}
                              {request.guest_name || "Cliente registrado"}
                            </p>

                            <p>
                              Teléfono:{" "}
                              {request.guest_phone || "No disponible"}
                            </p>

                            {request.passenger_count && (
                              <p>Pasajeros: {request.passenger_count}</p>
                            )}

                            {request.package_description && (
                              <p>
                                Paquete: {request.package_description}
                              </p>
                            )}

                            {request.client_notes && (
                              <p>Notas: {request.client_notes}</p>
                            )}

                            <p>
                              Fecha:{" "}
                              {new Date(request.requested_at).toLocaleString(
                                "es-CO"
                              )}
                            </p>

                            <p>
                              Tarifa:{" "}
                              {request.final_price ??
                                request.estimated_price ??
                                "Pendiente de cotización"}
                            </p>

                            {request.guest_phone && (
                              <a
                                className="button"
                                href={whatsappLink(request.guest_phone)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Contactar cliente por WhatsApp ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

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

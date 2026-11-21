
"use client";

import { useEffect, useState, type FormEvent } from "react";
import ClientRegistration from "../components/client/ClientRegistration";
import {
  getClientProfile,
  logoutClient,
  type ClientProfile,
} from "../lib/client-auth";
import {
  createServiceRequest,
  getMyServiceRequests,
  cancelServiceRequest,
  type ClientServiceRequest,
} from "../lib/services";

type ServiceType = "ride" | "delivery";

export default function HomePage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Seguimiento de solicitudes
  const [clientRequests, setClientRequests] = useState<ClientServiceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);

  // Recuperar la sesión del cliente.
  useEffect(() => {
    let active = true;

    async function restoreClient() {
      try {
        const savedProfile = await getClientProfile();

        if (active && savedProfile) {
          setProfile(savedProfile);
        }
      } catch (error) {
        console.error("No se pudo recuperar el perfil del cliente:", error);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void restoreClient();

    return () => {
      active = false;
    };
  }, []);

  // Consultar las solicitudes del cliente.
  async function refreshClientRequests() {
    try {
      setLoadingRequests(true);

      const requests = await getMyServiceRequests();

      setClientRequests(requests);
    } catch (error) {
      console.error("No se pudieron cargar las solicitudes:", error);
    } finally {
      setLoadingRequests(false);
    }
  }

  // Actualizar el seguimiento automáticamente.
  useEffect(() => {
    if (!profile) {
      setClientRequests([]);
      return;
    }

    let active = true;

    async function loadRequests() {
      try {
        const requests = await getMyServiceRequests();

        if (active) {
          setClientRequests(requests);
        }
      } catch (error) {
        console.error("Error actualizando solicitudes:", error);
      }
    }

    void loadRequests();

    const interval = setInterval(() => {
      void loadRequests();
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [profile?.id]);

  function handleRegistered(client: ClientProfile) {
    setProfile(client);
    setMessage("");
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logoutClient();

      setProfile(null);
      setClientRequests([]);
      setSelectedService(null);
      setOrigin("");
      setDestination("");
      setPackageDescription("");
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cerrar la sesión."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function handleServiceSelection(service: ServiceType) {
    setSelectedService(service);
    setMessage("");

    document.getElementById("solicitud")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  // Crear una nueva solicitud.
  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!profile) {
      setMessage("Primero debes crear tu perfil para continuar.");
      return;
    }

    if (!selectedService) {
      setMessage("Selecciona el servicio que necesitas.");
      return;
    }

    if (origin.trim().length < 3 || destination.trim().length < 3) {
      setMessage("Completa un punto de recogida y un destino válidos.");
      return;
    }

    if (
      selectedService === "delivery" &&
      packageDescription.trim().length < 2
    ) {
      setMessage("Describe brevemente el paquete que necesitas enviar.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createServiceRequest({
        serviceType: selectedService,
        origin,
        destination,
        packageDescription,
      });

      await refreshClientRequests();

      const driverMessage =
        result.offers_created > 0
          ? `Ya avisamos a ${result.offers_created} conductor(es) disponible(s).`
          : "Tu solicitud quedó registrada. En este momento no hay conductores disponibles.";

      setMessage(
        `¡Solicitud creada correctamente! ${driverMessage} Código: ${result.request_id}`
      );

      setOrigin("");
      setDestination("");
      setPackageDescription("");
      setSelectedService(null);
    } catch (error) {
      console.error("Error creando la solicitud:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos crear tu solicitud. Inténtalo nuevamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Cancelar una solicitud.
  async function handleCancelRequest(requestId: string) {
    const confirmed = window.confirm(
      "¿Seguro que deseas cancelar este servicio?"
    );

    if (!confirmed) return;

    setCancellingRequest(requestId);
    setMessage("");

    try {
      await cancelServiceRequest(requestId);
      await refreshClientRequests();

      setMessage("Tu servicio fue cancelado correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos cancelar el servicio."
      );
    } finally {
      setCancellingRequest(null);
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "awaiting_acceptance":
      case "pending_quote":
        return "Pendiente";
      case "accepted":
        return "Aprobada";
      case "in_progress":
        return "En curso";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  }

  function getStatusStyle(status: string) {
    if (
      status === "awaiting_acceptance" ||
      status === "pending_quote"
    ) {
      return {
        background: "#fff3d8",
        color: "#946200",
      };
    }

    if (status === "accepted") {
      return {
        background: "#e2f3e8",
        color: "#21643d",
      };
    }

    if (status === "cancelled") {
      return {
        background: "#fce8e8",
        color: "#a33b3b",
      };
    }

    return {
      background: "#edf0ed",
      color: "#44534a",
    };
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <a href="#" className="brand" aria-label="Rodando Quindío inicio">
          <span className="brand-symbol">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M8 29.5 12.5 17h23L40 29.5v7H8v-7Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="m14 17 3-7h14l3 7M8 28h32"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="15" cy="29" r="2" fill="currentColor" />
              <circle cx="33" cy="29" r="2" fill="currentColor" />
            </svg>
          </span>

          <span className="brand-copy">
            <strong>rodando</strong>
            <small>QUINDÍO</small>
          </span>
        </a>

        {profile ? (
          <div className="client-header">
            <span className="client-greeting">
              Hola, <strong>{profile.full_name.split(" ")[0]}</strong>
            </span>

            <button
              className="header-action"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Saliendo..." : "Cerrar sesión"}
            </button>
          </div>
        ) : (
          <a className="header-action" href="#servicios">
            Solicitar servicio <span>↗</span>
          </a>
        )}

        <nav className="staff-access" aria-label="Accesos del equipo">
          <a href="/admin/login" className="staff-access-admin">
            <span>♙</span> Administración
          </a>

          <a href="/driver/login" className="staff-access-driver">
            <span>🚘</span> Soy conductor
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            MOVILIDAD Y MENSAJERÍA EN EL QUINDÍO
          </div>

          <h1>
            Tus caminos,
            <br />
            <span>más cerca.</span>
          </h1>

          <p className="hero-description">
            Muévete tranquilo. Envía lo que necesitas. Conectamos personas,
            destinos y momentos en el corazón del Quindío.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="#servicios">
              Explorar servicios <span>↗</span>
            </a>

            <a className="button button-secondary" href="#nosotros">
              Conoce Rodando
            </a>
          </div>

          <div className="hero-note">
            <span className="note-icon">✳</span>
            Hecho para moverte por el Quindío
          </div>
        </div>

        <div className="hero-art" aria-label="Ilustración de un automóvil">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-hill hill-back" />
          <div className="art-hill hill-front" />

          <div className="art-road">
            <span />
            <span />
            <span />
          </div>

          <div className="art-location location-one">
            <span className="location-pin">●</span>
            <span>Armenia</span>
          </div>

          <div className="art-location location-two">
            <span className="location-pin">●</span>
            <span>Tu destino</span>
          </div>

          <div className="car-illustration">
            <svg viewBox="0 0 560 300" role="img" aria-label="Carro verde">
              <defs>
                <linearGradient
                  id="carPaint"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#285F48" />
                  <stop offset="100%" stopColor="#103728" />
                </linearGradient>
              </defs>

              <ellipse
                cx="282"
                cy="255"
                rx="215"
                ry="23"
                fill="#173B2D"
                opacity=".17"
              />

              <path
                d="M91 194c8-29 25-44 62-51l55-68c15-18 33-27 58-27h84c28 0 47 12 64 36l43 61c30 7 47 20 52 49l-3 35H88l3-35Z"
                fill="url(#carPaint)"
              />

              <path
                d="m222 84-48 60h128V62h-37c-19 0-31 7-43 22Z"
                fill="#D9E9DE"
              />

              <path
                d="M319 62v82h128l-40-56c-13-18-27-26-49-26h-39Z"
                fill="#D9E9DE"
              />

              <path
                d="M313 61v87"
                stroke="#103728"
                strokeWidth="7"
              />

              <path
                d="M104 190h37m293 0h38"
                stroke="#F6C66A"
                strokeWidth="12"
                strokeLinecap="round"
              />

              <path
                d="M90 207h420"
                stroke="#0D2C20"
                strokeWidth="9"
                strokeLinecap="round"
              />

              <circle cx="181" cy="220" r="43" fill="#202923" />
              <circle cx="181" cy="220" r="23" fill="#E9E6DA" />
              <circle cx="181" cy="220" r="10" fill="#A9B5AA" />

              <circle cx="423" cy="220" r="43" fill="#202923" />
              <circle cx="423" cy="220" r="23" fill="#E9E6DA" />
              <circle cx="423" cy="220" r="10" fill="#A9B5AA" />

              <path
                d="M257 175h77"
                stroke="#DDE9DF"
                strokeWidth="5"
                strokeLinecap="round"
                opacity=".65"
              />
            </svg>
          </div>

          <div className="art-caption">
            <span className="caption-star">✳</span>

            <span>
              <strong>El Quindío nos mueve</strong>
              <small>Conectamos caminos, acercamos destinos.</small>
            </span>
          </div>
        </div>
      </section>

      <section className="services-section" id="servicios">
        <div className="section-heading">
          <div>
            <span className="section-kicker">¿QUÉ NECESITAS HOY?</span>
            <h2>Vamos contigo.</h2>
          </div>

          <p>
            Elige tu servicio y nosotros te ayudamos
            <br className="desktop-break" /> a llegar a donde necesitas.
          </p>
        </div>

        {checkingSession ? (
          <div className="content-card">
            <p>Estamos comprobando tu sesión...</p>
          </div>
        ) : !profile ? (
          <ClientRegistration onRegistered={handleRegistered} />
        ) : (
          <>
            <div className="client-welcome">
              <div>
                <span className="section-kicker">TU PERFIL ESTÁ LISTO</span>
                <h3>¡Hola, {profile.full_name.split(" ")[0]}!</h3>
                <p>¿Qué necesitas hacer hoy?</p>
              </div>

              <span className="welcome-check">✓</span>
            </div>

            {/* SEGUIMIENTO DE SOLICITUDES */}
            <section
              className="client-tracking-section"
              style={{ margin: "28px 0" }}
            >
              <div className="section-heading">
                <div>
                  <span className="section-kicker">TUS SERVICIOS</span>
                  <h2>Seguimiento de solicitudes</h2>
                </div>
              </div>

              {loadingRequests && clientRequests.length === 0 ? (
                <div className="content-card">
                  <p>Consultando tus solicitudes...</p>
                </div>
              ) : clientRequests.length === 0 ? (
                <div className="content-card">
                  <p>
                    Todavía no tienes solicitudes. Cuando pidas un servicio,
                    podrás consultar su estado aquí.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {clientRequests.map((request) => {
                    const isPending =
                      request.status === "awaiting_acceptance" ||
                      request.status === "pending_quote";

                    const canCancel =
                      request.status === "awaiting_acceptance" ||
                      request.status === "accepted";

                    return (
                      <article
                        key={request.id}
                        className="content-card"
                        style={{
                          padding: "22px",
                          borderRadius: "16px",
                          border: "1px solid #e4e9e4",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <strong>
                            {request.service_type === "ride"
                              ? "🚘 Servicio de transporte"
                              : "📦 Servicio de mensajería"}
                          </strong>

                          <span
                            style={{
                              padding: "7px 13px",
                              borderRadius: "30px",
                              fontSize: "13px",
                              fontWeight: 700,
                              ...getStatusStyle(request.status),
                            }}
                          >
                            {getStatusLabel(request.status)}
                          </span>
                        </div>

                        <div style={{ marginTop: "18px", lineHeight: 1.8 }}>
                          <p>
                            <strong>Recogida:</strong> {request.origin}
                          </p>

                          <p>
                            <strong>Destino:</strong> {request.destination}
                          </p>

                          {request.service_type === "delivery" &&
                            request.package_description && (
                              <p>
                                <strong>Paquete:</strong>{" "}
                                {request.package_description}
                              </p>
                            )}

                          <p style={{ color: "#68756d", fontSize: "13px" }}>
                            Solicitado:{" "}
                            {new Date(request.requested_at).toLocaleString(
                              "es-CO"
                            )}
                          </p>
                        </div>

                        {request.status === "accepted" && (
                          <div
                            style={{
                              marginTop: "14px",
                              padding: "14px",
                              background: "#f0f6f1",
                              borderRadius: "12px",
                            }}
                          >
                            <strong>
                              ¡Un conductor aceptó tu servicio!
                            </strong>

                            {request.driver_name && (
                              <p style={{ marginTop: "6px" }}>
                                Conductor: {request.driver_name}
                              </p>
                            )}

                            {request.driver_vehicle && (
                              <p>Vehículo: {request.driver_vehicle}</p>
                            )}

                            {request.driver_plate && (
                              <p>Placa: {request.driver_plate}</p>
                            )}
                          </div>
                        )}

                        {isPending && (
                          <p style={{ marginTop: "12px", color: "#68756d" }}>
                            Estamos buscando un conductor disponible.
                            Tu solicitud permanece registrada.
                          </p>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={cancellingRequest === request.id}
                            style={{
                              marginTop: "16px",
                              padding: "11px 16px",
                              borderRadius: "10px",
                              border: "1px solid #d9aaaa",
                              background: "#fff",
                              color: "#a33b3b",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {cancellingRequest === request.id
                              ? "Cancelando..."
                              : "Cancelar servicio"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="service-grid">
              <article className="service-card ride-card">
                <div className="service-topline">
                  <span className="service-number">01 / TRANSPORTE</span>
                  <span className="service-arrow">↗</span>
                </div>

                <div className="service-icon ride-icon">
                  <svg viewBox="0 0 48 48" fill="none">
                    <path
                      d="m8 28 4-11h24l4 11v9H8v-9Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />

                    <path
                      d="m14 17 3-7h14l3 7M8 28h32"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    <circle cx="15" cy="29" r="2" fill="currentColor" />
                    <circle cx="33" cy="29" r="2" fill="currentColor" />
                  </svg>
                </div>

                <h3>Muévete a tu ritmo.</h3>

                <p>
                  Pide un carro para tus recorridos. Tú eliges el destino,
                  nosotros te conectamos con un conductor.
                </p>

                <button
                  className="service-link"
                  onClick={() => handleServiceSelection("ride")}
                >
                  Quiero viajar <span>→</span>
                </button>
              </article>

              <article className="service-card delivery-card">
                <div className="service-topline">
                  <span className="service-number">02 / MENSAJERÍA</span>
                  <span className="service-arrow">↗</span>
                </div>

                <div className="service-icon delivery-icon">
                  <svg viewBox="0 0 48 48" fill="none">
                    <path
                      d="m7 16 17-9 17 9v19l-17 9-17-9V16Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />

                    <path
                      d="m7 16 17 9 17-9M24 25v19"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h3>Haz llegar eso importante.</h3>

                <p>
                  Envía paquetes y encargos dentro del Quindío con una
                  solicitud sencilla.
                </p>

                <button
                  className="service-link"
                  onClick={() => handleServiceSelection("delivery")}
                >
                  Enviar un paquete <span>→</span>
                </button>
              </article>
            </div>

            {selectedService && (
              <section className="request-panel" id="solicitud">
                <div className="request-panel-heading">
                  <div>
                    <span className="section-kicker">
                      {selectedService === "ride"
                        ? "SOLICITUD DE TRANSPORTE"
                        : "SOLICITUD DE MENSAJERÍA"}
                    </span>

                    <h3>
                      {selectedService === "ride"
                        ? "¿A dónde vamos?"
                        : "¿Qué necesitas enviar?"}
                    </h3>

                    <p>
                      Tus datos ya están guardados. Solo necesitamos las
                      direcciones.
                    </p>
                  </div>

                  <button
                    className="selection-close"
                    onClick={() => setSelectedService(null)}
                    aria-label="Cerrar formulario"
                  >
                    ×
                  </button>
                </div>

                <form className="simple-request-form" onSubmit={handleRequest}>
                  <label className="registration-field">
                    <span>Punto de recogida</span>

                    <input
                      value={origin}
                      onChange={(event) => setOrigin(event.target.value)}
                      placeholder="Escribe la dirección donde te recogemos"
                      autoComplete="street-address"
                      required
                    />
                  </label>

                  <label className="registration-field">
                    <span>Dirección de destino</span>

                    <input
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="¿Hacia dónde necesitas ir?"
                      required
                    />
                  </label>

                  {selectedService === "delivery" && (
                    <label className="registration-field">
                      <span>¿Qué paquete debemos recoger?</span>

                      <textarea
                        value={packageDescription}
                        onChange={(event) =>
                          setPackageDescription(event.target.value)
                        }
                        placeholder="Describe brevemente el paquete"
                        rows={3}
                        required
                      />
                    </label>
                  )}

                  <button
                    type="submit"
                    className="button button-primary registration-submit"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Enviando solicitud..."
                      : selectedService === "ride"
                        ? "Solicitar mi carro"
                        : "Solicitar mensajería"}

                    {!submitting && <span>↗</span>}
                  </button>

                  {message && (
                    <p className="request-feedback" role="status">
                      {message}
                    </p>
                  )}
                </form>
              </section>
            )}

            {message && !selectedService && (
              <p className="request-feedback" role="status">
                {message}
              </p>
            )}
          </>
        )}
      </section>

      <section className="trust-section" id="nosotros">
        <div className="trust-copy">
          <span className="section-kicker">NUESTRA ESENCIA</span>

          <h2>
            Más que llegar.
            <br />
            <span>Es llegar tranquilo.</span>
          </h2>

          <p>
            Nacimos para acercar el Quindío. Queremos que moverte y enviar lo
            que necesitas sea una experiencia fácil, clara y cercana.
          </p>
        </div>

        <div className="trust-points">
          <div className="trust-point">
            <span>01</span>

            <div>
              <strong>Fácil de solicitar</strong>
              <p>Menos pasos, más tiempo para lo importante.</p>
            </div>
          </div>

          <div className="trust-point">
            <span>02</span>

            <div>
              <strong>Conexión local</strong>
              <p>Una solución pensada para el territorio.</p>
            </div>
          </div>

          <div className="trust-point">
            <span>03</span>

            <div>
              <strong>Trato cercano</strong>
              <p>Personas conectando personas.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <a href="#" className="brand footer-brand">
          <span className="brand-symbol">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M8 29.5 12.5 17h23L40 29.5v7H8v-7Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              <path
                d="m14 17 3-7h14l3 7M8 28h32"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <span className="brand-copy">
            <strong>rodando</strong>
            <small>QUINDÍO</small>
          </span>
        </a>

        <p>Conectamos caminos, acercamos destinos.</p>

        <nav className="footer-access" aria-label="Accesos del equipo">
          <a href="/admin/login">Acceso administrativo</a>
          <a href="/driver/login">Acceso conductores</a>
        </nav>

        <span className="footer-copy">© 2026 Rodando Quindío</span>
      </footer>
    </main>
  );
}

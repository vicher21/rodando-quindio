
"use client";

import { useCallback, useEffect, useState } from "react";
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

type ServiceRequest = {
  id: string;
  service_type: "ride" | "delivery";
  origin: string;
  destination: string;
  package_description: string | null;
  requested_at: string;
  estimated_price: number | null;
  status: string;
};

type DriverOffer = {
  id: string;
  request_id: string;
  status: string;
  created_at: string;
  service_requests: ServiceRequest;
};

export default function DriverDashboard() {
  const router = useRouter();

  const [driver, setDriver] = useState<DriverData | null>(null);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOffers = useCallback(async (driverId: string) => {
    setLoadingOffers(true);

    try {
      const { data, error: offersError } = await supabase
        .from("driver_offers")
        .select(`
          id,
          request_id,
          status,
          created_at,
          service_requests!inner (
            id,
            service_type,
            origin,
            destination,
            package_description,
            requested_at,
            estimated_price,
            status
          )
        `)
        .eq("driver_id", driverId)
        .eq("status", "pending")
        .eq("service_requests.status", "awaiting_acceptance")
        .order("created_at", { ascending: false });

      if (offersError) throw offersError;

      const normalizedOffers = (data ?? [])
        .map((item: any) => ({
          ...item,
          service_requests: Array.isArray(item.service_requests)
            ? item.service_requests[0]
            : item.service_requests,
        }))
        .filter((item: DriverOffer) => Boolean(item.service_requests));

      setOffers(normalizedOffers);
    } catch (err) {
      console.error("Error consultando ofertas:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos consultar las solicitudes."
      );
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let polling: ReturnType<typeof setInterval> | undefined;
    let currentDriverId: string | null = null;

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

        if (driverProfile.status !== "approved") {
          router.replace("/driver/login");
          return;
        }

        if (!active) return;

        currentDriverId = user.id;

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

        await loadOffers(user.id);

        if (!active) return;

        polling = setInterval(() => {
          if (currentDriverId) {
            void loadOffers(currentDriverId);
          }
        }, 5000);
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
      if (polling) clearInterval(polling);
    };
  }, [router, loadOffers]);

  async function handleAvailability() {
    if (!driver || updatingAvailability) return;

    const nextAvailability = !driver.available;

    setUpdatingAvailability(true);
    setError("");
    setNotice("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "set_driver_availability",
        { p_available: nextAvailability }
      );

      if (rpcError) throw rpcError;

      if (data !== nextAvailability) {
        throw new Error("No recibimos la confirmación del cambio.");
      }

      setDriver((current) =>
        current ? { ...current, available: nextAvailability } : current
      );

      setNotice(
        nextAvailability
          ? "Ahora estás disponible para recibir servicios."
          : "Tu disponibilidad fue desactivada."
      );

      if (!nextAvailability) {
        setOffers([]);
      } else {
        await loadOffers(driver.id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos actualizar tu disponibilidad."
      );
    } finally {
      setUpdatingAvailability(false);
    }
  }

  async function handleAccept(offer: DriverOffer) {
    if (!driver || processingOffer) return;

    // Abrimos la pestaña durante el clic para evitar que el navegador
    // bloquee WhatsApp después de las llamadas asíncronas.
    const whatsappWindow = window.open("about:blank", "_blank");

    setProcessingOffer(offer.request_id);
    setError("");
    setNotice("");

    try {
      const { data, error: acceptError } = await supabase.rpc(
        "accept_driver_offer",
        { p_request_id: offer.request_id }
      );

      if (acceptError) throw acceptError;

      if (data === false) {
        throw new Error("La oferta ya no está disponible.");
      }

      setOffers((current) =>
        current.filter((item) => item.request_id !== offer.request_id)
      );

      setDriver((current) =>
        current ? { ...current, available: false } : current
      );

      // Solo el conductor asignado puede obtener el teléfono del cliente.
      const { data: contactData, error: contactError } = await supabase.rpc(
        "get_assigned_service_contact",
        { p_request_id: offer.request_id }
      );

      if (contactError) throw contactError;

      const contact = Array.isArray(contactData)
        ? contactData[0]
        : contactData;

      if (!contact?.guest_phone) {
        throw new Error(
          "El servicio fue aceptado, pero no encontramos el teléfono del cliente."
        );
      }

      const digits = String(contact.guest_phone).replace(/\D/g, "");
      const whatsappNumber = digits.startsWith("57")
        ? digits
        : `57${digits}`;

      if (!/^57\d{10}$/.test(whatsappNumber)) {
        throw new Error(
          "El servicio fue aceptado, pero el teléfono del cliente no tiene un formato válido."
        );
      }

      const serviceLabel =
        contact.service_type === "delivery" ? "la entrega" : "el viaje";

      const message =
        `¡Hola${contact.guest_name ? ` ${contact.guest_name}` : ""}! ` +
        `Soy ${driver.full_name}, conductor de Rodando Quindío. ` +
        `He aceptado ${serviceLabel} desde ${contact.origin} hasta ${contact.destination}. ` +
        "Estoy disponible para coordinar contigo. ¡Muchas gracias!";

      const whatsappUrl =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }

      setNotice(
        "¡Servicio aceptado! Se abrió WhatsApp para que contactes al cliente."
      );

      await loadOffers(driver.id);
    } catch (err) {
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }

      setError(
        err instanceof Error
          ? err.message
          : "No pudimos aceptar esta solicitud."
      );

      await loadOffers(driver.id);
    } finally {
      setProcessingOffer(null);
    }
  }

  async function handleReject(offer: DriverOffer) {
    if (!driver || processingOffer) return;

    setProcessingOffer(offer.request_id);
    setError("");
    setNotice("");

    try {
      const { data, error: rejectError } = await supabase.rpc(
        "reject_driver_offer",
        { p_request_id: offer.request_id }
      );

      if (rejectError) throw rejectError;

      if (data !== true) {
        throw new Error("No pudimos confirmar el rechazo de la oferta.");
      }

      setOffers((current) =>
        current.filter((item) => item.request_id !== offer.request_id)
      );

      setNotice("Has rechazado esta solicitud.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos rechazar esta solicitud."
      );

      await loadOffers(driver.id);
    } finally {
      setProcessingOffer(null);
    }
  }

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

  if (!driver) {
    return (
      <main className="driver-dashboard-loading">
        <div className="driver-dashboard-error">
          <h2>No pudimos abrir tu panel</h2>
          <p>{error || "Comprueba tu sesión de conductor."}</p>
          <button onClick={() => router.replace("/driver/login")}>
            Volver al acceso
          </button>
        </div>
      </main>
    );
  }

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

        <h1>¡Hola, {driver.full_name.split(" ")[0]}!</h1>

        <p>Este es tu espacio de trabajo en Rodando Quindío.</p>

        <div
          className={`driver-dashboard-status ${
            driver.available ? "is-available" : "is-unavailable"
          }`}
        >
          <span className="driver-status-dot" />
          {driver.available ? "Estás disponible" : "No estás disponible"}
        </div>
      </section>

      {error && (
        <div className="driver-availability-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="driver-success-notice" role="status">
          {notice}
        </div>
      )}

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
          <span className="driver-card-icon">
            {driver.available ? "🟢" : "⚪"}
          </span>
          <span className="driver-card-label">DISPONIBILIDAD</span>
          <h2>
            {driver.available ? "Disponible" : "No disponible"}
          </h2>
          <p>
            {driver.available
              ? "Puedes recibir ofertas de servicios."
              : "Activa tu disponibilidad para recibir solicitudes."}
          </p>

          <button
            type="button"
            className={`driver-availability-button ${
              driver.available ? "is-active" : ""
            }`}
            onClick={handleAvailability}
            disabled={updatingAvailability || Boolean(processingOffer)}
          >
            {updatingAvailability
              ? "Actualizando..."
              : driver.available
                ? "Ponerme no disponible"
                : "Ponerme disponible"}
          </button>
        </article>
      </section>

      <section className="driver-offers-section">
        <div className="driver-offers-heading">
          <div>
            <span className="driver-dashboard-kicker">
              OPORTUNIDADES DE SERVICIO
            </span>
            <h2>Solicitudes para ti</h2>
            <p>
              Aquí aparecerán las solicitudes que te enviemos.
            </p>
          </div>

          <div className="driver-offers-counter">
            {offers.length} {offers.length === 1 ? "oferta" : "ofertas"}
          </div>
        </div>

        {!driver.available && (
          <div className="driver-offers-empty">
            <span>⚪</span>
            <h3>No estás disponible</h3>
            <p>
              Activa tu disponibilidad para recibir nuevas solicitudes.
            </p>
          </div>
        )}

        {driver.available && loadingOffers && offers.length === 0 && (
          <div className="driver-offers-empty">
            <span>⌛</span>
            <h3>Buscando solicitudes...</h3>
            <p>Estamos consultando las ofertas disponibles para ti.</p>
          </div>
        )}

        {driver.available && !loadingOffers && offers.length === 0 && (
          <div className="driver-offers-empty">
            <span>🛣️</span>
            <h3>Aún no tienes solicitudes</h3>
            <p>
              Mantente disponible. Cuando llegue una nueva solicitud,
              aparecerá aquí automáticamente.
            </p>
          </div>
        )}

        {offers.map((offer) => {
          const request = offer.service_requests;
          const isProcessing = processingOffer === offer.request_id;

          return (
            <article className="driver-offer-card" key={offer.id}>
              <div className="driver-offer-top">
                <div>
                  <span className="driver-offer-type">
                    {request.service_type === "ride"
                      ? "🚘 VIAJE"
                      : "📦 MENSAJERÍA"}
                  </span>
                  <h3>
                    {request.service_type === "ride"
                      ? "Nueva solicitud de transporte"
                      : "Nueva solicitud de entrega"}
                  </h3>
                </div>

                <span className="driver-offer-pending">
                  Pendiente
                </span>
              </div>

              <div className="driver-offer-route">
                <div className="driver-offer-location">
                  <span className="driver-route-dot pickup" />
                  <div>
                    <small>RECOGIDA</small>
                    <strong>{request.origin}</strong>
                  </div>
                </div>

                <div className="driver-route-line" />

                <div className="driver-offer-location">
                  <span className="driver-route-dot destination" />
                  <div>
                    <small>DESTINO</small>
                    <strong>{request.destination}</strong>
                  </div>
                </div>
              </div>

              {request.service_type === "delivery" &&
                request.package_description && (
                  <div className="driver-offer-package">
                    <strong>Descripción del paquete:</strong>
                    <p>{request.package_description}</p>
                  </div>
                )}

              <div className="driver-offer-meta">
                <span>
                  Solicitado:{" "}
                  {new Date(request.requested_at).toLocaleString("es-CO")}
                </span>

                {request.estimated_price !== null && (
                  <strong>
                    Valor estimado: $
                    {Number(request.estimated_price).toLocaleString("es-CO")}
                  </strong>
                )}
              </div>

              <div className="driver-offer-actions">
                <button
                  type="button"
                  className="driver-offer-reject"
                  onClick={() => handleReject(offer)}
                  disabled={Boolean(processingOffer)}
                >
                  Rechazar
                </button>

                <button
                  type="button"
                  className="driver-offer-accept"
                  onClick={() => handleAccept(offer)}
                  disabled={Boolean(processingOffer)}
                >
                  {isProcessing ? "Procesando..." : "Aceptar servicio"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="driver-dashboard-next">
        <div>
          <span className="driver-dashboard-kicker">
            RODANDO QUINDÍO
          </span>
          <h2>Conectamos caminos.</h2>
          <p>
            Gracias por ser parte de nuestra comunidad de conductores.
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


import { supabase } from "./supabase";

export type ServiceType = "ride" | "delivery";

export type CreateServiceRequestData = {
  serviceType: ServiceType;
  origin: string;
  destination: string;
  packageDescription?: string;
};

export type CreatedServiceRequest = {
  request_id: string;
  tracking_token: string;
  offers_created: number;
};

export async function createServiceRequest(
  request: CreateServiceRequestData
): Promise<CreatedServiceRequest> {
  const origin = request.origin.trim();
  const destination = request.destination.trim();
  const packageDescription = request.packageDescription?.trim() || null;

  if (origin.length < 3) {
    throw new Error("Escribe un punto de recogida válido.");
  }

  if (destination.length < 3) {
    throw new Error("Escribe una dirección de destino válida.");
  }

  if (
    request.serviceType === "delivery" &&
    (!packageDescription || packageDescription.length < 2)
  ) {
    throw new Error("Describe brevemente el paquete que necesitas enviar.");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!session) {
    throw new Error("Tu sesión ha expirado. Vuelve a ingresar.");
  }

  const { data, error } = await supabase.rpc(
    "create_client_service_request",
    {
      p_service_type: request.serviceType,
      p_origin: origin,
      p_destination: destination,
      p_package_description: packageDescription,
    }
  );

  if (error) throw error;

  if (!data?.request_id || !data?.tracking_token) {
    throw new Error("No recibimos la confirmación de tu solicitud.");
  }

  return {
    request_id: data.request_id,
    tracking_token: data.tracking_token,
    offers_created: Number(data.offers_created ?? 0),
  };
}

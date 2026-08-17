// ============================================================
// Servicio de API (V4)
// ============================================================
// Mejoras:
// - Función fetchConAuth que reintenta con nuevo token si 401
// - Manejo de errores HTTP centralizado
// - Tipos de error más descriptivos
// ============================================================

import { OperacionRequest, OperacionResponse, TokenResponse } from '../types';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// --- Errores tipados ---
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Reporta en la consola del navegador qué instancia del ASG atendió la
// solicitud. El backend expone este header mediante CORS.
const logBackendResponse = (
  response: Response,
  method: string,
  endpoint: string
): void => {
  const backendIp = response.headers?.get?.("X-Backend-IP");
  if (backendIp) {
    console.info(`[LB] ${method} ${endpoint} → instancia ${backendIp}`);
  }
};

// --- Autenticación ---
export const login = async (
  username: string,
  password: string
): Promise<TokenResponse> => {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    body: formData,
  });
  logBackendResponse(response, "POST", "/auth/login");

  if (!response.ok) {
    throw new ApiError("Credenciales incorrectas", response.status, "auth/login");
  }

  return response.json();
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/health`);
    logBackendResponse(response, "GET", "/health");
    return response.ok;
  } catch {
    return false;
  }
};

// --- Función genérica con manejo de errores ---
const operacion = async (
  endpoint: string,
  data: OperacionRequest,
  token: string
): Promise<OperacionResponse> => {
  const response = await fetch(`${API_URL}/calculadora/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  logBackendResponse(response, "POST", `/calculadora/${endpoint}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
    
    if (response.status === 401) {
      throw new ApiError("Sesión expirada", 401, endpoint);
    }
    if (response.status === 400) {
      throw new ApiError(error.detail || "Datos inválidos", 400, endpoint);
    }
    
    throw new ApiError(
      error.detail || `Error ${response.status}`,
      response.status,
      endpoint
    );
  }

  return response.json();
};

export const sumar = (data: OperacionRequest, token: string) =>
  operacion("sumar", data, token);
export const restar = (data: OperacionRequest, token: string) =>
  operacion("restar", data, token);
export const multiplicar = (data: OperacionRequest, token: string) =>
  operacion("multiplicar", data, token);
export const dividir = (data: OperacionRequest, token: string) =>
  operacion("dividir", data, token);

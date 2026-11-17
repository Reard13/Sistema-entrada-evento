// Sesión del personal (administrador o puerta). La clave se valida en el servidor, que entrega
// un token firmado de 12 horas. Se guarda en este navegador para no pedir la clave en cada recarga.

export type Rol = 'admin' | 'puerta';
export interface StaffSession {
  rol: Rol;
  token: string;
  expiresAt: number;
}

const KEY = 'evento_sesion_personal';
export const SESSION_EXPIRED_EVENT = 'evento_sesion_expirada';

export function readSession(): StaffSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as StaffSession | null;
    if (s && s.token && s.expiresAt > Date.now()) return s;
  } catch {
    /* ignorar */
  }
  return null;
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}

export async function login(pin: string): Promise<StaffSession | string> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.token) return data?.message || 'Clave incorrecta.';
    const session: StaffSession = { rol: data.rol, token: data.token, expiresAt: data.expiresAt };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  } catch {
    return 'No se pudo conectar con el servidor.';
  }
}

export function authHeaders(): Record<string, string> {
  const s = readSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}

// Petición del panel: si el servidor dice que la sesión venció, se cierra y se avisa a la pantalla
export async function staffFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers || {}) },
  });
  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
  return res;
}

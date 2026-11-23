const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export function getToken() { return localStorage.getItem("token"); }
export function setToken(t: string | null) { if (t) localStorage.setItem("token", t); else localStorage.removeItem("token"); }

async function req(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as any) };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(BASE + path, { ...init, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.title ?? j.message ?? JSON.stringify(j); } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (email: string, password: string) => req("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req("/api/auth/me"),
  boards: () => req("/api/boards"),
  createBoard: (name: string, description?: string) => req("/api/boards", { method: "POST", body: JSON.stringify({ name, description }) }),
  board: (id: string) => req(`/api/boards/${id}`),
  logout: () => { setToken(null); },
};
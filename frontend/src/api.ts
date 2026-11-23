const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export type BoardRole = 0 | 1 | 2;
export type Member = { userId: string; email: string; role: BoardRole };
export type Task = {
  id: string; columnId: string; title: string; description: string | null;
  assigneeId: string | null; dueDate: string | null; position: number;
};
export type Column = { id: string; name: string; position: number; tasks: Task[] };
export type Board = {
  id: string; name: string; description: string | null; ownerId: string;
  role?: BoardRole; columns: Column[]; members: Member[];
};
export type User = { id: string; email: string };

export function getToken() { return localStorage.getItem("token"); }
export function setToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error("Не удалось связаться с сервером. Проверьте, что API запущен.");
  }
  if (response.status === 401) {
    setToken(null);
    if (!location.pathname.startsWith("/login") && !location.pathname.startsWith("/register")) location.assign("/login");
  }
  if (!response.ok) {
    let message = `Ошибка запроса (${response.status})`;
    try {
      const body = await response.json();
      const validation = Array.isArray(body.errors)
        ? body.errors.map((item: { description?: string }) => item.description).filter(Boolean).join(" ")
        : body.errors ? Object.values(body.errors).flat().join(" ") : "";
      message = validation || body.message || body.title || message;
    } catch { /* response has no JSON body */ }
    throw new Error(message);
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const api = {
  register: (email: string, password: string) => request("/api/auth/register", json("POST", { email, password })),
  login: (email: string, password: string) => request<{ accessToken: string; user: User }>("/api/auth/login", json("POST", { email, password })),
  me: () => request<User>("/api/auth/me"),
  boards: () => request<Board[]>("/api/boards"),
  createBoard: (name: string, description: string) => request<{ id: string }>("/api/boards", json("POST", { name, description })),
  updateBoard: (id: string, name: string, description: string) => request<void>(`/api/boards/${id}`, json("PUT", { name, description })),
  deleteBoard: (id: string) => request<void>(`/api/boards/${id}`, { method: "DELETE" }),
  board: (id: string) => request<Board>(`/api/boards/${id}`),
  createColumn: (boardId: string, name: string) => request(`/api/boards/${boardId}/columns`, json("POST", { name })),
  updateColumn: (boardId: string, columnId: string, name: string, position: number) => request<void>(`/api/boards/${boardId}/columns/${columnId}`, json("PUT", { name, position })),
  deleteColumn: (boardId: string, columnId: string) => request<void>(`/api/boards/${boardId}/columns/${columnId}`, { method: "DELETE" }),
  createTask: (boardId: string, columnId: string, task: Omit<Task, "id" | "columnId" | "position">) => request(`/api/boards/${boardId}/columns/${columnId}/tasks`, json("POST", task)),
  updateTask: (boardId: string, taskId: string, task: Pick<Task, "title" | "description" | "assigneeId" | "dueDate">) => request<void>(`/api/boards/${boardId}/tasks/${taskId}`, json("PUT", task)),
  moveTask: (boardId: string, taskId: string, targetColumnId: string, position: number) => request<void>(`/api/boards/${boardId}/tasks/${taskId}/move`, { ...json("PATCH", { targetColumnId, position }) }),
  deleteTask: (boardId: string, taskId: string) => request<void>(`/api/boards/${boardId}/tasks/${taskId}`, { method: "DELETE" }),
  inviteMember: (boardId: string, email: string, role: "Editor" | "Viewer") => request<void>(`/api/boards/${boardId}/members/invite`, json("POST", { email, role })),
  removeMember: (boardId: string, userId: string) => request<void>(`/api/boards/${boardId}/members/${userId}`, { method: "DELETE" }),
  logout: () => setToken(null),
};

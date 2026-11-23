import { useEffect, useState } from "react";
import { api, setToken, getToken } from "../api";

export default function Board() {
  const id = window.location.pathname.split("/").pop()!;
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [col, setCol] = useState("");
  const [conn, setConn] = useState("disconnected");

  async function load() {
    try { setBoard(await api.board(id)); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  // SignalR best-effort
  useEffect(() => {
    let connection: any;
    (async () => {
      try {
        const mod: any = await import("@microsoft/signalr");
        const SignalR = mod.default ?? mod;
        connection = new SignalR.HubConnectionBuilder()
          .withUrl((import.meta.env.VITE_API_URL ?? "http://localhost:5000") + "/hubs/board", { accessTokenFactory: () => getToken() ?? "" })
          .withAutomaticReconnect()
          .build();
        connection.onreconnected(async () => { setConn("connected"); await connection.invoke("JoinBoard", id); await load(); });
        await connection.start();
        await connection.invoke("JoinBoard", id);
        setConn("connected");
        connection.on("TaskCreated", () => load());
        connection.on("TaskUpdated", () => load());
        connection.on("TaskDeleted", () => load());
        connection.on("TaskMoved", () => load());
        connection.on("ColumnCreated", () => load());
        connection.on("ColumnUpdated", () => load());
      } catch (e) {
        setConn("unavailable");
      }
    })();
    return () => { if (connection) connection.stop(); };
  }, [id]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch((import.meta.env.VITE_API_URL ?? "http://localhost:5000") + `/api/boards/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title, description: desc, columnId: col }),
      });
      setTitle(""); setDesc(""); await load();
    } catch (e: any) { setErr(e.message); }
  }

  async function delTask(taskId: string) {
    await fetch((import.meta.env.VITE_API_URL ?? "http://localhost:5000") + `/api/boards/${id}/tasks/${taskId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
    });
    await load();
  }

  async function moveTask(taskId: string, toCol: string) {
    await fetch((import.meta.env.VITE_API_URL ?? "http://localhost:5000") + `/api/boards/${id}/tasks/${taskId}/move`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ columnId: toCol }),
    });
    await load();
  }

  if (loading) return <p>Loading...</p>;
  if (err) return <p style={{ color: "red" }}>{err}</p>;
  if (!board) return <p>Not found</p>;

  const columns = board.columns ?? [];
  return (
    <div>
      <button onClick={() => { setToken(null); window.location.href = "/login"; }}>Logout</button>
      <span style={{ marginLeft: 12 }}>SignalR: {conn}</span>
      <h2>{board.name}</h2>
      <p>{board.description}</p>
      <form onSubmit={createTask}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="task title" required />
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="description" />
        <select value={col} onChange={e => setCol(e.target.value)}>
          <option value="">column</option>
          {columns.map((c: any) => <option key={c.id ?? c.columnId} value={c.id ?? c.columnId}>{c.name ?? c.title}</option>)}
        </select>
        <button type="submit">Add task</button>
      </form>
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        {columns.map((c: any) => (
          <div key={c.id ?? c.columnId} onDragOver={e => e.preventDefault()}
            onDrop={e => { const t = e.dataTransfer.getData("text"); if (t) moveTask(t, c.id ?? c.columnId); }}
            style={{ border: "1px solid #ccc", padding: 8, minWidth: 220, minHeight: 120 }}>
            <h4>{c.name ?? c.title}</h4>
            {(c.tasks ?? []).map((t: any) => (
              <div key={t.id ?? t.taskId} draggable onDragStart={e => e.dataTransfer.setData("text", t.id ?? t.taskId)}
                style={{ border: "1px solid #999", padding: 4, margin: 4 }}>
                <b>{t.title}</b>
                <p>{t.description}</p>
                <button onClick={() => delTask(t.id ?? t.taskId)}>Delete</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { api, setToken } from "../api";

export default function Board() {
  const id = window.location.pathname.split("/").pop()!;
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      try { setBoard(await api.board(id!)); }
      catch (e:any) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);
  if (loading) return <p>Loading...</p>;
  if (err) return <p style={{color:"red"}}>{err}</p>;
  if (!board) return <p>Not found</p>;
  return (
    <div>
      <button onClick={() => { setToken(null); window.location.href = "/login"; }}>Logout</button>
      <h2>{board.name}</h2>
      <p>{board.description}</p>
      <div style={{display:"flex", gap:16}}>
        {(board.columns ?? []).map((c:any) => (
          <div key={c.id ?? c.columnId} style={{border:"1px solid #ccc", padding:8, minWidth:200}}>
            <h4>{c.name ?? c.title}</h4>
            {(c.tasks ?? []).map((t:any) => <div key={t.id ?? t.taskId}>{t.title}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

export default function Boards() {
  const [boards, setBoards] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  async function load() { try { setBoards(await api.boards()); } catch (e:any) { setErr(e.message); } }
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const b: any = await api.createBoard(name, desc);
      nav(`/boards/${b.id ?? b.boardId}`);
    } catch (e:any) { setErr(e.message); }
  }
  function logout() { setToken(null); nav("/login"); }
  return (
    <div>
      <button onClick={logout}>Logout</button>
      <h2>My boards</h2>
      <form onSubmit={create}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="name" required />
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="description" />
        <button type="submit">Create</button>
      </form>
      {err && <p style={{color:"red"}}>{err}</p>}
      {boards.length === 0 ? <p>No boards yet</p> : (
        <ul>{boards.map((b:any) => <li key={b.id ?? b.boardId}><a href={`/boards/${b.id ?? b.boardId}`}>{b.name}</a></li>)}</ul>
      )}
    </div>
  );
}
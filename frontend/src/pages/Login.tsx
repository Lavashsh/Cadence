import { useState } from "react";
import { api, setToken } from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r: any = await api.login(email, password);
      setToken(r.token ?? r.accessToken ?? r);
      window.location.href = "/boards";
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <form onSubmit={submit}>
      <h2>Login</h2>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
      <button type="submit">Login</button>
      {err && <p style={{color:"red"}}>{err}</p>}
      <p><a href="/register">Register</a></p>
    </form>
  );
}
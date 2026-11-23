import { useState } from "react";
import { api, setToken } from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await api.login(email.trim(), password);
      setToken(result.accessToken);
      window.location.assign("/boards");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось войти."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <a className="brand" href="/login"><span className="brand-mark">C</span> Cadence</a>
      <p className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО КОМАНДЫ</p>
      <h1>С возвращением</h1>
      <p className="muted">Войдите, чтобы продолжить работу с досками.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>Email<input autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Пароль<input autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Ваш пароль" /></label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="button primary full" disabled={busy}>{busy ? "Входим…" : "Войти"}</button>
      </form>
      <p className="auth-foot">Нет аккаунта? <a href="/register">Создать аккаунт</a></p>
    </section>
  </main>;
}

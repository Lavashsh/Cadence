import { useState } from "react";
import { api, setToken } from "../api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (password !== confirm) { setError("Пароли не совпадают."); return; }
    if (!/\d/.test(password)) { setError("Добавьте хотя бы одну цифру в пароль."); return; }
    setBusy(true);
    try {
      await api.register(email.trim(), password);
      const result = await api.login(email.trim(), password);
      setToken(result.accessToken);
      window.location.assign("/boards");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось создать аккаунт."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <a className="brand" href="/register"><span className="brand-mark">C</span> Cadence</a>
      <p className="eyebrow">НАЧНИТЕ С КОМАНДОЙ</p>
      <h1>Создать аккаунт</h1>
      <p className="muted">Зарегистрируйтесь, чтобы создать первую доску.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>Email<input autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Пароль<input autoComplete="new-password" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Не менее 8 символов и цифра" /></label>
        <label>Повторите пароль<input autoComplete="new-password" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Повторите пароль" /></label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="button primary full" disabled={busy}>{busy ? "Создаём аккаунт…" : "Зарегистрироваться"}</button>
      </form>
      <p className="auth-foot">Уже есть аккаунт? <a href="/login">Войти</a></p>
    </section>
  </main>;
}

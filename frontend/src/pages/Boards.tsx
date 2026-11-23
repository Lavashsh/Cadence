import { useEffect, useState } from "react";
import { api, type Board, type User } from "../api";

const roleName = (role?: number) => ["Владелец", "Редактор", "Наблюдатель"][role ?? -1] ?? "Участник";

export default function Boards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const [items, me] = await Promise.all([api.boards(), api.me()]);
      setBoards(items); setUser(me);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить доски."); }
  }
  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await api.createBoard(name.trim(), description.trim());
      window.location.assign(`/boards/${result.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось создать доску."); }
    finally { setBusy(false); }
  }

  async function saveBoard(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    setError(""); setBusy(true);
    try {
      await api.updateBoard(editing.id, editing.name.trim(), editing.description ?? "");
      setEditing(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось сохранить доску."); }
    finally { setBusy(false); }
  }

  async function deleteBoard(board: Board) {
    if (!window.confirm(`Удалить доску «${board.name}» и все её задачи?`)) return;
    try { setError(""); await api.deleteBoard(board.id); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось удалить доску."); }
  }

  function logout() { api.logout(); window.location.assign("/login"); }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/boards"><span className="brand-mark">C</span> Cadence</a>
      <div className="topbar-right"><span className="user-chip">{user?.email ?? "Моё пространство"}</span><button className="button quiet" onClick={logout}>Выйти</button></div>
    </header>
    <main className="page-content">
      <div className="page-heading">
        <div><p className="eyebrow">ВАШЕ ПРОСТРАНСТВО</p><h1>Мои доски</h1><p className="muted">Соберите задачи команды в одном месте.</p></div>
        <span className="count-pill">{boards.length} {boards.length === 1 ? "доска" : "досок"}</span>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="create-panel">
        <div><h2>Новая доска</h2><p className="muted">Начните с названия и при желании добавьте описание.</p></div>
        <form className="create-board-form" onSubmit={create}>
          <input aria-label="Название доски" required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Например, Запуск продукта" />
          <input aria-label="Описание доски" maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое описание (необязательно)" />
          <button className="button primary" disabled={busy}>{busy ? "Создаём…" : "Создать доску"}</button>
        </form>
      </section>
      {boards.length === 0 ? <section className="empty-state"><div className="empty-icon">▦</div><h2>Здесь пока пусто</h2><p className="muted">Создайте доску выше — колонки To do, In progress и Done появятся автоматически.</p></section> :
        <section className="board-grid" aria-label="Список досок">
          {boards.map(board => <article className="board-card" key={board.id}>
            <a className="board-card-main" href={`/boards/${board.id}`}>
              <span className="board-icon">▦</span><span className="role-tag">{roleName(board.role)}</span>
              <h2>{board.name}</h2><p className="muted">{board.description || "Без описания"}</p>
              <span className="card-link">Открыть доску <span aria-hidden="true">→</span></span>
            </a>
            {board.role === 0 && <div className="card-actions"><button className="button small quiet" onClick={() => setEditing({ ...board })}>Изменить</button><button className="button small danger-quiet" onClick={() => void deleteBoard(board)}>Удалить</button></div>}
          </article>)}
        </section>}
    </main>
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setEditing(null); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-board-title">
        <div className="modal-heading"><div><p className="eyebrow">НАСТРОЙКИ ДОСКИ</p><h2 id="edit-board-title">Изменить доску</h2></div><button className="icon-button" aria-label="Закрыть" onClick={() => setEditing(null)}>×</button></div>
        <form className="form-stack" onSubmit={saveBoard}>
          <label>Название<input required maxLength={120} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
          <label>Описание<textarea rows={3} maxLength={1000} value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="button quiet" onClick={() => setEditing(null)}>Отмена</button><button className="button primary" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}

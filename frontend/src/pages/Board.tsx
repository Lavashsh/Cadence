import { useEffect, useMemo, useState } from "react";
import { api, getToken, type Board as BoardData, type Member, type Task, type User } from "../api";

const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const roleName = (role: number) => ["Владелец", "Редактор", "Наблюдатель"][role] ?? "Участник";

export default function Board() {
  const boardId = window.location.pathname.split("/").filter(Boolean).pop() ?? "";
  const [board, setBoard] = useState<BoardData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [connectionState, setConnectionState] = useState("connecting");
  const [taskColumn, setTaskColumn] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingBoard, setEditingBoard] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [newColumn, setNewColumn] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Editor" | "Viewer">("Editor");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [boardData, currentUser] = await Promise.all([api.board(boardId), api.me()]);
      setBoard(boardData); setUser(currentUser); setBoardName(boardData.name); setBoardDescription(boardData.description ?? "");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить доску."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [boardId]);

  useEffect(() => {
    let disposed = false;
    let connection: any;
    async function connect() {
      try {
        const mod: any = await import("@microsoft/signalr");
        const SignalR = mod.default ?? mod;
        connection = new SignalR.HubConnectionBuilder()
          .withUrl(`${API}/hubs/board`, { accessTokenFactory: () => getToken() ?? "" })
          .withAutomaticReconnect()
          .build();
        const refresh = () => { void load(); };
        ["TaskCreated", "TaskUpdated", "TaskDeleted", "TaskMoved", "ColumnCreated", "ColumnUpdated", "ColumnDeleted", "MemberUpdated", "BoardUpdated"].forEach(event => connection.on(event, refresh));
        connection.on("MemberRemoved", (removedUserId: string) => {
          void api.me().then(me => {
            if (removedUserId?.toLowerCase() === me.id.toLowerCase()) window.location.assign("/boards");
            else refresh();
          }).catch(() => window.location.assign("/login"));
        });
        connection.on("BoardDeleted", () => window.location.assign("/boards"));
        connection.onreconnecting(() => setConnectionState("reconnecting"));
        connection.onclose(() => setConnectionState("disconnected"));
        connection.onreconnected(async () => {
          if (disposed) return;
          setConnectionState("connected");
          await connection.invoke("JoinBoard", boardId);
          await load();
        });
        await connection.start();
        if (disposed) { await connection.stop(); return; }
        await connection.invoke("JoinBoard", boardId);
        if (!disposed) setConnectionState("connected");
      } catch {
        if (!disposed) setConnectionState("unavailable");
      }
    }
    void connect();
    return () => {
      disposed = true;
      if (connection) {
        void connection.invoke("LeaveBoard", boardId).catch(() => undefined);
        void connection.stop();
      }
    };
  }, [boardId]);

  const myMember = useMemo(() => board?.members.find(member => member.userId.toLowerCase() === (user?.id ?? "").toLowerCase()), [board, user]);
  const canEdit = myMember?.role === 0 || myMember?.role === 1;
  const isOwner = myMember?.role === 0;
  const members = board?.members ?? [];

  async function action(work: () => Promise<unknown>, message?: string) {
    setError(""); setSuccess(""); setBusy(true);
    try { await work(); await load(); if (message) setSuccess(message); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось выполнить действие."); }
    finally { setBusy(false); }
  }

  async function saveBoard(event: React.FormEvent) {
    event.preventDefault();
    await action(() => api.updateBoard(boardId, boardName.trim(), boardDescription.trim()), "Доска сохранена.");
    setEditingBoard(false);
  }

  async function createColumn(event: React.FormEvent) {
    event.preventDefault();
    if (!newColumn.trim()) return;
    await action(() => api.createColumn(boardId, newColumn.trim()), "Колонка добавлена.");
    setNewColumn("");
  }

  async function editColumn(columnId: string, currentName: string, position: number) {
    const name = window.prompt("Название колонки", currentName);
    if (name === null || !name.trim()) return;
    await action(() => api.updateColumn(boardId, columnId, name.trim(), position), "Колонка обновлена.");
  }

  async function deleteColumn(columnId: string, name: string) {
    if (!window.confirm(`Удалить колонку «${name}»? В ней не должно быть задач.`)) return;
    await action(() => api.deleteColumn(boardId, columnId), "Колонка удалена.");
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const columnId = String(form.get("columnId") ?? taskColumn ?? "");
    const assignee = String(form.get("assigneeId") ?? "");
    await action(() => api.createTask(boardId, columnId, {
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim() || null,
      assigneeId: assignee || null,
      dueDate: String(form.get("dueDate") ?? "") || null,
    }), "Задача создана.");
    setTaskColumn(null);
  }

  async function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingTask) return;
    const form = new FormData(event.currentTarget);
    const assignee = String(form.get("assigneeId") ?? "");
    await action(() => api.updateTask(boardId, editingTask.id, {
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim() || null,
      assigneeId: assignee || null,
      dueDate: String(form.get("dueDate") ?? "") || null,
    }), "Задача обновлена.");
    setEditingTask(null);
  }

  async function moveTask(taskId: string, columnId: string, position: number) {
    await action(() => api.moveTask(boardId, taskId, columnId, position));
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Удалить задачу «${task.title}»?`)) return;
    await action(() => api.deleteTask(boardId, task.id), "Задача удалена.");
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    await action(() => api.inviteMember(boardId, inviteEmail.trim(), inviteRole), "Участник добавлен.");
    setInviteEmail("");
  }

  async function changeRole(member: Member, role: "Editor" | "Viewer") {
    if (member.email) await action(() => api.inviteMember(boardId, member.email, role), "Роль обновлена.");
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Удалить ${member.email} с доски?`)) return;
    await action(() => api.removeMember(boardId, member.userId), "Участник удалён.");
  }

  function logout() { api.logout(); window.location.assign("/login"); }

  if (loading) return <main className="loading-state">Загружаем доску…</main>;
  if (!board) return <main className="page-content"><a className="back-link" href="/boards">← Все доски</a><p className="alert">{error || "Доска не найдена."}</p></main>;

  const assigneeName = (id: string | null) => id ? members.find(member => member.userId === id)?.email ?? "Участник" : "Не назначен";

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/boards"><span className="brand-mark">C</span> Cadence</a>
      <div className="topbar-right"><span className={`connection-pill ${connectionState}`}><span className="status-dot" />{connectionState === "connected" ? "В сети" : connectionState === "reconnecting" ? "Переподключение" : connectionState === "unavailable" ? "Нет realtime" : "Подключение"}</span><span className="user-chip">{user?.email}</span><button className="button quiet" onClick={logout}>Выйти</button></div>
    </header>
    <main className="board-page">
      <a className="back-link" href="/boards">← Все доски</a>
      <section className="board-heading">
        <div className="board-title-block">
          <div className="board-title-line"><h1>{board.name}</h1>{isOwner && <button className="icon-button" title="Изменить доску" onClick={() => setEditingBoard(true)}>✎</button>}</div>
          <p className="muted">{board.description || "Добавьте описание, чтобы команда знала цель этой доски."}</p>
        </div>
        <div className="board-summary"><span>{board.columns.length} колонки</span><span>{board.columns.reduce((sum, column) => sum + column.tasks.length, 0)} задачи</span><span>{members.length} участника</span></div>
      </section>
      {error && <p className="alert" role="alert">{error}</p>}{success && <p className="success-message" role="status">{success}</p>}

      {isOwner && <section className="members-panel">
        <div className="section-heading"><div><p className="eyebrow">КОМАНДА</p><h2>Участники доски</h2></div></div>
        <form className="invite-form" onSubmit={invite}>
          <input aria-label="Email участника" type="email" required value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="Email зарегистрированного пользователя" />
          <select aria-label="Роль нового участника" value={inviteRole} onChange={event => setInviteRole(event.target.value as "Editor" | "Viewer")}><option value="Editor">Редактор</option><option value="Viewer">Наблюдатель</option></select>
          <button className="button secondary" disabled={busy}>Добавить участника</button>
        </form>
        {members.length > 0 && <div className="member-list">{members.map(member => <div className="member-row" key={member.userId}>
          <div className="member-avatar">{(member.email || "?").slice(0, 1).toUpperCase()}</div><div className="member-info"><strong>{member.email || "Пользователь"}</strong><span>{roleName(member.role)}</span></div>
          {member.role !== 0 && <><select aria-label={`Роль для ${member.email}`} value={member.role === 1 ? "Editor" : "Viewer"} onChange={event => void changeRole(member, event.target.value as "Editor" | "Viewer")}><option value="Editor">Редактор</option><option value="Viewer">Наблюдатель</option></select><button className="button small danger-quiet" onClick={() => void removeMember(member)}>Удалить</button></>}
        </div>)}</div>}
      </section>}

      <div className="kanban-toolbar"><div><p className="eyebrow">ПЛАН РАБОТ</p><h2>Канбан-доска</h2></div>{canEdit && <button className="button primary" onClick={() => setTaskColumn(board.columns[0]?.id ?? "")} disabled={!board.columns.length}>＋ Новая задача</button>}</div>
      <section className="kanban-board" aria-label="Канбан-доска">
        {board.columns.map(column => <article className="kanban-column" key={column.id} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const taskId = event.dataTransfer.getData("text/plain"); if (taskId) void moveTask(taskId, column.id, column.tasks.length); }}>
          <header className="column-header"><div className="column-title"><span className="column-dot" /><h3>{column.name}</h3><span className="task-count">{column.tasks.length}</span></div>{canEdit && <div className="column-actions"><button className="icon-button" aria-label={`Изменить ${column.name}`} onClick={() => void editColumn(column.id, column.name, column.position)}>✎</button><button className="icon-button danger-icon" aria-label={`Удалить ${column.name}`} onClick={() => void deleteColumn(column.id, column.name)}>×</button></div>}</header>
          <div className="task-list">
            {column.tasks.map((task, index) => <article className={`task-card ${canEdit ? "draggable" : ""}`} key={task.id} draggable={canEdit} onDragStart={event => { event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); const taskId = event.dataTransfer.getData("text/plain"); if (taskId && taskId !== task.id) void moveTask(taskId, column.id, index); }}>
              <div className="task-card-heading"><span className="task-grip" aria-hidden="true">⠿</span><strong>{task.title}</strong>{canEdit && <button className="icon-button" aria-label={`Изменить задачу ${task.title}`} onClick={() => setEditingTask(task)}>✎</button>}</div>
              {task.description && <p className="task-description">{task.description}</p>}
              <div className="task-meta"><span className="assignee-chip"><span className="mini-avatar">{assigneeName(task.assigneeId).slice(0, 1).toUpperCase()}</span>{assigneeName(task.assigneeId)}</span>{task.dueDate && <time className="due-date">До {new Date(task.dueDate).toLocaleDateString("ru-RU")}</time>}</div>
              {canEdit && <div className="task-actions"><button className="text-button" onClick={() => setEditingTask(task)}>Изменить</button><button className="text-button danger-text" onClick={() => void deleteTask(task)}>Удалить</button></div>}
            </article>)}
            {column.tasks.length === 0 && <p className="column-empty">Перетащите сюда задачу</p>}
          </div>
          {canEdit && <button className="add-task-link" onClick={() => setTaskColumn(column.id)}>＋ Добавить задачу</button>}
        </article>)}
        {canEdit && <form className="new-column-card" onSubmit={createColumn}><p className="eyebrow">НОВАЯ КОЛОНКА</p><input aria-label="Название новой колонки" value={newColumn} onChange={event => setNewColumn(event.target.value)} placeholder="Название" maxLength={80} required /><button className="button secondary" disabled={busy}>Добавить колонку</button></form>}
      </section>
      {!canEdit && <p className="read-only-note">У вас роль «Наблюдатель»: доска доступна только для просмотра.</p>}
    </main>

    {(taskColumn || editingTask || editingBoard) && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) { setTaskColumn(null); setEditingTask(null); setEditingBoard(false); } }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-heading"><div><p className="eyebrow">{editingBoard ? "НАСТРОЙКИ ДОСКИ" : editingTask ? "КАРТОЧКА ЗАДАЧИ" : "НОВАЯ КАРТОЧКА"}</p><h2 id="task-modal-title">{editingBoard ? "Изменить доску" : editingTask ? "Изменить задачу" : "Создать задачу"}</h2></div><button className="icon-button" aria-label="Закрыть" onClick={() => { setTaskColumn(null); setEditingTask(null); setEditingBoard(false); }}>×</button></div>
        {editingBoard ? <form className="form-stack" onSubmit={saveBoard}>
          <label>Название<input required maxLength={120} value={boardName} onChange={event => setBoardName(event.target.value)} /></label>
          <label>Описание<textarea rows={3} maxLength={1000} value={boardDescription} onChange={event => setBoardDescription(event.target.value)} /></label>
          <div className="form-actions"><button type="button" className="button quiet" onClick={() => setEditingBoard(false)}>Отмена</button><button className="button primary" disabled={busy}>Сохранить</button></div>
        </form> : <form className="form-stack" onSubmit={editingTask ? saveTask : createTask}>
          <label>Название<input name="title" required maxLength={200} defaultValue={editingTask?.title ?? ""} autoFocus /></label>
          <label>Описание<textarea name="description" rows={3} maxLength={5000} defaultValue={editingTask?.description ?? ""} /></label>
          {!editingTask && <label>Колонка<select name="columnId" required defaultValue={taskColumn ?? ""}>{board.columns.map(column => <option value={column.id} key={column.id}>{column.name}</option>)}</select></label>}
          <label>Исполнитель<select name="assigneeId" defaultValue={editingTask?.assigneeId ?? ""}><option value="">Не назначен</option>{members.map(member => <option value={member.userId} key={member.userId}>{member.email}</option>)}</select></label>
          <label>Срок выполнения<input name="dueDate" type="date" defaultValue={editingTask?.dueDate?.slice(0, 10) ?? ""} /></label>
          <div className="form-actions"><button type="button" className="button quiet" onClick={() => { setTaskColumn(null); setEditingTask(null); }}>Отмена</button><button className="button primary" disabled={busy}>{busy ? "Сохраняем…" : editingTask ? "Сохранить изменения" : "Создать задачу"}</button></div>
        </form>}
      </section>
    </div>}
  </div>;
}

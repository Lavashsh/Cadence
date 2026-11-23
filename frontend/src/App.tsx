import { getToken } from "./api";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Boards from "./pages/Boards";
import Board from "./pages/Board";

export default function App() {
  const path = window.location.pathname;
  if (path === "/login") return <Login />;
  if (path === "/register") return <Register />;
  if (path === "/") {
    window.location.replace(getToken() ? "/boards" : "/login");
    return null;
  }
  if (!getToken()) {
    window.location.replace("/login");
    return null;
  }
  if (path === "/boards") return <Boards />;
  if (path.startsWith("/boards/")) return <Board />;
  window.location.replace("/boards");
  return null;
}

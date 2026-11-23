import Login from "./pages/Login";
import Register from "./pages/Register";
import Boards from "./pages/Boards";
import Board from "./pages/Board";

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith("/login")) return <Login />;
  if (path.startsWith("/register")) return <Register />;
  if (path.startsWith("/boards/")) return <Board />;
  if (path.startsWith("/boards")) return <Boards />;
  window.location.pathname = "/boards";
  return null;
}
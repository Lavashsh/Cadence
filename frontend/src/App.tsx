import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Boards from "./pages/Boards";
import Board from "./pages/Board";

function Private({ children }: { children: JSX.Element }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/boards" element={<Private><Boards /></Private>} />
        <Route path="/boards/:id" element={<Private><Board /></Private>} />
        <Route path="*" element={<Navigate to="/boards" />} />
      </Routes>
    </BrowserRouter>
  );
}
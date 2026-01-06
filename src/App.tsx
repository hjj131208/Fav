import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import { BookmarkProvider } from '@/contexts/bookmarkContext';
import { AuthProvider } from '@/contexts/AuthContext';

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      if (location.pathname === "/admin") {
        navigate("/");
      } else if (location.pathname !== "/login") {
        navigate("/login");
      }
    };

    window.addEventListener("auth-expired", handler);
    return () => window.removeEventListener("auth-expired", handler);
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BookmarkProvider>
        <AppShell />
      </BookmarkProvider>
    </AuthProvider>
  );
}

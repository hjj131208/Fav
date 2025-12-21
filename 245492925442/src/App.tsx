import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import { BookmarkProvider } from '@/contexts/bookmarkContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BookmarkProvider>
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
          <div className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
            </Routes>
          </div>
          {/* footer moved into Home page content area */}
        </div>
      </BookmarkProvider>
    </AuthProvider>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'sonner';
import App from "./App.tsx";
import "./index.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

// 检查是否在Cloudflare Worker环境中
if (typeof window !== 'undefined') {
  // 初始化主题
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  };
  
  initTheme();
  
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </StrictMode>
  );
}

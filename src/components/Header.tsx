import React, { useCallback, useRef, useState } from 'react';
import { BarsIcon, CheckSquareIcon, BanIcon, ImageIcon, MoonIcon, TimesIcon, CogIcon } from '@/components/icons';
import { useBookmarkContext } from '@/contexts/bookmarkContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFaviconForUrl } from '@/services/favicon';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isQuickAccessOpen?: boolean;
  onToggleQuickAccess?: () => void;
  onOpenSettings?: () => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,

  isQuickAccessOpen,
  onToggleQuickAccess,
  onOpenSettings,
  selectionMode,
  onToggleSelectionMode
}) => {
  const themeToggleRef = useRef<number | null>(null);
  const { bookmarks, patchBookmark, isSyncing } = useBookmarkContext();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isBulkFetching, setIsBulkFetching] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, success: 0, fail: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleThemeToggle = useCallback(() => {
    if (themeToggleRef.current) {
      clearTimeout(themeToggleRef.current);
    }
    themeToggleRef.current = setTimeout(() => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, 50);
  }, []);

  const handleBulkFetchMissingIcons = useCallback(async () => {
    // 若正在进行，则本次点击视为取消
    if (isBulkFetching) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setIsBulkFetching(false);
      toast.info('已取消批量补图');
      return;
    }
    // 仅处理缺失图标的书签
    const targets = bookmarks.filter(b => !b.favicon || b.favicon.trim() === '');
    if (targets.length === 0) {
      toast.info('没有缺失图标的书签需要处理');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsBulkFetching(true);
    setProgress({ done: 0, total: targets.length, success: 0, fail: 0 });

    // 简单并发控制
    const concurrency = Math.min(4, targets.length);
    let cursor = 0;
    let success = 0;
    let fail = 0;

    async function worker() {
      while (true) {
        if (controller.signal.aborted) break;
        const index = cursor++;
        if (index >= targets.length) break;
        const b = targets[index];
        try {
          const dataUrl = await fetchFaviconForUrl(b.url, controller.signal);
          if (controller.signal.aborted) break;
          if (dataUrl) {
            // 成功获取：先缓存到本地（更新书签）
            patchBookmark(b.id, { favicon: dataUrl });
            success++;
            setProgress(p => (controller.signal.aborted ? p : { ...p, done: p.done + 1, success }));
          } else {
            fail++;
            setProgress(p => (controller.signal.aborted ? p : { ...p, done: p.done + 1, fail }));
          }
        } catch (e) {
          if (controller.signal.aborted) break;
          fail++;
          setProgress(p => (controller.signal.aborted ? p : { ...p, done: p.done + 1, fail }));
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    const aborted = controller.signal.aborted;
    abortControllerRef.current = null;
    setIsBulkFetching(false);

    if (aborted) {
      toast.info(`已取消补图标：已处理 ${success + fail}/${targets.length}`);
    } else {
      toast.success(`批量补图完成：成功 ${success} 个，失败 ${fail} 个`);
    }
  }, [bookmarks, isBulkFetching, patchBookmark]);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="菜单"
          >
            <BarsIcon className="w-5 h-5" />
          </button>
          
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden md:block">
            汐羽梦蝶
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
            {/* 一键补图标（仅补缺失图标） */}
            <button
              onClick={handleBulkFetchMissingIcons}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm transition-colors ${isBulkFetching ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50'}`}
              title={isBulkFetching ? '正在补图标，点击可取消' : '为所有缺失图标的书签补齐图标'}
            >
              {isBulkFetching ? (
                <BanIcon className="w-4 h-4" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isBulkFetching ? `取消补图（${progress.done}/${progress.total}）` : '补图标'}
              </span>
            </button>
            
            {/* 批量操作按钮 */}
            <button
               onClick={onToggleSelectionMode}
               className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm transition-colors ${selectionMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
               title={selectionMode ? "退出批量模式" : "批量管理"}
             >
               <CheckSquareIcon className="w-4 h-4" />
               <span className="hidden sm:inline">{selectionMode ? "完成" : "批量"}</span>
             </button>

            {/* 主题切换按钮 */}
            <button
              onClick={handleThemeToggle}
              className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm transition-[background-color,color] duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="切换主题"
            >
              <MoonIcon className="w-4 h-4" />
              <span className="hidden sm:inline">主题</span>
            </button>

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="hidden lg:flex px-3 py-1.5 rounded-xl items-center gap-1.5 text-sm transition-colors bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="设置"
              >
                <CogIcon className="w-4 h-4" />
                <span className="hidden xl:inline">设置</span>
              </button>
            )}

             {/* Login/User Section */}
             {isAuthenticated ? (
               <div className="flex items-center gap-2">
                 {user?.role === 'admin' && (
                     <Link to="/admin" className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200">
                         后台管理
                     </Link>
                 )}
                 <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                   {user?.username}
                   {isSyncing && (
                     <span className="ml-2 text-xs text-blue-500 animate-pulse">
                        (保存中...)
                     </span>
                   )}
                 </span>
                 <button
                   onClick={() => {
                       logout();
                       toast.success('已退出登录');
                       navigate('/login');
                   }}
                   className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm transition-colors bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                 >
                   退出
                 </button>
               </div>
             ) : (
               <Link
                 to="/login"
                 className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
               >
                 登录
               </Link>
             )}
       </div>
     </div>
   </header>
  );
};

export default Header;

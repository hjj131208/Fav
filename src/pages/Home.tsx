import { useState, useEffect, useMemo, lazy, Suspense, useRef } from "react";
import { useBookmarkContext } from "@/contexts/bookmarkContext";
import { CategorySidebar } from "@/components/CategorySidebar";
import { toast } from "sonner";
import { Bookmark, Category } from "@/types";
import Header from "@/components/Header";
import AddBookmarkModal from "@/components/modals/AddBookmarkModal";
import { useSearchEngines } from "@/hooks/useSearchEngines";
import { useBookmarkSelection } from "@/hooks/useBookmarkSelection";
import { useBookmarkDragDrop } from "@/hooks/useBookmarkDragDrop";
import { BookmarkMainArea } from "@/components/BookmarkMainArea";

// 懒加载非首屏必需组件以降低首屏体积
const CategoryModal = lazy(() => import("@/components/modals/CategoryModal"));
const HelpModal = lazy(() => import("@/components/modals/HelpModal"));
const ExportMenu = lazy(() => import("@/components/ExportMenu"));
const SettingsModal = lazy(() => import("@/components/modals/SettingsModal"));

export default function Home() {
    const ModalSkeleton = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl p-6">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
            </div>
        </div>
    );

    const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false);
    
    const {
        bookmarks,
        categories,
        currentCategory,
        setCurrentCategory,
        addBookmark,
        updateBookmark,
        deleteBookmark,
        addCategory,
        reorderCategories,
        updateCategory,
        updateBookmarkVisit,
        exportData,
        importData,
        toggleBookmarkPin,
        toggleBookmarkFavorite,
        addBookmarks,
        batchDeleteCategories
    } = useBookmarkContext();

    const [isAddBookmarkOpen, setIsAddBookmarkOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const isCompactMode = false;
    const favoriteBookmarks = bookmarks.filter(bookmark => bookmark.isFavorite);
    const [addMode, setAddMode] = useState<'single' | 'batch'>('single');

    // 搜索引擎 Hook
    const { 
        searchEngines, 
        selectedSearchEngine, 
        handleSearchEngineChange, 
        performSearch,
        addSearchEngine,
        removeSearchEngine,
        updateSearchEngine,
        resetSearchEngines
    } = useSearchEngines();

    const [isAddOptionOpen, setIsAddOptionOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const [isSearchEngineOpen, setIsSearchEngineOpen] = useState(false);
    const searchEngineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchEngineRef.current && !searchEngineRef.current.contains(event.target as Node)) {
                setIsSearchEngineOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

     /**
      * @fileoverview Home 页面 - 书签管理主界面与数据编排
      * 
      * 模块作用：
      * - 组合与协调各组件（侧边栏、网格、对话框、导出等），承载交互主流程
      * - 维护页面级状态：选择模式、批量操作、拖拽状态、对话框开关、搜索等
      * - 与 BookmarkContext 交互，完成增删改查、导入导出、批量操作
      */
     const categoryNameById = useMemo(() => {
       const map = new Map<string, string>();
       for (const c of categories) {
         map.set(c.id, (c.name || "").toLowerCase());
       }
       return map;
     }, [categories]);

     const currentBookmarks = useMemo(() => {
       const q = searchQuery.trim().toLowerCase();
       if (!q) return bookmarks;
       return bookmarks.filter(bookmark => {
         const titleMatch = (bookmark.title || '').toLowerCase().includes(q);
         const descMatch = (bookmark.description || '').toLowerCase().includes(q);
         const tagsMatch = (bookmark.tags || []).some(tag => (tag || '').toLowerCase().includes(q));
         const categoryName = categoryNameById.get(bookmark.categoryId) || '';
         const categoryMatch = categoryName.includes(q);
         return titleMatch || descMatch || tagsMatch || categoryMatch;
       });
     }, [bookmarks, categoryNameById, searchQuery]);

    // 批量选择 Hook
    const {
        selectionMode,
        selectedBookmarks,
        allSelected,
        selectBookmark,
        toggleSelectAll,
        handleBatchMove,
        handleBatchDelete,
        handleToggleSelectionMode
    } = useBookmarkSelection(currentBookmarks, targetCategoryId);

    // 拖拽 Hook
    const {
        draggedBookmarkId,
        // setDraggedBookmarkId, // 如需在组件内手动设置可解构
        tempOrder,
        isDraggingFavorite,
        isOverUnfavoriteZone,
        handleFavoriteDragStart,
        handleFavoriteDragEnd,
        handleUnfavoriteZoneDragOver,
        handleUnfavoriteZoneDragLeave,
        handleUnfavoriteZoneDrop
    } = useBookmarkDragDrop();

    // 监听移动端侧边栏收回事件
    useEffect(() => {
        const handleCloseMobileSidebar = () => {
            setIsMobileSidebarOpen(false);
        };

        document.addEventListener("close-mobile-sidebar", handleCloseMobileSidebar);
        return () => {
            document.removeEventListener("close-mobile-sidebar", handleCloseMobileSidebar);
        };
    }, []);

     // 监听滚动位置，更新当前可见分类（加入节流以减少计算频率）
     useEffect(() => {
       // 简易节流：领先+尾随调用，避免高频滚动导致过多计算
       function throttle<T extends (...args: any[]) => void>(fn: T, wait: number) {
         let last = 0;
         let timeout: ReturnType<typeof setTimeout> | null = null;
         return (...args: Parameters<T>) => {
           const now = Date.now();
           const remaining = wait - (now - last);
           if (remaining <= 0) {
             if (timeout) { clearTimeout(timeout); timeout = null; }
             last = now;
             fn(...args);
           } else if (!timeout) {
             timeout = setTimeout(() => {
               last = Date.now();
               timeout = null;
               fn(...args);
             }, remaining);
           }
         };
       }

       const onScroll = throttle(() => {
         const categories = document.querySelectorAll('[id^="category-"]');
         let currentVisibleCategory: string | null = null;

         categories.forEach(category => {
           const rect = (category as HTMLElement).getBoundingClientRect();
           // 检查元素是否在视口中（顶部在视口内）
           if (rect.top >= 0 && rect.top < window.innerHeight / 3) {
             currentVisibleCategory = category.id.replace('category-', '');
           }
         });

         if (currentVisibleCategory && currentVisibleCategory !== currentCategory) {
           setCurrentCategory(currentVisibleCategory);
         }
       }, 120);

       window.addEventListener('scroll', onScroll, { passive: true });
       return () => window.removeEventListener('scroll', onScroll as EventListener);
     }, [currentCategory, setCurrentCategory]);

     const handleAddBookmark = () => {
        setIsAddOptionOpen(true);
    };

    const handleSingleAdd = () => {
        setIsAddOptionOpen(false);
        setEditingBookmark(null);
        setAddMode("single");
        setIsAddBookmarkOpen(true);
    };

    const handleBatchAdd = () => {
        setIsAddOptionOpen(false);
        setEditingBookmark(null);
        setAddMode("batch");
        setIsAddBookmarkOpen(true);
    };

    const handleEditBookmark = (id: string) => {
        const bookmarkToEdit = bookmarks.find(bm => bm.id === id);

        if (bookmarkToEdit) {
            setEditingBookmark(bookmarkToEdit);
            setIsAddBookmarkOpen(true);
        }
    };

    // 页面操作：打开“添加分类”对话框入口函数
    const handleAddCategory = () => {
        setEditingCategory(null);
        setIsAddCategoryOpen(true);
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setIsAddCategoryOpen(true);
    };

    // 初始化与事件绑定：为"帮助"按钮注册/清理事件监听
    useEffect(() => {
        const handleHelpButtonClick = () => {
            setIsHelpOpen(true);
        };

        const helpButton = document.getElementById("show-help-btn");

        if (helpButton) {
            helpButton.addEventListener("click", handleHelpButtonClick);
        }

        return () => {
            if (helpButton) {
                helpButton.removeEventListener("click", handleHelpButtonClick);
            }
        };
    }, []);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setIsHelpOpen(false);
        }
    };

    return (
        <div
            className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden relative">
            {/* 取消收藏拖拽区域 */}
            {isDraggingFavorite && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none"
                >
                    <div 
                        className={`pointer-events-auto w-64 h-32 rounded-2xl border-4 border-dashed transition-all duration-300 flex items-center justify-center ${
                            isOverUnfavoriteZone 
                                ? 'border-red-500 bg-red-100 dark:bg-red-900/50 scale-110' 
                                : 'border-gray-400 bg-white dark:bg-gray-800'
                        }`}
                        onDragOver={handleUnfavoriteZoneDragOver}
                        onDragLeave={handleUnfavoriteZoneDragLeave}
                        onDrop={handleUnfavoriteZoneDrop}
                    >
                        <div className="text-center">
                            <i className={`fa-solid fa-heart-broken text-3xl mb-2 ${
                                isOverUnfavoriteZone ? 'text-red-600' : 'text-gray-500'
                            }`}></i>
                            <p className={`text-sm font-medium ${
                                isOverUnfavoriteZone ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'
                            }`}>
                                拖拽到此处取消收藏
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
             <aside
                 className="border-r border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 hidden md:block transition-all duration-300 ease-in-out w-[200px] shadow-sm rounded-l-lg">
                <CategorySidebar
                    categories={categories}
                    currentCategory={currentCategory}
                    onSelectCategory={setCurrentCategory}
                    onAddCategory={handleAddCategory}
                    onBatchDeleteCategories={batchDeleteCategories}
                    onReorderCategories={reorderCategories}
                    onToggleFavorite={toggleBookmarkFavorite}
                    onEditCategory={handleEditCategory} />
            </aside>
            
            {/* 右侧面板 */}
              <aside className={`fixed top-0 bottom-0 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out w-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden scrollbar-width-none shadow-lg ${isQuickAccessOpen ? 'block z-[9999] shadow-2xl' : 'hidden lg:block z-50'} ${isQuickAccessOpen ? 'left-1/2 transform -translate-x-1/2 lg:right-0 lg:left-auto lg:transform-none lg:border-l lg:border-r-0 lg:border-t-0 lg:border-b-0' : 'lg:right-0 lg:border-l lg:border-r-0 lg:border-t-0 lg:border-b-0'}`}>
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">管理</h3>
                    <div className="space-y-3">
                        {/* 右侧快捷功能卡片 */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <i className="fa-solid fa-plus"></i>
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white">添加新收藏</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">快速添加新的网站到收藏夹</p>
                             <button 
                                 onClick={handleAddBookmark}
                                 className="w-full py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                             >
                                 添加网站
                             </button>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/50 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <i className="fa-solid fa-sync"></i>
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white">数据同步</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">备份和恢复您的收藏数据</p>
                             <div className="flex gap-2">
                                <button 
                                    onClick={() => exportData(() => setIsExportMenuOpen(true))}
                                    className="flex-1 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                    title="导出所有数据"
                                >
                                    <i className="fa-solid fa-download"></i>
                                    <span>导出</span>
                                </button>
                                <label
                                    className="flex-1 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    title="导入数据"
                                >
                                    <i className="fa-solid fa-upload"></i>
                                    <span>导入</span>
                                    <input
                                        type="file"
                                        accept=".html,.json"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                importData(file).then(success => {
                                                    if (success) {
                                                        toast.success('数据导入成功');
                                                    } else {
                                                        toast.error('数据导入失败，请检查文件格式');
                                                    }
                                                });
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                        
                     <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800/50 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
                                    <i className="fa-solid fa-heart"></i>
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white">收藏的网站</h4>
                            </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                                {favoriteBookmarks.length > 0 ? (
                                    (tempOrder.length > 0 ? 
                                        tempOrder.map(id => favoriteBookmarks.find(b => b.id === id)).filter(Boolean) : 
                                        favoriteBookmarks
                                    ).map((bookmark: any) => (
                                        <div 
                                            key={bookmark.id} 
                                            className={`flex flex-col items-center p-2 group cursor-pointer rounded-lg transition-all duration-200 ${
                                                draggedBookmarkId === bookmark.id ? 'opacity-50 scale-110 shadow-lg' : ''
                                            }`}
                                            draggable
                                            onDragStart={() => handleFavoriteDragStart(bookmark.id)}
                                            onDragEnd={handleFavoriteDragEnd}
                                        >
                                               <div 
                                                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 overflow-hidden transition-all duration-300 cursor-pointer"
                                                    onClick={() => {
                                                        updateBookmarkVisit(bookmark.id);
                                                        window.open(bookmark.url, '_blank');
                                                    }}
                                                >
                                                {bookmark.favicon && bookmark.favicon.startsWith('data:') ? (
                                                    <img 
                                                        src={bookmark.favicon} 
                                                        alt={bookmark.title}
                                                        className="w-full h-full object-cover rounded-full"
                                                        onError={(e) => {
                                                            // 图标加载失败时隐藏
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <i className="fa-solid fa-globe text-gray-400 text-sm"></i>
                                                )}
                                            </div>
                                            <span className="text-xs text-center truncate max-w-[60px] group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200">
                                                {bookmark.title}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                                        <i className="fa-solid fa-heart text-2xl mb-2 opacity-30"></i>
                                        <p>暂无收藏的网站</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
            
            <main
                  className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out lg:pr-[280px]`}>
                 
                 <div className={`transition-all duration-300 ${isQuickAccessOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                   <Header
                      isMobileSidebarOpen={isMobileSidebarOpen}
                      setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                       isQuickAccessOpen={isQuickAccessOpen}
                       onToggleQuickAccess={() => setIsQuickAccessOpen(!isQuickAccessOpen)}
                       onOpenSettings={() => setIsSettingsOpen(true)}
                       selectionMode={selectionMode}
                       onToggleSelectionMode={() => handleToggleSelectionMode(!selectionMode)} />
                 </div>
                
                {/* 批量操作工具栏 */}
                {selectionMode && (
                  <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                      <label className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="rounded text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        {allSelected ? "取消全选" : "全选"}
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          ({selectedBookmarks.length}个已选择)
                        </span>
                      </label>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setIsMoveModalOpen(true)}
                          disabled={!selectedBookmarks.length}
                          className="px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          移动所选
                        </button>
                        <button
                          onClick={() => setIsDeleteConfirmOpen(true)}
                          disabled={!selectedBookmarks.length}
                          className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          删除所选
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                 
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-950 hide-scrollbar">
                    
                    <div className="mb-6">
                        <form onSubmit={e => e.preventDefault()} className="flex gap-2">
                            <div
                                className="mx-auto max-w-4xl relative flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 w-full">
                                 <div
                                     className="relative border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 h-full rounded-l-2xl"
                                     ref={searchEngineRef}
                                 >
                                    <button
                                        type="button"
                                        onClick={() => setIsSearchEngineOpen(!isSearchEngineOpen)}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors h-full flex items-center min-w-[100px]"
                                    >
                                        <span className="truncate">
                                            {searchEngines.find(e => e.id === selectedSearchEngine)?.name || 'Google'}
                                        </span>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${isSearchEngineOpen ? 'rotate-180' : ''}`}></i>
                                        </div>
                                    </button>

                                    {/* Custom Dropdown Menu */}
                                    {isSearchEngineOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            {searchEngines.map(engine => (
                                                <button
                                                    key={engine.id}
                                                    type="button"
                                                    onClick={() => {
                                                        handleSearchEngineChange(engine.id);
                                                        setIsSearchEngineOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                                                        ${selectedSearchEngine === engine.id 
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                        }`}
                                                >
                                                    {selectedSearchEngine === engine.id && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute left-2"></span>
                                                    )}
                                                    {engine.name}
                                                </button>
                                            ))}
                                            <div className="my-1 border-t border-gray-100 dark:border-gray-700/50"></div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsSearchEngineOpen(false);
                                                    // Add engine logic could go here or navigate to settings
                                                    setIsSettingsOpen(true);
                                                }}
                                                className="w-full text-left px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                                            >
                                                <i className="fa-solid fa-gear"></i>
                                                管理搜索引擎
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="搜索书签或网络..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            performSearch(searchQuery);
                                        }
                                    }}
                                    className="flex-1 bg-transparent px-4 py-3.5 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none" />
                                <button
                                    onClick={() => performSearch(searchQuery)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 mr-2 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
                                    aria-label="搜索">
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <span className="hidden sm:inline">搜索</span>
                                </button>
                            </div>
                        </form>
                    </div>
                      
                     <div>
                        <BookmarkMainArea
                            currentBookmarks={currentBookmarks}
                            categories={categories}
                            searchQuery={searchQuery}
                            isCompactMode={isCompactMode}
                            selectionMode={selectionMode}
                            selectedBookmarks={selectedBookmarks}
                            currentCategory={currentCategory}
                            onAddBookmark={handleAddBookmark}
                            onEditBookmark={handleEditBookmark}
                            onDeleteBookmark={deleteBookmark}
                            onVisitBookmark={updateBookmarkVisit}
                            onTogglePin={toggleBookmarkPin}
                            onToggleFavorite={toggleBookmarkFavorite}
                            onSelectBookmark={selectBookmark}
                            onFavoriteDragStart={handleFavoriteDragStart}
                            onFavoriteDragEnd={handleFavoriteDragEnd}
                        />
                    </div>
                    {/* Footer moved below cards and centered */}
                    <div className="mt-8 border-t pt-4 text-center text-xs text-gray-600 dark:text-gray-300">
                      <p>© {new Date().getFullYear()} HuangJJ. All rights reserved.</p>
                      <p>All trademarks are the property of their respective owners. This site is for display purposes only.</p>
                    </div>
                </div>
            </main>
            {isMobileSidebarOpen && <>
                
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}></div>
                
                <div
                    className="fixed top-0 left-0 bottom-0 w-[200px] bg-white dark:bg-gray-900 z-50 md:hidden shadow-lg transform transition-all duration-300 ease-in-out mobile-sidebar">
                    <CategorySidebar
                        categories={categories}
                        currentCategory={currentCategory}
                        onSelectCategory={id => {
                            setCurrentCategory(id);
                            setIsMobileSidebarOpen(false);
                        }}
                        onAddCategory={handleAddCategory}
                        onBatchDeleteCategories={batchDeleteCategories}
                        onReorderCategories={reorderCategories}
                        onToggleFavorite={toggleBookmarkFavorite} 
                        onEditCategory={handleEditCategory} />
                </div>
            </>}
            {isAddBookmarkOpen && (
              <AddBookmarkModal
                isOpen={true}
                onClose={() => {
                  setIsAddBookmarkOpen(false);
                  setEditingBookmark(null);
                  setAddMode("single");
                  setNewCategoryId(null);
                }}
                existingBookmarks={bookmarks}
                onSave={data => {
                  if (Array.isArray(data)) {
                    addBookmarks(data);
                  } else if (editingBookmark) {
                    updateBookmark(editingBookmark.id, data);
                    setEditingBookmark(null);
                  } else {
                    addBookmark(data);
                  }
                }}
                mode={addMode}
                categories={categories}
                editingBookmark={editingBookmark || undefined}
                onRequestAddCategory={() => setIsAddCategoryOpen(true)}
                newCategoryId={newCategoryId}
              />
            )}
            
            <div
                className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4 transition-opacity duration-300 ${isAddOptionOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={() => setIsAddOptionOpen(false)}>
                <div
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all duration-300 scale-100"
                    onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">选择添加方式</h3>
                        <p className="text-gray-500 dark:text-gray-400">请选择您要添加收藏的方式</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={handleSingleAdd}
                            className="flex items-center justify-center gap-3 p-5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div
                                className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <i className="fa-solid fa-file-text text-xl"></i>
                            </div>
                            <div className="text-left">
                                <h4 className="font-medium text-gray-900 dark:text-white">单个添加</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">添加一个网站收藏</p>
                            </div>
                        </button>
                        <button
                            onClick={handleBatchAdd}
                            className="flex items-center justify-center gap-3 p-5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div
                                className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                <i className="fa-solid fa-copy text-xl"></i>
                            </div>
                            <div className="text-left">
                                <h4 className="font-medium text-gray-900 dark:text-white">多个添加</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">批量添加多个网站收藏</p>
                            </div>
                        </button>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={() => setIsAddOptionOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">取消
                                                                     </button>
                    </div>
                </div>
            </div>
            {isAddCategoryOpen && (
              <Suspense fallback={ModalSkeleton}>
                <CategoryModal
                  isOpen={true}
                  onClose={() => {
                      setIsAddCategoryOpen(false);
                      setEditingCategory(null);
                  }}
                  onSave={editingCategory ? (name, icon, color) => {
                      if (editingCategory) {
                          updateCategory(editingCategory.id, name, icon, color);
                          setEditingCategory(null);
                      }
                  } : (name, icon, color) => {
                      const created = addCategory(name, icon, color);
                      setNewCategoryId(created.id);
                  }}
                  editingCategory={editingCategory || undefined}
                />
              </Suspense>
            )}
            
            {isMoveModalOpen && <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                <div
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">移动所选网站</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">请选择目标分类，将 {selectedBookmarks.length}个网站移动到:
                                                             </p>
                    <div className="mb-4">
                        <select
                            value={targetCategoryId || ""}
                            onChange={e => setTargetCategoryId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- 选择分类 --</option>
                             {categories.filter(cat => cat.id !== currentCategory).map(category => <option key={category.id} value={category.id}>
                                 {category.name}
                             </option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsMoveModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">取消
                                                                       </button>
                        <button
                            onClick={() => handleBatchMove(() => setIsMoveModalOpen(false))}
                            disabled={!targetCategoryId}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-70">确认移动
                                                                       </button>
                    </div>
                </div>
            </div>}
            
            {isDeleteConfirmOpen && <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                <div
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认删除</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">您确定要删除所选的 {selectedBookmarks.length}个网站收藏吗？此操作无法撤销。
                                                             </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">取消
                                                                       </button>
                        <button
                            onClick={() => handleBatchDelete(() => setIsDeleteConfirmOpen(false))}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">确认删除
                                                                       </button>
                    </div>
                </div>
            </div>}
            
            {isExportMenuOpen && (
              <Suspense fallback={ModalSkeleton}>
                <ExportMenu
                  bookmarks={bookmarks}
                  categories={categories}
                  onClose={() => setIsExportMenuOpen(false)}
                />
              </Suspense>
            )}
            {isHelpOpen && (
              <Suspense fallback={ModalSkeleton}>
                <HelpModal
                  isOpen={true}
                  onClose={() => setIsHelpOpen(false)}
                  onOverlayClick={handleOverlayClick}
                />
              </Suspense>
            )}
            {isSettingsOpen && (
              <Suspense fallback={ModalSkeleton}>
                <SettingsModal
                  isOpen={true}
                  onClose={() => setIsSettingsOpen(false)}
                  searchEngines={searchEngines}
                  onAddSearchEngine={addSearchEngine}
                  onRemoveSearchEngine={removeSearchEngine}
                  onUpdateSearchEngine={updateSearchEngine}
                  onResetSearchEngines={resetSearchEngines}
                />
              </Suspense>
            )}
            {isQuickAccessOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsQuickAccessOpen(false)}
              />
            )}
            <button
              type="button"
              onClick={() => setIsQuickAccessOpen(prev => !prev)}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-50 lg:hidden w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              title={isQuickAccessOpen ? "关闭管理" : "打开管理"}
            >
              <i className={`fa-solid ${isQuickAccessOpen ? "fa-xmark" : "fa-plus"} text-lg`}></i>
            </button>
        </div>
    );
}

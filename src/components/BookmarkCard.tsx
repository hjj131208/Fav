/**
 * @fileoverview BookmarkCard 组件 - 单个书签卡片的显示与交互
 * 
 * 功能模块作用说明：
 * - 渲染单个书签的可视化卡片，支持不同显示模式（紧凑/普通）
 * - 处理书签的多种交互：点击访问、拖拽排序、选择模式、收藏/置顶操作
 * - 管理卡片内容的展开/收起、下拉菜单的显示隐藏
 * 
 * 关键算法逻辑：
 * - 使用 memo 优化性能，避免不必要的重渲染
 * - 通过 useCallback 缓存事件处理函数，减少子组件更新
 * - 动态检测文本内容高度，智能显示展开按钮
 * 
 * 重要变量用途：
 * - isExpanded: 控制描述文本的展开/收起状态
 * - showExpandButton: 检测内容是否需要展开按钮
 * - dropdownOpen: 控制操作下拉菜单的显示状态
 * - isDragging: 拖拽过程中的视觉反馈状态
 * 
 * 特别注意事项：
 * - 拖拽和点击事件需要区分处理，避免拖拽时触发点击
 * - 选择模式下的点击行为与普通模式不同
 * - 图标加载失败时需要显示默认图标
 */
import { useState, useCallback, memo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Bookmark } from "@/types";
import { cn } from "@/lib/utils";
import { useBookmarkContext } from "@/contexts/bookmarkContext";
import NoteModal from "@/components/modals/NoteModal";

interface BookmarkCardProps {
    bookmark: Bookmark;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onVisit: (id: string) => void;
    onTogglePin: (id: string) => void;
    isCompactMode?: boolean;
    isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
  onToggleFavorite?: (id: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// 移除未使用的 handleDelete 函数，该功能已通过 onDelete prop 实现

const BookmarkCard = memo((
    {
        bookmark,
        onEdit,
        onDelete,
        onVisit,
        onTogglePin,
        isCompactMode,
        isSelected,
        onSelect,
        selectionMode,
        onToggleFavorite,
        draggable,
        onDragStart,
        onDragEnd
    }: BookmarkCardProps
) => {
  // 内容展开收起控制状态（已废弃：描述固定两行显示）
  // const [isExpanded, setIsExpanded] = useState(false);
  // const [showExpandButton, setShowExpandButton] = useState(false);
  
  // 下拉菜单控制状态
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // 记事本模态显示状态
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  
  // 拖拽状态控制
  const [isDragging, setIsDragging] = useState(false);
  
  // 受控删除确认模态
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // DOM 引用：用于内容高度检测和点击外部关闭（contentRef 已废弃）
  // const contentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // 图标区域动画控制状态
  const [isIconAnimating, setIsIconAnimating] = useState(false);
  // 会话期间播放动画控制标志
    const [hasPlayedInSession, setHasPlayedInSession] = useState(false);

    /**
     * 图标加载失败处理函数
     * 当网站图标加载失败时，显示默认的地球图标
     */
    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const imgElement = e.target as HTMLImageElement;
        imgElement.src = "";
        imgElement.style.display = "none";

        if (!imgElement.parentElement?.querySelector(".default-favicon")) {
            const defaultIcon = document.createElement("i");
            defaultIcon.className = "fa-solid fa-globe text-blue-600 dark:text-blue-400 text-xl default-favicon";
            imgElement.parentElement?.appendChild(defaultIcon);
        }
    }, []);

    /**
     * 网站打开处理函数
     * 复杂代码段执行流程：
     * 1. 检查并格式化URL（添加协议前缀）
     * 2. 调用访问计数回调
     * 3. 尝试在新窗口打开网站
     * 4. 检测弹窗阻止，提供备选方案（复制到剪贴板）
     */
    const openWebsite = (url: string) => {
        try {
            let formattedUrl = url;

            if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
                formattedUrl = "https://" + formattedUrl;
            }

            onVisit(bookmark.id);
            const newWindow = window.open(formattedUrl, "_blank");

            if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
                toast.error("网站打开失败，可能被浏览器弹窗阻止，请允许弹窗后重试");

                navigator.clipboard.writeText(formattedUrl).then(() => {
                    toast.info("网站链接已复制到剪贴板，您可以手动打开");
                });
            }
        } catch (error) {
            console.error("打开网站失败:", error);
            toast.error("无法打开网站，请检查URL是否正确");
        }
    };

    /**
     * 内容高度检测 Effect（已移除：描述固定两行显示，不再需要动态测量）
     */
    // useEffect(() => {
    //   const checkContentHeight = () => {
    //     if (contentRef.current) {
    //       const { scrollHeight, clientHeight } = contentRef.current;
    //       // 当内容高度超过两行时显示展开按钮
    //       setShowExpandButton(scrollHeight > clientHeight);
    //       // 如果内容不足以展开，重置展开状态
    //       if (scrollHeight <= clientHeight) {
    //         setIsExpanded(false);
    //       }
    //     }
    //   };

    //   // 初始检查
    //   checkContentHeight();
    //   // 监听窗口大小变化，重新检查
    //   window.addEventListener('resize', checkContentHeight);
    //   return () => {
    //     window.removeEventListener('resize', checkContentHeight);
    //   };
    // }, [bookmark.description]);

  /**
   * 点击外部关闭下拉菜单 Effect
   * 监听全局点击事件，当点击下拉菜单外部时自动关闭菜单
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击是否在下拉菜单或触发按钮内部
      if (
        dropdownOpen &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    // 添加事件监听器
    document.addEventListener('mousedown', handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

    // 移除未使用的拖拽处理函数，拖拽逻辑已整合到主组件事件中

    /**
     * 切换内容展开/收起状态（已移除）
     */
    // const toggleExpand = () => {
    //     setIsExpanded(!isExpanded);
    // };

    /**
     * 编辑按钮处理函数
     */
    const handleEdit = () => {
        onEdit(bookmark.id);
    };

    // 书签上下文：用于保存备注
    const { patchBookmark } = useBookmarkContext();

    // 移除未使用的删除处理函数，功能已通过 props 传递

    return (
        <div
            className={cn(
    "group relative bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm transition-all duration-200 theme-transition",
                "border border-gray-100 dark:border-gray-700/50",
                isCompactMode ? "w-20 h-24" : "",
                isSelected ? "ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg dark:shadow-blue-900/20 bg-blue-50/50 dark:bg-blue-900/10" : "",
                bookmark.isFavorite ? "cursor-move" : "cursor-pointer",
                isDragging ? "opacity-50 scale-95" : "",
                "select-none w-full min-w-0"
            )}
            draggable={draggable}
            onDragStart={() => {
                if (draggable && onDragStart) {
                    setIsDragging(true);
                    onDragStart();
                }
            }}
            onDragEnd={() => {
                setIsDragging(false);
                if (onDragEnd) {
                    onDragEnd();
                }
            }}
            onClick={(e) => {
                if (selectionMode && onSelect) {
                    e.stopPropagation();
                    onSelect(bookmark.id, !isSelected);
                    return;
                }
                if (isDragging) return;
                openWebsite(bookmark.url);
            }}
            onMouseEnter={() => {
                // 重置会话动画播放状态，准备新的动画
                setHasPlayedInSession(false);
                if (!isIconAnimating) {
                    setIsIconAnimating(true);
                }
            }}
            onMouseLeave={() => {
                // 停止图标动画，重置动画播放状态
                setIsIconAnimating(false);
                setHasPlayedInSession(false);
            }}
        >
            {/* 右下角下载图标（条件显示，悬停显示） */}
            {bookmark.showDownload && bookmark.downloadUrl && (
              <a
                href={bookmark.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-2 right-2 z-20 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200"
                title="下载"
                aria-label="下载"
              >
                <i className="fa-solid fa-download"></i>
              </a>
            )}
            {/* 右上角倒三角图标 - 可点击展开下拉菜单 */}
             <div 
                ref={triggerRef}
                className="absolute top-1 right-2 text-gray-400 dark:text-gray-500 transition-all duration-300 group-hover:text-gray-600 dark:group-hover:text-gray-300 cursor-pointer z-20 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                aria-label={dropdownOpen ? "关闭菜单" : "打开菜单"}
            >
                 <i className={`fa-solid fa-caret-down transition-transform duration-300 ${dropdownOpen ? 'rotate-90' : ''}`}></i>
            </div>
            
            {/* 下拉菜单 */}
             {dropdownOpen && (
                  <div ref={dropdownRef} className="absolute top-7 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1 z-50 border border-gray-200 dark:border-gray-700 w-auto max-w-xs overflow-x-hidden overflow-y-auto max-h-[60vh] animate-in fade-in-50 zoom-in-95 duration-150 transform translate-y-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    <button
                        className={`w-full text-left px-3 py-1.5 rounded-md transition-colors text-sm flex items-center ${bookmark.isPinned ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800/50" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("Toggling pin for bookmark:", bookmark.id, "Current state:", bookmark.isPinned);
                            setDropdownOpen(false);
                            setTimeout(() => {
                                onTogglePin(bookmark.id);
                            }, 100);
                        }}
                    >
                        <i className={`fa-solid ${bookmark.isPinned ? "fa-thumbtack rotate-45 mr-2" : "fa-thumbtack mr-2"}`}></i>
                        {bookmark.isPinned ? "取消置顶" : "置顶"}
                    </button>
                    <button
                        className={`w-full text-left px-3 py-1.5 rounded-md transition-colors text-sm flex items-center ${bookmark.isFavorite ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(false);
                            setTimeout(() => {
                                onToggleFavorite?.(bookmark.id);
                            }, 100);
                        }}
                    >
                        <i className={`fa-solid ${bookmark.isFavorite ? "fa-heart mr-2" : "fa-heart mr-2"}`}></i>
                        {bookmark.isFavorite ? "取消收藏" : "收藏"}
                    </button>
                    {/* 记事本功能入口：位于“收藏”下方 */}
                    <button
                        className="w-full text-left px-3 py-1.5 rounded-md transition-colors text-sm flex items-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(false);
                          setTimeout(() => {
                            setIsNoteOpen(true);
                          }, 100);
                        }}
                    >
                        <i className="fa-solid fa-note-sticky mr-2"></i>
                        记事本
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 rounded-md transition-colors text-sm flex items-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEdit();
                            setDropdownOpen(false);
                        }}
                    >
                        <i className="fa-solid fa-pen mr-2"></i>
                        编辑
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 rounded-md transition-colors text-sm flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(false);
                            // 使用受控模态进行确认，避免未确认即删除
                            setTimeout(() => {
                                setIsDeleteConfirmOpen(true);
                            }, 100);
                        }}
                    >
                        <i className="fa-solid fa-trash mr-2"></i>
                        删除
                    </button>
                </div>
            )}

            {selectionMode && <div className="absolute top-2 left-2 z-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={e => {
                        e.stopPropagation();

                        if (onSelect) {
                            onSelect(bookmark.id, e.target.checked);
                        }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
            </div>}
            {isCompactMode ? <div className="flex flex-col items-center p-1 w-full h-full">
                <button
                    onClick={(e) => {
                        if (selectionMode && onSelect) {
                            e.stopPropagation();
                            onSelect(bookmark.id, !isSelected);
                            return;
                        }
                        if (isDragging) return;
                        openWebsite(bookmark.url);
                    }}
                    className="w-full aspect-square rounded-lg flex items-center justify-center overflow-hidden mb-1"
                    aria-label={`访问 ${bookmark.title}`}>
                    {bookmark.favicon && typeof bookmark.favicon === 'string' && bookmark.favicon.startsWith('data:') ? (
                      <img 
                        src={bookmark.favicon} 
                        alt={bookmark.title}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          // 图标加载失败时隐藏
                          e.currentTarget.style.display = 'none';
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    )}
                </button>
                <div className="w-full flex justify-center mt-1">
                    <p
                        className="text-[9px] font-medium text-gray-900 dark:text-white whitespace-nowrap">{bookmark.title}</p>
                </div>
            </div> : <>
                <div
                    className="flex items-center justify-between mb-2"
                    style={{
                        margin: "0px"
                    }}>
                    <div className="flex items-start gap-3 flex-1 transform max-[400px]:scale-110 max-[400px]:origin-left">
                        <div className="flex flex-col items-center">
                            <div
                                onClick={(e) => {
                                    if (selectionMode && onSelect) {
                                        e.stopPropagation();
                                        onSelect(bookmark.id, !isSelected);
                                        return;
                                    }
                                    if (isDragging) return;
                                    openWebsite(bookmark.url);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWebsite(bookmark.url); } }}
                                className={cn(
                                  "w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer select-none transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500 origin-bottom"
                                )}
                                aria-label={`访问 ${bookmark.title}`}
                                title={`访问 ${bookmark.title}`}
                            >
                                {bookmark.favicon && typeof bookmark.favicon === 'string' && bookmark.favicon.startsWith('data:') ? (
                                  <img
                                    src={bookmark.favicon}
                                    alt="Favicon"
                                    className={cn("w-full h-full rounded-lg object-cover", isIconAnimating && !hasPlayedInSession && "animate-press-pop")}
                                    onAnimationEnd={() => { setIsIconAnimating(false); setHasPlayedInSession(true); }}
                                    onError={handleImageError}
                                    loading="lazy" 
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                )}
                            </div>
                            
                            {bookmark.visitCount !== undefined && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                                <i className="fa-solid fa-eye mr-1"></i>{bookmark.visitCount}次
                            </p>}
                        </div>
                        <div className="flex flex-col justify-center gap-1 flex-1 min-w-0 overflow-hidden">
                        <h3 className={`font-semibold text-gray-900 dark:text-white transition-all duration-300 overflow-hidden line-clamp-1`}>{bookmark.title}</h3>
                        {bookmark.description && (
                            <div className="relative">
                                <p 
                                    className={"text-sm text-gray-600 dark:text-gray-300 transition-all duration-300 overflow-hidden line-clamp-2"}
                                    style={{ lineHeight: 1.5 }}
                                >
                                    {bookmark.description}
                                </p>
                            </div>
                        )}
                        </div>
                    </div>
                    {/* 批量选择模式不显示独立按钮，已整合到下拉菜单中 */}
                </div>
            </>}

            {/* 删除确认模态（受控） */}
            {isDeleteConfirmOpen && (
              <div 
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                <div 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认删除</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">您确定要删除该网站收藏吗？此操作无法撤销。</p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsDeleteConfirmOpen(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >取消</button>
                    <button
                      onClick={() => {
                        onDelete(bookmark.id);
                        toast.success('已删除');
                        setIsDeleteConfirmOpen(false);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >确认删除</button>
                  </div>
                </div>
              </div>
            )}

            {/* 记事本模态 */}
            <NoteModal
              isOpen={isNoteOpen}
              initialText={bookmark.notes || ""}
              onSave={(text) => {
                patchBookmark(bookmark.id, { notes: text });
                toast.success("已保存备注");
                setIsNoteOpen(false);
              }}
              onClose={() => setIsNoteOpen(false)}
            />
        </div>
    );
});

export default BookmarkCard;

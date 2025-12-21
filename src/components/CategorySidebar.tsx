import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Category } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBookmarkContext } from "@/contexts/bookmarkContext";
import { createPortal } from "react-dom";

interface CategorySidebarProps {
    categories: Category[];
    currentCategory: string | null;
    onSelectCategory: (categoryId: string) => void;
    onAddCategory: () => void;
    onBatchDeleteCategories: (ids: string[]) => void;
    onToggleFavorite?: (bookmarkId: string) => void;
    onEditCategory?: (category: Category) => void;
}

export const CategorySidebar = memo(function CategorySidebar(
    {
        categories,
        currentCategory,
        onSelectCategory,
        onAddCategory,
        onBatchDeleteCategories,
        onReorderCategories,
        onToggleFavorite,
        onEditCategory
    }: CategorySidebarProps & {
        onReorderCategories: (categories: Category[]) => Category[];
    }
) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDeleteModeActive] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
    const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
    const [isDragOverSidebar, setIsDragOverSidebar] = useState(false);
    const [isCategoryDeleteConfirmOpen, setIsCategoryDeleteConfirmOpen] = useState(false);
    const dragCounter = useRef(0);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        categoryId: string | null;
    }>({ visible: false, x: 0, y: 0, categoryId: null });

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [contextMenu]);

    const handleContextMenu = (e: React.MouseEvent, categoryId: string) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            categoryId
        });
    };

    /**
     * @fileoverview CategorySidebar 组件 - 分类侧边栏与交互枢纽
     * 
     * 模块作用：
     * - 展示所有分类，支持选择、批量选择与删除
     * - 支持分类的拖拽重排，并提供视觉反馈
     * - 接收书签拖拽至侧边栏以执行“取消收藏”操作
     * - 点击分类时滚动并定位到主区域对应分类段落
     * 
     * 关键逻辑：
     * - 拖拽排序：通过 dragstart/dragover 计算目标索引并重排，拖拽中暂时禁用 pointer-events 以避免抖动
     * - 滚动定位：使用 scrollIntoView 定位到分类标题，随后进行二次偏移避免顶部遮挡
     * - 批量操作：维护 selectedCategories 列表，全选/反选与批量删除
     * - 取消收藏：解析 drag 数据，仅在 type=bookmark 时调用 onToggleFavorite
     * 
     * 重要状态：
     * - isDeleteModeActive：删除模式开关
     * - selectedCategories：被选中的分类ID集合
     * - isAllSelected：全选标记
     * - draggedCategoryId/hoveredCategoryId：拖拽中的分类与悬停目标
     * - isDragOverSidebar：是否正在将书签拖入侧边栏
     * 
     * 注意事项：
     * - 使用 dragCounter 解决 dragenter/dragleave 嵌套触发导致状态抖动的问题
     * - 解析 DataTransfer 时需 try/catch，兼容不同来源的数据格式
     * - 拖拽重排时临时禁用 pointer-events，结束后恢复
     */
    const { /* 预留：如需从上下文获取全局操作或状态，可在此处按需解构 */ } = useBookmarkContext();
    // 说明：此前曾解构未使用的上下文值，已移除；保留此注释指引后续扩展

    const handleCategoryClick = (categoryId: string) => {
        // 先更新当前分类高亮
        onSelectCategory(categoryId);

        // 立即尝试定位到对应分类锚点
        const targetId = `category-${categoryId}`;
        const categorySection = document.getElementById(targetId);

        if (categorySection) {
            const categoryTitle = categorySection.querySelector("h3");
            const scrollTarget = categoryTitle || categorySection;
            // 使用 start 避免顶部遮挡，配合锚点的 scroll-margin
            scrollTarget.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        } else {
            // 搜索或过滤可能导致锚点不存在，回退到页面顶部
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };



    const handleDragStart = (e: React.DragEvent, categoryId: string) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", categoryId);
        setDraggedCategoryId(categoryId);
        dragCounter.current = 0;
    };

    const handleReorder = useCallback((newCategories: Category[]) => {
        onReorderCategories(newCategories);
    }, [onReorderCategories]);

    const handleDragOver = (e: React.DragEvent, categoryId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        if (draggedCategoryId === categoryId)
            return;

        setHoveredCategoryId(categoryId);
        const draggedIndex = categories.findIndex(cat => cat.id === draggedCategoryId);
        const hoverIndex = categories.findIndex(cat => cat.id === categoryId);
        
        if (draggedIndex !== -1 && hoverIndex !== -1) {
            const newCategories = [...categories];
            const [removed] = newCategories.splice(draggedIndex, 1);
            newCategories.splice(hoverIndex, 0, removed);
            
            // 拖拽过程中暂时禁用滚动事件
            const container = scrollContainerRef.current;
            if (container) {
                container.style.pointerEvents = 'none';
            }
            
            handleReorder(newCategories);
            
            // 恢复滚动事件
            setTimeout(() => {
                if (container) {
                    container.style.pointerEvents = 'auto';
                }
            }, 300);
        }
    };

    const handleDragEnd = () => {
        setDraggedCategoryId(null);
        setHoveredCategoryId(null);
        dragCounter.current = 0;
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current++;
        
        // 检查拖拽类型，只有拖拽收藏书签时才显示取消收藏提示
        const types = Array.from(e.dataTransfer.types);
        if (types.includes('text/plain')) {
            try {
                // 尝试获取拖拽数据来判断是否为收藏书签
                const dragData = e.dataTransfer.getData('text/plain');
                if (dragData) {
                    const data = JSON.parse(dragData);
                    if (data.type === 'bookmark' && data.id) {
                        setIsDragOverSidebar(true);
                    }
                }
            } catch (error) {
                // 如果无法获取或解析数据，可能是分类拖拽，不显示取消收藏提示
                console.warn('Cannot parse drag data in dragenter:', error);
            }
        }
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current--;
        
        if (dragCounter.current === 0) {
            setIsDragOverSidebar(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setHoveredCategoryId(null);
        setIsDragOverSidebar(false);
        dragCounter.current = 0;
        
        try {
            const dragData = e.dataTransfer.getData('text/plain');
            const data = JSON.parse(dragData);
            
            // 只有拖拽收藏书签到侧边栏时才执行取消收藏操作
            if (data.type === 'bookmark' && data.id && onToggleFavorite) {
                // 处理书签拖拽 - 取消收藏
                onToggleFavorite(data.id);
                toast.success('已取消收藏');
            } else if (data.type === 'category') {
                // 处理分类拖拽 - 原有逻辑
                // 这里可以保留原有的分类重排序逻辑
            }
        } catch (error) {
            // 如果解析失败，可能是其他类型的拖拽数据，忽略
            console.warn('Failed to parse drag data:', error);
        }
    };

    const handleCategorySelect = (e: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
        const category = categories.find(cat => cat.id === categoryId);

        if (!category)
            return;

        if (e.target.checked) {
            setSelectedCategories(prev => [...prev, categoryId]);
        } else {
            setSelectedCategories(prev => prev.filter(id => id !== categoryId));
        }
    };

    const handleConfirmBatchDelete = () => {
        if (selectedCategories.length === 0) {
            setIsCategoryDeleteConfirmOpen(false);
            return;
        }
        onBatchDeleteCategories(selectedCategories);
        const count = selectedCategories.length;
        setSelectedCategories([]);
        setIsCategoryDeleteConfirmOpen(false);
        toast.success(`成功删除${count}个分类`);
        // 与现有行为保持一致：删除后刷新，确保视图与状态一致
        window.location.reload();
    };

    return (
        <div
            className={cn(
                "w-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col transition-transform duration-300 ease-in-out transform translate-x-0 scale-100 will-change: transform",
                isDragOverSidebar ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600" : ""
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}>
            {}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden scrollbar-width-none relative"
                style={{
                    padding: "0px",
                    scrollBehavior: "smooth"
                }}>
                {}
                <div
                    className="w-full px-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-50 shadow-lg flex items-center justify-center h-14 sm:h-16 relative">
                    {/* 移动端菜单按钮（与主 Header 一致） */}
                    <button 
                        className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 absolute left-2"
                        title="收回侧边栏"
                        aria-label="收回侧边栏"
                        onClick={() => {
                            // 触发全局事件，通知 Home 页面关闭移动端侧边栏
                            const evt = new Event("close-mobile-sidebar");
                            document.dispatchEvent(evt);
                        }}
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    <h2
                        className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">汐羽梦蝶
                                                              </h2>
                </div>
                {}
                 <div
                     className="scroll-content px-2 pb-24"
                     style={{
                         padding: "8px"
                     }}>
                     {isDragOverSidebar && (
                         <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                             <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                                 <i className="fa-solid fa-heart-broken mr-2"></i>
                                 拖拽到此处取消收藏
                             </div>
                         </div>
                     )}
                    {categories.length > 0 ? <div>
                        {}
                        {}
                        
                        {}
                        <ul className="space-y-1">
                            {}
                            {categories.map(category => <li
                                key={category.id}
                                className={`group transition-opacity duration-300 ${draggedCategoryId === category.id ? "opacity-50" : ""}`}>
                                 <div
                                    onClick={() => handleCategoryClick(category.id)}
                                    onContextMenu={e => handleContextMenu(e, category.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 cursor-pointer group",
                                        currentCategory === category.id 
                                            ? "bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700" 
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                                        draggedCategoryId && hoveredCategoryId === category.id 
                                            ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-105 shadow-md" 
                                            : "border border-transparent",
                                        "cursor-move relative"
                                    )}
                                    draggable
                                    onDragStart={e => handleDragStart(e, category.id)}
                                    onDragOver={e => handleDragOver(e, category.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragEnter={handleDragEnter}
                                    onDrop={handleDrop}>
                                    {}
                                    {isDeleteModeActive && <input
                                        onClick={e => e.stopPropagation()}
                                        type="checkbox"
                                        checked={selectedCategories.includes(category.id)}
                                        onChange={e => handleCategorySelect(e, category.id)}
                                        className="absolute top-2 left-2 rounded text-blue-600 focus:ring-blue-500" />}
                                    <div
                                        className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200",
                                            currentCategory === category.id 
                                                ? (category.color ? `bg-[${category.color}]/10 text-[${category.color}]` : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-white dark:group-hover:bg-gray-700"
                                        )}>
                                        {category.icon ? <i
                                            className={`fa-solid ${category.icon}`}
                                            style={{
                                                color: category.color
                                            }}></i> : <i
                                            className="fa-solid fa-folder"
                                            style={{
                                                color: category.color
                                            }}></i>}
                                    </div>
                                    <span className={cn(
                                        "block truncate text-sm font-medium transition-colors duration-200",
                                        currentCategory === category.id 
                                            ? "text-gray-900 dark:text-white" 
                                            : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
                                    )}>{category.name}</span>
                                    
                                    {/* Active Indicator */}
                                    {currentCategory === category.id && (
                                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    )}
                                </div>
                            </li>)}
                        </ul>
                    </div> : <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        <i className="fa-solid fa-folder-open text-4xl mb-2"></i>
                        <p>暂无分类，请添加分类</p>
                    </div>}
                </div>
            </div>
            {}
            <div
                className="w-full p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 sticky bottom-0 bg-white dark:bg-gray-900 z-10 shadow-lg">
                {}
                <div className="px-4 py-2">
                    <button
                        onClick={onAddCategory}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white"
                        title="添加分类">
                        <i className="fa-solid fa-plus"></i>
                        <span>添加分类</span>
                    </button>
                </div>
                {}
            </div>

            {/* 批量删除分类 - 确认模态 */}
            {isCategoryDeleteConfirmOpen && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认删除</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            您确定要删除所选的 {selectedCategories.length} 个分类吗？此操作将同时删除这些分类下的所有收藏，且无法恢复。
                        </p>
                        <div className="max-h-40 overflow-auto text-sm text-gray-600 dark:text-gray-300 mb-6">
                            {categories.filter(cat => selectedCategories.includes(cat.id)).map(cat => (
                                <div key={cat.id}>• {cat.name}</div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsCategoryDeleteConfirmOpen(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                取消
                            </button>
                            <button
                                onClick={handleConfirmBatchDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 右键菜单 */}
            {contextMenu.visible && createPortal(
                <div
                    className="fixed z-[10001] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        onClick={() => {
                            setContextMenu({ ...contextMenu, visible: false });
                            const category = categories.find(c => c.id === contextMenu.categoryId);
                            if (category && onEditCategory) {
                                onEditCategory(category);
                            }
                        }}
                    >
                        <i className="fa-solid fa-pen text-blue-500 w-4"></i>
                        编辑分类
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                    <button
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                        onClick={() => {
                            setContextMenu({ ...contextMenu, visible: false });
                            if (contextMenu.categoryId) {
                                setSelectedCategories([contextMenu.categoryId]);
                                setIsCategoryDeleteConfirmOpen(true);
                            }
                        }}
                    >
                        <i className="fa-solid fa-trash w-4"></i>
                        删除分类
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
});

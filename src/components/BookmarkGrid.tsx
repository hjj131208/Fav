import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import BookmarkCard from './BookmarkCard';
import { Bookmark, Category } from '@/types';
import { useBookmarkContext } from '@/contexts/bookmarkContext';

/*
模块：BookmarkGrid（书签网格）
作用：
- 将传入的书签按分类分组并以响应式网格方式渲染
- 支持分类折叠/展开、置顶优先、按访问次数排序
- 在窗口尺寸变化时动态调整每行展示数量，兼顾侧边栏占用空间
关键逻辑：
- calculateItemsPerRow：根据窗口宽度与侧边栏估算宽度，计算每行卡片数
- expandedCategories：记录分类展开状态，默认优先展开“当前分类”
- getDisplayedBookmarks：置顶项优先，折叠时严格限制为“两行展示”（置顶优先填充）
重要状态：
- itemsPerRow：当前每行显示的卡片数量
- expandedCategories：分类ID到展开布尔值的映射
注意事项：
- 涉及 DOM 的滚动/高亮反馈通过 ref 获取元素，并在状态更新后使用 setTimeout 进行微调
- 仅进行注释与说明优化，不改变运行逻辑
*/
// 计算每行可显示的项目数量（基于网格布局）
const calculateItemsPerRow = () => {
  // 使用更可靠的计算方式，考虑侧边栏占用空间
  const containerWidth = window.innerWidth;
  let availableWidth = containerWidth;
  
  // 考虑侧边栏占用的空间
  // 中等屏幕以上显示分类栏(约200px)，大屏幕显示快速访问栏(280px)
  if (containerWidth >= 1024) {
    // 大屏幕：减去分类栏和快速访问栏宽度
    availableWidth = containerWidth - 480; // 200 + 280
  } else if (containerWidth >= 768) {
    // 中等屏幕：减去分类栏宽度
    availableWidth = containerWidth - 200;
  }
  
  // 根据可用宽度确定每行显示的项目数量
  if (availableWidth < 480) {
    return 2; // 超小屏每行2个，提高信息密度
  } else if (availableWidth < 640) {
    return 2; // 移动端每行2个
  } else if (availableWidth < 768) {
    return 3; // 平板小屏每行3个
  } else if (availableWidth < 1024) {
    return 4; // 中等屏幕每行4个
  } else {
    return 5; // 大屏幕每行5个
  }
};

interface BookmarkGridProps {
  bookmarks: (Bookmark & { categoryName?: string })[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisit: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isCompactMode?: boolean;
  selectionMode?: boolean;
  selectedBookmarks?: string[];
  onSelectBookmark?: (id: string, selected: boolean) => void;
  // 当前选中分类ID（用于初次渲染时默认展开该分类）
  currentCategoryId?: string;
  categories: Category[];
  onFavoriteDragStart?: (id: string) => void;
  onFavoriteDragEnd?: () => void;
}

// 获取对应的网格列数类名
 const getGridColsClass = (itemsPerRow: number): string => {
   switch (itemsPerRow) {
     case 1:
       return 'grid-cols-1';
     case 2:
       return 'grid-cols-2';
     case 3:
       return 'grid-cols-3';
     case 4:
       return 'grid-cols-4';
     case 5:
       return 'grid-cols-5';
     default:
       return 'grid-cols-4';
   }
 };

const BookmarkGrid: React.FC<BookmarkGridProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onVisit,
  onTogglePin,
  isCompactMode,
  selectionMode = false,
  selectedBookmarks = [],
  onSelectBookmark,
  // 当前选中分类ID，用于默认展开对应分类
  currentCategoryId,
  categories,
  onFavoriteDragStart,
  onFavoriteDragEnd
}) => {
  const { toggleBookmarkFavorite } = useBookmarkContext();
  // 响应式网格列数；监听窗口变化动态更新
  const [itemsPerRow, setItemsPerRow] = useState(calculateItemsPerRow());
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // 按分类对书签进行分组（缓存以减少重复计算）
  const bookmarksByCategory = useMemo(() => {
    return bookmarks.reduce((groups, bookmark) => {
      const categoryId = bookmark.categoryId;
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(bookmark);
      return groups;
    }, {} as Record<string, Bookmark[]>);
  }, [bookmarks]);
  
  // 获取所有分类ID（缓存，保持与 categories 顺序一致）
  const categoryIds = useMemo(() => categories.map(category => category.id), [categories]);

  // 已选书签集合（Set 查找更快，避免多次 includes）
  const selectedSet = useMemo(() => new Set(selectedBookmarks), [selectedBookmarks]);
  
  // 初始化展开状态 - 默认展开当前选中分类
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    
    // 初始化所有分类的展开状态
    categoryIds.forEach(id => {
      // 首次加载时默认展开当前选中分类或第一个分类
      if (Object.keys(expandedCategories).length === 0) {
        initialExpanded[id] = id === currentCategoryId || (categoryIds.length > 0 && categoryIds[0] === id);
      } else if (expandedCategories[id] === undefined) {
        // 对新增分类设置默认展开状态
        initialExpanded[id] = true;
      }
    });
    
    // 只有当有初始值需要设置时才更新状态
    if (Object.keys(initialExpanded).length > 0) {
      setExpandedCategories(prev => ({...prev, ...initialExpanded}));
    }
  }, [categoryIds, currentCategoryId, expandedCategories]);
  
  // 监听窗口大小变化，更新每行项目数量
  useEffect(() => {
    const handleResize = () => {
      setItemsPerRow(calculateItemsPerRow());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 代码整洁性：移除冗余占位注释
  
  // 说明：此前存在冗余的工具函数，已移除以保持组件精简与可维护性
  // 切换分类展开/折叠状态
  const toggleCategoryExpand = (categoryId: string) => {
    // 先获取当前状态
    const currentState = expandedCategories[categoryId];
    
    // 更新展开状态
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !currentState
    }));
    
    // 滚动到分类顶部并添加视觉反馈
    setTimeout(() => {
      if (categoryRefs.current[categoryId]) {
        const element = categoryRefs.current[categoryId];
        
        // 添加视觉反馈
      element?.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        element?.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
      }, 300);
      }
    }, 10); // 等待状态更新后再操作DOM
  };
  
  // 判断分类是否需要显示折叠按钮（超过5个项目）
  const needsCollapse = (categoryId: string) => {
    const categoryBookmarks = bookmarksByCategory[categoryId] || [];
    // 当分类中书签数量超过5个时需要折叠功能
    return categoryBookmarks.length > 5;
  };
  
  // 获取要显示的书签（根据展开状态与两行限制）
  const getDisplayedBookmarks = (categoryId: string) => {
  const categoryBookmarks = bookmarksByCategory[categoryId] || [];
  
  // 先按置顶状态排序，再按访问次数排序
  const sortedBookmarks = [...categoryBookmarks].sort((a, b) => {
    // 置顶项排在前面
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // 然后按访问次数排序
    return (b.visitCount || 0) - (a.visitCount || 0);
  });
  
  // 根据展开状态控制显示数量
  if (expandedCategories[categoryId] || !needsCollapse(categoryId)) {
    return sortedBookmarks;
  }
  // 默认只显示前5个非置顶项 + 所有置顶项
  const pinnedItems = sortedBookmarks.filter(bookmark => bookmark.isPinned);
  const nonPinnedItems = sortedBookmarks.filter(bookmark => !bookmark.isPinned);
  
// 严格限制为两行显示
const maxItemsForTwoRows = itemsPerRow * 2;

// 确保不超过总数量
const remainingSlots = Math.max(0, maxItemsForTwoRows - pinnedItems.length);

// 如果置顶项已经超过两行，则只显示两行置顶项
if (pinnedItems.length > maxItemsForTwoRows) {
  return pinnedItems.slice(0, maxItemsForTwoRows);
}
  return [...pinnedItems, ...nonPinnedItems.slice(0, remainingSlots)];
};

  // 批量选择：全选/取消全选某个分类内的所有书签
  const handleCategorySelectAll = (categoryId: string, checked: boolean) => {
    const categoryBookmarks = bookmarksByCategory[categoryId] || [];

    categoryBookmarks.forEach(b => {
      const isSelected = selectedSet.has(b.id);
      if (checked && !isSelected) {
        onSelectBookmark?.(b.id, true);
      } else if (!checked && isSelected) {
        onSelectBookmark?.(b.id, false);
      }
    });
  };
  
  return (
    <>
      {categoryIds.map(categoryId => {
        const categoryBookmarks = bookmarksByCategory[categoryId] || [];
        const displayedBookmarks = getDisplayedBookmarks(categoryId);
        const categoryName = categories.find(c => c.id === categoryId)?.name || "未分类";
        // 统计当前分类的选择数量与是否全选
        const selectedCount = categoryBookmarks.filter(b => selectedSet.has(b.id)).length;
        const isCategoryAllSelected = categoryBookmarks.length > 0 && selectedCount === categoryBookmarks.length;
        if (displayedBookmarks.length === 0) return null;
        
         return (
                    <div 
                        key={categoryId}
                        id={`category-${categoryId}`}
                        ref={el => categoryRefs.current[categoryId] = el}
                        style={{ scrollMarginTop: '80px' }}
                        className="mb-8 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 transition-all duration-300"
          >
               <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {categoryName}
                {categoryBookmarks.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({categoryBookmarks.length})</span>
                )}
              </h3>
               
               <div className="flex items-center gap-3">
                 {selectionMode && (
                   <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                     <input
                       type="checkbox"
                       checked={isCategoryAllSelected}
                       onChange={(e) => {
                         e.stopPropagation();
                         handleCategorySelectAll(categoryId, e.target.checked);
                       }}
                       className="rounded text-blue-600 focus:ring-blue-500"
                     />
                     <span>全选本分类</span>
                     <span className="text-xs text-gray-500 dark:text-gray-400">({selectedCount}/{categoryBookmarks.length})</span>
                   </label>
                 )}
                 {needsCollapse(categoryId) && (
                    <button
                     onClick={(e) => {
                       e.stopPropagation();
                       toggleCategoryExpand(categoryId);
                     }}

                               className={`flex items-center justify-center p-1.5 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-0 outline-none ${
                                   expandedCategories[categoryId]
                                     ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" 
                                     : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                               }`}
                     title={expandedCategories[categoryId] ? "收起列表" : "展开查看全部"}
                     aria-label={expandedCategories[categoryId] ? "收起项目列表" : "展开查看全部项目"}
                   >
                      <span className="mr-1 text-sm">{expandedCategories[categoryId] ? '收起' : '展开'}</span>
                      {expandedCategories[categoryId] 
                        ? <ChevronUpIcon className="w-4 h-4 transition-transform duration-300" />
                        : <ChevronDownIcon className="w-4 h-4 transition-transform duration-300" />}
                   </button>
                 )}
               </div>
            </div>
             
                    <div 
style={{ 
  maxHeight: expandedCategories[categoryId] 
    ? `${displayedBookmarks.length * (isCompactMode ? 120 : 180)}px` 
    : isCompactMode 
      ? '160px' 
      : '360px' // 固定两行高度（每行约180px）
}}>
                  <div className={cn(
                     isCompactMode 
                       ? "flex flex-wrap justify-center gap-x-2.5 gap-y-4" 
                       : `grid gap-3 sm:gap-4 ${getGridColsClass(itemsPerRow)} auto-cols-fr` // 小屏更紧凑
                  )}>
                 {displayedBookmarks.map(bookmark => (
                   <BookmarkCard 
                     key={bookmark.id}
                     bookmark={bookmark}
                     onEdit={onEdit}
                     onDelete={onDelete}
                     onVisit={onVisit}
                     onTogglePin={onTogglePin}
                      isCompactMode={isCompactMode}
                     isSelected={selectedSet.has(bookmark.id)}
                     onSelect={onSelectBookmark}
                     selectionMode={selectionMode}
                     onToggleFavorite={toggleBookmarkFavorite}
                     draggable={bookmark.isFavorite}
                     onDragStart={bookmark.isFavorite ? () => onFavoriteDragStart?.(bookmark.id) : undefined}
                     onDragEnd={bookmark.isFavorite ? onFavoriteDragEnd : undefined}
                   />
                 ))}
               </div>
             </div>
            

          </div>
        );
      })}
    </>
  );
}

export default BookmarkGrid;

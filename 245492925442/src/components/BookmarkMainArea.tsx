import React from 'react';
import BookmarkGrid from "@/components/BookmarkGrid";
import { Empty } from "@/components/common/Empty";
import { Bookmark, Category } from "@/types";

interface BookmarkMainAreaProps {
    currentBookmarks: Bookmark[];
    categories: Category[];
    searchQuery: string;
    isCompactMode: boolean;
    selectionMode: boolean;
    selectedBookmarks: string[];
    currentCategory: string | null;
    
    // Actions
    onAddBookmark: () => void;
    onEditBookmark: (id: string) => void;
    onDeleteBookmark: (id: string) => void;
    onVisitBookmark: (id: string) => void;
    onTogglePin: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onSelectBookmark: (id: string, selected: boolean) => void;
    
    // Drag & Drop
    onFavoriteDragStart: (id: string) => void;
    onFavoriteDragEnd: () => void;
}

export const BookmarkMainArea: React.FC<BookmarkMainAreaProps> = ({
    currentBookmarks,
    categories,
    searchQuery,
    isCompactMode,
    selectionMode,
    selectedBookmarks,
    currentCategory,
    onAddBookmark,
    onEditBookmark,
    onDeleteBookmark,
    onVisitBookmark,
    onTogglePin,
    onToggleFavorite,
    onSelectBookmark,
    onFavoriteDragStart,
    onFavoriteDragEnd
}) => {
    // 优化：使用 useMemo 缓存处理后的书签数据，避免每次渲染都创建新对象
    // 这将允许 BookmarkGrid 的 memo 生效，减少不必要的重渲染
    const processedBookmarks = React.useMemo(() => {
        // 创建分类ID到名称的映射，减少重复查找
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        
        return currentBookmarks.map(b => ({
            ...b,
            categoryName: categoryMap.get(b.categoryId) || "未分类"
        }));
    }, [currentBookmarks, categories]);

    if (currentBookmarks.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <Empty onAddBookmark={onAddBookmark} searchQuery={searchQuery} />
            </div>
        );
    }

    return (
        <BookmarkGrid
            bookmarks={processedBookmarks}
            categories={categories}
            onEdit={onEditBookmark}
            onDelete={onDeleteBookmark}
            onVisit={onVisitBookmark}
            onTogglePin={onTogglePin}
            onToggleFavorite={onToggleFavorite}
            isCompactMode={isCompactMode}
            selectionMode={selectionMode}
            selectedBookmarks={selectedBookmarks}
            onFavoriteDragStart={onFavoriteDragStart}
            onFavoriteDragEnd={onFavoriteDragEnd}
            onSelectBookmark={onSelectBookmark}
            currentCategoryId={currentCategory || undefined} 
        />
    );
};

import { useState } from "react";
import { useBookmarkContext } from "@/contexts/bookmarkContext";
import { toast } from "sonner";

export function useBookmarkDragDrop() {
    const { toggleBookmarkFavorite } = useBookmarkContext();
    
    // 拖拽排序状态
    const [draggedBookmarkId, setDraggedBookmarkId] = useState<string | null>(null);
    const [tempOrder] = useState<string[]>([]);
    
    // 取消收藏拖拽状态
    const [isDraggingFavorite, setIsDraggingFavorite] = useState(false);
    const [isOverUnfavoriteZone, setIsOverUnfavoriteZone] = useState(false);

    // 处理收藏书签拖拽开始
    const handleFavoriteDragStart = (bookmarkId: string) => {
        setIsDraggingFavorite(true);
        setDraggedBookmarkId(bookmarkId);
    };
    
    // 处理收藏书签拖拽结束
    const handleFavoriteDragEnd = () => {
        setIsDraggingFavorite(false);
        setIsOverUnfavoriteZone(false);
        setDraggedBookmarkId(null);
    };
    
    // 处理取消收藏区域的拖拽事件
    const handleUnfavoriteZoneDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOverUnfavoriteZone(true);
    };
    
    const handleUnfavoriteZoneDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOverUnfavoriteZone(false);
    };
    
    const handleUnfavoriteZoneDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedBookmarkId) {
            toggleBookmarkFavorite(draggedBookmarkId);
            toast.success('已取消收藏');
        }
        setIsOverUnfavoriteZone(false);
        setIsDraggingFavorite(false);
        setDraggedBookmarkId(null);
    };

    return {
        draggedBookmarkId,
        setDraggedBookmarkId,
        tempOrder,
        isDraggingFavorite,
        isOverUnfavoriteZone,
        handleFavoriteDragStart,
        handleFavoriteDragEnd,
        handleUnfavoriteZoneDragOver,
        handleUnfavoriteZoneDragLeave,
        handleUnfavoriteZoneDrop
    };
}

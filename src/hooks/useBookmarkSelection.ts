import { useState, useMemo, useEffect } from "react";
import { Bookmark } from "@/types";
import { toast } from "sonner";
import { useBookmarkContext } from "@/contexts/bookmarkContext";

export function useBookmarkSelection(
    currentBookmarks: Bookmark[],
    targetCategoryId: string | null
) {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([]);
    const { batchMoveBookmarks, batchDeleteBookmarks } = useBookmarkContext();

    const allSelected = useMemo(
        () => currentBookmarks.length > 0 && selectedBookmarks.length === currentBookmarks.length,
        [currentBookmarks, selectedBookmarks]
    );

    useEffect(() => {
        const handleToggleSelectionMode = () => {
            setSelectionMode(prev => {
                if (prev) setSelectedBookmarks([]);
                return !prev;
            });
        };

        document.addEventListener("toggle-selection-mode", handleToggleSelectionMode);
        return () => document.removeEventListener("toggle-selection-mode", handleToggleSelectionMode);
    }, []);

    const selectBookmark = (id: string, selected: boolean) => {
        setSelectedBookmarks(prev => 
            selected ? [...prev, id] : prev.filter(bookmarkId => bookmarkId !== id)
        );
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedBookmarks([]);
        } else {
            setSelectedBookmarks(currentBookmarks.map(b => b.id));
        }
    };

    const handleBatchMove = (onSuccess?: () => void) => {
        if (targetCategoryId && selectedBookmarks.length > 0) {
            batchMoveBookmarks(selectedBookmarks, targetCategoryId);
            toast.success(`已将 ${selectedBookmarks.length} 个网站移动到所选分类`);
            setSelectedBookmarks([]);
            onSuccess?.();
        }
    };

    const handleBatchDelete = (onSuccess?: () => void) => {
        if (selectedBookmarks.length > 0) {
            batchDeleteBookmarks(selectedBookmarks);
            toast.success(`已删除 ${selectedBookmarks.length} 个网站`);
            setSelectedBookmarks([]);
            onSuccess?.();
        }
    };

    return {
        selectionMode,
        setSelectionMode,
        selectedBookmarks,
        setSelectedBookmarks,
        allSelected,
        selectBookmark,
        toggleSelectAll,
        handleBatchMove,
        handleBatchDelete,
        handleToggleSelectionMode: setSelectionMode
    };
}

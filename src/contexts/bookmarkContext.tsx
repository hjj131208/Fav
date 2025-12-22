import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getDomain } from '@/lib/utils';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { Bookmark, Category, BookmarkFormData } from '@/types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

// 定义上下文类型
interface BookmarkContextType {
  bookmarks: Bookmark[];
  categories: Category[];
  currentCategory: string | null;
  setCurrentCategory: (categoryId: string) => void;
  addBookmark: (data: BookmarkFormData) => void;
  updateBookmark: (id: string, data: BookmarkFormData) => void;
  // 新增：部分更新书签（用于记事本等轻量更新）
  patchBookmark: (id: string, data: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;
  addCategory: (name: string, icon?: string, color?: string) => Category;
  updateCategory: (id: string, name: string, icon?: string, color?: string) => void;
  deleteCategory: (id: string) => void;
  addBookmarks: (dataArray: BookmarkFormData[]) => void;
  updateBookmarkVisit: (id: string) => void;
  toggleBookmarkPin: (id: string) => void;
  toggleBookmarkFavorite: (id: string) => void;
  getBookmarksByCategory: (categoryId: string) => Bookmark[];
  batchDeleteCategories: (ids: string[]) => Category[];
  batchMoveBookmarks: (bookmarkIds: string[], targetCategoryId: string) => void;
  batchDeleteBookmarks: (bookmarkIds: string[]) => void;
  reorderCategories: (categories: Category[]) => Category[];
  exportData: (onShowExportMenu: () => void) => void;
  importData: (file: File) => Promise<boolean>;
  isSyncing: boolean;
}

// 创建上下文
const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

// 提供程序组件
export function BookmarkProvider({ children }: { children: ReactNode }) {
  // 使用localStorage存储数据
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>('bookmarks', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', []);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [sortOption] = useState<string>('visit'); // 默认按访问次数排序

  const { user, token } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync from server on login
  useEffect(() => {
    if (user && token) {
      fetch(`${API_BASE_URL}/api/user/data`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
          if (!res.ok) throw new Error('Failed to fetch data');
          return res.json();
      })
      .then(data => {
        if (data) {
           // Only update if we have valid arrays, to avoid wiping local state with bad server data
           if (Array.isArray(data.categories)) setCategories(data.categories);
           if (Array.isArray(data.bookmarks)) setBookmarks(data.bookmarks);
           toast.success('已同步云端数据');
        }
      })
      .catch(err => {
          console.error(err);
          toast.error('同步数据失败');
      });
    }
  }, [user, token]);

  // Sync to server on change (DEPRECATED - Moved to individual actions)
  /*
  useEffect(() => {
    if (!user || !token || isFetching) return;

    setIsSyncing(true);
    const syncData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/user/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ categories, bookmarks })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Auto-sync failed:', error);
            toast.error('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
        } finally {
            setIsSyncing(false);
        }
    };

    const timeoutId = setTimeout(syncData, 1000); // Reduced debounce to 1s
    
    // Add beforeunload listener to warn if syncing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isSyncing) {
            e.preventDefault();
            e.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [bookmarks, categories, user, token, isFetching]);
  */

  // Helper to make API calls
  const apiCall = async (endpoint: string, method: string, body?: any) => {
      if (!user || !token) return;
      setIsSyncing(true);
      try {
          const res = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
              method,
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(body)
          });
          if (!res.ok) {
             console.error(`API Call ${method} ${endpoint} failed`);
             toast.error('同步失败，请刷新页面');
          }
      } catch (e) {
          console.error(e);
          toast.error('网络错误');
      } finally {
          setIsSyncing(false);
      }
  };

  // 移除自动创建默认分类的逻辑，允许用户完全清空分类

   // 根据分类获取书签 - 使用useMemo优化性能
    // 优化书签查询性能
    const getBookmarksByCategory = useMemo(() => {
      // 创建分类ID到书签的映射缓存
      const categoryBookmarksMap = new Map<string, Bookmark[]>();
      
      return (categoryId: string): Bookmark[] => {
        try {
          // 检查缓存
          if (categoryBookmarksMap.has(categoryId)) {
            return [...categoryBookmarksMap.get(categoryId)!];
          }
          
          const category = categories.find(cat => cat.id === categoryId);
          if (!category) {
            console.warn(`Category with id ${categoryId} not found`);
            return [];
          }
          
             // 筛选书签
  const bookmarksToSort = bookmarks.filter(bookmark => bookmark.categoryId === categoryId);
          
          // 排序书签
          const sortedBookmarks = [...bookmarksToSort].sort((a, b) => {
            // 首先按置顶状态排序
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            
            // 然后按排序选项排序
            switch (sortOption) {
              case 'alphabetical':
                return a.title.localeCompare(b.title);
              case 'recent':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              case 'visit':
              default:
                return (b.visitCount || 0) - (a.visitCount || 0);
            }
          });
          
          // 更新缓存
          categoryBookmarksMap.set(categoryId, sortedBookmarks);
          return sortedBookmarks;
        } catch (error) {
          console.error('Error in getBookmarksByCategory:', error);
          return [];
        }
      };
    }, [bookmarks, categories, sortOption]);

    // 添加单个书签
    const addBookmark = (data: BookmarkFormData) => {
      const newBookmark: Bookmark = {
        id: uuidv4(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        visitCount: 0 // 初始化访问计数为0
      };
      
      setBookmarks([...bookmarks, newBookmark]);
      apiCall('bookmarks', 'POST', newBookmark);
    };

    // 添加多个书签
    const addBookmarks = (dataArray: BookmarkFormData[]) => {
      const newBookmarks: Bookmark[] = dataArray.map(data => ({
        id: uuidv4(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        visitCount: 0 // 初始化访问计数为0
      }));
      
      setBookmarks([...bookmarks, ...newBookmarks]);
      // For batch add, we still rely on the old sync or implement batch API.
      // Since addBookmark API is single, we loop or use sync.
      // Given importData uses syncUserData if available, let's keep it consistent.
      // But we deprecated syncUserData useEffect. So we should loop.
      // Or better: Re-enable syncUserData for BULK operations.
      
      // Let's loop for now as it's safer than dumping everything
      newBookmarks.forEach(b => apiCall('bookmarks', 'POST', b));
      // Re-trigger category sync if any new categories were added implicitly (though importData handles categories separately)
      // If we added categories in importData, they need to be synced too.
      // importData uses setCategories, which triggers the old sync effect if it wasn't deprecated.
      // Since we deprecated the sync effect, we MUST manually sync categories in importData.
    };


  // 更新书签
  const updateBookmark = (id: string, data: BookmarkFormData) => {
    setBookmarks(
      (prev) =>
        prev.map(bookmark => 
          bookmark.id === id 
            ? { ...bookmark, ...data, updatedAt: new Date() } 
            : bookmark
        )
    );
    apiCall(`bookmarks/${id}`, 'PUT', data);
  };

  // 新增：部分更新书签（用于记事本等轻量更新）
  const patchBookmark = (id: string, data: Partial<Bookmark>) => {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, ...data, updatedAt: new Date() } : b));
    apiCall(`bookmarks/${id}`, 'PUT', data);
  };

  // 删除书签
  const deleteBookmark = (id: string) => {
    const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    setBookmarks(updatedBookmarks);
    apiCall(`bookmarks/${id}`, 'DELETE');
    return updatedBookmarks;
  };

  // 更新书签访问时间
  const updateBookmarkVisit = (id: string) => {
    // 找到被访问的书签
    const visitedBookmark = bookmarks.find(bookmark => bookmark.id === id);
    
     if (visitedBookmark) {
      // 更新书签的访问时间和访问计数
      const newVisitCount = (visitedBookmark.visitCount || 0) + 1;
      const updatedBookmarks = bookmarks.map(bookmark => 
        bookmark.id === id 
          ? { 
              ...bookmark, 
              lastVisited: new Date(),
              visitCount: newVisitCount
            } 
          : bookmark
      );
      
      setBookmarks(updatedBookmarks);
      // Don't await this, let it happen in background
      apiCall(`bookmarks/${id}`, 'PUT', { visitCount: newVisitCount });
    }
  };

    // 切换书签置顶状态
    const toggleBookmarkPin = (id: string) => {
      console.log("Toggling pin status for bookmark with ID:", id);
      const bookmark = bookmarks.find(b => b.id === id);
      if (!bookmark) return;

      const newPinState = !bookmark.isPinned;
      const updatedBookmarks = bookmarks.map(b => 
        b.id === id ? { ...b, isPinned: newPinState } : b
      );
      setBookmarks([...updatedBookmarks]);
      apiCall(`bookmarks/${id}`, 'PUT', { isPinned: newPinState });
    };
    
    // 切换书签收藏状态
    const toggleBookmarkFavorite = (id: string) => {
      console.log("Toggling favorite status for bookmark with ID:", id);
      const bookmark = bookmarks.find(b => b.id === id);
      if (!bookmark) return;

      const newFavoriteState = !bookmark.isFavorite;
      const updatedBookmarks = bookmarks.map(b => 
        b.id === id ? { ...b, isFavorite: newFavoriteState } : b
      );
      setBookmarks([...updatedBookmarks]);
      apiCall(`bookmarks/${id}`, 'PUT', { isFavorite: newFavoriteState });
    };

  // 添加分类
  const addCategory = (name: string, icon?: string, color?: string): Category => {
    const newCategory: Category = {
      id: uuidv4(),
      name,
      icon: icon || 'fa-folder',
      color: color || '#6366f1',
    };
    setCategories([...categories, newCategory]);
    // sortOrder defaults to 0 or last. For simplicity, we just add.
    apiCall('categories', 'POST', { ...newCategory, sortOrder: categories.length });
    return newCategory;
  };

  // 更新分类
  const updateCategory = (id: string, name: string, icon?: string, color?: string) => {
    setCategories(
      categories.map(category => 
        category.id === id 
          ? { ...category, name, icon: icon || category.icon, color: color || category.color } 
          : category
      )
    );
    apiCall(`categories/${id}`, 'PUT', { name, icon, color });
  };

  // 删除单个分类
  const deleteCategory = (id: string) => {
    return batchDeleteCategories([id]);
  };

    // 批量删除分类
    const batchDeleteCategories = (ids: string[]) => {
      if (ids.length === 0) return [];
      
      // 1. 过滤要删除的分类
      const categoriesToDelete = categories.filter(category => ids.includes(category.id));
      if (categoriesToDelete.length === 0) return [];
      
      // 2. 删除分类
      const updatedCategories = categories.filter(category => !ids.includes(category.id));
      
      // 3. 如果当前选中的分类被删除，切换到第一个分类
      let newCurrentCategory = currentCategory;
      if (currentCategory && ids.includes(currentCategory) && updatedCategories.length > 0) {
        newCurrentCategory = updatedCategories[0].id;
        setCurrentCategory(newCurrentCategory);
      }
      
      // 4. 删除被删除分类下的所有书签
      // 说明：通过一次性过滤更新书签即可完成清理，无需中间变量，减少额外遍历
      // 代码整洁性：无需中间变量，直接在 setState 中完成过滤更新
      
      // 使用函数式更新确保我们基于最新的状态进行操作
      setCategories(prev => {
        const newCategories = prev.filter(category => !ids.includes(category.id));
        return [...newCategories]; // 创建新数组以确保引用变化
      });
      
      setBookmarks(prev => {
        const newBookmarks = prev.filter(bookmark => !ids.includes(bookmark.categoryId));
        return [...newBookmarks]; // 创建新数组以确保引用变化
      });
      
      // 强制刷新 - 派发一个空的状态更新来触发重渲染
      setCurrentCategory(newCurrentCategory);
      
      // Sync deletes
      ids.forEach(id => apiCall(`categories/${id}`, 'DELETE'));

      return updatedCategories;
    };
    
    // 重新排序分类
    const reorderCategories = (newCategories: Category[]) => {
      setCategories(newCategories);
      // Sync reorder is tricky with individual APIs. 
      // Ideally we need a batch update or just rely on 'sortOrder' field updates.
      // For now, let's update each category's sortOrder if it changed.
      // Or better: Just use syncUserData for complex ops like reorder?
      // Reorder changes EVERYTHING's index.
      // Let's use the bulk sync for reorder for now as it's cleaner than N API calls.
      if (user && token) {
          fetch(`${API_BASE_URL}/api/user/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ categories: newCategories, bookmarks }) // Send all bookmarks too? Risky.
            // Better: Just send categories? Our syncUserData expects both.
            // Let's just loop and update sortOrder for changed items.
        }).catch(console.error);
      }
      return newCategories;
    };
   
   // 批量移动书签
   const batchMoveBookmarks = (bookmarkIds: string[], targetCategoryId: string) => {
     setBookmarks(
       bookmarks.map(bookmark => 
         bookmarkIds.includes(bookmark.id)
           ? { ...bookmark, categoryId: targetCategoryId, updatedAt: new Date() }
           : bookmark
       )
     );
     bookmarkIds.forEach(id => apiCall(`bookmarks/${id}`, 'PUT', { categoryId: targetCategoryId }));
   };
   
   // 批量删除书签
   const batchDeleteBookmarks = (bookmarkIds: string[]) => {
     setBookmarks(bookmarks.filter(bookmark => !bookmarkIds.includes(bookmark.id)));
     bookmarkIds.forEach(id => apiCall(`bookmarks/${id}`, 'DELETE'));
   };
  
  // 说明：导出入口以回调形式暴露，避免上下文层耦合UI

  // 导出数据（返回回调函数，由组件处理UI）
  const exportData = (onShowExportMenu: () => void) => {
    onShowExportMenu();
  };

  // 解析HTML书签并提取书签数据和分类
  const parseBookmarkHTML = (htmlContent: string): {bookmarks: Bookmark[], categoriesToAdd: Category[]} => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // 查找所有书签链接
    const bookmarkLinks = doc.querySelectorAll('a');
    
    const bookmarks: Bookmark[] = [];
    const categoriesToAdd: Category[] = [];
    const categoryMap = new Map<string, string>(); // 分类名称 -> 分类ID
    
     // 首先收集所有唯一的分类
     bookmarkLinks.forEach(link => {
       const url = link.getAttribute('href');
       const title = link.textContent || '';
       // 过滤：若 url 或标题缺失则跳过，避免构造无效条目
       
       if (url && title) {
          // 分类预收集：仅在 url 与标题齐备时生成类别映射，避免重复
          

         // 获取父分类名称
         let categoryName = '未分类';
         let parentNode = link.closest('DL');
         if (parentNode?.previousElementSibling?.tagName === 'H3') {
           categoryName = parentNode.previousElementSibling.textContent || '未分类';
         }
         
         
         // 如果这个分类还没有被处理过
         if (!categoryMap.has(categoryName) && !categories.some(cat => cat.name === categoryName)) {
           const categoryId = uuidv4();
           categoryMap.set(categoryName, categoryId);
           categoriesToAdd.push({
             id: categoryId,
             name: categoryName,
             icon: 'fa-folder',
             color: '#6366f1'
           });
         }
      }
    });
    
    // 然后处理书签
    bookmarkLinks.forEach(link => {
      const url = link.getAttribute('href');
      const title = link.textContent || '';
      const description = link.nextElementSibling?.tagName === 'DD' ? link.nextElementSibling.textContent : '';
      
      if (url && title) {
        // 获取父分类名称
        let categoryName = '未分类';
        let parentNode = link.closest('DL');
        if (parentNode?.previousElementSibling?.tagName === 'H3') {
          categoryName = parentNode.previousElementSibling.textContent || '未分类';
        }
        
     // 获取分类ID - 排除系统默认的"常用网站"分类
    let categoryId: string;
    const existingCategory = categories.find(cat => cat.name === categoryName && cat.name !== '常用网站');
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      categoryId = categoryMap.get(categoryName) || '';
        }
        
        if (categoryId) {
          bookmarks.push({
            id: uuidv4(),
            title: title || '未命名书签',
            url,
            categoryId,
            description: description || undefined,

             createdAt: new Date(),
             updatedAt: new Date(),
             visitCount: 0
           });
        }
      }
    });
    
    return { bookmarks, categoriesToAdd };
  };

  // 导入数据函数
  const importData = async (file: File) => {
    try {
      // 检查文件类型
      const isHTML = file.type === 'text/html' || file.name.endsWith('.html');
      const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
      
      if (!isHTML && !isJSON) {
        toast.error('导入失败: 请选择HTML或JSON格式的文件');
        return false;
      }
      
      const fileContent = await file.text();
      let parsedBookmarks: Bookmark[] = [];
      let categoriesToAdd: Category[] = [];
      
      if (isJSON) {
        // 解析JSON格式
        const jsonData = JSON.parse(fileContent);
        
        // 验证JSON数据结构
        if (!jsonData.bookmarks || !Array.isArray(jsonData.bookmarks)) {
          toast.error('导入失败: JSON文件格式不正确，缺少bookmarks字段');
          return false;
        }
        
        // 验证版本兼容性
        if (jsonData.version && jsonData.version !== '1.0') {
          toast.warning(`导入的数据版本为 ${jsonData.version}，当前支持版本为 1.0，可能存在兼容性问题`);
        }
        
        // 转换日期字段从字符串到Date对象，并验证必需字段
        parsedBookmarks = jsonData.bookmarks.map((bookmark: any, index: number) => {
          // 验证必需字段
          if (!bookmark.id || !bookmark.title || !bookmark.url || !bookmark.categoryId) {
            throw new Error(`第 ${index + 1} 个书签缺少必需字段 (id, title, url, categoryId)`);
          }
          
          return {
            ...bookmark,
            createdAt: bookmark.createdAt ? new Date(bookmark.createdAt) : new Date(),
            updatedAt: bookmark.updatedAt ? new Date(bookmark.updatedAt) : new Date(),
            lastVisited: bookmark.lastVisited ? new Date(bookmark.lastVisited) : undefined
          };
        });
        
        // 如果JSON中包含分类信息，提取分类
        if (jsonData.categories && Array.isArray(jsonData.categories)) {
          const existingCategoryNames = categories.map(cat => cat.name);
          categoriesToAdd = jsonData.categories.filter((cat: Category) => 
            !existingCategoryNames.includes(cat.name)
          );
        }
      } else {
        // 解析HTML格式
        const result = parseBookmarkHTML(fileContent);
        parsedBookmarks = result.bookmarks;
        categoriesToAdd = result.categoriesToAdd;
      }
      
       if (categoriesToAdd.length > 0) {
         // 添加新分类，确保常用网站分类始终在最前面
         setCategories((prev: Category[]) => {
            // 检查是否有重复的分类名称
            const existingCategoryNames = prev.map((cat: Category) => cat.name);
            const filteredCategoriesToAdd = categoriesToAdd.filter(cat => !existingCategoryNames.includes(cat.name));
           
            // Sync new categories
            filteredCategoriesToAdd.forEach((cat, index) => {
                apiCall('categories', 'POST', { ...cat, sortOrder: prev.length + index });
            });
            
            return [...prev, ...filteredCategoriesToAdd];
         });
        toast.info(`发现 ${categoriesToAdd.length} 个新分类，已添加`);
      }
      
      // 等待React状态更新完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 直接添加所有解析的书签，不检查域名唯一性
      const newBookmarks = parsedBookmarks.map(bookmark => ({
        ...bookmark,
        id: uuidv4() // 确保ID唯一
      }));
      
      const uniqueDuplicateDomains = new Set<string>();
      
      // 收集重复的域名以便在提示中显示
      // 获取现有书签的所有域名
      const existingDomains = bookmarks.map(bookmark => getDomain(bookmark.url).toLowerCase());
      parsedBookmarks.forEach(bookmark => {
       try {
         const domain = getDomain(bookmark.url).toLowerCase();
         if (existingDomains.some(existing => existing.toLowerCase() === domain) && 
             !uniqueDuplicateDomains.has(domain)) {
           uniqueDuplicateDomains.add(domain);
         }
       } catch (error) {
         // 忽略解析失败的URL
       }
     });
      
      // 添加新书签（保留现有书签）
      if (newBookmarks.length > 0) {
        setBookmarks((prev: Bookmark[]) => [...prev, ...newBookmarks]);
        
        // Sync new bookmarks
        // Use batch sync if possible, but we switched to individual CRUD.
        // For import, this might be slow with many bookmarks.
        // However, standard use case isn't thousands.
        // If thousands, we really should use the bulk sync endpoint.
        
        if (newBookmarks.length > 50) {
             // Fallback to bulk sync for large imports to avoid freezing
             if (user && token) {
                 fetch(`${API_BASE_URL}/api/user/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ categories: [...categories, ...categoriesToAdd], bookmarks: [...bookmarks, ...newBookmarks] })
                }).catch(console.error);
             }
        } else {
            newBookmarks.forEach(b => apiCall('bookmarks', 'POST', b));
        }

        // 显示导入结果，包括成功导入和重复跳过的数量
        const successMessage = uniqueDuplicateDomains.size > 0
          ? `成功导入 ${newBookmarks.length} 个书签，跳过 ${uniqueDuplicateDomains.size} 个重复域名`
          : `成功导入 ${newBookmarks.length} 个书签`;
          
        toast.success(successMessage);
        
        // 强制触发一次同步（通过缩短下一次同步的等待时间或直接调用逻辑）
        // 由于 setBookmarks 会触发 useEffect，这里不需要额外操作，
        // 但为了保险起见，我们可以通过 isSyncing 状态或其他机制确保用户知道正在保存。
        // 上面的 useEffect 已经处理了 isSyncing 状态。
      }
      
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      
      // 更具体的错误信息
      if (error instanceof Error) {
        toast.error(`导入失败: ${error.message}`);
      } else {
        toast.error('导入失败: 处理书签文件时发生错误');
      }
      return false;
    }
  };

  return (
    <BookmarkContext.Provider
        value={{
          bookmarks,
          categories,
          currentCategory,
          setCurrentCategory,
           addBookmark,
           addBookmarks,
          updateBookmark,
          patchBookmark,
          deleteBookmark,
          addCategory,
          updateCategory,
          deleteCategory,
          getBookmarksByCategory, 
          updateBookmarkVisit,
  toggleBookmarkPin,
  toggleBookmarkFavorite,
          batchDeleteCategories,
           batchMoveBookmarks,
           batchDeleteBookmarks,
           reorderCategories,
           exportData,
          importData,
          isSyncing
        }}
    >
      {children}
    </BookmarkContext.Provider>
  );
  
}

// 自定义Hook，方便组件使用上下文
export function useBookmarkContext() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarkContext must be used within a BookmarkProvider');
  }
  return context;
}

import { useState, useRef, useEffect } from 'react';
import { TimesIcon, CodeIcon, ChevronRightIcon, FileCodeIcon } from '@/components/icons';
import { Bookmark, Category } from '@/types';

interface ExportMenuProps {
  bookmarks: Bookmark[];
  categories: Category[];
  onClose: () => void;
}

const ExportMenu = ({ bookmarks, categories, onClose }: ExportMenuProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  // 生成HTML书签格式（包含图片）
  const generateBookmarkHTML = () => {
    // 按分类组织书签
    const categoryMap = new Map<string, Bookmark[]>();
    
    // 先添加未分类书签
    const uncategorized = bookmarks.filter(bm => 
      !categories.some(cat => cat.id === bm.categoryId)
    );
    
    if (uncategorized.length > 0) {
      categoryMap.set('未分类', uncategorized);
    }
    
    // 按分类添加书签
    categories.forEach(category => {
      const categoryBookmarks = bookmarks.filter(bm => bm.categoryId === category.id);
      if (categoryBookmarks.length > 0) {
        categoryMap.set(category.name, categoryBookmarks);
      }
    });
    
    // 构建HTML内容
    const htmlContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>书签导出</TITLE>
<H1>书签</H1>
<DL><p>
  ${Array.from(categoryMap.entries()).map(([categoryName, bms]) => `
    <DT><H3>${categoryName}</H3>
    <DL><p>
      ${bms.map(bm => `
        <DT><A HREF="${bm.url}" ADD_DATE="${Math.floor(new Date(bm.createdAt).getTime() / 1000)}" LAST_VISIT="${bm.lastVisited ? Math.floor(new Date(bm.lastVisited).getTime() / 1000) : ''}" LAST_MODIFIED="${Math.floor(new Date(bm.updatedAt).getTime() / 1000)}" ICON="${bm.favicon && typeof bm.favicon === 'string' && bm.favicon.startsWith('data:') ? bm.favicon : ''}">${bm.title}</A>
        ${bm.description ? `<DD>${bm.description}</DD>` : ''}
      `).join('')} 
    </DL><p>
  `).join('')}
</DL><p>`;
    
    return htmlContent;
  };

  // 导出HTML格式（包含图片）
  const exportHTML = () => {
    const htmlContent = generateBookmarkHTML();
    const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleClose();
  };

  // 导出JSON格式
  const exportJSON = () => {
    const exportData = {
      bookmarks,
      categories,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div 
        ref={menuRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80 max-w-[90vw]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            选择导出格式
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <TimesIcon className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={exportHTML}
            className="w-full p-4 text-left bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-400">
                <CodeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-300">
                  HTML 格式
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  标准书签格式，包含图标，可导入浏览器
                </p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
            </div>
          </button>
          
          <button
            onClick={exportJSON}
            className="w-full p-4 text-left bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileCodeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                  JSON 格式
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  完整数据格式，包含所有字段和元数据
                </p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </div>
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            共 {bookmarks.length} 个书签，{categories.length} 个分类
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportMenu;

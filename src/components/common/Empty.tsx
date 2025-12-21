import { cn } from "@/lib/utils";

// Empty component
interface EmptyProps {
  onAddBookmark?: () => void;
  searchQuery?: string;
}

export function Empty({ onAddBookmark, searchQuery }: EmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-6")}>
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
        <i className="fa-solid fa-bookmark text-blue-600 dark:text-blue-400 text-3xl"></i>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无收藏</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
      {searchQuery 
        ? `未找到与"${searchQuery}"相关的收藏` 
        : '点击右上角"添加网站"按钮开始收藏您喜爱的网站，或先创建分类整理您的收藏'}
    </p>
      <div className="flex gap-2">
        <button 
          onClick={onAddBookmark}
          className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
          disabled={!onAddBookmark}
        >
          <i className="fa-solid fa-plus mr-1"></i> 添加收藏
        </button>
        <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm" id="show-help-btn">
          <i className="fa-solid fa-question-circle mr-1"></i> 查看帮助
        </button>
      </div>
    </div>
  );
}
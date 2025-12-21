export interface Bookmark {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  description?: string;
  favicon?: string;
  createdAt: Date;
  updatedAt: Date;
  lastVisited?: Date;
  visitCount?: number; // 添加访问计数
  isPinned?: boolean; // 添加置顶状态
  isFavorite?: boolean; // 添加收藏状态
  // 新增：可选标签列表
  tags?: string[];
  // 新增：下载相关字段
  downloadUrl?: string;
  showDownload?: boolean;
  // 新增：记事本内容
  notes?: string;
  // 新增：链接失效标记
  isDead?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export type BookmarkFormData = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'visitCount'>;
export type BatchBookmarkFormData = Omit<BookmarkFormData, 'title' | 'url' | 'description'> & { urls: string[] };

// 添加排序选项类型
export interface ExportData {
  bookmarks: Bookmark[];
  categories: Category[];
  exportDate: string;
  version: string;
}

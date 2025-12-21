import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Category } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon?: string, color?: string) => void;
  editingCategory?: Category;
}

// 预定义的图标选项
const ICON_OPTIONS = [
  { name: 'fa-film', label: '影视' },
  { name: 'fa-paw', label: '二次元' },
  { name: 'fa-music', label: '音乐' },
  { name: 'fa-book', label: '阅读' },
  { name: 'fa-gamepad', label: '游戏' },
  { name: 'fa-laugh', label: '娱乐' },
  { name: 'fa-tools', label: '工具箱' },
  { name: 'fa-box', label: '软件' },
];

  // 预定义的颜色选项
  const COLOR_OPTIONS = [
    '#4f46e5', // 蓝色
    '#ec4899', // 粉色
    '#ef4444', // 红色
    '#10b981', // 绿色
    '#f59e0b', // 橙色
    '#8b5cf6', // 紫色
    '#6366f1', // 靛蓝色
    '#06b6d4', // 青色
    '#f43f5e', // 玫瑰色
    '#7c3aed', // 深紫色
  ];

export function CategoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingCategory 
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('fa-folder');
  const [color, setColor] = useState('#4f46e5');
  const [customColor, setCustomColor] = useState('');
  const [showCustomColorInput, setShowCustomColorInput] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 当编辑分类时初始化表单
  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setIcon(editingCategory.icon || 'fa-folder');
      setColor(editingCategory.color || '#4f46e5');
    } else {
      setName('');
      setIcon('fa-folder');
      setColor('#4f46e5');
    }
    setError('');
  }, [editingCategory]);
  
  // 处理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!name.trim()) {
      setError('请输入分类名称');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      onSave(name.trim(), icon, color);
      toast.success(editingCategory ? '分类已更新' : '分类添加成功');
      onClose();
    } catch (error) {
      toast.error('操作失败，请重试');
      console.error('Failed to save category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 点击外部关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingCategory ? '编辑分类' : '添加分类'}
          </h3>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-center">
              <i className="fa-solid fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分类名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入分类名称，例如：音乐网站"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择图标
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
              {ICON_OPTIONS.map(option => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => setIcon(option.name)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                    icon === option.name 
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent"
                  )}
                >
                  <i className={`fa-solid ${option.name} mr-1`}></i>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择颜色
            </label>
            <div className="flex flex-wrap gap-2">
               {COLOR_OPTIONS.map(colorOption => (
                 <button
                   key={colorOption}
                   type="button"
                   onClick={() => {
                     setColor(colorOption);
                     setCustomColor('');
                     setShowCustomColorInput(false);
                   }}
                   className={cn(
                     "w-8 h-8 rounded-full transition-transform",
                     color === colorOption ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-110"
                   )}
                   style={{ backgroundColor: colorOption }}
                   aria-label={`选择颜色 ${colorOption}`}
                 ></button>
               ))}
               
               {/* 自定义颜色按钮 */}
               <button
                 type="button"
                 onClick={() => setShowCustomColorInput(!showCustomColorInput)}
                 className={cn(
                   "w-8 h-8 rounded-full border-2 border-dashed transition-transform hover:scale-110",
                   showCustomColorInput ? "border-blue-500" : "border-gray-300 dark:border-gray-600"
                 )}
                 aria-label="自定义颜色"
               >
                 <i className="fa-solid fa-plus text-xs text-gray-500 dark:text-gray-400"></i>
               </button>
               
               {/* 自定义颜色输入区域 */}
               {showCustomColorInput && (
                 <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg w-full">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                     自定义颜色
                   </label>
                   <div className="flex items-center gap-3">
                     <input
                       type="color"
                       value={customColor || color}
                       onChange={(e) => {
                         const newColor = e.target.value;
                         setCustomColor(newColor);
                         setColor(newColor);
                       }}
                       className="w-12 h-12 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                     />
                     <div className="flex-1">
                       <input
                         type="text"
                         value={customColor || color}
                         onChange={(e) => {
                           const newColor = e.target.value;
                           // 简单验证颜色格式
                           if (/^#([0-9A-F]{3}){1,2}$/i.test(newColor)) {
                             setCustomColor(newColor);
                             setColor(newColor);
                           }
                         }}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                         placeholder="输入颜色代码，例如 #ff0000"
                       />
                       <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                         支持 hex 格式颜色代码，例如 #ff0000 或 #f00
                       </p>
                     </div>
                   </div>
                 </div>
               )}
             </div>
          </div>
          
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  保存中...
                </>
              ) : editingCategory ? (
                '更新分类'
              ) : (
                '添加分类'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchEngine } from '@/config/searchEngines';
import { toast } from 'sonner';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchEngines: SearchEngine[];
    onAddSearchEngine: (engine: SearchEngine) => void;
    onRemoveSearchEngine: (id: string) => void;
    onUpdateSearchEngine: (engine: SearchEngine) => void;
    onResetSearchEngines: () => void;
}

const ICON_OPTIONS = [
    { name: 'fa-search', label: '通用' },
    { name: 'fa-google', label: 'Google' },
    { name: 'fa-baidu', label: '百度' }, // Note: fa-baidu might not exist in free set, usually it's fa-paw or similar if not brand
    { name: 'fa-bing', label: 'Bing' },  // fa-microsoft or similar
    { name: 'fa-github', label: 'GitHub' },
    { name: 'fa-youtube', label: 'YouTube' },
    { name: 'fa-wikipedia-w', label: 'Wiki' },
    { name: 'fa-map', label: '地图' },
    { name: 'fa-image', label: '图片' },
    { name: 'fa-video', label: '视频' },
    { name: 'fa-shopping-cart', label: '购物' },
];

export default function SettingsModal({
    isOpen,
    onClose,
    searchEngines,
    onAddSearchEngine,
    onRemoveSearchEngine,
    onUpdateSearchEngine,
    onResetSearchEngines
}: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'search'>('search');
    const [editingEngine, setEditingEngine] = useState<SearchEngine | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<SearchEngine>>({
        name: '',
        url: '',
        icon: 'fa-search'
    });

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const startEdit = (engine: SearchEngine) => {
        setEditingEngine(engine);
        setFormData({ ...engine });
        setIsAdding(false);
    };

    const startAdd = () => {
        setEditingEngine(null);
        setFormData({
            name: '',
            url: '',
            icon: 'fa-search'
        });
        setIsAdding(true);
    };

    const cancelEdit = () => {
        setEditingEngine(null);
        setIsAdding(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.url) {
            toast.error('名称和链接不能为空');
            return;
        }

        if (isAdding) {
            const newEngine: SearchEngine = {
                id: Date.now().toString(),
                name: formData.name,
                url: formData.url,
                icon: formData.icon || 'fa-search'
            };
            onAddSearchEngine(newEngine);
            toast.success('搜索引擎已添加');
        } else if (editingEngine) {
            onUpdateSearchEngine({
                ...editingEngine,
                name: formData.name,
                url: formData.url,
                icon: formData.icon || 'fa-search'
            } as SearchEngine);
            toast.success('搜索引擎已更新');
        }

        cancelEdit();
    };

    const handleDelete = (id: string) => {
        if (searchEngines.length <= 1) {
            toast.error('至少保留一个搜索引擎');
            return;
        }
        if (confirm('确定要删除这个搜索引擎吗？')) {
            onRemoveSearchEngine(id);
            toast.success('已删除');
        }
    };

    return createPortal(
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
            onClick={handleOverlayClick}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex border-b border-gray-200 dark:border-gray-800">
                    <div className="flex-1 flex px-4">
                        <button
                            className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'search' 
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                            onClick={() => setActiveTab('search')}
                        >
                            搜索引擎
                        </button>
                        {/* Future tabs can be added here */}
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <i className="fa-solid fa-times text-lg"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'search' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">搜索引擎管理</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">自定义您的搜索工具，支持添加常用搜索引擎</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={onResetSearchEngines}
                                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        重置默认
                                    </button>
                                    <button
                                        onClick={startAdd}
                                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-plus"></i>
                                        添加
                                    </button>
                                </div>
                            </div>

                            {/* Edit/Add Form */}
                            {(isAdding || editingEngine) && (
                                <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {isAdding ? '添加搜索引擎' : '编辑搜索引擎'}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="例如：Google"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
                                            <select
                                                value={formData.icon}
                                                onChange={e => setFormData({...formData, icon: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                {ICON_OPTIONS.map(opt => (
                                                    <option key={opt.name} value={opt.name}>{opt.label} ({opt.name})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL (搜索词用查询参数结尾)</label>
                                            <input
                                                type="text"
                                                value={formData.url}
                                                onChange={e => setFormData({...formData, url: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="例如：https://www.google.com/search?q="
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                提示：搜索词将直接追加到此 URL 末尾。
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                                        >
                                            保存
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* List */}
                            <div className="space-y-2">
                                {searchEngines.map(engine => (
                                    <div 
                                        key={engine.id}
                                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                                                <i className={`fa-brands ${engine.icon.replace('fa-', 'fa-')} ${engine.icon.startsWith('fa-') && !engine.icon.startsWith('fa-brands') ? 'fa-solid ' + engine.icon : ''}`}></i>
                                                {/* Fallback logic for icons */}
                                                {!engine.icon.startsWith('fa-') && <i className="fa-solid fa-search"></i>}
                                                {/* Simplified icon rendering for now, relying on user input matching fontawesome */}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{engine.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{engine.url}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(engine)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                title="编辑"
                                            >
                                                <i className="fa-solid fa-pen"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(engine.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                title="删除"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

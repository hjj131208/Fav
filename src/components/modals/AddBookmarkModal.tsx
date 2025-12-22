import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Bookmark, Category, BookmarkFormData } from '@/types';
import { getDomain } from '@/lib/utils';

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BookmarkFormData | BookmarkFormData[]) => void;
  categories: Category[];
  editingBookmark?: Bookmark;
  mode?: 'single' | 'batch';
  existingBookmarks: Bookmark[];
  onRequestAddCategory?: () => void;
  newCategoryId?: string | null;
}

export function AddBookmarkModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categories,
  editingBookmark,
  mode,
  onRequestAddCategory,
  newCategoryId
}: AddBookmarkModalProps) {
  // 表单状态
  const [formData, setFormData] = useState<BookmarkFormData>({
    title: '',
    url: '',
    categoryId: '',
    description: '',
    favicon: '',
    downloadUrl: '',
    showDownload: false
  });
  
  const [batchUrls, setBatchUrls] = useState('');
  // 新增：标签输入的原始文本（使用逗号、空格或回车分隔）
  const [tagsText, setTagsText] = useState('');
  // 预留：批量导入高级选项可在此扩展额外状态（如去重、忽略查询串等）
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  // 仅管理上传图片（data URL），不再支持外站图标URL
  const [faviconImage, setFaviconImage] = useState<string>('');
  // 新增：自动抓取图标的加载状态
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);

  // 当编辑书签或分类变化时更新表单
  useEffect(() => {
    if (editingBookmark) {
      // 确保分类ID有效，如果无效则清空
      const validCategoryId = categories.some(cat => cat.id === editingBookmark.categoryId)
        ? editingBookmark.categoryId
        : '';
        
        setFormData({
          title: editingBookmark.title,
          url: editingBookmark.url,
          categoryId: validCategoryId,
          description: editingBookmark.description || '',
          favicon: editingBookmark.favicon || '',
          downloadUrl: editingBookmark.downloadUrl || '',
          showDownload: !!editingBookmark.showDownload
        });
        // 根据现有favicon初始化本地状态（仅支持data URL）
        if (editingBookmark.favicon && typeof editingBookmark.favicon === 'string' && editingBookmark.favicon.startsWith('data:')) {
          setFaviconImage(editingBookmark.favicon);
        } else {
          setFaviconImage('');
        }
        // 初始化标签文本
        setTagsText((editingBookmark.tags || []).join(', '));
    } else {
       setFormData(prev => ({ ...prev, categoryId: '', downloadUrl: '', showDownload: false }));
       setFaviconImage('');
       setTagsText('');
    }
  }, [editingBookmark]);

  useEffect(() => {
    if (!editingBookmark && newCategoryId) {
      setFormData(prev => ({
        ...prev,
        categoryId: newCategoryId
      }));
      setError('');
    }
  }, [newCategoryId, editingBookmark]);
  
  // 处理表单变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };
  
  // 验证URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  // 解析标签输入为去重后的字符串数组
  const parseTags = (text: string): string[] => {
    const normalized = (text || '')
      .replace(/[，]/g, ',') // 全角逗号转半角
      .trim();
    if (!normalized) return [];
    const parts = normalized
      .split(/[\s,\n]+/)
      .map(t => t.trim())
      .filter(Boolean);
    // 去重（保留原始大小写）
    return Array.from(new Set(parts));
  };

  // 新增：按候选地址抓取图片并转为 data URL（带局部超时与全局中止）
  const fetchImageAsDataUrl = async (url: string, globalSignal?: AbortSignal): Promise<string | null> => {
    const controller = new AbortController();
    // 当全局中止触发时，一并中止本次请求
    const onGlobalAbort = () => controller.abort();
    if (globalSignal) {
      if (globalSignal.aborted) return null;
      globalSignal.addEventListener('abort', onGlobalAbort);
    }
    const timer = setTimeout(() => controller.abort(), 8000); // 单次请求8秒超时
    try {
      const resp = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'image/*' } });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      if (!blob || blob.size === 0) return null;
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      return dataUrl;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
      if (globalSignal) globalSignal.removeEventListener('abort', onGlobalAbort);
    }
  };

  // 新增：为跨域资源提供通用代理（images.weserv.nl 支持 CORS）
  const buildProxyUrl = (u: string) => {
    try {
      const withoutProto = u.replace(/^https?:\/\//i, '');
      // 追加尺寸限制，避免过大
      return `https://images.weserv.nl/?url=${encodeURIComponent(withoutProto)}&w=192&h=192&fit=inside&default=404`;
    } catch {
      return u;
    }
  };

  // 新增：优先直连抓取，失败后通过代理重试（感知全局中止）
  const tryFetch = async (u: string, globalSignal?: AbortSignal): Promise<string | null> => {
    if (globalSignal?.aborted) return null;
    let dataUrl = await fetchImageAsDataUrl(u, globalSignal);
    if (!dataUrl && !(globalSignal?.aborted)) {
      const proxied = buildProxyUrl(u);
      dataUrl = await fetchImageAsDataUrl(proxied, globalSignal);
    }
    return dataUrl;
  };

  // 新增：一键自动获取图标（多源+回退+全局10秒超时）
  const autoFetchFavicon = async () => {
    const rawUrl = formData.url.trim();
    if (!rawUrl) {
      setError('请先输入网站URL');
      toast.error('请先输入网站URL');
      return;
    }
    setIsFetchingIcon(true);

    // 全局10秒超时与中止控制
    const globalController = new AbortController();
    const globalTimer = setTimeout(() => {
      globalController.abort();
    }, 10000);

    try {
      const domain = getDomain(rawUrl);
      if (!domain) {
        toast.error('无法从URL解析域名');
        return;
      }

      // 扩充候选服务，并优先尝试具备 CORS 的服务
      const candidates: string[] = [
        // gstatic 与 google s2
        `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        `https://www.google.com/s2/favicons?domain_url=https://${domain}&sz=128`,
        // 公共图标服务
        `https://icon.horse/icon/${domain}`,
        `https://icons.bitwarden.net/${domain}/icon.png`,
        `https://api.faviconkit.com/${domain}/144`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        // 站点直链
        `https://${domain}/favicon.ico`,
      ];

      let dataUrl: string | null = null;
      for (const u of candidates) {
        if (globalController.signal.aborted) break;
        dataUrl = await tryFetch(u, globalController.signal);
        if (dataUrl) break;
      }

      // 进一步回退：尝试 FaviconGrabber API（返回多个候选URL）
      if (!dataUrl && !globalController.signal.aborted) {
        try {
          const resp = await fetch(`https://favicongrabber.com/api/grab/${domain}`, { signal: globalController.signal });
          if (resp.ok) {
            const json = await resp.json();
            if (json && Array.isArray(json.icons)) {
              const sorted = json.icons.sort((a: any, b: any) => {
                const sa = parseInt((a.sizes || '0').split('x')[0]) || 0;
                const sb = parseInt((b.sizes || '0').split('x')[0]) || 0;
                const ta = (a.type || '').includes('png') ? 1 : 0;
                const tb = (b.type || '').includes('png') ? 1 : 0;
                if (ta !== tb) return tb - ta;
                return sb - sa;
              });
              for (const icon of sorted) {
                if (globalController.signal.aborted) break;
                dataUrl = await tryFetch(icon.src, globalController.signal);
                if (dataUrl) break;
              }
            }
          }
        } catch (e) {
          // 忽略错误
        }
      }

      if (dataUrl) {
        setFaviconImage(dataUrl);
        setError('');
        toast.success('已自动获取网站图标');
      } else if (globalController.signal.aborted) {
        setError('获取超时，已停止');
        toast.warning('10秒内未获取成功，已停止');
      } else {
        toast.error('自动获取图标失败，请尝试手动上传');
      }
    } finally {
      clearTimeout(globalTimer);
      setIsFetchingIcon(false);
    }
  };

   // 检查是否有可用分类
    const hasValidCategories = categories.length > 0;
   
   // 处理提交
   const handleSubmit = (e: React.FormEvent) => {
     // 检查是否有可用分类
      if (!hasValidCategories) {
        toast.error('请先创建分类才能添加收藏', {
          description: '您需要先创建至少一个分类才能添加网站收藏'
        });
        return;
      }
     e.preventDefault();
      
      if (mode === 'batch') {
        // 批量添加处理
       if (!batchUrls.trim()) {
         setError('请输入至少一个URL');
         return;
       }
       
       if (!formData.categoryId) {
         setError('请选择一个分类');
         return;
       }
       
        // 分割URL列表并过滤空行
        const urls = batchUrls
          .split('\n')
          .map(url => url.trim())
          .filter(Boolean);
        
        if (urls.length === 0) {
          setError('请输入至少一个URL');
          return;
        }
       
        // 验证并格式化所有URL
        const validUrls = urls.map(url => {
          // 添加协议（如果缺少）
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'https://' + url;
          }
          return url;
        }).filter(isValidUrl);
        
        if (validUrls.length === 0) {
          setError('没有有效的URL，请检查输入');
          return;
        }
       
       if (validUrls.length === 0) {
         setError('没有有效的URL，请检查输入');
         return;
       }
       
       setIsSubmitting(true);
       
       try {
         const tags = parseTags(tagsText);
         // 创建多个书签数据对象
          // 处理标题过长的情况 - 只保留前6个字并将完整标题添加到描述
           const bookmarksData = validUrls.map(url => {
             const fullTitle = new URL(url).hostname.replace('www.', '');
             
             return {
               ...formData,
               url,
               title: fullTitle,
               // 批量添加不设置favicon
               favicon: undefined,
               // 批量标签应用到所有URL
               tags: tags.length ? tags : undefined
             };
           });
         
           try {
             // 验证是否有书签数据
             if (!bookmarksData || bookmarksData.length === 0) {
               throw new Error('没有可添加的书签数据');
             }
             
             onSave(bookmarksData);
           toast.success(`成功添加${bookmarksData.length}个网站收藏`);
           
           // 批量添加网站成功后自动刷新网页
           setTimeout(() => {
             window.location.reload();
           }, 1000); // 延迟1秒刷新，让用户看到成功提示
           
           onClose();
           } catch (error) {
             console.error('批量添加失败:', error);
             toast.error(`批量添加失败: ${error instanceof Error ? error.message : '未知错误'}`);
             setIsSubmitting(false);
           }
         
         // 重置表单
         setBatchUrls('');
         setFormData({
           title: '',
           url: '',
           categoryId: '',
           description: '',
           favicon: ''
         });
         setTagsText('');
       } catch (error) {
         toast.error('批量添加失败，请重试');
         console.error('Failed to save bookmarks:', error);
       } finally {
         setIsSubmitting(false);
       }
     } else {
       // 单个添加处理
       // 格式化URL - 在验证前处理URL
       let formattedUrl = formData.url.trim();
       
       // 如果URL没有协议，添加https://
       if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
         // 处理www.开头的情况
         if (formattedUrl.startsWith('www.')) {
           formattedUrl = 'https://' + formattedUrl;
         } else {
           formattedUrl = 'https://' + formattedUrl;
         }
       }
       
       // 表单验证
       if (!formData.title.trim()) {
         setError('请输入网站标题');
         return;
       }
       
       if (!formData.url.trim()) {
         setError('请输入网站URL');
         return;
       }
       
       if (!isValidUrl(formattedUrl)) {
         setError('请输入有效的URL，例如：https://example.com');
         return;
       }
       
       if (!formData.categoryId) {
         setError('请选择一个分类');
         return;
       }
       
       setIsSubmitting(true);
       
       try {
         const tags = parseTags(tagsText);
         // 使用格式化后的URL创建新对象
         const bookmarkData = {
           ...formData,
           url: formattedUrl,
           // 仅使用已上传的图片（data URL）
           favicon: (faviconImage && faviconImage.trim()) ? faviconImage : undefined,
           tags: tags.length ? tags : undefined
         };
         
         onSave(bookmarkData);
         toast.success('网站收藏已保存');
         onClose();
         // 重置表单
         setFormData({
           title: '',
           url: '',
           categoryId: '',
           description: '',
           favicon: ''
         });
         setTagsText('');
       } catch (error) {
         toast.error('保存失败，请重试');
         console.error('Failed to save bookmark:', error);
       } finally {
         setIsSubmitting(false);
       }
     }
   };
  
  // 点击外部关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 下载链接选择与输入（显示在 form 标签上方） */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!formData.showDownload}
                onChange={(e) => setFormData(prev => ({ ...prev, showDownload: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              添加下载图标
            </label>
            {formData.showDownload && (
              <i className="fa-solid fa-download text-blue-600 dark:text-blue-400"></i>
            )}
          </div>
          {formData.showDownload && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                下载链接 URL
              </label>
              <input
                type="text"
                name="downloadUrl"
                value={formData.downloadUrl || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, downloadUrl: e.target.value }))}
                placeholder="例如：https://example.com/download/app.apk"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">勾选后卡片右下角会显示“下载”按钮，指向此链接。</p>
            </div>
          )}
        </div>
        
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-center">
              <i className="fa-solid fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
            {/* 图片上传区域 - 仅在单添加模式显示 */}
            {mode !== 'batch' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  网站图标设置 (可选)
                  <i className="fa-solid fa-info-circle ml-1.5 text-blue-500 text-xs" title="仅支持上传图片设置网站图标"></i>
                </label>
                {/* 新增：自动获取图标按钮 */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={autoFetchFavicon}
                    disabled={isFetchingIcon || !formData.url.trim()}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    title={formData.url.trim() ? '根据URL自动抓取网站图标并本地缓存' : '请输入URL后再尝试自动抓取'}
                  >
                    {isFetchingIcon ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                        获取中...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-magic mr-1"></i>
                        自动获取图标
                      </>
                    )}
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">将尝试多种服务并本地缓存</span>
                </div>
                
                 {/* 图片上传区域 - 无图时显示；有图时隐藏 */}
                 {!faviconImage && (
                 <div 
                   className={`border-2 border-dashed rounded-lg p-4 text-center mb-4 transition-colors cursor-pointer ${
                     isDragging 
                       ? 'border-blue-500 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20' 
                       : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                   }`}
                   onDragOver={(e) => {
                     e.preventDefault();
                     setIsDragging(true);
                   }}
                   onDragEnter={(e) => {
                     e.preventDefault();
                     setIsDragging(true);
                   }}
                   onDragLeave={() => setIsDragging(false)}
                   onDrop={(e) => {
                     e.preventDefault();
                     setIsDragging(false);
                     
                     const file = e.dataTransfer.files?.[0];
                     if (file && file.type.startsWith('image/')) {
                       // 检查文件大小
                       if (file.size > 10 * 1024 * 1024) { // 10MB
                         setError('图片大小不能超过10MB');
                         return;
                       }
                       
                       // 读取文件并转换为base64
                       const reader = new FileReader();
                       reader.onload = (event) => {
                         setFaviconImage(event.target?.result as string);
                         setError('');
                       };
                       reader.readAsDataURL(file);
                     }
                   }}
                 >
                   <input
                     type="file"
                     id="icon-upload"
                     accept="image/*"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         // 检查文件大小
                         if (file.size > 10 * 1024 * 1024) { // 10MB
                           setError('图片大小不能超过10MB');
                           return;
                         }
                       
                         // 读取文件并转换为base64
                         const reader = new FileReader();
                         reader.onload = (event) => {
                           setFaviconImage(event.target?.result as string);
                           setError('');
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                     className="hidden"
                   />
                   <label htmlFor="icon-upload" className="cursor-pointer">
                     <div className="flex flex-col items-center justify-center">
                       <i className={`fa-solid ${isDragging ? 'fa-cloud-arrow-down text-blue-500' : 'fa-cloud-upload text-gray-400'} text-2xl mb-2`}></i>
                       <p className="text-sm text-gray-600 dark:text-gray-300">{isDragging ? '释放图片以上传' : (faviconImage ? '点击上传或拖放以替换当前图片' : '点击上传图片或拖放至此处')}</p>
                       <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">支持 PNG, JPG, GIF (最大10MB)</p>
                     </div>
                   </label>
                 </div>
                 )}
                
                 {/* 图片预览 - 有上传图片时显示，可移除 */}
                 {faviconImage && (
                   <div 
                     className="mb-4 flex items-center justify-center"
                     onDragOver={(e) => {
                       e.preventDefault();
                       setIsDragging(true);
                     }}
                     onDragEnter={(e) => {
                       e.preventDefault();
                       setIsDragging(true);
                     }}
                     onDragLeave={() => setIsDragging(false)}
                     onDrop={(e) => {
                       e.preventDefault();
                       setIsDragging(false);
                       
                       const file = e.dataTransfer.files?.[0];
                       if (file && file.type.startsWith('image/')) {
                         // 检查文件大小
                         if (file.size > 10 * 1024 * 1024) { // 10MB
                           setError('图片大小不能超过10MB');
                           return;
                         }
                         
                         // 读取文件并转换为base64
                         const reader = new FileReader();
                         reader.onload = (event) => {
                           setFaviconImage(event.target?.result as string);
                           setError('');
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   >
                     <div className={`relative transition-all ${isDragging ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                      <img 
                          src={faviconImage} 
                          alt="预览" 
                          className="w-32 h-32 object-contain border border-gray-200 dark:border-gray-700 rounded-lg"
                        />
                       <button 
                         type="button"
                         onClick={() => setFaviconImage('')}
                         className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full p-1 border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-red-500"
                         title="移除图片"
                       >
                         <i className="fa-solid fa-times"></i>
                       </button>
                       {isDragging && (
                         <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                           <i className="fa-solid fa-exchange text-white text-2xl"></i>
                         </div>
                       )}
                       <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                         {isDragging ? '释放以替换图片' : '可拖放新图片替换'}
                       </p>
                     </div>
                   </div>
                 )}
              </div>
            ) : (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                  <i className="fa-solid fa-info-circle mr-2"></i>批量图标设置
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  批量添加时将使用默认网站图标。添加完成后，您可以通过编辑单个收藏来设置自定义图标。
                </p>
              </div>
            )}
          
           {mode !== 'batch' && (
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 网站标题 <span className="text-red-500">*</span>
               </label>
               <input
                 type="text"
                 name="title"
                 value={formData.title}
                 onChange={handleChange}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="例如：网易云音乐"
               />
              </div>
            )}
            {mode === 'batch' ? (
              <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 批量URL <span className="text-red-500">*</span>
               </label>
               <textarea
                 name="batchUrls"
                 value={batchUrls}
                 onChange={(e) => {
                   setBatchUrls(e.target.value);
                   // 输入变更时可清理错误提示，避免持续红字干扰
                 }}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="请输入多个URL，每行一个&#10;例如：&#10;https://music.163.com&#10;https://www.youtube.com&#10;https://www.spotify.com"
                 rows={6}
                />
             </div>
           ) : (
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 网站URL <span className="text-red-500">*</span>
               </label>
               <input
                 type="text"
                 name="url"
                 value={formData.url}
                 onChange={handleChange}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="例如：https://music.163.com"
               />
             </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分类 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择分类</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              {onRequestAddCategory && (
                <button
                  type="button"
                  onClick={onRequestAddCategory}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-300 transition-colors whitespace-nowrap"
                >
                  <i className="fa-solid fa-plus mr-1.5"></i>
                  创建新分类
                </button>
              )}
            </div>
          </div>
           
            {mode !== 'batch' && (
              <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 网站描述 (可选)
               </label>
               <textarea
                 name="description"
                 value={formData.description}
                 onChange={handleChange}
                 rows={3}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="描述这个网站的特点或用途..."
               ></textarea>
             </div>
           )}

          {/* 新增：标签输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标签 (可选)
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={e => setTagsText(e.target.value)}
              onKeyDown={e => {
                // 回车也作为分隔提交的一部分 —— 不阻止提交，主要用于输入提示
                if (e.key === 'Enter') {
                  // 阻止在批量模式下回车换行触发提交
                  e.preventDefault();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={mode === 'batch' ? '这些标签将应用到所有URL，例如：音乐, 视频, 学习' : '用逗号、空格或回车分隔，如：音乐, 视频, 学习'}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              支持中文逗号、英文逗号、空格或回车分隔；会自动去重。
            </p>
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
              type="button"
              aria-label="刷新页面"
              onClick={() => window.location.reload()}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              刷新页面
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
             ) : editingBookmark ? (
                '更新收藏'
              ) : mode === 'batch' ? (
                '批量添加'
             ) : (
               '添加收藏'
             )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBookmarkModal;

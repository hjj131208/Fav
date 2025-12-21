import React from 'react';
import { QuestionCircleIcon, TimesIcon } from '@/components/icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverlayClick: (e: React.MouseEvent) => void;
}

const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  onOverlayClick
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={onOverlayClick}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            <QuestionCircleIcon className="text-blue-600 dark:text-blue-400 w-5 h-5 mr-2" />使用帮助
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <TimesIcon className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 text-sm">1</span>
              项目安装与启动
            </h4>
            <div className="pl-8 space-y-2 text-gray-700 dark:text-gray-300">
              <p>• 克隆项目后，安装依赖：<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">npm install</code></p>
              <p>• 启动开发服务器：<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">npm run dev</code></p>
              <p>• 构建项目：<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">npm run build</code></p>
              <p>• 部署到Cloudflare：<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">npm run deploy</code></p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 text-sm">2</span>
              创建分类
            </h4>
            <div className="pl-8 space-y-2 text-gray-700 dark:text-gray-300">
              <p>• 在左侧边栏点击"添加分类"按钮</p>
              <p>• 输入分类名称（例如"音乐网站"）</p>
              <p>• 选择一个图标和颜色来标识这个分类</p>
              <p>• 点击"添加分类"完成创建</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 text-sm">3</span>
              添加网站收藏
            </h4>
            <div className="pl-8 space-y-2 text-gray-700 dark:text-gray-300">
              <p>• 点击顶部导航栏中的"添加网站"按钮</p>
              <p>• 填写网站标题、URL地址（必须以http://或https://开头）</p>
              <p>• 选择一个分类（"常用网站"分类仅由系统自动维护，无法手动选择）</p>
              <p>• 可选：添加网站描述</p>
              <p>• 可选：支持本地图片上传作为网站图标</p>
              <p>• 点击"添加收藏"完成添加</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 text-sm">4</span>
              管理收藏
            </h4>
            <div className="pl-8 space-y-2 text-gray-700 dark:text-gray-300">
              <p>• <strong>查看收藏</strong>：点击左侧边栏的分类名称查看对应分类下的收藏</p>
              <p>• <strong>搜索收藏</strong>：使用顶部的搜索框按标题或URL搜索收藏</p>
              <p>• <strong>编辑收藏</strong>：点击收藏卡片上的编辑图标修改收藏信息</p>
              <p>• <strong>删除收藏</strong>：点击收藏卡片上的删除图标移除收藏</p>
              <p>• <strong>访问网站</strong>：点击收藏卡片上的"访问网站"按钮在新标签页打开网站</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 text-sm">5</span>
              网页搜索
            </h4>
            <div className="pl-8 space-y-2 text-gray-700 dark:text-gray-300">
              <p>• 在主页面顶部的搜索框中输入搜索关键词</p>
              <p>• 可以通过左侧下拉菜单选择不同的搜索引擎（百度、谷歌、必应等）</p>
              <p>• 选择后点击搜索按钮或按回车键进行搜索</p>
              <p>• 系统会记住您偏好的搜索引擎，下次访问时自动选择</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 text-sm">6</span>
              移动端使用
            </h4>
            <div className="pl-8 space-y-2 text-gray-700 dark:text-gray-300">
              <p>• <strong>打开分类菜单</strong>：点击左上角的汉堡菜单图标(≡)打开分类侧边栏</p>
              <p>• <strong>关闭侧边栏</strong>：点击侧边栏外的遮罩层或再次点击汉堡菜单图标</p>
              <p>• 移动端界面针对小屏幕进行了优化，主要功能与桌面版保持一致</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-2 text-sm">7</span>
              管理分类
            </h4>
            <div className="pl-8 space-y-2 text-gray-700 dark:text-gray-300">
              <p>• <strong>编辑分类</strong>：右键点击左侧边栏的分类名称，选择"编辑分类"</p>
              <p>• <strong>删除分类</strong>：右键点击左侧边栏的分类名称，选择"删除分类"</p>
              <p>• 删除分类后，该分类下的所有收藏将被移动到"其他网站"分类</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

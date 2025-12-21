import React, { useState, useEffect } from "react";

interface NoteModalProps {
  isOpen: boolean;
  initialText?: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ isOpen, initialText = "", onSave, onClose }) => {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) {
      setText(initialText || "");
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={(e) => {
        // 点击遮罩：阻止事件冒泡到卡片，自动保存并关闭
        e.stopPropagation();
        onSave(text);
        onClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">记事本</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">为该收藏添加备注或记录信息</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="在这里输入备注..."
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave(text)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;

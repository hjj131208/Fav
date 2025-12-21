import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // 从localStorage获取值或使用初始值 - 使用惰性初始化函数
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return initialValue;
    }
  });

  // 使用useCallback确保函数引用稳定（且避免捕获旧的 value）
  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      try {
        // 允许 newValue 是一个函数，类似于setState；基于最新的 prev 计算
        const valueToStore = newValue instanceof Function 
          ? (newValue as (prev: T) => T)(prev)
          : newValue;

        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        // 写入失败时保持原值
        return prev;
      }
    });
  }, [key]);

  // 监听localStorage中对应key的变化，实现跨标签页同步
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue;
          setValue(newValue);
        } catch (error) {
          console.error('Error parsing localStorage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [value, setStoredValue];
}
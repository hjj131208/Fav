import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 从URL中提取域名并规范化处理 (去除协议前缀和www.) 
export function getDomain(url: string): string {
  try {
    // 添加默认协议以处理没有协议前缀的URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    const urlObj = new URL(normalizedUrl);
    // 删除www.前缀并转换为小写
    return urlObj.hostname.replace(/^www\./i, '').toLowerCase();
  } catch (error) {
    console.error(`获取域名失败: ${url}`, error);
    return '';
  }
}

// 检查URL域名是否已存在于书签列表
export function isDomainExists(url: string, existingBookmarks: {url: string}[]): boolean {
 if (!url || existingBookmarks.length ===0) return false;
 
 const newDomain = getDomain(url);
 if (!newDomain) return false;
 
 return existingBookmarks.some(bookmark => {
   try {
     const existingDomain = getDomain(bookmark.url);
     return existingDomain && existingDomain.toLowerCase() === newDomain.toLowerCase();
   } catch (error) {
     console.error(`检查域名失败: ${bookmark.url}`, error);
     return false;
   }
 });
}

export interface SearchEngine {
    id: string;
    name: string;
    icon: string;
    url: string;
}

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
    {
        id: "google",
        name: "谷歌",
        icon: "fa-google",
        url: "https://www.google.com/search?q="
    },
    {
        id: "baidu",
        name: "百度",
        icon: "fa-baidu",
        url: "https://www.baidu.com/s?wd="
    },
    {
        id: "bing",
        name: "微软",
        icon: "fa-bing",
        url: "https://www.bing.com/search?q="
    },
    {
        id: "github",
        name: "GitHub",
        icon: "fa-github",
        url: "https://github.com/search?q="
    }
];

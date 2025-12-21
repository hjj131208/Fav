
export type LinkHealthStatus = "ok" | "dead";
type InternalLinkHealthStatus = LinkHealthStatus | "unknown";

export interface LinkCheckResult {
    id: string;
    url: string;
    status: LinkHealthStatus;
    error?: string;
}

export interface BatchCheckOptions {
    concurrency?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    cacheTtlMs?: number;
    forceRefresh?: boolean;
}

function classifyResponse(resp: Response): InternalLinkHealthStatus {
    if ((resp as any)?.type === "opaque") return "unknown";
    const status = resp.status;
    if (status === 404 || status === 410) return "dead";
    if (status === 401 || status === 403) return "dead";
    if (status >= 500) return "dead";
    if (status >= 200 && status < 400) return "ok";
    return "unknown";
}

function normalizeUrl(rawUrl: string): string | null {
    const trimmed = (rawUrl || "").trim();
    if (!trimmed) return null;

    try {
        const u = new URL(trimmed);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        return u.toString();
    } catch {
        try {
            const u = new URL(`https://${trimmed}`);
            return u.toString();
        } catch {
            return null;
        }
    }
}

function isAbortError(error: unknown): boolean {
    return (
        (error instanceof DOMException && error.name === "AbortError") ||
        (typeof error === "object" &&
            error !== null &&
            "name" in error &&
            (error as any).name === "AbortError")
    );
}

function mergeSignals(externalSignal?: AbortSignal, internalController?: AbortController): AbortSignal {
    if (!externalSignal || !internalController) return internalController?.signal ?? externalSignal!;
    if (externalSignal.aborted) internalController.abort();
    externalSignal.addEventListener("abort", () => internalController.abort(), { once: true });
    return internalController.signal;
}

function readCache(): Record<string, { status: LinkHealthStatus; checkedAt: number }> {
    try {
        const raw = localStorage.getItem("linkHealthCache:v2");
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        return parsed;
    } catch {
        return {};
    }
}

function writeCache(cache: Record<string, { status: LinkHealthStatus; checkedAt: number }>) {
    try {
        localStorage.setItem("linkHealthCache:v2", JSON.stringify(cache));
    } catch {
        return;
    }
}

async function checkLinkHealthViaApi(url: string, options?: { timeoutMs?: number; signal?: AbortSignal; mode?: "auto" | "http" | "tcp" }): Promise<LinkHealthStatus | null> {
    const normalized = normalizeUrl(url);
    if (!normalized) return null;

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 8000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = mergeSignals(options?.signal, controller);

    const apiBase = (import.meta as any)?.env?.DEV ? "http://localhost:5000/api/link-health" : "/api/link-health";
    const mode = options?.mode ?? "auto";
    const apiUrl = `${apiBase}?url=${encodeURIComponent(normalized)}&mode=${encodeURIComponent(mode)}&timeoutMs=${encodeURIComponent(String(timeoutMs))}`;

    try {
        const resp = await fetch(apiUrl, { method: "GET", cache: "no-store", signal });
        if (!resp.ok) return null;
        const data = await resp.json().catch(() => null);
        const status = data?.status as string | undefined;
        if (status === "ok" || status === "dead") return status;
        return null;
    } catch (e) {
        if (isAbortError(e)) return null;
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export async function checkLinkHealth(url: string, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<LinkHealthStatus> {
    const normalized = normalizeUrl(url);
    if (!normalized) return "dead";

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 8000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = mergeSignals(options?.signal, controller);

    try {
        const apiStatus = await checkLinkHealthViaApi(normalized, { timeoutMs: Math.min(timeoutMs, 4500), signal, mode: "auto" });
        if (apiStatus) return apiStatus;

        try {
            const resp = await fetch(normalized, {
                method: "HEAD",
                redirect: "follow",
                cache: "no-store",
                signal
            });
            const classified = classifyResponse(resp);
            if (classified !== "unknown") return classified;
            if (resp.status === 405) {
                throw new Error("HEAD not allowed");
            }
            return "dead";
        } catch (e) {
            if (isAbortError(e)) return "dead";

            try {
                const resp = await fetch(normalized, {
                    method: "GET",
                    redirect: "follow",
                    cache: "no-store",
                    signal
                });
                const classified = classifyResponse(resp);
                if (classified !== "unknown") return classified;
                return "dead";
            } catch (e2) {
                if (isAbortError(e2)) return "dead";
                return "dead";
            }
        }
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 批量检查链接
 * @param bookmarks 书签列表
 * @param onProgress 进度回调 (current, total)
 * @returns 失效的链接 ID 列表
 */
export async function batchCheckLinks(
    bookmarks: { id: string; url: string }[], 
    onProgress?: (current: number, total: number) => void,
    options?: BatchCheckOptions
): Promise<LinkCheckResult[]> {
    const total = bookmarks.length;
    const concurrency = Math.max(1, Math.min(options?.concurrency ?? 20, total || 1));
    const timeoutMs = options?.timeoutMs ?? 5000;
    const cacheTtlMs = options?.cacheTtlMs ?? 12 * 60 * 60 * 1000;
    const externalSignal = options?.signal;
    const forceRefresh = options?.forceRefresh ?? false;

    const cache = readCache();
    const now = Date.now();

    const resultsById = new Map<string, LinkCheckResult>();
    const queue: Array<{ id: string; url: string }> = [];

    for (const b of bookmarks) {
        const normalized = normalizeUrl(b.url);
        if (!normalized) {
            resultsById.set(b.id, { id: b.id, url: b.url, status: "dead" });
            continue;
        }
        const cached = cache[normalized];
        if (!forceRefresh && cached && now - cached.checkedAt <= cacheTtlMs) {
            resultsById.set(b.id, { id: b.id, url: b.url, status: cached.status });
            continue;
        }
        queue.push({ id: b.id, url: normalized });
    }

    let processed = resultsById.size;
    onProgress?.(processed, total);

    let cursor = 0;

    async function worker() {
        while (true) {
            if (externalSignal?.aborted) break;
            const index = cursor++;
            if (index >= queue.length) break;
            const item = queue[index];

            const status = await checkLinkHealth(item.url, { timeoutMs, signal: externalSignal });
            resultsById.set(item.id, { id: item.id, url: item.url, status });
            cache[item.url] = { status, checkedAt: Date.now() };

            processed++;
            onProgress?.(processed, total);
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    if (!externalSignal?.aborted) {
        writeCache(cache);
    }

    return bookmarks.map(b => resultsById.get(b.id) ?? { id: b.id, url: b.url, status: "dead" });
}

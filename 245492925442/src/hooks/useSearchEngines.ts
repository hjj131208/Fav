import { useState, useEffect } from "react";
import { DEFAULT_SEARCH_ENGINES, SearchEngine } from "@/config/searchEngines";

export type { SearchEngine };

export function useSearchEngines() {
    const [selectedSearchEngine, setSelectedSearchEngine] = useState("google");
    const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(DEFAULT_SEARCH_ENGINES);

    // Load engines and selection from localStorage
    useEffect(() => {
        const savedEngines = localStorage.getItem('searchEngines');
        if (savedEngines) {
            try {
                const parsed = JSON.parse(savedEngines);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSearchEngines(parsed);
                }
            } catch (e) {
                console.error("Failed to parse saved search engines", e);
            }
        }

        const savedSelection = localStorage.getItem('selectedSearchEngine');
        if (savedSelection) {
            setSelectedSearchEngine(savedSelection);
        }
    }, []);

    const handleSearchEngineChange = (engineId: string) => {
        setSelectedSearchEngine(engineId);
        localStorage.setItem('selectedSearchEngine', engineId);
    };

    const performSearch = (query: string) => {
        if (!query.trim()) return;
        
        const engine = searchEngines.find(eng => eng.id === selectedSearchEngine) || searchEngines[0];
        if (engine) {
            window.open(engine.url + encodeURIComponent(query.trim()), "_blank");
        }
    };

    const addSearchEngine = (engine: SearchEngine) => {
        const newEngines = [...searchEngines, engine];
        setSearchEngines(newEngines);
        localStorage.setItem('searchEngines', JSON.stringify(newEngines));
    };

    const removeSearchEngine = (id: string) => {
        if (searchEngines.length <= 1) {
            return; // Prevent deleting the last engine
        }
        const newEngines = searchEngines.filter(e => e.id !== id);
        setSearchEngines(newEngines);
        localStorage.setItem('searchEngines', JSON.stringify(newEngines));
        
        if (selectedSearchEngine === id) {
            const nextEngine = newEngines[0];
            setSelectedSearchEngine(nextEngine.id);
            localStorage.setItem('selectedSearchEngine', nextEngine.id);
        }
    };
    
    const updateSearchEngine = (updatedEngine: SearchEngine) => {
        const newEngines = searchEngines.map(e => e.id === updatedEngine.id ? updatedEngine : e);
        setSearchEngines(newEngines);
        localStorage.setItem('searchEngines', JSON.stringify(newEngines));
    };

    const resetSearchEngines = () => {
        setSearchEngines(DEFAULT_SEARCH_ENGINES);
        localStorage.setItem('searchEngines', JSON.stringify(DEFAULT_SEARCH_ENGINES));
        setSelectedSearchEngine(DEFAULT_SEARCH_ENGINES[0].id);
        localStorage.setItem('selectedSearchEngine', DEFAULT_SEARCH_ENGINES[0].id);
    };

    return {
        searchEngines,
        selectedSearchEngine,
        handleSearchEngineChange,
        performSearch,
        addSearchEngine,
        removeSearchEngine,
        updateSearchEngine,
        resetSearchEngines
    };
}

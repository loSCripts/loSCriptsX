export interface ApiKey {
    key: string;
    searchEngineId: string;
    requestCount: number;
    lastResetDate: string;
}

function loadApiKeys(): ApiKey[] {
    const keys: ApiKey[] = [];
    
    // Charger jusqu'à 10 paires de clés
    for (let i = 1; i <= 10; i++) {
        const apiKey = import.meta.env[`VITE_GOOGLE_API_KEY_${i}`];
        const searchEngineId = import.meta.env[`VITE_GOOGLE_SEARCH_ENGINE_ID_${i}`];
        
        if (apiKey && searchEngineId) {
            keys.push({
                key: apiKey,
                searchEngineId: searchEngineId,
                requestCount: 0,
                lastResetDate: new Date().toDateString()
            });
        }
    }
    
    if (keys.length === 0) {
        console.error('Aucune clé API trouvée dans le fichier .env');
    }
    
    return keys;
}

export const API_KEYS = loadApiKeys();

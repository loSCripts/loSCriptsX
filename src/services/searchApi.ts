import { API_KEYS, ApiKey } from '../config/apiKeys';

const DAILY_LIMIT = 99; // 33 recherches * 3 requêtes par recherche
const REQUESTS_PER_SEARCH = 3;
let currentApiIndex = 0;
let cachedResults: { [query: string]: SearchResult[] } = {};

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    thumbnail?: string;
}

// Charger le compteur depuis le localStorage
function loadRequestCounts() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('apiRequestCounts');
    let counts = stored ? JSON.parse(stored) : {};
    
    if (counts.date !== today) {
        counts = { date: today };
        API_KEYS.forEach((_, index) => {
            counts[`api${index}`] = 0;
        });
    }
    return counts;
}

// Sauvegarder le compteur dans le localStorage
function saveRequestCount(apiIndex: number, count: number) {
    const counts = loadRequestCounts();
    counts[`api${apiIndex}`] = count;
    localStorage.setItem('apiRequestCounts', JSON.stringify(counts));
}

// Obtenir la prochaine clé API disponible
function getNextAvailableApi(): ApiKey | null {
    if (API_KEYS.length === 0) return null;

    const counts = loadRequestCounts();
    
    // Vérifier d'abord la clé actuelle
    if (counts[`api${currentApiIndex}`] < DAILY_LIMIT) {
        return API_KEYS[currentApiIndex];
    }

    // Chercher la prochaine clé disponible
    const startIndex = currentApiIndex;
    do {
        currentApiIndex = (currentApiIndex + 1) % API_KEYS.length;
        if (counts[`api${currentApiIndex}`] < DAILY_LIMIT) {
            return API_KEYS[currentApiIndex];
        }
    } while (currentApiIndex !== startIndex);

    return null;
}

export async function performSearch(query: string): Promise<SearchResult[]> {
    const trimmedQuery = query.trim().toLowerCase();
    if (cachedResults[trimmedQuery]) {
        return cachedResults[trimmedQuery];
    }

    const api = getNextAvailableApi();
    if (!api) {
        const similarResults = Object.entries(cachedResults)
            .find(([key]) => key.includes(trimmedQuery) || trimmedQuery.includes(key));
        
        if (similarResults) {
            return similarResults[1];
        }
        return [];
    }

    try {
        const requests = [1, 11, 21].map(startIndex => 
            fetch(
                `https://www.googleapis.com/customsearch/v1?key=${api.key}&cx=${api.searchEngineId}&q=${encodeURIComponent(query)}&start=${startIndex}&num=10`
            ).then(async resp => {
                if (!resp.ok) {
                    const error = await resp.json();
                    throw new Error('Erreur lors de la recherche');
                }
                return resp.json();
            })
        );

        const responses = await Promise.all(requests);
        
        if (responses.some(r => r.error)) {
            throw new Error('Erreur dans les réponses de l\'API');
        }

        const allResults = responses.flatMap(data => 
            data.items?.map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src
            })) || []
        );

        cachedResults[trimmedQuery] = allResults;
        
        // Mettre à jour le compteur dans le localStorage
        const counts = loadRequestCounts();
        counts[`api${currentApiIndex}`] += REQUESTS_PER_SEARCH;
        localStorage.setItem('apiRequestCounts', JSON.stringify(counts));

        return allResults;
    } catch (error) {
        return [];
    }
}

export function getSuggestions(query: string, callback: (data: string[]) => void) {
    if (!query.trim()) {
        callback([]);
        return;
    }

    const script = document.createElement('script');
    const callbackName = 'googleSuggestCallback_' + Math.round(Math.random() * 1000000);

    // Définir la fonction de callback globale
    (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName]; // Nettoyer
        document.body.removeChild(script); // Nettoyer
        callback(data[1] || []); // Renvoyer les suggestions
    };

    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(query)}&callback=${callbackName}`;
    document.body.appendChild(script);
}

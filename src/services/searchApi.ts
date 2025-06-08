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
    // Nettoyer et valider la requête
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
        return [];
    }

    // Vérifier le cache
    if (cachedResults[trimmedQuery]) {
        console.log('Résultats trouvés dans le cache pour:', trimmedQuery);
        return cachedResults[trimmedQuery];
    }

    const api = getNextAvailableApi();
    if (!api) {
        console.log('Aucune API disponible, recherche dans le cache...');
        const similarResults = Object.entries(cachedResults)
            .find(([key]) => key.includes(trimmedQuery) || trimmedQuery.includes(key));
        
        if (similarResults) {
            return similarResults[1];
        }
        return [];
    }

    try {
        console.log('Démarrage de la recherche pour:', trimmedQuery);
        
        // Encoder correctement la requête pour l'URL
        const encodedQuery = encodeURIComponent(trimmedQuery);
        
        const requests = [1, 11, 21].map(startIndex => {
            const url = `https://www.googleapis.com/customsearch/v1?key=${api.key}&cx=${api.searchEngineId}&q=${encodedQuery}&start=${startIndex}&num=10`;
            console.log('Requête à:', url);
            
            return fetch(url)
                .then(async resp => {
                    if (!resp.ok) {
                        const error = await resp.json();
                        console.error('Erreur API:', error);
                        throw new Error(`Erreur lors de la recherche: ${error.error?.message || 'Erreur inconnue'}`);
                    }
                    return resp.json();
                });
        });

        const responses = await Promise.all(requests);
        
        if (responses.some(r => r.error)) {
            console.error('Erreur dans les réponses:', responses.filter(r => r.error));
            throw new Error('Erreur dans les réponses de l\'API');
        }

        const allResults = responses.flatMap(data => {
            if (!data.items) {
                console.log('Pas de résultats pour cette page');
                return [];
            }
            
            return data.items.map((item: any) => ({
                title: item.title || '',
                link: item.link || '',
                snippet: item.snippet || '',
                thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src || ''
            }));
        });

        console.log(`${allResults.length} résultats trouvés pour:`, trimmedQuery);

        // Mettre en cache uniquement si nous avons des résultats
        if (allResults.length > 0) {
            cachedResults[trimmedQuery] = allResults;
            
            // Mettre à jour le compteur dans le localStorage
            const counts = loadRequestCounts();
            counts[`api${currentApiIndex}`] += REQUESTS_PER_SEARCH;
            localStorage.setItem('apiRequestCounts', JSON.stringify(counts));
        }

        return allResults;
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        throw error; // Propager l'erreur pour une meilleure gestion
    }
}

export function getSuggestions(query: string, callback: (data: string[]) => void) {
    // Nettoyer la requête
    const cleanQuery = query.trim();
    if (!cleanQuery) {
        callback([]);
        return;
    }

    // Limiter la longueur de la requête
    const maxQueryLength = 50;
    const truncatedQuery = cleanQuery.slice(0, maxQueryLength);

    // Supprimer les anciens scripts
    const oldScripts = document.querySelectorAll('script[data-suggestion-script]');
    oldScripts.forEach(script => script.remove());

    // Créer un nouveau script avec un ID unique
    const script = document.createElement('script');
    script.setAttribute('data-suggestion-script', 'true');
    const scriptId = `suggestion-${Date.now()}`;
    script.id = scriptId;

    // Utiliser un timestamp pour le nom du callback
    const callbackName = `googleSuggestCallback_${Date.now()}`;

    // Définir un timeout pour le nettoyage
    const timeout = setTimeout(() => {
        cleanup();
        callback([]);
    }, 3000);

    // Fonction de nettoyage
    const cleanup = () => {
        clearTimeout(timeout);
        const scriptElement = document.getElementById(scriptId);
        if (scriptElement) {
            scriptElement.remove();
        }
        if (callbackName in window) {
            delete (window as any)[callbackName];
        }
    };

    try {
        // Définir la fonction de callback
        (window as any)[callbackName] = (data: any) => {
            cleanup();
            try {
                if (!Array.isArray(data) || !Array.isArray(data[1])) {
                    callback([]);
                    return;
                }
                const suggestions = data[1].filter((item: any) => 
                    typeof item === 'string' && item.length > 0
                );
                callback(suggestions);
            } catch (error) {
                console.error('Erreur lors du traitement des suggestions:', error);
                callback([]);
            }
        };

        // Configurer le script
        script.src = `https://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(truncatedQuery)}&callback=${callbackName}`;
        script.onerror = () => {
            cleanup();
            callback([]);
        };

        // Ajouter le script au document
        document.body.appendChild(script);
    } catch (error) {
        console.error('Erreur lors de la création des suggestions:', error);
        callback([]);
    }
}

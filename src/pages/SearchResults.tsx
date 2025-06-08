import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { performSearch, SearchResult } from '../services/searchApi';
import SearchBar from '../components/SearchBar';
import { useAffiliateLink } from '../hooks/useAffiliateLink';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const { handleLinkClick } = useAffiliateLink();
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        navigate('/');
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await performSearch(query);
        setResults(searchResults);
        setError(null);
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        setError(error instanceof Error ? error.message : 'Une erreur est survenue');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchResults();
  }, [query, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 py-3 px-4 mb-6 lg:mb-2">
        <div className="max-w-6xl mx-auto lg:max-w-none lg:ml-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-300 hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <SearchBar initialQuery={query} showInHeader={true} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:max-w-[652px] lg:ml-44">
        {isSearching && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!isSearching && !error && (
          <div className="space-y-6">
            {results.length === 0 ? (
              <p className="text-gray-400">Aucun résultat trouvé pour cette recherche.</p>
            ) : (
              results.map((result, index) => (
                <div
                  key={index}
                  className="lg:bg-transparent lg:backdrop-blur-none lg:border-none lg:p-0 lg:hover:bg-transparent bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 sm:p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <a
                        href={result.link}
                        onClick={(e) => handleLinkClick(result.link, e)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-medium text-base lg:text-lg mb-1 flex items-start group"
                      >
                        <span className="truncate">{result.title}</span>
                        <ExternalLink className="flex-shrink-0 w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <p className="text-gray-400 text-xs lg:text-sm mb-1">{result.link}</p>
                      <p className="text-gray-300 lg:text-gray-400 text-sm lg:text-base line-clamp-2 lg:line-clamp-none">{result.snippet}</p>
                    </div>
                    {result.thumbnail && (
                      <img
                        src={result.thumbnail}
                        alt=""
                        className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
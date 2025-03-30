import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, MicOff } from 'lucide-react';
import { getSuggestions } from '../services/searchApi';

interface SearchBarProps {
  initialQuery?: string;
  showInHeader?: boolean;
}

// Types pour la reconnaissance vocale
interface SpeechRecognitionEvent {
  results: { [index: number]: { transcript: string }[] };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: new () => SpeechRecognition;
  SpeechRecognition?: new () => SpeechRecognition;
}

const SearchBar: React.FC<SearchBarProps> = ({ initialQuery = '', showInHeader = false }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setMicSupported(true);
    }
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Gestion des suggestions
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const words = value.trim().split(/\s+/);
      if (words.length <= 3 && value.length >= 2) {
        getSuggestions(value, (suggestions) => {
          setSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        });
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);
  };

  const startListening = () => {
    if (!micSupported) return;

    const windowWithSpeech = window as IWindow;
    const SpeechRecognition = windowWithSpeech.webkitSpeechRecognition || windowWithSpeech.SpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('La reconnaissance vocale n\'est pas supportée');
      return;
    }

    const recognition = new SpeechRecognition();
    
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      navigate(`/search?q=${encodeURIComponent(transcript.trim())}`);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Erreur de reconnaissance vocale:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const containerClasses = showInHeader
    ? "w-full max-w-xl mx-auto"
    : "w-full max-w-3xl mx-auto px-4 sm:px-6 relative z-10";

  return (
    <div className={containerClasses}>
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
          placeholder="Rechercher..."
          className="w-full h-12 px-4 pr-12 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm"
        />
        <div className="absolute right-0 top-0 h-full flex items-center gap-2 pr-3">
          {micSupported && (
            <button
              type="button"
              onClick={startListening}
              className="p-1 hover:text-blue-400 transition-colors"
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
          <button
            type="submit"
            className="p-1 hover:text-blue-400 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute w-full mt-2 py-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-lg z-50">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(suggestion);
                  setShowSuggestions(false);
                  navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;

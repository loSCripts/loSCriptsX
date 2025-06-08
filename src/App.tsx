import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, Sparkles, ArrowRight, Shield, Globe2, Newspaper, Bot, Settings, X, Plus, ExternalLink, Sun, Moon, Menu, ArrowUpRight, ThumbsUp, User, Clock, Mic, MicOff, FolderOpen, Wrench, Play } from 'lucide-react';
import { fetchTopStories, Story } from './services/hackerNewsApi';
import { getSuggestions } from './services/searchApi';

function App() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [news, setNews] = useState<Story[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showVpnPopup, setShowVpnPopup] = useState(false);
  const [showVpnVideo, setShowVpnVideo] = useState(false);
  const [vpnClickCount, setVpnClickCount] = useState(0);
  const [vpnExtensionInstalled, setVpnExtensionInstalled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    shortcutIndex: number;
  }>({
    show: false,
    x: 0,
    y: 0,
    shortcutIndex: -1
  });

  const [shortcuts, setShortcuts] = useState<Array<{ name: string; url: string; shortcutKey: string; iconUrl: string }>>(() => {
    const saved = localStorage.getItem('shortcuts');
    return saved ? JSON.parse(saved) : [
      { name: 'YouTube', url: 'https://youtube.com', shortcutKey: 'y', iconUrl: '' },
      { name: 'X', url: 'https://x.com', shortcutKey: 'x', iconUrl: '' }
    ];
  });

  const searchResultsRef = useRef<HTMLDivElement>(null);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout>>();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Détecter si c'est un ordinateur (pas basé sur la taille d'écran)
  useEffect(() => {
    const checkIfDesktop = () => {
      // Vérifier si c'est un appareil tactile
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Vérifier le user agent pour détecter les appareils mobiles
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUserAgent = mobileRegex.test(navigator.userAgent);
      
      // Vérifier si c'est un ordinateur (pas tactile et pas mobile dans user agent)
      const isDesktopDevice = !isTouchDevice && !isMobileUserAgent;
      
      setIsDesktop(isDesktopDevice);
    };

    checkIfDesktop();
  }, []);

  // Vérifier si l'extension VPN est installée
  useEffect(() => {
    const checkVpnExtension = () => {
      if (!isDesktop) return;
      
      // Vérifier si l'extension 1ClickVPN est installée
      const extensionId = 'pphgdbgldlmicfdkhondlafkiomnelnk';
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          chrome.runtime.sendMessage(extensionId, { action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
              setVpnExtensionInstalled(false);
            } else {
              setVpnExtensionInstalled(true);
            }
          });
        } catch (error) {
          setVpnExtensionInstalled(false);
        }
      }
    };

    checkVpnExtension();
    
    // Vérifier périodiquement si l'extension est installée
    const interval = setInterval(checkVpnExtension, 5000);
    return () => clearInterval(interval);
  }, [isDesktop]);

  // Gérer le clic sur le bouton VPN
  const handleVpnClick = () => {
    if (!isDesktop) return;
    
    if (vpnExtensionInstalled) {
      // Activer l'extension VPN
      const extensionId = 'pphgdbgldlmicfdkhondlafkiomnelnk';
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          chrome.runtime.sendMessage(extensionId, { action: 'toggle' });
        } catch (error) {
          console.error('Erreur lors de l\'activation du VPN:', error);
        }
      }
    } else {
      // Incrémenter le compteur de clics
      setVpnClickCount(prev => prev + 1);
      // Afficher la popup d'installation
      setShowVpnPopup(true);
      setShowVpnVideo(false);
    }
  };

  // Charger les favicons
  useEffect(() => {
    const loadFavicons = async () => {
      const updatedShortcuts = await Promise.all(
        shortcuts.map(async (shortcut) => {
          if (!shortcut.iconUrl) {
            const domain = new URL(shortcut.url).hostname;
            try {
              const duckDuckGoUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
              const response = await fetch(duckDuckGoUrl);
              if (response.ok) {
                return { ...shortcut, iconUrl: duckDuckGoUrl };
              }
            } catch (error) {
              console.error('Erreur de chargement favicon:', error);
            }
            // Fallback vers Google Favicon
            return { ...shortcut, iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64` };
          }
          return shortcut;
        })
      );
      setShortcuts(updatedShortcuts);
      localStorage.setItem('shortcuts', JSON.stringify(updatedShortcuts));
    };

    loadFavicons();
  }, []);

  // Fermer le menu contextuel au clic ailleurs
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(prev => ({ ...prev, show: false }));
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Vérifier si l'application est installable
  useEffect(() => {
    const checkInstallable = async () => {
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          setIsInstallable(relatedApps.length === 0);
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'installation:', error);
        }
      }
    };
    checkInstallable();
  }, []);

  // Gérer les raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ne pas déclencher si l'utilisateur tape dans un champ de texte
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      shortcuts.forEach(shortcut => {
        if (shortcut.shortcutKey && e.key.toLowerCase() === shortcut.shortcutKey.toLowerCase()) {
          window.open(shortcut.url, '_blank', 'noopener,noreferrer');
        }
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);

  useEffect(() => {
    // Vérifier si la reconnaissance vocale est supportée
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setMicSupported(true);
    }
  }, []);

  const startListening = () => {
    if (!micSupported) return;

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      handleSearch({ target: { value: transcript } } as any);
    };

    recognition.onerror = (event) => {
      console.error('Erreur de reconnaissance vocale:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      show: true,
      x: 'touches' in e ? rect.left : (e as React.MouseEvent).clientX,
      y: 'touches' in e ? rect.bottom : (e as React.MouseEvent).clientY,
      shortcutIndex: index
    });
  };

  const deleteShortcut = (index: number) => {
    const updatedShortcuts = shortcuts.filter((_, i) => i !== index);
    setShortcuts(updatedShortcuts);
    localStorage.setItem('shortcuts', JSON.stringify(updatedShortcuts));
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const editShortcut = (index: number, name: string, url: string, shortcutKey: string) => {
    if (shortcuts.some((s, i) => i !== index && s.shortcutKey === shortcutKey.toLowerCase())) {
      setShowInstallHelp(true);
      return;
    }

    const updatedShortcuts = [...shortcuts];
    updatedShortcuts[index] = {
      name: name.trim(),
      url: url.startsWith('http') ? url : `https://${url}`,
      shortcutKey: shortcutKey.toLowerCase(),
      iconUrl: ''  // Sera rechargé automatiquement
    };

    setShortcuts(updatedShortcuts);
    localStorage.setItem('shortcuts', JSON.stringify(updatedShortcuts));
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleSearch = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value;
    setSearchQuery(value);
    
    if ('key' in e && e.key === 'Enter') {
      setShowNews(false);
      setShowSuggestions(false);
      // Redirection vers la page de résultats
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    } else {
      // Gestion des suggestions pendant la frappe
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
    }
  }, [navigate]);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e);
  }, [handleSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  }, [handleSearch]);

  const addShortcut = (url: string, shortcutKey: string) => {
    if (shortcuts.some(s => s.shortcutKey === shortcutKey)) {
      setShowInstallHelp(true);
      return;
    }
    const formattedUrl = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
    // On extrait le nom du domaine de l'URL
    const name = new URL(formattedUrl).hostname.replace('www.', '').split('.')[0];
    setShortcuts([...shortcuts, { name, url: formattedUrl, shortcutKey, iconUrl: '' }]);
    setShowShortcuts(false);
  };

  // Charger les actualités
  const loadNews = async () => {
    setIsLoadingNews(true);
    setNewsError(null);
    try {
      const stories = await fetchTopStories();
      setNews(stories);
    } catch (error) {
      setNewsError("Impossible de charger les actualités. Veuillez réessayer plus tard.");
    } finally {
      setIsLoadingNews(false);
    }
  };

  // Charger les actualités quand le modal s'ouvre
  useEffect(() => {
    if (showNews) {
      loadNews();
    }
  }, [showNews]);

  // Gestion des effets futuristes
  useEffect(() => {
    const container = document.querySelector('.animated-background');
    if (!container) return;

    // Détection si on est sur mobile
    const isMobile = window.innerWidth <= 768;

    // Création des lignes de circuit
    const createCircuitLine = () => {
      const line = document.createElement('div');
      line.className = 'circuit-line';
      
      const startY = Math.random() * window.innerHeight;
      const length = Math.random() * 200 + 100;
      
      line.style.width = `${length}px`;
      line.style.top = `${startY}px`;
      line.style.left = `${Math.random() * window.innerWidth}px`;
      line.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      container.appendChild(line);
      setTimeout(() => container.contains(line) && container.removeChild(line), 4000);
    };

    // Création des blocs de glitch
    const createGlitch = () => {
      const glitch = document.createElement('div');
      glitch.className = 'glitch-block';
      
      const width = Math.random() * 100 + 50;
      const height = Math.random() * 20 + 10;
      
      glitch.style.width = `${width}px`;
      glitch.style.height = `${height}px`;
      glitch.style.top = `${Math.random() * window.innerHeight}px`;
      glitch.style.left = `${Math.random() * window.innerWidth}px`;
      
      container.appendChild(glitch);
      setTimeout(() => container.contains(glitch) && container.removeChild(glitch), 200);
    };

    // Création des particules interactives
    const particles = [];
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const size = Math.random() * 4 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      const updatePosition = (x, y) => {
        const rect = container.getBoundingClientRect();
        const particleX = x - rect.left;
        const particleY = y - rect.top;
        particle.style.transform = `translate(${particleX}px, ${particleY}px)`;
      };
      
      // Position initiale aléatoire
      updatePosition(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight
      );
      
      container.appendChild(particle);
      particles.push({ element: particle, updatePosition });
    };

    // Nombre de particules adapté selon le device
    const particleCount = isMobile ? 15 : 50;
    for (let i = 0; i < particleCount; i++) {
      createParticle();
    }

    // Gestion du mouvement des particules
    const handleMouseMove = (e) => {
      if (isMobile) return; // Désactiver l'interaction au mouvement sur mobile
      particles.forEach(particle => {
        const dx = e.clientX - parseInt(particle.element.style.transform.split('(')[1]);
        const dy = e.clientY - parseInt(particle.element.style.transform.split(',')[1]);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          const angle = Math.atan2(dy, dx);
          const x = e.clientX - Math.cos(angle) * 100;
          const y = e.clientY - Math.sin(angle) * 100;
          particle.updatePosition(x, y);
        }
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Intervalles adaptés selon le device
    const intervals = [
      setInterval(createCircuitLine, isMobile ? 2000 : 1000),
      setInterval(createGlitch, isMobile ? 3000 : 2000),
      setInterval(() => {
        if (!isMobile) { // Animation aléatoire des particules uniquement sur desktop
          particles.forEach(particle => {
            particle.updatePosition(
              Math.random() * window.innerWidth,
              Math.random() * window.innerHeight
            );
          });
        }
      }, 3000)
    ];

    // Nettoyage
    return () => {
      intervals.forEach(clearInterval);
      document.removeEventListener('mousemove', handleMouseMove);
      particles.forEach(particle => {
        if (container.contains(particle.element)) {
          container.removeChild(particle.element);
        }
      });
    };
  }, []);

  const handleInstall = () => {
    const promptEvent = window as any;
    if (promptEvent.chrome && promptEvent.chrome.webstore && promptEvent.chrome.webstore.install) {
      promptEvent.chrome.webstore.install();
    } else {
      setShowInstallHelp(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const renderSearchResults = useCallback(() => {
    return <></>;
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="fixed top-0 w-full bg-gray-900/50 backdrop-blur-lg border-b border-gray-800 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Command className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold tracking-tight">loSCriptsX</span>
          </div>
          {/* Menu desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <button className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300">
              <Shield className="w-4 h-4" />
              <span>Bloqueur de Pubs</span>
            </button>
            {isDesktop && (
              <button 
                onClick={handleVpnClick}
                className={`flex items-center space-x-2 transition-all duration-300 ${
                  vpnExtensionInstalled 
                    ? 'text-green-400 hover:text-green-300' 
                    : 'text-gray-400 hover:text-purple-300'
                }`}
              >
                <Globe2 className="w-4 h-4" />
                <span>{vpnExtensionInstalled ? 'VPN Actif' : 'VPN'}</span>
              </button>
            )}
            <button 
              onClick={() => setShowNews(!showNews)}
              className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300"
            >
              <Newspaper className="w-4 h-4" />
              <span>Actualités</span>
            </button>
            <a 
              href="https://chat.openai.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300"
            >
              <Bot className="w-4 h-4" />
              <span>IA Assistant</span>
            </a>
            <button className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300">
              <FolderOpen className="w-4 h-4" />
              <span>loSCriptsX-Drive</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300">
              <Wrench className="w-4 h-4" />
              <span>Fonctionnalité</span>
            </button>
            {isInstallable && (
              <button
                onClick={handleInstall}
                className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-all duration-300"
              >
                <Settings className="w-4 h-4" />
                <span>Installer l'application</span>
              </button>
            )}
          </nav>
          {/* Bouton menu mobile */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden text-gray-400 hover:text-purple-300 transition-all duration-300"
          >
            {showMobileMenu ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Menu mobile */}
        {showMobileMenu && (
          <div className="md:hidden bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 mobile-menu">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              <button 
                className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300 w-full mobile-menu-item"
              >
                <Shield className="w-4 h-4" />
                <span>Bloqueur de Pubs</span>
              </button>
              <button 
                onClick={() => {
                  setShowNews(!showNews);
                  setShowMobileMenu(false);
                }}
                className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300 w-full mobile-menu-item"
              >
                <Newspaper className="w-4 h-4" />
                <span>Actualités</span>
              </button>
              <a 
                href="https://chat.openai.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300 w-full mobile-menu-item"
              >
                <Bot className="w-4 h-4" />
                <span>IA Assistant</span>
              </a>
              <button 
                className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300 w-full mobile-menu-item"
              >
                <FolderOpen className="w-4 h-4" />
                <span>loSCriptsX-Drive</span>
              </button>
              <button 
                className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 transition-all duration-300 w-full mobile-menu-item"
              >
                <Wrench className="w-4 h-4" />
                <span>Fonctionnalité</span>
              </button>
              {isInstallable && (
                <button 
                  onClick={handleInstall}
                  className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-all duration-300 w-full mobile-menu-item"
                >
                  <Settings className="w-4 h-4" />
                  <span>Installer l'application</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
        <div className="max-w-3xl w-full text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-12 bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
            loSCriptsX
          </h1>

          {/* Search Bar */}
          <div className="relative w-full max-w-3xl mx-auto">
            <div className={`absolute inset-0 bg-purple-500/20 blur-xl transition-all duration-500 ${isTyping ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Recherchez tout ce que vous voulez..."
                className="w-full py-4 px-12 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 placeholder-gray-500"
              />
              {micSupported && (
                <button
                  onClick={startListening}
                  className={`absolute right-4 p-2 rounded-full transition-all duration-300 ${
                    isListening 
                      ? 'bg-purple-500/20 text-purple-400 animate-pulse' 
                      : 'text-gray-400 hover:text-purple-400'
                  }`}
                  title={isListening ? 'En écoute...' : 'Recherche vocale'}
                >
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              )}
            </div>
            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="max-h-64 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSuggestions(false);
                        const event = new KeyboardEvent('keydown', { key: 'Enter' });
                        handleSearch(event as any);
                      }}
                      className="flex items-center px-4 py-3 hover:bg-gray-800/50 cursor-pointer group"
                    >
                      <Search className="w-4 h-4 mr-3 text-gray-500 group-hover:text-purple-400 transition-colors" />
                      <span className="text-gray-300 group-hover:text-purple-300 transition-colors">
                        {suggestion}
                      </span>
                      <ArrowUpRight className="w-4 h-4 ml-auto text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-purple-400 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shortcuts Section */}
        <div className="max-w-2xl w-full mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Raccourcis Rapides</h2>
            <button
              onClick={() => setShowShortcuts(true)}
              className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-all duration-300 button-glow"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-6">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="group relative"
                onContextMenu={(e) => handleContextMenu(e, index)}
                onTouchStart={(e) => {
                  const touch = e.currentTarget;
                  const timer = setTimeout(() => {
                    handleContextMenu(e, index);
                  }, 500);
                  touch.addEventListener('touchend', () => clearTimeout(timer), { once: true });
                  touch.addEventListener('touchmove', () => clearTimeout(timer), { once: true });
                }}
              >
                <a
                  href={shortcut.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  title={shortcut.name}
                  onClick={(e) => {
                    if (contextMenu.show) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex items-center justify-center p-1.5 bg-gray-900/20 border border-gray-700 rounded hover:bg-gray-800/20 transition-all duration-300">
                    <img 
                      src={shortcut.iconUrl || `https://icons.duckduckgo.com/ip3/${new URL(shortcut.url).hostname}.ico`}
                      alt={shortcut.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${new URL(shortcut.url).hostname}&sz=64`;
                      }}
                    />
                  </div>
                  <div className="hidden md:block absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 bg-gray-900/90 px-2 py-1 rounded text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Touche: {shortcut.shortcutKey}
                  </div>
                </a>
              </div>
            ))}
            <button
              onClick={() => setShowShortcuts(true)}
              className="flex items-center justify-center p-1.5 bg-gray-900/20 border border-gray-700 rounded hover:bg-gray-800/20 transition-all duration-300"
              title="Ajouter un raccourci"
            >
              <Plus className="w-5 h-5 text-gray-400 hover:text-purple-300 transition-colors" />
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-4xl w-full mt-20 grid md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: "Bloqueur de Publicités", desc: "Protection avancée contre les publicités et les trackers indésirables." },
            { icon: Globe2, title: "VPN Intégré", desc: "Navigation sécurisée et privée avec notre VPN haute performance." },
            { icon: Bot, title: "Assistant IA", desc: "Accédez à notre assistant IA pour une aide personnalisée." }
          ].map((feature, index) => (
            <div key={index} className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 card-animate">
              <feature.icon className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Popup VPN */}
      {showVpnPopup && (
        <div className="fixed top-4 right-4 z-50 w-80 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl p-4 animate-fade-in">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              <Globe2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold">Installation VPN</h3>
            </div>
            <button
              onClick={() => {
                setShowVpnPopup(false);
                setShowVpnVideo(false);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {!showVpnVideo ? (
            <>
              <p className="text-gray-300 text-sm mb-4">
                Installez l'extension 1ClickVPN pour une navigation sécurisée et privée.
              </p>
              
              <div className="space-y-3">
                <a
                  href="https://chromewebstore.google.com/detail/1clickvpn-proxy-for-chrom/pphgdbgldlmicfdkhondlafkiomnelnk?hl=fr&utm_source=ext_sidebar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full py-2 px-4 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-white font-medium"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Installer l'extension
                </a>
                
                {/* Afficher le bouton seulement à partir du 2e clic */}
                {vpnClickCount >= 2 && (
                  <button
                    onClick={() => setShowVpnVideo(true)}
                    className="flex items-center justify-center w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white font-medium"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    J'ai déjà installé l'extension
                  </button>
                )}
                
                <button
                  onClick={() => setShowVpnPopup(false)}
                  className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300 font-medium"
                >
                  Plus tard
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                Une fois installée, cliquez à nouveau sur VPN pour l'activer.
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-center">Comment activer l'extension</h4>
              
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-48 object-cover"
                  style={{ 
                    outline: 'none',
                    border: 'none'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                >
                  <source src="\public\vidéo/vpndemo.mp4" type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              </div>
              
              <p className="text-gray-300 text-sm text-center">
                Suivez les étapes montrées dans la vidéo pour activer votre extension VPN.
              </p>
              
              <button
                onClick={() => setShowVpnVideo(false)}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300 font-medium"
              >
                Retour
              </button>
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-lg py-2 min-w-[160px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
            onClick={() => {
              const shortcut = shortcuts[contextMenu.shortcutIndex];
              setShowShortcuts(true);
              setContextMenu(prev => ({ ...prev, show: false }));
            }}
          >
            Modifier
          </button>
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-800 text-red-400 hover:text-red-300 transition-colors"
            onClick={() => deleteShortcut(contextMenu.shortcutIndex)}
          >
            Supprimer
          </button>
        </div>
      )}

      {/* Modals */}
      {showNews && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-4 max-w-4xl mx-auto h-[90vh] md:h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold">Actualités Tech</h2>
              <button 
                onClick={() => setShowNews(false)}
                className="text-gray-400 hover:text-purple-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {isLoadingNews ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
              </div>
            ) : newsError ? (
              <div className="text-red-400 text-center py-8">
                {newsError}
                <button
                  onClick={loadNews}
                  className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 -mx-4 px-4">
                <div className="grid gap-4">
                  {news.map((story) => (
                    <a
                      key={story.id}
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-2 text-sm md:text-base text-white hover:text-purple-300 transition-colors line-clamp-2">
                            {story.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-400">
                            <span className="flex items-center space-x-1">
                              <ThumbsUp className="w-3 h-3 md:w-4 md:h-4" />
                              <span>{story.score}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <User className="w-3 h-3 md:w-4 md:h-4" />
                              <span>{story.by}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 md:w-4 md:h-4" />
                              <span>{new Date(story.time * 1000).toLocaleDateString('fr-FR')}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Ajouter un raccourci</h2>
              <button 
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-purple-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addShortcut(
                formData.get('url') as string,
                formData.get('shortcutKey') as string
              );
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-400 mb-1">
                    URL du site
                  </label>
                  <input
                    required
                    type="text"
                    name="url"
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 placeholder-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="shortcutKey" className="block text-sm font-medium text-gray-400 mb-1">
                    Touche de raccourci
                  </label>
                  <input
                    required
                    type="text"
                    name="shortcutKey"
                    maxLength={1}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 placeholder-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-white font-medium"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup d'aide à l'installation */}
      {showInstallHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md mx-4 relative animate-fade-in">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowInstallHelp(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Settings className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold">Installation de loSCriptsX</h3>
            </div>
            <div className="space-y-4 mb-6">
              <p className="text-gray-300">Suivez ces étapes pour installer l'application :</p>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 flex items-center justify-center bg-purple-500/20 rounded-full text-purple-400 font-medium">1</div>
                  <p className="text-gray-400">Cliquez sur les trois points en haut à droite de votre navigateur</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 flex items-center justify-center bg-purple-500/20 rounded-full text-purple-400 font-medium">2</div>
                  <p className="text-gray-400">Sélectionnez "Installer loSCriptsX"</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowInstallHelp(false)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-white font-medium"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-gray-900/50 backdrop-blur-lg border-t border-gray-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span> 2025 loSCriptsX</span>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-purple-300 transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-purple-300 transition-colors">Conditions</a>
              <a href="#" className="hover:text-purple-300 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Fond animé */}
      <div className="animated-background">
        <div className="grid-pattern" />
        <div className="em-wave" />
      </div>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { Bot, ShieldCheck, Clock, DollarSign, BarChart, CheckCircle2, Menu, X, Github, MessageSquare, Stamp as Steam } from 'lucide-react';
import useSWR from 'swr';
import axios from 'axios';
import steamLogo from './assets/steam-1.svg';
import { ArrowUpRight } from 'lucide-react'; 
import { toast, ToastContainer  } from 'react-toastify'; // Add this import
import 'react-toastify/dist/ReactToastify.css';

axios.defaults.withCredentials = true;

const fetcher = (url: string) => axios.get(url).then(res => res.data);

interface SteamUser {
  provider: string;
  id: string;
  displayName: string;
  photos: { value: string }[];
  level: number;
  profileUrl: string; 
  _json: {
    steamid: string;
    personaname: string;
    avatarfull: string;
    profileurl?: string; 
  };
}

function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [desiredLevel, setDesiredLevel] = useState<number>(10);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('calculator');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [steamUser, setSteamUser] = useState<SteamUser | null>(null);
  const [worldRank, setWorldRank] = useState<number | null>(null); // Add this line
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false); // Add this line

  // Add this modal component
  const AccountModal = ({ user, onClose, setSteamUser }: { 
    user: SteamUser | null; 
    onClose: () => void; 
    setSteamUser: (user: SteamUser | null) => void 
  }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tradeUrl, setTradeUrl] = useState("");
    const [isUrlValid, setIsUrlValid] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
  
    // Enhanced URL validation with custom profile support
    const validateTradeUrl = (url: string): boolean => {
      if (!user || !url.trim()) return false;
      
      try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const partnerId = params.get('partner');
        const token = params.get('token');
        
        // Basic structure checks
        const isValidStructure = (
          urlObj.hostname === 'steamcommunity.com' &&
          urlObj.pathname.includes('/tradeoffer/new') &&
          !!token
        );
  
        // For custom profiles, we only check structure
        const isCustomProfile = user.profileUrl.includes('/id/');
        
        return isValidStructure && (
          isCustomProfile ||  // Accept if custom profile
          partnerId === user._json.steamid  // Strict check for non-custom
        );
      } catch {
        return false;
      }
    };
  
    // Load and validate trade URL when modal opens
    useEffect(() => {
      if (!user || !initialLoad) return;
  
      const fetchAndValidateTradeUrl = async () => {
        try {
          const response = await axios.get('/api/user/trade-url', {
            withCredentials: true
          });
          
          if (response.data.tradeUrl && validateTradeUrl(response.data.tradeUrl)) {
            setTradeUrl(response.data.tradeUrl);
            setIsUrlValid(true);
          } else {
            // Clear invalid URL from backend
            if (response.data.tradeUrl) {
              await axios.post('/api/user/trade-url', 
                { tradeUrl: "" },
                { withCredentials: true }
              );
            }
            setTradeUrl("");
          }
        } catch (error) {
          console.error('Failed to fetch trade URL:', error);
          setTradeUrl("");
        } finally {
          setInitialLoad(false);
        }
      };
  
      fetchAndValidateTradeUrl();
    }, [user, initialLoad]);
  
    // Validate URL when it changes
    useEffect(() => {
      if (!initialLoad) {
        setIsUrlValid(validateTradeUrl(tradeUrl));
      }
    }, [tradeUrl]);
  
    const handleTradeUrlSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tradeUrl.trim() || !isUrlValid || !user) return;
  
      setIsSubmitting(true);
      
      try {
        const response = await axios.post(
          '/api/user/trade-url',
          { tradeUrl },
          { withCredentials: true }
        );
        
        toast.success(response.data.message || 'Trade URL saved successfully!');
        onClose();
      } catch (error) {
        const errorMessage = axios.isAxiosError(error) 
          ? error.response?.data?.error || 'Failed to save URL'
          : 'An unexpected error occurred';
        
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    };
  
    const handleAction = async (clearCache: boolean) => {
      setIsSubmitting(true);
  
      try {
        await axios.post(
          '/api/auth/logout',
          { clearCache },
          { withCredentials: true }
        );
  
        if (clearCache) {
          // Clear all client-side storage
          document.cookie = 'tradeUrl=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          localStorage.removeItem(`steamLadderRank_${user?.id}`);
          localStorage.removeItem(`steamLadderLevel_${user?.id}`);
        }
  
        setSteamUser(null);
        onClose();
        
        setTimeout(() => {
          window.location.href = '/';
        }, 300);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
            ? error.message
            : 'Failed to complete the action';
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    };
  
    if (!user) return null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="bg-[#222222] rounded-xl shadow-lg w-full max-w-lg p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Account Details</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
  
          <div className="flex items-center space-x-4 mb-6">
            <img
              src={user._json.avatarfull}
              alt={user.displayName}
              className="w-16 h-16 rounded-full border-2 border-[#FFE135]"
            />
            <div>
              <h3 className="text-xl font-semibold">{user.displayName}</h3>
              <p className="text-[#FFE135]">Level {user.level}</p>
            </div>
          </div>
  
          <form onSubmit={handleTradeUrlSubmit}>
            <div className="mb-6">
              <label className="block text-gray-400 mb-2">Steam Trade URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={tradeUrl ? "" : "Paste your Steam trade URL here..."}
                  value={tradeUrl}
                  onChange={(e) => setTradeUrl(e.target.value)}
                  className={`flex-1 bg-[#333333] border ${
                    tradeUrl ? (isUrlValid ? 'border-green-500' : 'border-red-500') : 'border-gray-700'
                  } rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FFE135]`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => window.open(`${user.profileUrl}/tradeoffers/privacy`, '_blank')}
                  className="bg-[#1b2838] hover:bg-[#2a475e] text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                  disabled={isSubmitting}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Get URL</span>
                </button>
              </div>
              {tradeUrl && !isUrlValid && (
                <p className="text-red-400 text-sm mt-1">
                  Please enter a valid Steam trade URL that matches your account
                </p>
              )}
            </div>
  
            <button
              type="submit"
              disabled={!isUrlValid || isSubmitting}
              className="w-full mb-4 flex justify-center items-center gap-2 bg-[#FFE135] hover:bg-[#FFD700] text-[#1A1A1A] font-bold py-3 px-6 rounded-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Trade URL'
              )}
            </button>
          </form>
  
          <div className="space-y-3">
            <button
              onClick={() => handleAction(false)}
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 bg-[#1b2838] hover:bg-[#2a475e] text-white font-bold py-3 px-6 rounded-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              Sign Out
            </button>
            <button
              onClick={() => handleAction(true)}
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Fetch SteamLadder rank with caching
  const fetchSteamLadderRank = async (steamId: string, currentLevel: number) => {
    if (!steamId) {
      console.error('No steamId provided to fetchSteamLadderRank');
      return null;
    }
  
    // Check cache first
    const cacheKey = `steamLadder_${steamId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { rank, level, timestamp } = JSON.parse(cachedData);
        
        // Use cache if level matches and data is fresh (1 hour)
        if (level === currentLevel && Date.now() - timestamp < 3600000) {
          console.log('[Cache Hit] Using cached SteamLadder rank');
          return rank;
        }
      } catch (e) {
        console.warn('Failed to parse cached rank data', e);
      }
    }
  
    try {
      console.log('[API Call] Fetching fresh SteamLadder rank for:', steamId);
      const response = await axios.get(`/api/steamladder/rank?steamId=${encodeURIComponent(steamId)}`, {
        withCredentials: true,
        timeout: 5000 // Added timeout
      });
  
      // NEW: Handle backend's response format
      const rank = response.data?.rank || null;
      
      if (rank) {
        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify({
          rank,
          level: currentLevel,
          timestamp: Date.now()
        }));
      }
  
      return rank;
    } catch (error) {
      console.error(
        'SteamLadder fetch failed:',
        axios.isAxiosError(error) 
          ? error.response?.data || error.message
          : error
      );
      
      // Fallback to cached data if available
      if (cachedData) {
        console.warn('Using stale cached data due to API failure');
        return JSON.parse(cachedData).rank;
      }
      
      return null;
    }
  };

  // Add this ABOVE your component's return statement
const getRankMetadata = () => {
  if (!steamUser || !worldRank) return null;
  
  const cacheKey = `steamLadder_${steamUser._json.steamid}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (!cachedData) return { isCached: false };
  
  try {
    const { timestamp } = JSON.parse(cachedData);
    return {
      isCached: true,
      lastUpdated: new Date(timestamp).toLocaleTimeString()
    };
  } catch (e) {
    console.error('Error parsing cached rank data:', e);
    return { isCached: false };
  }
};

// Usage in useEffect
useEffect(() => {
  if (!steamUser) return;

  console.log('Fetching rank for user:', steamUser.displayName);
  
  const fetchRank = async () => {
    try {
      const rank = await fetchSteamLadderRank(
        steamUser._json.steamid, 
        steamUser.level
      );
      
      setWorldRank(rank);
      console.log('Rank update complete:', rank);
    } catch (error) {
      console.error('Rank fetch failed:', error);
      setWorldRank(null);
    }
  };

  fetchRank();
}, [steamUser]);
  
  
  // Handle scroll events for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  

  // Fetch TF2 key price from Steam market
  const { data: keyPriceData, error: keyPriceError } = useSWR(
    '/api/market/priceoverview?appid=440&currency=1&market_hash_name=Mann%20Co.%20Supply%20Crate%20Key',
    fetcher,
    {
      refreshInterval: 300000 // Refresh every 5 minutes
    }
  );

  // Check if the user is logged in after the page loads
  useEffect(() => {
    axios.get('/api/user')
      .then(response => {
        if (response.data) {
          // User is logged in, fetch the level
          axios.get('/api/user/level')
            .then(levelResponse => {
              const userData = {
                ...response.data,
                level: levelResponse.data.level || 0, // Add the level property
              };
              setSteamUser(userData); // Update the state
              console.log('Steam User:', userData); // Log the user object
            })
            .catch(error => {
              console.error('Failed to fetch user level:', error);
              setSteamUser(response.data); // Fallback to user data without level
            });
        } else {
          // User is not logged in
          setSteamUser(null);
        }
      })
      .catch(error => {
        console.error('Failed to fetch user:', error);
      });
  }, []);
  

  // Handle Steam login
  const handleSteamLogin = () => {
    window.location.href = '/auth/steam';
  };

  // Calculate required cards and cost
  const calculateLevelingDetails = (current: number, desired: number) => {
    if (current >= desired) return { cards: 0, keys: 0, time: 0 };
    
    let totalCards = 0;
    for (let i = current; i < desired; i++) {
      totalCards += i * 10;
    }
    
    const cardsPerKey = 300;
    const keysNeeded = totalCards / cardsPerKey;
    const estimatedHours = totalCards / 100;
    
    return {
      cards: totalCards,
      keys: Math.ceil(keysNeeded),
      time: estimatedHours.toFixed(1)
    };
  };

  const levelDetails = calculateLevelingDetails(currentLevel, desiredLevel);
  const keyPrice = keyPriceData?.lowest_price ? parseFloat(keyPriceData.lowest_price.replace('$', '')) : 0;
  const totalCost = (levelDetails.keys * keyPrice).toFixed(2);

  // Testimonials data
  const testimonials = [
    {
      name: "Alex K.",
      level: "Level 50 → 100",
      text: "BananaBot leveled my account quickly and securely. The process was completely hands-off and I got exactly what I paid for.",
      avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    },
    {
      name: "Sarah M.",
      level: "Level 25 → 75",
      text: "I was skeptical at first, but the service was flawless. My Steam profile looks amazing now with all the showcases unlocked!",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    },
    {
      name: "Mike T.",
      level: "Level 10 → 100",
      text: "The calculator was spot-on with the cost estimate. BananaBot's service is worth every penny for serious Steam collectors.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    }
  ];

  // Scroll to section handler
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      {/* Navigation */}
<nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#1A1A1A] shadow-lg' : 'bg-transparent'}`}>
  <div className="container mx-auto px-4 md:px-6">
    <div className="flex justify-between items-center h-16">
      {/* Logo */}
      <div className="flex items-center">
        <Bot className="h-8 w-8 text-[#FFE135]" />
        <span className="ml-2 text-xl font-bold">BananaBot</span>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-8">
        {/* Level Up Button */}
        <button
          onClick={() => scrollToSection('calculator')}
          className={`text-sm font-medium hover:text-[#FFE135] transition-colors ${activeSection === 'calculator' ? 'text-[#FFE135]' : 'text-gray-300'}`}
        >
          Level Up
        </button>

        {/* Sign in with Steam Button */}
        {!steamUser && (
          <button
          onClick={handleSteamLogin}
          className="bg-[#1b2838] hover:bg-[#2a475e] text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center"
        >
          <img
            src={steamLogo} // Use the imported Steam logo
            alt="Steam Logo"
            className="mr-2 h-5 w-5"
          />
          Sign in with Steam
        </button>
        )}

        {/* User Avatar (if logged in) */}
{steamUser && (
  <div className="relative">
    <img
      src={steamUser._json.avatarfull || "/path/to/default-avatar.png"}
      alt={steamUser.displayName}
      className="w-10 h-10 rounded-full cursor-pointer"
      onClick={() => setIsAccountModalOpen(true)} // Toggle dropdown on mobile
    />
    {/* Dropdown Menu */}
    {mobileMenuOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-[#222222] rounded-lg shadow-lg z-50">
        <div className="py-2">
          <button
            onClick={() => {
              scrollToSection('account');
              setMobileMenuOpen(false);
            }}
            className="block w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#333333] hover:text-[#FFE135]"
          >
            Account
          </button>
          <button
            onClick={() => {
              axios.post('/api/auth/logout').then(() => {
                setSteamUser(null); // Clear user state
                window.location.reload(); // Refresh the page
              });
            }}
            className="block w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#333333] hover:text-[#FFE135]"
          >
            Sign Out
          </button>
        </div>
      </div>
    )}
  </div>
)}
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-300 hover:text-white"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>

    {/* Mobile Navigation */}
    {mobileMenuOpen && (
      <div className="md:hidden bg-[#1A1A1A] py-4">
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => scrollToSection('calculator')}
            className={`text-sm font-medium hover:text-[#FFE135] transition-colors ${activeSection === 'calculator' ? 'text-[#FFE135]' : 'text-gray-300'}`}
          >
            Level Up
          </button>

          {/* Sign in with Steam Button (Mobile) */}
          {!steamUser && (
            <button
            onClick={handleSteamLogin}
            className="bg-[#1b2838] hover:bg-[#2a475e] text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <img
              src={steamLogo} // Use the imported Steam logo
              alt="Steam Logo"
              className="mr-2 h-5 w-5"
            />
            Sign in with Steam
          </button>
          )}
        </div>
      </div>
    )}
  </div>
</nav>

      {/* Main Content */}
      <div className="pt-16"> {/* Add padding to account for fixed navbar */}
        {/* Calculator Section */}
<section id="calculator" className="py-16">
  <div className="container mx-auto px-4 md:px-6">
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold mb-4">Level Calculator</h2>
      <p className="text-gray-300 max-w-2xl mx-auto">
        Calculate the TF2 keys needed to reach your desired Steam level
      </p>
    </div>

    <div className="max-w-4xl mx-auto bg-[#222222] rounded-xl shadow-xl overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            {/* User Info (if logged in) */}
            {steamUser && (
              <div className="flex items-center mb-6">
                <img
                  src={steamUser._json.avatarfull || "/path/to/default-avatar.png"}
                  alt={steamUser.displayName || "User"}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="font-semibold">{steamUser.displayName || "User"}</h3>
                  <p className="text-[#FFE135]">Current Level: {steamUser.level}</p>
                </div>
              </div>
            )}

            {/* Current Level Input */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-2">Current Level</label>
              <input
                type="number"
                value={steamUser ? steamUser.level : currentLevel}
                onChange={(e) => setCurrentLevel(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!!steamUser} // Disable if logged in
                className="w-full bg-[#333333] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FFE135]"
              />
            </div>

            {/* Desired Level Input */}
            <div>
              <label className="block text-gray-400 mb-2">Desired Level</label>
              <input
                type="number"
                min={steamUser ? steamUser.level : currentLevel}
                max="5000"
                value={desiredLevel}
                onChange={(e) => setDesiredLevel(Math.max(steamUser ? steamUser.level : currentLevel, parseInt(e.target.value) || 1))}
                className="w-full bg-[#333333] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FFE135]"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-[#2A2A2A] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6 text-[#FFE135]">Calculation Results</h3>

            <div className="space-y-6">
              {/* Required Trading Cards */}
              <div>
                <p className="text-gray-400 mb-1">Required Trading Cards</p>
                <p className="text-2xl font-bold flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-[#FFE135]" />
                  {levelDetails.cards.toLocaleString()} cards
                </p>
              </div>

              {/* TF2 Keys Required */}
              <div>
                <p className="text-gray-400 mb-1">TF2 Keys Required</p>
                <p className="text-2xl font-bold flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-[#FFE135]" />
                  {levelDetails.keys} keys
                </p>
                {keyPriceData && (
                  <p className="text-sm text-gray-400 mt-1">
                    Current key price: ${keyPrice} (≈ ${totalCost} total)
                  </p>
                )}
                {keyPriceError && (
                  <p className="text-sm text-red-400 mt-1">
                    Error fetching key price. Please try again later.
                  </p>
                )}
              </div>
            </div>

            {/* Start Leveling Button */}
            <button
              onClick={() => {
                if (!steamUser) {
                  handleSteamLogin(); // Redirect to Steam login if not logged in
                } else {
                  // Handle leveling logic for logged-in users
                  console.log("Start Leveling Up!");
                }
              }}
              className="w-full mt-6 bg-[#FFE135] text-[#1A1A1A] font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all flex items-center justify-center"
            >
              {!steamUser && (
                <img
                  src={steamLogo} // Use the imported Steam logo
                  alt="Steam Logo"
                  className="mr-2 h-5 w-5"
                />
              )}
              {steamUser ? "Start Leveling Up" : "Sign in and Start Leveling Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* Perks Section */}
<section className="py-16">
  <div className="container mx-auto px-4 md:px-6">
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold mb-4">Perks of Leveling Up</h2>
      <p className="text-gray-300 max-w-2xl mx-auto">
        Here’s what you’ll gain by leveling up your Steam profile
      </p>
    </div>

    <div className="max-w-4xl mx-auto bg-[#222222] rounded-xl shadow-xl overflow-hidden p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div>
          <div className="mb-6">
            <p className="text-gray-400 mb-1">Game Coupons</p>
            <p className="text-2xl font-bold text-[#FFE135]">
              {Math.floor((desiredLevel - (steamUser ? steamUser.level : currentLevel)) / 10)}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-400 mb-1">Emotes & Backgrounds</p>
            <p className="text-2xl font-bold text-[#FFE135]">
              {Math.floor((desiredLevel - (steamUser ? steamUser.level : currentLevel)) / 5)}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-400 mb-1">Showcases</p>
            <p className="text-2xl font-bold text-[#FFE135]">
              {Math.min(Math.floor((desiredLevel - (steamUser ? steamUser.level : currentLevel)) / 50), 20)} /20
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className="mb-6">
            <p className="text-gray-400 mb-1">Friend Cap</p>
            <p className="text-2xl font-bold text-[#FFE135]">
              {Math.min(250 + (desiredLevel - (steamUser ? steamUser.level : currentLevel)) * 5, 2000)} /2000
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-400 mb-1">Booster Pack Drop Rate</p>
            <p className="text-2xl font-bold text-[#FFE135]">
              +{Math.min((desiredLevel - (steamUser ? steamUser.level : currentLevel)) * 0.1, 10).toFixed(1)}%
            </p>
          </div>

          <div className="mb-6">
  <p className="text-gray-400 mb-1">SteamLadder World Rank</p>
  <p className="text-2xl font-bold text-[#FFE135]">
    {worldRank ? `#${worldRank}` : 'Rank unavailable'}
  </p>
  {worldRank && (
    <p className="text-xs text-gray-500 mt-1">
      {(() => {
        const meta = getRankMetadata();
        return meta?.isCached 
          ? `Last updated ${meta.lastUpdated}` 
          : 'Live data';
      })()}
    </p>
  )}
</div>
        </div>
      </div>
    </div>
  </div>
</section>

        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose BananaBot?</h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Our service offers the fastest, most reliable way to level up your Steam profile
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-[#222222] rounded-xl p-6 transition-transform hover:transform hover:scale-105">
                <div className="bg-[#FFE135] bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <Bot className="h-8 w-8 text-[#FFE135]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Automated Process</h3>
                <p className="text-gray-400">
                  Our bots work 24/7 to craft badges and level up your account without any manual intervention required.
                </p>
              </div>
              
              <div className="bg-[#222222] rounded-xl p-6 transition-transform hover:transform hover:scale-105">
                <div className="bg-[#FFE135] bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck className="h-8 w-8 text-[#FFE135]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Secure Trading</h3>
                <p className="text-gray-400">
                  All transactions are handled through secure Steam trading.
                </p>
              </div>
              
              <div className="bg-[#222222] rounded-xl p-6 transition-transform hover:transform hover:scale-105">
                <div className="bg-[#FFE135] bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <DollarSign className="h-8 w-8 text-[#FFE135]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">TF2 Key Payments</h3>
                <p className="text-gray-400">
                  Pay with TF2 keys for the most cost-effective way to level up your Steam profile.
                </p>
              </div>
              
              <div className="bg-[#222222] rounded-xl p-6 transition-transform hover:transform hover:scale-105">
                <div className="bg-[#FFE135] bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <Clock className="h-8 w-8 text-[#FFE135]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Fast Completion</h3>
                <p className="text-gray-400">
                  Our optimized system ensures the fastest possible leveling speed, getting you to your desired level quickly.
                </p>
              </div>
              
              <div className="bg-[#222222] rounded-xl p-6 transition-transform hover:transform hover:scale-105">
                <div className="bg-[#FFE135] bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <BarChart className="h-8 w-8 text-[#FFE135]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
                <p className="text-gray-400">
                  Monitor your leveling progress in real-time through our user-friendly dashboard.
                </p>
              </div>
              
              <div className="bg-[#222222] rounded-xl p-6 transition-transform hover:transform hover:scale-105">
                <div className="bg-[#FFE135] bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <Steam className="h-8 w-8 text-[#FFE135]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Steam API Integration</h3>
                <p className="text-gray-400">
                  Direct integration with Steam's API ensures accurate level calculations and seamless operation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 bg-[#222222]">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">About BananaBot</h2>
                <p className="text-gray-300 mb-6">
                  BananaBot started as a passion project by Steam enthusiasts who wanted to make profile leveling accessible to everyone. Today, we're the most trusted Steam leveling service, having helped thousands of users enhance their Steam presence.
                </p>
                <p className="text-gray-300 mb-6">
                  Our automated system handles everything from card trading to badge crafting, ensuring you get the fastest and most efficient leveling experience possible. We pride ourselves on our transparency, security, and commitment to the Steam community.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-4xl font-bold text-[#FFE135] mb-2">10k+</p>
                    <p className="text-gray-400">Satisfied Users</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-[#FFE135] mb-2">1M+</p>
                    <p className="text-gray-400">Cards Processed</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-[#FFE135] bg-opacity-20 rounded-full h-64 w-64 md:h-96 md:w-96 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 blur-xl"></div>
                <img 
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Gaming Setup" 
                  className="relative z-10 rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Thousands of Steam users have trusted BananaBot for their leveling needs
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-[#222222] rounded-xl p-6 shadow-lg">
                  <div className="flex items-center mb-4">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name} 
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <h4 className="font-semibold">{testimonial.name}</h4>
                      <p className="text-[#FFE135] text-sm">{testimonial.level}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">"{testimonial.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#222222] py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center mb-4">
                  <Bot className="h-8 w-8 text-[#FFE135]" />
                  <span className="ml-2 text-xl font-bold">BananaBot</span>
                </div>
                <p className="text-gray-400">
                  The most trusted Steam leveling service since 2025.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <button onClick={() => scrollToSection('calculator')} className="text-gray-400 hover:text-[#FFE135]">
                      Calculator
                    </button>
                  </li>
                  <li>
                    <button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-[#FFE135]">
                      Features
                    </button>
                  </li>
                  <li>
                    <button onClick={() => scrollToSection('about')} className="text-gray-400 hover:text-[#FFE135]">
                      About
                    </button>
                  </li>
                  <li>
                    <button onClick={() => scrollToSection('testimonials')} className="text-gray-400 hover:text-[#FFE135]">
                      Testimonials
                    </button>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Connect</h4>
                <div className="flex space-x-4">
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FFE135]">
                    <Github className="h-6 w-6" />
                  </a>
                  <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FFE135]">
                    <MessageSquare className="h-6 w-6" />
                  </a>
                  <a href="https://steamcommunity.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FFE135]">
                    <Steam className="h-6 w-6" />
                  </a>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Contact</h4>
                <p className="text-gray-400">
                  Email: support@bananabot.com<br />
                  Discord: BananaBot#0001
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center">
              <p className="text-gray-400">
                © {new Date().getFullYear()} BananaBot. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
       {/* Account Modal */}
    {isAccountModalOpen && (
      <AccountModal
      user={steamUser}
      onClose={() => setIsAccountModalOpen(false)}
      setSteamUser={setSteamUser}
    />
    )}
    <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
    </div>
  );
}

export default App;
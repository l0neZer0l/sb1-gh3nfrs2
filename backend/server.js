import express from 'express';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import session from 'express-session';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

//  Critical CORS Setup
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST']
}));

//  Essential Middleware
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET ));

//  Session Configuration - MUST HAVE THESE SETTINGS
app.use(session({
  secret: process.env.SESSION_SECRET ,
  resave: true, // MUST be true for Steam auth
  saveUninitialized: true, // MUST be true for Steam auth
  cookie: {
    secure: false, // Keep false for local dev
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400000 // 24 hours
  }
}));

//  Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

//  Steam Strategy - FIXED IMPLEMENTATION
passport.use(new SteamStrategy({
  returnURL: process.env.STEAM_RETURN_URL || 'http://localhost:5000/auth/steam/return',
  realm: process.env.STEAM_REALM || 'http://localhost:5000/',
  apiKey: process.env.STEAM_API_KEY ,
  profile: true
}, (identifier, profile, done) => {
  const user = {
    steamId: profile.id,
    displayName: profile.displayName,
    avatar: profile.photos[2]?.value,
    profileUrl: profile._json.profileurl,
    _json: profile._json
  };
  console.log('Steam auth success for:', user.steamId);
  return done(null, user);
}));

//  Serialization - SIMPLIFIED
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

//  Auth Routes - FIXED
app.get('/auth/steam', (req, res, next) => {
  console.log('Initiating Steam auth, session:', req.sessionID);
  next();
}, passport.authenticate('steam'));

app.get('/auth/steam/return', 
  passport.authenticate('steam', { 
    failureRedirect: 'http://localhost:3000/login?error=steam_failed',
    session: true
  }),
  (req, res) => {
    console.log('Successful auth for:', req.user.steamId);
    res.redirect('http://localhost:3000/profile');
  }
);

//  API Routes
app.get('/api/user', (req, res) => {
  res.json(req.user || null);
});

app.get('/api/user/level', async (req, res) => {
  try {
    if (!req.user?.steamId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const response = await axios.get(
      `http://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${process.env.STEAM_API_KEY}&steamid=${req.user.steamId}`
    );
    res.json({ level: response.data.response?.player_level || 0 });
  } catch (error) {
    console.error('Steam level error:', error);
    res.status(500).json({ error: 'Failed to fetch Steam level' });
  }
});

// Updated trade URL validation endpoint
app.get('/api/user/trade-url', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const storedUrl = req.cookies.tradeUrl || "";
    let isValid = false;

    if (storedUrl) {
      try {
        const urlObj = new URL(storedUrl);
        const params = new URLSearchParams(urlObj.search);
        
        // For custom profiles, we only validate structure
        const isCustomProfile = req.user.profileUrl.includes('/id/');
        
        isValid = (
          urlObj.hostname === 'steamcommunity.com' &&
          urlObj.pathname.includes('/tradeoffer/new') &&
          params.get('token') &&
          (isCustomProfile || params.get('partner') === req.user.steamid)
        );
      } catch (e) {
        // URL is invalid
      }
    }

    if (!isValid && storedUrl) {
      res.clearCookie('tradeUrl');
      return res.json({ tradeUrl: "", valid: false });
    }

    return res.json({ 
      tradeUrl: isValid ? storedUrl : "", 
      valid: isValid,
      isCustomProfile: req.user.profileUrl.includes('/id/')
    });
  } catch (error) {
    console.error('Trade URL validation error:', error);
    res.clearCookie('tradeUrl');
    return res.status(500).json({ error: 'Failed to validate trade URL' });
  }
});

// Updated trade URL save endpoint
app.post('/api/user/trade-url', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  
  const { tradeUrl } = req.body;
  
  // If empty request, clear the trade URL
  if (!tradeUrl) {
    res.clearCookie('tradeUrl');
    return res.json({ success: true, message: 'Trade URL cleared' });
  }

  // Validate the new URL
  try {
    const urlObj = new URL(tradeUrl);
    const params = new URLSearchParams(urlObj.search);
    const isCustomProfile = req.user.profileUrl.includes('/id/');
    
    if (urlObj.hostname !== 'steamcommunity.com' || 
        !urlObj.pathname.includes('/tradeoffer/new') ||
        !params.get('token') ||
        (!isCustomProfile && params.get('partner') !== req.user.steamid)) {
      return res.status(400).json({ error: 'Invalid Steam Trade URL' });
    }

    // Save the valid URL
    res.cookie('tradeUrl', tradeUrl, { 
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return res.json({ 
      success: true,
      message: 'Trade URL saved successfully'
    });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
});

// Updated logout endpoint
app.post('/api/auth/logout', (req, res) => {
  try {
    const { clearCache } = req.body;
    
    if (clearCache) {
      res.clearCookie('tradeUrl');
      res.clearCookie('steamLadderCache');
    }

    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }
        
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// SteamLadder rank route - Final Optimized Version
app.get('/api/steamladder/rank', async (req, res) => {
  // 1. Input Validation
  const steamId = req.query.steamId;
  const apiKey = process.env.STEAMLADDER_API_KEY;
  
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return res.status(400).json({ 
      error: 'Valid SteamID (17 digits) required' 
    });
  }

  // 2. Cache System
  const cacheKey = `sl_${steamId}`;
  let cachedData = null;
  
  try {
    cachedData = req.cookies[cacheKey] 
      ? JSON.parse(req.cookies[cacheKey]) 
      : null;
      
    // Return cached data if still valid (5 minutes)
    if (cachedData?.expires > Date.now()) {
      return res.json({ 
        rank: cachedData.rank, 
        source: 'cache',
        cachedUntil: new Date(cachedData.expires).toISOString()
      });
    }
  } catch (e) {
    console.error('Cache parse error:', e);
  }

  // 3. Rate Limiting (4 requests/second max)
  const RATE_LIMIT_MS = 250;
  const lastCall = req.session.lastSteamLadderCall || 0;
  
  if (Date.now() - lastCall < RATE_LIMIT_MS) {
    return res.status(429).json({
      error: 'Rate limited',
      rank: cachedData?.rank || null,
      retryAfter: RATE_LIMIT_MS / 1000 + ' seconds'
    });
  }

  // 4. API Request with Timeout
  try {
    const response = await axios.get(
      `https://steamladder.com/api/v1/profile/${steamId}/`,
      {
        headers: { 
          Authorization: `Token ${apiKey}`,
          'User-Agent': 'BananaBot/1.0' 
        },
        timeout: 3000 // 3 second timeout
      }
    );

    const rank = response.data?.ladder_rank?.worldwide_xp;
    
    if (!rank) throw new Error('Invalid response format');

    // Update cache (5 minutes)
    const cachePayload = {
      rank,
      expires: Date.now() + 300000 // 5 minutes
    };
    
    res.cookie(cacheKey, JSON.stringify(cachePayload), {
      maxAge: 300000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    req.session.lastSteamLadderCall = Date.now();
    
    return res.json({ 
      rank,
      source: 'api',
      cachedUntil: new Date(cachePayload.expires).toISOString()
    });

  } catch (error) {
    console.error('SteamLadder API Error:', error.message);
    
    // 5. Fallback Strategies
    if (cachedData) {
      return res.json({
        rank: cachedData.rank,
        source: 'stale_cache',
        warning: 'API failed - showing cached data'
      });
    }
    
    return res.status(503).json({
      error: 'SteamLadder service unavailable',
      solution: 'Try again later or contact support'
    });
  }
});

// Steam market route
app.get('/api/market/priceoverview', async (req, res) => {
  try {
    const { appid, currency, market_hash_name } = req.query;
    const response = await axios.get('https://steamcommunity.com/market/priceoverview/', {
      params: { appid, currency, market_hash_name },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Steam market data:', error);
    res.status(500).json({ error: 'Failed to fetch Steam market data' });
  }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
  try {
    const { clearCache } = req.body;
    
    if (clearCache) {
      res.clearCookie('steamLadderCache');
      res.clearCookie('tradeUrl');
      console.log('Full cache cleared for user');
    }

    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }
        
        res.clearCookie('connect.sid');
        console.log('User logged out successfully');
        res.json({ success: true });
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// 8. Error Handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Steam Auth URL: http://localhost:${PORT}/auth/steam`);
});
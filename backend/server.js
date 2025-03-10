import express from 'express';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import session from 'express-session';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || '12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  console.log('Deserializing user:', obj);
  done(null, obj);
});

// Steam authentication strategy
passport.use(
  new SteamStrategy(
    {
      returnURL: 'http://localhost:5000/auth/steam/return',
      realm: 'http://localhost:5000',
      apiKey: process.env.STEAM_API_KEY,
    },
    (identifier, profile, done) => {
      console.log('Steam profile:', profile);
      const user = {
        ...profile,
        photos: profile.photos,
      };
      return done(null, user);
    }
  )
);

// Auth routes
app.get('/auth/steam', (req, res, next) => {
  console.log('Initiating Steam authentication...');
  next();
}, passport.authenticate('steam'));

app.get('/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
  console.log('User after authentication:', req.user);
  res.redirect('http://localhost:3000');
});

app.get('/api/user', (req, res) => {
  console.log('User from session:', req.user);
  res.json(req.user || null);
});

// New route to fetch the user's Steam level
app.get('/api/user/level', async (req, res) => {
  try {
    console.log('User object:', req.user);
    const steamid = req.user?._json?.steamid;
    if (!steamid) {
      console.log('No steamid found in session');
      return res.status(400).json({ error: 'User not logged in' });
    }

    const response = await axios.get(
      `http://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamid}`
    );
    res.json({ level: response.data.response?.player_level || 0 });
  } catch (error) {
    console.error('Error fetching Steam level:', error);
    res.status(500).json({ error: 'Failed to fetch Steam level' });
  }
});

// Proxy route for Steam Market API
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

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
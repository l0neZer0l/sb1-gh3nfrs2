import express from 'express';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import session from 'express-session';
import cors from 'cors';
import axios from 'axios';

const app = express();

// Enable CORS
app.use(cors({
  origin: 'https://sb1gh3nfrs2-lhg1--3000--495c5120.local-corp.webcontainer.io', // Replace with your actual StackBlitz frontend URL
  credentials: true,
}));

// Session setup
app.use(
  session({
    secret: 'your-random-secret-key-12345', // Replace with a secure random string
    resave: false,
    saveUninitialized: false,
  })
);

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Steam authentication strategy
passport.use(
  new SteamStrategy(
    {
      returnURL: 'https://sb1-gh3nfrs2-7tytkd92x-l0nezer0ls-projects.vercel.app/auth/steam/return',
      realm: 'https://sb1-gh3nfrs2-7tytkd92x-l0nezer0ls-projects.vercel.app/',
      apiKey: '2947BF3844A8EDE405F7CBA93B4A9F7B', // Replace with your Steam API key
    },
    (identifier, profile, done) => {
      console.log('Steam profile:', profile);
      return done(null, profile);
    }
  )
);

// Auth routes
app.get('/auth/steam', (req, res, next) => {
  console.log('Initiating Steam authentication...');
  next();
}, passport.authenticate('steam'));

app.get('/auth/steam/return', (req, res, next) => {
  console.log('Steam authentication callback reached');
  next();
}, passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
  console.log('Authentication successful, redirecting...');
  res.redirect('/');
});

app.get('/api/user', (req, res) => {
  res.json(req.user || null);
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
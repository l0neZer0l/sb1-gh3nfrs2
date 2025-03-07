import express from 'express';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import session from 'express-session';

const app = express();

// Session setup
app.use(
  session({
    secret: 'your-secret-key',
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
      returnURL:
        'https://sb1gh3nfrs2-wfkm--5173--495c5120.local-corp.webcontainer.io/auth/steam/return',
      realm:
        'https://sb1gh3nfrs2-wfkm--5173--495c5120.local-corp.webcontainer.io/',
      apiKey: '970A289BA0A65C1828BD1537D2FC2471', // Replace with your Steam API key
    },
    (identifier, profile, done) => {
      return done(null, profile);
    }
  )
);

// Auth routes
app.get('/auth/steam', passport.authenticate('steam'), function (req, res) {
  // The request will be redirected to Steam for authentication
});

app.get(
  '/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/api/user', (req, res) => {
  res.json(req.user || null);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

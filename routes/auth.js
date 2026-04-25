const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../database/init');

// ── CONFIGURATION GOOGLE ───────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://lassiettefine.onrender.com/api/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const prenom = profile.name.givenName || profile.displayName;
  const nom = profile.name.familyName || '';
  let client = db.prepare('SELECT * FROM clients WHERE email = ?').get(email);
  if (!client) {
    db.prepare(`
      INSERT INTO clients (prenom, nom, email, mot_de_passe)
      VALUES (?, ?, ?, ?)
    `).run(prenom, nom, email, 'GOOGLE_AUTH');
    client = db.prepare('SELECT * FROM clients WHERE email = ?').get(email);
  }
  return done(null, client);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  done(null, user);
});

// ── CONNEXION VIA GOOGLE ───────────────────────────────────
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?erreur=google' }),
  (req, res) => {
    req.session.client = {
      id: req.user.id,
      prenom: req.user.prenom,
      nom: req.user.nom,
      email: req.user.email,
      abonnement: req.user.abonnement,
      abonnement_jus: req.user.abonnement_jus
    };
    res.redirect('/?connexion=google');
  }
);

// ── INSCRIPTION CLIENT ─────────────────────────────────────
router.post('/inscription', (req, res) => {
  const { prenom, nom, email, telephone, adresse_livraison, mot_de_passe, abonnement } = req.body;
  if (!prenom || !nom || !email || !mot_de_passe) {
    return res.json({ succes: false, message: 'Veuillez remplir tous les champs obligatoires.' });
  }
  const emailExiste = db.prepare('SELECT id FROM clients WHERE email = ?').get(email);
  if (emailExiste) {
    return res.json({ succes: false, message: 'Cet email est déjà utilisé.' });
  }
  const hash = bcrypt.hashSync(mot_de_passe, 10);
  db.prepare(`
    INSERT INTO clients (prenom, nom, email, telephone, adresse_livraison, mot_de_passe, abonnement)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(prenom, nom, email, telephone, adresse_livraison, hash, abonnement || null);
  res.json({ succes: true, message: `Bienvenue ${prenom} ! Votre compte a été créé.` });
});

// ── CONNEXION CLIENT ───────────────────────────────────────
router.post('/connexion', (req, res) => {
  const { email, mot_de_passe } = req.body;
  const client = db.prepare('SELECT * FROM clients WHERE email = ?').get(email);
  if (!client) {
    return res.json({ succes: false, message: 'Email ou mot de passe incorrect.' });
  }
  if (client.mot_de_passe === 'GOOGLE_AUTH') {
    return res.json({ succes: false, message: 'Ce compte utilise Google. Cliquez sur "Se connecter avec Google".' });
  }
  const valide = bcrypt.compareSync(mot_de_passe, client.mot_de_passe);
  if (!valide) {
    return res.json({ succes: false, message: 'Email ou mot de passe incorrect.' });
  }
  req.session.client = {
    id: client.id,
    prenom: client.prenom,
    nom: client.nom,
    email: client.email,
    abonnement: client.abonnement,
    abonnement_jus: client.abonnement_jus
  };
  res.json({ succes: true, client: req.session.client });
});

// ── CONNEXION ADMIN ────────────────────────────────────────
router.post('/admin', (req, res) => {
  const { identifiant, mot_de_passe } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE identifiant = ?').get(identifiant);
  if (!admin) {
    return res.json({ succes: false, message: 'Identifiant ou mot de passe incorrect.' });
  }
  const valide = bcrypt.compareSync(mot_de_passe, admin.mot_de_passe);
  if (!valide) {
    return res.json({ succes: false, message: 'Identifiant ou mot de passe incorrect.' });
  }
  req.session.admin = { id: admin.id, identifiant: admin.identifiant };
  res.json({ succes: true });
});

// ── DÉCONNEXION ────────────────────────────────────────────
router.post('/deconnexion', (req, res) => {
  req.session.destroy();
  res.json({ succes: true });
});

// ── VÉRIFIER SESSION ───────────────────────────────────────
router.get('/session', (req, res) => {
  if (req.session.client) {
    return res.json({ connecte: true, type: 'client', data: req.session.client });
  }
  if (req.session.admin) {
    return res.json({ connecte: true, type: 'admin', data: req.session.admin });
  }
  res.json({ connecte: false });
});

module.exports = router;

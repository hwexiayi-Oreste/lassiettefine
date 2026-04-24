const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/init');

// ── INSCRIPTION CLIENT
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

// ── CONNEXION CLIENT
router.post('/connexion', (req, res) => {
  const { email, mot_de_passe } = req.body;

  const client = db.prepare('SELECT * FROM clients WHERE email = ?').get(email);
  if (!client) {
    return res.json({ succes: false, message: 'Email ou mot de passe incorrect.' });
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

// ── CONNEXION ADMIN
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

// ── DÉCONNEXION
router.post('/deconnexion', (req, res) => {
  req.session.destroy();
  res.json({ succes: true });
});

// ── VÉRIFIER SESSION
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

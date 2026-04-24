const express = require('express');
const router = express.Router();
const db = require('../database/init');

// ── ENVOYER UN MESSAGE
router.post('/', (req, res) => {
  const { prenom, nom, email, telephone, sujet, message } = req.body;

  if (!prenom || !email || !message) {
    return res.json({ succes: false, message: 'Veuillez remplir les champs obligatoires.' });
  }

  db.prepare(`
    INSERT INTO messages (prenom, nom, email, telephone, sujet, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(prenom, nom || '', email, telephone || '', sujet || '', message);

  res.json({ succes: true, message: 'Message envoyé ! Nous vous répondrons sous 24h.' });
});

// ── VOIR TOUS LES MESSAGES (admin seulement)
router.get('/', (req, res) => {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json({ succes: true, messages });
});

// ── MARQUER UN MESSAGE COMME LU (admin)
router.put('/:id/lu', (req, res) => {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  db.prepare('UPDATE messages SET lu = 1 WHERE id = ?').run(req.params.id);
  res.json({ succes: true });
});

module.exports = router;

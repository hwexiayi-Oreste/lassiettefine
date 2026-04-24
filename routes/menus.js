const express = require('express');
const router = express.Router();
const db = require('../database/init');

// ── VOIR LES MENUS DE LA SEMAINE
router.get('/', (req, res) => {
  const menus = db.prepare('SELECT * FROM menus ORDER BY id ASC').all();
  res.json({ succes: true, menus });
});

// ── MODIFIER UN MENU (admin seulement)
router.put('/:id', (req, res) => {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  const { plat } = req.body;
  db.prepare('UPDATE menus SET plat = ? WHERE id = ?').run(plat, req.params.id);
  res.json({ succes: true, message: 'Menu mis à jour.' });
});

// ── JOURS DE REPOS DU CLIENT
router.get('/repos', (req, res) => {
  if (!req.session.client) {
    return res.json({ succes: false, message: 'Non connecté.' });
  }
  const repos = db.prepare('SELECT jour FROM jours_repos WHERE client_id = ?').all(req.session.client.id);
  res.json({ succes: true, repos: repos.map(r => r.jour) });
});

// ── METTRE À JOUR LES JOURS DE REPOS
router.post('/repos', (req, res) => {
  if (!req.session.client) {
    return res.json({ succes: false, message: 'Non connecté.' });
  }
  const { jours } = req.body; // tableau de jours ex: ["Lundi", "Vendredi"]
  const clientId = req.session.client.id;

  db.prepare('DELETE FROM jours_repos WHERE client_id = ?').run(clientId);
  const insert = db.prepare('INSERT INTO jours_repos (client_id, jour) VALUES (?, ?)');
  (jours || []).forEach(jour => insert.run(clientId, jour));

  res.json({ succes: true, message: 'Jours de repos enregistrés.' });
});

// ── ABONNEMENT JUS
router.post('/jus', (req, res) => {
  if (!req.session.client) {
    return res.json({ succes: false, message: 'Non connecté.' });
  }
  const { jus } = req.body;
  db.prepare('UPDATE clients SET abonnement_jus = ? WHERE id = ?').run(jus, req.session.client.id);
  req.session.client.abonnement_jus = jus;
  res.json({ succes: true, message: 'Abonnement jus mis à jour.' });
});

module.exports = router;

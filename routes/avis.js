const express = require('express');
const router = express.Router();
const db = require('../database/init');

// ── VOIR TOUS LES AVIS
router.get('/', (req, res) => {
  const avis = db.prepare(`
    SELECT avis.*, clients.prenom, clients.nom
    FROM avis
    JOIN clients ON avis.client_id = clients.id
    ORDER BY avis.created_at DESC
  `).all();
  res.json({ succes: true, avis });
});

// ── PUBLIER UN AVIS
router.post('/', (req, res) => {
  if (!req.session.client) {
    return res.json({ succes: false, message: 'Vous devez être connecté pour laisser un avis.' });
  }
  const { note, commentaire } = req.body;
  if (!note || !commentaire) {
    return res.json({ succes: false, message: 'Note et commentaire sont obligatoires.' });
  }
  db.prepare('INSERT INTO avis (client_id, note, commentaire) VALUES (?, ?, ?)').run(
    req.session.client.id, note, commentaire
  );
  res.json({ succes: true, message: 'Merci pour votre avis !' });
});

// ── RÉPONDRE À UN AVIS (admin seulement)
router.put('/:id/reponse', (req, res) => {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  const { reponse } = req.body;
  db.prepare('UPDATE avis SET reponse_admin = ? WHERE id = ?').run(reponse, req.params.id);
  res.json({ succes: true, message: 'Réponse publiée.' });
});

module.exports = router;

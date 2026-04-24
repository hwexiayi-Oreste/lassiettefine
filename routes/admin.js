const express = require('express');
const router = express.Router();
const db = require('../database/init');

// ── MIDDLEWARE : vérifier que l'admin est connecté
function adminAuth(req, res, next) {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  next();
}

// ── TABLEAU DE BORD — statistiques
router.get('/dashboard', adminAuth, (req, res) => {
  const totalClients = db.prepare('SELECT COUNT(*) as total FROM clients').get().total;
  const formule15k = db.prepare("SELECT COUNT(*) as total FROM clients WHERE abonnement LIKE '%15%'").get().total;
  const formule20k = db.prepare("SELECT COUNT(*) as total FROM clients WHERE abonnement LIKE '%20%'").get().total;
  const abonnesJus = db.prepare("SELECT COUNT(*) as total FROM clients WHERE abonnement_jus IS NOT NULL AND abonnement_jus != 'Aucun'").get().total;
  const messagesNonLus = db.prepare('SELECT COUNT(*) as total FROM messages WHERE lu = 0').get().total;
  const notesMoyenne = db.prepare('SELECT AVG(note) as moyenne FROM avis').get().moyenne;

  res.json({
    succes: true,
    stats: {
      totalClients,
      formule15k,
      formule20k,
      abonnesJus,
      messagesNonLus,
      noteMoyenne: notesMoyenne ? notesMoyenne.toFixed(1) : '—'
    }
  });
});

// ── LISTE DES ABONNEMENTS
router.get('/abonnements', adminAuth, (req, res) => {
  const clients = db.prepare(`
    SELECT id, prenom, nom, email, telephone, adresse_livraison,
           abonnement, abonnement_jus, actif, created_at
    FROM clients ORDER BY created_at DESC
  `).all();
  res.json({ succes: true, clients });
});

// ── JOURS DE REPOS DE TOUS LES CLIENTS
router.get('/repos', adminAuth, (req, res) => {
  const repos = db.prepare(`
    SELECT clients.prenom, clients.nom, jours_repos.jour
    FROM jours_repos
    JOIN clients ON jours_repos.client_id = clients.id
    ORDER BY clients.nom
  `).all();
  res.json({ succes: true, repos });
});

module.exports = router;

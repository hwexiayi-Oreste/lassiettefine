const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/init');

// ── MIDDLEWARE : vérifier que l'admin est connecté
function adminAuth(req, res, next) {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  next();
}

// ── CONNEXION ADMIN
router.post('/login', (req, res) => {
  const { identifiant, mot_de_passe } = req.body;
  if (!identifiant || !mot_de_passe) {
    return res.json({ succes: false, message: 'Identifiants requis.' });
  }
  try {
    const admin = db.prepare('SELECT * FROM admins WHERE identifiant = ?').get(identifiant);
    if (!admin) {
      return res.json({ succes: false, message: 'Identifiant incorrect.' });
    }
    const valide = bcrypt.compareSync(mot_de_passe, admin.mot_de_passe);
    if (!valide) {
      return res.json({ succes: false, message: 'Mot de passe incorrect.' });
    }
    req.session.admin = { id: admin.id, identifiant: admin.identifiant };
    res.json({ succes: true, message: 'Connexion réussie.' });
  } catch(e) {
    console.error('Erreur login admin:', e);
    res.json({ succes: false, message: 'Erreur serveur.' });
  }
});

// ── DÉCONNEXION ADMIN
router.post('/logout', (req, res) => {
  req.session.admin = null;
  res.json({ succes: true });
});

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
      totalClients, formule15k, formule20k,
      abonnesJus, messagesNonLus,
      noteMoyenne: notesMoyenne ? notesMoyenne.toFixed(1) : '—'
    }
  });
});

// ── MODIFIER LES MENUS
router.post('/menus', adminAuth, (req, res) => {
  const { menus } = req.body;
  if (!menus) return res.json({ succes: false, message: 'Données manquantes.' });
  try {
    const update = db.prepare('UPDATE menus SET plat = ? WHERE jour = ?');
    Object.entries(menus).forEach(([jour, plat]) => update.run(plat, jour));
    res.json({ succes: true, message: 'Menus mis à jour.' });
  } catch(e) {
    res.json({ succes: false, message: 'Erreur lors de la mise à jour.' });
  }
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

// ── RÉPONDRE À UN AVIS
router.post('/avis/reponse', adminAuth, (req, res) => {
  const { avisId, reponse } = req.body;
  try {
    db.prepare('UPDATE avis SET reponse_admin = ? WHERE id = ?').run(reponse, avisId);
    res.json({ succes: true });
  } catch(e) {
    res.json({ succes: false });
  }
});

module.exports = router;

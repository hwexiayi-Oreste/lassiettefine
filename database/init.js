const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Créer le dossier database s'il n'existe pas
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(__dirname, 'lassiettefine.db'));

// Activer les clés étrangères
db.pragma('foreign_keys = ON');

// ── TABLE CLIENTS
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prenom TEXT NOT NULL,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telephone TEXT,
    adresse_livraison TEXT,
    mot_de_passe TEXT NOT NULL,
    abonnement TEXT DEFAULT NULL,
    abonnement_jus TEXT DEFAULT NULL,
    actif INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── TABLE ADMIN
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifiant TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL
  )
`);

// ── TABLE MENUS
db.exec(`
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jour TEXT NOT NULL,
    plat TEXT NOT NULL,
    semaine TEXT NOT NULL
  )
`);

// ── TABLE JOURS DE REPOS
db.exec(`
  CREATE TABLE IF NOT EXISTS jours_repos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    jour TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )
`);

// ── TABLE AVIS
db.exec(`
  CREATE TABLE IF NOT EXISTS avis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    note INTEGER NOT NULL,
    commentaire TEXT NOT NULL,
    reponse_admin TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )
`);

// ── TABLE MESSAGES CONTACT
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prenom TEXT NOT NULL,
    nom TEXT NOT NULL,
    email TEXT NOT NULL,
    telephone TEXT,
    sujet TEXT,
    message TEXT NOT NULL,
    lu INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── INSÉRER L'ADMIN PAR DÉFAUT (identifiant: admin / mot de passe: admin123)
const bcrypt = require('bcryptjs');
const adminExiste = db.prepare('SELECT id FROM admins WHERE identifiant = ?').get('admin');
if (!adminExiste) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admins (identifiant, mot_de_passe) VALUES (?, ?)').run('admin', hash);
  console.log('✅ Admin créé — identifiant: admin / mot de passe: admin123');
}

// ── INSÉRER LES MENUS PAR DÉFAUT
const menusExistent = db.prepare('SELECT id FROM menus LIMIT 1').get();
if (!menusExistent) {
  const semaine = 'S1';
  const jours = [
    { jour: 'Lundi',    plat: 'Riz Jollof au poulet braisé' },
    { jour: 'Mardi',    plat: 'Pâte rouge au poisson fumé' },
    { jour: 'Mercredi', plat: 'Igname pilée, sauce arachide' },
    { jour: 'Jeudi',    plat: 'Riz gras béninois et salade fraîche' },
    { jour: 'Vendredi', plat: 'Attiéké togolais, poisson grillé' },
    { jour: 'Samedi',   plat: 'Gari foto et œufs du village' },
  ];
  const insert = db.prepare('INSERT INTO menus (jour, plat, semaine) VALUES (?, ?, ?)');
  jours.forEach(({ jour, plat }) => insert.run(jour, plat, semaine));
  console.log('✅ Menus par défaut créés');
}

module.exports = db;

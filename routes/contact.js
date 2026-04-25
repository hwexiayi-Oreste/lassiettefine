const express = require('express');
const router = express.Router();
const db = require('../database/init');
const nodemailer = require('nodemailer');

// ── CONFIGURATION EMAIL ────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// ── ENVOYER UN MESSAGE ─────────────────────────────────────
router.post('/', async (req, res) => {
  const { prenom, nom, email, telephone, sujet, message } = req.body;
  if (!prenom || !email || !message) {
    return res.json({ succes: false, message: 'Veuillez remplir les champs obligatoires.' });
  }

  // Sauvegarder dans la base de données
  db.prepare(`
    INSERT INTO messages (prenom, nom, email, telephone, sujet, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(prenom, nom || '', email, telephone || '', sujet || '', message);

  // Envoyer l'email à lassiettefine@gmail.com
  try {
    await transporter.sendMail({
      from: `"L'Assiette Fine" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `📩 Nouveau message de ${prenom} ${nom || ''} — ${sujet || 'Contact'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3A1506; padding: 24px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 1.5rem;">L'Assiette Fine</h1>
            <p style="color: #FBF7F0; margin: 8px 0 0;">Nouveau message reçu</p>
          </div>
          <div style="background: #FBF7F0; padding: 32px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6B3018; font-weight: bold; width: 140px;">Prénom & Nom :</td>
                <td style="padding: 8px 0; color: #3A1506;">${prenom} ${nom || ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B3018; font-weight: bold;">Email :</td>
                <td style="padding: 8px 0; color: #3A1506;"><a href="mailto:${email}" style="color: #3A1506;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B3018; font-weight: bold;">Téléphone :</td>
                <td style="padding: 8px 0; color: #3A1506;">${telephone || 'Non renseigné'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B3018; font-weight: bold;">Sujet :</td>
                <td style="padding: 8px 0; color: #3A1506;">${sujet || 'Non renseigné'}</td>
              </tr>
            </table>
            <div style="margin-top: 24px; padding: 20px; background: #fff; border-left: 4px solid #D4AF37; border-radius: 4px;">
              <p style="color: #6B3018; font-weight: bold; margin: 0 0 12px;">Message :</p>
              <p style="color: #3A1506; margin: 0; line-height: 1.6;">${message}</p>
            </div>
            <div style="margin-top: 24px; text-align: center;">
              <a href="mailto:${email}" style="background: #3A1506; color: #D4AF37; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Répondre à ${prenom}</a>
            </div>
          </div>
          <div style="background: #3A1506; padding: 16px; text-align: center;">
            <p style="color: #9a8070; margin: 0; font-size: 0.85rem;">L'Assiette Fine · Cotonou, Bénin · +229 01 46 33 89 36</p>
          </div>
        </div>
      `
    });
    console.log('✅ Email envoyé pour message de', prenom);
  } catch(e) {
    console.error('❌ Erreur envoi email:', e.message);
    // On continue même si l'email échoue — le message est sauvegardé
  }

  res.json({ succes: true, message: 'Message envoyé ! Nous vous répondrons sous 24h.' });
});

// ── VOIR TOUS LES MESSAGES (admin seulement) ───────────────
router.get('/', (req, res) => {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json({ succes: true, messages });
});

// ── MARQUER UN MESSAGE COMME LU (admin) ───────────────────
router.put('/:id/lu', (req, res) => {
  if (!req.session.admin) {
    return res.json({ succes: false, message: 'Accès refusé.' });
  }
  db.prepare('UPDATE messages SET lu = 1 WHERE id = ?').run(req.params.id);
  res.json({ succes: true });
});

module.exports = router;

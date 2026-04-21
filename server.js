'use strict';
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const nodemailer = require('nodemailer');

// ── Stripe (optional — only needed for checkout) ──
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set — payment endpoints disabled.');
}

// ── Nodemailer transport ──
let mailer = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  mailer = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  mailer.verify(err => {
    if (err) console.error('[Email] SMTP connection failed:', err.message);
    else     console.log('[Email] SMTP ready');
  });
} else {
  console.warn('[Email] EMAIL_USER / EMAIL_PASS not set — running in demo mode (codes logged to console).');
}

const FROM = process.env.EMAIL_FROM
  || (process.env.EMAIL_USER ? `"Now Book Store" <${process.env.EMAIL_USER}>` : '"Now Book Store" <no-reply@nowbookstore.com>');

// ── Email templates ──
function verificationEmailHtml(code) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.09);max-width:520px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#0c1826;padding:24px 32px;">
          <span style="color:#fff;font-size:1.2rem;font-weight:700;">
            <span style="display:inline-block;width:10px;height:10px;background:#62d84e;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>Now Book Store
          </span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          <h1 style="color:#0c1826;font-size:1.5rem;font-weight:800;margin:0 0 12px;">Verify your email</h1>
          <p style="color:#555;font-size:.95rem;line-height:1.65;margin:0 0 20px;">
            Thanks for subscribing to Now Book Store! Enter the code below to confirm your email and unlock your <strong style="color:#0c1826;">10% welcome discount</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#f4f6f8;border:2px dashed #62d84e;border-radius:10px;padding:28px;text-align:center;">
              <div style="font-size:2.8rem;font-weight:800;letter-spacing:.45em;color:#0c1826;font-family:'Courier New',monospace;">${code}</div>
              <div style="font-size:.78rem;color:#999;margin-top:8px;">Expires in 10 minutes</div>
            </td></tr>
          </table>
          <p style="color:#999;font-size:.82rem;line-height:1.5;margin:24px 0 0;">
            If you didn't subscribe to Now Book Store, you can safely ignore this email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f4f6f8;padding:18px 32px;text-align:center;">
          <p style="color:#aaa;font-size:.75rem;margin:0;">&copy; 2026 Now Book Store &mdash; Made with love for readers</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeEmailHtml(promoCode) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.09);max-width:520px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#0c1826;padding:24px 32px;">
          <span style="color:#fff;font-size:1.2rem;font-weight:700;">
            <span style="display:inline-block;width:10px;height:10px;background:#62d84e;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>Now Book Store
          </span>
        </td></tr>
        <!-- Hero strip -->
        <tr><td style="background:linear-gradient(135deg,#0c1826 0%,#1a2f47 100%);padding:32px;text-align:center;">
          <div style="font-size:2.5rem;margin-bottom:8px;">📚</div>
          <h1 style="color:#fff;font-size:1.5rem;font-weight:800;margin:0 0 6px;">Welcome to Now Book Store!</h1>
          <p style="color:rgba(255,255,255,.7);font-size:.95rem;margin:0;">You're officially part of our reading community.</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          <p style="color:#333;font-size:.95rem;line-height:1.65;margin:0 0 20px;">
            As a thank-you for joining, here's your exclusive discount code. Use it at checkout to save 10% on your entire order:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#e9fbe5;border:2px solid #62d84e;border-radius:10px;padding:24px;text-align:center;">
              <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#4ab038;margin-bottom:6px;">Your discount code</div>
              <div style="font-size:1.8rem;font-weight:800;letter-spacing:.15em;color:#0c1826;">${promoCode}</div>
              <div style="font-size:.8rem;color:#666;margin-top:6px;">10% off your entire order &bull; No expiry</div>
            </td></tr>
          </table>
          <p style="color:#555;font-size:.88rem;line-height:1.6;margin:24px 0 20px;">
            Discover thousands of hand-picked titles across fiction, sci-fi, biography, and more. Happy reading!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${process.env.STORE_URL || 'http://localhost:3000'}" style="display:inline-block;background:#62d84e;color:#0c1826;font-weight:800;font-size:.95rem;padding:13px 32px;border-radius:100px;text-decoration:none;">Browse Books</a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f4f6f8;padding:18px 32px;text-align:center;">
          <p style="color:#aaa;font-size:.75rem;margin:0;">&copy; 2026 Now Book Store &mdash; Made with love for readers</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Express app ──
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Stripe config endpoint
app.get('/config', (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

// Create Stripe PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment is not configured. Set STRIPE_SECRET_KEY in .env.' });
  }
  try {
    const { amount } = req.body;
    if (!Number.isInteger(amount) || amount < 50) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error('[Stripe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Newsletter ──
const pendingVerifications = new Map();
const subscribedEmails     = new Set();

app.post('/newsletter/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const key = email.toLowerCase().trim();
  if (subscribedEmails.has(key)) {
    return res.status(400).json({ error: 'This email is already subscribed.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingVerifications.set(key, { code, expires: Date.now() + 10 * 60 * 1000 });

  if (mailer) {
    try {
      await mailer.sendMail({
        from:    FROM,
        to:      email,
        subject: 'Your Now Book Store verification code',
        html:    verificationEmailHtml(code),
      });
      console.log(`[Email] Verification code sent to ${key}`);
      res.json({ ok: true }); // don't expose code when email is configured
    } catch (err) {
      console.error('[Email] Failed to send verification email:', err.message);
      res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }
  } else {
    // Demo mode: log + return code
    console.log(`[Newsletter][Demo] Verification code for ${key}: ${code}`);
    res.json({ ok: true, demoCode: code });
  }
});

app.post('/newsletter/verify', async (req, res) => {
  const { email, code } = req.body;
  const key     = email?.toLowerCase().trim();
  const pending = pendingVerifications.get(key);

  if (!pending) {
    return res.status(400).json({ error: 'No pending verification for this email. Please subscribe again.' });
  }
  if (Date.now() > pending.expires) {
    pendingVerifications.delete(key);
    return res.status(400).json({ error: 'Code expired. Please subscribe again.' });
  }
  if (pending.code !== String(code).trim()) {
    return res.status(400).json({ error: 'Incorrect code. Please try again.' });
  }

  pendingVerifications.delete(key);
  subscribedEmails.add(key);

  const promoCode = 'NEWSLETTER10';

  if (mailer) {
    try {
      await mailer.sendMail({
        from:    FROM,
        to:      email,
        subject: 'Welcome to Now Book Store — Your 10% discount is here!',
        html:    welcomeEmailHtml(promoCode),
      });
      console.log(`[Email] Welcome email sent to ${key}`);
    } catch (err) {
      console.error('[Email] Failed to send welcome email:', err.message);
      // Still return success — promo code is shown in the UI
    }
  }

  res.json({ ok: true, promoCode });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Now Book Store → http://localhost:${PORT}`));

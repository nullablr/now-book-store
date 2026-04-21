'use strict';

let pendingEmail = '';

const nlForm        = document.getElementById('newsletterForm');
const nlVerifyWrap  = document.getElementById('newsletterVerifyWrap');
const nlSuccessWrap = document.getElementById('newsletterSuccessWrap');
const nlErrEl       = document.getElementById('newsletterError');
const nlSubmitBtn   = document.getElementById('newsletterSubmitBtn');

function nlShowError(msg) {
  nlErrEl.textContent = (msg === 'Failed to fetch' || msg === 'NetworkError when attempting to fetch resource.')
    ? 'Could not reach the server. Start it with: npm run dev'
    : msg;
  nlErrEl.hidden = false;
}
function nlClearError() { nlErrEl.hidden = true; }

nlForm?.addEventListener('submit', async e => {
  e.preventDefault();
  nlClearError();
  const email = document.getElementById('newsletterEmail').value.trim();
  if (!email) return nlShowError('Please enter your email address.');

  nlSubmitBtn.disabled    = true;
  nlSubmitBtn.textContent = 'Sending…';

  try {
    const res  = await fetch('/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    pendingEmail = email;
    document.getElementById('newsletterEmailDisplay').textContent = email;

    if (data.demoCode) {
      document.getElementById('newsletterDemoNote').textContent =
        `Demo mode — your code is: ${data.demoCode}`;
    }

    nlForm.hidden        = true;
    nlVerifyWrap.hidden  = false;
    document.getElementById('newsletterCode').focus();

  } catch (err) {
    nlShowError(err.message);
    nlSubmitBtn.disabled    = false;
    nlSubmitBtn.textContent = 'Subscribe';
  }
});

document.getElementById('newsletterVerifyForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  nlClearError();
  const code = document.getElementById('newsletterCode').value.trim();
  if (code.length < 6) return nlShowError('Please enter the full 6-digit code.');

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled    = true;
  btn.textContent = 'Verifying…';

  try {
    const res  = await fetch('/newsletter/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed.');

    document.getElementById('newsletterPromoCode').textContent = data.promoCode;
    nlVerifyWrap.hidden  = true;
    nlSuccessWrap.hidden = false;

  } catch (err) {
    nlShowError(err.message);
    btn.disabled    = false;
    btn.textContent = 'Verify';
  }
});

document.getElementById('newsletterResendBtn')?.addEventListener('click', async () => {
  nlClearError();
  const btn = document.getElementById('newsletterResendBtn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    const res  = await fetch('/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not resend.');

    if (data.demoCode) {
      document.getElementById('newsletterDemoNote').textContent =
        `Demo mode — your new code is: ${data.demoCode}`;
    }
    btn.textContent = 'Code sent!';
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Resend code'; }, 3000);

  } catch (err) {
    nlShowError(err.message);
    btn.disabled    = false;
    btn.textContent = 'Resend code';
  }
});

// POST /api/contact — validates a contact submission and emails it via Mailgun.
// Cloudflare Pages env vars required:
//   MAILGUN_API_KEY   Mailgun private API key
//   MAILGUN_DOMAIN    a VERIFIED Mailgun sending domain (e.g. an existing one like mg.incremento.co)
// Optional:
//   MAILGUN_BASE      API base — default https://api.eu.mailgun.net (EU region)
//   CONTACT_TO        destination inbox — default robin@lumley-savile.com
//   CONTACT_FROM      from address — default "STONE <noreply@{MAILGUN_DOMAIN}>"

export async function onRequestPost({ request, env }) {
  try {
    const ct = request.headers.get('content-type') || '';
    let data;
    if (ct.includes('application/json')) {
      data = await request.json().catch(() => ({}));
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form);
    }

    const name = (data.name || '').toString().trim();
    const email = (data.email || '').toString().trim();
    const topic = (data.topic || 'General enquiry').toString().trim();
    const message = (data.message || '').toString().trim();

    // honeypot — bots fill hidden fields; silently accept and drop
    if ((data.company || '').toString().trim()) return json({ ok: true });

    if (!name || !email || !message) return json({ error: 'missing_fields' }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'bad_email' }, 400);
    if (message.length > 5000) return json({ error: 'too_long' }, 400);

    if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
      return json({ error: 'email_not_configured' }, 503);
    }

    const base = env.MAILGUN_BASE || 'https://api.eu.mailgun.net';
    const to = env.CONTACT_TO || 'robin@lumley-savile.com';
    const from = env.CONTACT_FROM || `STONE <noreply@${env.MAILGUN_DOMAIN}>`;

    const body = new URLSearchParams();
    body.set('from', from);
    body.set('to', to);
    body.set('h:Reply-To', email);
    body.set('subject', `STONE enquiry — ${topic} — ${name}`);
    body.set('text',
      `New enquiry from stonegrinder.co\n\n` +
      `Name:  ${name}\n` +
      `Email: ${email}\n` +
      `Topic: ${topic}\n\n` +
      `${message}\n`);

    const res = await fetch(`${base}/v3/${env.MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa('api:' + env.MAILGUN_API_KEY) },
      body,
    });

    if (!res.ok) return json({ error: 'send_failed' }, 502);
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'server_error' }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

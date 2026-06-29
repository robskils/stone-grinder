// Branded password gate for the whole site.
// Activates only when SITE_PASSWORD is set in the Cloudflare Pages project env.
// Until then the site is open. Optional: SITE_GATE_TITLE to override the subtitle.

const COOKIE = 'stone_gate';

export async function onRequest(context) {
  const { request, env, next } = context;
  const password = env.SITE_PASSWORD;
  if (!password) return next(); // gate disabled until a password is set

  const url = new URL(request.url);
  const token = await sha256(password);

  // already unlocked?
  const cookies = request.headers.get('Cookie') || '';
  if (cookies.split(/;\s*/).includes(`${COOKIE}=${token}`)) return next();

  // handle the unlock submission
  if (request.method === 'POST' && url.pathname === '/__gate') {
    const form = await request.formData().catch(() => null);
    const given = form && (form.get('password') || '').toString();
    if (given === password) {
      return new Response(null, {
        status: 303,
        headers: {
          'Location': '/',
          'Set-Cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }
    return gate(true); // wrong password
  }

  // let the gate's own logo through so the landing page can show it
  if (request.method === 'GET' && url.pathname === '/assets/stone-device-white.svg') return next();

  // everything else → the gate page
  return gate(false);
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function gate(error) {
  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>STONE</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%230a0a0a'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Space+Mono&display=swap" rel="stylesheet">
<style>
:root{--ink:#0a0a0a;--bone:#f4f1ec;--steel:#8c9097;--line:rgba(244,241,236,.14)}
*{margin:0;box-sizing:border-box}
html,body{height:100%}
body{background:var(--ink);color:var(--bone);font-family:"Space Grotesk",system-ui,sans-serif;display:grid;place-items:center;padding:24px;-webkit-font-smoothing:antialiased}
.gate{width:100%;max-width:380px;text-align:center}
.gate__mark{width:60px;height:60px;margin:0 auto 26px}
.gate__word{font-size:1.6rem;font-weight:700;letter-spacing:.34em;padding-left:.34em;margin-bottom:22px}
.gate__sub{font-family:"Space Mono",monospace;font-size:.72rem;letter-spacing:.26em;text-transform:uppercase;color:var(--steel);margin-bottom:40px}
form{display:flex;flex-direction:column;gap:12px}
input{background:rgba(244,241,236,.04);border:1px solid var(--line);border-radius:100px;padding:15px 22px;color:var(--bone);font-family:inherit;font-size:1rem;text-align:center;letter-spacing:.04em;transition:border-color .3s}
input::placeholder{color:var(--steel)}
input:focus{outline:none;border-color:var(--bone)}
button{background:var(--bone);color:var(--ink);border:none;border-radius:100px;padding:15px;font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;transition:transform .25s,box-shadow .25s}
button:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(0,0,0,.5)}
.gate__err{color:#d98a5a;font-family:"Space Mono",monospace;font-size:.74rem;letter-spacing:.06em;min-height:1.2em;margin-top:14px}
.gate__foot{margin-top:44px;font-family:"Space Mono",monospace;font-size:.64rem;letter-spacing:.14em;color:var(--steel)}
</style></head>
<body>
<main class="gate">
  <img class="gate__mark" src="/assets/stone-device-white.svg" alt="STONE" width="60" height="60">
  <div class="gate__word">STONE</div>
  <p class="gate__sub">Private preview</p>
  <form method="POST" action="/__gate" autocomplete="off">
    <input type="password" name="password" placeholder="Enter password" aria-label="Password" autofocus required>
    <button type="submit">Enter</button>
  </form>
  <p class="gate__err">${error ? 'Incorrect password. Try again.' : ''}</p>
  <p class="gate__foot">© 2026 STONE · The Finest Grinder</p>
</main>
</body></html>`;
  return new Response(html, {
    status: error ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

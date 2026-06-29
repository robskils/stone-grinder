// POST /api/checkout — creates a Stripe Checkout Session and returns { url }
// Requires Cloudflare Pages env vars:
//   STRIPE_SECRET_KEY        (secret)  e.g. sk_live_... / sk_test_...
//   PRICE_MIRROR             Stripe Price ID for the Mirror Shine variant
//   PRICE_STEALTH            Stripe Price ID for the Matte Stealth variant
// Optional:
//   SITE_URL                 canonical site origin for redirect URLs

export async function onRequestPost({ request, env }) {
  try {
    const { finish = 'mirror', qty = 1 } = await request.json().catch(() => ({}));

    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: 'payments_not_configured' }, 503);
    }

    const priceId = finish === 'stealth' ? env.PRICE_STEALTH : env.PRICE_MIRROR;
    if (!priceId) return json({ error: 'price_missing' }, 503);

    const origin = env.SITE_URL || new URL(request.url).origin;
    const quantity = Math.min(Math.max(parseInt(qty, 10) || 1, 1), 5);

    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('line_items[0][price]', priceId);
    form.set('line_items[0][quantity]', String(quantity));
    form.set('success_url', `${origin}/?status=success&session_id={CHECKOUT_SESSION_ID}`);
    form.set('cancel_url', `${origin}/#acquire`);
    form.set('automatic_tax[enabled]', 'true');
    form.set('allow_promotion_codes', 'true');
    form.set('billing_address_collection', 'required');
    form.set('shipping_address_collection[allowed_countries][0]', 'PT');
    form.set('shipping_address_collection[allowed_countries][1]', 'GB');
    form.set('shipping_address_collection[allowed_countries][2]', 'US');
    form.set('shipping_address_collection[allowed_countries][3]', 'DE');
    form.set('shipping_address_collection[allowed_countries][4]', 'FR');
    form.set('phone_number_collection[enabled]', 'true');
    form.set('metadata[finish]', finish);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });

    const data = await res.json();
    if (!res.ok) {
      return json({ error: 'stripe_error', detail: data.error?.message }, 502);
    }
    return json({ url: data.url });
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

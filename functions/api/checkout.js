// POST /api/checkout — creates a Stripe Checkout Session for the Founding Batch
// pre-subscription and returns { url }.
//
// Required Cloudflare Pages env var:
//   STRIPE_SECRET_KEY        (secret)  e.g. sk_live_... / sk_test_...
// Optional:
//   FOUNDER_PRICE_CENTS      unit price in cents (default 11900 = €119)
//   SITE_URL                 canonical site origin for redirect URLs
//
// Price is built inline (price_data), so no Stripe Price IDs need to exist —
// you only have to paste in STRIPE_SECRET_KEY.

export async function onRequestPost({ request, env }) {
  try {
    const { finish = 'mirror', qty = 1 } = await request.json().catch(() => ({}));

    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: 'payments_not_configured' }, 503);
    }

    const unitAmount = parseInt(env.FOUNDER_PRICE_CENTS, 10) || 11900; // €119
    const finishLabel = finish === 'stealth' ? 'Matte Stealth' : 'Mirror Shine';
    // No artificial cap — buyers can reserve as many as they like (the batch is 400).
    const quantity = Math.min(Math.max(parseInt(qty, 10) || 1, 1), 400);

    const origin = env.SITE_URL || new URL(request.url).origin;

    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('submit_type', 'book');
    form.set('line_items[0][price_data][currency]', 'eur');
    form.set('line_items[0][price_data][unit_amount]', String(unitAmount));
    form.set('line_items[0][price_data][tax_behavior]', 'inclusive');
    form.set('line_items[0][price_data][product_data][name]', `STONE — Founding Batch · ${finishLabel}`);
    form.set('line_items[0][price_data][product_data][description]', 'Individually numbered pre-subscription · STONE Members Club · founding price €119');
    form.set('line_items[0][quantity]', String(quantity));
    form.set('line_items[0][adjustable_quantity][enabled]', 'true');
    form.set('line_items[0][adjustable_quantity][minimum]', '1');
    form.set('line_items[0][adjustable_quantity][maximum]', '400');
    form.set('success_url', `${origin}/?status=reserved&session_id={CHECKOUT_SESSION_ID}`);
    form.set('cancel_url', `${origin}/#founders`);
    form.set('allow_promotion_codes', 'true');
    form.set('billing_address_collection', 'required');
    form.set('phone_number_collection[enabled]', 'true');
    ['PT', 'ES', 'FR', 'DE', 'IT', 'NL', 'IE', 'BE', 'AT', 'LU', 'GB', 'US', 'CA', 'AU', 'CH', 'SE', 'DK', 'NO', 'FI', 'PL'].forEach((c, i) => {
      form.set(`shipping_address_collection[allowed_countries][${i}]`, c);
    });
    form.set('metadata[founding_batch]', 'true');
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

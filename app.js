/* ░░░░░ STONE ░░░░░ */

/* sticky nav */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 24);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* scroll reveal */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
  io.observe(el);
});

/* one finish — Mirror Shine; checkout button reference */
const checkoutBtn = document.getElementById('checkout');

/* quantity stepper — any amount, 1 and up */
const UNIT = 119;
const STD = 149.95;
const qtyInput = document.getElementById('buyQty');
const buyAmt = document.getElementById('buyAmt');
const buyWas = document.getElementById('buyWas');
const buySave = document.getElementById('buySave');
function eur(n) { return '€' + n.toLocaleString('en-IE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
function clampQty(n) { n = parseInt(n, 10); if (!n || n < 1) n = 1; if (n > 400) n = 400; return n; }
function syncQty() {
  if (!qtyInput) return;
  const n = clampQty(qtyInput.value);
  qtyInput.value = n;
  if (buyAmt) buyAmt.textContent = eur(UNIT * n);
  if (buyWas) buyWas.textContent = eur(+(STD * n).toFixed(2));
  if (buySave) buySave.textContent = 'Save ' + eur(+((STD - UNIT) * n).toFixed(2));
}
if (qtyInput) {
  qtyInput.addEventListener('input', syncQty);
  qtyInput.addEventListener('change', syncQty);
  document.querySelectorAll('[data-qty]').forEach((b) => {
    b.addEventListener('click', () => { qtyInput.value = clampQty(qtyInput.value) + parseInt(b.dataset.qty, 10); syncQty(); });
  });
  syncQty();
}

/* checkout → Stripe */
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    const finish = checkoutBtn.dataset.finish || 'mirror';
    const qty = qtyInput ? clampQty(qtyInput.value) : 1;
    const original = checkoutBtn.textContent;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Opening secure checkout…';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finish, qty }),
      });
      if (!res.ok) throw new Error('checkout unavailable');
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      throw new Error('no url');
    } catch (err) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = original;
      alert('Checkout is not live yet — add your Stripe key in Cloudflare to enable payments.');
    }
  });
}

/* subtle pointer tilt on hero stage */
const tilt = document.querySelector('[data-tilt]');
if (tilt && window.matchMedia('(pointer:fine)').matches) {
  const obj = tilt.querySelector('.stage__object');
  tilt.addEventListener('pointermove', (e) => {
    const r = tilt.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    obj.style.transform = `rotateX(${y * -7}deg) rotateY(${x * 9}deg) translateZ(0)`;
  });
  tilt.addEventListener('pointerleave', () => { obj.style.transform = ''; });
}

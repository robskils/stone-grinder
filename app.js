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

/* finish switch (showcase) */
const finishSection = document.getElementById('finish');
const FINISHES = {
  mirror: {
    title: 'Mirror Shine',
    desc: 'A flawless polished chrome that throws the room back at you. The showpiece. The one you leave on the table.',
  },
  stealth: {
    title: 'Matte Stealth',
    desc: 'A deep, light-drinking matte that vanishes in the hand. Tactical, quiet, and fingerprint-proof. For the purist.',
  },
};
if (finishSection) {
  const titleEl = finishSection.querySelector('[data-finish-title]');
  const descEl = finishSection.querySelector('[data-finish-desc]');
  const objEl = finishSection.querySelector('[data-finish-object]');
  finishSection.querySelectorAll('.finish__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const set = btn.dataset.set;
      finishSection.dataset.finish = set;
      finishSection.querySelectorAll('.finish__btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      titleEl.textContent = FINISHES[set].title;
      descEl.textContent = FINISHES[set].desc;
      if (objEl) objEl.dataset.label = FINISHES[set].title;
    });
  });
}

/* buy finish chips */
const checkoutBtn = document.getElementById('checkout');
document.querySelectorAll('[data-buy-finish]').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('[data-buy-finish]').forEach((c) => c.classList.toggle('is-active', c === chip));
    if (checkoutBtn) checkoutBtn.dataset.finish = chip.dataset.buyFinish;
  });
});

/* checkout → Stripe */
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    const finish = checkoutBtn.dataset.finish || 'mirror';
    const original = checkoutBtn.textContent;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Opening secure checkout…';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finish, qty: 1 }),
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

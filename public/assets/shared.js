/* shared interaction layer */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* reveal on scroll */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* autoplay portrait videos when in view, pause when out (muted, looped) */
  const vids = document.querySelectorAll('video[data-inview]');
  if (vids.length) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        const frame = v.closest('.vfeature-frame');
        if (e.isIntersecting) {
          if (!reduceMotion) {
            const p = v.play();
            if (p && p.catch) p.catch(() => {});
          }
          if (frame) frame.classList.add('is-playing');
        } else {
          v.pause();
          if (frame) frame.classList.remove('is-playing');
        }
      });
    }, { threshold: 0.45 });
    vids.forEach((v) => vio.observe(v));
  }

  /* per-video sound toggle */
  document.querySelectorAll('.vfeature-sound').forEach((btn) => {
    const frame = btn.closest('.vfeature-frame');
    const v = frame && frame.querySelector('video');
    if (!v) return;
    btn.addEventListener('click', () => {
      v.muted = !v.muted;
      btn.setAttribute('aria-pressed', String(!v.muted));
      if (!v.muted) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    });
  });

  /* mark current nav link (top-level only — never inside a mega-menu) */
  const path = (window.location.pathname.replace(/\/$/, '') || '/index.html').split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-menu > a, .nav-menu > .has-dropdown > a').forEach((a) => {
    const href = (a.getAttribute('href') || '').replace(/\/$/, '').split('/').pop();
    if (!href) return;
    if (path === href || (path === 'index.html' && (href === '' || href === 'index.html'))) {
      a.classList.add('current');
    }
  });

  /* nav link hover-roll: glow dot + double-stack text that rolls vertically.
     Built dynamically so we don't have to touch each page's nav markup.
     Scoped to top-level nav links only — never the mega-menu contents. */
  if (!reduceMotion) {
    const topLevelLinks = document.querySelectorAll('.nav-menu > a, .nav-menu > .has-dropdown > a');
    topLevelLinks.forEach((a) => {
      if (a.dataset.rolled) return;
      // pull out the chev (dropdown trigger marker), if any, and re-append after
      const chev = a.querySelector('.chev');
      if (chev) chev.remove();
      const label = a.textContent.trim();
      if (!label) return;
      a.textContent = '';
      const dot = document.createElement('span');
      dot.className = 'roll-dot';
      const wrap = document.createElement('span');
      wrap.className = 'roll-wrap';
      const top = document.createElement('span');
      top.className = 'roll-top';
      top.textContent = label;
      const bot = document.createElement('span');
      bot.className = 'roll-bot';
      bot.textContent = label;
      bot.setAttribute('aria-hidden', 'true');
      wrap.appendChild(top);
      wrap.appendChild(bot);
      a.appendChild(dot);
      a.appendChild(wrap);
      if (chev) a.appendChild(chev);
      a.dataset.rolled = '1';
    });
  }

  /* scroll-aware nav: compact background past 25% viewport,
     auto-hide on scroll-down past full viewport, reveal on scroll-up. */
  const nav = document.querySelector('.nav');
  if (nav && !reduceMotion) {
    let lastY = window.scrollY;
    let ticking = false;
    const threshold = 40;
    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      nav.classList.toggle('is-scrolled', y > vh / 4);
      const delta = y - lastY;
      if (y > vh) {
        if (delta > threshold) nav.classList.add('is-hidden');
        else if (delta < -threshold) nav.classList.remove('is-hidden');
      } else {
        nav.classList.remove('is-hidden');
      }
      if (Math.abs(delta) > threshold) lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* generic segmented switcher: wrap with [data-segmented] and pair buttons[data-target] -> .seg-panel#target */
  document.querySelectorAll('[data-segmented]').forEach((root) => {
    const buttons = root.querySelectorAll('button[data-target]');
    const panelHost = document.querySelector(root.dataset.segmentedHost) || document;
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.target;
        panelHost.querySelectorAll('.seg-panel').forEach((p) => p.classList.remove('active'));
        const next = panelHost.querySelector('.seg-panel#' + target);
        if (next) next.classList.add('active');
      });
    });
  });

  /* ── mobile nav hamburger ──────────────────── */
  const burger    = document.querySelector('.nav-burger');
  const mobileNav = document.querySelector('.nav-mobile');
  if (burger && mobileNav) {
    const close = () => {
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      mobileNav.classList.remove('is-open');
      mobileNav.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    burger.addEventListener('click', () => {
      const opening = !burger.classList.contains('is-open');
      if (opening) {
        burger.classList.add('is-open');
        burger.setAttribute('aria-expanded', 'true');
        mobileNav.classList.add('is-open');
        mobileNav.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      } else {
        close();
      }
    });
    /* accordion: expand/collapse a submenu group */
    mobileNav.querySelectorAll('.nav-mobile-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.nav-mobile-group');
        if (!group) return;
        const opening = !group.classList.contains('is-open');
        group.classList.toggle('is-open', opening);
        btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });
    });
    /* close when any mobile-nav link is tapped */
    mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    /* close on Escape key */
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    /* close when nav auto-hides on scroll (is-hidden state) */
    if (nav) {
      const mo = new MutationObserver(() => {
        if (nav.classList.contains('is-hidden')) close();
      });
      mo.observe(nav, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* cookie banner — inject + manage state */
  const COOKIE_KEY = 'navon-cookies-acknowledged';
  if (!localStorage.getItem(COOKIE_KEY)) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = [
      '<div class="ck-eyebrow">Cookies</div>',
      '<p>We use a small number of cookies to make this site work and to understand how it\u2019s used. Read our <a href="legal/cookie-preferences.html">cookie preferences</a>.</p>',
      '<div class="cookie-banner-actions">',
      '  <button class="accept">Accept all</button>',
      '  <button class="manage" onclick="window.location.href=\'legal/cookie-preferences.html\'">Manage</button>',
      '</div>'
    ].join('');
    document.body.appendChild(banner);
    /* slight delay so the slide-up reads as intentional */
    setTimeout(() => banner.classList.add('show'), 600);
    banner.querySelector('.accept').addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, '1');
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 600);
    });
  }
})();

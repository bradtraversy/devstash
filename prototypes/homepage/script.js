/* ============================================
   CHAOS ICON ANIMATION
   ============================================ */
(function () {
  const container = document.getElementById('chaosContainer');
  if (!container) return;

  const icons = container.querySelectorAll('.chaos-icon');
  const SPEED = 0.6;
  const REPEL_RADIUS = 80;
  const REPEL_FORCE = 0.5;

  let mouse = { x: -9999, y: -9999 };
  let containerRect = container.getBoundingClientRect();

  // Track mouse position relative to container
  container.addEventListener('mousemove', (e) => {
    containerRect = container.getBoundingClientRect();
    mouse.x = e.clientX - containerRect.left;
    mouse.y = e.clientY - containerRect.top;
  });

  container.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Initialize icon state
  const state = Array.from(icons).map((icon) => {
    const w = containerRect.width || 400;
    const h = containerRect.height || 280;
    const angle = Math.random() * Math.PI * 2;
    return {
      el: icon,
      x: Math.random() * (w - 40),
      y: Math.random() * (h - 40),
      vx: Math.cos(angle) * SPEED,
      vy: Math.sin(angle) * SPEED,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 0.8,
      scale: 0.9 + Math.random() * 0.2,
      scaleDir: Math.random() > 0.5 ? 1 : -1,
    };
  });

  function animate() {
    containerRect = container.getBoundingClientRect();
    const w = containerRect.width;
    const h = containerRect.height;

    for (const s of state) {
      // Mouse repulsion
      const dx = s.x + 30 - mouse.x;
      const dy = s.y + 30 - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPEL_RADIUS && dist > 0) {
        const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
      }

      // Dampen velocity
      s.vx *= 0.98;
      s.vy *= 0.98;

      // Ensure minimum speed
      const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (speed < SPEED * 0.5) {
        const angle = Math.atan2(s.vy, s.vx);
        s.vx = Math.cos(angle) * SPEED * 0.5;
        s.vy = Math.sin(angle) * SPEED * 0.5;
      }

      // Move
      s.x += s.vx;
      s.y += s.vy;

      // Bounce off walls
      if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); }
      if (s.x > w - 60) { s.x = w - 60; s.vx = -Math.abs(s.vx); }
      if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); }
      if (s.y > h - 60) { s.y = h - 60; s.vy = -Math.abs(s.vy); }

      // Rotation
      s.rotation += s.rotSpeed;

      // Scale pulsing
      s.scale += s.scaleDir * 0.001;
      if (s.scale > 1.1) s.scaleDir = -1;
      if (s.scale < 0.85) s.scaleDir = 1;

      // Apply transform
      s.el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rotation}deg) scale(${s.scale})`;
    }

    requestAnimationFrame(animate);
  }

  // Wait for layout
  requestAnimationFrame(() => {
    containerRect = container.getBoundingClientRect();
    animate();
  });
})();

/* ============================================
   NAVBAR SCROLL EFFECT
   ============================================ */
(function () {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
})();

/* ============================================
   MOBILE MENU TOGGLE
   ============================================ */
(function () {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  // Close on link click
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
    });
  });
})();

/* ============================================
   SCROLL FADE-IN ANIMATIONS
   ============================================ */
(function () {
  const elements = document.querySelectorAll('.fade-in');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
})();

/* ============================================
   PRICING TOGGLE (Monthly / Yearly)
   ============================================ */
(function () {
  const toggle = document.getElementById('billingToggle');
  const monthlyLabel = document.getElementById('monthlyLabel');
  const yearlyLabel = document.getElementById('yearlyLabel');
  const proPrice = document.getElementById('proPrice');
  const proPeriod = document.getElementById('proPeriod');
  if (!toggle) return;

  let isYearly = false;

  // Set initial state
  monthlyLabel.classList.add('active');

  toggle.addEventListener('click', () => {
    isYearly = !isYearly;
    toggle.classList.toggle('yearly', isYearly);
    monthlyLabel.classList.toggle('active', !isYearly);
    yearlyLabel.classList.toggle('active', isYearly);

    if (isYearly) {
      proPrice.textContent = '$6';
      proPeriod.textContent = '/month (billed $72/yr)';
    } else {
      proPrice.textContent = '$8';
      proPeriod.textContent = '/month';
    }
  });
})();

/* ============================================
   FOOTER YEAR
   ============================================ */
(function () {
  const el = document.getElementById('currentYear');
  if (el) el.textContent = new Date().getFullYear();
})();

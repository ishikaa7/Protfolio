(() => {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    links.classList.toggle('open', open);
  });
  links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    links.classList.remove('open');
  }));

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.section-head, .about-text, .explore, .skill-row, .project, .exploring-project, .cert');
  revealItems.forEach(item => item.classList.add('reveal'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealItems.forEach(item => revealObserver.observe(item));
  } else revealItems.forEach(item => item.classList.add('visible'));

  const path = document.querySelector('.path-progress');
  const pathWrap = document.querySelector('.path-wrap');
  function drawPath() {
    if (!path || !pathWrap || reduceMotion || innerWidth < 601) return;
    const rect = pathWrap.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
    path.style.strokeDashoffset = String(1200 * (1 - progress));
  }
  addEventListener('scroll', drawPath, { passive: true });
  addEventListener('resize', drawPath);
  drawPath();

  const cursor = document.querySelector('.cursor');
  if (matchMedia('(pointer:fine)').matches && cursor) {
    addEventListener('pointermove', event => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });
    document.querySelectorAll('.project-visual, .project-info h3, .contact .button').forEach(element => {
      element.addEventListener('pointerenter', () => cursor.classList.add('active'));
      element.addEventListener('pointerleave', () => cursor.classList.remove('active'));
    });
  }

  const hero = document.querySelector('.hero h1');
  if (matchMedia('(pointer:fine)').matches && !reduceMotion && hero) {
    document.querySelector('.hero').addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
      hero.style.transform = `translate(${x * 4}px, ${y * 3}px)`;
    });
    document.querySelector('.hero').addEventListener('pointerleave', () => hero.style.transform = '');
  }
})();

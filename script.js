(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const imageConfig = window.portfolioImages || { profile: [], projects: {}, certificates: {} };
  const photoLayers = [];

  // Every asset is listed as one or more candidate paths; the first one that loads wins,
  // so the page works when served from the project root or from public/.
  function toList(value) { return (Array.isArray(value) ? value : [value]).filter(Boolean); }

  function attachLocalImage(container, candidates, alt, kind) {
    const sources = toList(candidates);
    if (!container || !sources.length) return null;
    const img = document.createElement('img');
    img.className = `local-image local-image-${kind}`;
    img.alt = alt;
    img.loading = kind === 'profile' ? 'eager' : 'lazy';
    img.decoding = 'async';
    let index = 0;
    img.addEventListener('load', () => container.classList.add('has-local-image'), { once: true });
    img.addEventListener('error', () => {
      index += 1;
      if (index < sources.length) { img.src = sources[index]; return; }
      img.remove();
      container.classList.add('image-fallback');
    }, { once: true });
    img.src = sources[0];
    container.prepend(img);
    return img;
  }

  // Certificates open as documents (PDF or image), so candidates are probed with a HEAD
  // request rather than an image decode. Probing is skipped on file:// where fetch is blocked.
  async function resolveDocument(candidates) {
    const sources = toList(candidates);
    if (!sources.length) return null;
    if (location.protocol === 'file:') return sources[0];
    for (const src of sources) {
      try { if ((await fetch(src, { method: 'HEAD' })).ok) return src; } catch { /* try next */ }
    }
    return sources[0];
  }

  // The portrait is a labeled local-asset slot; it fills with the image at
  // public/assets/profile/photo.jpeg once the browser loads it.
  const heroPhoto = document.createElement('figure');
  heroPhoto.className = 'hero-photo';
  heroPhoto.setAttribute('aria-label', 'Profile portrait image slot');
  heroPhoto.innerHTML = '<span class="photo-fallback mono">PROFILE<br>IMAGE</span><figcaption class="mono">ISHIKA BHUTE / PORTRAIT</figcaption>';
  attachLocalImage(heroPhoto, imageConfig.profile, 'Portrait of Ishika Bhute', 'profile');
  document.querySelector('.hero-copy')?.append(heroPhoto);

  const projectImageMap = {
    '01': 'vriddhi', '02': 'pathwayGenAI', '03': 'livenessAI', '04': 'sycaudit',
    '05': 'diabetes', '06': 'drowsiness',
  };
  document.querySelectorAll('.project').forEach(project => {
    const visual = project.querySelector('.project-visual');
    const key = projectImageMap[project.dataset.project];
    const title = project.querySelector('h3')?.innerText.replaceAll('\n', ' ').trim() || 'Project image';
    const image = attachLocalImage(visual, imageConfig.projects?.[key], `${title} project image`, 'project');
    if (image) photoLayers.push({ image, visual, key });
  });

  // Certificates open in an in-page viewer, so viewing never depends on a new tab.
  // Each row keeps its href as a real link for middle-click and "open in new tab".
  const viewer = document.createElement('div');
  viewer.className = 'cert-viewer';
  viewer.id = 'cert-viewer';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Certificate viewer');
  viewer.hidden = true;
  viewer.innerHTML = '<div class="viewer-bar mono"><span class="viewer-title mono"></span><span class="viewer-tools mono"><a class="viewer-open" target="_blank" rel="noopener">OPEN IN NEW TAB ↗</a><button class="viewer-close" type="button" aria-label="Close certificate viewer">CLOSE ✕</button></span></div><div class="viewer-body"></div>';
  document.body.append(viewer);
  const viewerTitle = viewer.querySelector('.viewer-title');
  const viewerBody = viewer.querySelector('.viewer-body');
  const viewerOpen = viewer.querySelector('.viewer-open');
  const viewerClose = viewer.querySelector('.viewer-close');
  let lastFocused = null;

  function showViewer(row) {
    const link = row.querySelector('a.cert-link');
    const src = link?.getAttribute('href');
    if (!src) return;
    const title = row.querySelector('h3')?.innerText.trim() || 'Certificate';
    const issuer = row.querySelector('p')?.innerText.trim() || '';
    lastFocused = document.activeElement;
    viewerTitle.textContent = `${title} — ${issuer}`;
    viewerOpen.href = src;
    viewerBody.replaceChildren();
    if (/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(src)) {
      const image = document.createElement('img');
      image.className = 'viewer-image';
      image.alt = `${title} certificate`;
      image.addEventListener('error', () => {
        viewerBody.innerHTML = '<p class="viewer-message mono">COULD NOT LOAD THIS CERTIFICATE IMAGE.<br>USE “OPEN IN NEW TAB” TO VIEW IT DIRECTLY.</p>';
      }, { once: true });
      viewerBody.append(image);
      image.src = src;
    } else {
      const frame = document.createElement('iframe');
      frame.className = 'viewer-frame';
      frame.title = `${title} certificate`;
      frame.src = src;
      viewerBody.append(frame);
    }
    viewer.hidden = false;
    document.documentElement.classList.add('viewer-open-lock');
    viewerClose.focus();
  }

  function hideViewer() {
    if (viewer.hidden) return;
    viewer.hidden = true;
    viewerBody.replaceChildren();
    document.documentElement.classList.remove('viewer-open-lock');
    lastFocused?.focus();
  }

  viewerClose.addEventListener('click', hideViewer);
  viewer.addEventListener('click', event => { if (event.target === viewer) hideViewer(); });
  addEventListener('keydown', event => { if (event.key === 'Escape') hideViewer(); });

  // Certification rows become links to the files in
  // public/assets/projects/certificates; rows without a file stay as plain text.
  const certConfig = imageConfig.certificates || {};
  document.querySelectorAll('.cert[data-cert]').forEach(row => {
    const sources = toList(certConfig[row.dataset.cert]);
    const mark = row.querySelector('.cert-mark');
    if (!sources.length) {
      row.classList.add('cert-pending');
      if (mark) mark.textContent = '—';
      return;
    }
    const link = document.createElement('a');
    link.className = 'cert-link';
    link.href = sources[0];
    link.setAttribute('aria-label', `${row.querySelector('h3')?.innerText.trim() || 'Certificate'} — view certificate`);
    while (row.firstChild) link.append(row.firstChild);
    row.append(link);
    row.classList.add('cert-linked');
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      showViewer(row);
    });
    resolveDocument(sources).then(resolved => { if (resolved) link.href = resolved; });
  });

  // Convert the first four editorial projects into one short, scroll-scrubbed
  // sequence. Their order follows the requested storytelling arc.
  const projectList = document.querySelector('.project-list');
  const pathWrap = document.querySelector('.path-wrap');
  const preferredOrder = ['01', '02', '03', '04', '05', '06'];
  const pinnedProjects = preferredOrder.map(id => projectList?.querySelector(`.project[data-project="${id}"]`)).filter(Boolean);
  if (projectList && pinnedProjects.length === 6) {
    const scrollSection = document.createElement('div');
    scrollSection.className = 'pinned-scroll';
    const stickyStage = document.createElement('div');
    stickyStage.className = 'pinned-sticky';
    stickyStage.setAttribute('aria-label', 'Featured projects. Scroll to explore each project.');
    const rail = document.createElement('div');
    rail.className = 'pinned-rail';
    rail.innerHTML = '<span class="mono rail-start">START</span><div class="pin-line"><svg class="spiral-desktop" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true"><path class="path-base" d="M200 200 C200 175 230 175 230 200 C230 230 170 230 170 200 C170 165 235 150 260 190 C290 240 230 280 180 260 C120 235 125 155 185 125 C250 95 320 150 310 220 C300 300 210 330 140 290 C60 245 70 130 155 75 C245 20 360 95 360 200 C360 320 235 380 125 330"/><path class="path-progress" d="M200 200 C200 175 230 175 230 200 C230 230 170 230 170 200 C170 165 235 150 260 190 C290 240 230 280 180 260 C120 235 125 155 185 125 C250 95 320 150 310 220 C300 300 210 330 140 290 C60 245 70 130 155 75 C245 20 360 95 360 200 C360 320 235 380 125 330"/></svg><svg class="spiral-mobile" viewBox="0 0 100 900" preserveAspectRatio="none" aria-hidden="true"><path class="path-base" d="M50 0 C50 70 12 55 12 120 S88 185 88 250 S12 315 12 380 S88 445 88 510 S12 575 12 640 S88 705 88 770 S50 820 50 900"/><path class="path-progress" d="M50 0 C50 70 12 55 12 120 S88 185 88 250 S12 315 12 380 S88 445 88 510 S12 575 12 640 S88 705 88 770 S50 820 50 900"/></svg><div class="pin-dots"><i>01</i><i>02</i><i>03</i><i>04</i><i>05</i><i>06</i></div></div><span class="mono rail-end">06</span><span class="pin-counter mono" aria-live="polite">01 / 06</span>';
    const sceneStack = document.createElement('div'); sceneStack.className = 'pin-scene-stack';
    pinnedProjects.forEach((project, index) => {
      const info = project.querySelector('.project-info');
      const visual = project.querySelector('.project-visual');
      const scene = document.createElement('article'); scene.className = 'pin-scene';
      scene.dataset.scene = String(index); scene.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
      scene.append(visual, info);
      sceneStack.append(scene);
      project.remove();
    });
    if (reduceMotion || innerWidth < 701) {
      sceneStack.querySelectorAll('.pin-scene').forEach(scene => scene.setAttribute('aria-hidden', 'false'));
    }
    if (pathWrap) rail.append(pathWrap);
    stickyStage.append(rail, sceneStack);
    scrollSection.append(stickyStage);
    projectList.prepend(scrollSection);
  }

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

  const revealItems = document.querySelectorAll('.section-head, .about-text, .explore, .skill-row, .project, .exploring-project, .cert');
  revealItems.forEach(item => item.classList.add('reveal'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealItems.forEach(item => revealObserver.observe(item));
  } else revealItems.forEach(item => item.classList.add('visible'));

  const pinnedScroll = document.querySelector('.pinned-scroll');
  const scenes = [...document.querySelectorAll('.pin-scene')];
  const pinDots = [...document.querySelectorAll('.pin-dots i')];
  const counter = document.querySelector('.pin-counter');
  const pinLine = document.querySelector('.pin-line');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const risingLines = [...document.querySelectorAll('.text-rise')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('text-rise-ready');
    const riseObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        riseObserver.unobserve(entry.target);
      }
    }), { threshold: 0.35 });
    risingLines.forEach(line => riseObserver.observe(line));
  } else risingLines.forEach(line => line.classList.add('is-visible'));

  let scrollFrame = 0;
  function requestScrollUpdate() { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateParallax(); updateHeroScroll(); }); }
  addEventListener('scroll', requestScrollUpdate, { passive: true });
  addEventListener('resize', requestScrollUpdate);

  if (pinnedScroll && scenes.length && gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const paths = [...document.querySelectorAll('.pinned-rail .path-progress')];
    const pathLengths = paths.map(path => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      return length;
    });
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: reduce)', () => {
      paths.forEach(path => path.style.strokeDashoffset = '0');
      scenes.forEach(scene => { scene.setAttribute('aria-hidden', 'false'); });
    });
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const isDesktop = innerWidth >= 701;
      const stickyStage = document.querySelector('.pinned-sticky');
      const activePath = () => document.querySelector(innerWidth >= 701 ? '.spiral-desktop .path-progress' : '.spiral-mobile .path-progress');
      const render = value => {
        const progress = Math.max(0, Math.min(1, value));
        const position = progress * (scenes.length - 1);
        const active = Math.min(scenes.length - 1, Math.floor(position + .001));
        const local = position - active;
        const path = activePath();
        const len = path?.getTotalLength() || pathLengths[0];
        if (path) { path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${len * (1 - progress)}`; }
        pinDots.forEach((dot, index) => {
          dot.classList.toggle('active', index <= position + .01);
          dot.classList.toggle('complete', index < active);
          dot.setAttribute('aria-current', index === active ? 'step' : 'false');
        });
        if (counter) counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
        scenes.forEach((scene, index) => {
          const delta = index - position;
          const info = scene.querySelector('.project-info');
          const visual = scene.querySelector('.project-visual');
          const visible = index === active || (index === active + 1 && local > .82);
          scene.setAttribute('aria-hidden', index === active ? 'false' : 'true');
          if (info) gsap.set(info, { autoAlpha: index === active ? 1 : Math.max(0, 1 - Math.abs(delta) * 2.2), y: index === active ? 0 : delta > 0 ? 18 : -14, clipPath: index === active ? 'inset(0 0 0% 0)' : delta > 0 ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)' });
          if (visual) {
            const d = Math.min(1, Math.abs(delta));
            const scale = 1.08 - .08 * (1 - d);
            const x = isDesktop ? Math.sin(delta * 1.05) * 30 * d : 0;
            gsap.set(visual, { autoAlpha: Math.max(0, 1 - Math.abs(delta)), x, y: delta * 11, scale, clipPath: index === active ? `inset(${Math.max(0, 6 * (1 - local))}% 0 0 0)` : delta > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' });
            const image = visual.querySelector('.local-image-project');
            if (image) gsap.set(image, { scale: index === active ? 1 : 1.08, clipPath: index === active ? 'inset(0)' : delta > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' });
          }
          scene.style.zIndex = String(scenes.length - Math.abs(index - active));
          if (!visible && index !== active) scene.style.pointerEvents = 'none';
          else scene.style.pointerEvents = '';
        });
      };
      scenes.forEach((scene, index) => {
        gsap.set(scene.querySelector('.project-info'), { autoAlpha: index === 0 ? 1 : 0, y: index === 0 ? 0 : 18 });
        gsap.set(scene.querySelector('.project-visual'), { autoAlpha: index === 0 ? 1 : 0, scale: index === 0 ? 1 : 1.08 });
      });
      const proxy = { value: 0 };
      const timeline = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        trigger: pinnedScroll,
        start: 'top top+=66',
        end: () => isDesktop ? `+=${Math.round(innerHeight * 5.1)}` : 'bottom bottom-=18%',
        scrub: .65,
        pin: isDesktop ? stickyStage : false,
        pinSpacing: isDesktop,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: self => render(self.progress),
      }});
      timeline.to(proxy, { value: 1, duration: 1, onUpdate: () => render(proxy.value) });
      render(0);
      requestAnimationFrame(() => ScrollTrigger.refresh());
      const refreshOnImages = () => ScrollTrigger.refresh();
      document.querySelectorAll('.pin-scene img').forEach(img => {
        if (img.complete) return;
        img.addEventListener('load', refreshOnImages, { once: true });
        img.addEventListener('error', refreshOnImages, { once: true });
      });
      return () => { timeline.scrollTrigger?.kill(); timeline.kill(); gsap.set(scenes, { clearProps: 'all' }); };
    });
  }

  // Subtle transform-only parallax on supplied project photos.
  function updateParallax() {
    if (reduceMotion || innerWidth < 701) return;
    photoLayers.forEach(({ image, visual }) => {
      const box = visual.getBoundingClientRect();
      if (box.bottom < -100 || box.top > innerHeight + 100) return;
      const offset = (box.top + box.height / 2 - innerHeight / 2) * -.035;
      image.style.setProperty('--parallax-y', `${offset.toFixed(1)}px`);
    });
  }

  const heroSection = document.querySelector('.hero');
  function updateHeroScroll() {
    const rect = heroSection?.getBoundingClientRect();
    if (!rect) return;
    const inHero = rect.bottom > 0 && rect.top < innerHeight;
    document.querySelectorAll('.hero .scroll-note, .hero .hero-index').forEach(note => {
      note.style.opacity = inHero ? '1' : '0';
      note.style.pointerEvents = inHero ? 'auto' : 'none';
    });
    if (reduceMotion || innerWidth < 701) return;
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
    heroPhoto.style.transform = `translate3d(${-90 * progress}px, ${120 * progress}px, 0) scale(${1 + .62 * progress})`;
    heroPhoto.style.clipPath = `inset(${2 * progress}% 0 ${2 * (1 - progress)}% 0)`;
  }
  updateHeroScroll();

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

(function () {
  'use strict';

  const content = document.getElementById('content');

  function getMain() {
    return document.querySelector('main');
  }

  function updatePageHeader(page) {
    const title = document.getElementById('pageTitle');
    if (!title) return;

    title.textContent =
      page.charAt(0).toUpperCase() +
      page.slice(1).toLowerCase();
  }

  function getCurrentPageFromPath() {
    const hash = location.hash.replace('#', '').toLowerCase();

    if (hash) {
      return hash;
    }
    let path = location.pathname.replace(/^\/+/, '').replace(/\/$/, '');

    if (!path || path === 'index.html') {
      return 'home';
    }

    return path.split('/')[0].toLowerCase();
  }

  function getRouteFromPath() {

    // Page navigation uses hashes (#Home, #Products...)
    const hash = location.hash.replace('#', '').toLowerCase();

    if (
      hash &&
      ['home', 'products', 'contacts', 'about', 'more'].includes(hash)
    ) {
      return {
        page: hash,
        sectionId: ''
      };
    }

    // Product section URLs (/products/item)
    let path = location.pathname.replace(/^\/+/, '').replace(/\/$/, '');

    if (!path || path === 'index.html') {
      return {
        page: 'home',
        sectionId: ''
      };
    }

    const parts = path.split('/');

    return {
      page: (parts[0] || 'home').toLowerCase(),
      sectionId: (parts[1] || '').toLowerCase()
    };
  }

  function setCanonical(pageName) {
    let link = document.querySelector("link[rel='canonical']");

    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }

    link.href =
      pageName === 'home'
        ? `${location.origin}/`
        : new URL(`/${pageName}`, location.origin).href;
  }

  async function loadPage(page) {
    if (!content) return 'home';

    const pageName = (page || 'home').toLowerCase();
    const file = new URL(`/Pages/${pageName}.html`, location.origin).href;

    try {
      const res = await fetch(`${file}?v=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const html = await res.text();

      content.innerHTML = html;

      updatePageHeader(pageName);

      if (typeof loadFeaturedProjects === 'function') {
        loadFeaturedProjects();
      }

      const main = getMain();

      if (main) {
        main.scrollTo({
          top: 0,
          behavior: 'auto'
        });
      }

      setCanonical(pageName);

      return pageName;
    } catch (err) {
      content.innerHTML = `
        <div class="p-3 text-danger">
          Could not load "${file}" - ${err.message}
        </div>
      `;

      updatePageHeader(pageName);

      return pageName;
    }
  }

  function scrollToSection(id) {
    const main = getMain();

    if (!main) return;

    const section = document.getElementById(id);

    if (!section) return;

    main.scrollTo({
      top: section.offsetTop - 70,
      behavior: 'smooth'
    });
  }

  function updateActiveNav(page) {
    const currentPage = (page || 'home').toLowerCase();

    document.querySelectorAll('[data-page]').forEach(link => {
      link.classList.toggle(
        'active',
        (link.dataset.page || '').toLowerCase() === currentPage
      );
    });
  }

  function navigateTo(page, section = '') {

    const pageName = (page || 'home').toLowerCase();
    const sectionName = (section || '').toLowerCase();

    // Product sections still use path routing
    if (sectionName) {

      history.pushState(
        {
          page: pageName,
          section: sectionName
        },
        '',
        `/products/${sectionName}`
      );

    } else {

      // Pages use hash routing
      history.pushState(
        {
          page: pageName,
          section: ''
        },
        '',
        `#${pageName}`
      );

    }

    router();
  }

  async function router() {
    const { page, sectionId } = getRouteFromPath();

    const loadedPage = await loadPage(page);

    updateActiveNav(loadedPage);

    if (sectionId && loadedPage === 'products') {
      requestAnimationFrame(() => scrollToSection(sectionId));
    }
  }

  function initNavigation() {
    document.addEventListener('click', e => {
      const pageLink = e.target.closest('[data-page]');

      if (pageLink) {
        e.preventDefault();

        navigateTo(
          pageLink.dataset.page,
          pageLink.dataset.section || ''
        );

        const menu = document.getElementById('mobileMenu');

        if (menu && menu.classList.contains('show')) {
          bootstrap.Collapse.getInstance(menu)?.hide();
        }

        return;
      }

      const tagLink = e.target.closest('a[href^="#"]');

      if (!tagLink) return;

      const id = tagLink.getAttribute('href').replace('#', '');

      if (!id) return;

      e.preventDefault();

      const currentPage = getCurrentPageFromPath();

      if (currentPage !== 'products') {
        history.pushState(
          {
            page: 'products',
            section: id
          },
          '',
          `/products/${id}`
        );

        router();
      } else {
        history.replaceState(
          {
            page: 'products',
            section: id
          },
          '',
          `/products/${id}`
        );

        scrollToSection(id);
      }

      document.querySelectorAll('.tag-link').forEach(link => {
        link.classList.remove('active');
      });

      tagLink.classList.add('active');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('r');

    if (redirectPath) {
      params.delete('r');

      const newSearch = params.toString();

      history.replaceState(
        null,
        '',
        redirectPath + (newSearch ? `?${newSearch}` : '')
      );
    }

    initNavigation();
    router();

    window.addEventListener('popstate', router);
  });

})();
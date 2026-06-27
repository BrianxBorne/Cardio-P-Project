(function () {
  'use strict';

  const content = document.getElementById('content');

  // List of valid pages - used to detect base path on GitHub Pages
  const validPages = ['home', 'about', 'contacts', 'products', 'more', 'policy'];

  /**
   * AUTO-DETECT BASE PATH
   * 
   * On localhost: base path is "/"
   * On GitHub Pages: base path is "/Cardio-P-Project/"
   * 
   * The base path is detected by finding the first pathname segment
   * that matches a known page or 'products'. Everything before that
   * is the base path. If no pages are found in the pathname, the
   * entire pathname is the base path.
   * 
   * This allows the router to work without modification on both:
   * - http://localhost:5500/
   * - https://brianxborne.github.io/Cardio-P-Project/
   */
  function getBasePath() {
    let pathname = location.pathname;
    
    // Ensure it starts with /
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }
    
    // Remove trailing slash for segment analysis
    let normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    
    // Split into segments
    const segments = normalized.split('/').filter(s => s.length > 0);
    
    // If empty pathname, return root
    if (segments.length === 0) {
      return '/';
    }
    
    // Find the first segment that's a known page or 'products'
    // Everything before that is the base path
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].toLowerCase();
      if (segment === 'products' || validPages.includes(segment)) {
        // Found a navigation target
        if (i === 0) {
          // It's the first segment, base path is root
          return '/';
        }
        // Base path is everything before this segment
        return '/' + segments.slice(0, i).join('/') + '/';
      }
    }
    
    // No navigation target found in pathname
    // Entire pathname is the base path (e.g., /Cardio-P-Project/)
    return pathname.endsWith('/') ? pathname : pathname + '/';
  }

  /**
   * ESTABLISH BASE URL FOR ASSET RESOLUTION
   * 
   * This function sets up a <base> element in the document head
   * that tells the browser how to resolve relative URLs for assets
   * (images, stylesheets, fonts, etc.).
   * 
   * Without a <base> element, the browser resolves relative URLs
   * against the current location.href, which can become unstable
   * after SPA navigation. This is especially problematic when:
   * - Pages are dynamically injected via innerHTML
   * - The application runs from a GitHub Pages subdirectory
   * - history.pushState changes the location
   * 
   * Solution: Set <base href> to the application's base path.
   * This ensures ALL relative URLs resolve against the correct base,
   * regardless of the current history state or injected HTML source.
   * 
   * This is the standard SPA approach used by Angular, React, etc.
   */
  function setBaseURL() {
    const basePath = getBasePath();
    
    // Ensure base path has trailing slash (required for relative URL resolution)
    const baseURL = basePath.endsWith('/') ? basePath : basePath + '/';
    
    // Check if <base> element already exists
    let baseElement = document.querySelector('base');
    
    if (!baseElement) {
      // Create and insert <base> element
      baseElement = document.createElement('base');
      document.head.insertBefore(baseElement, document.head.firstChild);
    }
    
    // Set the href to the application's base path
    // This tells the browser to resolve all relative URLs against this URL
    baseElement.href = location.origin + baseURL;
  }

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

  /**
   * Get current page from hash or path
   * Strips the base path before extracting the page name
   */
  function getCurrentPageFromPath() {
    const hash = location.hash.replace('#', '').toLowerCase();

    if (hash) {
      return hash;
    }
    
    // Get base path and remove it from pathname
    const basePath = getBasePath();
    let path = location.pathname;
    
    if (path.startsWith(basePath)) {
      path = path.slice(basePath.length);
    }
    
    // Normalize: remove leading/trailing slashes
    path = path.replace(/^\/+/, '').replace(/\/$/, '');

    if (!path || path === 'index.html') {
      return 'home';
    }

    return path.split('/')[0].toLowerCase();
  }

  /**
   * Parse current route from hash and path
   * Returns page name and optional section ID for products
   * Strips the base path before extracting page/section
   */
  function getRouteFromPath() {

    // Page navigation uses hashes (#Home, #Products...)
    const hash = location.hash.replace('#', '').toLowerCase();

    if (
      hash &&
      validPages.includes(hash)
    ) {
      return {
        page: hash,
        sectionId: ''
      };
    }

    // Product section URLs (/products/item)
    // Must strip base path first to correctly identify page and section
    const basePath = getBasePath();
    let path = location.pathname;
    
    if (path.startsWith(basePath)) {
      path = path.slice(basePath.length);
    }
    
    // Normalize: remove leading/trailing slashes
    path = path.replace(/^\/+/, '').replace(/\/$/, '');

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

    // Build canonical URL using base path
    const basePath = getBasePath();
    const baseUrl = location.origin + basePath;

    link.href =
      pageName === 'home'
        ? baseUrl
        : new URL(pageName, baseUrl).href;
  }

  /**
   * Load page HTML from Pages folder
   * Constructs fetch URL using base path for GitHub Pages compatibility
   */
  async function loadPage(page) {
    if (!content) return 'home';

    const pageName = (page || 'home').toLowerCase();
    const basePath = getBasePath();
    const baseUrl = location.origin + basePath;
    
    // Construct fetch URL: origin + base path + Pages/pageName.html
    const file = new URL(`Pages/${pageName}.html`, baseUrl).href;

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

  /**
   * Navigate to a page or product section
   * Constructs correct URLs for both localhost and GitHub Pages
   * - Hash routing for pages: #home, #products, etc.
   * - Path routing for product sections: /products/section-id
   */
  function navigateTo(page, section = '') {

    const pageName = (page || 'home').toLowerCase();
    const sectionName = (section || '').toLowerCase();
    const basePath = getBasePath();

    // Product sections use path-based routing
    if (sectionName) {

      history.pushState(
        {
          page: pageName,
          section: sectionName
        },
        '',
        basePath + `products/${sectionName}`
      );

    } else {

      // Pages use hash-based routing
      history.pushState(
        {
          page: pageName,
          section: ''
        },
        '',
        basePath.replace(/\/$/, '') + `#${pageName}`
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
      const basePath = getBasePath();

      if (currentPage !== 'products') {
        history.pushState(
          {
            page: 'products',
            section: id
          },
          '',
          basePath + `products/${id}`
        );

        router();
      } else {
        history.replaceState(
          {
            page: 'products',
            section: id
          },
          '',
          basePath + `products/${id}`
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
    // FIRST: Establish the base URL for all relative asset resolution
    // This must happen before any page loading or navigation
    setBaseURL();

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
/* ==============================================
   AFRO GALLERO — ADVERTISEMENT SYSTEM
   ==============================================
   Reads ads from Firebase /adverts node.
   Shows once after 5s, then every 5 minutes.
   4-second countdown before close unlocks.
   ============================================== */

(function() {
  'use strict';

  /* ---------- CONFIG ---------- */
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyC483ZOHvItMVBCe1HufHO39FyYVlNDPLU",
    authDomain: "auther-afro-gallero.firebaseapp.com",
    databaseURL: "https://auther-afro-gallero-default-rtdb.firebaseio.com",
    projectId: "auther-afro-gallero",
    storageBucket: "auther-afro-gallero.firebasestorage.app",
    messagingSenderId: "60533127446",
    appId: "1:60533127446:web:3270a06931b2405348b837"
  };

  var INITIAL_DELAY_MS  = 5000;   // 5 seconds before first ad
  var REPEAT_INTERVAL_MS = 300000; // 5 minutes between repeats
  var COUNTDOWN_SECONDS  = 4;
  var ADVERTS_NODE       = 'adverts';

  /* ---------- STATE ---------- */
  var firebaseApp    = null;
  var db             = null;
  var adsCache       = [];
  var currentAd      = null;
  var countdownTimer = null;
  var repeatTimer    = null;
  var shownAdIds     = [];
  var isVideoAd      = false;

  /* ---------- STORAGE HELPERS ---------- */
  function getStorageKey() {
    return 'afro_ad_session_' + new Date().toISOString().split('T')[0];
  }

  function loadSessionData() {
    try {
      var raw = sessionStorage.getItem(getStorageKey());
      return raw ? JSON.parse(raw) : { shown: [], lastShown: 0 };
    } catch(e) {
      return { shown: [], lastShown: 0 };
    }
  }

  function saveSessionData(data) {
    try {
      sessionStorage.setItem(getStorageKey(), JSON.stringify(data));
    } catch(e) { /* silent */ }
  }

  /* ---------- INIT FIREBASE ---------- */
  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn('[AdSystem] Firebase SDK not loaded.');
      return false;
    }
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = firebase.apps[0];
    }
    db = firebase.database();
    return true;
  }

  /* ---------- FETCH ADS ---------- */
  async function fetchAds() {
    if (!db) return [];

    // Check cache first (refresh every 10 minutes)
    if (adsCache.length > 0 && adsCache._lastFetch && (Date.now() - adsCache._lastFetch) < 600000) {
      return adsCache.filter(function(a) { return a !== adsCache._lastFetch; });
    }

    try {
      var snap = await db.ref(ADVERTS_NODE).once('value');
      var data = snap.val();

      if (!data) {
        adsCache = [];
        return [];
      }

      // Support both object and single ad format
      var ads = [];
      if (data.active === false) return [];

      // If it's a direct ad (not wrapped in an "ads" subnode)
      if (data.imageUrl || data.videoUrl) {
        if (data.active !== false) ads.push(Object.assign({ _key: 'main' }, data));
      }

      // If it has an "ads" subnode with multiple ads
      if (data.ads) {
        Object.keys(data.ads).forEach(function(key) {
          var ad = data.ads[key];
          if (ad && ad.active !== false) {
            ads.push(Object.assign({ _key: key }, ad));
          }
        });
      }

      adsCache = ads;
      adsCache._lastFetch = Date.now();
      return ads;
    } catch(err) {
      console.error('[AdSystem] Fetch error:', err);
      return adsCache.length > 0 ? adsCache : [];
    }
  }

  /* ---------- SELECT AD ---------- */
  function selectAd(ads) {
    if (!ads || ads.length === 0) return null;

    var session = loadSessionData();
    var now = Date.now();

    // Filter out already shown ads in this session
    var unseen = ads.filter(function(a) {
      return session.shown.indexOf(a._key) === -1;
    });

    // If all seen, reset and show again
    var pool = unseen.length > 0 ? unseen : ads;
    if (unseen.length === 0) {
      session.shown = [];
      saveSessionData(session);
    }

    // Sort by priority (higher priority first)
    pool.sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });

    // Pick from top priority ads randomly
    var topPriority = pool[0].priority || 0;
    var topAds = pool.filter(function(a) { return (a.priority || 0) === topPriority; });
    var selected = topAds[Math.floor(Math.random() * topAds.length)];

    return selected;
  }

  /* ---------- TRACK IMPRESSION ---------- */
  function trackImpression(adKey) {
    if (!db || !adKey) return;
    db.ref(ADVERTS_NODE + '/' + adKey + '/impressions').transaction(function(current) {
      return (current || 0) + 1;
    }).catch(function() {});
  }

  /* ---------- TRACK CLICK ---------- */
  function trackClick(adKey) {
    if (!db || !adKey) return;
    db.ref(ADVERTS_NODE + '/' + adKey + '/clicks').transaction(function(current) {
      return (current || 0) + 1;
    }).catch(function() {});
  }

  /* ---------- BUILD AD DOM ---------- */
  function buildAdHTML(ad) {
    isVideoAd = ad.type === 'video' && ad.videoUrl;

    var mediaHTML = '';
    if (isVideoAd) {
      mediaHTML = '<div class="ad-video-wrap">' +
        '<video id="adVideoPlayer" src="' + escapeAttr(ad.videoUrl) + '" autoplay muted loop playsinline></video>' +
        '<button class="ad-video-mute-btn" id="adMuteBtn" title="Toggle sound">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>' +
        '</button>' +
      '</div>';
    } else if (ad.imageUrl) {
      var clickTag = ad.link ? ' onclick="window._afroAdClick(\'' + escapeAttr(ad._key) + '\', \'' + escapeAttr(ad.link) + '\')"' : '';
      var linkIndicator = ad.link ? '<span class="ad-link-indicator"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Opens link</span>' : '';
      mediaHTML = '<div class="ad-image-wrap"' + clickTag + '>' +
        '<img src="' + escapeAttr(ad.imageUrl) + '" alt="' + escapeAttr(ad.title || 'Advertisement') + '" loading="eager">' +
        linkIndicator +
      '</div>';
    }

    var ctaHTML = '';
    if (ad.link) {
      var ctaText = ad.ctaText || 'Learn More';
      ctaHTML = '<div class="ad-actions">' +
        '<a href="' + escapeAttr(ad.link) + '" target="_blank" rel="noopener noreferrer" class="ad-cta-btn ad-cta-primary" onclick="window._afroAdClick(\'' + escapeAttr(ad._key) + '\', \'' + escapeAttr(ad.link) + '\')">' +
          ctaText +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</a>' +
        '<button class="ad-dismiss-link" onclick="window._afroAdDismiss()">Not now</button>' +
      '</div>';
    } else {
      ctaHTML = '<div class="ad-actions">' +
        '<button class="ad-dismiss-link" onclick="window._afroAdDismiss()" style="flex:1;text-align:center;">Dismiss</button>' +
      '</div>';
    }

    var badgeText = ad.badgeText || 'Sponsored';

    return mediaHTML +
      '<span class="ad-badge">' + escapeHTML(badgeText) + '</span>' +
      '<div class="ad-body">' +
        '<div class="ad-sponsored-label">Sponsored</div>' +
        (ad.title ? '<p class="ad-title">' + escapeHTML(ad.title) + '</p>' : '') +
        (ad.description ? '<p class="ad-description">' + escapeHTML(ad.description) + '</p>' : '') +
        ctaHTML +
      '</div>';
  }

  /* ---------- SHOW AD ---------- */
  async function showAd() {
    var ads = await fetchAds();
    var ad = selectAd(ads);
    if (!ad) {
      scheduleNext();
      return;
    }

    currentAd = ad;

    // Track impression
    trackImpression(ad._key);

    // Save to session
    var session = loadSessionData();
    if (session.shown.indexOf(ad._key) === -1) {
      session.shown.push(ad._key);
    }
    session.lastShown = Date.now();
    saveSessionData(session);

    // Build DOM
    ensureOverlayExists();
    var panel = document.getElementById('adPanel');
    if (!panel) return;

    panel.innerHTML = buildAdHTML(ad);

    // Setup countdown
    startCountdown();

    // Setup video controls
    if (isVideoAd) {
      setupVideoControls();
    }

    // Show
    requestAnimationFrame(function() {
      var overlay = document.getElementById('adOverlay');
      if (overlay) overlay.classList.add('ad-visible');
    });
  }

  /* ---------- ENSURE OVERLAY DOM ---------- */
  function ensureOverlayExists() {
    if (document.getElementById('adOverlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'adOverlay';
    overlay.className = 'ad-overlay';

    overlay.innerHTML =
      '<div class="ad-panel" id="adPanel"></div>' +
      '<div class="ad-close-area" id="adCloseArea">' +
        '<span class="ad-countdown-text" id="adCountdownText">Close in 4s</span>' +
        '<div class="ad-countdown-ring" id="adCountdownRing">' +
          '<svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.5"/><circle class="ring-progress" id="adRingProgress" cx="18" cy="18" r="15.5"/></svg>' +
        '</div>' +
        '<button class="ad-close-btn" id="adCloseBtn" title="Close ad">&times;</button>' +
      '</div>';

    document.body.appendChild(overlay);

    // Event listeners
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        // Don't close on backdrop click during countdown
        var btn = document.getElementById('adCloseBtn');
        if (btn && btn.classList.contains('ad-enabled')) {
          closeAd();
        }
      }
    });

    document.getElementById('adCloseBtn').addEventListener('click', function() {
      if (this.classList.contains('ad-enabled')) {
        closeAd();
      }
    });
  }

  /* ---------- COUNTDOWN ---------- */
  function startCountdown() {
    var remaining = COUNTDOWN_SECONDS;
    var textEl = document.getElementById('adCountdownText');
    var btnEl = document.getElementById('adCloseBtn');
    var ringEl = document.getElementById('adRingProgress');

    if (textEl) textEl.textContent = 'Close in ' + remaining + 's';
    if (btnEl) btnEl.classList.remove('ad-enabled');
    if (ringEl) ringEl.style.strokeDashoffset = '0';

    // Calculate circumference for the ring
    var circumference = 2 * Math.PI * 15.5; // r=15.5
    if (ringEl) ringEl.style.strokeDasharray = circumference;

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(function() {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (textEl) textEl.textContent = 'Close';
        if (btnEl) btnEl.classList.add('ad-enabled');
        if (ringEl) ringEl.style.strokeDashoffset = circumference;
        return;
      }
      if (textEl) textEl.textContent = 'Close in ' + remaining + 's';
      // Animate ring
      var progress = ((COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS) * circumference;
      if (ringEl) ringEl.style.strokeDashoffset = progress;
    }, 1000);
  }

  /* ---------- VIDEO CONTROLS ---------- */
  function setupVideoControls() {
    var video = document.getElementById('adVideoPlayer');
    var muteBtn = document.getElementById('adMuteBtn');
    if (!video) return;

    var isMuted = true;

    if (muteBtn) {
      muteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        isMuted = !isMuted;
        video.muted = isMuted;
        muteBtn.innerHTML = isMuted
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
      });
    }

    // Auto-close on video end (if not looping)
    video.addEventListener('ended', function() {
      // Only auto-close if video doesn't loop
      if (!video.loop) {
        setTimeout(closeAd, 1000);
      }
    });

    // Try to play (browsers require user interaction for unmuted, but muted autoplay works)
    video.play().catch(function() {
      // Autoplay blocked, try muted
      video.muted = true;
      video.play().catch(function() { /* give up */ });
    });
  }

  /* ---------- CLOSE AD ---------- */
  function closeAd() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    // Pause video if playing
    var video = document.getElementById('adVideoPlayer');
    if (video) {
      video.pause();
      video.src = '';
    }

    var overlay = document.getElementById('adOverlay');
    if (overlay) {
      overlay.classList.remove('ad-visible');
      // Remove from DOM after animation
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 500);
    }

    currentAd = null;
    isVideoAd = false;

    // Schedule next ad
    scheduleNext();
  }

  /* ---------- SCHEDULE NEXT ---------- */
  function scheduleNext() {
    if (repeatTimer) clearTimeout(repeatTimer);
    repeatTimer = setTimeout(function() {
      showAd();
    }, REPEAT_INTERVAL_MS);
  }

  /* ---------- GLOBAL HANDLERS ---------- */
  window._afroAdClick = function(adKey, url) {
    trackClick(adKey);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  window._afroAdDismiss = function() {
    var btn = document.getElementById('adCloseBtn');
    if (btn && btn.classList.contains('ad-enabled')) {
      closeAd();
    }
  };

  /* ---------- ESCAPE KEY ---------- */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var btn = document.getElementById('adCloseBtn');
      if (btn && btn.classList.contains('ad-enabled')) {
        closeAd();
      }
    }
  });

  /* ---------- UTILITY ---------- */
  function escapeHTML(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- BOOT ---------- */
  function boot() {
    if (!initFirebase()) return;

    // Wait for initial delay, then show first ad
    setTimeout(function() {
      // Don't show if page is not visible (tab in background)
      if (document.hidden) {
        document.addEventListener('visibilitychange', function onVisible() {
          if (!document.hidden) {
            document.removeEventListener('visibilitychange', onVisible);
            showAd();
          }
        });
      } else {
        showAd();
      }
    }, INITIAL_DELAY_MS);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
// ==========================================
// UNIVERSAL NON-DESTRUCTIVE AUTO-SCALER
// ==========================================
(function() {
  const TARGET_WIDTH = 820;
  const BASE_HEIGHT = 1180;
  
  // 1. Create the wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'universal-app-scaler';
  
  // 2. Move ALL existing website content into this wrapper
  while (document.body.firstChild) {
    wrapper.appendChild(document.body.firstChild);
  }
  document.body.appendChild(wrapper);
  
  // 3. Smart Fixed-Element Isolation System
  const isolatedElements = new Set();
  
  function isolateFixedElements(scale) {
    const allElements = wrapper.querySelectorAll('*');
    allElements.forEach(el => {
      if (isolatedElements.has(el)) return;
      if (window.getComputedStyle(el).position === 'fixed') {
        isolatedElements.add(el);
        document.body.appendChild(el);
        el.style.zoom = scale;
      }
    });
  }
  
  // 4. The Scaling Function
  function scaleAppToFitScreen() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const scaleX = screenWidth / TARGET_WIDTH;
    const scaleY = screenHeight / BASE_HEIGHT;
    const finalScale = Math.min(scaleX, scaleY);
    
    // Dynamic height to ensure it touches the bottom
    const dynamicHeight = screenHeight / finalScale;
    
    // Scale the wrapper
    wrapper.style.width = TARGET_WIDTH + 'px';
    wrapper.style.minHeight = dynamicHeight + 'px';
    wrapper.style.margin = '0 auto';
    wrapper.style.zoom = finalScale;
    
    // Calculate the exact physical pixel width and left-position of the scaled wrapper
    const scaledWidth = TARGET_WIDTH * finalScale;
    const wrapperOffsetLeft = (screenWidth - scaledWidth) / 2;
    
    // Update isolated elements
    isolatedElements.forEach(el => {
      el.style.zoom = finalScale;
      
      const computedStyle = window.getComputedStyle(el);
      const isFullWidth = computedStyle.left === '0px' && (computedStyle.width === '100%' || el.style.width === '100%');
      const isFullOverlay = computedStyle.top === '0px' && computedStyle.height === '100%';
      
      // If it's a full-width bar (like a Navbar or Music Player) but NOT a full-screen overlay (like a Modal)
      if (isFullWidth && !isFullOverlay) {
        // Force it to perfectly match the 820px scaled boundaries
        el.style.width = scaledWidth + 'px';
        el.style.left = wrapperOffsetLeft + 'px';
        el.style.right = 'auto'; // Prevent it from stretching across the whole screen
      } else {
        // Ensure overlays go back to full screen if they were previously changed
        if (el.style.width === scaledWidth + 'px') {
          el.style.width = '';
          el.style.left = '';
          el.style.right = '';
        }
      }
    });
  }
  
  // 5. MutationObserver: Catch dynamically added elements
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node === wrapper) return;
        
        if (node.parentNode === document.body) {
          if (window.getComputedStyle(node).position === 'fixed') {
            isolatedElements.add(node);
            node.style.zoom = wrapper.style.zoom;
            return;
          }
        }
        
        if (node.parentNode === wrapper || wrapper.contains(node)) {
          const checkAndIsolate = (el) => {
            if (isolatedElements.has(el)) return;
            if (window.getComputedStyle(el).position === 'fixed') {
              isolatedElements.add(el);
              document.body.appendChild(el);
              el.style.zoom = wrapper.style.zoom;
            } else {
              el.querySelectorAll && el.querySelectorAll('*').forEach(checkAndIsolate);
            }
          };
          checkAndIsolate(node);
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 6. Initialization
  scaleAppToFitScreen();
  
  setTimeout(() => {
    isolateFixedElements(wrapper.style.zoom);
    // Run scaling one more time after isolation to apply the width constraints
    scaleAppToFitScreen();
  }, 100);
  
  window.addEventListener('resize', scaleAppToFitScreen);
  window.addEventListener('orientationchange', scaleAppToFitScreen);
  
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', scaleAppToFitScreen);
  }
})();
// ==========================================
// UNIVERSAL NON-DESTRUCTIVE AUTO-SCALER
// ==========================================
(function() {
  const TARGET_WIDTH = 820;
  const BASE_HEIGHT = 1180;
  
  // 1. Create the wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'universal-app-scaler';
  
  // 2. Move ALL existing website content into this wrapper
  while (document.body.firstChild) {
    wrapper.appendChild(document.body.firstChild);
  }
  document.body.appendChild(wrapper);
  
  // 3. Smart Fixed-Element Isolation System
  const isolatedElements = new Set();
  
  function isolateFixedElements(scale) {
    const allElements = wrapper.querySelectorAll('*');
    allElements.forEach(el => {
      if (isolatedElements.has(el)) return;
      if (window.getComputedStyle(el).position === 'fixed') {
        isolatedElements.add(el);
        document.body.appendChild(el);
        el.style.zoom = scale;
      }
    });
  }
  
  // 4. The Scaling Function
  function scaleAppToFitScreen() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const scaleX = screenWidth / TARGET_WIDTH;
    const scaleY = screenHeight / BASE_HEIGHT;
    const finalScale = Math.min(scaleX, scaleY);
    
    // Dynamic height to ensure it touches the bottom
    const dynamicHeight = screenHeight / finalScale;
    
    // Scale the wrapper
    wrapper.style.width = TARGET_WIDTH + 'px';
    wrapper.style.minHeight = dynamicHeight + 'px';
    wrapper.style.margin = '0 auto';
    wrapper.style.zoom = finalScale;
    
    // Calculate the exact physical pixel width and left-position of the scaled wrapper
    const scaledWidth = TARGET_WIDTH * finalScale;
    const wrapperOffsetLeft = (screenWidth - scaledWidth) / 2;
    
    // Update isolated elements
    isolatedElements.forEach(el => {
      el.style.zoom = finalScale;
      
      const computedStyle = window.getComputedStyle(el);
      const isFullWidth = computedStyle.left === '0px' && (computedStyle.width === '100%' || el.style.width === '100%');
      const isFullOverlay = computedStyle.top === '0px' && computedStyle.height === '100%';
      
      // If it's a full-width bar (like a Navbar or Music Player) but NOT a full-screen overlay (like a Modal)
      if (isFullWidth && !isFullOverlay) {
        // Force it to perfectly match the 820px scaled boundaries
        el.style.width = scaledWidth + 'px';
        el.style.left = wrapperOffsetLeft + 'px';
        el.style.right = 'auto'; // Prevent it from stretching across the whole screen
      } else {
        // Ensure overlays go back to full screen if they were previously changed
        if (el.style.width === scaledWidth + 'px') {
          el.style.width = '';
          el.style.left = '';
          el.style.right = '';
        }
      }
    });
  }
  
  // 5. MutationObserver: Catch dynamically added elements
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node === wrapper) return;
        
        if (node.parentNode === document.body) {
          if (window.getComputedStyle(node).position === 'fixed') {
            isolatedElements.add(node);
            node.style.zoom = wrapper.style.zoom;
            return;
          }
        }
        
        if (node.parentNode === wrapper || wrapper.contains(node)) {
          const checkAndIsolate = (el) => {
            if (isolatedElements.has(el)) return;
            if (window.getComputedStyle(el).position === 'fixed') {
              isolatedElements.add(el);
              document.body.appendChild(el);
              el.style.zoom = wrapper.style.zoom;
            } else {
              el.querySelectorAll && el.querySelectorAll('*').forEach(checkAndIsolate);
            }
          };
          checkAndIsolate(node);
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 6. Initialization
  scaleAppToFitScreen();
  
  setTimeout(() => {
    isolateFixedElements(wrapper.style.zoom);
    // Run scaling one more time after isolation to apply the width constraints
    scaleAppToFitScreen();
  }, 100);
  
  window.addEventListener('resize', scaleAppToFitScreen);
  window.addEventListener('orientationchange', scaleAppToFitScreen);
  
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', scaleAppToFitScreen);
  }
})();

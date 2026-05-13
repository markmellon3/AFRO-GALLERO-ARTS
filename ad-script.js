/* ==============================================
   AFRO GALLERO — ADVERTISEMENT SYSTEM v2.0.0
   Full Firebase analytics + 820x1180 fitted card
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

  var INITIAL_DELAY_MS   = 5000;
  var REPEAT_INTERVAL_MS  = 300000;
  var COUNTDOWN_SECONDS   = 4;
  var ADVERTS_NODE        = 'adverts';
  var ANALYTICS_NODE      = 'ad_analytics';

  /* Target dimensions to match the scaler */
  var TARGET_WIDTH  = 820;
  var TARGET_HEIGHT = 1180;

  /* ---------- STATE ---------- */
  var firebaseApp    = null;
  var db             = null;
  var adsCache       = [];
  var currentAd      = null;
  var countdownTimer = null;
  var repeatTimer    = null;
  var isVideoAd      = false;
  var sessionData    = null;

  /* ---------- SESSION ---------- */
  function generateSessionId() {
    var s = sessionStorage.getItem('afro_ad_sid');
    if (s) return s;
    s = 'ads_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    sessionStorage.setItem('afro_ad_sid', s);
    return s;
  }

  function getSessionId() {
    return generateSessionId();
  }

  function getDailyKey() {
    return new Date().toISOString().split('T')[0];
  }

  function getPageName() {
    var h = location.hash.slice(1) || 'home';
    return h.split('/')[0];
  }

  function getDevice() {
    var ua = navigator.userAgent;
    if (/Mobile|Android(?!.*Tablet)|iPhone|iPod/i.test(ua)) return 'Mobile';
    if (/iPad|Android.*Tablet/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  function getViewport() {
    return window.innerWidth + 'x' + window.innerHeight;
  }

  /* ---------- INIT FIREBASE ---------- */
  function initFirebase() {
    if (typeof firebase === 'undefined') return false;
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
    if (adsCache.length > 0 && adsCache._lastFetch && (Date.now() - adsCache._lastFetch) < 600000) {
      return adsCache.filter(function(a) { return typeof a === 'object' && a._key; });
    }
    try {
      var snap = await db.ref(ADVERTS_NODE).once('value');
      var data = snap.val();
      if (!data) { adsCache = []; return []; }
      if (data.active === false) return [];
      var ads = [];
      if (data.imageUrl || data.videoUrl) {
        if (data.active !== false) ads.push(Object.assign({ _key: 'main' }, data));
      }
      if (data.ads) {
        Object.keys(data.ads).forEach(function(key) {
          var ad = data.ads[key];
          if (ad && ad.active !== false) ads.push(Object.assign({ _key: key }, ad));
        });
      }
      adsCache = ads;
      adsCache._lastFetch = Date.now();
      return ads;
    } catch(err) {
      return adsCache.length > 0 ? adsCache.filter(function(a) { return typeof a === 'object' && a._key; }) : [];
    }
  }

  /* ---------- SELECT AD ---------- */
  function selectAd(ads) {
    if (!ads || ads.length === 0) return null;
    var sessionKey = 'afro_ad_shown_' + getDailyKey();
    var shown = [];
    try { shown = JSON.parse(sessionStorage.getItem(sessionKey) || '[]'); } catch(e) {}
    var unseen = ads.filter(function(a) { return shown.indexOf(a._key) === -1; });
    var pool = unseen.length > 0 ? unseen : (function() { sessionStorage.removeItem(sessionKey); return ads; })();
    pool.sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });
    var topP = pool[0].priority || 0;
    var topAds = pool.filter(function(a) { return (a.priority || 0) === topP; });
    return topAds[Math.floor(Math.random() * topAds.length)];
  }

  /* ==============================================
     FIREBASE TRACKING — Complete Analytics
     ============================================== */

  function trackImpression(ad) {
    if (!db || !ad) return;
    var sid = getSessionId();
    var dk = getDailyKey();
    var now = Date.now();
    var pg = getPageName();

    /* 1. Counter on the ad itself */
    db.ref(ADVERTS_NODE + '/' + ad._key + '/impressions').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 2. Daily impression log under ad */
    db.ref(ADVERTS_NODE + '/' + ad._key + '/daily/' + dk + '/impressions').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 3. Global daily totals */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/totalImpressions').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 4. Per-ad daily breakdown */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/ads/' + ad._key + '/impressions').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 5. Per-page daily impressions */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/pages/' + pg + '/adImpressions').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 6. Detailed impression record (trim to 500) */
    var impressionData = {
      adKey: ad._key,
      adTitle: ad.title || '',
      adType: ad.type || 'image',
      sessionId: sid,
      page: pg,
      device: getDevice(),
      viewport: getViewport(),
      timestamp: now
    };
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/impressions_log').push(impressionData).catch(function() {});
    trimNode(ANALYTICS_NODE + '/daily/' + dk + '/impressions_log', 500);

    /* 7. Session-level tracking */
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/impressions').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/lastActivity').set(now).catch(function() {});
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/device').set(getDevice()).catch(function() {});
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/page').set(pg).catch(function() {});

    /* 8. Mark shown in session storage */
    var sessionKey = 'afro_ad_shown_' + dk;
    var shown = [];
    try { shown = JSON.parse(sessionStorage.getItem(sessionKey) || '[]'); } catch(e) {}
    if (shown.indexOf(ad._key) === -1) {
      shown.push(ad._key);
      sessionStorage.setItem(sessionKey, JSON.stringify(shown));
    }

    /* 9. Unique daily viewers (using session dedup) */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/viewers/' + sid).set({
      device: getDevice(),
      timestamp: now,
      page: pg
    }).catch(function() {});
  }

  function trackClick(ad, linkUrl) {
    if (!db || !ad) return;
    var sid = getSessionId();
    var dk = getDailyKey();
    var now = Date.now();
    var pg = getPageName();

    /* 1. Counter on the ad */
    db.ref(ADVERTS_NODE + '/' + ad._key + '/clicks').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 2. Daily click log under ad */
    db.ref(ADVERTS_NODE + '/' + ad._key + '/daily/' + dk + '/clicks').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 3. Global daily totals */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/totalClicks').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 4. Per-ad daily breakdown */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/ads/' + ad._key + '/clicks').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 5. Per-page daily clicks */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/pages/' + pg + '/adClicks').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 6. Detailed click record */
    var clickData = {
      adKey: ad._key,
      adTitle: ad.title || '',
      adType: ad.type || 'image',
      destinationUrl: linkUrl || '',
      sessionId: sid,
      page: pg,
      device: getDevice(),
      viewport: getViewport(),
      timestamp: now
    };
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/clicks_log').push(clickData).catch(function() {});
    trimNode(ANALYTICS_NODE + '/daily/' + dk + '/clicks_log', 500);

    /* 7. Session-level */
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/clicks').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/lastActivity').set(now).catch(function() {});

    /* 8. Click-through rate snapshot for this ad today */
    db.ref(ADVERTS_NODE + '/' + ad._key + '/daily/' + dk + '/impressions').once('value').then(function(snap) {
      var imps = snap.val() || 0;
      if (imps > 0) {
        db.ref(ANALYTICS_NODE + '/daily/' + dk + '/ads/' + ad._key + '/ctr').set(Math.round(((imps + 1) / imps) * 10000) / 100).catch(function() {});
      }
    }).catch(function() {});
  }

  function trackDismiss(ad) {
    if (!db || !ad) return;
    var sid = getSessionId();
    var dk = getDailyKey();
    var now = Date.now();
    var pg = getPageName();

    /* 1. Counter on the ad */
    db.ref(ADVERTS_NODE + '/' + ad._key + '/dismissals').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 2. Daily totals */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/totalDismissals').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 3. Per-ad daily */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/ads/' + ad._key + '/dismissals').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});

    /* 4. Detailed record */
    db.ref(ANALYTICS_NODE + '/daily/' + dk + '/dismissals_log').push({
      adKey: ad._key,
      adTitle: ad.title || '',
      sessionId: sid,
      page: pg,
      device: getDevice(),
      timestamp: now
    }).catch(function() {});
    trimNode(ANALYTICS_NODE + '/daily/' + dk + '/dismissals_log', 500);

    /* 5. Session-level */
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/dismissals').transaction(function(c) { return (c || 0) + 1; }).catch(function() {});
    db.ref(ANALYTICS_NODE + '/sessions/' + sid + '/lastActivity').set(now).catch(function() {});
  }

  /* Keep Firebase nodes from growing infinitely */
  function trimNode(path, max) {
    if (!db) return;
    db.ref(path).orderByKey().limitToFirst(max + 100).once('value').then(function(snap) {
      var data = snap.val();
      if (!data) return;
      var keys = Object.keys(data);
      if (keys.length > max) {
        var deletes = {};
        keys.slice(0, keys.length - max).forEach(function(k) { deletes[path + '/' + k] = null; });
        db.ref().update(deletes).catch(function() {});
      }
    }).catch(function() {});
  }

  /* ---------- BUILD AD DOM ---------- */
  function buildAdHTML(ad) {
    isVideoAd = ad.type === 'video' && ad.videoUrl;

    var mediaHTML = '';
    if (isVideoAd) {
      mediaHTML =
        '<div class="ad-media ad-media-video">' +
          '<video id="adVideoPlayer" src="' + escapeAttr(ad.videoUrl) + '" autoplay muted loop playsinline></video>' +
          '<button class="ad-mute-btn" id="adMuteBtn" title="Toggle sound">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>' +
          '</button>' +
        '</div>';
    } else if (ad.imageUrl) {
      var clickTag = ad.link ? ' data-ad-link="' + escapeAttr(ad._key) + '"' : '';
      var linkIndicator = ad.link
        ? '<span class="ad-link-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Visit</span>'
        : '';
      mediaHTML =
        '<div class="ad-media ad-media-image"' + clickTag + '>' +
          '<img src="' + escapeAttr(ad.imageUrl) + '" alt="' + escapeAttr(ad.title || 'Advertisement') + '" loading="eager">' +
          linkIndicator +
        '</div>';
    }

    var badgeText = ad.badgeText || 'Sponsored';

    var ctaHTML = '';
    if (ad.link) {
      var ctaText = ad.ctaText || 'Learn More';
      ctaHTML =
        '<div class="ad-footer">' +
          '<a href="' + escapeAttr(ad.link) + '" target="_blank" rel="noopener noreferrer" class="ad-cta-btn" data-ad-click="' + escapeAttr(ad._key) + '" data-ad-url="' + escapeAttr(ad.link) + '">' +
            '<span>' + escapeHTML(ctaText) + '</span>' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
          '</a>' +
          '<button class="ad-dismiss-btn" id="adDismissBtn">Not now</button>' +
        '</div>';
    } else {
      ctaHTML =
        '<div class="ad-footer">' +
          '<button class="ad-dismiss-btn" id="adDismissBtn" style="width:100%;justify-content:center;">Dismiss</button>' +
        '</div>';
    }

    return mediaHTML +
      '<div class="ad-content">' +
        '<span class="ad-badge">' + escapeHTML(badgeText) + '</span>' +
        (ad.title ? '<h3 class="ad-title">' + escapeHTML(ad.title) + '</h3>' : '') +
        (ad.description ? '<p class="ad-desc">' + escapeHTML(ad.description) + '</p>' : '') +
        ctaHTML +
      '</div>';
  }

  /* ---------- SHOW AD ---------- */
  async function showAd() {
    var ads = await fetchAds();
    var ad = selectAd(ads);
    if (!ad) { scheduleNext(); return; }

    currentAd = ad;
    trackImpression(ad);

    ensureOverlayExists();
    var panel = document.getElementById('adPanel');
    if (!panel) return;

    panel.innerHTML = buildAdHTML(ad);
    startCountdown();

    if (isVideoAd) setupVideoControls();

    /* Attach click tracking delegates */
    panel.querySelectorAll('[data-ad-click]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        trackClick(ad, this.dataset.adUrl);
        window.open(this.dataset.adUrl, '_blank', 'noopener,noreferrer');
      });
    });

    var dismissBtn = document.getElementById('adDismissBtn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var closeBtn = document.getElementById('adCloseBtn');
        if (closeBtn && closeBtn.classList.contains('ad-enabled')) closeAd();
      });
    }

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
      '<div class="ad-close-zone" id="adCloseZone">' +
        '<div class="ad-countdown-wrap">' +
          '<svg class="ad-ring-svg" viewBox="0 0 36 36">' +
            '<circle class="ad-ring-bg" cx="18" cy="18" r="15.5"/>' +
            '<circle class="ad-ring-fg" id="adRingFg" cx="18" cy="18" r="15.5"/>' +
          '</svg>' +
          '<span class="ad-countdown-num" id="adCountdownNum">4</span>' +
        '</div>' +
        '<button class="ad-close-x" id="adCloseBtn" title="Close advertisement">&times;</button>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        var btn = document.getElementById('adCloseBtn');
        if (btn && btn.classList.contains('ad-enabled')) closeAd();
      }
    });

    document.getElementById('adCloseBtn').addEventListener('click', function() {
      if (this.classList.contains('ad-enabled')) closeAd();
    });
  }

  /* ---------- COUNTDOWN ---------- */
  function startCountdown() {
    var remaining = COUNTDOWN_SECONDS;
    var numEl = document.getElementById('adCountdownNum');
    var btnEl = document.getElementById('adCloseBtn');
    var ringEl = document.getElementById('adRingFg');

    if (numEl) numEl.textContent = remaining;
    if (btnEl) btnEl.classList.remove('ad-enabled');

    var circumference = 2 * Math.PI * 15.5;
    if (ringEl) {
      ringEl.style.strokeDasharray = circumference;
      ringEl.style.strokeDashoffset = '0';
    }

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(function() {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (numEl) numEl.textContent = '\u2713';
        if (btnEl) btnEl.classList.add('ad-enabled');
        if (ringEl) ringEl.style.strokeDashoffset = circumference;
        return;
      }
      if (numEl) numEl.textContent = remaining;
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
        this.innerHTML = isMuted
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
      });
    }

    video.addEventListener('ended', function() {
      if (!video.loop) setTimeout(closeAd, 1000);
    });

    video.play().catch(function() {
      video.muted = true;
      video.play().catch(function() {});
    });
  }

  /* ---------- CLOSE AD ---------- */
  function closeAd() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }

    var video = document.getElementById('adVideoPlayer');
    if (video) { video.pause(); video.src = ''; }

    /* Track dismiss before removing */
    if (currentAd) trackDismiss(currentAd);

    var overlay = document.getElementById('adOverlay');
    if (overlay) {
      overlay.classList.remove('ad-visible');
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 500);
    }

    currentAd = null;
    isVideoAd = false;
    scheduleNext();
  }

  /* ---------- SCHEDULE ---------- */
  function scheduleNext() {
    if (repeatTimer) clearTimeout(repeatTimer);
    repeatTimer = setTimeout(function() {
      if (document.hidden) {
        document.addEventListener('visibilitychange', function onVis() {
          if (!document.hidden) { document.removeEventListener('visibilitychange', onVis); showAd(); }
        });
      } else {
        showAd();
      }
    }, REPEAT_INTERVAL_MS);
  }

  /* ---------- ESCAPE KEY ---------- */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var btn = document.getElementById('adCloseBtn');
      if (btn && btn.classList.contains('ad-enabled')) closeAd();
    }
  });

  /* ---------- UTILITY ---------- */
  function escapeHTML(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function escapeAttr(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ---------- INJECT CSS ---------- */
  function injectCSS() {
    if (document.getElementById('afroAdStyles')) return;
    var s = document.createElement('style');
    s.id = 'afroAdStyles';
    s.textContent =
      /* ── Overlay ── */
      '.ad-overlay{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity 0.4s ease;zoom:1!important;}' +
      '.ad-overlay.ad-visible{opacity:1;pointer-events:auto;}' +

      /* ── Card: fitted to 820x1180 target ── */
      '.ad-panel{width:' + Math.min(TARGET_WIDTH, window.innerWidth - 32) + 'px;max-width:calc(100vw - 32px);max-height:' + Math.min(TARGET_HEIGHT * 0.75, window.innerHeight - 120) + 'px;background:var(--card,#fff);border-radius:var(--r-lg,16px);overflow:hidden;box-shadow:var(--sh-l,0 10px 30px rgba(0,0,0,0.1));display:flex;flex-direction:column;position:relative;font-family:var(--font-body,"Inter",sans-serif);color:var(--fg,#212529);}' +

      /* ── Media: Image ── */
      '.ad-media-image{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;cursor:' + 'pointer;background:var(--bg-s,#f1f3f5);}' +
      '.ad-media-image img{width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.3s ease;}' +
      '.ad-media-image:hover img{transform:scale(1.03);}' +
      '.ad-link-badge{position:absolute;bottom:10px;right:10px;display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,0.65);color:#fff;padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;backdrop-filter:blur(4px);pointer-events:none;}' +

      /* ── Media: Video ── */
      '.ad-media-video{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#000;}' +
      '.ad-media-video video{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.ad-mute-btn{position:absolute;bottom:10px;right:10px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.6);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);transition:background 0.2s;}' +
      '.ad-mute-btn:hover{background:rgba(0,0,0,0.85);}' +

      /* ── Content ── */
      '.ad-content{padding:16px 20px 14px;display:flex;flex-direction:column;gap:6px;flex:1;min-height:0;overflow:hidden;}' +
      '.ad-badge{display:inline-block;width:fit-content;padding:3px 10px;border-radius:20px;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;background:var(--accent-l,rgba(184,134,11,0.12));color:var(--accent,#b8860b);}' +
      '.ad-title{margin:0;font-family:var(--font-display,"Playfair Display",serif);font-size:1.1rem;font-weight:700;line-height:1.35;color:var(--fg,#212529);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.ad-desc{margin:0;font-size:0.82rem;line-height:1.5;color:var(--fg-s,#495057);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +

      /* ── Footer / CTA ── */
      '.ad-footer{display:flex;align-items:center;gap:10px;padding-top:10px;margin-top:auto;}' +
      '.ad-cta-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border:none;border-radius:var(--r-sm,6px);background:var(--accent,#b8860b);color:#fff;font-family:var(--font-body,"Inter",sans-serif);font-size:0.82rem;font-weight:600;text-decoration:none;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(184,134,11,0.25);white-space:nowrap;}' +
      '.ad-cta-btn:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 4px 12px rgba(184,134,11,0.35);}' +
      '.ad-dismiss-btn{flex:1;padding:9px 16px;border:1px solid var(--border,#e1e4e8);border-radius:var(--r-sm,6px);background:transparent;color:var(--muted,#868e96);font-family:var(--font-body,"Inter",sans-serif);font-size:0.8rem;font-weight:500;cursor:pointer;transition:all 0.2s ease;text-align:center;}' +
      '.ad-dismiss-btn:hover{background:var(--bg-s,#f1f3f5);color:var(--fg,#212529);border-color:transparent;}' +

      /* ── Close zone ── */
      '.ad-close-zone{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;align-items:center;gap:6px;z-index:2;}' +
      '.ad-countdown-wrap{position:relative;width:36px;height:36px;}' +
      '.ad-ring-svg{width:100%;height:100%;transform:rotate(-90deg);}' +
      '.ad-ring-bg{fill:none;stroke:var(--border,#e1e4e8);stroke-width:2.5;}' +
      '.ad-ring-fg{fill:none;stroke:var(--accent,#b8860b);stroke-width:2.5;stroke-linecap:round;transition:stroke-dashoffset 1s linear;}' +
      '.ad-countdown-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:var(--accent,#b8860b);pointer-events:none;}' +
      '.ad-close-x{position:absolute;top:42px;right:0;width:28px;height:28px;border-radius:50%;border:1px solid var(--border,#e1e4e8);background:var(--card,#fff);color:var(--muted,#868e96);font-size:1.1rem;cursor:not-allowed;opacity:0.4;display:flex;align-items:center;justify-content:center;transition:all 0.25s ease;line-height:1;padding:0;font-family:inherit;}' +
      '.ad-close-x.ad-enabled{opacity:1;cursor:pointer;color:var(--fg,#212529);}' +
      '.ad-close-x.ad-enabled:hover{background:var(--bg-s,#f1f3f5);color:var(--danger,#c0392b);border-color:var(--danger,#c0392b);transform:rotate(90deg);}' +

      /* ── Dark mode ── */
      '[data-theme="dark"] .ad-panel{background:var(--card,#161b22);box-shadow:0 10px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(184,134,11,0.08);}' +
      '[data-theme="dark"] .ad-title{color:var(--fg,#e6edf3);}' +
      '[data-theme="dark"] .ad-desc{color:var(--fg-s,#b1bac4);}' +
      '[data-theme="dark"] .ad-media-image{background:var(--bg-s,#161b22);}' +
      '[data-theme="dark"] .ad-link-badge{background:rgba(0,0,0,0.75);}' +
      '[data-theme="dark"] .ad-ring-bg{stroke:var(--border,#30363d);}' +
      '[data-theme="dark"] .ad-close-x{background:var(--card,#161b22);border-color:var(--border,#30363d);color:var(--muted,#768390);}' +
      '[data-theme="dark"] .ad-close-x.ad-enabled:hover{background:var(--bg-s,#21262d);color:var(--danger,#c0392b);border-color:var(--danger,#c0392b);}' +
      '[data-theme="dark"] .ad-dismiss-btn{border-color:var(--border,#30363d);color:var(--muted,#768390);}' +
      '[data-theme="dark"] .ad-dismiss-btn:hover{background:var(--bg-s,#21262d);color:var(--fg,#e6edf3);}' +

      /* ── Mobile ── */
      '@media(max-width:520px){' +
        '.ad-panel{width:calc(100vw - 24px);max-height:calc(100vh - 100px);border-radius:var(--r-md,10px);}' +
        '.ad-content{padding:14px 16px 12px;}' +
        '.ad-title{font-size:1rem;}' +
        '.ad-desc{font-size:0.78rem;-webkit-line-clamp:2;}' +
        '.ad-cta-btn{padding:8px 16px;font-size:0.78rem;}' +
        '.ad-footer{flex-direction:column;gap:8px;}' +
        '.ad-dismiss-btn{width:100%;}' +
      '}' +

      /* ── Reduced motion ── */
      '@media(prefers-reduced-motion:reduce){' +
        '.ad-overlay,.ad-panel,.ad-media-image img,.ad-cta-btn,.ad-dismiss-btn,.ad-close-x,.ad-ring-fg{transition:none!important;}' +
      '}';

    document.head.appendChild(s);
  }

  /* ---------- BOOT ---------- */
  function boot() {
    if (!initFirebase()) return;
    injectCSS();

    setTimeout(function() {
      if (document.hidden) {
        document.addEventListener('visibilitychange', function onVis() {
          if (!document.hidden) { document.removeEventListener('visibilitychange', onVis); showAd(); }
        });
      } else {
        showAd();
      }
    }, INITIAL_DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();

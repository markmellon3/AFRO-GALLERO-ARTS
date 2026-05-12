/* ============================================
   PUSH NOTIFICATION SYSTEM v2.3.0
   Self-contained — logo, gold accents, forceShow
   ============================================ */

const NotificationSystem = (function () {

  var CONFIG = {
    CHECK_INTERVAL: 60000,
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    NOTIFICATION_COOLDOWN: 30000,
    STORED_ARTWORKS_LIMIT: 500,
    NOTIFICATION_ICON: '',
    DEFAULT_ICON: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 24 24" fill="none" stroke="%23b8860b" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
    ),
    CLICK_ACTION: window.location.origin + window.location.pathname + '#gallery',
    POPUP_SHOW_DELAY: 4000,
    POPUP_AUTO_HIDE: 15000,
    POPUP_RESHOW_AFTER_DAYS: 7,
    POPUP_MAX_SHOWS: 3,
    POPUP_SLIDE_DURATION: 450,

    /* YOUR LOGO */
    LOGO_URL: 'https://ik.imagekit.io/s95tumxuk/IMG_1356.jpe'
  };

  var KEYS = {
    CONSENT: 'notif_consent',
    SAVED_ARTWORK_IDS: 'notif_art_ids',
    LAST_CHECK: 'notif_last_check',
    HOURLY_COUNT: 'notif_hourly_count',
    HOURLY_RESET: 'notif_hourly_reset',
    LAST_NOTIF_TS: 'notif_last_sent',
    POPUP_DISMISSED_AT: 'notif_popup_dismissed',
    POPUP_SHOW_COUNT: 'notif_popup_shows'
  };

  var isInitialized = false;
  var popupScheduled = false;
  var checkTimer = null;
  var authDb = null;
  var currentUser = null;
  var notificationIcon = CONFIG.DEFAULT_ICON;
  var popupAutoHideTimer = null;
  var popupElement = null;
  var cssInjected = false;
  var zoomGuardActive = false;

  /* ── Storage ── */
  function getStorage(key, defaultValue) {
    try { var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : defaultValue; }
    catch (e) { return defaultValue; }
  }
  function setStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* ── Rate limiting ── */
  function isRateLimited() {
    var c = getStorage(KEYS.HOURLY_COUNT, 0);
    var r = getStorage(KEYS.HOURLY_RESET, 0);
    var n = Date.now();
    if (n - r > 3600000) { setStorage(KEYS.HOURLY_COUNT, 0); setStorage(KEYS.HOURLY_RESET, n); return false; }
    return c >= CONFIG.MAX_NOTIFICATIONS_PER_HOUR;
  }
  function incrementHourlyCount() {
    var c = getStorage(KEYS.HOURLY_COUNT, 0);
    var r = getStorage(KEYS.HOURLY_RESET, 0);
    var n = Date.now();
    if (n - r > 3600000) { setStorage(KEYS.HOURLY_COUNT, 1); setStorage(KEYS.HOURLY_RESET, n); }
    else { setStorage(KEYS.HOURLY_COUNT, c + 1); }
  }
  function isOnCooldown() {
    return (Date.now() - getStorage(KEYS.LAST_NOTIF_TS, 0)) < CONFIG.NOTIFICATION_COOLDOWN;
  }
  function getSavedArtworkIds() { return getStorage(KEYS.SAVED_ARTWORK_IDS, []); }
  function saveArtworkIds(ids) { setStorage(KEYS.SAVED_ARTWORK_IDS, ids.slice(-CONFIG.STORED_ARTWORKS_LIMIT)); }

  /* ── Visitor checks ── */
  function isNewVisitor() { return !localStorage.getItem('artFV'); }
  function isNotificationSupported() { return 'Notification' in window; }
  function getPermissionState() { return isNotificationSupported() ? Notification.permission : 'unsupported'; }

  function shouldShowPopup() {
    if (hasConsent()) return false;
    if (isNotificationSupported() && Notification.permission === 'denied') return false;
    var d = getStorage(KEYS.POPUP_DISMISSED_AT, 0);
    if (d > 0 && (Date.now() - d) / 86400000 < CONFIG.POPUP_RESHOW_AFTER_DAYS) return false;
    if (getStorage(KEYS.POPUP_SHOW_COUNT, 0) >= CONFIG.POPUP_MAX_SHOWS) return false;
    if (popupElement && popupElement.classList.contains('notif-popup-visible')) return false;
    return true;
  }

  function recordPopupShow() { setStorage(KEYS.POPUP_SHOW_COUNT, getStorage(KEYS.POPUP_SHOW_COUNT, 0) + 1); }
  function recordPopupDismiss() { setStorage(KEYS.POPUP_DISMISSED_AT, Date.now()); }
  function hasConsent() { return getStorage(KEYS.CONSENT, false) && isNotificationSupported() && Notification.permission === 'granted'; }

  /* ── Service worker ── */
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return false;
    try {
      var code = 'self.addEventListener("notificationclick",function(e){e.notification.close();e.waitUntil(clients.matchAll({type:"window"}).then(function(c){for(var i=0;i<c.length;i++){if(c[i].url.includes(self.location.origin)&&"focus"in c[i])return c[i].focus();}if(c.openWindow)return c.openWindow(e.notification.data.url||"/");}));});self.addEventListener("push",function(e){var d=e.data?e.data.json():{};e.waitUntil(self.registration.showNotification(d.title||"Afro Gallero",{body:d.body||"New artwork!",icon:d.icon||"",badge:d.badge||"",data:d,vibrate:[100,50,100],tag:d.tag||"artwork-update"}));});';
      var blob = new Blob([code], { type: 'application/javascript' });
      await navigator.serviceWorker.register(URL.createObjectURL(blob), { scope: '/' });
      return true;
    } catch (e) { return false; }
  }

  /* ── Permission ── */
  async function requestPermission() {
    if (!isNotificationSupported()) {
      _showToast('Notifications require HTTPS.', 'warning');
      hidePopup(false);
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      setStorage(KEYS.CONSENT, true); syncConsentToFirebase(true); hidePopup(true); startMonitoring();
      _showToast('Notifications enabled!', 'success'); return 'granted';
    }
    if (Notification.permission === 'denied') {
      _showToast('Notifications blocked in browser settings.', 'error'); hidePopup(false); return 'denied';
    }
    try {
      var p = await Notification.requestPermission();
      if (p === 'granted') {
        setStorage(KEYS.CONSENT, true); syncConsentToFirebase(true);
        _showToast('Notifications enabled!', 'success'); hidePopup(true); startMonitoring();
      } else {
        setStorage(KEYS.CONSENT, false); syncConsentToFirebase(false);
        if (p === 'denied') _showToast('Notifications blocked.', 'warning');
        hidePopup(false);
      }
      updateToggleButtonUI(); return p;
    } catch (e) {
      _showToast('Could not request permission.', 'error'); hidePopup(false); return 'denied';
    }
  }

  /* ── Firebase sync ── */
  function syncConsentToFirebase(consented) {
    if (!authDb || !currentUser) return;
    try {
      authDb.ref('user_notifications/' + currentUser.uid).update({
        consented: consented, browserSupports: isNotificationSupported(),
        permissionState: getPermissionState(), updatedAt: Date.now()
      }).catch(function() {});
    } catch (e) {}
  }
  function loadConsentFromFirebase(uid) {
    if (!authDb || !uid) return Promise.resolve(null);
    return authDb.ref('user_notifications/' + uid).once('value').then(function(s) { return s.val(); }).catch(function() { return null; });
  }

  /* ── Send notification ── */
  function sendNotification(title, body, data) {
    data = data || {};
    if (!hasConsent() || isRateLimited() || isOnCooldown()) return false;
    try {
      var n = new Notification(title, {
        body: body, icon: notificationIcon || CONFIG.DEFAULT_ICON, badge: CONFIG.DEFAULT_ICON,
        data: { url: data.url || CONFIG.CLICK_ACTION, artworkId: data.artworkId || '', artistName: data.artistName || '' },
        tag: data.tag || 'artwork-' + (data.artworkId || Date.now()), requireInteraction: false, silent: false
      });
      n.onclick = function(e) {
        e.preventDefault(); window.focus();
        if (data.artworkId) window.location.hash = 'artwork/' + data.artworkId;
        else if (data.url) window.location.href = data.url;
        n.close();
      };
      setTimeout(function() { n.close(); }, 10000);
      setStorage(KEYS.LAST_NOTIF_TS, Date.now()); incrementHourlyCount();
      if (authDb && currentUser) {
        try {
          var today = new Date().toISOString().split('T')[0];
          authDb.ref('user_notifications/' + currentUser.uid + '/sent/' + today).push({
            artworkId: data.artworkId || '', artworkTitle: data.title || '',
            artistName: data.artistName || '', sentAt: Date.now()
          }).catch(function() {});
        } catch (e) {}
      }
      return true;
    } catch (e) { return false; }
  }

  /* ── Artwork detection ── */
  async function checkForNewArtworks() {
    if (!authDb || !hasConsent()) return;
    try {
      var snap = await authDb.ref('user_information').once('value');
      var users = snap.val(); if (!users) return;
      var current = [], fresh = [];
      Object.keys(users).forEach(function(uid) {
        var u = users[uid]; if (!u || !u.artworks) return;
        Object.keys(u.artworks).forEach(function(aid) {
          var a = u.artworks[aid]; if (!a) return;
          var cid = uid + ':' + aid; current.push(cid);
          if (getSavedArtworkIds().indexOf(cid) === -1) {
            var art = { id: cid }; for (var k in a) art[k] = a[k]; art._source = uid; fresh.push(art);
          }
        });
      });
      if (current.length > 0) saveArtworkIds(current);
      if (fresh.length > 0) {
        fresh.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        fresh.slice(0, 3).forEach(function(art, i) {
          setTimeout(function() {
            var name = art.artistName || 'Unknown Artist';
            var title = art.title || 'Untitled';
            var price = art.price ? _formatPrice(art.price, art.currency) : 'Price on request';
            sendNotification('\uD83C\uDFA8 New Artwork!', '"' + title + '" by ' + name + '\n' + price, {
              artworkId: art.id, title: title, artistName: name,
              url: window.location.origin + window.location.pathname + '#artwork/' + art.id,
              tag: 'artwork-' + art.id
            });
            if (typeof SiteAnalytics !== 'undefined') SiteAnalytics.trackEvent('notification_sent', art.id);
          }, i * CONFIG.NOTIFICATION_COOLDOWN);
        });
        if (fresh[0] && fresh[0].image) notificationIcon = fresh[0].image;
      }
      setStorage(KEYS.LAST_CHECK, Date.now());
    } catch (e) {}
  }

  var rtListener = null;
  function startRealtimeMonitoring() {
    if (!authDb || !hasConsent()) return;
    if (rtListener) authDb.ref('user_information').off('value', rtListener);
    checkForNewArtworks();
    rtListener = authDb.ref('user_information').on('value', function() {
      clearTimeout(rtListener._t); rtListener._t = setTimeout(checkForNewArtworks, 5000);
    }, function() {});
  }
  function stopRealtimeMonitoring() {
    if (rtListener && authDb) { authDb.ref('user_information').off('value', rtListener); rtListener = null; }
  }
  function startMonitoring() { if (!hasConsent()) return; stopMonitoring(); startRealtimeMonitoring(); checkTimer = setInterval(checkForNewArtworks, CONFIG.CHECK_INTERVAL); }
  function stopMonitoring() { if (checkTimer) { clearInterval(checkTimer); checkTimer = null; } stopRealtimeMonitoring(); }

  /* ── Toggle UI ── */
  function updateToggleButtonUI() {
    document.querySelectorAll('.notification-toggle-btn,[data-action="toggle-notifications"]').forEach(function(btn) {
      var on = hasConsent();
      var txt = btn.querySelector('.notif-btn-text') || btn;
      if (txt) txt.textContent = on ? 'Notifications On' : 'Receive Notifications';
      btn.classList.toggle('notif-active', on); btn.classList.toggle('notif-inactive', !on);
      var ico = btn.querySelector('.notif-btn-icon') || btn.querySelector('i,svg');
      if (ico) { ico.setAttribute('data-lucide', on ? 'bell-ring' : 'bell'); if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] }); }
    });
    document.querySelectorAll('.notification-status').forEach(function(el) {
      el.textContent = hasConsent() ? 'Active' : 'Disabled';
      el.classList.toggle('status-active', hasConsent()); el.classList.toggle('status-disabled', !hasConsent());
    });
  }
  async function toggleNotifications() {
    if (hasConsent()) {
      setStorage(KEYS.CONSENT, false); syncConsentToFirebase(false); stopMonitoring();
      _showToast('Notifications disabled', 'info');
      if (typeof SiteAnalytics !== 'undefined') SiteAnalytics.trackEvent('notifications_disabled');
    } else {
      var p = await requestPermission();
      if (p === 'granted' && typeof SiteAnalytics !== 'undefined') SiteAnalytics.trackEvent('notifications_enabled');
    }
    updateToggleButtonUI();
  }

  /* ══════════════════════════════════════
     POPUP — HTML + CSS all inline
     ══════════════════════════════════════ */
  function injectCSS() {
    if (cssInjected) return; cssInjected = true;
    var s = document.createElement('style'); s.id = 'notifPopupStyles';
    s.textContent =
      '#notifConsentPopup{position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-110%);z-index:99999;pointer-events:none;padding:0;margin:0;font-family:var(--font-body,"Inter",sans-serif);zoom:1!important;transition:transform ' + CONFIG.POPUP_SLIDE_DURATION + 'ms cubic-bezier(0.22,1,0.36,1),opacity ' + CONFIG.POPUP_SLIDE_DURATION + 'ms ease;}' +
      '#notifConsentPopup.notif-popup-visible{transform:translateX(-50%) translateY(0);pointer-events:auto;}' +
      '#notifConsentPopup.notif-popup-dismissed{transform:translateX(-50%) translateY(-110%);opacity:0;}' +
      '#notifConsentPopup.notif-popup-accepted{transform:translateX(-50%) translateY(-110%) scale(0.9);opacity:0;}' +
      '.notif-popup-inner{display:flex;align-items:center;gap:14px;background:var(--card,#fff);border:1px solid var(--border,#e1e4e8);border-top:none;border-radius:0 0 var(--r-lg,16px) var(--r-lg,16px);padding:14px 20px;box-shadow:var(--sh-l,0 10px 30px rgba(0,0,0,0.1));max-width:500px;width:auto;white-space:nowrap;}' +
      '.notif-popup-icon-wrap{flex-shrink:0;position:relative;}' +
      '.notif-popup-logo{width:48px;height:48px;border-radius:50%;overflow:hidden;border:2px solid var(--accent,#b8860b);background:var(--accent-l,rgba(184,134,11,0.1));box-shadow:0 0 0 3px var(--card,#fff),0 0 0 4px var(--border,#e1e4e8),0 2px 8px rgba(184,134,11,0.2);display:flex;align-items:center;justify-content:center;}' +
      '.notif-popup-logo img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.notif-popup-ping{position:absolute;top:-3px;right:-3px;width:13px;height:13px;background:var(--danger,#c0392b);border-radius:50%;border:2.5px solid var(--card,#fff);animation:notifPing 1.5s cubic-bezier(0,0,0.2,1) infinite;z-index:1;}' +
      '@keyframes notifPing{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.4);opacity:0}}' +
      '.notif-popup-content{flex:1;min-width:0;white-space:normal;}' +
      '.notif-popup-title{margin:0 0 3px 0;font-family:var(--font-display,"Playfair Display",serif);font-size:1rem;font-weight:700;color:var(--fg,#212529);line-height:1.3;letter-spacing:-0.01em;}' +
      '.notif-popup-desc{margin:0;font-size:0.82rem;color:var(--fg-s,#495057);line-height:1.45;}' +
      '.notif-popup-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}' +
      '.notif-popup-accept{display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border:none;border-radius:var(--r-sm,6px);background:var(--accent,#b8860b);color:#fff;font-family:var(--font-body,"Inter",sans-serif);font-size:0.85rem;font-weight:600;cursor:pointer;transition:all var(--tr,0.3s ease);white-space:nowrap;box-shadow:0 2px 8px rgba(184,134,11,0.3);}' +
      '.notif-popup-accept:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(184,134,11,0.4);filter:brightness(1.08);}' +
      '.notif-popup-accept:active{transform:translateY(0);}' +
      '.notif-popup-dismiss{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid var(--border,#e1e4e8);border-radius:var(--r-sm,6px);background:transparent;color:var(--muted,#868e96);cursor:pointer;transition:all var(--tr,0.3s ease);flex-shrink:0;padding:0;}' +
      '.notif-popup-dismiss:hover{background:var(--bg-s,#f1f3f5);color:var(--fg,#212529);border-color:transparent;}' +
      '[data-theme="dark"] .notif-popup-inner{background:var(--card,#161b22);border-color:var(--border,#30363d);box-shadow:0 10px 30px rgba(0,0,0,0.5),0 0 0 1px rgba(184,134,11,0.08);}' +
      '[data-theme="dark"] .notif-popup-title{color:var(--fg,#e6edf3);}' +
      '[data-theme="dark"] .notif-popup-desc{color:var(--fg-s,#b1bac4);}' +
      '[data-theme="dark"] .notif-popup-logo{border-color:var(--accent,#b8860b);background:var(--accent-l,rgba(184,134,11,0.15));box-shadow:0 0 0 3px var(--card,#161b22),0 0 0 4px var(--border,#30363d),0 0 12px rgba(184,134,11,0.15);}' +
      '[data-theme="dark"] .notif-popup-ping{border-color:var(--card,#161b22);}' +
      '[data-theme="dark"] .notif-popup-accept{box-shadow:0 2px 8px rgba(184,134,11,0.25);}' +
      '[data-theme="dark"] .notif-popup-accept:hover{box-shadow:0 4px 16px rgba(184,134,11,0.35);}' +
      '[data-theme="dark"] .notif-popup-dismiss{border-color:var(--border,#30363d);color:var(--muted,#768390);}' +
      '[data-theme="dark"] .notif-popup-dismiss:hover{background:var(--bg-s,#161b22);color:var(--fg,#e6edf3);border-color:transparent;}' +
      '@media(max-width:520px){#notifConsentPopup{left:0;right:0;transform:translateY(-110%);width:100%}#notifConsentPopup.notif-popup-visible{transform:translateY(0)}#notifConsentPopup.notif-popup-dismissed{transform:translateY(-110%)}#notifConsentPopup.notif-popup-accepted{transform:translateY(-110%) scale(1)}.notif-popup-inner{border-radius:0;padding:12px 16px;gap:11px;max-width:100%}.notif-popup-logo{width:42px;height:42px}.notif-popup-title{font-size:.92rem}.notif-popup-desc{font-size:.78rem}.notif-popup-accept{padding:8px 16px;font-size:.8rem}.notif-popup-dismiss{width:32px;height:32px}}' +
      '@media(prefers-reduced-motion:reduce){#notifConsentPopup,.notif-popup-inner,.notif-popup-accept,.notif-popup-dismiss{transition:none!important}.notif-popup-ping{animation:none!important}}';
    document.head.appendChild(s);
  }

  function createPopupCard() {
    if (popupElement) return;
    injectCSS();
    popupElement = document.createElement('div');
    popupElement.id = 'notifConsentPopup';
    popupElement.setAttribute('role', 'dialog');
    popupElement.setAttribute('aria-label', 'Enable notifications');
    popupElement.innerHTML =
      '<div class="notif-popup-inner">' +
        '<div class="notif-popup-icon-wrap">' +
          '<div class="notif-popup-logo">' +
            '<img src="' + CONFIG.LOGO_URL + '" alt="Afro Gallero" onerror="this.style.display=\'none\'">' +
          '</div>' +
          '<span class="notif-popup-ping"></span>' +
        '</div>' +
        '<div class="notif-popup-content">' +
          '<p class="notif-popup-title">Stay Updated</p>' +
          '<p class="notif-popup-desc">Get notified when new artworks are added to the gallery</p>' +
        '</div>' +
        '<div class="notif-popup-actions">' +
          '<button class="notif-popup-accept" id="notifPopupAccept">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
            ' Allow' +
          '</button>' +
          '<button class="notif-popup-dismiss" id="notifPopupDismiss" aria-label="Dismiss">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"/>' +
              '<line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(popupElement);
    document.getElementById('notifPopupAccept').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); requestPermission(); });
    document.getElementById('notifPopupDismiss').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); hidePopup(false); });
    popupElement.addEventListener('mouseenter', function() { clearTimeout(popupAutoHideTimer); });
    popupElement.addEventListener('mouseleave', function() { startAutoHide(); });
    activateZoomGuard();
  }

  function activateZoomGuard() {
    if (zoomGuardActive) return; zoomGuardActive = true;
    new MutationObserver(function(m) {
      if (!popupElement) { this.disconnect(); zoomGuardActive = false; return; }
      m.forEach(function(mu) { if (mu.type === 'attributes' && mu.attributeName === 'style' && popupElement.style.zoom !== '1') popupElement.style.zoom = '1'; });
    }).observe(popupElement, { attributes: true });
  }

  function showPopup() {
    if (!shouldShowPopup()) return;
    createPopupCard(); recordPopupShow();
    requestAnimationFrame(function() { requestAnimationFrame(function() { if (popupElement) popupElement.classList.add('notif-popup-visible'); }); });
    startAutoHide();
    if (typeof SiteAnalytics !== 'undefined') SiteAnalytics.trackEvent('notification_popup_shown', null, { showCount: getStorage(KEYS.POPUP_SHOW_COUNT, 0), isNewVisitor: isNewVisitor() });
  }

  function hidePopup(accepted) {
    if (!popupElement) return;
    clearTimeout(popupAutoHideTimer);
    popupElement.classList.add(accepted ? 'notif-popup-accepted' : 'notif-popup-dismissed');
    setTimeout(function() {
      if (popupElement && popupElement.parentNode) popupElement.parentNode.removeChild(popupElement);
      popupElement = null; zoomGuardActive = false;
      if (!accepted) recordPopupDismiss();
      if (typeof SiteAnalytics !== 'undefined') SiteAnalytics.trackEvent('notification_popup_closed', null, { accepted: !!accepted });
    }, CONFIG.POPUP_SLIDE_DURATION + 50);
  }

  function startAutoHide() { clearTimeout(popupAutoHideTimer); popupAutoHideTimer = setTimeout(function() { hidePopup(false); }, CONFIG.POPUP_AUTO_HIDE); }

  /* ── Helpers ── */
  function _formatPrice(amount, currency) {
    if (!amount) return 'Price on request';
    if (typeof AppState !== 'undefined' && typeof formatPrice === 'function') return formatPrice(amount, currency);
    var sy = { UGX: 'UGX', USD: '$', EUR: '\u20ac', GBP: '\u00a3', KES: 'KES' };
    var rt = { UGX: 1, USD: 0.00027, EUR: 0.00025, GBP: 0.00021, KES: 0.042 };
    var c = (typeof AppState !== 'undefined') ? AppState.currentCurrency : 'UGX';
    return (sy[c] || 'UGX') + ' ' + Math.round(amount * ((rt[c] || 1) / (rt[currency || 'UGX'] || 1))).toLocaleString();
  }

  function _showToast(message, type) {
    type = type || 'info';
    if (typeof window.showToast === 'function') { try { window.showToast(message, type); return; } catch (e) {} }
    var c = document.getElementById('toastContainer');
    if (!c) { c = document.createElement('div'); c.id = 'toastContainer'; c.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:100000;display:flex;flex-direction:column;gap:8px;'; document.body.appendChild(c); }
    var t = document.createElement('div');
    var cl = { success: '#15803d', error: '#dc2626', info: '#2563eb', warning: '#d97706' };
    t.style.cssText = 'background:' + (cl[type] || cl.info) + ';color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:340px;font-family:inherit;';
    t.textContent = message; c.appendChild(t);
    setTimeout(function() { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 300); }, 3500);
  }

  /* ── Auth ── */
  function handleAuthStateChange(user) {
    currentUser = user;
    if (user) { loadConsentFromFirebase(user.uid).then(function(p) { if (p) setStorage(KEYS.CONSENT, p.consented || false); if (p && p.consented && getPermissionState() === 'granted') startMonitoring(); updateToggleButtonUI(); }); }
    else { stopMonitoring(); setStorage(KEYS.CONSENT, false); updateToggleButtonUI(); }
  }

  /* ── Init ── */
  function init(firebaseDb, firebaseAuth) {
    if (isInitialized) return;
    authDb = firebaseDb || null;
    var authRef = firebaseAuth || (typeof auth !== 'undefined' ? auth : null);
    if (authDb) registerServiceWorker();
    if (authRef) authRef.onAuthStateChanged(handleAuthStateChange);
    document.addEventListener('click', function(e) {
      if (e.target.closest('.notification-toggle-btn,[data-action="toggle-notifications"]')) { e.preventDefault(); e.stopPropagation(); toggleNotifications(); }
      if (e.target.closest('[data-action="notification-settings"]')) { e.preventDefault(); e.stopPropagation(); openSettingsPanel(); }
    });
    updateToggleButtonUI();
    if (hasConsent() && authDb) startMonitoring();
    if (!popupScheduled) { popupScheduled = true; setTimeout(showPopup, CONFIG.POPUP_SHOW_DELAY); }
    isInitialized = true;
  }

  /* ── Settings panel ── */
  function createNotificationSettingsUI() {
    if (document.getElementById('notificationSettingsPanel')) return;
    var p = document.createElement('div'); p.id = 'notificationSettingsPanel'; p.className = 'notification-settings-panel';
    p.innerHTML = '<div class="notif-settings-header"><h3>\uD83D\uDD14 Notification Settings</h3><button class="notif-settings-close" id="notifSettingsClose">&times;</button></div><div class="notif-settings-body"><div class="notif-setting-item"><div class="notif-setting-info"><span class="notif-setting-label">New Artwork Alerts</span><span class="notif-setting-desc">Get notified when new artworks are added</span></div><label class="notif-toggle"><input type="checkbox" id="notifNewArtworks" ' + (hasConsent() ? 'checked' : '') + '><span class="notif-toggle-slider"></span></label></div><div class="notif-setting-item"><div class="notif-setting-info"><span class="notif-setting-label">Status</span><span class="notif-setting-desc notification-status">' + (hasConsent() ? 'Active' : 'Disabled') + '</span></div></div><div class="notif-settings-actions"><button class="btn btn-primary btn-sm" id="notifTestBtn">Send Test</button><button class="btn btn-ghost btn-sm" id="notifResetPopupBtn">Reset Popup</button></div></div>';
    document.body.appendChild(p);
    document.getElementById('notifSettingsClose').addEventListener('click', function() { p.classList.remove('open'); });
    document.getElementById('notifNewArtworks').addEventListener('change', function(e) { toggleNotifications(); e.target.checked = hasConsent(); });
    document.getElementById('notifTestBtn').addEventListener('click', function() { sendNotification('\uD83D\uDD14 Test', 'Test from Afro Gallero.', { url: CONFIG.CLICK_ACTION, tag: 'test-' + Date.now() }); });
    document.getElementById('notifResetPopupBtn').addEventListener('click', function() { resetState(); _showToast('Popup reset \u2014 reload to see it', 'info'); });
    p.addEventListener('click', function(e) { if (e.target === p) p.classList.remove('open'); });
  }
  function openSettingsPanel() {
    createNotificationSettingsUI();
    var p = document.getElementById('notificationSettingsPanel');
    if (p) { p.classList.add('open'); var c = document.getElementById('notifNewArtworks'); if (c) c.checked = hasConsent(); updateToggleButtonUI(); }
  }

  /* ── PUBLIC API ── */
  return {
    init: init,
    toggle: toggleNotifications,
    requestPermission: requestPermission,
    startMonitoring: startMonitoring,
    stopMonitoring: stopMonitoring,
    sendNotification: sendNotification,
    sendTestNotification: function() { sendNotification('\uD83D\uDD14 Test', 'Test from Afro Gallero.', { url: CONFIG.CLICK_ACTION, tag: 'test-' + Date.now() }); },
    openSettings: openSettingsPanel,
    showPopup: showPopup,
    hidePopup: hidePopup,
    hasConsent: hasConsent,
    getPermissionState: getPermissionState,
    checkForNewArtworks: checkForNewArtworks,
    resetState: function() {
      Object.keys(KEYS).forEach(function(k) { localStorage.removeItem(KEYS[k]); });
      if (popupElement && popupElement.parentNode) popupElement.parentNode.removeChild(popupElement);
      popupElement = null; zoomGuardActive = false; popupScheduled = false;
    },
    forceShow: function() {
      this.resetState();
      setTimeout(function() { showPopup(); }, 100);
    }
  };
})();

/* ═══ Auto-init ═══ */
(function() {
  function go() {
    var db = (typeof authDb !== 'undefined') ? authDb : null;
    var au = (typeof auth !== 'undefined') ? auth : null;
    NotificationSystem.init(db, au);
  }
  function wait() {
    var i = 0;
    var t = setInterval(function() {
      i++;
      if (typeof authDb !== 'undefined' && authDb) {
        clearInterval(t);
        var au = (typeof auth !== 'undefined') ? auth : null;
        if (au) au.onAuthStateChanged(NotificationSystem.init.bind ? NotificationSystem.init : function() {});
        if (NotificationSystem.hasConsent()) NotificationSystem.startMonitoring();
      }
      if (i > 100) clearInterval(t);
    }, 200);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function() { go(); wait(); }); }
  else { go(); wait(); }
})();
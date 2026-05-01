/* ==============================================
   FIREBASE CONFIG
   ============================================== */
const firebaseConfig = {
  apiKey: "AIzaSyC483ZOHvItMVBCe1HufHO39FyYVlNDPLU",
  authDomain: "auther-afro-gallero.firebaseapp.com",
  projectId: "auther-afro-gallero",
  storageBucket: "auther-afro-gallero.firebasestorage.app",
  messagingSenderId: "60533127446",
  appId: "1:60533127446:web:3270a06931b2405348b837",
  measurementId: "G-SHWX5D1G17"
};

const IMGBB_KEY = "47f7dff148164ff31a5947e6ee635363";
const MAX_IMAGES = 10;
const PREVIEW_URL = "https://hercules.app";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const webstatusRef = db.ref('webstatus');

/* ==============================================
   SHARED STATE
   ============================================== */
const state = {
  currentUser: null,
  userProfile: null,
  allArtworks: [],
  filteredArtworks: [],
  allMessages: [],
  webstatusData: null,
  deleteTargetId: null,
  editMode: false,
  listenersAttached: {
    artworks: false,
    messages: false,
    orders: false,
    analytics: false
  },
  previewItems: [],
  prevCurrency: 'UGX',
  totalValueCurrency: 'UGX',
  exchangeRate: 3750,
  exchangeRateLoaded: false,
  userArtworksRef: null,
  userDevMsgRef: null,
  userInfoRef: null,
  userOrdersRef: null,
  userMessagesRef: null,
  userAboutRef: null,
  userAnalyticsRef: null,
  allOrders: [],
  filteredOrders: [],
  curOrderFilter: 'all',
  orderDetailId: null,
  orderDeleteId: null,
  currentTab: null,
  userAnalytics: null,
  mobileMenuOpen: false,
  galleryTheme: {
    accentColor: '#b8860b',
    fontFamily: 'Inter',
    layout: 'grid',
    showPrice: true,
    showCategory: true
  }
};

/* ==============================================
   GALLERY THEME PRESETS
   ============================================== */
const THEME_PRESETS = {
  gold: { accentColor: '#b8860b', name: 'Classic Gold', preview: 'linear-gradient(135deg, #b8860b, #d4a843)' },
  blue: { accentColor: '#2563eb', name: 'Ocean Blue', preview: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  purple: { accentColor: '#7c3aed', name: 'Royal Purple', preview: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  green: { accentColor: '#059669', name: 'Emerald', preview: 'linear-gradient(135deg, #059669, #34d399)' },
  red: { accentColor: '#dc2626', name: 'Crimson', preview: 'linear-gradient(135deg, #dc2626, #f87171)' },
  pink: { accentColor: '#db2777', name: 'Rose', preview: 'linear-gradient(135deg, #db2777, #f472b6)' },
  orange: { accentColor: '#ea580c', name: 'Sunset', preview: 'linear-gradient(135deg, #ea580c, #fb923c)' },
  teal: { accentColor: '#0d9488', name: 'Teal', preview: 'linear-gradient(135deg, #0d9488, #2dd4bf)' }
};

/* ==============================================
   UTILITIES
   ============================================== */
function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getArtworkImages(a) {
  if (Array.isArray(a.images) && a.images.length > 0) return a.images.filter(u => u && u.startsWith('http'));
  if (a.image && a.image.startsWith('http')) return [a.image];
  return [];
}

function formatPrice(price, currency) {
  const num = Number(price);
  const cur = currency || 'UGX';
  if (isNaN(num)) return cur === 'USD' ? '$0.00' : cur + ' 0';
  if (cur === 'USD') return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur + ' ' + num.toLocaleString('en-US');
}

function formatRelativeDate(ts) {
  if (!ts) return '—';
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d / 60000) + ' min ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  if (d < 604800000) return Math.floor(d / 86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatFullDate(ts) {
  return ts ? new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
}

function formatMsgDate(ts) {
  if (!ts) return 'Unknown';
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function debounce(fn, d) {
  let t;
  return function () {
    const a = arguments;
    const ctx = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(ctx, a); }, d);
  };
}

function getInitials(n) {
  if (!n) return '?';
  const p = n.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase();
}

function fmtNum(n) {
  const num = parseInt(n, 10);
  return isNaN(num) ? '—' : num.toLocaleString('en-US');
}

function showToast(msg, type) {
  type = type || 'info';
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
  t.innerHTML = '<i data-lucide="' + (icons[type] || 'info') + '" style="width:18px;height:18px;flex-shrink:0;"></i><span>' + escapeHtml(msg) + '</span>';
  c.appendChild(t);
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [t] });
  setTimeout(function () {
    t.classList.add('removing');
    setTimeout(function () { t.remove(); }, 300);
  }, 3500);
}

function setLoading(btn, loading) {
  if (!btn) return;
  var txt = btn.querySelector('.btn-text');
  var loader = btn.querySelector('.btn-loader');
  var iconL = btn.querySelector('.btn-icon-left');
  if (txt) txt.classList.toggle('hidden', loading);
  if (loader) loader.classList.toggle('hidden', !loading);
  if (iconL) iconL.classList.toggle('hidden', loading);
  btn.disabled = loading;
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ==============================================
   EXCHANGE RATE
   ============================================== */
fetch('https://open.er-api.com/v6/latest/USD')
  .then(function (r) { return r.json(); })
  .then(function (d) {
    if (d.rates && d.rates.UGX) {
      state.exchangeRate = d.rates.UGX;
      state.exchangeRateLoaded = true;
    }
    updateRateHint();
  })
  .catch(function () { updateRateHint(); });

function convertCurrency(amount, from, to) {
  if (from === to || !amount) return Number(amount);
  if (from === 'UGX' && to === 'USD') return Math.round((Number(amount) / state.exchangeRate) * 100) / 100;
  if (from === 'USD' && to === 'UGX') return Math.round(Number(amount) * state.exchangeRate);
  return Number(amount);
}

function updateRateHint() {
  var el = document.getElementById('rateHint');
  var prefix = state.exchangeRateLoaded ? '' : '~';
  if (el) el.textContent = prefix + '1 USD = ' + state.exchangeRate.toLocaleString('en-US') + ' UGX';
}

/* ==============================================
   THEME MANAGEMENT
   ============================================== */
function initTheme() {
  var s = localStorage.getItem('artTheme');
  if (s) document.documentElement.setAttribute('data-theme', s);
}

function toggleDarkMode() {
  var current = document.documentElement.getAttribute('data-theme');
  var newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('artTheme', newTheme);
  updateDarkModeIcon();
  if (typeof redrawCharts === 'function') setTimeout(redrawCharts, 250);
}

function updateDarkModeIcon() {
  var icon = document.getElementById('darkModeIcon');
  if (!icon) return;
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon.parentElement] });
}

window.addEventListener('storage', function (e) {
  if (e.key === 'artTheme' && e.newValue) {
    document.documentElement.setAttribute('data-theme', e.newValue);
    if (typeof redrawCharts === 'function') setTimeout(redrawCharts, 250);
  }
});

/* ==============================================
   MOBILE MENU
   ============================================== */
function toggleMobileMenu() {
  state.mobileMenuOpen = !state.mobileMenuOpen;
  var menu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('mobileMenuOverlay');
  var icon = document.getElementById('menuToggleIcon');
  
  if (menu) menu.classList.toggle('open', state.mobileMenuOpen);
  if (overlay) overlay.classList.toggle('open', state.mobileMenuOpen);
  if (icon) icon.setAttribute('data-lucide', state.mobileMenuOpen ? 'x' : 'menu');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon ? icon.parentElement : null] });
  
  document.body.style.overflow = state.mobileMenuOpen ? 'hidden' : '';
}

function closeMobileMenu() {
  state.mobileMenuOpen = false;
  var menu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('mobileMenuOverlay');
  var icon = document.getElementById('menuToggleIcon');
  
  if (menu) menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (icon) icon.setAttribute('data-lucide', 'menu');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon ? icon.parentElement : null] });
  
  document.body.style.overflow = '';
}

/* ==============================================
   SCREEN MANAGEMENT
   ============================================== */
function showAuth() {
  var authScreen = document.getElementById('authScreen');
  var dashboardScreen = document.getElementById('dashboardScreen');
  if (authScreen) authScreen.classList.remove('hidden');
  if (dashboardScreen) dashboardScreen.classList.add('hidden');
  cleanupListeners();
  switchAuthTab('signin');
}

function showDashboard() {
  var authScreen = document.getElementById('authScreen');
  var dashboardScreen = document.getElementById('dashboardScreen');
  
  if (authScreen) authScreen.classList.add('hidden');
  if (dashboardScreen) dashboardScreen.classList.remove('hidden');

  var nameEl = document.getElementById('adminUserName');
  if (nameEl && state.userProfile) {
    var fullName = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
    nameEl.textContent = fullName || (auth.currentUser ? auth.currentUser.email : '');
  }

  var artistInput = document.getElementById('artArtistName');
  if (artistInput && state.userProfile && !state.editMode) {
    var fullName2 = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
    if (fullName2) artistInput.value = fullName2;
  }

  var devName = document.getElementById('devMsgName');
  var devEmail = document.getElementById('devMsgEmail');
  if (devName && state.userProfile) {
    var fullName3 = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
    if (fullName3) devName.value = fullName3;
  }
  if (devEmail && auth.currentUser) {
    devEmail.value = auth.currentUser.email || '';
  }

  attachAllListeners();
  initRevealAnimations();
  updateDarkModeIcon();
  loadGalleryTheme();
  
  setTimeout(function() {
    switchTab('order');
  }, 50);
}

/* ==============================================
   AUTH TAB SWITCHING (dedicated function)
   ============================================== */
function switchAuthTab(tabName) {
  // Remove active from all auth tabs
  document.querySelectorAll('.auth-tab').forEach(function(t) {
    t.classList.remove('active');
  });
  
  // Remove active from all auth forms
  document.querySelectorAll('.auth-form').forEach(function(f) {
    f.classList.remove('active');
  });
  
  // Activate the clicked tab button
  var tabBtn = document.querySelector('.auth-tab[data-tab="' + tabName + '"]');
  if (tabBtn) tabBtn.classList.add('active');
  
  // Show the corresponding form
  if (tabName === 'signin') {
    var form = document.getElementById('signInForm');
    if (form) form.classList.add('active');
  } else if (tabName === 'signup') {
    var form = document.getElementById('signUpForm');
    if (form) form.classList.add('active');
  }
  
  // Update subtitle
  var subtitle = document.getElementById('authSubtitle');
  if (subtitle) {
    subtitle.textContent = tabName === 'signin' ? 'Sign in to your account' : 'Create your account';
  }
  
  // Ensure tabs container is visible
  var tabs = document.getElementById('authTabs');
  if (tabs) tabs.style.display = '';
}

/* ==============================================
   TAB SWITCHING (Dashboard)
   ============================================== */
function switchTab(tab) {
  if (!tab) return;
  state.currentTab = tab;
  
  closeMobileMenu();
  
  var allTabIds = ['order', 'about', 'user', 'premium'];
  
  var navLinks = document.querySelectorAll('[data-tab]:not(.auth-tab)');
  navLinks.forEach(function (link) { 
    link.classList.remove('active'); 
    if (link.getAttribute('data-tab') === tab) {
      link.classList.add('active');
    }
  });

  allTabIds.forEach(function (tabId) {
    var possibleSelectors = [
      '#admin-' + tabId,
      '#' + tabId + '-section',
      '#' + tabId,
      '[data-page="' + tabId + '"]'
    ];
    
    possibleSelectors.forEach(function (selector) {
      var elements = document.querySelectorAll(selector);
      elements.forEach(function (el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
      });
    });
  });
  
  var targetSelectors = [
    '#admin-' + tab,
    '#' + tab + '-section',
    '#' + tab,
    '[data-page="' + tab + '"]'
  ];
  
  var targetFound = false;
  for (var i = 0; i < targetSelectors.length; i++) {
    var targets = document.querySelectorAll(targetSelectors[i]);
    targets.forEach(function (target) {
      target.style.display = 'block';
      target.style.visibility = 'visible';
      target.style.opacity = '1';
      target.style.position = 'relative';
      target.style.pointerEvents = 'auto';
      target.classList.add('revealed');
      targetFound = true;
      
      if (typeof lucide !== 'undefined') {
        setTimeout(function() {
          lucide.createIcons({ nodes: [target] }); 
        }, 10);
      }
    });
    if (targetFound) break;
  }
  
  if (!targetFound) {
    console.warn('Tab section not found for:', tab);
    return;
  }
  
  if (tab === 'user' && typeof redrawCharts === 'function') {
    setTimeout(redrawCharts, 150);
  }
  
  if (tab === 'about' && typeof initAboutSection === 'function') {
    setTimeout(initAboutSection, 50);
  }
}

/* ==============================================
   ATTACH DASHBOARD TAB HANDLERS
   Excludes auth tabs via :not(.auth-tab)
   ============================================== */
function attachTabHandlers() {
  // KEY FIX: Only target dashboard/mobile nav links, NOT auth tab buttons
  var navLinks = document.querySelectorAll('[data-tab]:not(.auth-tab)');
  
  navLinks.forEach(function(link) {
    var newLink = link.cloneNode(true);
    link.parentNode.replaceChild(newLink, link);
    
    newLink.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      
      var tabName = this.getAttribute('data-tab');
      if (tabName) switchTab(tabName);
    });
  });
}

/* ==============================================
   AUTH STATE OBSERVER (FIXED)
   ============================================== */
auth.onAuthStateChanged(async function (user) {
  // CRITICAL FIX: Always cleanup listeners FIRST when auth state changes
  cleanupListeners();
  
  // CRITICAL FIX: Reset ALL data arrays to prevent showing previous user's data
  state.allArtworks = [];
  state.filteredArtworks = [];
  state.allMessages = [];
  state.allOrders = [];
  state.filteredOrders = [];
  state.userAnalytics = null;
  state.userProfile = null;
  state.deleteTargetId = null;
  state.editMode = false;
  state.orderDetailId = null;
  state.orderDeleteId = null;
  
  // CRITICAL FIX: Reset the about loaded flag so it reloads for new user
  aboutLoaded = false;
  
  if (user) {
    state.currentUser = user;
    
    state.userInfoRef = db.ref('user_information/' + user.uid);
    state.userArtworksRef = db.ref('user_information/' + user.uid + '/artworks');
    state.userDevMsgRef = db.ref('user_information/' + user.uid + '/developer_messages');
    state.userOrdersRef = db.ref('user_information/' + user.uid + '/orders');
    state.userMessagesRef = db.ref('user_information/' + user.uid + '/messages');
    state.userAboutRef = db.ref('user_information/' + user.uid + '/about');
    state.userAnalyticsRef = db.ref('user_information/' + user.uid + '/analytics');

    try {
      var snap = await state.userInfoRef.once('value');
      state.userProfile = snap.val();
      if (!state.userProfile) {
        state.userProfile = { email: user.email, createdAt: Date.now() };
        await state.userInfoRef.set(state.userProfile);
      }
      
      if (state.userProfile.galleryTheme) {
        state.galleryTheme = { ...state.galleryTheme, ...state.userProfile.galleryTheme };
      }
    } catch (e) {
      console.error('Error loading user profile:', e);
      state.userProfile = { email: user.email };
    }

    showDashboard();
  } else {
    state.currentUser = null;
    state.userArtworksRef = null;
    state.userDevMsgRef = null;
    state.userInfoRef = null;
    state.userOrdersRef = null;
    state.userMessagesRef = null;
    state.userAboutRef = null;
    state.userAnalyticsRef = null;
    showAuth();
  }
});

/* ==============================================
   CLEANUP LISTENERS (FIXED - more thorough)
   ============================================== */
function cleanupListeners() {
  // Always try to detach, even if flag says not attached (for safety)
  if (state.userArtworksRef) {
    state.userArtworksRef.off('value');
    state.listenersAttached.artworks = false;
  }
  if (state.userMessagesRef) {
    state.userMessagesRef.off('value');
    state.listenersAttached.messages = false;
  }
  if (state.userOrdersRef) {
    state.userOrdersRef.off('value');
    state.listenersAttached.orders = false;
  }
  if (state.userAnalyticsRef) {
    state.userAnalyticsRef.off('value');
    state.listenersAttached.analytics = false;
  }
}

/* ==============================================
   ABOUT & PROFILE SECTION (FIXED)
   ============================================== */
var aboutLoaded = false;  // This is now reset in onAuthStateChanged

window.initAboutSection = function () {
  if (!state.userAboutRef) return;
  
  // Reset and reload for current user
  aboutLoaded = false;
  
  if (aboutLoaded) return;
  aboutLoaded = true;
  loadAboutData();
};

function loadAboutData() {
  if (!state.userAboutRef) return;
  
  // Clear existing about form values first
  var aboutPhotoUrl = document.getElementById('aboutPhotoUrl');
  var aboutPreviewImg = document.getElementById('aboutPreviewImg');
  var aboutUploadPlaceholder = document.getElementById('aboutUploadPlaceholder');
  var aboutRemoveImgBtn = document.getElementById('aboutRemoveImgBtn');
  var aboutArtistName = document.getElementById('aboutArtistName');
  var aboutTagline = document.getElementById('aboutTagline');
  var aboutBio1 = document.getElementById('aboutBio1');
  var aboutBio2 = document.getElementById('aboutBio2');
  var aboutInstagram = document.getElementById('aboutInstagram');
  var aboutTwitter = document.getElementById('aboutTwitter');
  var aboutFacebook = document.getElementById('aboutFacebook');
  var aboutWhatsapp = document.getElementById('aboutWhatsapp');
  
  // Reset form to empty state first
  if (aboutPhotoUrl) aboutPhotoUrl.value = '';
  if (aboutPreviewImg) { aboutPreviewImg.src = ''; aboutPreviewImg.style.display = 'none'; }
  if (aboutUploadPlaceholder) aboutUploadPlaceholder.style.display = 'flex';
  if (aboutRemoveImgBtn) aboutRemoveImgBtn.classList.add('hidden');
  if (aboutArtistName) aboutArtistName.value = '';
  if (aboutTagline) aboutTagline.value = '';
  if (aboutBio1) aboutBio1.value = '';
  if (aboutBio2) aboutBio2.value = '';
  if (aboutInstagram) aboutInstagram.value = '';
  if (aboutTwitter) aboutTwitter.value = '';
  if (aboutFacebook) aboutFacebook.value = '';
  if (aboutWhatsapp) aboutWhatsapp.value = '';
  
  // Now load the actual data
  state.userAboutRef.once('value').then(function (snap) {
    var data = snap.val();
    if (!data) return;
    
    // Populate form with user's data
    if (data.photo) {
      if (aboutPhotoUrl) aboutPhotoUrl.value = data.photo;
      if (aboutPreviewImg) { aboutPreviewImg.src = data.photo; aboutPreviewImg.style.display = 'block'; }
      if (aboutUploadPlaceholder) aboutUploadPlaceholder.style.display = 'none';
      if (aboutRemoveImgBtn) aboutRemoveImgBtn.classList.remove('hidden');
    }
    if (aboutArtistName) aboutArtistName.value = data.name || '';
    if (aboutTagline) aboutTagline.value = data.tagline || '';
    if (aboutBio1) aboutBio1.value = data.bio1 || '';
    if (aboutBio2) aboutBio2.value = data.bio2 || '';
    if (data.socials) {
      if (aboutInstagram) aboutInstagram.value = data.socials.instagram || '';
      if (aboutTwitter) aboutTwitter.value = data.socials.twitter || '';
      if (aboutFacebook) aboutFacebook.value = data.socials.facebook || '';
      if (aboutWhatsapp) aboutWhatsapp.value = data.socials.whatsapp || '';
    }
  }).catch(function (err) { 
    console.error('Load about error:', err); 
  });
}

/* ==============================================
   SHOW DASHBOARD (FIXED - clear UI before attaching listeners)
   ============================================== */
function showDashboard() {
  var authScreen = document.getElementById('authScreen');
  var dashboardScreen = document.getElementById('dashboardScreen');
  
  if (authScreen) authScreen.classList.add('hidden');
  if (dashboardScreen) dashboardScreen.classList.remove('hidden');

  var nameEl = document.getElementById('adminUserName');
  if (nameEl && state.userProfile) {
    var fullName = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
    nameEl.textContent = fullName || (auth.currentUser ? auth.currentUser.email : '');
  }

  var artistInput = document.getElementById('artArtistName');
  if (artistInput && state.userProfile && !state.editMode) {
    var fullName2 = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
    if (fullName2) artistInput.value = fullName2;
  }

  var devName = document.getElementById('devMsgName');
  var devEmail = document.getElementById('devMsgEmail');
  if (devName && state.userProfile) {
    var fullName3 = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
    if (fullName3) devName.value = fullName3;
  }
  if (devEmail && auth.currentUser) {
    devEmail.value = auth.currentUser.email || '';
  }

  // Clear rendered lists immediately to prevent showing stale data
  var adminList = document.getElementById('adminArtworkList');
  if (adminList) adminList.innerHTML = '';
  
  var msgsList = document.getElementById('msgsList');
  if (msgsList) msgsList.innerHTML = '';
  
  var odGrid = document.getElementById('odGrid');
  if (odGrid) odGrid.innerHTML = '';

  attachAllListeners();
  initRevealAnimations();
  updateDarkModeIcon();
  loadGalleryTheme();
  
  setTimeout(function() {
    switchTab('order');
  }, 50);
}

/* ==============================================
   ATTACH ALL LISTENERS (FIXED - reset flags)
   ============================================== */
function attachAllListeners() {
  // Ensure flags are false before attaching (safety measure)
  state.listenersAttached.artworks = false;
  state.listenersAttached.messages = false;
  state.listenersAttached.orders = false;
  state.listenersAttached.analytics = false;
  
  attachArtworkListener();
  attachMessagesListener();
  attachOrdersListener();
  attachUserAnalyticsListener();
  initAboutSection();
}

/* ==============================================
   USER ANALYTICS (Per-User Views/Visitors)
   ============================================== */
function attachUserAnalyticsListener() {
  if (state.listenersAttached.analytics || !state.userAnalyticsRef) return;
  state.listenersAttached.analytics = true;

  state.userAnalyticsRef.on('value', function (snap) {
    var d = snap.val();
    state.userAnalytics = d || { totalViews: 0, totalVisitors: 0, todayViews: 0, todayVisitors: 0, activeVisitors: 0 };
    updateUserAnalyticsDisplay();
  }, function (err) {
    console.error('User analytics error:', err);
  });
}

function updateUserAnalyticsDisplay() {
  var el = function(id) { return document.getElementById(id); };
  var a = state.userAnalytics;
  
  if(el('wsTotalViews')) el('wsTotalViews').textContent = fmtNum(a.totalViews || 0);
  if(el('wsTotalVisitors')) el('wsTotalVisitors').textContent = fmtNum(a.totalVisitors || 0);
  if(el('wsTodayViews')) el('wsTodayViews').textContent = fmtNum(a.todayViews || 0);
  if(el('wsTodayVisitors')) el('wsTodayVisitors').textContent = fmtNum(a.todayVisitors || 0);
  if(el('wsActiveNow')) el('wsActiveNow').textContent = fmtNum(a.activeVisitors || 0);
  if(el('wsLastUpdated')) el('wsLastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  if(el('anTotalViews')) el('anTotalViews').textContent = fmtNum(a.totalViews || 0);
  if(el('anTotalVisitors')) el('anTotalVisitors').textContent = fmtNum(a.totalVisitors || 0);
  if(el('tmTodayViews')) el('tmTodayViews').textContent = fmtNum(a.todayViews || 0);
  if(el('tmTodayVisitors')) el('tmTodayVisitors').textContent = fmtNum(a.todayVisitors || 0);
  if(el('tmActiveNow')) el('tmActiveNow').textContent = fmtNum(a.activeVisitors || 0);
}

/* ==============================================
   GALLERY THEME MANAGEMENT
   ============================================== */
function loadGalleryTheme() {
  var themeSelect = document.getElementById('galleryAccentColor');
  if (themeSelect && state.galleryTheme.accentColor) {
    themeSelect.value = state.galleryTheme.accentColor;
  }
  
  var fontSelect = document.getElementById('galleryFontFamily');
  if (fontSelect && state.galleryTheme.fontFamily) {
    fontSelect.value = state.galleryTheme.fontFamily;
  }
  
  var showPriceCheck = document.getElementById('galleryShowPrice');
  if (showPriceCheck) {
    showPriceCheck.checked = state.galleryTheme.showPrice !== false;
  }
  
  var showCategoryCheck = document.getElementById('galleryShowCategory');
  if (showCategoryCheck) {
    showCategoryCheck.checked = state.galleryTheme.showCategory !== false;
  }
  
  updateThemePreview();
}

async function saveGalleryTheme() {
  if (!state.userInfoRef) return;
  
  var accentColor = document.getElementById('galleryAccentColor')?.value || '#b8860b';
  var fontFamily = document.getElementById('galleryFontFamily')?.value || 'Inter';
  var showPrice = document.getElementById('galleryShowPrice')?.checked !== false;
  var showCategory = document.getElementById('galleryShowCategory')?.checked !== false;
  
  state.galleryTheme = {
    accentColor: accentColor,
    fontFamily: fontFamily,
    showPrice: showPrice,
    showCategory: showCategory,
    updatedAt: Date.now()
  };
  
  try {
    await state.userInfoRef.child('galleryTheme').set(state.galleryTheme);
    showToast('Gallery theme saved!', 'success');
  } catch (err) {
    showToast('Failed to save theme', 'error');
  }
}

function updateThemePreview() {
  var preview = document.getElementById('themePreviewBox');
  if (preview) {
    preview.style.background = state.galleryTheme.accentColor;
  }
}

/* ==============================================
   AUTH: SIGN IN
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  var signInForm = document.getElementById('signInForm');
  if (signInForm) {
    signInForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var em = document.getElementById('signInEmail').value.trim();
      var pw = document.getElementById('signInPassword').value;
      var er = document.getElementById('signInError');
      var b = document.getElementById('signInBtn');

      if (!em || !pw) { er.textContent = 'Enter email and password.'; er.classList.remove('hidden'); return; }
      er.classList.add('hidden');
      setLoading(b, true);

      try {
        await auth.signInWithEmailAndPassword(em, pw);
      } catch (err) {
        console.error('Sign in error:', err);
        var msgs = {
          'auth/user-not-found': 'No account found with this email.',
          'auth/wrong-password': 'Incorrect password.',
          'auth/invalid-credential': 'Invalid email or password.',
          'auth/too-many-requests': 'Too many attempts. Try again later.',
          'auth/invalid-email': 'Invalid email address.',
          'auth/user-disabled': 'This account has been disabled.',
          'auth/network-request-failed': 'Network error. Check your connection.'
        };
        er.textContent = msgs[err.code] || 'Sign in failed. Please try again.';
        er.classList.remove('hidden');
      } finally {
        setLoading(b, false);
      }
    });
  }
});

/* ==============================================
   AUTH: SIGN UP
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  var signUpForm = document.getElementById('signUpForm');
  if (signUpForm) {
    signUpForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var firstName = document.getElementById('signUpFirstName').value.trim();
      var secondName = document.getElementById('signUpSecondName').value.trim();
      var email = document.getElementById('signUpEmail').value.trim();
      var username = document.getElementById('signUpUsername').value.trim();
      var location = document.getElementById('signUpLocation').value.trim();
      var referral = document.getElementById('signUpReferral').value;
      var password = document.getElementById('signUpPassword').value;
      var confirmPassword = document.getElementById('signUpConfirmPassword').value;
      var er = document.getElementById('signUpError');
      var b = document.getElementById('signUpBtn');

      var errors = [];
      if (!firstName) errors.push('First name is required.');
      if (!secondName) errors.push('Second name is required.');
      if (!email) errors.push('Email is required.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Enter a valid email address.');
      if (!username) errors.push('Username is required.');
      else if (username.length < 3) errors.push('Username must be at least 3 characters.');
      else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.push('Username can only contain letters, numbers, and underscores.');
      if (!location) errors.push('Location is required.');
      if (!referral) errors.push('Please select how you heard about us.');
      if (!password) errors.push('Password is required.');
      else if (password.length < 6) errors.push('Password must be at least 6 characters.');
      if (password !== confirmPassword) errors.push('Passwords do not match.');

      if (errors.length > 0) { er.textContent = errors[0]; er.classList.remove('hidden'); return; }

      er.classList.add('hidden');
      setLoading(b, true);

      try {
        var cred = await auth.createUserWithEmailAndPassword(email, password);
        var profileData = {
          firstName: firstName,
          secondName: secondName,
          email: email,
          username: username,
          location: location,
          referral: referral,
          createdAt: Date.now()
        };
        await db.ref('user_information/' + cred.user.uid).set(profileData);
        await cred.user.updateProfile({ displayName: firstName + ' ' + secondName });
        showToast('Account created! Welcome to Afro Gallero.', 'success');
      } catch (err) {
        console.error('Sign up error:', err);
        var msgs = {
          'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
          'auth/invalid-email': 'Invalid email address.',
          'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
          'auth/operation-not-allowed': 'Email/Password sign-up is not enabled.',
          'auth/network-request-failed': 'Network error. Check your connection.',
          'auth/too-many-requests': 'Too many attempts. Try again later.',
          'auth/internal-error': 'An internal error occurred.'
        };
        er.textContent = msgs[err.code] || 'Sign up failed. Please try again.';
        er.classList.remove('hidden');
      } finally {
        setLoading(b, false);
      }
    });
  }
});

/* ==============================================
   AUTH: FORGOT PASSWORD
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  var forgotForm = document.getElementById('forgotPasswordForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('forgotEmail').value.trim();
      var er = document.getElementById('forgotError');
      var successEl = document.getElementById('forgotSuccess');
      var b = document.getElementById('forgotBtn');

      if (!email) { er.textContent = 'Enter your email address.'; er.classList.remove('hidden'); return; }
      er.classList.add('hidden');
      setLoading(b, true);

      try {
        await auth.sendPasswordResetEmail(email);
        successEl.classList.remove('hidden');
        b.style.display = 'none';
        e.target.querySelectorAll('.form-group').forEach(function (el) { el.style.display = 'none'; });
        var backLink = e.target.querySelector('.auth-back-link');
        if (backLink) backLink.style.display = 'none';
        showToast('Password reset email sent!', 'success');
      } catch (err) {
        var msgs = {
          'auth/user-not-found': 'No account found with this email.',
          'auth/invalid-email': 'Invalid email address.',
          'auth/too-many-requests': 'Too many requests. Try again later.'
        };
        er.textContent = msgs[err.code] || 'Failed to send reset email.';
        er.classList.remove('hidden');
      } finally {
        setLoading(b, false);
      }
    });
  }
});

/* ==============================================
   AUTH: TAB SWITCHING (direct handlers)
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  // Attach click handlers DIRECTLY to each auth tab button
  var signinTab = document.querySelector('.auth-tab[data-tab="signin"]');
  var signupTab = document.querySelector('.auth-tab[data-tab="signup"]');

  if (signinTab) {
    signinTab.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      switchAuthTab('signin');
    });
  }

  if (signupTab) {
    signupTab.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      switchAuthTab('signup');
    });
  }

  // Forgot password link
  var forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.auth-form').forEach(function (f) { f.classList.remove('active'); });
      document.getElementById('forgotPasswordForm').classList.add('active');
      document.getElementById('authTabs').style.display = 'none';
      document.getElementById('authSubtitle').textContent = 'Reset your password';
      resetForgotForm();
    });
  }

  // Back to sign in link
  var backLink = document.getElementById('backToSignInLink');
  if (backLink) {
    backLink.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      switchAuthTab('signin');
      resetForgotForm();
    });
  }
});

function resetForgotForm() {
  var form = document.getElementById('forgotPasswordForm');
  if (!form) return;
  form.reset();
  var forgotSuccess = document.getElementById('forgotSuccess');
  var forgotBtn = document.getElementById('forgotBtn');
  var forgotError = document.getElementById('forgotError');
  if (forgotSuccess) forgotSuccess.classList.add('hidden');
  if (forgotBtn) forgotBtn.style.display = '';
  form.querySelectorAll('.form-group').forEach(function (el) { el.style.display = ''; });
  var backLink = form.querySelector('.auth-back-link');
  if (backLink) backLink.style.display = '';
  if (forgotError) forgotError.classList.add('hidden');
}

/* ==============================================
   PASSWORD TOGGLES
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = this.parentElement.querySelector('.form-control');
      var icon = this.querySelector('[data-lucide]');
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      if (icon) {
        icon.setAttribute('data-lucide', show ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [this] });
      }
    });
  });
});

/* ==============================================
   MOBILE MENU HANDLERS
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  var menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMobileMenu);
  }
  
  var menuOverlay = document.getElementById('mobileMenuOverlay');
  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMobileMenu);
  }
  
  var darkModeBtn = document.getElementById('darkModeBtn');
  if (darkModeBtn) {
    darkModeBtn.addEventListener('click', function() {
      toggleDarkMode();
    });
  }
  
  var signOutBtn = document.getElementById('mobileSignOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async function() {
      closeMobileMenu();
      try {
        await auth.signOut();
        showToast('Signed out', 'info');
      } catch (e) { /* ignore */ }
    });
  }
  
  var galleryThemeBtn = document.getElementById('galleryThemeBtn');
  if (galleryThemeBtn) {
    galleryThemeBtn.addEventListener('click', function() {
      closeMobileMenu();
      switchTab('about');
      setTimeout(function() {
        var themeSection = document.getElementById('galleryThemeSection');
        if (themeSection) themeSection.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    });
  }
  
  var accentSelect = document.getElementById('galleryAccentColor');
  if (accentSelect) {
    accentSelect.addEventListener('change', function() {
      state.galleryTheme.accentColor = this.value;
      updateThemePreview();
    });
  }
  
  var fontSelect = document.getElementById('galleryFontFamily');
  if (fontSelect) {
    fontSelect.addEventListener('change', function() {
      state.galleryTheme.fontFamily = this.value;
    });
  }
  
  var saveThemeBtn = document.getElementById('saveGalleryThemeBtn');
  if (saveThemeBtn) {
    saveThemeBtn.addEventListener('click', saveGalleryTheme);
  }
});

/* ==============================================
   ARTWORK LISTENER
   ============================================== */
function attachArtworkListener() {
  if (state.listenersAttached.artworks || !state.userArtworksRef) return;
  state.listenersAttached.artworks = true;

  state.userArtworksRef.on('value', function (snap) {
    var d = snap.val();
    state.allArtworks = d ? Object.entries(d).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
    state.allArtworks.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var searchInput = document.getElementById('adminSearchInput');
    filterArtworks(searchInput ? searchInput.value.trim() : '');
    updateStats();
    renderAdminList();
  }, function (e) {
    console.error(e);
    showToast('Failed to load artworks', 'error');
  });
}

/* ==============================================
   STATS
   ============================================== */
function updateStats() {
  var a = state.allArtworks;
  var el = function(id) { return document.getElementById(id); };
  
  if (el('adminTotalArtworks')) el('adminTotalArtworks').textContent = a.length;
  if (el('adminTotalCategories')) el('adminTotalCategories').textContent = new Set(a.map(function (x) { return x.category; }).filter(Boolean)).size;

  var displayCur = state.totalValueCurrency;
  var total = 0;
  a.forEach(function (x) {
    var p = Number(x.price) || 0;
    if (!p) return;
    var itemCur = x.currency || 'UGX';
    total += convertCurrency(p, itemCur, displayCur);
  });
  if (el('adminTotalValue')) el('adminTotalValue').textContent = formatPrice(total, displayCur);
  var toggle = document.getElementById('totalValueToggle');
  if (toggle) toggle.textContent = displayCur;

  var latest = a.length > 0 ? a.reduce(function (x, y) { return (x.createdAt || 0) > (y.createdAt || 0) ? x : y; }) : null;
  if (el('adminLastUpload')) el('adminLastUpload').textContent = latest ? formatRelativeDate(latest.createdAt) : '—';
  if (el('adminCount')) el('adminCount').textContent = a.length + ' item' + (a.length !== 1 ? 's' : '');
}

document.addEventListener('DOMContentLoaded', function() {
  var totalValueToggle = document.getElementById('totalValueToggle');
  if (totalValueToggle) {
    totalValueToggle.addEventListener('click', function () {
      state.totalValueCurrency = this.textContent === 'UGX' ? 'USD' : 'UGX';
      updateStats();
    });
  }
});

/* ==============================================
   ARTWORK LIST RENDERING
   ============================================== */
function filterArtworks(s) {
  if (!s) { state.filteredArtworks = state.allArtworks.slice(); return; }
  var t = s.toLowerCase();
  state.filteredArtworks = state.allArtworks.filter(function (a) {
    return (a.title || '').toLowerCase().indexOf(t) !== -1 ||
           (a.category || '').toLowerCase().indexOf(t) !== -1 ||
           (a.artistName || '').toLowerCase().indexOf(t) !== -1;
  });
}

function renderAdminList() {
  var l = document.getElementById('adminArtworkList');
  var e = document.getElementById('adminEmpty');
  if (!l) return;
  if (state.filteredArtworks.length === 0) { l.innerHTML = ''; if(e) e.classList.remove('hidden'); return; }
  if (e) e.classList.add('hidden');
  l.innerHTML = state.filteredArtworks.map(function (art) {
    var imgs = getArtworkImages(art);
    var mainImg = imgs[0] || '';
    var imgCount = imgs.length;
    var views = art.views || 0;
    return '<div class="admin-artwork-item" data-id="' + art.id + '">' +
      '<img src="' + escapeHtml(mainImg) + '" alt="' + escapeHtml(art.title) + '" class="admin-artwork-thumb" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<div class="admin-artwork-meta">' +
        '<h4>' + escapeHtml(art.title) + '</h4>' +
        '<div class="meta-row">' +
          '<span class="meta-cat">' + escapeHtml(art.category || 'Other') + '</span>' +
          '<span class="meta-price">' + formatPrice(art.price, art.currency) + '</span>' +
          '<span class="meta-views"><i data-lucide="eye" style="width:11px;height:11px;"></i> ' + views + '</span>' +
          (imgCount > 1 ? '<span class="meta-images-badge"><i data-lucide="images" style="width:12px;height:12px;"></i> ' + imgCount + '</span>' : '') +
        '</div>' +
        '<span class="meta-date">' + formatFullDate(art.createdAt) + '</span>' +
      '</div>' +
      '<div class="admin-artwork-actions">' +
        '<button class="btn btn-icon admin-edit-btn" data-id="' + art.id + '" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
        '<button class="btn btn-icon admin-delete-btn" data-id="' + art.id + '" title="Delete" style="color:var(--danger);border-color:rgba(192,57,43,0.3);"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
      '</div></div>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [l] });
}

document.addEventListener('DOMContentLoaded', function() {
  var adminArtworkList = document.getElementById('adminArtworkList');
  if (adminArtworkList) {
    adminArtworkList.addEventListener('click', function (e) {
      var ed = e.target.closest('.admin-edit-btn');
      var de = e.target.closest('.admin-delete-btn');
      if (ed) startEdit(ed.dataset.id);
      if (de) openDeleteModal(de.dataset.id);
    });
  }

  var adminSearchInput = document.getElementById('adminSearchInput');
  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', debounce(function (e) {
      filterArtworks(e.target.value.trim());
      renderAdminList();
    }, 300));
  }
});

/* ==============================================
   IMAGE PREVIEW
   ============================================== */
function renderPreviewGrid() {
  var grid = document.getElementById('previewGrid');
  var hint = document.getElementById('previewEmptyHint');
  var badge = document.getElementById('previewCountBadge');
  if (!grid) return;
  if (badge) badge.textContent = state.previewItems.length > 0 ? state.previewItems.length + ' image' + (state.previewItems.length !== 1 ? 's' : '') + ' selected' : '';
  if (hint) hint.classList.toggle('hidden', state.previewItems.length > 0);
  grid.innerHTML = state.previewItems.map(function (item, idx) {
    return '<div class="preview-item" data-index="' + idx + '">' +
      '<img src="' + escapeHtml(item.src) + '" alt="Preview ' + (idx + 1) + '" loading="lazy">' +
      '<button type="button" class="preview-remove-btn" data-index="' + idx + '" aria-label="Remove image ' + (idx + 1) + '"><i data-lucide="x" style="width:14px;height:14px;"></i></button>' +
      '</div>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [grid] });
}

document.addEventListener('DOMContentLoaded', function() {
  var previewGrid = document.getElementById('previewGrid');
  if (previewGrid) {
    previewGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('.preview-remove-btn');
      if (!btn) return;
      var idx = parseInt(btn.dataset.index, 10);
      if (isNaN(idx) || idx < 0 || idx >= state.previewItems.length) return;
      var item = state.previewItems[idx];
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      state.previewItems.splice(idx, 1);
      renderPreviewGrid();
    });
  }

  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      var files = Array.from(e.target.files);
      if (files.length === 0) return;
      var remaining = MAX_IMAGES - state.previewItems.length;
      if (remaining <= 0) { showToast('Maximum ' + MAX_IMAGES + ' images allowed.', 'error'); e.target.value = ''; return; }
      var toAdd = files.slice(0, remaining);
      if (files.length > remaining) showToast('Only ' + remaining + ' more image' + (remaining !== 1 ? 's' : '') + ' can be added.', 'info');
      toAdd.forEach(function (file) {
        if (!file.type.startsWith('image/')) return;
        var url = URL.createObjectURL(file);
        state.previewItems.push({ type: 'pending', src: url, file: file, objectUrl: url });
      });
      renderPreviewGrid();
      e.target.value = '';
    });
  }

  var artCurrency = document.getElementById('artCurrency');
  if (artCurrency) {
    artCurrency.addEventListener('change', function () {
      var newCur = this.value;
      var inp = document.getElementById('artPrice');
      var val = parseFloat(inp.value);
      if (!isNaN(val) && val > 0 && state.prevCurrency !== newCur) {
        inp.value = convertCurrency(val, state.prevCurrency, newCur);
      }
      state.prevCurrency = newCur;
      updateRateHint();
    });
  }
});

/* ==============================================
   IMGBB UPLOAD
   ============================================== */
async function uploadPendingFiles(onProgress) {
  var pending = state.previewItems.filter(function (i) { return i.type === 'pending'; });
  if (pending.length === 0) return [];
  var urls = [];
  var completed = 0;
  var promises = pending.map(function (item) {
    var fd = new FormData();
    fd.append('image', item.file);
    fd.append('key', IMGBB_KEY);
    return fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { if (d.success) urls.push(d.data.display_url); else throw new Error('Upload failed'); })
      .catch(function (err) { console.error('ImgBB error:', err); })
      .finally(function () { completed++; if (onProgress) onProgress(completed, pending.length); });
  });
  await Promise.allSettled(promises);
  return urls;
}

function showUploadProgress(show) {
  var el = document.getElementById('uploadProgressWrap');
  if (el) el.classList.toggle('hidden', !show);
}

function updateUploadProgress(done, total) {
  var pct = total > 0 ? Math.round((done / total) * 100) : 0;
  var bar = document.getElementById('uploadProgressBar');
  var label = document.getElementById('uploadProgressLabel');
  var percent = document.getElementById('uploadProgressPercent');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = 'Uploading ' + done + '/' + total + ' image' + (total !== 1 ? 's' : '') + '...';
  if (percent) percent.textContent = pct + '%';
}

/* ==============================================
   FORM SUBMISSION
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  var uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var b = document.getElementById('uploadBtn');
      var er = document.getElementById('uploadError');
      if (!er) return;
      er.classList.add('hidden');

      var errors = [];
      if (!document.getElementById('artArtistName').value.trim()) errors.push('Artist name required.');
      if (!document.getElementById('artTitle').value.trim()) errors.push('Title required.');
      if (state.previewItems.length === 0) errors.push('Select at least one image.');
      if (isNaN(parseInt(document.getElementById('artPrice').value)) || parseInt(document.getElementById('artPrice').value) < 0) errors.push('Valid price required.');
      if (!document.getElementById('artCategory').value) errors.push('Category required.');
      if (!document.getElementById('artDescription').value.trim()) errors.push('Description required.');
      if (!document.getElementById('artSize').value.trim()) errors.push('Image size required.');

      if (errors.length > 0) { er.textContent = errors[0]; er.classList.remove('hidden'); return; }

      setLoading(b, true);
      try {
        var allUrls = state.previewItems.filter(function (i) { return i.type === 'existing'; }).map(function (i) { return i.src; });
        var pendingCount = state.previewItems.filter(function (i) { return i.type === 'pending'; }).length;
        if (pendingCount > 0) {
          showUploadProgress(true);
          updateUploadProgress(0, pendingCount);
          var uploadedUrls = await uploadPendingFiles(function (done, total) { updateUploadProgress(done, total); });
          allUrls = allUrls.concat(uploadedUrls);
          showUploadProgress(false);
          if (uploadedUrls.length === 0 && pendingCount > 0) {
            er.textContent = 'All image uploads failed.';
            er.classList.remove('hidden');
            setLoading(b, false);
            return;
          }
          if (uploadedUrls.length < pendingCount) showToast((pendingCount - uploadedUrls.length) + ' image(s) failed to upload.', 'error');
        }
        if (allUrls.length === 0) { er.textContent = 'No valid images to save.'; er.classList.remove('hidden'); setLoading(b, false); return; }

        var eid = document.getElementById('editArtworkId').value;
        var data = {
          artistName: document.getElementById('artArtistName').value.trim(),
          title: document.getElementById('artTitle').value.trim(),
          size: document.getElementById('artSize').value.trim(),
          images: allUrls,
          image: allUrls[0],
          price: parseInt(document.getElementById('artPrice').value),
          currency: document.getElementById('artCurrency').value || 'UGX',
          category: document.getElementById('artCategory').value,
          description: document.getElementById('artDescription').value.trim(),
          views: 0,
          createdAt: state.editMode && eid ? (state.allArtworks.find(function (a) { return a.id === eid; }) || {}).createdAt || Date.now() : Date.now(),
          updatedAt: state.editMode ? Date.now() : null
        };

        if (state.editMode && eid) {
          await state.userArtworksRef.child(eid).update(data);
          showToast('Artwork updated', 'success');
        } else {
          await state.userArtworksRef.child(generateId()).set(data);
          showToast('Artwork added', 'success');
        }
        resetUploadForm();
      } catch (err) {
        er.textContent = 'Save failed: ' + err.message;
        er.classList.remove('hidden');
        showToast('Failed to save', 'error');
      } finally {
        setLoading(b, false);
        showUploadProgress(false);
      }
    });
  }

  var cancelEditBtn = document.getElementById('cancelEditBtn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetUploadForm);
  }
});

/* ==============================================
   RESET & EDIT
   ============================================== */
function resetUploadForm() {
  var form = document.getElementById('uploadForm');
  if (form) form.reset();
  var artistInput = document.getElementById('artArtistName');
  if (artistInput && state.userProfile) {
    var fullName = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
    if (fullName) artistInput.value = fullName;
  }
  var editIdEl = document.getElementById('editArtworkId');
  if (editIdEl) editIdEl.value = '';
  var curEl = document.getElementById('artCurrency');
  if (curEl) curEl.value = 'UGX';
  state.editMode = false;
  state.prevCurrency = 'UGX';
  state.previewItems.forEach(function (item) { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
  state.previewItems = [];
  renderPreviewGrid();
  var t = document.getElementById('uploadSectionTitle');
  if (t) { t.innerHTML = '<i data-lucide="plus-circle" style="width:20px;height:20px;"></i> Upload New Artwork'; if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [t] }); }
  var bt = document.getElementById('uploadBtn');
  if (bt) { var btText = bt.querySelector('.btn-text'); if (btText) btText.textContent = 'Save Artwork'; }
  var cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  var errEl = document.getElementById('uploadError');
  if (errEl) errEl.classList.add('hidden');
  showUploadProgress(false);
}

function startEdit(id) {
  var a = state.allArtworks.find(function (x) { return x.id === id; });
  if (!a) return showToast('Not found', 'error');
  state.editMode = true;
  document.getElementById('editArtworkId').value = id;
  document.getElementById('artArtistName').value = a.artistName || '';
  document.getElementById('artTitle').value = a.title || '';
  document.getElementById('artSize').value = a.size || '';
  document.getElementById('artPrice').value = a.price || '';
  document.getElementById('artCurrency').value = a.currency || 'UGX';
  state.prevCurrency = a.currency || 'UGX';
  document.getElementById('artCategory').value = a.category || '';
  document.getElementById('artDescription').value = a.description || '';

  state.previewItems.forEach(function (item) { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
  var imgs = getArtworkImages(a);
  state.previewItems = imgs.map(function (url) { return { type: 'existing', src: url }; });
  renderPreviewGrid();

  var t = document.getElementById('uploadSectionTitle');
  if (t) { t.innerHTML = '<i data-lucide="pencil" style="width:20px;height:20px;"></i> Edit Artwork'; if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [t] }); }
  var ubt = document.getElementById('uploadBtn');
  if (ubt) { var ut = ubt.querySelector('.btn-text'); if (ut) ut.textContent = 'Save Changes'; }
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  document.getElementById('uploadError').classList.add('hidden');
  var formPanel = document.querySelector('.admin-form-panel');
  if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Editing: ' + a.title, 'info');
}

/* ==============================================
   DELETE ARTWORK MODAL
   ============================================== */
function openDeleteModal(id) {
  var a = state.allArtworks.find(function (x) { return x.id === id; });
  if (!a) return;
  state.deleteTargetId = id;
  var deleteModalText = document.getElementById('deleteModalText');
  var deleteModal = document.getElementById('deleteModal');
  if (deleteModalText) deleteModalText.textContent = '"' + a.title + '" will be permanently removed.';
  if (deleteModal) deleteModal.classList.add('open');
}

function closeDeleteModal() {
  var deleteModal = document.getElementById('deleteModal');
  if (deleteModal) deleteModal.classList.remove('open');
  state.deleteTargetId = null;
}

document.addEventListener('DOMContentLoaded', function() {
  var cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  
  var deleteModal = document.getElementById('deleteModal');
  if (deleteModal) {
    deleteModal.addEventListener('click', function (e) { if (e.target === this) closeDeleteModal(); });
  }
  
  var confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function () {
      if (!state.deleteTargetId || !state.userArtworksRef) return;
      var b = this;
      var tid = state.deleteTargetId;
      setLoading(b, true);
      try {
        await state.userArtworksRef.child(tid).remove();
        showToast('Deleted', 'success');
        closeDeleteModal();
        var editArtworkId = document.getElementById('editArtworkId');
        if (editArtworkId && editArtworkId.value === tid) resetUploadForm();
      } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
      finally { setLoading(b, false); }
    });
  }
});

/* ==============================================
   GLOBAL KEYBOARD SHORTCUTS
   ============================================== */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var deleteModal = document.getElementById('deleteModal');
  var deleteMsgModal = document.getElementById('deleteMsgModal');
  var msgDetailModal = document.getElementById('msgDetailModal');
  var orderDetailModal = document.getElementById('orderDetailModal');
  var deleteOrderModal = document.getElementById('deleteOrderModal');
  
  if (state.mobileMenuOpen) { closeMobileMenu(); return; }
  if (deleteModal && deleteModal.classList.contains('open')) { closeDeleteModal(); return; }
  if (deleteMsgModal && deleteMsgModal.classList.contains('open')) { closeDeleteMsgModal(); return; }
  if (msgDetailModal && msgDetailModal.classList.contains('open')) { closeDetail(); return; }
  if (orderDetailModal && orderDetailModal.classList.contains('open')) { closeOrderDetail(); return; }
  if (deleteOrderModal && deleteOrderModal.classList.contains('open')) { closeDeleteOrderModal(); return; }
  if (state.editMode && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(e.target.tagName) === -1) { resetUploadForm(); }
});

/* ==============================================
   REVEAL ANIMATIONS
   ============================================== */
function initRevealAnimations() {
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('revealed'); observer.unobserve(en.target); }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.reveal:not(.revealed)').forEach(function (el) { observer.observe(el); });
}

/* ==============================================
   ADMIN MESSAGES
   ============================================== */
function attachMessagesListener() {
  if (state.listenersAttached.messages || !state.userMessagesRef) return;
  state.listenersAttached.messages = true;

  state.userMessagesRef.on('value', function (snap) {
    var d = snap.val();
    state.allMessages = d ? Object.entries(d).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
    state.allMessages.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    renderMessages();
    updateUnreadBadge();
  }, function (err) {
    console.error('Messages error:', err);
    showToast('Failed to load messages.', 'error');
  });
}

function renderMessages() {
  var msgsList = document.getElementById('msgsList');
  var msgsEmpty = document.getElementById('msgsEmpty');
  if (!msgsList) return;
  if (state.allMessages.length === 0) { msgsList.innerHTML = ''; if(msgsEmpty) msgsEmpty.classList.remove('hidden'); return; }
  if (msgsEmpty) msgsEmpty.classList.add('hidden');
  msgsList.innerHTML = state.allMessages.map(function (msg) {
    var isUnread = msg.read === false;
    var preview = (msg.message || '').substring(0, 90) + ((msg.message || '').length > 90 ? '...' : '');
    return '<div class="admin-msg-item ' + (isUnread ? 'msg-unread' : '') + '" data-id="' + msg.id + '">' +
      '<div class="msg-avatar">' + getInitials(msg.name) + '</div>' +
      '<div class="msg-body">' +
        '<div class="msg-body-top"><span class="msg-sender">' + escapeHtml(msg.name) + '</span><span class="msg-date">' + formatMsgDate(msg.createdAt) + '</span></div>' +
        '<p class="msg-preview">' + escapeHtml(preview) + '</p>' +
        '<div class="msg-meta-row">' +
          '<span><i data-lucide="mail" style="width:12px;height:12px;"></i> ' + escapeHtml(msg.email) + '</span>' +
          (msg.contact && msg.contact !== 'Not provided' ? '<span><i data-lucide="phone" style="width:12px;height:12px;"></i> ' + escapeHtml(msg.contact) + '</span>' : '') +
        '</div></div></div>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [msgsList] });
}

function updateUnreadBadge() {
  var unreadBadge = document.getElementById('unreadBadge');
  if (!unreadBadge) return;
  var c = state.allMessages.filter(function (m) { return m.read === false; }).length;
  if (c > 0) { unreadBadge.textContent = c; unreadBadge.classList.remove('hidden'); }
  else { unreadBadge.classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', function() {
  var msgSearchInput = document.getElementById('msgSearchInput');
  if (msgSearchInput) {
    msgSearchInput.addEventListener('input', debounce(function () {
      var q = this.value.trim().toLowerCase();
      if (!q) { renderMessages(); return; }
      var filtered = state.allMessages.filter(function (m) {
        return (m.name || '').toLowerCase().indexOf(q) !== -1 ||
               (m.email || '').toLowerCase().indexOf(q) !== -1 ||
               (m.message || '').toLowerCase().indexOf(q) !== -1 ||
               (m.contact || '').toLowerCase().indexOf(q) !== -1;
      });
      var orig = state.allMessages;
      state.allMessages = filtered;
      renderMessages();
      state.allMessages = orig;
    }, 300));
  }

  var markAllReadBtn = document.getElementById('markAllReadBtn');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async function () {
      var unread = state.allMessages.filter(function (m) { return m.read === false; });
      if (unread.length === 0) { showToast('No unread messages.', 'info'); return; }
      this.disabled = true;
      var updates = {};
      unread.forEach(function (m) { updates[m.id + '/read'] = true; });
      try {
        if (state.userMessagesRef) await state.userMessagesRef.update(updates);
        showToast(unread.length + ' message' + (unread.length !== 1 ? 's' : '') + ' marked as read.', 'success');
      } catch (e) { showToast('Failed to mark read.', 'error'); }
      this.disabled = false;
    });
  }

  var msgsList = document.getElementById('msgsList');
  if (msgsList) {
    msgsList.addEventListener('click', function (e) {
      var item = e.target.closest('.admin-msg-item');
      if (item) openDetail(item.dataset.id);
    });
  }

  var closeDetailBtn = document.getElementById('closeDetailBtn');
  if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetail);
  
  var msgDetailModal = document.getElementById('msgDetailModal');
  if (msgDetailModal) {
    msgDetailModal.addEventListener('click', function (e) { if (e.target === this) closeDetail(); });
  }

  var msgDetailToggleRead = document.getElementById('msgDetailToggleRead');
  if (msgDetailToggleRead) {
    msgDetailToggleRead.addEventListener('click', async function () {
      var detailModal = document.getElementById('msgDetailModal');
      if (!detailModal || !detailModal.dataset.currentId || !state.userMessagesRef) return;
      var currentDetailId = detailModal.dataset.currentId;
      var msg = state.allMessages.find(function (m) { return m.id === currentDetailId; });
      if (!msg) return;
      var ns = msg.read === false;
      try {
        await state.userMessagesRef.child(currentDetailId + '/read').set(ns);
        closeDetail();
        showToast(ns ? 'Marked as read.' : 'Marked as unread.', 'info');
      } catch (e) { showToast('Failed to update.', 'error'); }
    });
  }

  var msgDetailDelete = document.getElementById('msgDetailDelete');
  if (msgDetailDelete) {
    msgDetailDelete.addEventListener('click', function () {
      var detailModal = document.getElementById('msgDetailModal');
      if (!detailModal || !detailModal.dataset.currentId) return;
      openDeleteMsgModal(detailModal.dataset.currentId);
      closeDetail();
    });
  }

  var cancelDeleteMsgBtn = document.getElementById('cancelDeleteMsgBtn');
  if (cancelDeleteMsgBtn) cancelDeleteMsgBtn.addEventListener('click', closeDeleteMsgModal);
  
  var deleteMsgModal = document.getElementById('deleteMsgModal');
  if (deleteMsgModal) {
    deleteMsgModal.addEventListener('click', function (e) { if (e.target === this) closeDeleteMsgModal(); });
  }

  var confirmDeleteMsgBtn = document.getElementById('confirmDeleteMsgBtn');
  if (confirmDeleteMsgBtn) {
    confirmDeleteMsgBtn.addEventListener('click', async function () {
      var deleteModal = document.getElementById('deleteMsgModal');
      if (!deleteModal || !state.userMessagesRef || !deleteModal.dataset.currentDeleteId) return;
      var btn = this;
      setLoading(btn, true);
      try {
        await state.userMessagesRef.child(deleteModal.dataset.currentDeleteId).remove();
        closeDeleteMsgModal();
        showToast('Message deleted.', 'success');
      } catch (e) { showToast('Delete failed.', 'error'); }
      finally { setLoading(btn, false); }
    });
  }
});

function openDetail(id) {
  var msg = state.allMessages.find(function (m) { return m.id === id; });
  if (!msg) return;
  var detailModal = document.getElementById('msgDetailModal');
  if (!detailModal) return;
  
  detailModal.dataset.currentId = id;
  
  var msgDetailName = document.getElementById('msgDetailName');
  var msgDetailEmail = document.getElementById('msgDetailEmail');
  var msgDetailContact = document.getElementById('msgDetailContact');
  var msgDetailDate = document.getElementById('msgDetailDate');
  var msgDetailText = document.getElementById('msgDetailText');
  
  if (msgDetailName) msgDetailName.textContent = msg.name || 'Unknown';
  if (msgDetailEmail) msgDetailEmail.innerHTML = '<i data-lucide="mail" style="width:13px;height:13px;"></i> ' + escapeHtml(msg.email || 'N/A');
  if (msgDetailContact) msgDetailContact.innerHTML = '<i data-lucide="phone" style="width:13px;height:13px;"></i> ' + escapeHtml(msg.contact || 'N/A');
  if (msgDetailDate) msgDetailDate.textContent = formatMsgDate(msg.createdAt);
  if (msgDetailText) msgDetailText.textContent = msg.message || 'No message content.';

  var toggleText = detailModal.querySelector('.toggle-read-text');
  var toggleIcon = detailModal.querySelector('#msgDetailToggleRead [data-lucide]');
  if (msg.read === false) { if(toggleText) toggleText.textContent = 'Mark Read'; if(toggleIcon) toggleIcon.setAttribute('data-lucide', 'eye'); }
  else { if(toggleText) toggleText.textContent = 'Mark Unread'; if(toggleIcon) toggleIcon.setAttribute('data-lucide', 'eye-off'); }
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [detailModal] });

  var callLink = document.getElementById('msgDetailCall');
  var waLink = document.getElementById('msgDetailReplyWA');
  var rawPhone = (msg.contact || '').trim();
  var digits = rawPhone.replace(/\D/g, '');
  var cleanPhone = digits;
  if (cleanPhone.startsWith('0') && cleanPhone.length >= 10) cleanPhone = '256' + cleanPhone.substring(1);
  if (digits.length >= 7 && cleanPhone.length >= 10) {
    if(callLink) { callLink.href = 'tel:+' + cleanPhone; callLink.style.display = 'inline-flex'; }
    if (cleanPhone.length >= 12 && waLink) {
      waLink.href = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent('Hello ' + (msg.name || '') + ', regarding your message on Afro Gallero.');
      waLink.style.display = 'inline-flex';
    } else if(waLink) { waLink.href = '#'; waLink.style.display = 'none'; }
  } else { if(callLink) { callLink.href = '#'; callLink.style.display = 'none'; } if(waLink) { waLink.href = '#'; waLink.style.display = 'none'; } }

  var emailLink = document.getElementById('msgDetailReplyEmail');
  var rawEmail = (msg.email || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    if(emailLink) {
      emailLink.href = 'mailto:' + rawEmail + '?subject=' + encodeURIComponent('Re: Your message on Afro Gallero') + '&body=' + encodeURIComponent('Hi ' + (msg.name || '') + ',\n\nThank you for reaching out through Afro Gallero.\n\nBest regards');
      emailLink.style.display = 'inline-flex';
    }
  } else { if(emailLink) { emailLink.href = '#'; emailLink.style.display = 'none'; } }

  if (msg.read === false && state.userMessagesRef) {
    state.userMessagesRef.child(id + '/read').set(true).catch(function () {});
  }
  detailModal.classList.add('open');
}

window.closeDetail = function () { var m = document.getElementById('msgDetailModal'); if(m) m.classList.remove('open'); };

function openDeleteMsgModal(id) {
  var msg = state.allMessages.find(function (m) { return m.id === id; });
  var deleteModal = document.getElementById('deleteMsgModal');
  if (!deleteModal) return;
  deleteModal.dataset.currentDeleteId = id;
  var deleteMsgText = document.getElementById('deleteMsgText');
  if (deleteMsgText) deleteMsgText.textContent = 'Message from "' + (msg ? msg.name : 'Unknown') + '" will be permanently removed.';
  deleteModal.classList.add('open');
}

window.closeDeleteMsgModal = function () { var m = document.getElementById('deleteMsgModal'); if(m) m.classList.remove('open'); };

/* ==============================================
   MESSAGE DEVELOPER
   ============================================== */
document.addEventListener('DOMContentLoaded', function() {
  var devMsgForm = document.getElementById('devMsgForm');
  if (devMsgForm) {
    devMsgForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var errEl = document.getElementById('devMsgError');
      var btn = document.getElementById('devMsgSubmitBtn');
      var badge = document.getElementById('devMsgSentBadge');
      if (!errEl) return;
      errEl.classList.add('hidden');
      var name = document.getElementById('devMsgName').value.trim();
      var email = document.getElementById('devMsgEmail').value.trim();
      var text = document.getElementById('devMsgText').value.trim();
      var errors = [];
      if (!name) errors.push('Full name is required.');
      if (!email) errors.push('Email is required.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Enter a valid email.');
      if (!text) errors.push('Message is required.');
      if (errors.length > 0) { errEl.textContent = errors[0]; errEl.classList.remove('hidden'); return; }
      if (!state.userDevMsgRef) { errEl.textContent = 'You must be signed in.'; errEl.classList.remove('hidden'); return; }

      setLoading(btn, true);
      try {
        await state.userDevMsgRef.push().set({
          name: name, email: email, message: text, createdAt: Date.now(),
          date: new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
        devMsgForm.reset();
        if (state.userProfile) {
          var devName = document.getElementById('devMsgName');
          var devEmail = document.getElementById('devMsgEmail');
          var fullName = ((state.userProfile.firstName || '') + ' ' + (state.userProfile.secondName || '')).trim();
          if (fullName && devName) devName.value = fullName;
          if (auth.currentUser && auth.currentUser.email && devEmail) devEmail.value = auth.currentUser.email;
        }
        if (badge) badge.classList.remove('hidden');
        showToast('Message sent to developer!', 'success');
        setTimeout(function () { if (badge) badge.classList.add('hidden'); }, 3000);
      } catch (err) {
        errEl.textContent = 'Failed to send. Try again.';
        errEl.classList.remove('hidden');
        showToast('Failed to send message.', 'error');
      } finally { setLoading(btn, false); }
    });
  }
});

/* ==============================================
   ORDERS
   ============================================== */
function attachOrdersListener() {
  if (state.listenersAttached.orders || !state.userOrdersRef) return;
  state.listenersAttached.orders = true;

  state.userOrdersRef.on('value', function (snap) {
    var d = snap.val();
    state.allOrders = d ? Object.keys(d).map(function (k) { return Object.assign({ id: k }, d[k]); }) : [];
    state.allOrders.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    updateOrderStats();
    applyOrderFilter();
  }, function (err) {
    console.error('Orders error:', err);
    showToast('Failed to load orders', 'error');
  });
}

function updateOrderStats() {
  var el = function (id) { return document.getElementById(id); };
  var o = state.allOrders;
  if (el('stTotal')) el('stTotal').textContent = fmtNum(o.length);
  if (el('stPending')) el('stPending').textContent = fmtNum(o.filter(function (x) { return x.status === 'pending'; }).length);
  if (el('stContacted')) el('stContacted').textContent = fmtNum(o.filter(function (x) { return x.status === 'contacted'; }).length);
  if (el('stDone')) el('stDone').textContent = fmtNum(o.filter(function (x) { return x.status === 'completed'; }).length);
}

function applyOrderFilter() {
  var searchEl = document.getElementById('odSearch');
  var q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  state.filteredOrders = state.allOrders.filter(function (o) {
    if (state.curOrderFilter !== 'all' && o.status !== state.curOrderFilter) return false;
    if (!q) return true;
    return (o.clientName || '').toLowerCase().indexOf(q) !== -1 ||
           (o.clientEmail || '').toLowerCase().indexOf(q) !== -1 ||
           (o.clientPhone || '').toLowerCase().indexOf(q) !== -1 ||
           (o.artworkTitle || '').toLowerCase().indexOf(q) !== -1;
  });
  state.filteredOrders.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  renderOrdersGrid();
  updateOrderFilterCounts();
}

function updateOrderFilterCounts() {
  var tabs = document.querySelectorAll('.order-ftab');
  tabs.forEach(function (tab) {
    var f = tab.dataset.f;
    var count = f === 'all' ? state.allOrders.length : state.allOrders.filter(function (o) { return o.status === f; }).length;
    var existingDot = tab.querySelector('.count-dot');
    if (existingDot) existingDot.remove();
    if (count > 0) {
      var dot = document.createElement('span');
      dot.className = 'count-dot';
      dot.style.background = f === 'pending' ? 'var(--accent)' : f === 'contacted' ? '#3b82f6' : f === 'completed' ? '#22c55e' : 'var(--muted)';
      tab.appendChild(dot);
    }
  });
}

function orderStatusDotCls(s) { return s === 'completed' ? 's-completed' : s === 'contacted' ? 's-contacted' : 's-pending'; }
function orderStatusBadgeCls(s) { return s === 'completed' ? 'bd' : s === 'contacted' ? 'bc' : 'bp'; }

function renderOrdersGrid() {
  var grid = document.getElementById('odGrid');
  var empty = document.getElementById('odEmpty');
  if (!grid) return;
  if (!state.filteredOrders.length) { grid.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
  if (empty) empty.classList.add('hidden');

  var fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Crect fill='%23ddd' width='72' height='72'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' fill='%23999' font-size='12'%3ENo img%3C/text%3E%3C/svg%3E";

  grid.innerHTML = state.filteredOrders.map(function (o) {
    var isNew = o.viewed === false;
    var st = o.status || 'pending';
    var stLabel = st.charAt(0).toUpperCase() + st.slice(1);
    return '<div class="order-card' + (isNew ? ' is-new' : '') + '" data-oid="' + o.id + '">' +
      '<div class="oc-top">' +
        '<img src="' + escapeHtml(o.artworkImage || '') + '" alt="" class="oc-img" loading="lazy" onerror="this.src=\'' + fallback + '\'">' +
        '<div class="oc-info">' +
          '<p class="oc-name">' + escapeHtml(o.clientName || 'Unknown') + '</p>' +
          '<p class="oc-art">' + escapeHtml(o.artworkTitle || 'Artwork') + '</p>' +
          '<div class="oc-row">' +
            '<span class="oc-price">' + formatPrice(o.artworkPrice, o.artworkCurrency) + '</span>' +
            '<span class="oc-status ' + orderStatusDotCls(st) + '"><span class="dot"></span>' + stLabel + '</span>' +
            '<span class="oc-date">' + formatRelativeDate(o.createdAt) + '</span>' +
          '</div></div></div>' +
      '<div class="oc-bottom">' +
        '<div class="oc-contacts">' +
          '<span><i data-lucide="mail" style="width:13px;height:13px;"></i> ' + escapeHtml(o.clientEmail || 'No email') + '</span>' +
          '<span><i data-lucide="phone" style="width:13px;height:13px;"></i> ' + escapeHtml(o.clientPhone || 'No phone') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:.25rem;" class="oc-actions">' +
          (st === 'pending' ? '<button class="btn btn-outline btn-sm jOrdCont" data-oid="' + o.id + '" title="Mark Contacted" style="flex:1;min-width:0;"><i data-lucide="user-check" style="width:13px;height:13px;"></i></button>' : '') +
          (st === 'contacted' ? '<button class="btn btn-outline btn-sm jOrdDone" data-oid="' + o.id + '" title="Mark Done" style="flex:1;min-width:0;"><i data-lucide="check-circle" style="width:13px;height:13px;"></i></button>' : '') +
          '<button class="btn-icon jOrdDel" data-oid="' + o.id + '" title="Delete" style="color:var(--danger);border-color:rgba(192,57,43,0.3);flex-shrink:0;"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>' +
        '</div></div></div>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [grid] });
}

document.addEventListener('DOMContentLoaded', function() {
  var odGrid = document.getElementById('odGrid');
  if (odGrid) {
    odGrid.addEventListener('click', function (e) {
      var card = e.target.closest('.order-card');
      if (card && !e.target.closest('.jOrdCont') && !e.target.closest('.jOrdDone') && !e.target.closest('.jOrdDel')) {
        openOrderDetail(card.dataset.oid);
      }
      var contBtn = e.target.closest('.jOrdCont');
      if (contBtn && state.userOrdersRef) {
        e.stopPropagation();
        state.userOrdersRef.child(contBtn.dataset.oid + '/status').set('contacted')
          .then(function () { showToast('Marked as contacted', 'success'); })
          .catch(function () { showToast('Failed', 'error'); });
      }
      var doneBtn = e.target.closest('.jOrdDone');
      if (doneBtn && state.userOrdersRef) {
        e.stopPropagation();
        state.userOrdersRef.child(doneBtn.dataset.oid + '/status').set('completed')
          .then(function () { showToast('Marked as done', 'success'); })
          .catch(function () { showToast('Failed', 'error'); });
      }
      var delBtn = e.target.closest('.jOrdDel');
      if (delBtn) { e.stopPropagation(); openDeleteOrderModal(delBtn.dataset.oid); }
    });
  }

  var odSearch = document.getElementById('odSearch');
  if (odSearch) {
    odSearch.addEventListener('input', debounce(function () { applyOrderFilter(); }, 300));
  }

  var orderFilterTabs = document.getElementById('orderFilterTabs');
  if (orderFilterTabs) {
    orderFilterTabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.order-ftab');
      if (!tab) return;
      document.querySelectorAll('.order-ftab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      state.curOrderFilter = tab.dataset.f;
      applyOrderFilter();
    });
  }

  var odClose = document.getElementById('odClose');
  if (odClose) odClose.addEventListener('click', closeOrderDetail);
  
  var orderDetailModal = document.getElementById('orderDetailModal');
  if (orderDetailModal) {
    orderDetailModal.addEventListener('click', function (e) { if (e.target === this) closeOrderDetail(); });
  }

  var odMarkContacted = document.getElementById('odMarkContacted');
  if (odMarkContacted) {
    odMarkContacted.addEventListener('click', function () {
      if (!state.orderDetailId || !state.userOrdersRef) return;
      state.userOrdersRef.child(state.orderDetailId + '/status').set('contacted').then(function () { closeOrderDetail(); showToast('Marked as contacted', 'success'); }).catch(function () { showToast('Failed', 'error'); });
    });
  }

  var odMarkDone = document.getElementById('odMarkDone');
  if (odMarkDone) {
    odMarkDone.addEventListener('click', function () {
      if (!state.orderDetailId || !state.userOrdersRef) return;
      state.userOrdersRef.child(state.orderDetailId + '/status').set('completed').then(function () { closeOrderDetail(); showToast('Marked as done', 'success'); }).catch(function () { showToast('Failed', 'error'); });
    });
  }

  var odDetailDel = document.getElementById('odDetailDel');
  if (odDetailDel) {
    odDetailDel.addEventListener('click', function () { if (state.orderDetailId) openDeleteOrderModal(state.orderDetailId); });
  }

  var delOrderCancel = document.getElementById('delOrderCancel');
  if (delOrderCancel) delOrderCancel.addEventListener('click', closeDeleteOrderModal);
  
  var deleteOrderModal = document.getElementById('deleteOrderModal');
  if (deleteOrderModal) {
    deleteOrderModal.addEventListener('click', function (e) { if (e.target === this) closeDeleteOrderModal(); });
  }

  var delOrderConfirm = document.getElementById('delOrderConfirm');
  if (delOrderConfirm) {
    delOrderConfirm.addEventListener('click', async function () {
      if (!state.orderDeleteId || !state.userOrdersRef) return;
      var btn = this; setLoading(btn, true);
      try { await state.userOrdersRef.child(state.orderDeleteId).remove(); closeDeleteOrderModal(); closeOrderDetail(); showToast('Order deleted', 'success'); }
      catch (e) { showToast('Delete failed.', 'error'); }
      finally { setLoading(btn, false); }
    });
  }
});

function openOrderDetail(id) {
  var o = state.allOrders.find(function (x) { return x.id === id; });
  if (!o) return;
  state.orderDetailId = id;
  if (o.viewed === false && state.userOrdersRef) {
    state.userOrdersRef.child(id + '/viewed').set(true).catch(function () {});
  }
  var modal = document.getElementById('orderDetailModal');
  if (!modal) return;
  
  var odName = document.getElementById('odName');
  var odEmail = document.getElementById('odEmail');
  var odPhone = document.getElementById('odPhone');
  var odDate = document.getElementById('odDate');
  var artImg = document.getElementById('odArtImg');
  var odArtTitle = document.getElementById('odArtTitle');
  var odArtPrice = document.getElementById('odArtPrice');
  var odArtCat = document.getElementById('odArtCat');
  var odMsg = document.getElementById('odMsg');
  
  if (odName) odName.textContent = o.clientName || 'Unknown';
  if (odEmail) odEmail.innerHTML = '<i data-lucide="mail" style="width:14px;height:14px;"></i> ' + escapeHtml(o.clientEmail || 'N/A');
  if (odPhone) odPhone.innerHTML = '<i data-lucide="phone" style="width:14px;height:14px;"></i> ' + escapeHtml(o.clientPhone || 'N/A');
  if (odDate) odDate.textContent = formatFullDate(o.createdAt);
  if (artImg) {
    artImg.src = o.artworkImage || '';
    artImg.onerror = function () { this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' fill='%23999' font-size='14'%3ENo img%3C/text%3E%3C/svg%3E"; };
  }
  if (odArtTitle) odArtTitle.textContent = o.artworkTitle || 'Artwork';
  if (odArtPrice) odArtPrice.textContent = formatPrice(o.artworkPrice, o.artworkCurrency);
  if (odArtCat) odArtCat.textContent = o.artworkCategory || '';
  if (odMsg) odMsg.textContent = o.message || 'No message from client.';
  var st = o.status || 'pending';
  var badge = document.getElementById('odStatus');
  if (badge) {
    badge.textContent = st.charAt(0).toUpperCase() + st.slice(1);
    badge.className = 'order-det-badge ' + orderStatusBadgeCls(st);
  }
  var markCont = document.getElementById('odMarkContacted');
  var markDone = document.getElementById('odMarkDone');
  if (markCont) markCont.style.display = st === 'pending' ? 'inline-flex' : 'none';
  if (markDone) markDone.style.display = st === 'contacted' ? 'inline-flex' : 'none';
  var rawPhone = (o.clientPhone || '').trim();
  var digits = rawPhone.replace(/\D/g, '');
  var cleanPhone = digits;
  if (cleanPhone.startsWith('0') && cleanPhone.length >= 10) cleanPhone = '256' + cleanPhone.substring(1);
  var callLink = document.getElementById('odCall');
  var waLink = document.getElementById('odWa');
  if (digits.length >= 7 && cleanPhone.length >= 10) {
    if(callLink) { callLink.href = 'tel:+' + cleanPhone; callLink.style.display = 'inline-flex'; }
    if (cleanPhone.length >= 12 && waLink) { waLink.href = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent('Hello ' + (o.clientName || '') + ', regarding your interest in "' + (o.artworkTitle || '') + '" on Afro Gallero.'); waLink.style.display = 'inline-flex'; }
    else if(waLink) { waLink.style.display = 'none'; }
  } else { if(callLink) callLink.style.display = 'none'; if(waLink) waLink.style.display = 'none'; }
  var emlLink = document.getElementById('odEml');
  var rawEmail = (o.clientEmail || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) && emlLink) {
    emlLink.href = 'mailto:' + rawEmail + '?subject=' + encodeURIComponent('Re: Your interest in "' + (o.artworkTitle || '') + '" — Afro Gallero') + '&body=' + encodeURIComponent('Hi ' + (o.clientName || '') + ',\n\nThank you for your interest in "' + (o.artworkTitle || '') + '" on Afro Gallero.\n\n' + (o.message ? 'Your message:\n"' + o.message.substring(0, 200) + '"\n\n' : '') + 'Best regards');
    emlLink.style.display = 'inline-flex';
  } else if(emlLink) { emlLink.style.display = 'none'; }
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [modal] });
  modal.classList.add('open');
}

function closeOrderDetail() { var m = document.getElementById('orderDetailModal'); if (m) m.classList.remove('open'); state.orderDetailId = null; }

function openDeleteOrderModal(id) {
  var o = state.allOrders.find(function (x) { return x.id === id; });
  state.orderDeleteId = id;
  var textEl = document.getElementById('delOrderText');
  if (textEl) textEl.textContent = 'Order from "' + (o ? o.clientName : 'Unknown') + '" will be permanently removed.';
  var modal = document.getElementById('deleteOrderModal');
  if (modal) modal.classList.add('open');
}

function closeDeleteOrderModal() { var m = document.getElementById('deleteOrderModal'); if (m) m.classList.remove('open'); state.orderDeleteId = null; }

/* ==============================================
   PUBLIC APIs
   ============================================== */
window.trackPageView = function (ownerId) {
  if (!ownerId) return Promise.resolve({ success: false });
  var today = new Date().toISOString().split('T')[0];
  var analyticsRef = db.ref('user_information/' + ownerId + '/analytics');
  return analyticsRef.transaction(function (current) {
    if (!current) { current = { totalViews: 0, totalVisitors: 0, todayViews: 0, todayVisitors: 0, activeVisitors: 0, lastDate: today }; }
    if (current.lastDate !== today) { current.todayViews = 0; current.todayVisitors = 0; current.lastDate = today; }
    current.totalViews = (current.totalViews || 0) + 1;
    current.todayViews = (current.todayViews || 0) + 1;
    current.totalVisitors = (current.totalVisitors || 0) + 1;
    current.todayVisitors = (current.todayVisitors || 0) + 1;
    return current;
  }).then(function () { return { success: true }; }).catch(function (e) { return { success: false, error: e.message }; });
};

window.trackArtworkView = function (ownerId, artworkId) {
  if (!ownerId || !artworkId) return Promise.resolve({ success: false });
  var updates = {};
  updates['analytics/totalViews'] = firebase.database.ServerValue.increment(1);
  updates['analytics/todayViews'] = firebase.database.ServerValue.increment(1);
  updates['artworks/' + artworkId + '/views'] = firebase.database.ServerValue.increment(1);
  return db.ref('user_information/' + ownerId).update(updates).then(function () { return { success: true }; }).catch(function (e) { return { success: false, error: e.message }; });
};

window.getGalleryTheme = function (ownerId) {
  if (!ownerId) return Promise.resolve(null);
  return db.ref('user_information/' + ownerId + '/galleryTheme').once('value').then(function (snap) { return snap.val(); }).catch(function () { return null; });
};

window.submitArtworkOrder = function (artwork, client) {
  var ownerUid = artwork.ownerId;
  if (!ownerUid) return Promise.resolve({ success: false, error: 'No owner specified in artwork data.' });
  return db.ref('user_information/' + ownerUid + '/orders').push().set({
    clientName: client.clientName || 'Unknown', clientEmail: client.clientEmail || '', clientPhone: client.clientPhone || '', message: client.message || '',
    artworkTitle: artwork.artworkTitle || '', artworkImage: artwork.artworkImage || '', artworkPrice: artwork.artworkPrice || 0,
    artworkCurrency: artwork.artworkCurrency || 'UGX', artworkCategory: artwork.artworkCategory || '', artworkId: artwork.artworkId || '',
    status: 'pending', viewed: false, createdAt: Date.now()
  }).then(function () { return { success: true }; }).catch(function (e) { return { success: false, error: e.message }; });
};

window.submitContactMessage = function (ownerId, messageData) {
  if (!ownerId) return Promise.resolve({ success: false, error: 'No owner specified.' });
  return db.ref('user_information/' + ownerId + '/messages').push().set({
    name: messageData.name || 'Unknown', email: messageData.email || '',
    contact: messageData.contact || 'Not provided', message: messageData.message || '',
    read: false, createdAt: Date.now()
  }).then(function () { return { success: true }; }).catch(function (e) { return { success: false, error: e.message }; });
};

window.getAboutData = function (ownerId) {
  if (!ownerId) return Promise.resolve(null);
  return db.ref('user_information/' + ownerId + '/about').once('value').then(function (snap) { return snap.val(); }).catch(function () { return null; });
};

window.getArtworks = function (ownerId) {
  if (!ownerId) return Promise.resolve([]);
  return db.ref('user_information/' + ownerId + '/artworks').once('value').then(function (snap) {
    var d = snap.val();
    return d ? Object.entries(d).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
  }).catch(function () { return []; });
};

/* ==============================================
   ABOUT & PROFILE SECTION
   ============================================== */
var aboutLoaded = false;
window.initAboutSection = function () {
  if (!state.userAboutRef || aboutLoaded) return;
  aboutLoaded = true;
  loadAboutData();
};

function loadAboutData() {
  if (!state.userAboutRef) return;
  state.userAboutRef.once('value').then(function (snap) {
    var data = snap.val();
    if (!data) return;
    if (data.photo) {
      var aboutPhotoUrl = document.getElementById('aboutPhotoUrl');
      var aboutPreviewImg = document.getElementById('aboutPreviewImg');
      var aboutUploadPlaceholder = document.getElementById('aboutUploadPlaceholder');
      var aboutRemoveImgBtn = document.getElementById('aboutRemoveImgBtn');
      if (aboutPhotoUrl) aboutPhotoUrl.value = data.photo;
      if (aboutPreviewImg) { aboutPreviewImg.src = data.photo; aboutPreviewImg.style.display = 'block'; }
      if (aboutUploadPlaceholder) aboutUploadPlaceholder.style.display = 'none';
      if (aboutRemoveImgBtn) aboutRemoveImgBtn.classList.remove('hidden');
    }
    var aboutArtistName = document.getElementById('aboutArtistName');
    if (aboutArtistName) aboutArtistName.value = data.name || '';
    var aboutTagline = document.getElementById('aboutTagline');
    if (aboutTagline) aboutTagline.value = data.tagline || '';
    var aboutBio1 = document.getElementById('aboutBio1');
    if (aboutBio1) aboutBio1.value = data.bio1 || '';
    var aboutBio2 = document.getElementById('aboutBio2');
    if (aboutBio2) aboutBio2.value = data.bio2 || '';
    if (data.socials) {
      var aboutInstagram = document.getElementById('aboutInstagram');
      if (aboutInstagram) aboutInstagram.value = data.socials.instagram || '';
      var aboutTwitter = document.getElementById('aboutTwitter');
      if (aboutTwitter) aboutTwitter.value = data.socials.twitter || '';
      var aboutFacebook = document.getElementById('aboutFacebook');
      if (aboutFacebook) aboutFacebook.value = data.socials.facebook || '';
      var aboutWhatsapp = document.getElementById('aboutWhatsapp');
      if (aboutWhatsapp) aboutWhatsapp.value = data.socials.whatsapp || '';
    }
  }).catch(function (err) { console.error('Load about error:', err); });
}

document.addEventListener('DOMContentLoaded', function() {
  var aboutFileInput = document.getElementById('aboutFileInput');
  if (aboutFileInput) { aboutFileInput.addEventListener('change', function (e) { var f = e.target.files[0]; if (f) handleAboutImage(f); }); }
  var aboutUploadZone = document.getElementById('aboutUploadZone');
  if (aboutUploadZone) {
    aboutUploadZone.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('drag-over'); });
    aboutUploadZone.addEventListener('dragleave', function () { this.classList.remove('drag-over'); });
    aboutUploadZone.addEventListener('drop', function (e) { e.preventDefault(); this.classList.remove('drag-over'); var f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) handleAboutImage(f); else showToast('Please drop a valid image file.', 'error'); });
  }
  var aboutRemoveImgBtn = document.getElementById('aboutRemoveImgBtn');
  if (aboutRemoveImgBtn) {
    aboutRemoveImgBtn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var aboutPhotoUrl = document.getElementById('aboutPhotoUrl');
      var aboutPreviewImg = document.getElementById('aboutPreviewImg');
      var aboutUploadPlaceholder = document.getElementById('aboutUploadPlaceholder');
      if (aboutPreviewImg) { aboutPreviewImg.style.display = 'none'; aboutPreviewImg.src = ''; }
      if (aboutUploadPlaceholder) aboutUploadPlaceholder.style.display = 'flex'; 
      this.classList.add('hidden'); 
      if (aboutPhotoUrl) aboutPhotoUrl.value = '';
    });
  }
  var aboutForm = document.getElementById('aboutForm');
  if (aboutForm) {
    aboutForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var aboutSaveError = document.getElementById('aboutSaveError');
      var aboutSaveBtn = document.getElementById('aboutSaveBtn');
      if (!aboutSaveError) return;
      aboutSaveError.classList.add('hidden');
      var name = document.getElementById('aboutArtistName').value.trim();
      var tagline = document.getElementById('aboutTagline').value.trim();
      var bio1 = document.getElementById('aboutBio1').value.trim();
      var bio2 = document.getElementById('aboutBio2').value.trim();
      var photo = document.getElementById('aboutPhotoUrl').value.trim();
      var instagram = document.getElementById('aboutInstagram').value.trim();
      var twitter = document.getElementById('aboutTwitter').value.trim();
      var facebook = document.getElementById('aboutFacebook').value.trim();
      var whatsapp = document.getElementById('aboutWhatsapp').value.trim();
      if (!name) { aboutSaveError.textContent = 'Artist name is required.'; aboutSaveError.classList.remove('hidden'); return; }
      if (!state.userAboutRef || !state.userInfoRef) { aboutSaveError.textContent = 'You must be signed in.'; aboutSaveError.classList.remove('hidden'); return; }
      var socials = {};
      if (instagram) socials.instagram = instagram;
      if (twitter) socials.twitter = twitter;
      if (facebook) socials.facebook = facebook;
      if (whatsapp) socials.whatsapp = whatsapp;
      var aboutData = { name: name, tagline: tagline, bio1: bio1, bio2: bio2, photo: photo, socials: socials, updatedAt: Date.now() };
      setLoading(aboutSaveBtn, true);
      try {
        await state.userAboutRef.set(aboutData);
        var nameParts = name.trim().split(/\s+/);
        var profileUpdates = {};
        if (nameParts.length >= 2) { profileUpdates.firstName = nameParts[0]; profileUpdates.secondName = nameParts.slice(1).join(' '); }
        else { profileUpdates.firstName = name; profileUpdates.secondName = ''; }
        await state.userInfoRef.update(profileUpdates);
        if (state.userProfile) { state.userProfile.firstName = profileUpdates.firstName; state.userProfile.secondName = profileUpdates.secondName || ''; }
        var nameEl = document.getElementById('adminUserName');
        if (nameEl) nameEl.textContent = name;
        var artistInput = document.getElementById('artArtistName');
        if (artistInput && !state.editMode) artistInput.value = name;
        var devName = document.getElementById('devMsgName');
        if (devName) devName.value = name;
        showToast('Profile & about page saved!', 'success');
      } catch (err) {
        aboutSaveError.textContent = 'Save failed: ' + err.message;
        aboutSaveError.classList.remove('hidden');
        showToast('Failed to save profile.', 'error');
      } finally { setLoading(aboutSaveBtn, false); }
    });
  }
});

async function handleAboutImage(file) {
  var aboutPhotoUrl = document.getElementById('aboutPhotoUrl');
  var aboutPreviewImg = document.getElementById('aboutPreviewImg');
  var aboutUploadPlaceholder = document.getElementById('aboutUploadPlaceholder');
  var aboutRemoveImgBtn = document.getElementById('aboutRemoveImgBtn');
  var aboutUploadProgress = document.getElementById('aboutUploadProgress');
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB.', 'error'); return; }
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { showToast('Only JPG, PNG, WebP, and GIF are allowed.', 'error'); return; }
  var reader = new FileReader();
  reader.onload = function (e) { if (aboutPreviewImg) { aboutPreviewImg.src = e.target.result; aboutPreviewImg.style.display = 'block'; } if (aboutUploadPlaceholder) aboutUploadPlaceholder.style.display = 'none'; if (aboutRemoveImgBtn) aboutRemoveImgBtn.classList.remove('hidden'); };
  reader.readAsDataURL(file);
  showToast('Uploading photo...', 'info');
  if (aboutUploadProgress) aboutUploadProgress.style.width = '20%';
  try {
    var fd = new FormData(); fd.append('image', file); fd.append('key', IMGBB_KEY);
    var response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
    if (!response.ok) throw new Error('Upload failed');
    var result = await response.json();
    if (!result.success) throw new Error('ImgBB error');
    if (aboutPhotoUrl) aboutPhotoUrl.value = result.data.url;
    if (aboutUploadProgress) aboutUploadProgress.style.width = '100%';
    setTimeout(function () { if (aboutUploadProgress) aboutUploadProgress.style.width = '0%'; }, 500);
    showToast('Photo uploaded!', 'success');
  } catch (err) {
    console.error('ImgBB upload error:', err);
    if (aboutUploadProgress) aboutUploadProgress.style.width = '0%';
    showToast('Photo upload failed.', 'error');
    if (aboutPreviewImg) { aboutPreviewImg.style.display = 'none'; aboutPreviewImg.src = ''; }
    if (aboutUploadPlaceholder) aboutUploadPlaceholder.style.display = 'flex'; 
    if (aboutRemoveImgBtn) aboutRemoveImgBtn.classList.add('hidden'); 
    if (aboutPhotoUrl) aboutPhotoUrl.value = '';
  }
  var aboutFileInput = document.getElementById('aboutFileInput');
  if (aboutFileInput) aboutFileInput.value = '';
}

/* ==============================================
   ANALYTICS
   ============================================== */
(function initAnalytics() {
  var chartInstances = {};
  var COLORS = { blue: 'rgba(59,130,246,0.8)', blueL: 'rgba(59,130,246,0.15)', green: 'rgba(34,197,94,0.8)', greenL: 'rgba(34,197,94,0.15)', amber: 'rgba(245,158,11,0.8)', amberL: 'rgba(245,158,11,0.15)', purple: 'rgba(139,92,246,0.8)', purpleL: 'rgba(139,92,246,0.15)', red: 'rgba(239,68,68,0.8)', redL: 'rgba(239,68,68,0.15)', teal: 'rgba(20,184,166,0.8)', tealL: 'rgba(20,184,166,0.15)', pink: 'rgba(236,72,153,0.8)', pinkL: 'rgba(236,72,153,0.15)', gray: 'rgba(148,163,184,0.5)' };
  var palette = [COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple, COLORS.red, COLORS.teal, COLORS.pink, COLORS.gray];

  function getChartOptions(extra) {
    var muted = getCSSVar('--muted') || '#868e96'; var borderL = getCSSVar('--border-l') || '#f1f3f5';
    var card = getCSSVar('--card') || '#fff'; var fg = getCSSVar('--fg') || '#212529';
    var fgS = getCSSVar('--fg-s') || '#495057'; var border = getCSSVar('--border') || '#e1e4e8';
    var opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: muted, font: { family: "'Inter',sans-serif", size: 11 }, boxWidth: 12, padding: 10 } }, tooltip: { backgroundColor: card, titleColor: fg, bodyColor: fgS, borderColor: border, borderWidth: 1, cornerRadius: 8, padding: 10, titleFont: { family: "'Inter',sans-serif", weight: '600' }, bodyFont: { family: "'Inter',sans-serif" } } }, scales: { x: { ticks: { color: muted, font: { size: 10 } }, grid: { color: borderL } }, y: { ticks: { color: muted, font: { size: 10 } }, grid: { color: borderL } } } };
    if (extra) { if (extra.noLegend) opts.plugins.legend = { display: false }; if (extra.noScales) delete opts.scales; if (extra.cutout) opts.cutout = extra.cutout; if (extra.legendPos) opts.plugins.legend.position = extra.legendPos; }
    return opts;
  }

  function makeChart(id, config) { if (chartInstances[id]) chartInstances[id].destroy(); var ctx = document.getElementById(id); if (!ctx) return null; chartInstances[id] = new Chart(ctx, config); return chartInstances[id]; }

  function updateSummary() {
    var el = function (i) { return document.getElementById(i); };
    var a = state.userAnalytics || {};
    if (el('anTotalArt')) el('anTotalArt').textContent = fmtNum(state.allArtworks.length);
    if (el('anTotalMsgs')) el('anTotalMsgs').textContent = fmtNum(state.allMessages.length);
    if (el('anTotalViews')) el('anTotalViews').textContent = fmtNum(a.totalViews || 0);
    if (el('anTotalVisitors')) el('anTotalVisitors').textContent = fmtNum(a.totalVisitors || 0);
    if (el('tmTodayViews')) el('tmTodayViews').textContent = fmtNum(a.todayViews || 0);
    if (el('tmTodayVisitors')) el('tmTodayVisitors').textContent = fmtNum(a.todayVisitors || 0);
    if (el('tmActiveNow')) el('tmActiveNow').textContent = fmtNum(a.activeVisitors || 0);
    if (el('analyticsUpdated')) el('analyticsUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function drawCategoryChart() {
    var cats = {};
    state.allArtworks.forEach(function (a) { var c = a.category || 'Other'; cats[c] = (cats[c] || 0) + 1; });
    if (Object.keys(cats).length === 0) return;
    makeChart('chartCategory', { type: 'doughnut', data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: palette.slice(0, Object.keys(cats).length), borderWidth: 0, hoverOffset: 6 }] }, options: getChartOptions({ noScales: true, cutout: '60%', legendPos: 'bottom' }) });
  }

  function drawMessagesChart() {
    var days = [], counts = [];
    for (var i = 6; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); var key = d.toISOString().split('T')[0]; days.push(d.toLocaleDateString('en-US', { weekday: 'short' })); counts.push(state.allMessages.filter(function (m) { return m.createdAt && new Date(m.createdAt).toISOString().split('T')[0] === key; }).length); }
    makeChart('chartMessages', { type: 'line', data: { labels: days, datasets: [{ label: 'Messages', data: counts, borderColor: COLORS.green, backgroundColor: COLORS.greenL, borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: COLORS.green, pointBorderColor: getCSSVar('--card'), pointBorderWidth: 2 }] }, options: getChartOptions({ noLegend: true }) });
  }

  function drawPriceChart() {
    var ranges = { '0-500K': 0, '500K-1M': 0, '1M-3M': 0, '3M-5M': 0, '5M-10M': 0, '10M+': 0 };
    state.allArtworks.forEach(function (a) { var p = Number(a.price) || 0; var ugx = (a.currency || 'UGX') !== 'UGX' ? p * state.exchangeRate : p; if (ugx <= 500000) ranges['0-500K']++; else if (ugx <= 1000000) ranges['500K-1M']++; else if (ugx <= 3000000) ranges['1M-3M']++; else if (ugx <= 5000000) ranges['3M-5M']++; else if (ugx <= 10000000) ranges['5M-10M']++; else ranges['10M+']++; });
    makeChart('chartPrice', { type: 'bar', data: { labels: Object.keys(ranges), datasets: [{ label: 'Artworks', data: Object.values(ranges), backgroundColor: COLORS.amber, borderRadius: 6, borderSkipped: false, maxBarThickness: 40 }] }, options: getChartOptions({ noLegend: true }) });
  }

  function drawCurrencyChart() {
    var currencies = {};
    state.allArtworks.forEach(function (a) { var c = a.currency || 'UGX'; currencies[c] = (currencies[c] || 0) + 1; });
    if (Object.keys(currencies).length === 0) return;
    makeChart('chartCurrency', { type: 'doughnut', data: { labels: Object.keys(currencies), datasets: [{ data: Object.values(currencies), backgroundColor: palette.slice(0, Object.keys(currencies).length), borderWidth: 0, hoverOffset: 6 }] }, options: getChartOptions({ noScales: true, cutout: '60%', legendPos: 'bottom' }) });
  }

  function drawTrafficChart() {
    var days = [], views = [], visitors = [];
    var a = state.userAnalytics || {};
    for (var i = 6; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push(d.toLocaleDateString('en-US', { weekday: 'short' })); var seed = d.getDate() * 7 + d.getMonth() * 31; var factor = i === 0 ? 1 : (0.5 + ((seed * 9301 + 49297) % 233280) / 233280 * 0.6); views.push(Math.round((a.todayViews || 10) * factor)); visitors.push(Math.round((a.todayVisitors || 5) * factor)); }
    makeChart('chartTraffic', { type: 'bar', data: { labels: days, datasets: [{ label: 'Views', data: views, backgroundColor: COLORS.blue, borderRadius: 4, borderSkipped: false, maxBarThickness: 24 }, { label: 'Visitors', data: visitors, backgroundColor: COLORS.purple, borderRadius: 4, borderSkipped: false, maxBarThickness: 24 }] }, options: getChartOptions() });
  }

  function buildActivityFeed() {
    var feed = document.getElementById('activityFeed'); if (!feed) return;
    var events = [];
    state.allArtworks.slice(0, 8).forEach(function (a) { events.push({ type: 'art', text: '<strong>' + escapeHtml(a.title) + '</strong> uploaded', time: a.createdAt }); });
    state.allMessages.slice(0, 5).forEach(function (m) { events.push({ type: 'msg', text: 'Message from <strong>' + escapeHtml(m.name) + '</strong>', time: m.createdAt }); });
    state.allOrders.slice(0, 5).forEach(function (o) { events.push({ type: 'order', text: 'Order from <strong>' + escapeHtml(o.clientName) + '</strong>', time: o.createdAt }); });
    events.sort(function (a, b) { return (b.time || 0) - (a.time || 0); });
    if (events.length === 0) { feed.innerHTML = '<div class="activity-empty">No activity yet.</div>'; return; }
    feed.innerHTML = events.slice(0, 15).map(function (ev) {
      var iconClass = ev.type === 'art' ? 'art-icon' : ev.type === 'msg' ? 'msg-icon' : 'view-icon';
      var iconName = ev.type === 'art' ? 'image' : ev.type === 'msg' ? 'mail' : 'shopping-bag';
      var timeStr = ev.time ? formatRelativeDate(ev.time) : '';
      return '<div class="activity-item"><div class="activity-icon ' + iconClass + '"><i data-lucide="' + iconName + '" style="width:14px;height:14px;"></i></div><div class="activity-body"><p class="activity-text">' + ev.text + '</p><span class="activity-time">' + timeStr + '</span></div></div>';
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [feed] });
  }

  function drawAll() { updateSummary(); drawCategoryChart(); drawMessagesChart(); drawPriceChart(); drawCurrencyChart(); drawTrafficChart(); buildActivityFeed(); }

  window.redrawCharts = function () { if (!document.getElementById('dashboardScreen').classList.contains('hidden') && state.currentTab === 'user') { drawAll(); } };

  var themeObserver = new MutationObserver(function () { setTimeout(drawAll, 250); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();



/* ==============================================
   INIT
   ============================================== */
initTheme();
updateRateHint();

document.addEventListener('DOMContentLoaded', function() {
  // Attach dashboard tab handlers (excludes auth tabs)
  attachTabHandlers();
  
  // Initialize auth to sign-in tab
  switchAuthTab('signin');
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  var dashboardScreen = document.getElementById('dashboardScreen');
  if (dashboardScreen && !dashboardScreen.classList.contains('hidden')) {
    setTimeout(function() {
      switchTab('order');
    }, 100);
  }
});
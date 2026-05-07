/* ============================================
   FIREBASE CONFIGURATIONS
   ============================================ */
const AUTH_CONFIG = {
  apiKey: "AIzaSyC483ZOHvItMVBCe1HufHO39FyYVlNDPLU",
  authDomain: "auther-afro-gallero.firebaseapp.com",
  projectId: "auther-afro-gallero",
  storageBucket: "auther-afro-gallero.firebasestorage.app",
  messagingSenderId: "60533127446",
  appId: "1:60533127446:web:3270a06931b2405348b837",
  measurementId: "G-SHWX5D1G17"
};

const WHATSAPP_NUMBER = "256700000000";

/* ============================================
   FIREBASE APP INITIALIZATION
   ============================================ */
const FBApps = {};

function initFirebaseApp(name, config) {
  if (FBApps[name]) return FBApps[name];
  try {
    const app = firebase.initializeApp(config, name);
    FBApps[name] = { app, auth: app.auth(), db: app.database() };
  } catch (e) {
    const existing = firebase.apps.find(a => a.name === `[${name}]`);
    if (existing) FBApps[name] = { app: existing, auth: existing.auth(), db: existing.database() };
    else console.error(`Failed to init Firebase app "${name}":`, e);
  }
  return FBApps[name];
}

initFirebaseApp('auth', AUTH_CONFIG);

const auth = FBApps.auth?.auth;
const authDb = FBApps.auth?.db;

let artistAboutCache = {};
let artistAboutLoaded = false;
let artworksReady = false;

/* ============================================
   USER MENU DROPDOWN SETUP
   ============================================ */
function setupAccountDropdown() {
  const btn = document.getElementById('openAuthModalBtn');
  if (!btn) return;
  if (!btn.parentElement.classList.contains('nav-dropdown')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'nav-dropdown';
    btn.parentNode.insertBefore(wrapper, btn);
    wrapper.appendChild(btn);
  }
  if (!document.getElementById('userMenu')) {
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.id = 'userMenu';
    btn.insertAdjacentElement('afterend', menu);
  }
}

function updateAuthUI(user) {
  const btn = document.getElementById('openAuthModalBtn');
  const menu = document.getElementById('userMenu');
  if (!btn) return;
  if (user) {
    const name = user.displayName || user.email?.split('@')[0] || 'User';
    btn.title = `Logged in as ${name}`;
    if (menu) {
      menu.innerHTML = `
        <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);">
          <p style="font-weight: 600; font-size: 0.9rem; margin: 0; color: var(--text-primary);">${escapeHtml(name)}</p>
          <p style="font-size: 0.75rem; color: var(--muted); margin: 0;">${escapeHtml(user.email || '')}</p>
        </div>
        <button class="dropdown-item" id="userFavBtn"><i data-lucide="heart" style="width:16px;height:16px;"></i> Favorites</button>
        <button class="dropdown-item" id="userPortfolioBtn"><i data-lucide="folder-plus" style="width:16px;height:16px;"></i> Register Portfolio</button>
        <div style="border-top: 1px solid var(--border); margin: 0.25rem 0;"></div>
        <button class="dropdown-item" id="logoutBtn" style="color: var(--danger);"><i data-lucide="log-out" style="width:16px;height:16px;"></i> Logout</button>`;
      lucide.createIcons({ nodes: [menu] });
      document.getElementById('userFavBtn')?.addEventListener('click', () => { location.hash = 'favorites'; closeAllDropdowns(); });
      document.getElementById('userPortfolioBtn')?.addEventListener('click', () => { openPortfolioRegistration(); closeAllDropdowns(); });
      document.getElementById('logoutBtn')?.addEventListener('click', () => { auth.signOut().then(() => { showToast(t('signed_out'), 'info'); closeAllDropdowns(); }); });
    }
  } else {
    btn.title = 'Sign In';
    if (menu) menu.innerHTML = '';
  }
}

/* ============================================
   GLOBAL STATE & GLOBALIZATION
   ============================================ */
let allArtworks = [];
let allCategories = [];

const AppState = {
  baseCurrency: 'UGX',
  currentCurrency: localStorage.getItem('artCurrency') || 'UGX',
  currentLanguage: localStorage.getItem('artLanguage') || 'en',
  exchangeRates: { UGX: 1, USD: 0.00027, EUR: 0.00025, GBP: 0.00021, KES: 0.042 },
  symbols: { UGX: 'UGX', USD: '$', EUR: '€', GBP: '£', KES: 'KES' }
};

/* ============================================
   TRANSLATIONS
   ============================================ */
const translations = {
  en: {
    explore_gallery: "Explore Gallery", meet_artist: "Meet the Artist", featured_works: "Featured Works", latest_added: "Latest Added", all_artworks: "All Artworks", curated_selection: "Curated Selection", view_full_gallery: "View Full Gallery", artworks: "Artworks", years_creating: "Years Creating", collectors: "Collectors", exhibitions: "Exhibitions", interested_piece: "Interested in a Piece?", contact_whatsapp: "Contact via WhatsApp", contemporary_art: "Contemporary Art", favorites: "Favorites", search_placeholder: "Search artworks, artists...", about_the_artist: "About the Artist", more_by: "More by", back: "Back", order_now: "Order Now", share: "Share", add_to_favorites: "Add to Favorites", remove_from_favorites: "Remove from Favorites", biography: "Biography", location: "Location", no_description: "No description available.", no_artworks: "No artworks found.", price_on_request: "Price on request", login: "Sign In", signup: "Sign Up", register_portfolio: "Register Portfolio", logout: "Logout", welcome: "Welcome", logged_in_as: "Logged in as", loading: "Loading...", close: "Close", or: "or", account: "Account", email: "Email Address", password: "Password", your_name: "Full Name", continue_with_google: "Continue with Google", hero_title: "Afro Gallero", hero_subtitle: "Contemporary Art Gallery", viewing_room: "Viewing Room", prev: "Prev", next: "Next", inquire_now: "Inquire Now", fullscreen: "Fullscreen", exit_fullscreen: "Exit Fullscreen", live_auctions: "Live Auctions", current_bid: "Current Bid", ends_in: "Ends in", place_bid: "Place Bid", auction_ended: "Auction Ended", ending_soon: "Ending Soon", price_database: "Price Database", total_value: "Total Value", average_price: "Average Price", highest_price: "Highest Price", lowest_price: "Lowest Price", average_by_category: "Average by Category", place_order: "Place Your Order", phone_whatsapp: "Phone / WhatsApp", message_notes: "Message / Notes", submit_order: "Submit Order Request", submitting: "Submitting...", order_submitted: "Order submitted successfully!", order_failed: "Failed to submit order. Try again.", name_email_required: "Name and email are required.", full_name: "Full Name", art_specialty: "Art Specialty", brief_bio: "Brief Bio", submit_registration: "Submit Registration", portfolio_submitted: "Portfolio registration submitted!", signed_out: "Signed out successfully", login_to_favorite: "Please sign in to add favorites", search_results: "Search Results", no_results: "No results found", view: "View", artist: "Artist", category: "Category", title: "Title", price: "Price", image: "Image", action: "Action", all_categories: "All Categories", artist_bio: "Artist Bio", view_portfolio: "View Portfolio"
  },
  sw: {
    explore_gallery: "Tazama Galeria", meet_artist: "Mkutana na Msanii", featured_works: "Kazi Zilizochaguliwa", latest_added: "Zimeongezwa Hivi Karibuni", all_artworks: "Kazi Zote", curated_selection: "Uchaguzi Maalum", view_full_gallery: "Tazama Galeria Yote", artworks: "Kazi za Sanaa", years_creating: "Miaka ya Uumbaji", collectors: "Wakusanyaji", exhibitions: "Maonyesho", interested_piece: "Umevutiwa na Kipande?", contact_whatsapp: "Wasiliana kwa WhatsApp", contemporary_art: "Sanaa za Kisasa", favorites: "Vipendwa", search_placeholder: "Tafuta kazi, wasanii...", about_the_artist: "Kuhusu Msanii", more_by: "Zaidi kutoka", back: "Rudi", order_now: "Agiza Sasa", share: "Shiriki", add_to_favorites: "Ongeza kwenye Vipendwa", remove_from_favorites: "Ondoa kwenye Vipendwa", biography: "Wasifu", location: "Mahali", no_description: "Hakuna maelezo.", no_artworks: "Hakuna kazi zilizopatikana.", price_on_request: "Omba Bei", login: "Ingia", signup: "Jisajili", register_portfolio: "Sajili Portfolio", logout: "Toka", welcome: "Karibu", logged_in_as: "Umeingia kama", loading: "Inapakia...", close: "Funga", or: "au", account: "Akaunti", email: "Barua Pepe", password: "Nenosiri", your_name: "Jina Kamili", continue_with_google: "Endelea na Google", hero_title: "Afro Gallero", hero_subtitle: "Nyumba ya Sanaa ya Kisasa", viewing_room: "Chumba cha Kuangalia", prev: "Iliyotangulia", next: "Inayofuata", inquire_now: "Uliza Sasa", fullscreen: "Skrini Kamili", exit_fullscreen: "Toka Skrini Kamili", live_auctions: "Mnada wa Moja kwa moja", current_bid: "Zabuni ya Sasa", ends_in: "Inaisha ndani ya", place_bid: "Toa Zabuni", auction_ended: "Mnada Umeisha", ending_soon: "Inaisha Karibu", price_database: "Hifadhidata ya Bei", total_value: "Thamani Jumla", average_price: "Bei ya Wastani", highest_price: "Bei ya Juu", lowest_price: "Bei ya Chini", average_by_category: "Wastani kwa Kategoria", place_order: "Weka Oda", phone_whatsapp: "Simu / WhatsApp", message_notes: "Ujumbe / Vidokezo", submit_order: "Wasilisha Oda", submitting: "Inawasilisha...", order_submitted: "Oda imewasilishwa vizuri!", order_failed: "Imeshindwa kuwasilisha oda.", name_email_required: "Jina na barua pepe zinahitajika.", full_name: "Jina Kamili", art_specialty: "Taaluma ya Sanaa", brief_bio: "Wasifu Mfupi", submit_registration: "Wasilisha Usajili", portfolio_submitted: "Usajili wa portfolio umewasilishwa!", signed_out: "Umetoka kwa mafanikio", login_to_favorite: "Tafadhali ingia kuongeza vipendwa", search_results: "Matokeo ya Utafutaji", no_results: "Hakuna matokeo", view: "Tazama", artist: "Msanii", category: "Kategoria", title: "Kichwa", price: "Bei", image: "Picha", action: "Kitendo", all_categories: "Kategoria Zote", artist_bio: "Wasifu wa Msanii", view_portfolio: "Tazama Portfolio"
  },
  fr: {
    explore_gallery: "Explorer la Galerie", meet_artist: "Rencontrer l'Artiste", featured_works: "Œuvres en Vedette", latest_added: "Derniers Ajouts", all_artworks: "Toutes les Œuvres", curated_selection: "Sélection Curatée", view_full_gallery: "Voir toute la Galerie", artworks: "Œuvres d'Art", years_creating: "Années de Création", collectors: "Collectionneurs", exhibitions: "Expositions", interested_piece: "Intéressé par une Pièce ?", contact_whatsapp: "Contacter via WhatsApp", contemporary_art: "Art Contemporain", favorites: "Favoris", search_placeholder: "Rechercher œuvres, artistes...", about_the_artist: "À propos de l'Artiste", more_by: "Plus de", back: "Retour", order_now: "Commander", share: "Partager", add_to_favorites: "Ajouter aux Favoris", remove_from_favorites: "Retirer des Favoris", biography: "Biographie", location: "Lieu", no_description: "Pas de description.", no_artworks: "Aucune œuvre trouvée.", price_on_request: "Prix sur demande", login: "Connexion", signup: "Inscription", register_portfolio: "Enregistrer Portfolio", logout: "Déconnexion", welcome: "Bienvenue", logged_in_as: "Connecté en tant que", loading: "Chargement...", close: "Fermer", or: "ou", account: "Compte", email: "Adresse E-mail", password: "Mot de passe", your_name: "Nom Complet", continue_with_google: "Continuer avec Google", hero_title: "Afro Gallero", hero_subtitle: "Galerie d'Art Contemporain", viewing_room: "Espace de Visionnage", prev: "Précédent", next: "Suivant", inquire_now: "Demander", fullscreen: "Plein Écran", exit_fullscreen: "Quitter Plein Écran", live_auctions: "Enchères en Direct", current_bid: "Enchère Actuelle", ends_in: "Se termine dans", place_bid: "Placer une Enchère", auction_ended: "Enchère Terminée", ending_soon: "Se termine bientôt", price_database: "Base de Données de Prix", total_value: "Valeur Totale", average_price: "Prix Moyen", highest_price: "Prix le Plus Élevé", lowest_price: "Prix le Plus Bas", average_by_category: "Moyenne par Catégorie", place_order: "Passer Commande", phone_whatsapp: "Téléphone / WhatsApp", message_notes: "Message / Notes", submit_order: "Soumettre la Commande", submitting: "Soumission en cours...", order_submitted: "Commande soumise avec succès !", order_failed: "Échec de la soumission de la commande.", name_email_required: "Le nom et l'e-mail sont requis.", full_name: "Nom Complet", art_specialty: "Spécialité Artistique", brief_bio: "Biographie Courte", submit_registration: "Soumettre l'Inscription", portfolio_submitted: "Inscription du portfolio soumise !", signed_out: "Déconnecté avec succès", login_to_favorite: "Veuillez vous connecter pour ajouter des favoris", search_results: "Résultats de Recherche", no_results: "Aucun résultat trouvé", view: "Voir", artist: "Artiste", category: "Catégorie", title: "Titre", price: "Prix", image: "Image", action: "Action", all_categories: "Toutes les Catégories", artist_bio: "Biographie d'Artiste", view_portfolio: "Voir Portfolio"
  },
  lg: {
    explore_gallery: "Laba Olugo", meet_artist: "Laba Omusomi", featured_works: "Emirimu Egyawulidwa", latest_added: "Egyongeddwawo Emabega", all_artworks: "Emirimu Gyonna", curated_selection: "Enteekateeka Yawulidwa", view_full_gallery: "Laba Olugo Lumu", artworks: "Emirimu Gy'obulungi", years_creating: "Emyaka Gy'okuzimba", collectors: "Abakungu", exhibitions: "Emikutu", interested_piece: "Oyagala Ekipande?", contact_whatsapp: "Yogera ku WhatsApp", contemporary_art: "Ekitongole Ky'amakomu", favorites: "Eby'omugaso", search_placeholder: "Yenywe emirimu, abasomi...", about_the_artist: "Eby'okumanya ku Musomi", more_by: "Ebilala ebiva ku", back: "Dduka", order_now: "Saba Kuli", share: "Ggyawo", add_to_favorites: "Yongeza ku By'omugaso", remove_from_favorites: "Gyawo ku By'omugaso", biography: "Obulamu", location: "Awali", no_description: "Tewali mukozeso.", no_artworks: "Tewali mirimu gyalabidde.", price_on_request: "Saba endagaburo", login: "Yingira", signup: "Wandiise", register_portfolio: "Wandiise Portfolio", logout: "Kuma", welcome: "Nfunye", logged_in_as: "Yingidde ng'", loading: "Mu kutikka...", close: "Ggalawo", or: "oba", account: "Akaawuunti", email: "Emuulo ya Emeeyilo", password: "Akasumuluzo", your_name: "Erinnya Lyo", continue_with_google: "Weeyongerayo ne Google", hero_title: "Afro Gallero", hero_subtitle: "Ekifo Ky'obulungi obwa Kisona", viewing_room: "Ekisenge ky'okulabamu", prev: "Eky'edda", next: "Eky'akaddi", inquire_now: "Buuza Kati", fullscreen: "Sikulini Yonna", exit_fullscreen: "Ffulumya Sikulini Yonna", live_auctions: "Okwannyonnyola mu Kusebanya", current_bid: "Akalina ka Ssaawa", ends_in: "Kimala mu", place_bid: "Ssebanya", auction_ended: "Okusebanya Kumaze", ending_soon: "Kimala mangu", price_database: "Akatabo ka Bbeeyi", total_value: "Omugaso Ogwonna", average_price: "Bbeeyi ya Wakati", highest_price: "Bbeeyi ya Waggulu", lowest_price: "Bbeeyi ya Wansi", average_by_category: "Wakati mu Kibinja", place_order: "Teeka Odde", phone_whatsapp: "Yogera / WhatsApp", message_notes: "Obubaka / Okuyingiza", submit_order: "Wandiisa Odde", submitting: "Mu kwandiisa...", order_submitted: "Odde ewandiisidwa bulungi!", order_failed: "Kulemereddwa okuwandiisa odde.", name_email_required: "Erinnya n'emuulo ya emeeyilo zetaagisa.", full_name: "Erinnya Lyonna", art_specialty: "Obukugu mu Ssona", brief_bio: "Obulamu Obunywevu", submit_registration: "Wandiisa Okuyingizibwa", portfolio_submitted: "Okuyingizibwa kwa Portfolio kwawandiisidwa!", signed_out: "Avuddeyo bulungi", login_to_favorite: "Mpora omuyingire mu omutwe gwo okugatta eby'omugaso", search_results: "Ebyavaamu okunonya", no_results: "Tewali byavaamu", view: "Laba", artist: "Omusomi", category: "Ekibinja", title: "Omutwe", price: "Bbeeyi", image: "Ekifaananyi", action: "Ekikolwa", all_categories: "Ebibinja Byonna", artist_bio: "Obulamu bwa Musomi", view_portfolio: "Laba Portfolio"
  }
};

/* ============================================
   CORE UTILITIES
   ============================================ */
function escapeHtml(str) { if (!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function debounce(fn, delay) { let timer; return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); }; }
function getArtworkImages(artwork) { if (Array.isArray(artwork.images) && artwork.images.length > 0) return artwork.images.filter(url => url && url.startsWith('http')); if (artwork.image && artwork.image.startsWith('http')) return [artwork.image]; return []; }
function formatPrice(amount, fromCurrency) { const from = fromCurrency || 'UGX'; const to = AppState.currentCurrency; const fromRate = AppState.exchangeRates[from] || 1; const toRate = AppState.exchangeRates[to] || 1; if (isNaN(amount)) return `${AppState.symbols[to]} 0`; const converted = amount * (toRate / fromRate); const symbol = AppState.symbols[to]; const showDecimals = ['USD', 'EUR', 'GBP'].includes(to); return `${symbol} ${converted.toLocaleString('en-US', { minimumFractionDigits: showDecimals ? 2 : 0, maximumFractionDigits: showDecimals ? 2 : 0 })}`; }
function t(key) { const lang = translations[AppState.currentLanguage] || translations.en; return lang[key] || translations.en[key] || key; }
function normalizeArtistName(name) { if (!name) return ''; return name.toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* ============================================
   FAVORITES SYSTEM (Firebase-backed, per-user)
   ============================================ */
function getFavorites() { try { return JSON.parse(localStorage.getItem('artFavorites') || '[]'); } catch { return []; } }
function saveFavoritesLocal(favs) { localStorage.setItem('artFavorites', JSON.stringify(favs)); }

function saveFavoritesToFirebase(uid) {
  if (!authDb || !uid) return;
  const favs = getFavorites();
  const data = {};
  favs.forEach(id => { data[id] = true; });
  authDb.ref(`users/${uid}/favorites`).set(data).catch(err => {
    console.warn('Failed to save favorites to Firebase:', err);
  });
}

function loadUserFavorites(uid) {
  if (!authDb || !uid) return Promise.resolve();
  return authDb.ref(`users/${uid}/favorites`).once('value').then(snap => {
    const data = snap.val();
    if (data && typeof data === 'object') {
      const favIds = Object.keys(data);
      saveFavoritesLocal(favIds);
    } else {
      saveFavoritesLocal([]);
    }
    updateFavBadge();
  }).catch(err => {
    console.warn('Failed to load favorites from Firebase:', err);
    saveFavoritesLocal([]);
    updateFavBadge();
  });
}

function isFavorite(id) { return getFavorites().includes(id); }

function toggleFavorite(id) {
  if (!auth || !auth.currentUser) {
    showToast(t('login_to_favorite'), 'error');
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      const loginTab = authModal.querySelector('[data-auth-tab="login"]');
      if (loginTab) loginTab.click();
    }
    return;
  }

  let favs = getFavorites();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
    showToast(t('remove_from_favorites'), 'info');
  } else {
    favs.push(id);
    showToast(t('add_to_favorites'), 'success');
  }

  saveFavoritesLocal(favs);
  saveFavoritesToFirebase(auth.currentUser.uid);

  /* Targeted DOM updates — NO full grid re-render */
  updateFavBadge();
  updateFavButtonsForId(id);
  updateDetailFavBtn(id);
  updateVRFavBtn();

  /* Only re-render the favorites page if it's active */
  if (document.getElementById('page-favorites')?.classList.contains('active')) {
    renderFavorites();
  }
}

function updateFavBadge() {
  const badge = document.getElementById('favBadge');
  if (badge) {
    badge.textContent = getFavorites().length;
    badge.classList.toggle('show', getFavorites().length > 0);
  }
}

/* Update only the heart icon on cards matching this ID — no image reload */
function updateFavButtonsForId(id) {
  const fav = isFavorite(id);
  document.querySelectorAll(`.artwork-card-fav[data-fav="${CSS.escape(id)}"]`).forEach(btn => {
    btn.classList.toggle('fav-active', fav);
    const icon = btn.querySelector('i, svg');
    if (icon) {
      icon.style.fill = fav ? 'var(--danger)' : '';
    }
  });
  /* Also update search result rows if visible */
  document.querySelectorAll(`.search-result-row[data-artwork-id="${CSS.escape(id)}"] .search-fav-btn`).forEach(btn => {
    const icon = btn.querySelector('i, svg');
    if (icon) icon.style.fill = fav ? 'var(--danger)' : '';
    btn.classList.toggle('fav-active', fav);
  });
}

/* Update ALL favorite buttons visible on page (used after login/logout sync) */
function updateAllFavButtons() {
  const favIds = new Set(getFavorites());
  document.querySelectorAll('.artwork-card-fav').forEach(btn => {
    const id = btn.dataset.fav;
    if (!id) return;
    const fav = favIds.has(id);
    btn.classList.toggle('fav-active', fav);
    const icon = btn.querySelector('i, svg');
    if (icon) icon.style.fill = fav ? 'var(--danger)' : '';
  });
  updateFavBadge();
}

/* Full grid re-render — ONLY when artwork list or filters change */
function renderGridsForActivePage() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const pageId = activePage.id;
  if (pageId === 'page-home') {
    renderHomeFeatured();
    renderHomeLatest();
    renderHomeAll();
    renderArtistProfiles();
  }
  if (pageId === 'page-gallery') renderGallery();
  if (pageId === 'page-favorites') renderFavorites();
  if (pageId === 'page-artwork-detail') {
    const moreGrid = document.getElementById('detailMoreGrid');
    if (moreGrid) {
      const artistName = moreGrid.dataset.artistName;
      if (artistName) renderMoreByArtist(artistName);
    }
  }
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
  toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" style="width:18px;height:18px;flex-shrink:0;"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 3500);
}

/* ============================================
   GLOBALIZATION & CURRENCY
   ============================================ */
async function fetchLiveRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/UGX');
    const data = await res.json();
    if (data.rates) {
      AppState.exchangeRates = { UGX: 1, USD: data.rates.USD, EUR: data.rates.EUR, GBP: data.rates.GBP, KES: data.rates.KES };
      updateAllPrices();
    }
  } catch (err) { console.warn('Could not fetch live exchange rates.'); }
}

function setCurrency(code) {
  AppState.currentCurrency = code;
  localStorage.setItem('artCurrency', code);
  document.getElementById('currSymbol').textContent = code;
  document.querySelectorAll('#currDropdown .dropdown-item').forEach(btn => btn.classList.toggle('active', btn.dataset.curr === code));
  updateAllPrices();
  closeAllDropdowns();
}

function updateAllPrices() {
  document.querySelectorAll('[data-base-price]').forEach(el => {
    const basePrice = parseInt(el.dataset.basePrice, 10);
    const baseCurrency = el.dataset.baseCurrency || 'UGX';
    if (!isNaN(basePrice)) el.textContent = formatPrice(basePrice, baseCurrency);
  });
}

function closeAllDropdowns() { document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open')); }

function setLanguage(code) {
  AppState.currentLanguage = code;
  localStorage.setItem('artLanguage', code);
  document.querySelectorAll('#langDropdown .dropdown-item').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === code));
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const translated = t(key);
    if (translated !== key) {
      const children = Array.from(el.children);
      el.textContent = translated;
      children.forEach(child => el.appendChild(child));
    }
  });
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) searchInput.placeholder = t('search_placeholder');
  const gallerySearch = document.getElementById('searchInput');
  if (gallerySearch) gallerySearch.placeholder = t('search_placeholder');
  closeAllDropdowns();
  renderGridsForActivePage();
  if (auth && auth.currentUser) updateAuthUI(auth.currentUser);
}

/* ============================================
   SEARCH SYSTEM (FIXED: Uses allArtworks directly)
   ============================================ */
let searchResultsPanel = null;

function createSearchResultsPanel() {
  if (document.getElementById('searchResultsPanel')) return;
  const panel = document.createElement('div');
  panel.id = 'searchResultsPanel';
  panel.style.cssText = `position:fixed;top:64px;left:0;right:0;z-index:999;background:var(--bg-primary,#fff);border-bottom:2px solid var(--border,#e2e8f0);box-shadow:0 8px 32px rgba(0,0,0,0.15);max-height:70vh;overflow-y:auto;display:none;`;
  document.body.appendChild(panel);
  searchResultsPanel = panel;
}

function showSearchResultsPanel() { if (searchResultsPanel) searchResultsPanel.style.display = 'block'; }
function hideSearchResultsPanel() { if (searchResultsPanel) searchResultsPanel.style.display = 'none'; }

function searchArtworks(query) {
  if (!query || query.trim().length < 2) { hideSearchResultsPanel(); return; }

  /* If artworks haven't loaded yet, show a loading state */
  if (!artworksReady) {
    if (searchResultsPanel) {
      searchResultsPanel.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--muted);">${t('loading')}</div>`;
      showSearchResultsPanel();
    }
    return;
  }

  const q = query.toLowerCase().trim();
  const filtered = allArtworks.filter(art => {
    const title = (art.title || '').toLowerCase();
    const artist = (art.artistName || '').toLowerCase();
    const category = (art.category || '').toLowerCase();
    const desc = (art.description || '').toLowerCase();
    return title.includes(q) || artist.includes(q) || category.includes(q) || desc.includes(q);
  });

  filtered.sort((a, b) => {
    const aTitle = (a.title || '').toLowerCase().includes(q) ? 0 : 1;
    const bTitle = (b.title || '').toLowerCase().includes(q) ? 0 : 1;
    if (aTitle !== bTitle) return aTitle - bTitle;
    const aArtist = (a.artistName || '').toLowerCase().includes(q) ? 0 : 1;
    const bArtist = (b.artistName || '').toLowerCase().includes(q) ? 0 : 1;
    return aArtist - bArtist;
  });

  renderSearchResultsTable(filtered, q);
}

function renderSearchResultsTable(results, query) {
  if (!searchResultsPanel) return;
  if (results.length === 0) {
    searchResultsPanel.innerHTML = `<div style="padding:2rem;text-align:center;"><i data-lucide="search-x" style="width:40px;height:40px;color:var(--muted);margin-bottom:0.5rem;"></i><p style="color:var(--muted);font-size:1rem;">${t('no_results')} "${escapeHtml(query)}"</p></div>`;
    lucide.createIcons({ nodes: [searchResultsPanel] });
    showSearchResultsPanel();
    return;
  }

  const favIds = new Set(getFavorites());

  searchResultsPanel.innerHTML = `
    <div style="padding:1rem 1.5rem 0.5rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);">
      <h3 style="font-size:1rem;font-weight:700;margin:0;">${t('search_results')} (${results.length})</h3>
      <button id="closeSearchResults" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;">
        <i data-lucide="x" style="width:18px;height:18px;"></i>
      </button>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.875rem;">
        <thead>
          <tr style="background:var(--bg-secondary);text-align:left;">
            <th style="padding:0.625rem 1rem;font-weight:600;color:var(--muted);white-space:nowrap;">${t('image')}</th>
            <th style="padding:0.625rem 1rem;font-weight:600;color:var(--muted);white-space:nowrap;">${t('title')}</th>
            <th style="padding:0.625rem 1rem;font-weight:600;color:var(--muted);white-space:nowrap;">${t('artist')}</th>
            <th style="padding:0.625rem 1rem;font-weight:600;color:var(--muted);white-space:nowrap;">${t('category')}</th>
            <th style="padding:0.625rem 1rem;font-weight:600;color:var(--muted);white-space:nowrap;">${t('price')}</th>
            <th style="padding:0.625rem 1rem;font-weight:600;color:var(--muted);white-space:nowrap;">${t('action')}</th>
          </tr>
        </thead>
        <tbody>${results.map(art => {
          const images = getArtworkImages(art);
          const mainImg = images[0] || 'https://picsum.photos/seed/placeholder/60/60.jpg';
          const isFav = favIds.has(art.id);
          return `<tr style="border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;"
            onmouseenter="this.style.background='var(--bg-secondary)'" onmouseleave="this.style.background=''"
            data-artwork-id="${escapeHtml(art.id)}" class="search-result-row">
            <td style="padding:0.5rem 1rem;">
              <img src="${escapeHtml(mainImg)}" alt="" decoding="async" style="width:48px;height:48px;object-fit:cover;border-radius:6px;background:var(--bg-secondary);">
            </td>
            <td style="padding:0.5rem 1rem;font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(art.title || 'Untitled')}</td>
            <td style="padding:0.5rem 1rem;color:var(--text-secondary);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(art.artistName || 'Unknown')}</td>
            <td style="padding:0.5rem 1rem;">
              <span style="background:var(--bg-secondary);padding:2px 8px;border-radius:9999px;font-size:0.75rem;">${escapeHtml(art.category || '—')}</span>
            </td>
            <td style="padding:0.5rem 1rem;font-weight:600;white-space:nowrap;" data-base-price="${art.price}" data-base-currency="${art.currency || 'UGX'}">${art.price ? formatPrice(art.price, art.currency) : t('price_on_request')}</td>
            <td style="padding:0.5rem 1rem;display:flex;gap:4px;">
              <button class="btn btn-primary btn-sm search-view-btn" data-artwork-id="${escapeHtml(art.id)}" style="font-size:0.75rem;padding:4px 12px;">${t('view')}</button>
              <button class="btn btn-ghost btn-sm search-fav-btn ${isFav ? 'fav-active' : ''}" data-fav-id="${escapeHtml(art.id)}" style="font-size:0.75rem;padding:4px 8px;">
                <i data-lucide="heart" style="width:14px;height:14px;${isFav ? 'fill:var(--danger);' : ''}"></i>
              </button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  lucide.createIcons({ nodes: [searchResultsPanel] });
  showSearchResultsPanel();

  document.getElementById('closeSearchResults')?.addEventListener('click', hideSearchResultsPanel);

  searchResultsPanel.querySelectorAll('.search-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideSearchResultsPanel();
      location.hash = 'artwork/' + btn.dataset.artworkId;
    });
  });

  searchResultsPanel.querySelectorAll('.search-result-row').forEach(row => {
    row.addEventListener('click', () => {
      hideSearchResultsPanel();
      location.hash = 'artwork/' + row.dataset.artworkId;
    });
  });

  searchResultsPanel.querySelectorAll('.search-fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.favId);
    });
  });
}

/* ============================================
   UI INTERACTIONS
   ============================================ */
function openMobileMenu() { document.getElementById('hamburger')?.classList.add('active'); document.getElementById('navLinks')?.classList.add('open'); document.getElementById('navOverlay')?.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeMobileMenu() { document.getElementById('hamburger')?.classList.remove('active'); document.getElementById('navLinks')?.classList.remove('open'); document.getElementById('navOverlay')?.classList.remove('open'); document.body.style.overflow = ''; }

function initUIListeners() {
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
  });
  document.getElementById('navOverlay')?.addEventListener('click', closeMobileMenu);
  document.querySelectorAll('#navLinks .nav-link').forEach(link => link.addEventListener('click', () => {
    if (document.getElementById('navLinks')?.classList.contains('open')) closeMobileMenu();
  }));
  document.getElementById('favNavBtn')?.addEventListener('click', () => location.hash = 'favorites');
  document.querySelectorAll('.nav-dropdown > .nav-icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dd = btn.closest('.nav-dropdown');
      const isOpen = dd.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) dd.classList.add('open');
    });
  });
  document.getElementById('msgNavBtn')?.addEventListener('click', () => location.hash = 'messages');
  document.querySelectorAll('[data-curr]').forEach(btn => btn.addEventListener('click', () => setCurrency(btn.dataset.curr)));
  document.addEventListener('click', (e) => {
    if (searchResultsPanel && searchResultsPanel.contains(e.target)) return;
    closeAllDropdowns();
  });
  document.getElementById('darkModeToggle')?.addEventListener('click', () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('artTheme', next);
  });
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input && input.type) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  /* Search input: searches from already-loaded allArtworks — instant, correct IDs */
  document.getElementById('globalSearchInput')?.addEventListener('input', debounce((e) => {
    const query = e.target.value.trim();
    if (query.length >= 2) {
      searchArtworks(query);
    } else {
      hideSearchResultsPanel();
    }
  }, 300));

  document.addEventListener('click', (e) => {
    const searchInput = document.getElementById('globalSearchInput');
    if (searchResultsPanel && searchResultsPanel.style.display !== 'none') {
      if (!searchResultsPanel.contains(e.target) && e.target !== searchInput) hideSearchResultsPanel();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchResultsPanel) hideSearchResultsPanel();
  });
}

function initScrollEffects() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 50);
    document.getElementById('backToTop')?.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
  document.getElementById('backToTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal:not(.revealed)').forEach(el => observer.observe(el));
}

/* ============================================
   AUTH SYSTEM (FIXED: Syncs favorites on login/logout)
   ============================================ */
function initPublicAuth() {
  const modal = document.getElementById('authModal');
  const openBtn = document.getElementById('openAuthModalBtn');
  const closeBtn = document.getElementById('closeAuthModal');
  const tabs = modal?.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginFormModal');
  const signupForm = document.getElementById('signupFormModal');
  if (!modal || !auth) return;

  const openModal = () => { modal.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };

  openBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!auth.currentUser) {
      openModal();
    } else {
      const dd = openBtn.closest('.nav-dropdown');
      if (dd) {
        const isOpen = dd.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) dd.classList.add('open');
      }
    }
  });
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  tabs?.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.authTab === 'login';
    loginForm?.classList.toggle('hidden', !isLogin);
    signupForm?.classList.toggle('hidden', isLogin);
  }));

  const googleProvider = new firebase.auth.GoogleAuthProvider();
  const handleGoogleAuth = () => {
    auth.signInWithPopup(googleProvider).then(() => {
      closeModal();
      showToast(t('welcome') + '!', 'success');
    }).catch(err => showToast(err.message, 'error'));
  };
  document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleAuth);
  document.getElementById('googleSignupBtn')?.addEventListener('click', handleGoogleAuth);

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('loginError');
    errEl?.classList.add('hidden');
    try {
      await auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPassword').value);
      closeModal();
      showToast(t('welcome') + '!', 'success');
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }
  });

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('signupError');
    errEl?.classList.add('hidden');
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPassword').value;
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      closeModal();
      showToast('Account created!', 'success');
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }
  });

  document.getElementById('registerPortfolioLink')?.addEventListener('click', (e) => {
    e.preventDefault(); closeModal(); openPortfolioRegistration();
  });

  /* Auth state change — sync favorites from Firebase */
  auth.onAuthStateChanged(async user => {
    updateAuthUI(user);
    if (user) {
      await loadUserFavorites(user.uid);
      updateAllFavButtons();
      /* If on favorites page, re-render with user's favorites */
      if (document.getElementById('page-favorites')?.classList.contains('active')) {
        renderFavorites();
      }
            /* Attach unread message listener */
      MessageInbox.attachUnreadListener();
      MessageInbox.updateMsgBadge();
    } else {
      /* Logged out — clear local favorites */
      saveFavoritesLocal([]);
      updateFavBadge();
      updateAllFavButtons();
      if (document.getElementById('page-favorites')?.classList.contains('active')) {
        renderFavorites();
      }
    }
          /* Detach unread listener on logout */
      MessageInbox.detachUnreadListener();
  });
}

/* ============================================
   PORTFOLIO REGISTRATION SHOWCASE
   ============================================ */
function openPortfolioRegistration() {
  const portfolioImages = [
    'https://ik.imagekit.io/s95tumxuk/IMG_1304.jpeg',
    'https://ik.imagekit.io/s95tumxuk/IMG_1306.jpeg',
    'https://ik.imagekit.io/s95tumxuk/IMG_1305.jpeg'
  ];
  const portfolioVideos = [
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
  ];
  const portfolioComments = [
    { text: "This portfolio completely transformed how I showcase my art. The admin page makes managing my gallery incredibly easy!", author: "Alex Rivera, Painter" },
    { text: "Having my own personal gallery website made me look so much more professional to clients. Absolutely worth it.", author: "Jordan Lee, Sculptor" }
  ];
  const portfolioPrice = "Free";

  let regModal = document.getElementById('portfolioRegModal');
  if (!regModal) {
    regModal = document.createElement('div');
    regModal.id = 'portfolioRegModal';
    regModal.className = 'modal-overlay';
    const imagesHtml = portfolioImages.map(url =>
      `<img src="${url}" alt="Portfolio Preview" decoding="async" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:var(--bg-secondary);">`
    ).join('');
    const videosHtml = portfolioVideos.map(url =>
      `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin-bottom:12px;">
        <iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
      </div>`
    ).join('');
    const commentsHtml = portfolioComments.map(c =>
      `<div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:3px solid var(--primary);">
        <p style="font-style:italic;font-size:0.85rem;margin:0 0 6px 0;opacity:0.9;">"${c.text}"</p>
        <span style="font-weight:600;font-size:0.8rem;color:var(--primary);">- ${c.author}</span>
      </div>`
    ).join('');

    regModal.innerHTML = `
      <div class="auth-modal-container" role="dialog" aria-modal="true" style="max-width:550px;max-height:85vh;overflow-y:auto;">
        <button class="modal-close" id="prClose"><i data-lucide="x" style="width:20px;height:20px;"></i></button>
        <div style="text-align:center;margin-bottom:1.5rem;">
          <i data-lucide="palette" style="width:48px;height:48px;color:var(--primary);margin-bottom:0.5rem;"></i>
          <h2 style="font-size:1.4rem;font-weight:700;margin:0;">Portfolio Account</h2>
          <p style="font-size:0.9rem;opacity:0.7;margin-top:4px;">Take your art to the next level with a dedicated platform</p>
        </div>
        <div style="margin-bottom:1.5rem;display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;">
            <i data-lucide="layout-dashboard" style="width:24px;height:24px;color:var(--primary);flex-shrink:0;"></i>
            <div><strong style="display:block;font-size:0.9rem;">Admin Dashboard</strong><span style="font-size:0.8rem;opacity:0.7;">Easily host, manage, and organize your gallery images</span></div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;">
            <i data-lucide="globe" style="width:24px;height:24px;color:var(--primary);flex-shrink:0;"></i>
            <div><strong style="display:block;font-size:0.9rem;">Personal Gallery Website</strong><span style="font-size:0.8rem;opacity:0.7;">Your own professional portfolio website to share with clients</span></div>
          </div>
        </div>
        ${portfolioImages.length > 0 ? `<div style="margin-bottom:1.5rem;"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><i data-lucide="image" style="width:16px;height:16px;"></i> Portfolio Previews</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">${imagesHtml}</div></div>` : ''}
        ${portfolioVideos.length > 0 ? `<div style="margin-bottom:1.5rem;"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><i data-lucide="play-circle" style="width:16px;height:16px;"></i> Tutorial Videos</h3>${videosHtml}</div>` : ''}
        ${portfolioComments.length > 0 ? `<div style="margin-bottom:1.5rem;"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><i data-lucide="message-circle" style="width:16px;height:16px;"></i> What Artists Say</h3>${commentsHtml}</div>` : ''}
        <div style="text-align:center;margin-bottom:1.5rem;padding:1rem;background:linear-gradient(45deg,rgba(255,255,255,0.05),transparent);border-radius:12px;border:1px solid var(--primary);">
          <p style="margin:0;font-size:0.85rem;opacity:0.8;">Get started for just</p>
          <p style="margin:4px 0 0 0;font-size:2rem;font-weight:800;color:var(--primary);">${portfolioPrice}</p>
        </div>
        <a href="/portfolio.html" class="btn btn-primary btn-full" style="text-decoration:none;text-align:center;display:block;font-weight:600;padding:12px;">
          <i data-lucide="user-plus" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i>Register Now
        </a>
      </div>`;
    document.body.appendChild(regModal);
    lucide.createIcons({ nodes: [regModal] });
    regModal.querySelector('#prClose').addEventListener('click', () => { regModal.classList.remove('open'); document.body.style.overflow = ''; });
    regModal.addEventListener('click', (e) => { if (e.target === regModal) { regModal.classList.remove('open'); document.body.style.overflow = ''; } });
  }
  regModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ============================================
   DYNAMIC PAGES & ROUTER
   ============================================ */
function ensureDynamicPagesExist() {
  if (!document.getElementById('page-artwork-detail')) {
    const sec = document.createElement('section'); sec.id = 'page-artwork-detail'; sec.className = 'page';
    document.querySelector('#page-favorites')?.after(sec);
  }
  if (!document.getElementById('page-artist-detail')) {
    const sec = document.createElement('section'); sec.id = 'page-artist-detail'; sec.className = 'page';
    document.querySelector('#page-artwork-detail')?.after(sec);
  }
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(initRevealAnimations, 150);
  hideSearchResultsPanel();
  if (page === 'home') { renderHomeFeatured(); renderHomeLatest(); renderHomeAll(); renderArtistProfiles(); }
  if (page === 'gallery') renderGallery();
  if (page === 'favorites') renderFavorites();
  if (page === 'viewing-room') loadViewingRoom();
  if (page === 'auctions') loadAuctions();
  if (page === 'price-database') loadPriceDatabase(document.getElementById('pdCurrencyFilter')?.value || 'UGX');
  if (page === 'artists') renderArtistProfiles(true);
  if (page === 'messages') MessageInbox.renderInbox();
  if (page === 'fairs-events') FairsEvents.load();
  }

function handleHash() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('artwork/')) {
    const id = hash.replace('artwork/', '');
    navigateTo('artwork-detail');
    renderArtworkDetailPage(id);
    return;
  }
  if (hash.startsWith('artist/')) {
    const name = decodeURIComponent(hash.replace('artist/', ''));
    navigateTo('artist-detail');
    renderArtistDetailPage(name);
    return;
  }
  if (hash === 'messages') {
    navigateTo('messages');
    return;
  }
  navigateTo(hash || 'home');
  }

/* ============================================
   FIREBASE: SINGLE DB DATA FETCHING FROM user_information
   ============================================ */
async function fetchFromUserInformation(pathSuffix, isObjectMapping = true) {
  let results = [];
  if (!authDb) return results;
  
  try {
    const snapshot = await authDb.ref('user_information').once('value');
    const usersData = snapshot.val();
    if (!usersData) return results;

    Object.entries(usersData).forEach(([userId, userData]) => {
      if (!userData) return;
      
      /* Navigate to the requested path within this user's data */
      let targetData = userData;
      if (pathSuffix) {
        const pathParts = pathSuffix.split('/');
        for (const part of pathParts) {
          if (targetData && typeof targetData === 'object' && !Array.isArray(targetData)) {
            targetData = targetData[part];
          } else {
            targetData = null;
            break;
          }
        }
      }
      
      if (!targetData || typeof targetData !== 'object') return;

      if (isObjectMapping) {
        Object.entries(targetData).forEach(([id, val]) => {
          if (val && typeof val === 'object') {
            results.push({ 
              id: `${userId}:${id}`, 
              ...val, 
              _source: userId /* Store userId as source for orders */
            });
          }
        });
      } else {
        Object.values(targetData).forEach(val => {
          if (val && typeof val === 'object') {
            results.push({ 
              ...val, 
              _source: userId 
            });
          }
        });
      }
    });
  } catch (err) {
    console.warn('Failed to fetch from user_information:', err);
  }
  
  return results;
}

/* ============================================
   ARTIST ABOUT DATA
   ============================================ */
function processAboutSnapshot(data, userId) {
  if (!data || typeof data !== 'object') return;

  const TEXT_FIELDS = ['bio', 'biography', 'about', 'description', 'artistBio', 'story', 'artistDescription'];

  const processArtist = (val, key) => {
    if (!val) return;

    /* Handle raw string bio: { "Artist Name": "He paints with oils..." } */
    if (typeof val === 'string') {
      if (!key) return;
      val = { name: key, bio: val };
    }

    if (typeof val !== 'object' || Array.isArray(val)) return;

    /* Use firstName + lastName if name/artistName not present */
    const name = val.name || val.artistName || val.fullName || val.displayName || 
                 (val.firstName && val.lastName ? `${val.firstName} ${val.lastName}` : val.firstName);
    if (!name) return;

    const normName = normalizeArtistName(name);
    const existing = artistAboutCache[name] || artistAboutCache[normName];

    if (existing) {
      /* Deep merge: combine all fields from every source */
      Object.entries(val).forEach(([k, v]) => {
        if (v === null || v === undefined) return;

        /* For text fields, keep whichever value is longer */
        if (TEXT_FIELDS.includes(k) && typeof v === 'string') {
          const existingVal = existing[k];
          if (!existingVal || v.length > existingVal.length) {
            existing[k] = v;
          }
          return;
        }

        /* For nested objects (socials, socialLinks, etc), merge recursively */
        if (typeof v === 'object' && !Array.isArray(v)) {
          const existingVal = existing[k];
          if (typeof existingVal === 'object' && existingVal && !Array.isArray(existingVal)) {
            existing[k] = { ...existingVal, ...v };
          } else {
            existing[k] = v;
          }
          return;
        }

        /* For everything else, fill in missing values only */
        if (existing[k] === null || existing[k] === undefined || existing[k] === '') {
          existing[k] = v;
        }
      });
      /* Store userId reference */
      existing._userId = existing._userId || userId;
      artistAboutCache[name] = existing;
      artistAboutCache[normName] = existing;
    } else {
      const newEntry = { ...val, _userId: userId };
      artistAboutCache[name] = newEntry;
      artistAboutCache[normName] = newEntry;
    }
  };

  /* Is the data itself a single artist object? */
  if (data.name || data.artistName || data.fullName || data.displayName || data.tagline || data.bio || data.biography || data.firstName) {
    processArtist(data);
  } else {
    Object.entries(data).forEach(([key, val]) => processArtist(val, key));
  }
}

function loadArtistAboutData() {
  if (artistAboutLoaded) return Promise.resolve();
  
  return new Promise((resolve) => {
    if (!authDb) { resolve(); return; }
    
    authDb.ref('user_information').once('value')
      .then(snap => {
        const usersData = snap.val();
        if (!usersData) { resolve(); return; }
        
        Object.entries(usersData).forEach(([userId, userData]) => {
          if (!userData || !userData.about) return;
          processAboutSnapshot(userData.about, userId);
        });
        artistAboutLoaded = true;
        resolve();
      })
      .catch(err => {
        console.warn('Failed to load artist about data:', err);
        artistAboutLoaded = true;
        resolve();
      });
  });
}

async function getArtistAbout(artistName) {
  if (!artistName) return null;
  if (!artistAboutLoaded) await loadArtistAboutData();
  return artistAboutCache[artistName] || artistAboutCache[normalizeArtistName(artistName)] || null;
}

/* Main Artwork Load - Merges Realtime Data from user_information */
function mergeAndSetArtworks() {
  allArtworks = [...allArtworks].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  artworksReady = true;
  buildCategories();
  initHeroSlider();
  renderGridsForActivePage();
}

function loadArtworksRealtime() {
  return new Promise((resolve) => {
    if (!authDb) { resolve(); return; }
    
    authDb.ref('user_information').on('value', (snapshot) => {
      const usersData = snapshot.val();
      allArtworks = [];
      
      if (usersData) {
        Object.entries(usersData).forEach(([userId, userData]) => {
          if (!userData || !userData.artworks) return;
          
          Object.entries(userData.artworks).forEach(([artworkId, artworkData]) => {
            if (artworkData && typeof artworkData === 'object') {
              /* Get artist name from about section or artwork data */
              const artistName = artworkData.artistName || 
                               (userData.about && (userData.about.name || userData.about.artistName || userData.about.fullName || userData.about.displayName || 
                               (userData.about.firstName && userData.about.lastName ? `${userData.about.firstName} ${userData.about.lastName}` : userData.about.firstName))) ||
                               'Unknown Artist';
              
              allArtworks.push({
                id: `${userId}:${artworkId}`,
                ...artworkData,
                artistName: artistName,
                _source: userId
              });
            }
          });
        });
      }
      
      mergeAndSetArtworks();
      resolve();
    }, (error) => {
      console.error('Error loading artworks from user_information:', error);
      mergeAndSetArtworks();
      resolve();
    });
  });
}

/* ============================================
   CATEGORIES
   ============================================ */
function buildCategories() {
  const catMap = {};
  allArtworks.forEach(a => {
    const raw = (a.category || '').trim();
    if (!raw) return;
    const normKey = raw.toLowerCase();
    if (!catMap[normKey]) catMap[normKey] = raw;
  });
  allCategories = Object.entries(catMap).sort((a, b) => a[0].localeCompare(b[0])).map(([, display]) => display);
  populateCategoryDropdowns();
}

function populateCategoryDropdowns() {
  const defaultOpt = `<option value="">${t('all_categories')}</option>`;
  const opts = allCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const fullOpts = defaultOpt + opts;
  ['homeFeaturedFilter', 'homeAllArtworksFilter', 'categoryFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = fullOpts;
    if (current) {
      el.value = current;
      if (!el.value) {
        const normCurrent = current.toLowerCase();
        for (let i = 0; i < el.options.length; i++) {
          if (el.options[i].value.toLowerCase() === normCurrent) { el.value = el.options[i].value; break; }
        }
      }
    }
  });
}

function initHeroSlider() {
  const slider = document.getElementById('heroSlider');
  if (!slider) return;
  const imageUrls = allArtworks.flatMap(a => getArtworkImages(a));
  let currentIdx = 0;
  let interval;
  clearInterval(interval);
  slider.innerHTML = '';
  if (imageUrls.length === 0) {
    slider.innerHTML = '<div class="hero-slide" style="background-image:url(\'https://picsum.photos/seed/hero-fallback/1920/1080.jpg\')"></div>';
    return;
  }
  imageUrls.slice(0, 8).forEach((url, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
    slide.style.backgroundImage = `url('${url}')`;
    slider.appendChild(slide);
  });
  const slides = slider.querySelectorAll('.hero-slide');
  if (slides.length <= 1) return;
  interval = setInterval(() => {
    slides[currentIdx].classList.remove('active');
    currentIdx = (currentIdx + 1) % slides.length;
    slides[currentIdx].classList.add('active');
  }, 5000);
}

/* ============================================
   CARD HTML GENERATOR (OPTIMIZED: decoding="async", bg placeholder)
   ============================================ */
function createArtworkCard(artwork) {
  const fav = isFavorite(artwork.id);
  const images = getArtworkImages(artwork);
  const mainImage = images[0] || 'https://picsum.photos/seed/placeholder/600/600.jpg';
  return `<article class="artwork-card reveal" data-id="${artwork.id}" tabindex="0" role="button" aria-label="View ${escapeHtml(artwork.title)}">
    <div class="artwork-card-image" style="background:var(--bg-secondary);">
      <img src="${escapeHtml(mainImage)}" alt="${escapeHtml(artwork.title)}" loading="lazy" decoding="async">
      ${images.length > 1 ? `<span class="img-count-badge"><i data-lucide="images" style="width:12px;height:12px;"></i> ${images.length}</span>` : ''}
      <button class="artwork-card-fav ${fav ? 'fav-active' : ''}" data-fav="${artwork.id}" aria-label="Favorite">
        <i data-lucide="heart" style="width:16px;height:16px;${fav ? 'fill:var(--danger);' : ''}"></i>
      </button>
      <div class="artwork-card-overlay"></div>
    </div>
    <div class="artwork-card-info">
      <span class="artwork-card-category">${escapeHtml(artwork.category || '')}</span>
      <h3 class="artwork-card-title">${escapeHtml(artwork.title)}</h3>
      <p class="artwork-card-artist">${escapeHtml(artwork.artistName || '')}</p>
      <p class="artwork-card-price" data-base-price="${artwork.price}" data-base-currency="${artwork.currency || 'UGX'}">${artwork.price ? formatPrice(artwork.price, artwork.currency) : t('price_on_request')}</p>
    </div>
  </article>`;
}

function attachCardListeners(container) {
  if (!container) return;
  container.querySelectorAll('.artwork-card').forEach(card => {
    const handler = (e) => { if (e.target.closest('.artwork-card-fav')) return; location.hash = 'artwork/' + card.dataset.id; };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(e); });
  });
  container.querySelectorAll('.artwork-card-fav').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(btn.dataset.fav); });
  });
}

function renderGrid(containerId, artworks) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  if (artworks.length === 0) {
    grid.innerHTML = `<div class="gallery-empty" style="grid-column:1/-1;"><p>${t('no_artworks')}</p></div>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  const temp = document.createElement('div');
  temp.innerHTML = artworks.map(a => createArtworkCard(a)).join('');
  while (temp.firstChild) fragment.appendChild(temp.firstChild);
  grid.innerHTML = '';
  grid.appendChild(fragment);
  lucide.createIcons({ nodes: [grid] });
  attachCardListeners(grid);
}

/* ============================================
   HOME PAGE RENDERS
   ============================================ */
function getGlobalSearch() { return document.getElementById('globalSearchInput')?.value.toLowerCase().trim() || ''; }
function getFilteredArtworks(categoryFilterId, timeLimitDays = null) {
  const search = getGlobalSearch();
  const category = document.getElementById(categoryFilterId)?.value || '';
  return allArtworks.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search) || a.category?.toLowerCase().includes(search) || a.artistName?.toLowerCase().includes(search);
    const matchCat = !category || (a.category || '').trim().toLowerCase() === category.trim().toLowerCase();
    let matchTime = true;
    if (timeLimitDays && timeLimitDays > 0) {
      const cutoff = Date.now() - (timeLimitDays * 24 * 60 * 60 * 1000);
      matchTime = (a.createdAt || 0) >= cutoff;
    }
    return matchSearch && matchCat && matchTime;
  });
}
function renderHomeFeatured() { renderGrid('homeFeaturedGrid', getFilteredArtworks('homeFeaturedFilter').slice(0, 4)); }
function renderHomeLatest() { const days = parseInt(document.getElementById('homeLatestFilter')?.value) || 30; renderGrid('homeLatestGrid', getFilteredArtworks(null, days).slice(0, 4)); }
function renderHomeAll() { renderGrid('homeAllArtworksGrid', getFilteredArtworks('homeAllArtworksFilter')); }

/* ============================================
   ARTIST PROFILES
   ============================================ */
function renderArtistProfiles(isPageView = false) {
  const gridId = isPageView ? 'artistsPageGrid' : 'homeArtistsGrid';
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const artistsMap = {};
  const processedNormNames = new Set();

  Object.entries(artistAboutCache).forEach(([, data]) => {
    if (!data || typeof data !== 'object') return;
    const name = data.name || data.artistName || data.fullName || data.displayName || 
                 (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName);
    if (!name) return;
    const normName = normalizeArtistName(name);
    if (processedNormNames.has(normName)) return;
    processedNormNames.add(normName);
    artistsMap[name] = {
      count: 0,
      image: data.image || data.photo || data.profileImage || '',
      tagline: data.tagline || data.specialty || data.category || data.medium || data.style || '',
      category: data.specialty || data.category || '',
      bio: data.bio || data.biography || data.about || data.description || '',
      location: data.location || (data.city && data.country ? `${data.city}, ${data.country}` : data.city || ''),
      phone: data.phone || data.whatsapp || '',
      email: data.email || data.emailAddress || '',
      instagram: data.instagram || (data.socials || data.socialLinks || {}).instagram || '',
      twitter: data.twitter || (data.socials || data.socialLinks || {}).twitter || '',
      website: data.website || (data.socials || data.socialLinks || {}).website || ''
    };
  });

  allArtworks.forEach(a => {
    if (!a.artistName) return;
    const normName = normalizeArtistName(a.artistName);
    let existingKey = Object.keys(artistsMap).find(k => normalizeArtistName(k) === normName);
    if (!existingKey) {
      artistsMap[a.artistName] = { count: 0, image: '', tagline: '', category: a.category || '', bio: '', location: '', phone: '', email: '', instagram: '', twitter: '', website: '' };
      existingKey = a.artistName;
    }
    artistsMap[existingKey].count++;
    if (!artistsMap[existingKey].image && getArtworkImages(a)[0]) artistsMap[existingKey].image = getArtworkImages(a)[0];
  });

  const artists = Object.entries(artistsMap);
  if (artists.length === 0) {
    grid.innerHTML = `<div class="gallery-empty" style="grid-column:1/-1;"><p>No artists found.</p></div>`;
    return;
  }

  grid.innerHTML = artists.map(([name, data]) => `
    <div class="artist-profile-card reveal" data-artist="${escapeHtml(name)}" tabindex="0" role="button" aria-label="View ${escapeHtml(name)}">
      <div class="artist-profile-img-wrap" style="background:var(--bg-secondary);">
        <img src="${escapeHtml(data.image)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async"
             onerror="this.src='https://picsum.photos/seed/artist-${normalizeArtistName(name)}/200/200.jpg'">
      </div>
      <div class="artist-profile-info">
        <h3 class="artist-profile-name">${escapeHtml(name)}</h3>
        ${data.tagline ? `<p class="artist-profile-specialty">${escapeHtml(data.tagline)}</p>` : ''}
        ${data.location ? `<p style="color:var(--muted);font-size:0.75rem;margin:0.15rem 0;"><i data-lucide="map-pin" style="width:11px;height:11px;display:inline;vertical-align:middle;margin-right:2px;"></i>${escapeHtml(data.location)}</p>` : ''}
        ${data.bio ? `<p class="artist-profile-bio" style="color:var(--text-secondary);font-size:0.8rem;line-height:1.4;margin:0.25rem 0 0.4rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(data.bio)}</p>` : ''}
        <span class="artist-profile-works">${data.count} Artwork${data.count > 1 ? 's' : ''}</span>
      </div>
    </div>`).join('');

  lucide.createIcons({ nodes: [grid] });
  grid.querySelectorAll('.artist-profile-card').forEach(card => {
    const handler = () => location.hash = 'artist/' + encodeURIComponent(card.dataset.artist);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(); });
  });
}

function initHomeFilters() {
  document.getElementById('homeFeaturedFilter')?.addEventListener('change', renderHomeFeatured);
  document.getElementById('homeLatestFilter')?.addEventListener('change', renderHomeLatest);
  document.getElementById('homeAllArtworksFilter')?.addEventListener('change', renderHomeAll);
}

/* ============================================
   GALLERY PAGE
   ============================================ */
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  if (!grid) return;
  if (!Array.isArray(allArtworks)) return;
  const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sort = document.getElementById('sortFilter')?.value || 'newest';
  const category = document.getElementById('categoryFilter')?.value || '';
  let filtered = allArtworks.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search) || a.category?.toLowerCase().includes(search) || a.artistName?.toLowerCase().includes(search);
    const artCat = (a.category || '').trim().toLowerCase();
    const filterCat = category.trim().toLowerCase();
    const matchCat = !filterCat || artCat === filterCat;
    return matchSearch && matchCat;
  });
  switch (sort) {
    case 'oldest': filtered.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0)); break;
    case 'price-low': filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
    case 'price-high': filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
    default: filtered.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }
  if (filtered.length === 0) { grid.innerHTML = ''; if (empty) empty.classList.remove('hidden'); }
  else { if (empty) empty.classList.add('hidden'); renderGrid('galleryGrid', filtered); }
}

function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const empty = document.getElementById('favoritesEmpty');
  if (!grid) return;
  if (!auth || !auth.currentUser) {
    grid.innerHTML = `<div class="gallery-empty" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;">
      <i data-lucide="lock" style="width:48px;height:48px;color:var(--muted);margin-bottom:1rem;"></i>
      <p style="font-size:1.1rem;color:var(--muted);">${t('login_to_favorite')}</p>
      <button class="btn btn-primary" style="margin-top:1rem;" id="favLoginBtn">${t('login')}</button>
    </div>`;
    lucide.createIcons({ nodes: [grid] });
    document.getElementById('favLoginBtn')?.addEventListener('click', () => {
      const authModal = document.getElementById('authModal');
      if (authModal) { authModal.classList.add('open'); document.body.style.overflow = 'hidden'; }
    });
    return;
  }
  const favIds = getFavorites();
  const favArtworks = allArtworks.filter(a => favIds.includes(a.id));
  if (favArtworks.length === 0) { grid.innerHTML = ''; if (empty) empty.classList.remove('hidden'); }
  else { if (empty) empty.classList.add('hidden'); renderGrid('favoritesGrid', favArtworks); }
}

function initFilterListeners() {
  document.getElementById('searchInput')?.addEventListener('input', debounce(renderGallery, 300));
  document.getElementById('sortFilter')?.addEventListener('change', renderGallery);
  document.getElementById('categoryFilter')?.addEventListener('change', renderGallery);
}

/* ============================================
   ARTIST PROFILE HTML BUILDER
   ============================================ */
function buildArtistProfileHTML(artistName, about, artistArtworks) {
  const a = about || {};
  const repImage = a.image || a.photo || a.profileImage || a.profilePic || a.avatar ||
    (artistArtworks.length > 0 ? getArtworkImages(artistArtworks[0])[0] : '');
  const bio = a.bio || a.biography || a.about || a.description || a.artistBio || '';
  const tagline = a.tagline || a.specialty || a.category || a.medium || a.style || a.artSpecialty || '';
  let location = a.location || a.address || '';
  if (!location && a.city && a.country) location = `${a.city}, ${a.country}`;
  else if (!location && a.city) location = a.city;
  else if (!location && a.country) location = a.country;
  const socials = a.socials || a.socialLinks || a.social || {};
  const instagram = a.instagram || socials.instagram || '';
  const twitter = a.twitter || socials.twitter || a.x || socials.x || '';
  const facebook = a.facebook || socials.facebook || '';
  const website = a.website || socials.website || '';
  const phone = a.phone || a.whatsapp || a.telephone || socials.whatsapp || socials.phone || '';
  const email = a.email || a.emailAddress || socials.email || '';
  const totalValue = artistArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
  const yearsActive = a.yearsActive || a.years_creating || a.experience || '';

  return `
    <div class="detail-artist-avatar" style="width:160px;height:160px;flex-shrink:0;background:var(--bg-secondary);border-radius:var(--radius-lg);overflow:hidden;">
      <img src="${escapeHtml(repImage)}" alt="${escapeHtml(artistName)}" decoding="async" style="width:100%;height:100%;object-fit:cover;"
           onerror="this.src='https://picsum.photos/seed/artist-full/200/200.jpg'">
    </div>
    <div style="flex:1;min-width:200px;">
      <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:0.25rem;">${escapeHtml(artistName)}</h1>
      ${tagline ? `<p style="color:var(--primary);font-weight:600;margin-bottom:0.5rem;">${escapeHtml(tagline)}</p>` : ''}
      ${location ? `<p style="color:var(--muted);margin-bottom:0.5rem;"><i data-lucide="map-pin" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> ${escapeHtml(location)}</p>` : ''}
      ${bio ? `<p style="color:var(--text-secondary);line-height:1.7;margin-bottom:1rem;max-width:650px;white-space:pre-line;">${escapeHtml(bio)}</p>` : ''}
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
        <div style="background:var(--bg-secondary);padding:0.75rem 1.25rem;border-radius:var(--radius);">
          <span style="font-weight:700;font-size:1.2rem;">${artistArtworks.length}</span>
          <span style="color:var(--muted);font-size:0.85rem;margin-left:4px;">Artworks</span>
        </div>
        ${totalValue > 0 ? `<div style="background:var(--bg-secondary);padding:0.75rem 1.25rem;border-radius:var(--radius);">
          <span style="font-weight:700;font-size:1.2rem;" data-base-price="${totalValue}" data-base-currency="UGX">${formatPrice(totalValue, 'UGX')}</span>
          <span style="color:var(--muted);font-size:0.85rem;margin-left:4px;">Total Value</span>
        </div>` : ''}
        ${yearsActive ? `<div style="background:var(--bg-secondary);padding:0.75rem 1.25rem;border-radius:var(--radius);">
          <span style="font-weight:700;font-size:1.2rem;">${escapeHtml(yearsActive)}</span>
          <span style="color:var(--muted);font-size:0.85rem;margin-left:4px;">Years Active</span>
        </div>` : ''}
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        ${phone ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i data-lucide="message-circle" style="width:16px;height:16px;"></i> WhatsApp</a>` : ''}
        ${email ? `<a href="mailto:${escapeHtml(email)}" class="btn btn-ghost btn-sm"><i data-lucide="mail" style="width:16px;height:16px;"></i> Email</a>` : ''}
        ${instagram ? `<a href="${escapeHtml(instagram.startsWith('http') ? instagram : 'https://instagram.com/' + instagram)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i data-lucide="instagram" style="width:16px;height:16px;"></i> Instagram</a>` : ''}
        ${twitter ? `<a href="${escapeHtml(twitter.startsWith('http') ? twitter : 'https://twitter.com/' + twitter)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i data-lucide="twitter" style="width:16px;height:16px;"></i> Twitter</a>` : ''}
        ${facebook ? `<a href="${escapeHtml(facebook.startsWith('http') ? facebook : 'https://facebook.com/' + facebook)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i data-lucide="facebook" style="width:16px;height:16px;"></i> Facebook</a>` : ''}
        ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i data-lucide="globe" style="width:16px;height:16px;"></i> Website</a>` : ''}
      </div>
    </div>`;
}

/* ============================================
   ORDER FORM MODAL (UPDATED: Checks login,
   uses MessageInbox for thread creation)
   ============================================ */
let currentOrderArtwork = null;
function openOrderFormForArtwork(artwork) {
  /* STEP 1: Check if user is logged in */
  if (!auth || !auth.currentUser) {
    showToast('Please sign in to place an order', 'error');
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      const loginTab = authModal.querySelector('[data-auth-tab="login"]');
      if (loginTab) loginTab.click();
    }
    return;
  }

  currentOrderArtwork = artwork;
  let modal = document.getElementById('clientOrderModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'clientOrderModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="auth-modal-container" role="dialog" aria-modal="true">'
      + '<button class="modal-close" id="orderModalClose"><i data-lucide="x" style="width:20px;height:20px;"></i></button>'
      + '<h2 style="font-size:1.3rem;font-weight:700;margin-bottom:1rem;">Place Your Order</h2>'
      + '<div id="orderArtSummary" style="display:flex;gap:1rem;margin-bottom:1.5rem;padding:1rem;background:var(--bg-secondary);border-radius:var(--radius);"></div>'
      + '<form id="clientOrderForm">'
      + '<div class="form-group"><label>Your Name *</label><input type="text" id="orderName" required placeholder="John Doe"></div>'
      + '<div class="form-group"><label>Email Address *</label><input type="email" id="orderEmail" required placeholder="you@example.com"></div>'
      + '<div class="form-group"><label>Phone / WhatsApp</label><input type="tel" id="orderPhone" placeholder="+256 700..."></div>'
      + '<div class="form-group"><label>Message / Notes</label><textarea id="orderMessage" rows="3" placeholder="Any specific inquiries about this piece..."></textarea></div>'
      + '<div class="form-error hidden" id="orderError"></div>'
      + '<button type="submit" class="btn btn-primary btn-full">Submit Order Request</button>'
      + '</form></div>';
    document.body.appendChild(modal);
    lucide.createIcons({ nodes: [modal] });
    modal.querySelector('#orderModalClose').addEventListener('click', () => { modal.classList.remove('open'); document.body.style.overflow = ''; });
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('open'); document.body.style.overflow = ''; } });

    /* Updated submit handler — uses MessageInbox */
    modal.querySelector('#clientOrderForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = modal.querySelector('#orderError');
      errEl.classList.add('hidden');
      const name = modal.querySelector('#orderName').value.trim();
      const email = modal.querySelector('#orderEmail').value.trim();
      const phone = modal.querySelector('#orderPhone').value.trim();
      const message = modal.querySelector('#orderMessage').value.trim();

      if (!name || !email) {
        errEl.textContent = 'Name and email are required.';
        errEl.classList.remove('hidden');
        return;
      }

      const btn = modal.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      try {
        /* Send order via MessageInbox system */
        const threadKey = await MessageInbox.sendOrder(currentOrderArtwork, {
          name: name,
          email: email,
          phone: phone,
          message: message || 'I\'m interested in "' + (currentOrderArtwork.title || 'this artwork') + '"'
        });

        modal.classList.remove('open');
        document.body.style.overflow = '';
        showToast('Order sent! Check your Messages inbox.', 'success');
        modal.querySelector('#clientOrderForm').reset();

        /* Navigate to messages after a short delay */
        setTimeout(() => { location.hash = 'messages'; }, 800);

      } catch (err) {
        console.error('Order error:', err);
        errEl.textContent = 'Failed to submit order. Please try again.';
        errEl.classList.remove('hidden');
      }

      btn.disabled = false;
      btn.textContent = 'Submit Order Request';
    });
  }

  /* Pre-fill name & email from logged-in user */
  const nameInput = modal.querySelector('#orderName');
  const emailInput = modal.querySelector('#orderEmail');
  if (auth.currentUser) {
    if (nameInput) nameInput.value = auth.currentUser.displayName || '';
    if (emailInput) emailInput.value = auth.currentUser.email || '';
  }
  /* Make email read-only since it matches their account */
  if (emailInput) {
    emailInput.readOnly = true;
    emailInput.style.opacity = '0.7';
  }

  const summary = modal.querySelector('#orderArtSummary');
  const images = getArtworkImages(artwork);
  summary.innerHTML = '<img src="' + (images[0] || 'https://picsum.photos/seed/order-placeholder/100/100.jpg') + '" decoding="async" style="width:80px;height:80px;object-fit:cover;border-radius:var(--radius);background:var(--bg-secondary);">'
    + '<div><h3 style="font-weight:600;font-size:1rem;">' + escapeHtml(artwork.title) + '</h3>'
    + '<p style="color:var(--muted);font-size:0.9rem;">' + (artwork.price ? formatPrice(artwork.price, artwork.currency) : 'Price on request') + '</p></div>';

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ============================================
   ARTWORK DETAIL PAGE
   ============================================ */
let detailSlideIndex = 0;
function renderArtworkDetailPage(artworkId) {
  const page = document.getElementById('page-artwork-detail');
  if (!page) return;
  const artwork = allArtworks.find(a => a.id === artworkId);
  if (!artwork) {
    page.innerHTML = `<div class="container" style="padding:4rem 1.5rem;text-align:center;"><p style="font-size:1.1rem;color:var(--muted);">Artwork not found.</p><a href="#home" class="btn btn-primary" style="margin-top:1rem;">${t('back')}</a></div>`;
    return;
  }
  const images = getArtworkImages(artwork);
  detailSlideIndex = 0;
  page.innerHTML = `<div class="container" style="padding:1.5rem;">
    <button class="btn btn-ghost" id="detailBackBtn" style="margin-bottom:1.5rem;"><i data-lucide="arrow-left" style="width:18px;height:18px;"></i> ${t('back')}</button>
    <div class="artwork-detail-layout">
      <div class="artwork-detail-images" id="detailImagesWrap">
        <div class="detail-main-image" style="background:var(--bg-secondary);">
          ${images.length > 0 ? images.map((url, i) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(artwork.title)}" class="${i === 0 ? 'active-slide' : ''}" loading="lazy" decoding="async">`).join('') : `<img src="https://picsum.photos/seed/no-img/800/800.jpg" alt="No image" class="active-slide" decoding="async">`}
          ${images.length > 1 ? `<button class="modal-carousel-btn prev" id="detailPrev"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button><button class="modal-carousel-btn next" id="detailNext"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button><span class="modal-slide-counter" id="detailCounter">1 / ${images.length}</span>` : ''}
        </div>
        ${images.length > 1 ? `<div class="detail-thumbnails" id="detailThumbs">${images.map((url, i) => `<div class="detail-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}"><img src="${escapeHtml(url)}" alt="Thumb ${i + 1}" loading="lazy" decoding="async"></div>`).join('')}</div>` : ''}
      </div>
      <div class="artwork-detail-info">
        <span class="detail-category">${escapeHtml(artwork.category || '')}</span>
        <h1 class="detail-title">${escapeHtml(artwork.title)}</h1>
        <p class="detail-artist-link" id="detailArtistLink" style="cursor:pointer;">by <strong>${escapeHtml(artwork.artistName || 'Unknown Artist')}</strong></p>
        <p class="detail-price" data-base-price="${artwork.price}" data-base-currency="${artwork.currency || 'UGX'}">${artwork.price ? formatPrice(artwork.price, artwork.currency) : t('price_on_request')}</p>
        ${artwork.size ? `<p class="detail-size"><i data-lucide="ruler" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:4px;"></i>${escapeHtml(artwork.size)}</p>` : ''}
        <p class="detail-description">${escapeHtml(artwork.description || t('no_description'))}</p>
        <div class="detail-actions">
          <button class="btn btn-primary" id="detailOrderBtn"><i data-lucide="shopping-bag" style="width:16px;height:16px;"></i> ${t('order_now')}</button>
          <button class="btn btn-outline" id="detailFavBtn"><i data-lucide="heart" style="width:16px;height:16px;"></i></button>
          <button class="btn btn-outline" id="detailShareBtn"><i data-lucide="share-2" style="width:16px;height:16px;"></i></button>
        </div>
      </div>
    </div>
    <div class="detail-artist-section" id="detailArtistSection" style="margin-top:3rem;">
      <div class="section-header"><h2>${t('about_the_artist')}</h2></div>
      <div id="detailArtistProfile" style="display:flex;align-items:flex-start;gap:1.5rem;flex-wrap:wrap;"><div style="color:var(--muted);">Loading artist info...</div></div>
    </div>
    <div class="detail-more-section" style="margin-top:3rem;">
      <div class="section-header"><h2>${t('more_by')} ${escapeHtml(artwork.artistName || 'Artist')}</h2><a href="#artist/${encodeURIComponent(artwork.artistName || '')}" class="btn btn-ghost btn-sm">View All →</a></div>
      <div class="gallery-grid" id="detailMoreGrid" data-artist-name="${escapeHtml(artwork.artistName || '')}"></div>
    </div>
  </div>`;
  lucide.createIcons({ nodes: [page] });
  updateDetailFavBtn(artwork.id);
  if (images.length > 1) {
    document.getElementById('detailPrev')?.addEventListener('click', () => changeDetailSlide(-1, images));
    document.getElementById('detailNext')?.addEventListener('click', () => changeDetailSlide(1, images));
    document.getElementById('detailThumbs')?.addEventListener('click', (e) => {
      const thumb = e.target.closest('.detail-thumb');
      if (thumb) goToDetailSlide(parseInt(thumb.dataset.idx), images);
    });
  }
  document.getElementById('detailBackBtn')?.addEventListener('click', () => history.back());
  document.getElementById('detailArtistLink')?.addEventListener('click', () => { if (artwork.artistName) location.hash = 'artist/' + encodeURIComponent(artwork.artistName); });
  document.getElementById('detailOrderBtn')?.addEventListener('click', () => openOrderFormForArtwork(artwork));
  document.getElementById('detailFavBtn')?.addEventListener('click', () => toggleFavorite(artwork.id));
  document.getElementById('detailShareBtn')?.addEventListener('click', () => {
    navigator.share ? navigator.share({ title: artwork.title, text: `Check out "${artwork.title}"`, url: window.location.href }).catch(() => {}) : navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied', 'success')).catch(() => {});
  });
  loadDetailArtistAbout(artwork.artistName);
  renderMoreByArtist(artwork.artistName, artwork.id);
  setTimeout(initRevealAnimations, 100);
}

function changeDetailSlide(dir, images) {
  const slides = document.querySelectorAll('#detailImagesWrap .detail-main-image img');
  if (slides.length <= 1) return;
  slides[detailSlideIndex]?.classList.remove('active-slide');
  detailSlideIndex = (detailSlideIndex + dir + slides.length) % slides.length;
  slides[detailSlideIndex]?.classList.add('active-slide');
  const counter = document.getElementById('detailCounter');
  if (counter) counter.textContent = `${detailSlideIndex + 1} / ${slides.length}`;
  document.querySelectorAll('.detail-thumb').forEach((t, i) => t.classList.toggle('active', i === detailSlideIndex));
}

function goToDetailSlide(idx, images) {
  const slides = document.querySelectorAll('#detailImagesWrap .detail-main-image img');
  if (idx < 0 || idx >= slides.length) return;
  slides[detailSlideIndex]?.classList.remove('active-slide');
  detailSlideIndex = idx;
  slides[detailSlideIndex]?.classList.add('active-slide');
  const counter = document.getElementById('detailCounter');
  if (counter) counter.textContent = `${detailSlideIndex + 1} / ${slides.length}`;
  document.querySelectorAll('.detail-thumb').forEach((t, i) => t.classList.toggle('active', i === detailSlideIndex));
}

function updateDetailFavBtn(id) {
  const btn = document.getElementById('detailFavBtn');
  if (!btn) return;
  const fav = isFavorite(id);
  btn.classList.toggle('fav-active', fav);
  btn.innerHTML = `<i data-lucide="heart" style="width:16px;height:16px;${fav ? 'fill:var(--danger);' : ''}"></i>`;
  lucide.createIcons({ nodes: [btn] });
}

async function loadDetailArtistAbout(artistName) {
  const container = document.getElementById('detailArtistProfile');
  if (!container || !artistName) return;
  const about = await getArtistAbout(artistName);
  const artistArtworks = allArtworks.filter(a => normalizeArtistName(a.artistName) === normalizeArtistName(artistName));
  container.innerHTML = buildArtistProfileHTML(artistName, about, artistArtworks);
  lucide.createIcons({ nodes: [container] });
}

function renderMoreByArtist(artistName, excludeId = null) {
  const grid = document.getElementById('detailMoreGrid');
  if (!grid || !artistName) return;
  const works = allArtworks.filter(a => normalizeArtistName(a.artistName) === normalizeArtistName(artistName) && a.id !== excludeId).slice(0, 8);
  if (works.length === 0) { grid.innerHTML = `<div class="gallery-empty" style="grid-column:1/-1;"><p>No other works by this artist.</p></div>`; return; }
  renderGrid('detailMoreGrid', works);
}

/* ============================================
   ARTIST DETAIL PAGE
   ============================================ */
async function renderArtistDetailPage(artistName) {
  const page = document.getElementById('page-artist-detail');
  if (!page) return;
  page.innerHTML = `<div class="container" style="padding:1.5rem;">
    <button class="btn btn-ghost" id="artistBackBtn" style="margin-bottom:1.5rem;"><i data-lucide="arrow-left" style="width:18px;height:18px;"></i> ${t('back')}</button>
    <div id="artistProfileHeader" style="display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:2.5rem;"><div style="color:var(--muted);">Loading...</div></div>
    <div class="section-header"><h2>All Artworks by ${escapeHtml(artistName)}</h2></div>
    <div class="gallery-grid" id="artistDetailGrid"></div>
  </div>`;
  lucide.createIcons({ nodes: [page] });
  document.getElementById('artistBackBtn')?.addEventListener('click', () => history.back());
  const about = await getArtistAbout(artistName);
  const artistArtworks = allArtworks.filter(a => normalizeArtistName(a.artistName) === normalizeArtistName(artistName));
  const header = document.getElementById('artistProfileHeader');
  if (header) { header.innerHTML = buildArtistProfileHTML(artistName, about, artistArtworks); lucide.createIcons({ nodes: [header] }); }
  const grid = document.getElementById('artistDetailGrid');
  if (grid) {
    if (artistArtworks.length === 0) grid.innerHTML = `<div class="gallery-empty" style="grid-column:1/-1;"><p>No artworks by this artist yet.</p></div>`;
    else renderGrid('artistDetailGrid', artistArtworks);
  }
  setTimeout(initRevealAnimations, 100);
}

/* ============================================
   VIEWING ROOM (OPTIMIZED: uses allArtworks)
   ============================================ */
const vrState = { artworks: [], currentIndex: 0, isFullscreen: false, lastArtworkCount: 0 };

function loadViewingRoom() {
  const container = document.getElementById('vrContainer');
  const loading = document.getElementById('vrLoading');
  const empty = document.getElementById('vrEmpty');
  const viewer = document.getElementById('vrViewer');
  if (!container) return;

  /* Use already-loaded allArtworks — no extra Firebase call, correct IDs */
  const filtered = allArtworks.filter(art => getArtworkImages(art).length > 0).reverse();

  loading?.classList.add('hidden');

  if (filtered.length === 0) {
    empty?.classList.remove('hidden');
    viewer?.classList.add('hidden');
    const gridSection = document.getElementById('vrGallerySection');
    if (gridSection) gridSection.remove();
    return;
  }

  /* Only rebuild strip + grid if artwork count changed */
  const countChanged = filtered.length !== vrState.lastArtworkCount;
  vrState.artworks = filtered;
  vrState.lastArtworkCount = filtered.length;

  empty?.classList.add('hidden');
  viewer?.classList.remove('hidden');

  if (countChanged) {
    /* --- Rebuild thumbnail strip --- */
    const strip = document.getElementById('vrStrip');
    if (strip) {
      strip.innerHTML = '';
      vrState.artworks.forEach((art, i) => {
        const imgs = getArtworkImages(art);
        const thumb = document.createElement('div');
        thumb.className = 'vr-thumb' + (i === vrState.currentIndex ? ' active' : '');
        thumb.innerHTML = `<img src="${imgs[0]}" alt="${art.title || ''}" loading="lazy" decoding="async">`;
        thumb.addEventListener('click', () => { vrState.currentIndex = i; showVRArtwork(i); });
        strip.appendChild(thumb);
      });
    }

    /* --- Build gallery grid below the viewer --- */
    ensureVRGallerySection();
    renderVRGalleryGrid();
  }

  /* Clamp current index */
  if (vrState.currentIndex >= vrState.artworks.length) vrState.currentIndex = 0;
  showVRArtwork(vrState.currentIndex);
}

/* Create the gallery section below the viewer if it doesn't exist yet */
function ensureVRGallerySection() {
  if (document.getElementById('vrGallerySection')) return;
  const viewer = document.getElementById('vrViewer');
  if (!viewer) return;

  const section = document.createElement('div');
  section.id = 'vrGallerySection';
  section.style.cssText = 'margin-top:3rem;padding:0 1.5rem 4rem;max-width:1400px;margin-left:auto;margin-right:auto;';
  section.innerHTML = `
    <div class="section-header" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
      <h2 style="margin:0;">${t('all_artworks')}</h2>
      <span style="color:var(--muted);font-size:0.9rem;" id="vrGridCount">${vrState.artworks.length} ${t('artworks')}</span>
    </div>
    <div class="gallery-grid" id="vrGalleryGrid"></div>
  `;
  viewer.after(section);
}

/* Render artwork cards into the below-viewer grid.
   Clicking a card scrolls to the viewer and shows that artwork
   instead of navigating to the detail page. */
function renderVRGalleryGrid() {
  const grid = document.getElementById('vrGalleryGrid');
  const countEl = document.getElementById('vrGridCount');
  if (!grid) return;
  if (countEl) countEl.textContent = `${vrState.artworks.length} ${t('artworks')}`;

  /* Build cards using the same card generator */
  const fragment = document.createDocumentFragment();
  const temp = document.createElement('div');
  temp.innerHTML = vrState.artworks.map(a => createArtworkCard(a)).join('');
  while (temp.firstChild) fragment.appendChild(temp.firstChild);
  grid.innerHTML = '';
  grid.appendChild(fragment);
  lucide.createIcons({ nodes: [grid] });

  /* Override default card click → scroll to viewer & show artwork */
  grid.querySelectorAll('.artwork-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (e.target.closest('.artwork-card-fav')) return;
      const artId = card.dataset.id;
      const idx = vrState.artworks.findIndex(a => a.id === artId);
      if (idx >= 0) {
        vrState.currentIndex = idx;
        showVRArtwork(idx);
        document.getElementById('vrViewer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* Favorite buttons still work normally */
  grid.querySelectorAll('.artwork-card-fav').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(btn.dataset.fav); });
  });

  /* Highlight the currently-viewed card */
  highlightVRGridCard();
}

/* Highlight the card in the grid that matches the current viewer artwork */
function highlightVRGridCard() {
  const currentArt = vrState.artworks[vrState.currentIndex];
  if (!currentArt) return;
  document.querySelectorAll('#vrGalleryGrid .artwork-card').forEach(card => {
    const isCurrent = card.dataset.id === currentArt.id;
    card.classList.toggle('vr-card-active', isCurrent);
    /* Add/remove a small "Viewing" badge */
    let badge = card.querySelector('.vr-viewing-badge');
    if (isCurrent && !badge) {
      badge = document.createElement('span');
      badge.className = 'vr-viewing-badge';
      badge.textContent = '▶ Viewing';
      card.querySelector('.artwork-card-image')?.appendChild(badge);
    } else if (!isCurrent && badge) {
      badge.remove();
    }
  });
}

async function showVRArtwork(index) {
  if (index < 0 || index >= vrState.artworks.length) return;
  vrState.currentIndex = index;
  const art = vrState.artworks[index];
  const imgs = getArtworkImages(art);
  const counter = document.getElementById('vrCounter');
  if (counter) counter.textContent = `${index + 1} / ${vrState.artworks.length}`;
  const img = document.getElementById('vrImage');
  const loader = document.getElementById('vrImageLoader');
  if (img && loader) {
    img.classList.add('loading'); loader.classList.remove('hidden');
    img.onload = () => { img.classList.remove('loading'); loader.classList.add('hidden'); };
    img.onerror = () => { img.classList.remove('loading'); loader.classList.add('hidden'); img.src = 'https://picsum.photos/seed/vr-fallback/600/800.jpg'; };
    img.src = imgs[0]; img.alt = art.title || 'Artwork';
  }
  const setEl = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setEl('vrCategory', art.category || '');
  setEl('vrTitle', art.title || 'Untitled');
  setEl('vrArtist', 'by ' + (art.artistName || 'Unknown Artist'));
  setEl('vrSize', art.size || '');
  setEl('vrDesc', art.description || t('no_description'));
  const vrArtistBio = document.getElementById('vrArtistBio');
  if (vrArtistBio && art.artistName) {
    const about = await getArtistAbout(art.artistName);
    vrArtistBio.textContent = about?.bio || about?.biography || about?.about || about?.description || '';
    vrArtistBio.style.display = (about?.bio || about?.biography || about?.about || about?.description) ? '' : 'none';
  }
  document.querySelectorAll('.vr-thumb').forEach((t, i) => t.classList.toggle('active', i === index));
  const activeThumb = document.querySelector('.vr-thumb.active');
  if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  updateVRFavBtn();
  /* Highlight the matching card in the grid below */
  highlightVRGridCard();
}

function updateVRFavBtn() {
  const btn = document.getElementById('vrFavBtn');
  if (!btn || vrState.artworks.length === 0) return;
  const art = vrState.artworks[vrState.currentIndex];
  const fav = isFavorite(art.id);
  btn.classList.toggle('fav-active', fav);
  btn.innerHTML = `<i data-lucide="heart" style="width:18px;height:18px;${fav ? 'fill:var(--danger);' : ''}"></i>`;
  lucide.createIcons({ nodes: [btn] });
}

function toggleVRFullscreen() {
  const container = document.getElementById('vrContainer');
  if (!container) return;
  vrState.isFullscreen = !vrState.isFullscreen;
  container.classList.toggle('fullscreen', vrState.isFullscreen);
  const fsBtn = document.getElementById('vrFullscreenBtn');
  if (fsBtn) { fsBtn.innerHTML = vrState.isFullscreen ? '<i data-lucide="minimize-2" style="width:18px;height:18px;"></i>' : '<i data-lucide="maximize-2" style="width:18px;height:18px;"></i>'; lucide.createIcons({ nodes: [fsBtn] }); }
  document.body.style.overflow = vrState.isFullscreen ? 'hidden' : '';
}

function initViewingRoomListeners() {
  document.getElementById('vrPrevBtn')?.addEventListener('click', () => { if (vrState.artworks.length === 0) return; showVRArtwork((vrState.currentIndex - 1 + vrState.artworks.length) % vrState.artworks.length); });
  document.getElementById('vrNextBtn')?.addEventListener('click', () => { if (vrState.artworks.length === 0) return; showVRArtwork((vrState.currentIndex + 1) % vrState.artworks.length); });
  document.getElementById('vrFullscreenBtn')?.addEventListener('click', toggleVRFullscreen);
  document.getElementById('vrFavBtn')?.addEventListener('click', () => { if (vrState.artworks.length === 0) return; toggleFavorite(vrState.artworks[vrState.currentIndex].id); });
  document.addEventListener('keydown', (e) => {
    const vrPage = document.getElementById('page-viewing-room');
    if (!vrPage?.classList.contains('active') || vrState.artworks.length === 0) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); showVRArtwork((vrState.currentIndex - 1 + vrState.artworks.length) % vrState.artworks.length); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); showVRArtwork((vrState.currentIndex + 1) % vrState.artworks.length); }
    else if (e.key === 'Escape' && vrState.isFullscreen) toggleVRFullscreen();
  });
}

/* ============================================
   PRICE DATABASE
   ============================================ */
let liveExchangeRates = null;
async function fetchLiveRatesPD() {
  if (liveExchangeRates && (Date.now() - liveExchangeRates.timestamp < 14400000)) return liveExchangeRates;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/UGX');
    const data = await res.json();
    if (data.result === 'success') { liveExchangeRates = { UGX: 1, USD: data.rates.USD, EUR: data.rates.EUR, GBP: data.rates.GBP, KES: data.rates.KES, timestamp: Date.now() }; return liveExchangeRates; }
  } catch (err) { }
  return { UGX: 1, USD: 0.00026, EUR: 0.00024, GBP: 0.00021, KES: 0.035, timestamp: Date.now() };
}

function loadPriceDatabase(selectedCurrency = 'UGX') {
  const loading = document.getElementById('pdLoading');
  const empty = document.getElementById('pdEmpty');
  const dashboard = document.getElementById('pdDashboard');
  if (!loading) return;
  loading.classList.remove('hidden'); empty?.classList.add('hidden'); dashboard?.classList.add('hidden');
  fetchLiveRatesPD().then(rates => {
    fetchFromUserInformation('artworks', true).then(results => {
      loading.classList.add('hidden');
      const validArtworks = results.filter(a => typeof a.price === 'number' && a.price > 0);
      if (validArtworks.length === 0) { empty?.classList.remove('hidden'); return; }
      const converted = validArtworks.map(art => {
        const sourceRate = rates[art.currency || 'UGX'] || 1;
        const targetRate = rates[selectedCurrency] || 1;
        return { ...art, convertedPrice: Math.round(art.price * (targetRate / sourceRate)) };
      });
      const prices = converted.map(a => a.convertedPrice);
      const totalValue = prices.reduce((s, p) => s + p, 0);
      const avgPrice = Math.round(totalValue / prices.length);
      let highestArt = converted[0], lowestArt = converted[0];
      converted.forEach(a => { if (a.convertedPrice > highestArt.convertedPrice) highestArt = a; if (a.convertedPrice < lowestArt.convertedPrice) lowestArt = a; });
      const fmt = (val) => selectedCurrency === 'UGX' ? `UGX ${Number(val).toLocaleString()}` : `${selectedCurrency} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      document.getElementById('pdTotalValue').textContent = fmt(totalValue);
      document.getElementById('pdAvgPrice').textContent = fmt(avgPrice);
      document.getElementById('pdHighPrice').textContent = fmt(highestArt.convertedPrice);
      document.getElementById('pdHighTitle').textContent = highestArt.title ? `"${highestArt.title}"` : '';
      document.getElementById('pdLowPrice').textContent = fmt(lowestArt.convertedPrice);
      document.getElementById('pdLowTitle').textContent = lowestArt.title ? `"${lowestArt.title}"` : '';
      const categoryMap = {};
      converted.forEach(art => { const cat = art.category || 'Uncategorized'; if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 }; categoryMap[cat].total += art.convertedPrice; categoryMap[cat].count += 1; });
      const catList = document.getElementById('pdCategoryList');
      if (catList) {
        catList.innerHTML = '';
        Object.entries(categoryMap).map(([name, d]) => ({ name, count: d.count, avg: Math.round(d.total / d.count) })).sort((a, b) => b.avg - a.avg).forEach(cat => {
          const item = document.createElement('div'); item.className = 'pd-cat-item';
          item.innerHTML = `<span><span class="pd-cat-name">${cat.name}</span><span class="pd-cat-count">(${cat.count})</span></span><span class="pd-cat-avg">${fmt(cat.avg)}</span>`;
          catList.appendChild(item);
        });
      }
      dashboard?.classList.remove('hidden');
      lucide.createIcons();
    }).catch(() => { loading.classList.add('hidden'); empty?.classList.remove('hidden'); });
  });
}

function initPriceDatabaseListeners() {
  document.getElementById('pdCurrencyFilter')?.addEventListener('change', (e) => loadPriceDatabase(e.target.value));
}

/* ============================================
   AUCTIONS
   ============================================ */
let auctionTimerInterval = null;
function loadAuctions() {
  const loading = document.getElementById('auctionLoading');
  const empty = document.getElementById('auctionEmpty');
  const grid = document.getElementById('auctionGrid');
  if (!loading) return;
  loading.classList.remove('hidden'); empty?.classList.add('hidden'); grid?.classList.add('hidden');
  if (auctionTimerInterval) clearInterval(auctionTimerInterval);
  fetchFromUserInformation('auctions', true).then(results => {
    loading.classList.add('hidden');
    const auctions = results.filter(a => a.image && a.title);
    if (auctions.length === 0) { empty?.classList.remove('hidden'); return; }
    if (grid) {
      grid.innerHTML = '';
      auctions.forEach(auction => {
        const card = document.createElement('div'); card.className = 'auction-card reveal';
        card.innerHTML = `<div class="auction-img-wrap" style="background:var(--bg-secondary);"><img src="${auction.image}" alt="${auction.title}" loading="lazy" decoding="async"><span class="auction-status-badge" data-end-time="${auction.endTime}">Loading...</span></div><div class="auction-info"><h3 class="auction-title">${auction.title}</h3><div class="auction-meta"><div class="auction-bids-info"><span class="auction-current-label">Current Bid (${auction.currency || 'UGX'})</span><span class="auction-current-price">${Number(auction.currentBid || auction.startBid || 0).toLocaleString()}</span><span style="font-size:0.75rem;color:var(--muted);">${auction.bidsCount || 0} bids</span></div><div class="auction-timer"><span class="auction-time-left">Ends in</span><div class="auction-time-digits" data-end-time="${auction.endTime}">--:--:--</div></div></div><button class="btn btn-primary auction-bid-btn" data-auction-title="${escapeHtml(auction.title)}">Place Bid</button></div>`;
        grid.appendChild(card);
      });
      grid.classList.remove('hidden');
      grid.querySelectorAll('.auction-bid-btn').forEach(btn => {
        btn.addEventListener('click', () => handleBidClick(btn.dataset.auctionTitle));
      });
    }
    updateAuctionTimers();
    auctionTimerInterval = setInterval(updateAuctionTimers, 1000);
    setTimeout(initRevealAnimations, 100);
  }).catch(() => { loading.classList.add('hidden'); empty?.classList.remove('hidden'); });
}

function updateAuctionTimers() {
  const now = Date.now();
  document.querySelectorAll('[data-end-time]').forEach(el => {
    const endTime = parseInt(el.dataset.endTime);
    if (isNaN(endTime)) return;
    const diff = endTime - now;
    const badge = el.classList.contains('auction-status-badge') ? el : null;
    if (diff <= 0) {
      if (el.classList.contains('auction-time-digits')) el.textContent = 'Ended';
      if (badge) { badge.textContent = 'Ended'; badge.className = 'auction-status-badge ended'; }
      const card = el.closest('.auction-card');
      if (card) { const btn = card.querySelector('.auction-bid-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Auction Ended'; btn.classList.replace('btn-primary', 'btn-outline'); } }
    } else {
      const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000);
      if (el.classList.contains('auction-time-digits')) { el.textContent = `${h}h ${m}m ${s}s`; el.classList.toggle('urgent', h < 1); }
      if (badge) { badge.textContent = h < 1 ? 'Ending Soon' : 'Live'; badge.className = 'auction-status-badge ' + (h < 1 ? 'ending' : 'live'); }
    }
  });
}

function handleBidClick(title) {
  const msg = `Hello, I want to place a bid on the auction for "${title}".`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ============================================
   GLOBAL KEYBOARD SHORTCUTS
   ============================================ */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const authModal = document.getElementById('authModal');
  if (authModal?.classList.contains('open')) { authModal.classList.remove('open'); document.body.style.overflow = ''; return; }
  const prModal = document.getElementById('portfolioRegModal');
  if (prModal?.classList.contains('open')) { prModal.classList.remove('open'); document.body.style.overflow = ''; return; }
  const orderModal = document.getElementById('clientOrderModal');
  if (orderModal?.classList.contains('open')) { orderModal.classList.remove('open'); document.body.style.overflow = ''; return; }
  if (document.getElementById('navLinks')?.classList.contains('open')) closeMobileMenu();
  closeAllDropdowns();
  hideSearchResultsPanel();
});

   ! function() {
    if (location.pathname.includes('maintenance') || location.pathname.includes('admin')) return;
    if (new URLSearchParams(location.search).get('bypass') === '1') return;
    var c = {
      apiKey: "AIzaSyC483ZOHvItMVBCe1HufHO39FyYVlNDPLU",
      authDomain: "auther-afro-gallero.firebaseapp.com",
      projectId: "auther-afro-gallero",
      storageBucket: "auther-afro-gallero.firebasestorage.app",
      messagingSenderId: "60533127446",
      appId: "1:60533127446:web:3270a06931b2405348b837"
    };
    firebase.initializeApp(c);
    firebase.database().ref('settings/maintenance').once('value').then(function(s) {
      if (s.val() === true) location.replace('maintenance.html');
    }).catch(function() {});
  }();
  
/* ============================================
   ADVANCED WEBSITE ANALYTICS SYSTEM v2.0
   Tracks: page views, unique visitors (fingerprint),
   clicks, session duration, device info, referrer,
   first vs returning, active users, countries,
   cities, scroll depth, route/state changes,
   search queries, form submissions, external links,
   downloads, custom events, engagement score,
   bounce detection, dark mode, input method,
   ad blocker, orientations, website health
   (load time, TTFB, LCP, CLS, INP, long tasks,
   JS errors, resource errors, memory, connection),
   health score & status, error details
   Batch writes every 30 seconds
   ============================================ */
const SiteAnalytics = (function () {
  /* --- Storage Keys --- */
  const FP_KEY = 'artFP';
  const SES_KEY = 'artSes';
  const FV_KEY = 'artFV';
  const VC_KEY = 'artVC';
  const CTRY_KEY = 'artCtry';
  const CTRY_CITY_KEY = 'artCtryCity';
  const CTRY_TS = 'artCtryTs';

  /* --- Config --- */
  const FLUSH_INTERVAL = 30000;
  const CLICK_FLUSH_DELAY = 2000;
  const HEARTBEAT_INTERVAL = 25000;
  const MAX_QUEUE = 50;
  const MAX_RECENT = 100;
  const MAX_HEALTH_DETAILS = 50;
  const COUNTRY_CACHE_TTL = 86400000;
  const GEO_TIMEOUT = 3000;
  const HEALTH_RECHECK = 60000;

  /* ===========================
     FINGERPRINT & IDENTITY
     =========================== */

  function generateFingerprint() {
    try {
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('FP|' + navigator.language + '|' + screen.width + 'x' + screen.height, 2, 2);
      var hash = c.toDataURL().split('').reduce(function (a, b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
      var parts = [
        hash, navigator.language, screen.width + 'x' + screen.height, screen.colorDepth,
        new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 0,
        navigator.platform || ''
      ];
      var h = 0;
      var str = parts.join('|');
      for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
      return 'fp_' + Math.abs(h).toString(36);
    } catch (e) {
      return 'fp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    }
  }

  function getFingerprint() {
    var fp = localStorage.getItem(FP_KEY);
    if (!fp) { fp = generateFingerprint(); localStorage.setItem(FP_KEY, fp); }
    return fp;
  }

  function isFirstVisit() {
    if (localStorage.getItem(FV_KEY) === '1') return false;
    localStorage.setItem(FV_KEY, '1');
    return true;
  }

  function getVisitCount() {
    var vc = parseInt(localStorage.getItem(VC_KEY) || '0', 10);
    vc++;
    localStorage.setItem(VC_KEY, vc.toString());
    return vc;
  }

  function getVisitCategory(vc) {
    if (vc === 1) return 'new';
    if (vc <= 3) return 'returning';
    if (vc <= 10) return 'frequent';
    return 'loyal';
  }

  function getSessionId() {
    var sid = sessionStorage.getItem(SES_KEY);
    if (!sid) {
      sid = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
      sessionStorage.setItem(SES_KEY, sid);
    }
    return sid;
  }

  /* ===========================
     DEVICE & CONTEXT
     =========================== */

  function getDevice() {
    var ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
    if (/iPad|Tablet/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  function getBrowser() {
    var ua = navigator.userAgent;
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  }

  function getOS() {
    var ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
  }

  function getReferrer() {
    if (document.referrer) {
      try { return new URL(document.referrer).hostname; } catch (e) { return document.referrer.substring(0, 100); }
    }
    return 'direct';
  }

  function getDarkMode() {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }

  function getReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function getInputMethod() {
    if (navigator.maxTouchPoints > 0) return 'touch';
    if ('ontouchstart' in window) return 'touch';
    return 'mouse';
  }

  function detectAdBlocker() {
    try {
      var test = document.createElement('div');
      test.innerHTML = '&nbsp;';
      test.className = 'adsbox ad-banner ad-banner-top ad_placeholder ad_wrapper';
      test.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(test);
      var blocked = (test.offsetHeight === 0 || test.offsetParent === null || test.clientHeight === 0);
      document.body.removeChild(test);
      return blocked;
    } catch (e) { return false; }
  }

  /* --- Country Detection --- */
  var country = 'unknown';
  var city = 'unknown';
  var region = 'unknown';

  function detectCountry(callback) {
    var cached = localStorage.getItem(CTRY_KEY);
    var cachedTs = parseInt(localStorage.getItem(CTRY_TS) || '0', 10);

    if (cached && (Date.now() - cachedTs) < COUNTRY_CACHE_TTL) {
      country = cached;
      city = localStorage.getItem(CTRY_CITY_KEY) || 'unknown';
      callback(cached, city);
      return;
    }

    var apis = [
      {
        url: 'https://ipwho.is/',
        parse: function (d) {
          return { cc: d.country_code, city: d.city || 'unknown', region: d.region || 'unknown' };
        }
      },
      {
        url: 'https://ipapi.co/json/',
        parse: function (d) {
          return { cc: d.country_code, city: d.city || 'unknown', region: d.region || 'unknown' };
        }
      },
      {
        url: 'https://freeipapi.com/api/json',
        parse: function (d) {
          return { cc: d.countryCode, city: d.cityName || 'unknown', region: d.regionName || 'unknown' };
        }
      }
    ];

    function tryApi(index) {
      if (index >= apis.length) {
        country = cached || 'unknown';
        city = 'unknown';
        region = 'unknown';
        callback(country, city);
        return;
      }
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, GEO_TIMEOUT);
      fetch(apis[index].url, { signal: controller.signal })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          clearTimeout(timeoutId);
          try {
            var parsed = apis[index].parse(data);
            if (parsed.cc && parsed.cc.length === 2) {
              country = parsed.cc;
              city = parsed.city;
              region = parsed.region;
              localStorage.setItem(CTRY_KEY, country);
              localStorage.setItem(CTRY_CITY_KEY, city);
              localStorage.setItem(CTRY_TS, Date.now().toString());
              callback(country, city);
            } else {
              tryApi(index + 1);
            }
          } catch (ex) { tryApi(index + 1); }
        })
        .catch(function () {
          clearTimeout(timeoutId);
          tryApi(index + 1);
        });
    }
    tryApi(0);
  }

  /* ===========================
     PAGE & ROUTING
     =========================== */

  function pageName() {
    var h = location.hash.slice(1) || 'home';
    return h.split('/')[0];
  }

  function fullRoute() {
    return location.hash.slice(1) || 'home';
  }

  function todayKey() { return new Date().toISOString().split('T')[0]; }

  /* ===========================
     HEALTH MONITORING
     =========================== */

  var healthMetrics = {};

  function capturePerformanceMetrics() {
    var m = {};
    if (window.performance && performance.timing) {
      var t = performance.timing;
      var ns = t.navigationStart;
      if (t.loadEventEnd > 0) {
        m.loadTime = t.loadEventEnd - ns;
        m.domReady = t.domContentLoadedEventEnd - ns;
      }
      if (t.domainLookupEnd > 0) m.dnsTime = t.domainLookupEnd - t.domainLookupStart;
      if (t.connectEnd > 0) m.tcpTime = t.connectEnd - t.connectStart;
      if (t.responseStart > 0) m.ttfb = t.responseStart - t.requestStart;
      if (t.responseEnd > 0 && t.responseStart > 0) m.downloadTime = t.responseEnd - t.responseStart;
      if (t.secureConnectionStart > 0 && t.connectEnd > 0) m.sslTime = t.secureConnectionStart - t.connectStart;
    }
    if (navigator.connection) {
      var conn = navigator.connection;
      m.connectionType = conn.effectiveType || 'unknown';
      m.downlink = conn.downlink || 0;
      m.rtt = conn.rtt || 0;
      m.saveData = conn.saveData || false;
    }
    m.domNodes = document.querySelectorAll('*').length;
    m.viewportW = window.innerWidth;
    m.viewportH = window.innerHeight;
    m.pixelRatio = window.devicePixelRatio || 1;
    m.touchPoints = navigator.maxTouchPoints || 0;
    if (performance.memory) {
      m.memoryUsed = Math.round(performance.memory.usedJSHeapSize / 1048576);
      m.memoryTotal = Math.round(performance.memory.totalJSHeapSize / 1048576);
    }
    m.darkMode = getDarkMode();
    m.reducedMotion = getReducedMotion();
    m.inputMethod = getInputMethod();
    m.adBlocker = detectAdBlocker();
    m.online = navigator.onLine;
    m.cookiesEnabled = navigator.cookieEnabled;
    m.doNotTrack = navigator.doNotTrack === '1';
    m.pdfViewer = navigator.pdfViewerEnabled !== false;
    m.language = navigator.language;
    m.languages = (navigator.languages || []).slice(0, 5);
    healthMetrics = m;
    return m;
  }

  function observeModernMetrics() {
    if (!('PerformanceObserver' in window)) return;
    var td = todayKey();

    try {
      new PerformanceObserver(function (list) {
        if (!db) return;
        var entries = list.getEntries();
        var lcp = entries[entries.length - 1];
        healthMetrics.lcp = Math.round(lcp.startTime);
        safeTx('analytics/health/' + td + '/lcpSamples', 1);
        db.ref('analytics/health/' + td + '/lcpLatest').set(healthMetrics.lcp).catch(function () { });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { }

    try {
      var clsVal = 0;
      new PerformanceObserver(function (list) {
        if (!db) return;
        list.getEntries().forEach(function (entry) {
          if (!entry.hadRecentInput) clsVal += entry.value;
        });
        healthMetrics.cls = Math.round(clsVal * 1000);
        db.ref('analytics/health/' + td + '/clsLatest').set(healthMetrics.cls).catch(function () { });
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) { }

    try {
      new PerformanceObserver(function (list) {
        if (!db) return;
        list.getEntries().forEach(function (entry) {
          var dur = Math.round(entry.duration);
          healthMetrics.inp = Math.max(healthMetrics.inp || 0, dur);
          safeTx('analytics/health/' + td + '/interactionSamples', 1);
          db.ref('analytics/health/' + td + '/inpLatest').set(healthMetrics.inp).catch(function () { });
        });
      }).observe({ type: 'first-input', buffered: true });
    } catch (e) { }

    try {
      new PerformanceObserver(function (list) {
        if (!db) return;
        var count = list.getEntries().length;
        safeTx('analytics/health/' + td + '/longTasks', count);
      }).observe({ type: 'longtask', buffered: true });
    } catch (e) { }

    /* Paint timings (FCP) */
    try {
      var paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(function (entry) {
        if (entry.name === 'first-contentful-paint') {
          healthMetrics.fcp = Math.round(entry.startTime);
          db.ref('analytics/health/' + td + '/fcpLatest').set(healthMetrics.fcp).catch(function () { });
          safeTx('analytics/health/' + td + '/fcpSamples', 1);
        }
      });
    } catch (e) { }

    /* Navigation entries (more reliable than timing API) */
    try {
      var navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        var nav = navEntries[0];
        healthMetrics.transferSize = nav.transferSize || 0;
        healthMetrics.encodedBodySize = nav.encodedBodySize || 0;
        healthMetrics.decodedBodySize = nav.decodedBodySize || 0;
      }
    } catch (e) { }
  }

  function calculateHealthScore() {
    var score = 100;
    var m = healthMetrics;
    if (m.loadTime) {
      if (m.loadTime > 6000) score -= 30;
      else if (m.loadTime > 4000) score -= 22;
      else if (m.loadTime > 2500) score -= 12;
      else if (m.loadTime > 1500) score -= 5;
    }
    if (m.lcp) {
      if (m.lcp > 5000) score -= 25;
      else if (m.lcp > 3000) score -= 18;
      else if (m.lcp > 2000) score -= 8;
      else if (m.lcp > 1200) score -= 3;
    }
    if (m.cls !== undefined) {
      var clsR = m.cls / 1000;
      if (clsR > 0.25) score -= 20;
      else if (clsR > 0.1) score -= 12;
      else if (clsR > 0.05) score -= 4;
    }
    if (m.inp) {
      if (m.inp > 600) score -= 15;
      else if (m.inp > 300) score -= 10;
      else if (m.inp > 150) score -= 4;
    }
    if (m.ttfb) {
      if (m.ttfb > 1200) score -= 10;
      else if (m.ttfb > 600) score -= 6;
      else if (m.ttfb > 300) score -= 2;
    }
    return Math.max(0, Math.min(100, score));
  }

  function getHealthStatus(score) {
    if (score >= 80) return 'healthy';
    if (score >= 55) return 'degraded';
    return 'warning';
  }

  function writeHealthSnapshot() {
    if (!db) return;
    var td = todayKey();
    var metrics = capturePerformanceMetrics();
    var score = calculateHealthScore();
    var status = getHealthStatus(score);

    var snapshot = {};
    for (var k in metrics) { snapshot[k] = metrics[k]; }
    snapshot.pg = pageName();
    snapshot.fullRoute = fullRoute();
    snapshot.dev = getDevice();
    snapshot.brw = getBrowser();
    snapshot.os = getOS();
    snapshot.country = country;
    snapshot.city = city;
    snapshot.region = region;
    snapshot.ts = Date.now();
    snapshot.sid = sid;
    snapshot.score = score;
    snapshot.status = status;

    var pushKey = db.ref('analytics/health/' + td + '/snapshots').push().key;
    db.ref('analytics/health/' + td + '/snapshots/' + pushKey).set(snapshot).catch(function () { });

    db.ref('analytics/health/latest').set(snapshot).catch(function () { });
    db.ref('analytics/health/status').set(status).catch(function () { });
    db.ref('analytics/health/score').set(score).catch(function () { });

    safeTx('analytics/health/' + td + '/sessions', 1);

    if (metrics.loadTime) {
      db.ref('analytics/health/' + td + '/loadTimeSum').transaction(function (v) { return (v || 0) + metrics.loadTime; });
    }
    if (metrics.ttfb) {
      db.ref('analytics/health/' + td + '/ttfbSum').transaction(function (v) { return (v || 0) + metrics.ttfb; });
    }
    if (metrics.domReady) {
      db.ref('analytics/health/' + td + '/domReadySum').transaction(function (v) { return (v || 0) + metrics.domReady; });
    }
    if (metrics.transferSize) {
      db.ref('analytics/health/' + td + '/transferSizeSum').transaction(function (v) { return (v || 0) + metrics.transferSize; });
    }

    /* Connection type breakdown */
    if (metrics.connectionType && metrics.connectionType !== 'unknown') {
      safeTx('analytics/health/' + td + '/connections/' + metrics.connectionType, 1);
    }

    trimNode('analytics/health/' + td + '/snapshots', MAX_HEALTH_DETAILS);
  }

  function trackAllErrors() {
    window.addEventListener('error', function (e) {
      if (!db) return;
      var td = todayKey();

      if (!e.target || e.target === window) {
        /* --- JS Error --- */
        safeTx('analytics/health/' + td + '/errors', 1);
        var ref = db.ref('analytics/health/' + td + '/errorDetails').push();
        ref.set({
          msg: (e.message || 'Unknown error').substring(0, 300),
          file: (e.filename || '').substring(0, 150),
          line: e.lineno || 0,
          col: e.colno || 0,
          pg: pageName(),
          fullRoute: fullRoute(),
          dev: getDevice(),
          brw: getBrowser(),
          country: country,
          ts: Date.now()
        }).catch(function () { });
        trimNode('analytics/health/' + td + '/errorDetails', MAX_HEALTH_DETAILS);
      } else {
        /* --- Resource Error --- */
        safeTx('analytics/health/' + td + '/resourceErrors', 1);
        var src = '';
        var tag = (e.target.tagName || 'unknown').toLowerCase();
        if (tag === 'img') src = 'img:' + (e.target.src || '').substring(0, 200);
        else if (tag === 'script') src = 'script:' + (e.target.src || '').substring(0, 200);
        else if (tag === 'link') src = 'css:' + (e.target.href || '').substring(0, 200);
        else if (tag === 'video' || tag === 'audio' || tag === 'source') src = 'media:' + (e.target.src || '').substring(0, 200);
        else src = tag + ':' + ((e.target.src || e.target.href || '').substring(0, 200));

        var ref2 = db.ref('analytics/health/' + td + '/resourceErrorDetails').push();
        ref2.set({ src: src, tag: tag, pg: pageName(), country: country, ts: Date.now() }).catch(function () { });
        trimNode('analytics/health/' + td + '/resourceErrorDetails', MAX_HEALTH_DETAILS);
      }
    }, true);

    window.addEventListener('unhandledrejection', function (e) {
      if (!db) return;
      var td = todayKey();
      safeTx('analytics/health/' + td + '/unhandledRejections', 1);
      var reason = '';
      try { reason = String(e.reason).substring(0, 300); } catch (ex) { reason = 'Unknown'; }
      var ref = db.ref('analytics/health/' + td + '/rejectionDetails').push();
      ref.set({ reason: reason, pg: pageName(), country: country, ts: Date.now() }).catch(function () { });
      trimNode('analytics/health/' + td + '/rejectionDetails', MAX_HEALTH_DETAILS);
    });
  }

  /* ===========================
     BEHAVIOR TRACKING
     =========================== */

  var hasInteracted = false;
  var bounceRecorded = false;
  var sessionPageViews = 0;
  var sessionClicks = 0;
  var sessionSearches = 0;
  var sessionScrollMax = 0;
  var sessionStateChanges = 0;

  function markInteracted() { hasInteracted = true; }

  function trackScrollDepth() {
    var reported = {};
    var milestones = [25, 50, 75, 90, 100];
    var scrollTimer;

    window.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var st = window.pageYOffset || document.documentElement.scrollTop;
        var dh = document.documentElement.scrollHeight - window.innerHeight;
        var pct = dh > 0 ? Math.min(100, Math.round((st / dh) * 100)) : 0;
        milestones.forEach(function (m) {
          if (pct >= m && !reported[m]) {
            reported[m] = true;
            markInteracted();
            enqueue({ type: 'scroll', page: pageName(), depth: m });
          }
        });
      }, 150);
    }, { passive: true });
  }

  function trackStateChanges() {
    /* Detailed route changes */
    window.addEventListener('hashchange', function (e) {
      var from = 'unknown', to = 'unknown', fullFrom = '', fullTo = '';
      try {
        fullFrom = new URL(e.oldURL).hash.slice(1) || 'home';
        fullTo = new URL(e.newURL).hash.slice(1) || 'home';
        from = fullFrom.split('/')[0];
        to = fullTo.split('/')[0];
      } catch (ex) { }
      markInteracted();
      enqueue({ type: 'route_change', from: from, to: to, fullFrom: fullFrom, fullTo: fullTo });
    });

    /* localStorage state changes from other tabs */
    var ignoredKeys = [FP_KEY, SES_KEY, FV_KEY, VC_KEY, CTRY_KEY, CTRY_TS, CTRY_CITY_KEY];
    window.addEventListener('storage', function (e) {
      if (e.key && ignoredKeys.indexOf(e.key) === -1) {
        markInteracted();
        sessionStateChanges++;
        enqueue({
          type: 'state_change',
          key: e.key,
          oldValue: (e.oldValue || '').substring(0, 80),
          newValue: (e.newValue || '').substring(0, 80)
        });
      }
    });

    /* Tab visibility — track hidden time */
    var hiddenTime = 0;
    document.addEventListener('visibilitychange', function () {
      var now = Date.now();
      if (document.visibilityState === 'hidden') {
        hiddenTime = now;
        enqueue({ type: 'tab_hidden', page: pageName() });
      } else if (hiddenTime > 0) {
        var awayMs = now - hiddenTime;
        enqueue({ type: 'tab_visible', page: pageName(), awayMs: awayMs });
        if (awayMs > 1000 && db) {
          safeTx('analytics/daily/' + todayKey() + '/awayTime', Math.round(awayMs / 1000));
        }
        hiddenTime = 0;
      }
    });

    /* Orientation change */
    window.addEventListener('orientationchange', function () {
      var orient = 'unknown';
      try { orient = screen.orientation ? screen.orientation.type : (window.innerWidth > window.innerHeight ? 'landscape-primary' : 'portrait-primary'); } catch (ex) { }
      enqueue({ type: 'orientation', page: pageName(), orientation: orient });
    });

    /* Resize (debounced) */
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        enqueue({ type: 'resize', page: pageName(), w: window.innerWidth, h: window.innerHeight });
      }, 2000);
    });

    /* Online / Offline transitions */
    window.addEventListener('online', function () {
      enqueue({ type: 'connection_change', page: pageName(), status: 'online' });
    });
    window.addEventListener('offline', function () {
      enqueue({ type: 'connection_change', page: pageName(), status: 'offline' });
    });
  }

  function trackSearchQueries() {
    var searchTimers = {};

    document.addEventListener('input', function (e) {
      var el = e.target;
      if (!el) return;
      var isSearch = el.type === 'search' ||
        (el.placeholder && /search|بحث|chercher|بحث|buscar|rechercher|找/i.test(el.placeholder)) ||
        (el.name && /search|query|q|keyword/i.test(el.name)) ||
        (el.id && /search|query/i.test(el.id)) ||
        el.closest('.search-box, .search-bar, .search-container, [role="search"]');

      if (!isSearch) return;

      var elId = el.id || el.name || el.placeholder || 'search';
      clearTimeout(searchTimers[elId]);
      searchTimers[elId] = setTimeout(function () {
        var query = el.value.trim();
        if (query.length >= 2) {
          markInteracted();
          enqueue({ type: 'search', page: pageName(), query: query });
        }
      }, 1200);
    });

    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form) return;
      var input = form.querySelector(
        'input[type="search"], input[type="text"][name*="search"], ' +
        'input[type="text"][name*="q"], input[name*="search"], ' +
        'input[name*="query"], input[name*="keyword"]'
      );
      if (input && input.value.trim().length >= 2) {
        markInteracted();
        enqueue({ type: 'search_submit', page: pageName(), query: input.value.trim() });
      }
    });
  }

  function trackFormSubmissions() {
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form) return;
      var id = form.id || form.action || form.className || form.name || 'unknown';
      markInteracted();
      enqueue({ type: 'form_submit', page: pageName(), formId: id.substring(0, 80) });
    });
  }

  function trackExternalLinks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.href || '';

      var isExternal = href.startsWith('http') && !href.includes(location.hostname);
      var isDownload = link.hasAttribute('download') ||
        /\.(pdf|zip|rar|7z|doc|docx|xls|xlsx|ppt|pptx|csv|txt|exe|dmg|apk|mp[34]|wav|ogg|avi|mov)(\?|#|$)/i.test(href);
      var isMailto = href.startsWith('mailto:');
      var isTel = href.startsWith('tel:');

      if (isExternal) {
        markInteracted();
        enqueue({
          type: 'external_link',
          page: pageName(),
          url: href.substring(0, 250),
          label: (link.textContent || '').trim().substring(0, 80)
        });
      }
      if (isDownload) {
        markInteracted();
        enqueue({
          type: 'download',
          page: pageName(),
          url: href.substring(0, 250),
          label: (link.textContent || '').trim().substring(0, 80)
        });
      }
      if (isMailto) {
        markInteracted();
        enqueue({
          type: 'mailto',
          page: pageName(),
          email: href.replace('mailto:', '').substring(0, 80)
        });
      }
      if (isTel) {
        markInteracted();
        enqueue({
          type: 'tel_click',
          page: pageName(),
          phone: href.replace('tel:', '').substring(0, 30)
        });
      }
    });
  }

  function detectBounce() {
    window.addEventListener('beforeunload', function () {
      if (bounceRecorded) return;
      var elapsed = Date.now() - startTs;
      if (elapsed < 5000 && !hasInteracted) {
        bounceRecorded = true;
        if (db) safeTx('analytics/daily/' + todayKey() + '/bounces', 1);
      }
    });
  }

  /* ===========================
     QUEUE & FLUSH ENGINE
     =========================== */

  var db = null;
  var fp = null;
  var sid = null;
  var startTs = 0;
  var flushed = false;
  var visitTracked = false;
  var presRef = null;
  var eventQueue = [];
  var flushTimer = null;
  var clickFlushTimer = null;

  function enqueue(event) {
    eventQueue.push({
      ts: Date.now(),
      fp: fp,
      sid: sid,
      dev: getDevice(),
      brw: getBrowser(),
      os: getOS(),
      scr: screen.width + 'x' + screen.height,
      ref: getReferrer(),
      country: country,
      city: city,
      type: event.type,
      page: event.page,
      label: event.label || '',
      depth: event.depth,
      from: event.from,
      to: event.to,
      fullFrom: event.fullFrom || '',
      fullTo: event.fullTo || '',
      key: event.key || '',
      oldValue: event.oldValue || '',
      newValue: event.newValue || '',
      query: event.query || '',
      formId: event.formId || '',
      url: event.url || '',
      email: event.email || '',
      phone: event.phone || '',
      awayMs: event.awayMs || 0,
      orientation: event.orientation || '',
      w: event.w || 0,
      h: event.h || 0,
      status: event.status || '',
      isNew: event.isNew || false,
      visitCount: event.visitCount || 0,
      eventType: event.eventType || '',
      data: event.data || {}
    });
    if (eventQueue.length >= MAX_QUEUE) flushQueue();
  }

  function safeTx(path, delta) {
    if (!db) return;
    try { db.ref(path).transaction(function (v) { return (v || 0) + delta; }); } catch (e) { }
  }

  function trimNode(nodePath, max) {
    if (!db) return;
    db.ref(nodePath).orderByKey().limitToFirst(max + 100).once('value').then(function (snap) {
      var data = snap.val();
      if (data) {
        var keys = Object.keys(data);
        if (keys.length > max) {
          var toRemove = keys.slice(0, keys.length - max);
          var deletes = {};
          toRemove.forEach(function (k) { deletes[nodePath + '/' + k] = null; });
          db.ref().update(deletes).catch(function () { });
        }
      }
    }).catch(function () { });
  }

  function computeEngagementScore() {
    var timePts = Math.min(30, Math.floor((Date.now() - startTs) / 6000));
    var viewsPts = Math.min(20, sessionPageViews * 5);
    var clicksPts = Math.min(20, sessionClicks * 2);
    var scrollPts = Math.min(15, Math.floor(sessionScrollMax / 100 * 15));
    var searchPts = Math.min(10, sessionSearches * 5);
    var statePts = Math.min(5, sessionStateChanges);
    return Math.min(100, timePts + viewsPts + clicksPts + scrollPts + searchPts + statePts);
  }

  function flushQueue() {
    if (!db || eventQueue.length === 0) return;
    var batch = eventQueue.splice(0, eventQueue.length);
    var td = todayKey();

    /* --- Aggregate --- */
    var views = 0, clickCount = 0, routeChanges = 0, formSubmits = 0;
    var externalLinks = 0, downloads = 0, mailtos = 0, telClicks = 0;
    var tabHides = 0, connChanges = 0;
    var pageViews = {}, pageClicks = {}, clickDetails = [];
    var referrers = {}, devices = {}, browsers = {};
    var scrollCounts = {}, stateChangeKeys = {}, searchQueries = {};
    var customEvents = {}, orientations = {};
    var routeFlows = {};

    batch.forEach(function (ev) {
      switch (ev.type) {
        case 'view':
          views++; sessionPageViews++;
          pageViews[ev.page] = (pageViews[ev.page] || 0) + 1;
          break;
        case 'click':
          clickCount++; sessionClicks++;
          pageClicks[ev.page] = (pageClicks[ev.page] || 0) + 1;
          if (clickDetails.length < 20) {
            clickDetails.push({
              page: ev.page, label: ev.label.substring(0, 80),
              dev: ev.dev, brw: ev.brw, country: ev.country, ts: ev.ts
            });
          }
          break;
        case 'scroll':
          var dk = ev.depth + '%';
          scrollCounts[dk] = (scrollCounts[dk] || 0) + 1;
          sessionScrollMax = Math.max(sessionScrollMax, ev.depth);
          break;
        case 'route_change':
          routeChanges++;
          if (ev.from && ev.to) {
            var flowKey = ev.from + ' → ' + ev.to;
            routeFlows[flowKey] = (routeFlows[flowKey] || 0) + 1;
          }
          break;
        case 'state_change':
          stateChangeKeys[ev.key] = (stateChangeKeys[ev.key] || 0) + 1;
          break;
        case 'search': case 'search_submit':
          var q = ev.query.toLowerCase().trim().substring(0, 60);
          if (q) { searchQueries[q] = (searchQueries[q] || 0) + 1; sessionSearches++; }
          break;
        case 'form_submit':
          formSubmits++;
          break;
        case 'external_link':
          externalLinks++;
          break;
        case 'download':
          downloads++;
          break;
        case 'mailto':
          mailtos++;
          break;
        case 'tel_click':
          telClicks++;
          break;
        case 'custom':
          var cKey = ev.eventType + (ev.label ? '/' + ev.label : '');
          customEvents[cKey] = (customEvents[cKey] || 0) + 1;
          break;
        case 'tab_hidden':
          tabHides++;
          break;
        case 'connection_change':
          connChanges++;
          break;
        case 'orientation':
          orientations[ev.orientation] = (orientations[ev.orientation] || 0) + 1;
          break;
      }
      if (ev.ref) referrers[ev.ref] = (referrers[ev.ref] || 0) + 1;
      devices[ev.dev] = (devices[ev.dev] || 0) + 1;
      browsers[ev.brw] = (browsers[ev.brw] || 0) + 1;
    });

    /* --- Non-counter updates --- */
    var updates = {};
    var dur = Math.round((Date.now() - startTs) / 1000);
    if (dur >= 2) {
      updates['analytics/daily/' + td + '/duration'] = dur;
      safeTx('analytics/daily/' + td + '/sessions', 1);
    }
    updates['analytics/daily/' + td + '/engagement'] = computeEngagementScore();

    clickDetails.forEach(function (ev) {
      var pk = db.ref('analytics/recent').push().key;
      updates['analytics/recent/' + pk] = ev;
    });

    if (Object.keys(updates).length > 0) {
      db.ref().update(updates).catch(function () { });
    }

    /* --- Transaction counters --- */
    if (views > 0) safeTx('analytics/daily/' + td + '/views', views);
    if (clickCount > 0) safeTx('analytics/daily/' + td + '/clicks', clickCount);
    if (routeChanges > 0) safeTx('analytics/daily/' + td + '/routeChanges', routeChanges);
    if (formSubmits > 0) safeTx('analytics/daily/' + td + '/formSubmits', formSubmits);
    if (externalLinks > 0) safeTx('analytics/daily/' + td + '/externalLinks', externalLinks);
    if (downloads > 0) safeTx('analytics/daily/' + td + '/downloads', downloads);
    if (mailtos > 0) safeTx('analytics/daily/' + td + '/mailtos', mailtos);
    if (telClicks > 0) safeTx('analytics/daily/' + td + '/telClicks', telClicks);
    if (tabHides > 0) safeTx('analytics/daily/' + td + '/tabHides', tabHides);
    if (connChanges > 0) safeTx('analytics/daily/' + td + '/connectionChanges', connChanges);

    /* Page-level */
    for (var pg in pageViews) safeTx('analytics/pages/' + pg + '/views', pageViews[pg]);
    for (var pg2 in pageClicks) safeTx('analytics/pages/' + pg2 + '/clicks', pageClicks[pg2]);

    /* Scroll depth */
    for (var dk in scrollCounts) safeTx('analytics/daily/' + td + '/scroll/' + dk, scrollCounts[dk]);

    /* Route flows */
    for (var rf in routeFlows) safeTx('analytics/routeFlows/' + rf, routeFlows[rf]);

    /* Referrers, devices, browsers */
    for (var ref in referrers) safeTx('analytics/referrers/' + ref, referrers[ref]);
    for (var dev in devices) safeTx('analytics/devices/' + dev, devices[dev]);
    for (var brw in browsers) safeTx('analytics/browsers/' + brw, browsers[brw]);

    /* Countries & cities */
    if (country !== 'unknown') {
      safeTx('analytics/countries/' + country, 1);
      safeTx('analytics/daily/' + td + '/countries/' + country, 1);
    }
    if (city !== 'unknown' && country !== 'unknown') {
      safeTx('analytics/cities/' + country + '/' + city, 1);
    }
    if (region !== 'unknown' && country !== 'unknown') {
      safeTx('analytics/regions/' + country + '/' + region, 1);
    }

    /* State changes */
    for (var sk in stateChangeKeys) safeTx('analytics/stateChanges/' + sk, stateChangeKeys[sk]);

    /* Search queries */
    for (var sq in searchQueries) safeTx('analytics/searches/' + sq, searchQueries[sq]);

    /* Custom events */
    for (var ce in customEvents) safeTx('analytics/events/' + ce, customEvents[ce]);

    /* Orientations */
    for (var oo in orientations) safeTx('analytics/orientations/' + oo, orientations[oo]);

    /* Prune */
    trimNode('analytics/recent', MAX_RECENT);
  }

  function trackVisit(isNew, visitCount) {
    if (!db || visitTracked) return;
    visitTracked = true;
    var pg = pageName();
    var td = todayKey();
    var visitCat = getVisitCategory(visitCount);

    var dk = 'adv_' + td + '_' + fp;
    if (!sessionStorage.getItem(dk)) {
      sessionStorage.setItem(dk, '1');
      safeTx('analytics/daily/' + td + '/visitors', 1);
      safeTx('analytics/daily/' + td + '/' + (isNew ? 'newVisitors' : 'returningVisitors'), 1);
      safeTx('analytics/daily/' + td + '/visitCategories/' + visitCat, 1);
    }

    var pk = 'apv_' + pg + '_' + fp;
    if (!sessionStorage.getItem(pk)) {
      sessionStorage.setItem(pk, '1');
      safeTx('analytics/pages/' + pg + '/visitors', 1);
    }

    if (country !== 'unknown') {
      var ck = 'ac_' + country + '_' + fp;
      if (!sessionStorage.getItem(ck)) {
        sessionStorage.setItem(ck, '1');
        safeTx('analytics/countryVisitors/' + country, 1);
      }
    }

    /* Dark mode tracking */
    if (getDarkMode()) safeTx('analytics/daily/' + td + '/darkModeUsers', 1);
    if (getReducedMotion()) safeTx('analytics/daily/' + td + '/reducedMotionUsers', 1);

    /* Input method tracking */
    safeTx('analytics/daily/' + td + '/inputMethods/' + getInputMethod(), 1);

    /* Ad blocker tracking */
    if (detectAdBlocker()) safeTx('analytics/daily/' + td + '/adBlockerUsers', 1);

    /* Language tracking */
    var lang = (navigator.language || 'unknown').split('-')[0];
    safeTx('analytics/daily/' + td + '/languages/' + lang, 1);

    if (isNew) {
      db.ref('analytics/fingerprints/' + fp).set({
        firstSeen: Date.now(),
        dev: getDevice(),
        brw: getBrowser(),
        os: getOS(),
        scr: screen.width + 'x' + screen.height,
        ref: getReferrer(),
        country: country,
        city: city,
        region: region,
        lang: navigator.language,
        darkMode: getDarkMode(),
        inputMethod: getInputMethod(),
        adBlocker: detectAdBlocker()
      }).catch(function () { });
    }

    safeTx('analytics/visitFrequency/' + visitCat, 1);
    enqueue({ type: 'view', page: pg, isNew: isNew, visitCount: visitCount });
  }

  function flush() {
    if (!db || flushed) return;
    flushed = true;
    flushQueue();
  }

  /* ===========================
     PRESENCE
     =========================== */

  function setupPresence() {
    if (!db || presRef) return;
    presRef = db.ref('analytics/live/' + fp);
    presRef.onDisconnect().remove();
    presRef.set({
      pg: pageName(),
      fullRoute: fullRoute(),
      dev: getDevice(),
      brw: getBrowser(),
      country: country,
      city: city,
      t: Date.now()
    });
    var hb = setInterval(function () {
      try { presRef.update({ pg: pageName(), fullRoute: fullRoute(), t: Date.now() }); }
      catch (e) { clearInterval(hb); }
    }, HEARTBEAT_INTERVAL);
    window.addEventListener('hashchange', function () {
      try { presRef.update({ pg: pageName(), fullRoute: fullRoute(), t: Date.now() }); }
      catch (e) { }
    });
  }

  /* ===========================
     PUBLIC API
     =========================== */

  function trackEvent(eventType, label, data) {
    markInteracted();
    enqueue({ type: 'custom', eventType: eventType, label: label || '', data: data || {} });
  }

  /* Expose getters for health dashboard */
  function getHealthMetrics() { return healthMetrics; }
  function getCountry() { return country; }
  function getCity() { return city; }

  /* ===========================
     INIT
     =========================== */

  function init(analyticsDb) {
    db = analyticsDb;
    if (!db) return;
    fp = getFingerprint();
    sid = getSessionId();
    var isNew = isFirstVisit();
    var visitCount = getVisitCount();
    startTs = Date.now();

    /* Country detection (non-blocking) */
    detectCountry(function (cc, c) {
      country = cc;
      city = c;
      trackVisit(isNew, visitCount);
      setupPresence();
    });

    /* Fallback if geo takes too long */
    setTimeout(function () {
      if (!visitTracked) {
        trackVisit(isNew, visitCount);
        setupPresence();
      }
    }, 4500);

    /* Click tracking — expanded selectors */
    document.addEventListener('click', function (e) {
      var el = e.target.closest(
        'button, a, .artwork-card, .artist-profile-card, .nav-link, ' +
        '.btn, [role="button"], .search-view-btn, .dropdown-item, .tab, ' +
        '.filter-btn, .sort-btn, .toggle, .accordion-trigger, .carousel-btn, ' +
        '.modal-trigger, .close-btn, .menu-item, .breadcrumb-item, ' +
        '.pagination-btn, .share-btn, .favorite-btn, .like-btn, ' +
        '.comment-btn, .play-btn, .zoom-btn, .expand-btn, ' +
        '[data-action], [data-id], [data-artwork-id], [data-artist], ' +
        '[data-page], [data-tab], [data-curr], [data-lang], ' +
        '[data-filter], [data-sort], [data-category]'
      );
      if (!el) return;

      markInteracted();
      sessionClicks++;

      var lbl = '';
      if (el.dataset.action) lbl = 'action:' + el.dataset.action;
      else if (el.dataset.id) lbl = el.dataset.id;
      else if (el.dataset.artworkId) lbl = el.dataset.artworkId;
      else if (el.dataset.artist) lbl = el.dataset.artist;
      else if (el.dataset.page) lbl = el.dataset.page;
      else if (el.dataset.tab) lbl = 'tab:' + el.dataset.tab;
      else if (el.dataset.curr) lbl = 'currency:' + el.dataset.curr;
      else if (el.dataset.lang) lbl = 'lang:' + el.dataset.lang;
      else if (el.dataset.filter) lbl = 'filter:' + el.dataset.filter;
      else if (el.dataset.sort) lbl = 'sort:' + el.dataset.sort;
      else if (el.dataset.category) lbl = 'category:' + el.dataset.category;
      else if (el.getAttribute('aria-label')) lbl = el.getAttribute('aria-label');
      else if (el.textContent) lbl = el.textContent.trim().substring(0, 80);
      if (!lbl) lbl = el.tagName.toLowerCase();

      enqueue({ type: 'click', page: pageName(), label: lbl });
      clearTimeout(clickFlushTimer);
      clickFlushTimer = setTimeout(flushQueue, CLICK_FLUSH_DELAY);
    });

    /* Setup all tracking modules */
    trackScrollDepth();
    trackStateChanges();
    trackSearchQueries();
    trackFormSubmissions();
    trackExternalLinks();
    trackAllErrors();
    detectBounce();

    /* Performance & health */
    observeModernMetrics();
    if (document.readyState === 'complete') {
      setTimeout(writeHealthSnapshot, 600);
    } else {
      window.addEventListener('load', function () { setTimeout(writeHealthSnapshot, 600); });
    }

    /* Periodic health recheck */
    setInterval(function () {
      if (db) {
        var sc = calculateHealthScore();
        db.ref('analytics/health/score').set(sc).catch(function () { });
        db.ref('analytics/health/status').set(getHealthStatus(sc)).catch(function () { });
      }
    }, HEALTH_RECHECK);

    /* Flush timers */
    flushTimer = setInterval(flushQueue, FLUSH_INTERVAL);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushQueue();
    });
  }

  return {
    init: init,
    trackEvent: trackEvent,
    getHealthMetrics: getHealthMetrics,
    getCountry: getCountry,
    getCity: getCity
  };
})();

/* ============================================
   MESSAGE INBOX SYSTEM
   Threads stored under user's sanitized email
   Both buyer & artist get their own copy
   ============================================ */
const MessageInbox = (function () {
  const MSG_PATH = 'user_messages';
  let activeThreadKey = null;
  let activeThreadRef = null;
  let unreadListenerAttached = false;

  /* --- Helpers --- */
  function sanitizeEmail(email) {
    if (!email) return 'unknown';
    return email.replace(/\./g, '_dot_').replace(/@/g, '_at_')
      .replace(/#/g, '_hash_').replace(/\[/g, '_lb_')
      .replace(/\]/g, '_rb_').replace(/\//g, '_slash_')
      .replace(/%/g, '_pct_').replace(/\$/g, '_dollar_')
      .replace(/\{/g, '_lc_').replace(/\}/g, '_rc_')
      .replace(/\./g, '_dot_');
  }

  function getUserEmail() {
    if (!auth || !auth.currentUser) return null;
    return auth.currentUser.email;
  }

  function getUserName() {
    if (!auth || !auth.currentUser) return 'User';
    return auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User';
  }

  /* Same thread key for both buyer and artist */
  function makeThreadKey(email1, email2, artworkId) {
    const s = [sanitizeEmail(email1 || 'unknown'), sanitizeEmail(email2 || 'unknown')].sort();
    return s[0] + '___' + s[1] + '___' + (artworkId || 'none');
  }

  function formatMsgTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /* Find artist email from their about data in Firebase */
   async function findArtistEmail(userId) {
    if (!userId || !authDb) return null;
    try {
      /* First check the about section */
      const aboutSnap = await authDb.ref('user_information/' + userId + '/about').once('value');
      const aboutData = aboutSnap.val();
      if (aboutData && (aboutData.email || aboutData.emailAddress)) {
        return aboutData.email || aboutData.emailAddress;
      }
      /* Fallback: check top-level user profile */
      const userSnap = await authDb.ref('user_information/' + userId).once('value');
      const userData = userSnap.val();
      if (userData && (userData.email || userData.emailAddress)) {
        return userData.email || userData.emailAddress;
      }
      return null;
    } catch (e) { return null; }
  }

  /* ======================================================
     SEND ORDER — Creates message thread for both parties
     ====================================================== */
  async function sendOrder(artwork, formData) {
    const myEmail = getUserEmail();
    if (!myEmail) throw new Error('Not logged in');

    const myName = getUserName();
    const artistEmail = await findArtistEmail(artwork._source);
    const images = getArtworkImages(artwork);
    const threadKey = makeThreadKey(myEmail, artistEmail, artwork.id);
    const msgKey = Date.now();

    const firstMsg = {
      senderEmail: myEmail,
      senderName: myName,
      text: formData.message || 'I\'m interested in "' + (artwork.title || 'this artwork') + '"',
      type: 'order',
      orderPhone: formData.phone || '',
      createdAt: msgKey
    };

    const buyerInfo = {
      buyerEmail: myEmail,
      buyerName: myName,
      otherParticipantEmail: artistEmail || '',
      otherParticipantName: artwork.artistName || 'Artist',
      artworkTitle: artwork.title || '',
      artworkId: artwork.id,
      artworkImage: images[0] || '',
      artworkPrice: artwork.price || 0,
      artworkCurrency: artwork.currency || 'UGX',
      orderStatus: 'pending',
      lastMessage: firstMsg.text,
      lastMessageAt: msgKey,
      unreadCount: 0
    };

    const updates = {};

    /* Thread under BUYER's email */
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info'] = buyerInfo;
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/messages/' + msgKey] = firstMsg;

    /* Thread under ARTIST's email (if found) */
    if (artistEmail) {
      const artistInfo = Object.assign({}, buyerInfo);
      artistInfo.otherParticipantEmail = myEmail;
      artistInfo.otherParticipantName = myName;
      artistInfo.unreadCount = 1; /* Artist has 1 unread */

      updates[MSG_PATH + '/' + sanitizeEmail(artistEmail) + '/threads/' + threadKey + '/info'] = artistInfo;
      updates[MSG_PATH + '/' + sanitizeEmail(artistEmail) + '/threads/' + threadKey + '/messages/' + msgKey] = firstMsg;
    }

    /* Also store in legacy orders path for backward compat */
    if (artwork._source && authDb) {
      const orderPushKey = authDb.ref('user_information/' + artwork._source + '/orders').push().key;
      updates['user_information/' + artwork._source + '/orders/' + orderPushKey] = {
        clientName: myName,
        clientEmail: myEmail,
        clientPhone: formData.phone || '',
        clientMessage: formData.message || '',
        artworkTitle: artwork.title,
        artworkId: artwork.id,
        artworkPrice: artwork.price,
        artworkCurrency: artwork.currency || 'UGX',
        status: 'pending',
        threadKey: threadKey,
        createdAt: msgKey
      };
    }

    await authDb.ref().update(updates);
    return threadKey;
  }

  /* ======================================================
     MARK THREAD AS READ
     ====================================================== */
  async function markThreadRead(threadKey) {
    const email = getUserEmail();
    if (!email || !authDb) return;
    try {
      await authDb.ref(MSG_PATH + '/' + sanitizeEmail(email) + '/threads/' + threadKey + '/info/unreadCount').set(0);
    } catch (e) { /* silent */ }
    updateMsgBadge();
  }

  /* ======================================================
     SEND REPLY — Adds message to both threads
     ====================================================== */
  async function sendReply(threadKey, text) {
    const myEmail = getUserEmail();
    if (!myEmail || !text.trim() || !authDb) return;

    const myName = getUserName();
    const msgKey = Date.now();

    const replyMsg = {
      senderEmail: myEmail,
      senderName: myName,
      text: text.trim(),
      type: 'reply',
      createdAt: msgKey
    };

    /* Get thread info to find the other participant */
    const snap = await authDb.ref(MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info').once('value');
    const info = snap.val();
    if (!info) return;

    const otherEmail = info.otherParticipantEmail;
    const updates = {};

    /* Add to my thread */
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/messages/' + msgKey] = replyMsg;
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info/lastMessage'] = replyMsg.text;
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info/lastMessageAt'] = msgKey;

    /* Add to other participant's thread */
    if (otherEmail) {
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/messages/' + msgKey] = replyMsg;
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/info/lastMessage'] = replyMsg.text;
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/info/lastMessageAt'] = msgKey;
      /* Increment their unread count */
      const otherUnread = (info._otherUnread || 0) + 1;
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/info/unreadCount'] = otherUnread;
    }

    await authDb.ref().update(updates);
  }

  /* ======================================================
     UPDATE ORDER STATUS (Accept / Reject)
     ====================================================== */
  async function updateStatus(threadKey, newStatus) {
    const myEmail = getUserEmail();
    if (!myEmail || !authDb) return;

    const snap = await authDb.ref(MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info').once('value');
    const info = snap.val();
    if (!info) return;

    const otherEmail = info.otherParticipantEmail;
    const msgKey = Date.now();
    const statusLabel = newStatus === 'accepted' ? 'Order Accepted' : 'Order Rejected';
    const statusMsg = {
      senderEmail: myEmail,
      senderName: getUserName(),
      text: statusLabel,
      type: 'status_change',
      newStatus: newStatus,
      createdAt: msgKey
    };

    const updates = {};

    /* Update my thread */
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info/orderStatus'] = newStatus;
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info/lastMessage'] = statusLabel;
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/info/lastMessageAt'] = msgKey;
    updates[MSG_PATH + '/' + sanitizeEmail(myEmail) + '/threads/' + threadKey + '/messages/' + msgKey] = statusMsg;

    /* Update other participant's thread */
    if (otherEmail) {
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/info/orderStatus'] = newStatus;
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/info/lastMessage'] = statusLabel;
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/info/lastMessageAt'] = msgKey;
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/messages/' + msgKey] = statusMsg;
      /* Increment unread */
      updates[MSG_PATH + '/' + sanitizeEmail(otherEmail) + '/threads/' + threadKey + '/info/unreadCount'] = (info._otherUnread || 0) + 1;
    }

    /* Update legacy order status if artwork source exists */
    if (info.artworkId) {
      const artworkIdParts = info.artworkId.split(':');
      if (artworkIdParts.length === 2) {
        const userId = artworkIdParts[0];
        updates['user_information/' + userId + '/orders_status/' + threadKey] = { status: newStatus, updatedAt: msgKey };
      }
    }

    await authDb.ref().update(updates);
  }

  /* ======================================================
     RENDER INBOX LIST
     ====================================================== */
  async function renderInbox() {
    const email = getUserEmail();
    const loginPrompt = document.getElementById('messagesLoginPrompt');
    const inboxView = document.getElementById('messagesInboxView');
    const emptyEl = document.getElementById('msgEmpty');
    const listEl = document.getElementById('msgInboxList');

    if (!email) {
      loginPrompt?.classList.remove('hidden');
      inboxView?.classList.add('hidden');
      document.getElementById('msgThreadView')?.classList.add('hidden');
      lucide.createIcons({ nodes: [loginPrompt] });
      document.getElementById('msgLoginBtn')?.addEventListener('click', () => {
        const m = document.getElementById('authModal');
        if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
      });
      return;
    }

    loginPrompt?.classList.add('hidden');
    inboxView?.classList.remove('hidden');
    document.getElementById('msgThreadView')?.classList.add('hidden');
    listEl.innerHTML = '';
    emptyEl?.classList.add('hidden');

    try {
      const snap = await authDb.ref(MSG_PATH + '/' + sanitizeEmail(email) + '/threads').once('value');
      const threads = snap.val();

      if (!threads) {
        emptyEl?.classList.remove('hidden');
        lucide.createIcons({ nodes: [emptyEl] });
        return;
      }

      const searchQ = (document.getElementById('msgSearchInput')?.value || '').toLowerCase().trim();
      const statusQ = document.getElementById('msgStatusFilter')?.value || '';

      /* Convert to array and sort by lastMessageAt descending */
      const threadArr = [];
      Object.entries(threads).forEach(([key, data]) => {
        if (!data || !data.info) return;
        const info = data.info;
        /* Apply filters */
        if (statusQ && info.orderStatus !== statusQ) return;
        if (searchQ) {
          const haystack = (info.artworkTitle + ' ' + info.otherParticipantName + ' ' + info.lastMessage).toLowerCase();
          if (!haystack.includes(searchQ)) return;
        }
        /* Count actual messages */
        const msgCount = data.messages ? Object.keys(data.messages).length : 0;
        threadArr.push({ key, info, msgCount });
      });

      threadArr.sort((a, b) => (b.info.lastMessageAt || 0) - (a.info.lastMessageAt || 0));

      if (threadArr.length === 0) {
        emptyEl?.classList.remove('hidden');
        lucide.createIcons({ nodes: [emptyEl] });
        return;
      }

      listEl.innerHTML = threadArr.map(t => {
        const info = t.info;
        const isUnread = (info.unreadCount || 0) > 0;
        const statusCls = info.orderStatus || 'pending';
        const statusLabel = statusCls.charAt(0).toUpperCase() + statusCls.slice(1);
        const imgHtml = info.artworkImage
          ? '<div class="msg-thread-card-img"><img src="' + escapeHtml(info.artworkImage) + '" alt="" decoding="async"></div>'
          : '';

        return '<div class="msg-thread-card' + (isUnread ? ' msg-unread' : '') + '" data-thread-key="' + escapeHtml(t.key) + '" tabindex="0" role="button">'
          + imgHtml
          + '<div class="msg-thread-card-body">'
          + '<div class="msg-thread-card-top">'
          + '<span class="msg-thread-card-title">' + escapeHtml(info.artworkTitle || 'Untitled') + '</span>'
          + '<span class="msg-thread-card-time">' + formatMsgTime(info.lastMessageAt) + '</span>'
          + '</div>'
          + '<div class="msg-thread-card-subtitle">' + escapeHtml(info.lastMessage || '') + '</div>'
          + '<div class="msg-thread-card-meta">'
          + '<span style="font-size:0.8rem;color:var(--muted);">' + escapeHtml(info.otherParticipantName || 'Unknown') + ' · ' + t.msgCount + ' msg' + (t.msgCount !== 1 ? 's' : '') + '</span>'
          + (info.artworkPrice ? '<span class="msg-thread-card-price" data-base-price="' + info.artworkPrice + '" data-base-currency="' + (info.artworkCurrency || 'UGX') + '">' + formatPrice(info.artworkPrice, info.artworkCurrency) + '</span>' : '')
          + '<span class="msg-status-badge ' + statusCls + '">' + statusLabel + '</span>'
          + (isUnread ? '<span class="msg-unread-dot"></span>' : '')
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('');

      lucide.createIcons({ nodes: [listEl] });

      /* Attach click listeners */
      listEl.querySelectorAll('.msg-thread-card').forEach(card => {
        const handler = () => openThread(card.dataset.threadKey);
        card.addEventListener('click', handler);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(); });
      });

      /* Update currency formatting on prices */
      updateAllPrices();

    } catch (err) {
      console.warn('Failed to load messages:', err);
      listEl.innerHTML = '<div class="gallery-empty" style="grid-column:1/-1;"><p>Failed to load messages.</p></div>';
    }
  }

  /* ======================================================
     OPEN THREAD DETAIL VIEW
     ====================================================== */
  function openThread(threadKey) {
    activeThreadKey = threadKey;
    document.getElementById('messagesInboxView')?.classList.add('hidden');
    document.getElementById('messagesLoginPrompt')?.classList.add('hidden');
    document.getElementById('msgThreadView')?.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });

    /* Mark as read */
    markThreadRead(threadKey);

    /* Load thread data */
    loadThreadData(threadKey);

    /* Attach listeners */
    document.getElementById('msgThreadBack')?.addEventListener('click', () => {
      detachThreadListener();
      renderInbox();
    });

    document.getElementById('msgReplyForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('msgReplyInput');
      const btn = document.getElementById('msgReplyBtn');
      const text = input?.value?.trim();
      if (!text) return;
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await sendReply(threadKey, text);
        input.value = '';
        showToast('Reply sent', 'success');
      } catch (err) {
        showToast('Failed to send reply', 'error');
      }
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;"></i> Send Reply';
      lucide.createIcons({ nodes: [btn] });
    });
  }

  /* ======================================================
     LOAD THREAD DATA (real-time listener)
     ====================================================== */
  function loadThreadData(threadKey) {
    const email = getUserEmail();
    if (!email || !authDb) return;

    detachThreadListener();

    const ref = authDb.ref(MSG_PATH + '/' + sanitizeEmail(email) + '/threads/' + threadKey);
    activeThreadRef = ref;

    ref.on('value', (snap) => {
      const data = snap.val();
      if (!data) {
        document.getElementById('msgThreadHeader').innerHTML = '<p style="color:var(--muted);">Thread not found.</p>';
        document.getElementById('msgThreadMessages').innerHTML = '';
        return;
      }

      const info = data.info || {};
      const messages = data.messages || {};

      renderThreadHeader(info);
      renderThreadMessages(messages, info);
    });
  }

  function detachThreadListener() {
    if (activeThreadRef) {
      activeThreadRef.off('value');
      activeThreadRef = null;
    }
  }

  /* ======================================================
     RENDER THREAD HEADER
     ====================================================== */
  function renderThreadHeader(info) {
    const header = document.getElementById('msgThreadHeader');
    if (!header) return;

    const statusCls = info.orderStatus || 'pending';
    const statusLabel = statusCls.charAt(0).toUpperCase() + statusCls.slice(1);

    header.innerHTML = '<div class="msg-thread-header-card">'
      + (info.artworkImage ? '<div class="msg-thread-header-img"><img src="' + escapeHtml(info.artworkImage) + '" alt="" decoding="async"></div>' : '')
      + '<div class="msg-thread-header-info">'
      + '<h2 class="msg-thread-header-title">' + escapeHtml(info.artworkTitle || 'Untitled') + '</h2>'
      + '<p class="msg-thread-header-artist">by ' + escapeHtml(info.otherParticipantName || 'Artist') + '</p>'
      + (info.artworkPrice ? '<p class="msg-thread-header-price" data-base-price="' + info.artworkPrice + '" data-base-currency="' + (info.artworkCurrency || 'UGX') + '">' + formatPrice(info.artworkPrice, info.artworkCurrency) + '</p>' : '')
      + '<p class="msg-thread-header-participant"><i data-lucide="user" style="width:14px;height:14px;"></i> ' + escapeHtml(info.otherParticipantEmail || 'No email') + '</p>'
      + '<div style="margin-top:0.5rem;"><span class="msg-status-badge ' + statusCls + '">' + statusLabel + '</span></div>'
      + '</div>'
      + '</div>';

    lucide.createIcons({ nodes: [header] });
    updateAllPrices();

    /* Render status actions (only for the artist = non-buyer) */
    renderStatusActions(info);
  }

  /* ======================================================
     RENDER STATUS ACTIONS (Accept/Reject for artist)
     ====================================================== */
  function renderStatusActions(info) {
    const container = document.getElementById('msgStatusActions');
    if (!container) return;

    const myEmail = getUserEmail();
    const isBuyer = myEmail === info.buyerEmail;

    /* Only the ARTIST (non-buyer) can accept/reject, and only when pending */
    if (isBuyer || info.orderStatus !== 'pending') {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '<button class="btn-accept" id="msgAcceptBtn"><i data-lucide="check" style="width:16px;height:16px;"></i> Accept Order</button>'
      + '<button class="btn-reject" id="msgRejectBtn"><i data-lucide="x" style="width:16px;height:16px;"></i> Reject Order</button>';

    lucide.createIcons({ nodes: [container] });

    document.getElementById('msgAcceptBtn')?.addEventListener('click', async () => {
      if (!activeThreadKey) return;
      const btn = document.getElementById('msgAcceptBtn');
      btn.disabled = true;
      btn.textContent = 'Accepting...';
      try {
        await updateStatus(activeThreadKey, 'accepted');
        showToast('Order accepted', 'success');
      } catch (err) {
        showToast('Failed to update status', 'error');
      }
    });

    document.getElementById('msgRejectBtn')?.addEventListener('click', async () => {
      if (!activeThreadKey) return;
      const btn = document.getElementById('msgRejectBtn');
      btn.disabled = true;
      btn.textContent = 'Rejecting...';
      try {
        await updateStatus(activeThreadKey, 'rejected');
        showToast('Order rejected', 'info');
      } catch (err) {
        showToast('Failed to update status', 'error');
      }
    });
  }

  /* ======================================================
     RENDER THREAD MESSAGES (bubbles)
     ====================================================== */
  function renderThreadMessages(messages, info) {
    const container = document.getElementById('msgThreadMessages');
    if (!container) return;

    const myEmail = getUserEmail();
    const msgArray = Object.entries(messages).map(([key, msg]) => ({ key, ...msg }));
    msgArray.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (msgArray.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:2rem;">No messages yet.</p>';
      return;
    }

    container.innerHTML = msgArray.map(msg => {
      /* Status change messages (system messages) */
      if (msg.type === 'status_change') {
        const cls = msg.newStatus === 'accepted' ? 'color:#15803d;' : 'color:#dc2626;';
        return '<div class="msg-bubble-status-change" style="' + cls + '">'
          + (msg.newStatus === 'accepted' ? '✓ ' : '✗ ') + escapeHtml(msg.text)
          + '</div>';
      }

      const isSent = msg.senderEmail === myEmail;
      let bubbleCls = isSent ? 'msg-bubble-sent' : 'msg-bubble-received';
      if (msg.type === 'order' && !isSent) bubbleCls = 'msg-bubble-order';

      let html = '<div class="msg-bubble ' + bubbleCls + '">';
      html += '<div class="msg-bubble-sender">' + escapeHtml(msg.senderName || 'Unknown') + '</div>';
      html += '<div class="msg-bubble-text">' + escapeHtml(msg.text || '') + '</div>';

      /* Show order details for order-type messages */
      if (msg.type === 'order' && msg.orderPhone) {
        html += '<div class="msg-bubble-order-details"><strong>Phone:</strong> ' + escapeHtml(msg.orderPhone) + '</div>';
      }

      html += '<div class="msg-bubble-time">' + formatMsgTime(msg.createdAt) + '</div>';
      html += '</div>';
      return html;
    }).join('');

    /* Scroll to bottom */
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  /* ======================================================
     UNREAD BADGE
     ====================================================== */
  function updateMsgBadge() {
    const badge = document.getElementById('msgBadge');
    if (!badge) return;

    const email = getUserEmail();
    if (!email) {
      badge.textContent = '0';
      badge.classList.remove('show');
      return;
    }

    if (authDb) {
      authDb.ref(MSG_PATH + '/' + sanitizeEmail(email) + '/threads').once('value').then(snap => {
        const threads = snap.val();
        let total = 0;
        if (threads) {
          Object.values(threads).forEach(t => {
            if (t && t.info && t.info.unreadCount) total += t.info.unreadCount;
          });
        }
        badge.textContent = total > 99 ? '99+' : total;
        badge.classList.toggle('show', total > 0);
      }).catch(() => {
        badge.textContent = '0';
        badge.classList.remove('show');
      });
    }
  }

  /* Setup real-time unread listener */
  function attachUnreadListener() {
    if (unreadListenerAttached) return;
    const email = getUserEmail();
    if (!email || !authDb) return;

    authDb.ref(MSG_PATH + '/' + sanitizeEmail(email) + '/threads').on('value', () => {
      updateMsgBadge();
    });
    unreadListenerAttached = true;
  }

  /* Reset listener on logout */
  function detachUnreadListener() {
    if (!authDb) return;
    const email = getUserEmail();
    if (!email) return;
    authDb.ref(MSG_PATH + '/' + sanitizeEmail(email) + '/threads').off('value');
    unreadListenerAttached = false;
    const badge = document.getElementById('msgBadge');
    if (badge) {
      badge.textContent = '0';
      badge.classList.remove('show');
    }
  }

  /* ======================================================
     INBOX FILTER LISTENERS
     ====================================================== */
  function initFilterListeners() {
    document.getElementById('msgSearchInput')?.addEventListener('input', debounce(renderInbox, 300));
    document.getElementById('msgStatusFilter')?.addEventListener('change', renderInbox);
  }

  /* ======================================================
     PUBLIC API
     ====================================================== */
  return {
    sendOrder: sendOrder,
    renderInbox: renderInbox,
    updateMsgBadge: updateMsgBadge,
    attachUnreadListener: attachUnreadListener,
    detachUnreadListener: detachUnreadListener,
    initFilterListeners: initFilterListeners,
    detachThreadListener: detachThreadListener
  };
})();

/* --- Offline/Online guard (unchanged) --- */
!function () {
  if (location.pathname.includes('admin')) return;
  function handleConnection() {
    if (navigator.onLine && location.pathname.includes('offline')) {
      window.location.replace('index.html');
    } else if (!navigator.onLine && !location.pathname.includes('offline')) {
      window.location.replace('offline.html');
    }
  }
  handleConnection();
  window.addEventListener('online', handleConnection);
  window.addEventListener('offline', handleConnection);
}();

/* ============================================
   FAIRS & EVENTS SYSTEM
   Reads from user_information/events
   Field names match admin: eventDate, eventTime, etc.
   Comments stored under each event node
   /*============================================ */
var FairsEvents = (function () {
  var currentEventSource = null;
  var currentEventId = null;
  var commentsListenerRef = null;

  /* --- Helpers --- */
  function formatEventDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function getDateBadgeParts(dateStr) {
    if (!dateStr) return { month: '', day: '' };
    try {
      var d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return { month: '', day: '' };
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day: d.getDate().toString()
      };
    } catch (e) { return { month: '', day: '' }; }
  }

  function getYearFromDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr + 'T00:00:00');
      return isNaN(d.getTime()) ? '' : d.getFullYear().toString();
    } catch (e) { return ''; }
  }

  function formatCommentTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
  }

  function stringToColor(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    var hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ', 55%, 45%)';
  }

  /* ===========================
     MAP RAW FIELDS → CONSISTENT KEYS
     Admin saves: eventDate, eventTime, image, title,
     description, location, createdAt
     =========================== */
  function mapEventFields(raw, compositeId) {
    var mapped = {
      id: compositeId,
      title: raw.title || '',
      description: raw.description || raw.desc || '',
      image: raw.image || raw.eventImage || raw.poster || raw.cover || raw.photo || '',
      date: raw.eventDate || raw.date || '',
      time: raw.eventTime || raw.time || '',
      year: raw.year || '',
      location: raw.location || raw.venue || '',
      artistName: raw.artistName || raw.artist || raw.organizer || '',
      createdAt: raw.createdAt || 0,
      _source: raw._source || null
    };

    /* Extract year from date if missing */
    if (!mapped.year && mapped.date) { mapped.year = getYearFromDate(mapped.date); }

    /* Fallback: scan all fields for an image URL */
    if (!mapped.image) {
      var allKeys = Object.keys(raw);
      for (var j = 0; j < allKeys.length; j++) {
        var v = raw[allKeys[j]];
        if (typeof v === 'string' && v.startsWith('http') &&
          (v.includes('.jpg') || v.includes('.jpeg') || v.includes('.png') || v.includes('.webp') ||
           v.includes('.gif') || v.includes('imagekit') || v.includes('imgbb') || v.includes('firebase'))) {
          mapped.image = v;
          break;
        }
      }
    }

    return mapped;
  }

  /* ===========================
     LOAD EVENTS GRID
     Uses fetchFromUserInformation — same as artworks/auctions
     =========================== */
  function loadFairsEvents() {
    var grid = document.getElementById('eventsGrid');
    var empty = document.getElementById('eventsEmpty');
    if (!grid) return;

    grid.innerHTML = '';
    if (empty) empty.style.display = 'none';

    if (typeof fetchFromUserInformation !== 'function') {
      if (empty) empty.style.display = '';
      return;
    }

    fetchFromUserInformation('events', true).then(function (allEvts) {
      if (!Array.isArray(allEvts)) {
        if (empty) empty.style.display = '';
        return;
      }

      /* Map raw fields to consistent keys */
      var validItems = [];
      for (var i = 0; i < allEvts.length; i++) {
        var mapped = mapEventFields(allEvts[i], allEvts[i].id);
        if (mapped.title) validItems.push(mapped);
      }

      if (validItems.length === 0) {
        if (empty) empty.style.display = '';
        return;
      }

      /* Sort: upcoming first, then past */
      validItems.sort(function (a, b) {
        var dateA = new Date(a.date || 0).getTime();
        var dateB = new Date(b.date || 0).getTime();
        var now = Date.now();
        var aUp = dateA >= now ? 0 : 1;
        var bUp = dateB >= now ? 0 : 1;
        if (aUp !== bUp) return aUp - bUp;
        return dateA - dateB;
      });

      var fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='220'%3E%3Crect fill='%23e9ecef' width='320' height='220'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23adb5bd' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

      grid.innerHTML = validItems.map(function (ev) {
        var badge = getDateBadgeParts(ev.date);
        var dateFormatted = formatEventDate(ev.date);
        var seedId = (ev.id || 'x').replace(/[^a-zA-Z0-9_-]/g, '-');
        var imgSrc = ev.image || fallback;
        var isPast = ev.date && new Date(ev.date).getTime() < Date.now();

        /* Count comments from raw data */
        var commentCount = 0;
        var rawEv = allEvts.find(function (r) { return r.id === ev.id; });
        if (rawEv && rawEv.comments && typeof rawEv.comments === 'object') {
          commentCount = Object.keys(rawEv.comments).length;
        }

        return '<div class="ev-card reveal' + (isPast ? ' ev-card-past' : '') + '" data-event-id="' + escapeHtml(ev.id) + '" data-event-source="' + escapeHtml(ev._source || '') + '" tabindex="0" role="button" aria-label="View ' + escapeHtml(ev.title) + '">'
          + '<div class="ev-card-image-wrap">'
          + '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(ev.title) + '" loading="lazy" decoding="async" onerror="this.src=\'' + fallback + '\'">'
          + (badge.month ? '<div class="ev-card-date-badge"><span class="ev-card-badge-month">' + escapeHtml(badge.month) + '</span><span class="ev-card-badge-day">' + escapeHtml(badge.day) + '</span></div>' : '')
          + (isPast ? '<span class="ev-card-past-badge">Past</span>' : '')
          + '</div>'
          + '<div class="ev-card-body">'
          + '<h3 class="ev-card-title">' + escapeHtml(ev.title) + '</h3>'
          + '<div class="ev-card-info">'
          + (dateFormatted ? '<span class="ev-card-info-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' + escapeHtml(dateFormatted) + '</span>' : '')
          + (ev.time ? '<span class="ev-card-info-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + escapeHtml(ev.time) + '</span>' : '')
          + (ev.location ? '<span class="ev-card-info-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + escapeHtml(ev.location) + '</span>' : '')
          + '</div>'
          + (ev.description ? '<p class="ev-card-desc">' + escapeHtml(ev.description.length > 120 ? ev.description.substring(0, 120) + '...' : ev.description) + '</p>' : '')
          + '<div class="ev-card-footer">'
          + '<span class="ev-card-comments-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ' + commentCount + ' comment' + (commentCount !== 1 ? 's' : '') + '</span>'
          + '<span style="font-size:0.75rem;color:var(--primary);font-weight:600;">View Details &rarr;</span>'
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('');

      /* Attach click listeners */
      grid.querySelectorAll('.ev-card').forEach(function (card) {
        var handler = function () { openEventDetail(card.dataset.eventId, card.dataset.eventSource); };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', function (e) { if (e.key === 'Enter') handler(); });
      });

      setTimeout(initRevealAnimations, 100);
    }).catch(function (err) {
      console.warn('Failed to load events:', err);
      if (empty) empty.style.display = '';
    });
  }

  /* ===========================
     OPEN EVENT DETAIL MODAL
     =========================== */
  function openEventDetail(compositeId, sourceUserId) {
    currentEventId = compositeId;
    currentEventSource = sourceUserId || null;

    var modal = document.getElementById('eventDetailModal');
    if (!modal || !authDb || !compositeId) return;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    /* Reset */
    document.getElementById('evCommentsList').innerHTML = '';
    document.getElementById('evCommentCount').textContent = '0';
    document.getElementById('evCommentError').style.display = 'none';

    /*
     * fetchFromUserInformation returns id as "userId:eventPushKey"
     * We need to strip the userId prefix to get the raw Firebase event key
     * so we can read from: user_information/{userId}/events/{eventPushKey}
     */
    var rawEventId = compositeId;
    if (sourceUserId && compositeId.startsWith(sourceUserId + ':')) {
      rawEventId = compositeId.substring(sourceUserId.length + 1);
    }

    var evRef = authDb.ref('user_information/' + sourceUserId + '/events/' + rawEventId);

    evRef.once('value').then(function (snap) {
      var raw = snap.val();
      if (!raw) {
        closeModal();
        showToast('Event not found', 'error');
        return;
      }

      /* Map fields through the same mapper */
      var ev = mapEventFields(raw, compositeId);

      populateModal(ev);
      attachCommentsListener(sourceUserId, rawEventId);
      setupCommentForm(sourceUserId, rawEventId);
    }).catch(function (err) {
      console.warn('Failed to load event detail:', err);
      closeModal();
    });
  }

  /* ===========================
     POPULATE MODAL FIELDS
     =========================== */
  function populateModal(ev) {
    var img = document.getElementById('evImage');
    var imgWrap = document.getElementById('evImageWrap');
    var title = document.getElementById('evTitle');
    var dateText = document.getElementById('evDateText');
    var timeText = document.getElementById('evTimeText');
    var yearText = document.getElementById('evYearText');
    var locationEl = document.getElementById('evLocation');
    var descriptionEl = document.getElementById('evDescription');
    var badgeMonth = document.getElementById('evBadgeMonth');
    var badgeDay = document.getElementById('evBadgeDay');
    var dateBadge = document.getElementById('evDateBadge');

    var fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='360'%3E%3Crect fill='%23e9ecef' width='600' height='360'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23adb5bd' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
    var imgSrc = ev.image || fallback;
    img.src = imgSrc;
    img.alt = ev.title || '';
    img.onerror = function () { this.src = fallback; };

    title.textContent = ev.title || '';

    var dateFormatted = formatEventDate(ev.date);
    dateText.querySelector('span').textContent = dateFormatted || 'TBD';
    dateText.style.display = dateFormatted ? '' : 'none';

    timeText.querySelector('span').textContent = ev.time || '';
    timeText.style.display = ev.time ? '' : 'none';

    var year = ev.year || getYearFromDate(ev.date);
    yearText.querySelector('span').textContent = year ? 'Year ' + year : '';
    yearText.style.display = year ? '' : 'none';

    locationEl.querySelector('span').textContent = ev.location || '';
    locationEl.style.display = ev.location ? '' : 'none';

    descriptionEl.textContent = ev.description || '';

    var badge = getDateBadgeParts(ev.date);
    if (badge.month && badge.day) {
      badgeMonth.textContent = badge.month;
      badgeDay.textContent = badge.day;
      dateBadge.style.display = '';
    } else {
      dateBadge.style.display = 'none';
    }

    imgWrap.style.display = '';
  }

  /* ===========================
     COMMENTS: REAL-TIME LISTENER
     Path: user_information/{userId}/events/{eventId}/comments
     =========================== */
  function attachCommentsListener(sourceUserId, rawEventId) {
    detachCommentsListener();
    var path = 'user_information/' + sourceUserId + '/events/' + rawEventId + '/comments';
    commentsListenerRef = authDb.ref(path);
    commentsListenerRef.on('value', function (snap) {
      renderComments(snap.val());
    });
  }

  function detachCommentsListener() {
    if (commentsListenerRef) {
      commentsListenerRef.off('value');
      commentsListenerRef = null;
    }
  }

  /* ===========================
     RENDER COMMENTS
     =========================== */
  function renderComments(comments) {
    var list = document.getElementById('evCommentsList');
    var countEl = document.getElementById('evCommentCount');
    if (!list) return;

    if (!comments || typeof comments !== 'object') {
      list.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.9rem;padding:1rem 0;">No comments yet. Be the first!</div>';
      if (countEl) countEl.textContent = '0';
      return;
    }

    var arr = [];
    Object.keys(comments).forEach(function (key) {
      var c = comments[key];
      if (c) arr.push({ key: key, text: c.text, authorName: c.authorName, authorEmail: c.authorEmail, authorUid: c.authorUid, createdAt: c.createdAt });
    });
    arr.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });

    if (countEl) countEl.textContent = arr.length;

    if (arr.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.9rem;padding:1rem 0;">No comments yet. Be the first!</div>';
      return;
    }

    var myEmail = auth && auth.currentUser ? auth.currentUser.email : null;

    list.innerHTML = arr.map(function (c) {
      var isMine = myEmail && c.authorEmail === myEmail;
      var initials = getInitials(c.authorName);
      var avatarColor = stringToColor(c.authorEmail || c.authorName || 'unknown');

      return '<div class="ev-comment-item">'
        + '<div class="ev-comment-avatar" style="background:' + avatarColor + ';">' + escapeHtml(initials) + '</div>'
        + '<div class="ev-comment-body">'
        + '<div class="ev-comment-name">' + escapeHtml(c.authorName || 'Anonymous') + '</div>'
        + '<div class="ev-comment-text">' + escapeHtml(c.text || '') + '</div>'
        + '<div class="ev-comment-time">' + formatCommentTime(c.createdAt) + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  /* ===========================
     COMMENT FORM SETUP
     =========================== */
  function setupCommentForm(sourceUserId, rawEventId) {
    var authPrompt = document.getElementById('evCommentAuthPrompt');
    var formWrap = document.getElementById('evCommentFormWrap');
    var avatarEl = document.getElementById('evCommentAvatar');
    var loginLink = document.getElementById('evCommentLoginLink');

    if (!auth || !auth.currentUser) {
      if (authPrompt) authPrompt.style.display = '';
      if (formWrap) formWrap.style.display = 'none';
      if (loginLink) {
        loginLink.onclick = function (e) {
          e.preventDefault();
          closeModal();
          var authModal = document.getElementById('authModal');
          if (authModal) {
            authModal.classList.add('open');
            document.body.style.overflow = 'hidden';
            var loginTab = authModal.querySelector('[data-auth-tab="login"]');
            if (loginTab) loginTab.click();
          }
        };
      }
      return;
    }

    if (authPrompt) authPrompt.style.display = 'none';
    if (formWrap) formWrap.style.display = '';

    var user = auth.currentUser;
    var userName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    var avatarColor = stringToColor(user.email || userName);

    if (avatarEl) {
      avatarEl.style.background = avatarColor;
      avatarEl.textContent = getInitials(userName);
    }

    /* Clone inputs to remove stale listeners */
    var oldInput = document.getElementById('evCommentInput');
    var oldBtn = document.getElementById('evCommentSendBtn');
    var newInput = oldInput.cloneNode(true);
    var newBtn = oldBtn.cloneNode(true);
    oldInput.parentNode.replaceChild(newInput, oldInput);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    function submitComment() {
      var textEl = document.getElementById('evCommentInput');
      var errDisplay = document.getElementById('evCommentError');
      var text = textEl ? textEl.value.trim() : '';

      if (!text || text.length < 2) {
        if (errDisplay) { errDisplay.textContent = 'Please write at least 2 characters.'; errDisplay.style.display = ''; }
        setTimeout(function () { if (errDisplay) errDisplay.style.display = 'none'; }, 3000);
        return;
      }

      var commentData = {
        text: text,
        authorName: userName,
        authorEmail: user.email,
        authorUid: user.uid,
        createdAt: Date.now()
      };

      var path = 'user_information/' + sourceUserId + '/events/' + rawEventId + '/comments';
      authDb.ref(path).push().set(commentData).then(function () {
        var el = document.getElementById('evCommentInput');
        if (el) el.value = '';
        if (errDisplay) errDisplay.style.display = 'none';
        SiteAnalytics.trackEvent('event_comment', rawEventId);
      }).catch(function () {
        if (errDisplay) { errDisplay.textContent = 'Failed to post comment. Try again.'; errDisplay.style.display = ''; }
        setTimeout(function () { if (errDisplay) errDisplay.style.display = 'none'; }, 4000);
      });
    }

    document.getElementById('evCommentSendBtn').addEventListener('click', submitComment);
    document.getElementById('evCommentInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
    });
  }

  /* ===========================
     CLOSE MODAL
     =========================== */
  function closeModal() {
    var modal = document.getElementById('eventDetailModal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    detachCommentsListener();
    currentEventSource = null;
    currentEventId = null;
  }

  /* ===========================
     INIT LISTENERS
     =========================== */
  function initListeners() {
    var closeBtn = document.getElementById('evClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    var modal = document.getElementById('eventDetailModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target.id === 'eventDetailModal') closeModal();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = document.getElementById('eventDetailModal');
        if (m && m.classList.contains('open')) { closeModal(); e.stopPropagation(); }
      }
    });
  }

  /* ===========================
     PUBLIC API
     =========================== */
  return {
    load: loadFairsEvents,
    initListeners: initListeners,
    closeModal: closeModal
  };
})();

/* ============================================
   MASTER INITIALIZATION
   ============================================ */
async function init() {
  const saved = localStorage.getItem('artTheme');
  if (saved) document.body.setAttribute('data-theme', saved);
  ensureDynamicPagesExist();
  updateFavBadge();
  createSearchResultsPanel();
  document.getElementById('currSymbol').textContent = AppState.currentCurrency;
  document.querySelectorAll('#currDropdown .dropdown-item').forEach(btn => btn.classList.toggle('active', btn.dataset.curr === AppState.currentCurrency));
  document.getElementById('globalSearchInput').placeholder = t('search_placeholder');
  
  fetchLiveRates();
  initUIListeners();
  initScrollEffects();
  setupAccountDropdown();
  initPublicAuth();
  initFilterListeners();
  initHomeFilters();
  initViewingRoomListeners();
  initPriceDatabaseListeners();
  SiteAnalytics.init(authDb);
    MessageInbox.initFilterListeners();
    FairsEvents.initListeners();
  if (auth && auth.currentUser) {
    MessageInbox.attachUnreadListener();
    MessageInbox.updateMsgBadge();
  }
  
  /* Step 1: Load artist about/bio data from user_information */
  await loadArtistAboutData();
  
  /* Step 2: Load artworks via realtime listeners — this automatically:
     - Merges artworks from all users in user_information
     - Sets artworksReady = true (enables search)
     - Calls buildCategories() (populates all dropdowns)
     - Calls initHeroSlider() (populates hero background) */
  await loadArtworksRealtime();
  
  /* Step 3: Start routing — reads URL hash and renders the correct page.
     navigateTo('home') then calls renderHomeFeatured/Latest/All + renderArtistProfiles
     which read from allArtworks (now fully populated) */
  window.addEventListener('hashchange', handleHash);
  handleHash();
  
  /* Step 4: Reveal any scroll animations for above-the-fold content */
  setTimeout(initRevealAnimations, 200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

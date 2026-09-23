// ======================================================================
// Catálogo de la tienda — JavaScript puro (sin React, sin Tailwind).
// Firebase (auth + firestore) es la única dependencia externa: es la
// base de datos y el sistema de login, no se puede reemplazar con CSS.
// ======================================================================

// ---------------------------- Estado ----------------------------
let state = {
  settings: { logoUrl: "", storeName: "Mi Tienda", social: { facebook: "", instagram: "", whatsapp: "", extra: [] } },
  products: [],
  testimonials: [],
  loading: true,
  loggedIn: false,
  view: "cliente", // cliente | admin-login | admin
  tab: "productos", // productos | testimonios
  openProductId: null,
  openImgIdx: 0,
  confirmDeleteId: null,
  confirmDeleteTestimonialId: null,
  showProductForm: false,
  showTestimonialForm: false,
  showSocialForm: false,
  loginError: "",
  loginLoading: false,
};

// Datos temporales de formularios (no disparan re-render al cambiar,
// para no perder lo que el usuario ya escribió en otros campos)
let tempProductImages = ["", "", "", "", "", ""];
let tempTestimonialImage = "";
let tempLogoUrl = "";
let tempSocialImage = "";

// ---------------------------- Íconos (SVG) ----------------------------
function icon(pathInner, size) {
  size = size || 20;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + pathInner + '</svg>';
}
const ICONS = {
  facebook: (s) => icon('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', s),
  instagram: (s) => icon('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>', s),
  whatsapp: (s) => icon('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>', s),
  phone: (s) => icon('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>', s),
  trash: (s) => icon('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', s),
  plus: (s) => icon('<path d="M12 5v14"/><path d="M5 12h14"/>', s),
  x: (s) => icon('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', s),
  lock: (s) => icon('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s),
  user: (s) => icon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s),
  star: (s) => icon('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/>', s),
  packageX: (s) => icon('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7.3L12 12l8.7-4.7"/><path d="M12 22V12"/><path d="M9 15l3-3 3 3"/>', s),
  packageCheck: (s) => icon('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7.3L12 12l8.7-4.7"/><path d="M12 22V12"/><path d="M9.5 9.5l2 2 3-3"/>', s),
  logout: (s) => icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>', s),
  arrow: (s) => icon('<path d="M17 17L7 7"/><path d="M7 17V7h10"/>', s),
  imagePlus: (s) => icon('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M21 15l-5-5L5 21"/>', s),
  link: (s) => icon('<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5"/>', s),
};

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------- Compresión de imágenes ----------------------------
function compressImage(file, maxDim, quality) {
  maxDim = maxDim || 900;
  quality = quality || 0.72;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width, height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------- Firebase: listeners ----------------------------
function initFirebase() {
  auth.onAuthStateChanged((user) => {
    state.loggedIn = !!user;
    render();
  });

  db.doc("settings/main").onSnapshot((snap) => {
    state.settings = snap.exists
      ? Object.assign({ logoUrl: "", storeName: "Mi Tienda", social: { facebook: "", instagram: "", whatsapp: "", extra: [] } }, snap.data())
      : { logoUrl: "", storeName: "Mi Tienda", social: { facebook: "", instagram: "", whatsapp: "", extra: [] } };
    state.loading = false;
    render();
  }, (err) => { console.error(err); state.loading = false; render(); });

  db.collection("products").orderBy("createdAt", "asc").onSnapshot((snap) => {
    state.products = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    render();
  });

  db.collection("testimonials").orderBy("createdAt", "asc").onSnapshot((snap) => {
    state.testimonials = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    render();
  });
}

// ---------------------------- Acciones de Firestore ----------------------------
async function saveSettings(next) {
  state.settings = next;
  await db.doc("settings/main").set(next, { merge: true });
}
async function addProduct(p) {
  await db.collection("products").add(Object.assign({}, p, { soldOut: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() }));
}
async function toggleAgotado(id, current) {
  await db.collection("products").doc(id).update({ soldOut: !current });
}
async function deleteProductDoc(id) {
  await db.collection("products").doc(id).delete();
}
async function addTestimonialDoc(t) {
  await db.collection("testimonials").add(Object.assign({}, t, { createdAt: firebase.firestore.FieldValue.serverTimestamp() }));
}
async function deleteTestimonialDoc(id) {
  await db.collection("testimonials").doc(id).delete();
}

// ---------------------------- Navegación / UI ----------------------------
function goAdmin() { state.view = state.loggedIn ? "admin" : "admin-login"; render(); }
function goClient() { state.view = "cliente"; render(); }
function doLogout() { auth.signOut(); state.view = "cliente"; render(); }
function setTab(t) { state.tab = t; render(); }
function openProduct(id) { state.openProductId = id; state.openImgIdx = 0; render(); }
function closeProductModal() { state.openProductId = null; render(); }
function setModalImgIdx(i) { state.openImgIdx = i; render(); }
function askDelete(id) { state.confirmDeleteId = id; render(); }
function cancelDelete() { state.confirmDeleteId = null; render(); }

function askDeleteTestimonial(id) { state.confirmDeleteTestimonialId = id; render(); }
function cancelDeleteTestimonial() { state.confirmDeleteTestimonialId = null; render(); }
async function confirmDeleteTestimonial() {
  const id = state.confirmDeleteTestimonialId;
  state.confirmDeleteTestimonialId = null;
  await deleteTestimonialDoc(id);
}

async function confirmDeleteProduct() {
  const id = state.confirmDeleteId;
  state.confirmDeleteId = null;
  await deleteProductDoc(id);
}

async function handleToggleAgotado(id, current) {
  await toggleAgotado(id, current);
}

function toggleProductForm(show) {
  state.showProductForm = show;
  if (show) tempProductImages = ["", "", "", "", "", ""];
  render();
}
function toggleTestimonialForm(show) {
  state.showTestimonialForm = show;
  if (show) tempTestimonialImage = "";
  render();
}
function toggleSocialForm(show) {
  state.showSocialForm = show;
  if (show) tempSocialImage = "";
  render();
}

// ---------------------------- Login ----------------------------
async function submitLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  state.loginError = "";
  state.loginLoading = true;
  render();
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    state.view = "admin";
  } catch (e) {
    state.loginError = "Usuario o contraseña incorrectos. Probá de nuevo.";
  }
  state.loginLoading = false;
  render();
}

// ---------------------------- Imágenes de formularios ----------------------------
async function handleProdImg(i, file) {
  if (!file) return;
  const dataUrl = await compressImage(file);
  tempProductImages[i] = dataUrl;
  const img = document.getElementById("prod-preview-" + i);
  const ph = document.getElementById("prod-placeholder-" + i);
  if (img) { img.src = dataUrl; img.style.display = "block"; }
  if (ph) ph.style.display = "none";
}

async function handleTestimonialImg(file) {
  if (!file) return;
  tempTestimonialImage = await compressImage(file, 500, 0.75);
  const img = document.getElementById("testimonial-preview");
  const ph = document.getElementById("testimonial-placeholder");
  if (img) { img.src = tempTestimonialImage; img.style.display = "block"; }
  if (ph) ph.style.display = "none";
}

async function handleLogoFile(file) {
  if (!file) return;
  tempLogoUrl = await compressImage(file, 500, 0.85);
  const img = document.getElementById("logo-preview");
  if (img) { img.src = tempLogoUrl; img.style.display = "block"; }
  const label = document.getElementById("logo-upload-label-text");
  if (label) label.textContent = "Cambiar foto";
}

async function handleSocialImgFile(file) {
  if (!file) return;
  tempSocialImage = await compressImage(file, 200, 0.8);
  const img = document.getElementById("social-preview");
  if (img) { img.src = tempSocialImage; img.style.display = "block"; }
}

// ---------------------------- Guardar formularios ----------------------------
async function submitProductForm() {
  const name = document.getElementById("prod-name").value.trim();
  if (!name) return;
  const desc = document.getElementById("prod-desc").value.trim();
  const price = document.getElementById("prod-price").value.trim();
  const phone = document.getElementById("prod-phone").value.trim();
  const images = tempProductImages.filter(Boolean).slice(0, 6);

  const btn = document.getElementById("prod-save-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }

  await addProduct({ name, description: desc, price, phone, images });
  state.showProductForm = false;
  render();
}

async function submitTestimonialForm() {
  const quote = document.getElementById("test-quote").value.trim();
  if (!quote) return;
  const name = document.getElementById("test-name").value.trim();

  const btn = document.getElementById("test-save-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }

  await addTestimonialDoc({ image: tempTestimonialImage, name, quote });
  state.showTestimonialForm = false;
  render();
}

function saveBasicsSettings() {
  const storeName = document.getElementById("set-storename").value.trim();
  const fb = document.getElementById("set-fb").value.trim();
  const ig = document.getElementById("set-ig").value.trim();
  const wa = document.getElementById("set-wa").value.trim();
  const logoUrl = tempLogoUrl || state.settings.logoUrl;
  saveSettings(Object.assign({}, state.settings, {
    logoUrl, storeName,
    social: Object.assign({}, state.settings.social, { facebook: fb, instagram: ig, whatsapp: wa }),
  }));
}

function submitAddSocial() {
  const name = document.getElementById("social-name").value.trim();
  const url = document.getElementById("social-url").value.trim();
  if (!url) return;
  const extra = (state.settings.social.extra || []).concat([{ name, url, image: tempSocialImage }]);
  saveSettings(Object.assign({}, state.settings, { social: Object.assign({}, state.settings.social, { extra }) }));
  state.showSocialForm = false;
  render();
}

// ---------------------------- Render ----------------------------
function render() {
  const app = document.getElementById("app");
  if (state.loading) {
    app.innerHTML = '<div class="loader-wrap"><div class="spinner"></div></div>';
    return;
  }
  app.innerHTML = renderHeader() + renderBody();
}

function renderHeader() {
  const s = state.settings;
  const icons = [];
  if (s.social.facebook) icons.push({ url: s.social.facebook, i: ICONS.facebook, label: "Facebook" });
  if (s.social.instagram) icons.push({ url: s.social.instagram, i: ICONS.instagram, label: "Instagram" });
  if (s.social.whatsapp) icons.push({ url: s.social.whatsapp, i: ICONS.whatsapp, label: "WhatsApp" });

  const iconsHtml = icons.map(o =>
    '<a href="' + esc(o.url) + '" target="_blank" rel="noreferrer" title="' + esc(o.label) + '">' + o.i(20) + '</a>'
  ).join("") + (s.social.extra || []).map(x =>
    '<a href="' + esc(x.url) + '" target="_blank" rel="noreferrer" title="' + esc(x.name) + '">' +
    (x.image ? '<img class="extra-icon" src="' + x.image + '">' : ICONS.link(20)) + '</a>'
  ).join("");

  const hint = icons.length > 0
    ? '<div class="social-hint">' + ICONS.arrow(20).replace('stroke="currentColor"', 'stroke="#c0392b"') +
      '<div class="bubble">¡Puedes seguirnos en nuestras redes sociales!</div></div>'
    : "";

  const isAdminArea = state.view === "admin";
  const rightHtml = !isAdminArea
    ? '<button class="link-btn" onclick="goAdmin()">Admin</button>'
    : (state.loggedIn ? '<button class="logout-btn" onclick="doLogout()">' + ICONS.logout(14) + ' Salir</button>' : "");

  const logoHtml = s.logoUrl
    ? '<img class="logo-img" src="' + s.logoUrl + '" alt="' + esc(s.storeName) + '">'
    : '<div class="store-name-text serif">' + esc(s.storeName) + '</div>';

  return (
    '<div class="header">' +
      '<div class="social-icons">' + iconsHtml + '</div>' +
      hint +
      '<div class="header-right">' + rightHtml + '</div>' +
      '<div class="logo-wrap">' + logoHtml +
        (isAdminArea ? '<div class="admin-label">Panel de administración</div>' : '') +
      '</div>' +
    '</div>'
  );
}

function renderBody() {
  if (state.view === "admin-login") return renderLogin();
  if (state.view === "cliente" || state.view === "admin") return renderMain();
  return "";
}

function renderLogin() {
  return (
    '<div class="login-wrap"><div class="login-card">' +
      '<div class="login-title serif">Ingresar</div>' +
      '<label class="field-row-label">' + ICONS.user(16) + ' Correo de administrador</label>' +
      '<input type="text" id="login-email" autocapitalize="none" onkeydown="if(event.key===\'Enter\')submitLogin()">' +
      '<label class="field-row-label">' + ICONS.lock(16) + ' Contraseña</label>' +
      '<input type="password" id="login-pass" onkeydown="if(event.key===\'Enter\')submitLogin()">' +
      (state.loginError ? '<div class="error-box">' + esc(state.loginError) + '</div>' : '') +
      '<div class="btn-row">' +
        '<button class="btn" onclick="goClient()">Cancelar</button>' +
        '<button class="btn btn-primary" ' + (state.loginLoading ? 'disabled' : '') + ' onclick="submitLogin()">' + (state.loginLoading ? 'Entrando...' : 'Entrar') + '</button>' +
      '</div>' +
    '</div></div>'
  );
}

function renderMain() {
  const admin = state.view === "admin";
  let html = '<div class="main">';
  html += '<div class="tabs">' +
    '<button class="tab-btn ' + (state.tab === "productos" ? "active" : "") + '" onclick="setTab(\'productos\')">Nuestro trabajo</button>' +
    '<button class="tab-btn ' + (state.tab === "testimonios" ? "active" : "") + '" onclick="setTab(\'testimonios\')">Testimonios</button>' +
  '</div>';

  if (state.tab === "productos") html += renderProductsTab(admin);
  else html += renderTestimonialsTab(admin);

  if (admin) html += renderAdminExtras();

  html += '</div>';

  if (state.openProductId) html += renderProductModal();
  if (state.confirmDeleteId) html += renderConfirmDelete();
  if (state.confirmDeleteTestimonialId) html += renderConfirmDeleteTestimonial();

  return html;
}

function renderProductsTab(admin) {
  let html = '<div class="product-grid">';
  state.products.forEach((p, i) => {
    html += '<div class="product-card" style="animation-delay:' + (i * 90) + 'ms">' +
      '<button class="product-thumb-btn" onclick="openProduct(\'' + p.id + '\')">' +
        '<div class="product-thumb">' +
          (p.images && p.images[0] ? '<img src="' + p.images[0] + '">' : '<div class="no-img">Sin imagen</div>') +
          (p.soldOut ? '<div class="sold-badge">Agotado</div>' : '') +
        '</div>' +
        '<div class="product-info">' +
          '<div class="product-name">' + esc(p.name) + '</div>' +
          (p.price ? '<div class="product-price">' + esc(p.price) + '</div>' : '') +
        '</div>' +
      '</button>' +
      (admin ?
        '<div class="product-admin-actions">' +
          '<button class="mini-btn" onclick="handleToggleAgotado(\'' + p.id + '\', ' + !!p.soldOut + ')">' +
            (p.soldOut ? ICONS.packageCheck(14) : ICONS.packageX(14)) + ' ' + (p.soldOut ? 'Desmarcar' : 'Agotado') +
          '</button>' +
          '<span class="sep">|</span>' +
          '<button class="mini-btn danger" onclick="askDelete(\'' + p.id + '\')">' + ICONS.trash(14) + ' Eliminar</button>' +
        '</div>' : '') +
    '</div>';
  });
  html += '</div>';

  if (state.products.length === 0) html += '<div class="empty-msg">Todavía no hay productos.</div>';

  if (admin) {
    html += '<div class="max-w-lg">';
    if (!state.showProductForm) {
      html += '<button class="dashed-btn" onclick="toggleProductForm(true)">' + ICONS.plus(18) + ' Agregar producto</button>';
    } else {
      html += renderProductForm();
    }
    html += '</div>';
  }
  return html;
}

function renderProductForm() {
  let slots = "";
  for (let i = 0; i < 6; i++) {
    slots += '<label class="img-slot">' +
      '<span id="prod-placeholder-' + i + '">' + ICONS.imagePlus(20) + '</span>' +
      '<img id="prod-preview-' + i + '" style="display:none">' +
      '<input type="file" accept="image/*" onchange="handleProdImg(' + i + ', this.files[0])">' +
    '</label>';
  }
  return (
    '<div class="form-card">' +
      '<div class="form-title">' + ICONS.imagePlus(18) + ' Nuevo producto</div>' +
      '<input type="text" id="prod-name" placeholder="Nombre del producto">' +
      '<textarea id="prod-desc" rows="3" placeholder="Descripción"></textarea>' +
      '<input type="text" id="prod-price" placeholder="Precio (ej: Bs 150)">' +
      '<input type="text" id="prod-phone" placeholder="Número de teléfono de contacto">' +
      '<div class="field-label">Hasta 6 imágenes del producto</div>' +
      '<div class="img-slots">' + slots + '</div>' +
      '<div class="btn-row">' +
        '<button class="btn" onclick="toggleProductForm(false)">Cancelar</button>' +
        '<button class="btn btn-primary" id="prod-save-btn" onclick="submitProductForm()">Guardar producto</button>' +
      '</div>' +
    '</div>'
  );
}

function renderProductModal() {
  const p = state.products.find(x => x.id === state.openProductId);
  if (!p) return "";
  const images = p.images || [];
  const idx = state.openImgIdx;
  let thumbs = "";
  if (images.length > 1) {
    thumbs = '<div class="modal-thumbs">' + images.map((img, i) =>
      '<button class="' + (i === idx ? "active" : "") + '" onclick="setModalImgIdx(' + i + ')"><img src="' + img + '"></button>'
    ).join("") + '</div>';
  }
  return (
    '<div class="modal-overlay" onclick="closeProductModal()">' +
      '<div class="modal-card" onclick="event.stopPropagation()">' +
        '<div class="modal-close-row"><button onclick="closeProductModal()">' + ICONS.x(20) + '</button></div>' +
        '<div class="modal-img-wrap">' + (images[idx] ? '<img src="' + images[idx] + '">' : '<div class="no-img">Sin imagen</div>') + '</div>' +
        thumbs +
        '<div class="modal-name serif">' + esc(p.name) + '</div>' +
        (p.soldOut ? '<div class="modal-sold">Agotado</div>' : '') +
        (p.price ? '<div class="modal-price">' + esc(p.price) + '</div>' : '') +
        '<div class="modal-desc">' + esc(p.description) + '</div>' +
        (p.phone ? '<div class="modal-phone">' + ICONS.phone(16) + ' ' + esc(p.phone) + '</div>' : '') +
      '</div>' +
    '</div>'
  );
}

function renderConfirmDelete() {
  const p = state.products.find(x => x.id === state.confirmDeleteId);
  if (!p) return "";
  return (
    '<div class="modal-overlay" onclick="cancelDelete()">' +
      '<div class="modal-card" style="max-width:380px" onclick="event.stopPropagation()">' +
        '<div class="confirm-title serif">¿Estás seguro de eliminar el producto "' + esc(p.name) + '"?</div>' +
        '<div class="confirm-sub">Esta acción no se puede deshacer.</div>' +
        '<div class="btn-row">' +
          '<button class="btn" onclick="cancelDelete()">No</button>' +
          '<button class="btn btn-danger" onclick="confirmDeleteProduct()">Sí, eliminar</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderConfirmDeleteTestimonial() {
  const t = state.testimonials.find(x => x.id === state.confirmDeleteTestimonialId);
  if (!t) return "";
  const preview = t.quote && t.quote.length > 40 ? t.quote.slice(0, 40) + "…" : t.quote;
  return (
    '<div class="modal-overlay" onclick="cancelDeleteTestimonial()">' +
      '<div class="modal-card" style="max-width:380px" onclick="event.stopPropagation()">' +
        '<div class="confirm-title serif">¿Estás seguro de eliminar el testimonio de ' + (t.name ? esc(t.name) : '"' + esc(preview) + '"') + '?</div>' +
        '<div class="confirm-sub">Esta acción no se puede deshacer.</div>' +
        '<div class="btn-row">' +
          '<button class="btn" onclick="cancelDeleteTestimonial()">No</button>' +
          '<button class="btn btn-danger" onclick="confirmDeleteTestimonial()">Sí, eliminar</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderTestimonialsTab(admin) {
  let html = '<div class="max-w">';
  state.testimonials.forEach(t => {
    html += '<div class="testimonial-card">' +
      (t.image ? '<img class="testimonial-img" src="' + t.image + '">' : '<div class="testimonial-placeholder">' + ICONS.star(28).replace('stroke="currentColor"', 'stroke="#f4efe3"') + '</div>') +
      '<div style="flex:1"><div class="testimonial-quote">&quot;' + esc(t.quote) + '&quot;</div>' +
      (t.name ? '<div class="testimonial-name">' + esc(t.name) + '</div>' : '') +
      (admin ? '<button class="mini-btn danger" style="margin-top:8px" onclick="askDeleteTestimonial(\'' + t.id + '\')">' + ICONS.trash(14) + ' Eliminar</button>' : '') +
      '</div>' +
    '</div>';
  });
  if (state.testimonials.length === 0) html += '<div class="empty-msg">Todavía no hay testimonios.</div>';

  if (admin) {
    if (!state.showTestimonialForm) {
      html += '<button class="dashed-btn" onclick="toggleTestimonialForm(true)">' + ICONS.plus(18) + ' Añadir testimonio</button>';
    } else {
      html += '<div class="form-card">' +
        '<div class="field-label">Foto de la persona</div>' +
        '<div class="upload-row">' +
          '<img id="testimonial-preview" class="round-preview" style="display:none">' +
          '<div id="testimonial-placeholder" class="testimonial-placeholder" style="width:56px;height:56px;border-radius:50%">' + ICONS.star(18).replace('stroke="currentColor"', 'stroke="#f4efe3"') + '</div>' +
          '<label class="upload-btn-label">Subir foto<input type="file" accept="image/*" onchange="handleTestimonialImg(this.files[0])"></label>' +
        '</div>' +
        '<input type="text" id="test-name" placeholder="Nombre (opcional)">' +
        '<textarea id="test-quote" rows="3" placeholder="¿Qué dijeron del producto?"></textarea>' +
        '<div class="btn-row">' +
          '<button class="btn" onclick="toggleTestimonialForm(false)">Cancelar</button>' +
          '<button class="btn btn-primary" id="test-save-btn" onclick="submitTestimonialForm()">Guardar</button>' +
        '</div>' +
      '</div>';
    }
  }
  html += '</div>';
  return html;
}

function renderAdminExtras() {
  const s = state.settings;
  const chips = (s.social.extra || []).map(x => '<div class="chip">' + esc(x.name || x.url) + '</div>').join("");
  return (
    '<div class="admin-extras">' +
      '<div class="section-title serif">Ajustes generales</div>' +
      '<div class="form-card" style="margin-bottom:24px">' +
        '<input type="text" id="set-storename" placeholder="Nombre de la tienda" value="' + esc(s.storeName) + '">' +
        '<div class="field-label">Logo de la tienda</div>' +
        '<div class="upload-row">' +
          (s.logoUrl ? '<img id="logo-preview" class="square-preview" src="' + s.logoUrl + '">' : '<img id="logo-preview" class="square-preview" style="display:none">') +
          '<label class="upload-btn-label"><span id="logo-upload-label-text">' + (s.logoUrl ? 'Cambiar foto' : 'Subir foto del logo') + '</span><input type="file" accept="image/*" onchange="handleLogoFile(this.files[0])"></label>' +
        '</div>' +
        '<input type="text" id="set-fb" placeholder="Enlace de Facebook" value="' + esc(s.social.facebook) + '">' +
        '<input type="text" id="set-ig" placeholder="Enlace de Instagram" value="' + esc(s.social.instagram) + '">' +
        '<input type="text" id="set-wa" placeholder="Enlace de WhatsApp" value="' + esc(s.social.whatsapp) + '">' +
        '<button class="btn btn-primary" onclick="saveBasicsSettings()">Guardar ajustes</button>' +
      '</div>' +

      '<div class="section-title serif">Redes sociales adicionales</div>' +
      '<div class="chip-row">' + chips + '</div>' +
      (!state.showSocialForm
        ? '<button class="dashed-btn" style="margin-top:0" onclick="toggleSocialForm(true)">' + ICONS.plus(16) + ' Agregar red social</button>'
        : '<div class="form-card">' +
            '<input type="text" id="social-name" placeholder="Nombre de la red">' +
            '<input type="text" id="social-url" placeholder="Enlace">' +
            '<div class="upload-row">' +
              '<img id="social-preview" class="round-preview" style="display:none;width:40px;height:40px">' +
              '<label class="upload-btn-label">Subir ícono<input type="file" accept="image/*" onchange="handleSocialImgFile(this.files[0])"></label>' +
            '</div>' +
            '<div class="btn-row">' +
              '<button class="btn" onclick="toggleSocialForm(false)">Cancelar</button>' +
              '<button class="btn btn-primary" onclick="submitAddSocial()">Guardar</button>' +
            '</div>' +
          '</div>') +
    '</div>'
  );
}

// ---------------------------- Arranque ----------------------------
initFirebase();
render();


// ============================================================
//  SWIFTDROP — app.js
//  Shared logic: mock data, auth, toast, theme, customer app
// ============================================================

'use strict';

// ── Mock Data ────────────────────────────────────────────────

const MOCK_USERS = [
  { id: 'u1', name: 'Ama Owusu', email: 'ama@example.com', phone: '+233 24 111 2222', password: 'pass123', avatar: 'AO', joined: '2024-01-15' },
  { id: 'u2', name: 'Kwame Asante', email: 'kwame@example.com', phone: '+233 20 333 4444', password: 'pass123', avatar: 'KA', joined: '2024-03-02' },
  { id: 'u3', name: 'Efua Mensah', email: 'efua@example.com', phone: '+233 55 555 6666', password: 'pass123', avatar: 'EM', joined: '2024-05-18' },
  { id: 'u4', name: 'Kofi Boateng', email: 'kofi@example.com', phone: '+233 27 777 8888', password: 'pass123', avatar: 'KB', joined: '2024-06-01' },
  { id: 'u5', name: 'Abena Darko', email: 'abena@example.com', phone: '+233 50 999 0000', password: 'pass123', avatar: 'AD', joined: '2024-07-22' },
];

const MOCK_RIDERS = [
  { id: 'r1', name: 'Marcus Johnson', email: 'marcus@swiftdrop.com', phone: '+233 24 100 2001', password: 'rider123', avatar: 'MJ', rating: 4.9, deliveries: 312, online: false, lat: 5.6037, lng: -0.1870, vehicle: 'Honda CB300R', status: 'available' },
  { id: 'r2', name: 'Femi Adeyemi', email: 'femi@swiftdrop.com', phone: '+233 20 200 3002', password: 'rider123', avatar: 'FA', rating: 4.7, deliveries: 198, online: true, lat: 5.5990, lng: -0.1950, vehicle: 'Yamaha FZ', status: 'busy' },
  { id: 'r3', name: 'Priya Nair', email: 'priya@swiftdrop.com', phone: '+233 55 300 4003', password: 'rider123', avatar: 'PN', rating: 4.8, deliveries: 245, online: true, lat: 5.6100, lng: -0.1780, vehicle: 'TVS Apache', status: 'busy' },
  { id: 'r4', name: 'Tunde Okafor', email: 'tunde@swiftdrop.com', phone: '+233 27 400 5004', password: 'rider123', avatar: 'TO', rating: 4.6, deliveries: 87, online: false, lat: 5.5950, lng: -0.2010, vehicle: 'Suzuki GS150', status: 'available' },
];

const STATUS_FLOW = ['pending', 'active', 'transit', 'delivered'];
const PKG_SURCHARGE = { 'Document': 0, 'Small Box': 2, 'Large Box': 5, 'Fragile': 8, 'Food': 3, 'Electronics': 10 };

// Accra area coordinates for mock addresses
const MOCK_LOCATIONS = [
  { name: 'Accra Mall', lat: 5.6065, lng: -0.1811 },
  { name: 'Kotoka Int. Airport', lat: 5.6052, lng: -0.1717 },
  { name: 'Cantonments', lat: 5.5942, lng: -0.1724 },
  { name: 'Osu Castle', lat: 5.5486, lng: -0.1889 },
  { name: 'Labadi Beach', lat: 5.5504, lng: -0.1567 },
  { name: 'Makola Market', lat: 5.5494, lng: -0.2154 },
  { name: 'University of Ghana', lat: 5.6502, lng: -0.1875 },
  { name: 'East Legon', lat: 5.6328, lng: -0.1584 },
  { name: 'Tema Station', lat: 5.5560, lng: -0.1969 },
  { name: 'Oxford Street, Osu', lat: 5.5568, lng: -0.1817 },
  { name: 'Labone', lat: 5.5723, lng: -0.1687 },
  { name: 'Airport Residential', lat: 5.6040, lng: -0.1810 },
];

// Initialize orders from localStorage or generate mock ones
function getOrders() {
  const stored = localStorage.getItem('swiftdrop_orders');
  if (stored) return JSON.parse(stored);
  return generateMockOrders();
}

function saveOrders(orders) {
  localStorage.setItem('swiftdrop_orders', JSON.stringify(orders));
}

function generateMockOrders() {
  const orders = [];
  const statuses = ['pending', 'active', 'transit', 'delivered', 'delivered', 'delivered'];
  const customers = MOCK_USERS;
  const riders = MOCK_RIDERS;
  for (let i = 1; i <= 18; i++) {
    const pickup = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    let dest;
    do { dest = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)]; } while (dest === pickup);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const rider = riders[Math.floor(Math.random() * riders.length)];
    const pkgType = Object.keys(PKG_SURCHARGE)[Math.floor(Math.random() * Object.keys(PKG_SURCHARGE).length)];
    const dist = Math.round(haversine(pickup.lat, pickup.lng, dest.lat, dest.lng) * 10) / 10;
    const total = (8 + dist * 1.5 + (PKG_SURCHARGE[pkgType] || 0)).toFixed(2);
    const now = Date.now();
    orders.push({
      id: `SD${String(1000 + i).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      riderId: status !== 'pending' ? rider.id : null,
      riderName: status !== 'pending' ? rider.name : null,
      pickup: { name: pickup.name, lat: pickup.lat, lng: pickup.lng },
      destination: { name: dest.name, lat: dest.lat, lng: dest.lng },
      pkgType,
      weight: [0.5,2,7,15][Math.floor(Math.random()*4)],
      status,
      total: parseFloat(total),
      distance: dist,
      notes: '',
      createdAt: new Date(now - Math.random() * 86400000 * 3).toISOString(),
      updatedAt: new Date(now - Math.random() * 3600000).toISOString(),
    });
  }
  saveOrders(orders);
  return orders;
}

// ── Utilities ────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function genOrderId() {
  const orders = getOrders();
  const num = 1001 + orders.length;
  return `SD${num}`;
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatMoney(n) {
  return `₵ ${parseFloat(n).toFixed(2)}`;
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function nudgeCoord(base, range = 0.003) {
  return base + (Math.random() - 0.5) * range;
}

// ── Auth ────────────────────────────────────────────────────

function getCurrentUser() {
  const u = localStorage.getItem('swiftdrop_user');
  return u ? JSON.parse(u) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('swiftdrop_user', JSON.stringify(user));
}

function logoutUser() {
  localStorage.removeItem('swiftdrop_user');
  location.reload();
}

// ── Auth Modal ───────────────────────────────────────────────

function openAuthModal(mode) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderAuthContent(mode);
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function renderAuthContent(mode) {
  const el = document.getElementById('auth-content');
  if (!el) return;
  if (mode === 'login') {
    el.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="font-size:2rem;margin-bottom:0.5rem;">⚡</div>
        <h2 style="font-size:1.25rem;margin-bottom:0.25rem;">Welcome back</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);">Sign in to your SwiftDrop account</p>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="login-email" class="form-input" placeholder="you@example.com" value="ama@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="login-pass" class="form-input" placeholder="••••••••" value="pass123" />
      </div>
      <button class="btn btn-primary btn-full btn-lg" onclick="doLogin()" style="margin-top:0.25rem;">Sign In</button>
      <p style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-top:1rem;">
        No account? <a href="#" onclick="renderAuthContent('register')" style="color:var(--amber);text-decoration:none;">Create one</a>
      </p>
      <p style="text-align:center;font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem;">Demo: ama@example.com / pass123</p>
    `;
  } else {
    el.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="font-size:2rem;margin-bottom:0.5rem;">🚀</div>
        <h2 style="font-size:1.25rem;margin-bottom:0.25rem;">Create Account</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);">Join SwiftDrop today</p>
      </div>
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" id="reg-name" class="form-input" placeholder="Your name" />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="reg-email" class="form-input" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input type="tel" id="reg-phone" class="form-input" placeholder="+233 XX XXX XXXX" />
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="reg-pass" class="form-input" placeholder="Min 6 characters" />
      </div>
      <button class="btn btn-primary btn-full btn-lg" onclick="doRegister()" style="margin-top:0.25rem;">Create Account</button>
      <p style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-top:1rem;">
        Have an account? <a href="#" onclick="renderAuthContent('login')" style="color:var(--amber);text-decoration:none;">Sign in</a>
      </p>
    `;
  }
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const user = MOCK_USERS.find(u => u.email === email && u.password === pass);
  if (!user) { showToast('Invalid credentials', 'error'); return; }
  setCurrentUser(user);
  closeAuthModal();
  showToast(`Welcome back, ${user.name.split(' ')[0]}! 👋`, 'success');
  updateNavForUser(user);
  document.getElementById('hero-section') && (document.getElementById('hero-section').style.display = 'none');
  renderOrdersTab();
}

function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass = document.getElementById('reg-pass').value;
  if (!name || !email || !pass) { showToast('Please fill all required fields', 'error'); return; }
  if (pass.length < 6) { showToast('Password must be 6+ characters', 'error'); return; }
  const newUser = {
    id: `u${Date.now()}`,
    name, email, phone,
    password: pass,
    avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    joined: new Date().toISOString().split('T')[0]
  };
  MOCK_USERS.push(newUser);
  setCurrentUser(newUser);
  closeAuthModal();
  showToast(`Account created! Welcome, ${name.split(' ')[0]}! 🎉`, 'success');
  updateNavForUser(newUser);
  document.getElementById('hero-section') && (document.getElementById('hero-section').style.display = 'none');
}

function updateNavForUser(user) {
  const avatar = document.getElementById('user-avatar');
  const cta = document.getElementById('nav-cta');
  if (avatar) { avatar.textContent = user.avatar; avatar.onclick = () => { if (confirm('Sign out?')) logoutUser(); }; }
  if (cta) { cta.textContent = 'Sign Out'; cta.onclick = logoutUser; }
}

// ── Toast Notifications ──────────────────────────────────────

function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast-out');
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ── Theme ────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('swiftdrop_theme') || 'dark';
  setTheme(saved);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  };
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('swiftdrop_theme', theme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ── Customer App ────────────────────────────────────────────

let customerMap, pickupMarker, destMarker, riderMarker, routeLine;
let selectedPkg = 'Document';
let orderPickup = null, orderDest = null;
let customerSimInterval = null;

function initCustomerApp() {
  const user = getCurrentUser();
  if (user) {
    updateNavForUser(user);
    document.getElementById('hero-section') && (document.getElementById('hero-section').style.display = 'none');
  }
  initCustomerMap();
  updatePriceCard();
  renderOrdersTab();
  // Simulate rider location updates
  customerSimInterval = setInterval(simulateRiderUpdates, 4000);
}

function initCustomerMap() {
  const mapEl = document.getElementById('customer-map');
  if (!mapEl || customerMap) return;
  customerMap = L.map('customer-map', { zoomControl: true }).setView([5.6037, -0.1870], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(customerMap);
  // Click to set pickup/dest
  customerMap.on('click', e => {
    if (!orderPickup) {
      setPickupFromMap(e.latlng.lat, e.latlng.lng);
    } else if (!orderDest) {
      setDestFromMap(e.latlng.lat, e.latlng.lng);
    }
  });
  // Show all active rider positions
  showRidersOnMap();
}

function makeIcon(color, symbol) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};border:2px solid rgba(255,255,255,0.3);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${symbol}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

function setPickupFromMap(lat, lng) {
  const closest = findClosestLocation(lat, lng);
  orderPickup = closest;
  const input = document.getElementById('pickup-input');
  if (input) input.value = closest.name;
  if (pickupMarker) pickupMarker.remove();
  pickupMarker = L.marker([closest.lat, closest.lng], { icon: makeIcon('#f59e0b', '📍') })
    .addTo(customerMap)
    .bindPopup(`<b>Pickup</b><br>${closest.name}`);
  updateRoute();
  updatePriceCard();
}

function setDestFromMap(lat, lng) {
  const closest = findClosestLocation(lat, lng);
  orderDest = closest;
  const input = document.getElementById('dest-input');
  if (input) input.value = closest.name;
  if (destMarker) destMarker.remove();
  destMarker = L.marker([closest.lat, closest.lng], { icon: makeIcon('#14b8a6', '🏁') })
    .addTo(customerMap)
    .bindPopup(`<b>Destination</b><br>${closest.name}`);
  updateRoute();
  updatePriceCard();
}

function findClosestLocation(lat, lng) {
  return MOCK_LOCATIONS.reduce((closest, loc) => {
    const d = haversine(lat, lng, loc.lat, loc.lng);
    return d < haversine(lat, lng, closest.lat, closest.lng) ? loc : closest;
  }, MOCK_LOCATIONS[0]);
}

function geocodeLive(type, val) {
  const match = MOCK_LOCATIONS.find(l => l.name.toLowerCase().includes(val.toLowerCase()));
  if (match) {
    if (type === 'pickup') setPickupFromMap(match.lat, match.lng);
    else setDestFromMap(match.lat, match.lng);
  }
}

function updateRoute() {
  if (!customerMap) return;
  if (routeLine) routeLine.remove();
  if (orderPickup && orderDest) {
    routeLine = L.polyline([
      [orderPickup.lat, orderPickup.lng],
      [orderDest.lat, orderDest.lng]
    ], { color: '#f59e0b', weight: 3, dashArray: '8,4', opacity: 0.8 }).addTo(customerMap);
    customerMap.fitBounds([[orderPickup.lat, orderPickup.lng], [orderDest.lat, orderDest.lng]], { padding: [40, 40] });
  }
}

function showRidersOnMap() {
  if (!customerMap) return;
  MOCK_RIDERS.filter(r => r.online).forEach(rider => {
    L.marker([rider.lat, rider.lng], { icon: makeIcon('#22c55e', '🏍️') })
      .addTo(customerMap)
      .bindPopup(`<b>${rider.name}</b><br>⭐ ${rider.rating} · ${rider.vehicle}<br><span style="color:#22c55e;">Available</span>`);
  });
}

function simulateRiderUpdates() {
  const orders = getOrders();
  const activeOrders = orders.filter(o => o.status === 'transit' || o.status === 'active');
  if (activeOrders.length === 0) return;
  // Move markers
  activeOrders.forEach(order => {
    if (!order.riderId) return;
    const rider = MOCK_RIDERS.find(r => r.id === order.riderId);
    if (rider) {
      rider.lat = nudgeCoord(rider.lat, 0.001);
      rider.lng = nudgeCoord(rider.lng, 0.001);
    }
  });
}

function selectPkg(el, name) {
  document.querySelectorAll('.pkg-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPkg = name;
  updatePriceCard();
}

function updatePriceCard() {
  const baseFare = 8;
  const dist = (orderPickup && orderDest) ? haversine(orderPickup.lat, orderPickup.lng, orderDest.lat, orderDest.lng) : 0;
  const distFee = dist * 1.5;
  const pkgFee = PKG_SURCHARGE[selectedPkg] || 0;
  const total = baseFare + distFee + pkgFee;
  const el = id => document.getElementById(id);
  if (el('price-base')) el('price-base').textContent = formatMoney(baseFare);
  if (el('price-dist')) el('price-dist').textContent = formatMoney(distFee);
  if (el('price-pkg')) el('price-pkg').textContent = formatMoney(pkgFee);
  if (el('price-total')) el('price-total').textContent = formatMoney(total);
}

function placeOrder() {
  const user = getCurrentUser();
  if (!user) { openAuthModal('login'); showToast('Please sign in to place an order', 'warning'); return; }
  if (!orderPickup) { showToast('Please set a pickup location', 'warning'); return; }
  if (!orderDest) { showToast('Please set a delivery destination', 'warning'); return; }

  const weight = parseFloat(document.getElementById('weight-select').value);
  const notes = document.getElementById('order-notes').value;
  const dist = haversine(orderPickup.lat, orderPickup.lng, orderDest.lat, orderDest.lng);
  const total = 8 + dist * 1.5 + (PKG_SURCHARGE[selectedPkg] || 0);
  const availableRiders = MOCK_RIDERS.filter(r => r.online && r.status === 'available');
  const assignedRider = availableRiders.length > 0 ? availableRiders[Math.floor(Math.random() * availableRiders.length)] : null;

  const order = {
    id: genOrderId(),
    customerId: user.id,
    customerName: user.name,
    riderId: assignedRider ? assignedRider.id : null,
    riderName: assignedRider ? assignedRider.name : null,
    pickup: { ...orderPickup },
    destination: { ...orderDest },
    pkgType: selectedPkg,
    weight,
    notes,
    status: assignedRider ? 'active' : 'pending',
    total: parseFloat(total.toFixed(2)),
    distance: parseFloat(dist.toFixed(1)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  showToast(assignedRider ? `Order placed! ${assignedRider.name} is on the way 🏍️` : 'Order placed! Finding a rider...', 'success');

  // Reset form
  orderPickup = null;
  orderDest = null;
  document.getElementById('pickup-input').value = '';
  document.getElementById('dest-input').value = '';
  document.getElementById('order-notes').value = '';
  if (pickupMarker) { pickupMarker.remove(); pickupMarker = null; }
  if (destMarker) { destMarker.remove(); destMarker = null; }
  if (routeLine) { routeLine.remove(); routeLine = null; }
  updatePriceCard();

  // Switch to orders tab
  switchView('orders', document.querySelector('.tab-btn:nth-child(2)'));
  renderOrdersTab();

  // Simulate status progression
  simulateOrderProgress(order.id);
}

function simulateOrderProgress(orderId) {
  const steps = ['active', 'transit', 'delivered'];
  let step = 0;
  const interval = setInterval(() => {
    if (step >= steps.length) { clearInterval(interval); return; }
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx].status = steps[step];
      orders[idx].updatedAt = new Date().toISOString();
      saveOrders(orders);
      renderOrdersTab();
      const msgs = { active: 'Rider accepted your order! 🏍️', transit: 'Your package is on the way! 🚀', delivered: 'Package delivered! Rate your experience ⭐' };
      showToast(msgs[steps[step]], step === 2 ? 'success' : 'info');
    }
    step++;
  }, 8000);
}

function switchView(view, btnEl) {
  document.getElementById('view-new').style.display = view === 'new' ? 'block' : 'none';
  document.getElementById('view-orders').style.display = view === 'orders' ? 'block' : 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  if (view === 'orders') renderOrdersTab();
}

function renderOrdersTab() {
  const container = document.getElementById('orders-list');
  if (!container) return;
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">Sign in to view your orders</div></div>`;
    return;
  }
  const orders = getOrders().filter(o => o.customerId === user.id);
  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No orders yet.<br>Place your first delivery!</div></div>`;
    return;
  }
  container.innerHTML = orders.map(order => `
    <div class="order-card fade-in" onclick="showOrderDetail('${order.id}')">
      <div class="order-card-header">
        <div>
          <div class="order-id">${order.id}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);font-family:var(--font-mono);">${timeAgo(order.createdAt)}</div>
        </div>
        <span class="badge badge-${order.status}">${order.status === 'transit' ? 'In Transit' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
      </div>
      <div class="order-route">
        <div class="route-point"><span class="route-icon pickup">◆</span><span>${order.pickup.name}</span></div>
        <div class="route-connector"></div>
        <div class="route-point"><span class="route-icon dest">●</span><span>${order.destination.name}</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="chip">${order.pkgType}</div>
        <div style="font-weight:700;font-family:var(--font-mono);color:var(--amber);">${formatMoney(order.total)}</div>
      </div>
    </div>
  `).join('');
}

function showOrderDetail(orderId) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;
  const modal = document.getElementById('order-modal');
  const content = document.getElementById('order-modal-content');
  if (!modal || !content) return;

  const statusIdx = STATUS_FLOW.indexOf(order.status);
  const steps = [
    { key: 'pending', label: 'Placed' },
    { key: 'active', label: 'Accepted' },
    { key: 'transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
  ];

  content.innerHTML = `
    <h2 style="font-size:1.1rem;margin-bottom:0.25rem;">Order ${order.id}</h2>
    <p style="font-size:0.8rem;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:1.25rem;">${new Date(order.createdAt).toLocaleString()}</p>

    <div class="progress-steps" style="margin-bottom:1.5rem;">
      ${steps.map((s, i) => `
        <div class="step ${i < statusIdx ? 'completed' : ''} ${i === statusIdx ? 'active' : ''}">
          <div class="step-dot">${i < statusIdx ? '✓' : i + 1}</div>
          <div class="step-label">${s.label}</div>
        </div>
      `).join('')}
    </div>

    <div class="card card-sm" style="margin-bottom:1rem;">
      <div class="route-point" style="margin-bottom:0.5rem;"><span class="route-icon pickup">◆</span><div><div style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono);">PICKUP</div><div style="font-weight:600;">${order.pickup.name}</div></div></div>
      <div class="route-connector" style="margin-left:9px;margin-bottom:0.5rem;height:16px;"></div>
      <div class="route-point"><span class="route-icon dest">●</span><div><div style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono);">DESTINATION</div><div style="font-weight:600;">${order.destination.name}</div></div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
      <div class="card card-sm"><div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;">Package</div><div style="font-weight:600;margin-top:0.2rem;">${order.pkgType}</div></div>
      <div class="card card-sm"><div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;">Distance</div><div style="font-weight:600;margin-top:0.2rem;">${order.distance} km</div></div>
      <div class="card card-sm"><div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;">Rider</div><div style="font-weight:600;margin-top:0.2rem;">${order.riderName || 'Finding...'}</div></div>
      <div class="card card-sm"><div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;">Total</div><div style="font-weight:700;margin-top:0.2rem;color:var(--amber);">${formatMoney(order.total)}</div></div>
    </div>

    ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
      <button class="btn btn-danger btn-full" onclick="cancelOrder('${order.id}')">Cancel Order</button>
    ` : ''}
    ${order.status === 'delivered' ? `
      <div style="text-align:center;padding:1rem;color:var(--green);font-weight:700;">
        ✅ Delivered Successfully!
      </div>
    ` : ''}
  `;
  modal.classList.remove('hidden');

  // Focus map on order route
  if (customerMap && order.pickup && order.destination) {
    if (pickupMarker) pickupMarker.remove();
    if (destMarker) destMarker.remove();
    if (routeLine) routeLine.remove();
    pickupMarker = L.marker([order.pickup.lat, order.pickup.lng], { icon: makeIcon('#f59e0b', '📍') }).addTo(customerMap).bindPopup(`Pickup: ${order.pickup.name}`).openPopup();
    destMarker = L.marker([order.destination.lat, order.destination.lng], { icon: makeIcon('#14b8a6', '🏁') }).addTo(customerMap).bindPopup(`Destination: ${order.destination.name}`);
    routeLine = L.polyline([[order.pickup.lat, order.pickup.lng], [order.destination.lat, order.destination.lng]], { color: '#f59e0b', weight: 3, dashArray: '8,4', opacity: 0.8 }).addTo(customerMap);
    customerMap.fitBounds([[order.pickup.lat, order.pickup.lng], [order.destination.lat, order.destination.lng]], { padding: [60, 60] });
  }
}

function cancelOrder(orderId) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    orders[idx].status = 'cancelled';
    orders[idx].updatedAt = new Date().toISOString();
    saveOrders(orders);
    document.getElementById('order-modal').classList.add('hidden');
    showToast('Order cancelled', 'warning');
    renderOrdersTab();
  }
}

// Expose to window
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.renderAuthContent = renderAuthContent;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.logoutUser = logoutUser;
window.showToast = showToast;
window.initTheme = initTheme;
window.setTheme = setTheme;
window.initCustomerApp = initCustomerApp;
window.switchView = switchView;
window.geocodeLive = geocodeLive;
window.selectPkg = selectPkg;
window.placeOrder = placeOrder;
window.showOrderDetail = showOrderDetail;
window.cancelOrder = cancelOrder;
window.getCurrentUser = getCurrentUser;
window.getOrders = getOrders;
window.saveOrders = saveOrders;
window.MOCK_RIDERS = MOCK_RIDERS;
window.MOCK_USERS = MOCK_USERS;
window.MOCK_LOCATIONS = MOCK_LOCATIONS;
window.formatMoney = formatMoney;
window.timeAgo = timeAgo;
window.haversine = haversine;
window.STATUS_FLOW = STATUS_FLOW;
window.nudgeCoord = nudgeCoord;
window.makeIcon = makeIcon;

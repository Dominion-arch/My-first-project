// ============================================================
//  SWIFTDROP — rider.js
//  Rider portal: login, order management, map, earnings
// ============================================================

'use strict';

let currentRider = null;
let isOnline = false;
let riderMap = null;
let riderMarkers = {};
let riderSimInterval = null;

function initRiderApp() {
  const stored = localStorage.getItem('swiftdrop_rider');
  if (stored) {
    currentRider = JSON.parse(stored);
    showRiderApp();
  }
}

function riderLogin() {
  const email = document.getElementById('rider-email').value.trim();
  const pass = document.getElementById('rider-pass').value;
  const rider = MOCK_RIDERS.find(r => r.email === email && r.password === pass);
  if (!rider) { showToast('Invalid rider credentials', 'error'); return; }
  currentRider = rider;
  localStorage.setItem('swiftdrop_rider', JSON.stringify(rider));
  showRiderApp();
  showToast(`Welcome back, ${rider.name.split(' ')[0]}! 🏍️`, 'success');
}

function riderLogout() {
  if (!confirm('Sign out?')) return;
  localStorage.removeItem('swiftdrop_rider');
  currentRider = null;
  isOnline = false;
  if (riderSimInterval) clearInterval(riderSimInterval);
  document.getElementById('rider-login-screen').style.display = 'flex';
  document.getElementById('rider-app').style.display = 'none';
}

function showRiderApp() {
  document.getElementById('rider-login-screen').style.display = 'none';
  document.getElementById('rider-app').style.display = 'flex';

  // Update avatar
  const av = document.getElementById('rider-avatar-display');
  if (av && currentRider) av.textContent = currentRider.avatar;

  // Mark rider as known online from last session
  const savedOnline = localStorage.getItem('rider_online') === 'true';
  if (savedOnline) toggleOnline();

  renderAvailableOrders();
  renderActiveOrders();
  updateEarnings();
  initRiderMap();

  // Simulate incoming orders when online
  riderSimInterval = setInterval(() => {
    if (isOnline) {
      renderAvailableOrders();
      updateEarnings();
    }
  }, 6000);
}

function toggleOnline() {
  isOnline = !isOnline;
  const toggle = document.getElementById('online-toggle');
  const text = document.getElementById('online-status-text');
  localStorage.setItem('rider_online', isOnline);

  if (isOnline) {
    toggle.classList.add('online');
    text.textContent = 'Online';
    showToast('You are now online and receiving orders 🟢', 'success');
    renderAvailableOrders();
  } else {
    toggle.classList.remove('online');
    text.textContent = 'Offline';
    showToast('You are offline', 'info');
    renderAvailableOrders();
  }
}

function switchRiderTab(tab) {
  const tabs = ['available', 'active', 'map', 'earnings'];
  tabs.forEach(t => {
    const content = document.getElementById(`rider-view-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (content) content.style.display = t === tab ? 'flex' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'map') {
    setTimeout(() => {
      if (riderMap) riderMap.invalidateSize();
    }, 200);
  }
  if (tab === 'earnings') updateEarnings();
  if (tab === 'active') renderActiveOrders();
}

function getMyOrders() {
  if (!currentRider) return [];
  return getOrders().filter(o => o.riderId === currentRider.id);
}

function getAvailableOrders() {
  return getOrders().filter(o => o.status === 'pending');
}

function renderAvailableOrders() {
  const container = document.getElementById('available-orders-list');
  const countBadge = document.getElementById('available-count');
  if (!container) return;

  if (!isOnline) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📴</div><div class="empty-state-text">Go online to receive delivery orders</div></div>`;
    if (countBadge) countBadge.textContent = '0';
    return;
  }

  const orders = getAvailableOrders();
  if (countBadge) countBadge.textContent = orders.length;

  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">No pending orders right now.<br>Check back soon!</div></div>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    const dist = haversine(
      currentRider.lat, currentRider.lng,
      order.pickup.lat, order.pickup.lng
    );
    const earnings = order.total * 0.7; // 70% to rider

    return `
      <div class="delivery-card fade-in">
        <div class="delivery-card-head">
          <div class="delivery-meta">
            <div class="delivery-id">${order.id}</div>
            <div class="delivery-customer">${order.customerName}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.15rem;">${order.pkgType} · ${order.weight}kg</div>
          </div>
          <div style="text-align:right;">
            <div class="delivery-earnings">${formatMoney(earnings)}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono);">${dist.toFixed(1)}km away</div>
          </div>
        </div>
        <div class="delivery-card-body">
          <div class="order-route">
            <div class="route-point"><span class="route-icon pickup">◆</span><span style="font-size:0.875rem;">${order.pickup.name}</span></div>
            <div class="route-connector"></div>
            <div class="route-point"><span class="route-icon dest">●</span><span style="font-size:0.875rem;">${order.destination.name}</span></div>
          </div>
          ${order.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.5rem;padding:0.5rem;background:var(--glass);border-radius:6px;">📝 ${order.notes}</div>` : ''}
        </div>
        <div class="delivery-card-footer">
          <button class="btn btn-danger btn-sm" style="flex:1;" onclick="rejectOrder('${order.id}')">
            ✕ Decline
          </button>
          <button class="btn btn-success" style="flex:2;padding:0.75rem;" onclick="acceptOrder('${order.id}')">
            ✓ Accept Order
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function acceptOrder(orderId) {
  if (!currentRider) return;
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return;
  orders[idx].riderId = currentRider.id;
  orders[idx].riderName = currentRider.name;
  orders[idx].status = 'active';
  orders[idx].updatedAt = new Date().toISOString();
  saveOrders(orders);
  showToast(`Order ${orderId} accepted! Head to pickup. 🏍️`, 'success');
  renderAvailableOrders();
  renderActiveOrders();
  updateRiderMap(orders[idx]);
}

function rejectOrder(orderId) {
  showToast('Order declined', 'info');
  // Temporarily hide from list (just re-render without it showing - in a real app we'd track rejected IDs)
  renderAvailableOrders();
}

function renderActiveOrders() {
  const container = document.getElementById('active-orders-list');
  if (!container) return;
  const orders = getMyOrders().filter(o => ['active', 'transit'].includes(o.status));

  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No active deliveries.<br>Accept an order to get started.</div></div>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    const nextStatus = order.status === 'active' ? 'transit' : 'delivered';
    const btnConfigs = {
      active: { label: '📦 Confirm Pickup', cls: 'pickup', next: 'transit' },
      transit: { label: '✅ Mark as Delivered', cls: 'delivered', next: 'delivered' },
    };
    const btn = btnConfigs[order.status];

    return `
      <div class="delivery-card fade-in">
        <div class="delivery-card-head">
          <div class="delivery-meta">
            <div class="delivery-id">${order.id}</div>
            <div class="delivery-customer">${order.customerName}</div>
          </div>
          <span class="badge badge-${order.status}">${order.status === 'active' ? 'Pending Pickup' : 'In Transit'}</span>
        </div>
        <div class="delivery-card-body">
          <div class="order-route">
            <div class="route-point"><span class="route-icon pickup">◆</span><span style="font-size:0.875rem;">${order.pickup.name}</span></div>
            <div class="route-connector"></div>
            <div class="route-point"><span class="route-icon dest">●</span><span style="font-size:0.875rem;">${order.destination.name}</span></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.75rem;">
            <div style="font-size:0.75rem;color:var(--text-muted);"><span style="color:var(--text-secondary);font-weight:600;">${order.pkgType}</span><br>Package Type</div>
            <div style="font-size:0.75rem;color:var(--text-muted);text-align:right;"><span style="color:var(--amber);font-weight:700;font-family:var(--font-mono);">${formatMoney(order.total * 0.7)}</span><br>Your Earnings</div>
          </div>
        </div>
        <div class="delivery-card-footer">
          <button class="status-btn ${btn.cls}" style="flex:1;" onclick="updateDeliveryStatus('${order.id}', '${btn.next}')">
            ${btn.label}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateDeliveryStatus(orderId, newStatus) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return;
  orders[idx].status = newStatus;
  orders[idx].updatedAt = new Date().toISOString();
  saveOrders(orders);

  const msgs = {
    transit: '🚀 Package picked up! En route to delivery.',
    delivered: '🎉 Delivery completed! Great job!',
  };
  showToast(msgs[newStatus] || 'Status updated', 'success');
  renderActiveOrders();
  updateEarnings();

  if (newStatus === 'delivered') {
    switchRiderTab('earnings');
  } else {
    updateRiderMap(orders[idx]);
  }
}

function updateEarnings() {
  if (!currentRider) return;
  const myDeliveries = getOrders().filter(o => o.riderId === currentRider.id && o.status === 'delivered');
  const today = new Date().toDateString();
  const todayDeliveries = myDeliveries.filter(o => new Date(o.updatedAt).toDateString() === today);
  const todayEarnings = todayDeliveries.reduce((sum, o) => sum + (o.total * 0.7), 0);
  const weekEarnings = myDeliveries.reduce((sum, o) => sum + (o.total * 0.7), 0);

  const el = id => document.getElementById(id);
  if (el('today-earnings')) el('today-earnings').textContent = formatMoney(todayEarnings);
  if (el('today-deliveries')) el('today-deliveries').textContent = `${todayDeliveries.length} deliveries completed`;
  if (el('weekly-earnings')) el('weekly-earnings').textContent = formatMoney(weekEarnings);
  if (el('weekly-deliveries')) el('weekly-deliveries').textContent = myDeliveries.length;

  const historyEl = el('earnings-history');
  if (historyEl) {
    if (myDeliveries.length === 0) {
      historyEl.innerHTML = `<div class="empty-state" style="padding:1.5rem;"><div class="empty-state-icon">📊</div><div class="empty-state-text">Complete deliveries to see history</div></div>`;
      return;
    }
    historyEl.innerHTML = myDeliveries.slice(0, 8).map(o => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.65rem 0;border-bottom:1px solid var(--navy-border);">
        <div>
          <div style="font-size:0.875rem;font-weight:600;">${o.id}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">${timeAgo(o.updatedAt)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;font-family:var(--font-mono);color:var(--green);">${formatMoney(o.total * 0.7)}</div>
          <div style="font-size:0.7rem;color:var(--text-muted);">${o.distance}km</div>
        </div>
      </div>
    `).join('');
  }
}

function initRiderMap() {
  const mapEl = document.getElementById('rider-map');
  if (!mapEl || riderMap) return;
  const center = currentRider ? [currentRider.lat, currentRider.lng] : [5.6037, -0.1870];
  riderMap = L.map('rider-map').setView(center, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(riderMap);

  // Rider own location marker
  if (currentRider) {
    L.marker([currentRider.lat, currentRider.lng], { icon: makeIcon('#22c55e', '🏍️') })
      .addTo(riderMap)
      .bindPopup(`<b>You (${currentRider.name})</b><br>${currentRider.vehicle}`)
      .openPopup();
  }
}

function updateRiderMap(order) {
  if (!riderMap) return;
  // Clear old markers except rider
  Object.values(riderMarkers).forEach(m => m.remove());
  riderMarkers = {};

  if (order && order.pickup) {
    riderMarkers.pickup = L.marker([order.pickup.lat, order.pickup.lng], { icon: makeIcon('#f59e0b', '📍') })
      .addTo(riderMap)
      .bindPopup(`<b>Pickup</b><br>${order.pickup.name}`);
  }
  if (order && order.destination) {
    riderMarkers.dest = L.marker([order.destination.lat, order.destination.lng], { icon: makeIcon('#14b8a6', '🏁') })
      .addTo(riderMap)
      .bindPopup(`<b>Destination</b><br>${order.destination.name}`);
  }
  if (order && order.pickup && order.destination) {
    riderMarkers.route = L.polyline([
      [order.pickup.lat, order.pickup.lng],
      [order.destination.lat, order.destination.lng],
    ], { color: '#f59e0b', weight: 3, dashArray: '8,4' }).addTo(riderMap);
    riderMap.fitBounds([[order.pickup.lat, order.pickup.lng], [order.destination.lat, order.destination.lng]], { padding: [30, 30] });

    // Update nav info
    const nextStop = document.getElementById('rider-next-stop');
    const eta = document.getElementById('rider-eta');
    if (nextStop) nextStop.textContent = order.status === 'active' ? order.pickup.name : order.destination.name;
    if (eta) {
      const dist = haversine(
        currentRider ? currentRider.lat : order.pickup.lat,
        currentRider ? currentRider.lng : order.pickup.lng,
        order.pickup.lat, order.pickup.lng
      );
      const etaMins = Math.round(dist / 0.5);
      eta.textContent = `ETA ~${etaMins} min`;
    }
  }
}

window.initRiderApp = initRiderApp;
window.riderLogin = riderLogin;
window.riderLogout = riderLogout;
window.toggleOnline = toggleOnline;
window.switchRiderTab = switchRiderTab;
window.acceptOrder = acceptOrder;
window.rejectOrder = rejectOrder;
window.updateDeliveryStatus = updateDeliveryStatus;

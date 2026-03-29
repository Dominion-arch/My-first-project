// ============================================================
//  SWIFTDROP — dashboard.js
//  Admin Dashboard: stats, tables, map, riders management
// ============================================================

'use strict';

let adminMap = null;
let adminMarkers = [];
let dashSimInterval = null;
let currentPage = 'overview';
let allOrdersCache = [];

function initDashboard() {
  allOrdersCache = getOrders();
  renderStats();
  renderRidersStatus();
  renderRecentOrders();
  renderActivityChart();
  updatePendingBadge();

  // Simulate live updates
  dashSimInterval = setInterval(() => {
    simulateLiveUpdate();
    if (currentPage === 'overview') {
      renderStats();
      renderRecentOrders();
      renderRidersStatus();
    }
    if (currentPage === 'orders') renderAllOrders();
    if (currentPage === 'map' && adminMap) updateAdminMapMarkers();
    updatePendingBadge();
  }, 5000);
}

function simulateLiveUpdate() {
  const orders = getOrders();
  // Randomly progress one active/transit order
  const active = orders.filter(o => ['active', 'transit'].includes(o.status));
  if (active.length > 0 && Math.random() < 0.3) {
    const order = active[Math.floor(Math.random() * active.length)];
    const idx = orders.findIndex(o => o.id === order.id);
    const nextMap = { active: 'transit', transit: 'delivered' };
    if (nextMap[order.status]) {
      orders[idx].status = nextMap[order.status];
      orders[idx].updatedAt = new Date().toISOString();
      saveOrders(orders);
      allOrdersCache = orders;
      showToast(`Order ${order.id} → ${orders[idx].status.toUpperCase()}`, 'info');
    }
  }
  // Move riders
  MOCK_RIDERS.filter(r => r.online).forEach(r => {
    r.lat = nudgeCoord(r.lat, 0.0008);
    r.lng = nudgeCoord(r.lng, 0.0008);
  });
}

function simulateNewOrder() {
  const orders = getOrders();
  const customer = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
  const pickup = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
  let dest;
  do { dest = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)]; } while (dest === pickup);
  const pkgTypes = Object.keys({ 'Document': 0, 'Small Box': 2, 'Large Box': 5, 'Fragile': 8, 'Food': 3, 'Electronics': 10 });
  const pkg = pkgTypes[Math.floor(Math.random() * pkgTypes.length)];
  const dist = haversine(pickup.lat, pickup.lng, dest.lat, dest.lng);
  const total = (8 + dist * 1.5 + ({ 'Document': 0, 'Small Box': 2, 'Large Box': 5, 'Fragile': 8, 'Food': 3, 'Electronics': 10 }[pkg] || 0)).toFixed(2);
  const newOrder = {
    id: `SD${1000 + orders.length + 1}`,
    customerId: customer.id,
    customerName: customer.name,
    riderId: null, riderName: null,
    pickup: { name: pickup.name, lat: pickup.lat, lng: pickup.lng },
    destination: { name: dest.name, lat: dest.lat, lng: dest.lng },
    pkgType: pkg, weight: 2,
    status: 'pending',
    total: parseFloat(total),
    distance: parseFloat(dist.toFixed(1)),
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.unshift(newOrder);
  saveOrders(orders);
  allOrdersCache = orders;
  showToast(`New order ${newOrder.id} from ${customer.name}!`, 'warning');
  renderStats();
  renderRecentOrders();
  updatePendingBadge();
}

function renderStats() {
  const orders = getOrders();
  const pending = orders.filter(o => o.status === 'pending').length;
  const active = orders.filter(o => ['active', 'transit'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const revenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const onlineRiders = MOCK_RIDERS.filter(r => r.online).length;

  const stats = [
    { label: 'Total Orders', value: orders.length, delta: '+12% today', accent: 'var(--amber)' },
    { label: 'Pending', value: pending, delta: 'Awaiting rider', accent: 'var(--amber)' },
    { label: 'Active / Transit', value: active, delta: 'Live deliveries', accent: 'var(--teal)' },
    { label: 'Delivered Today', value: delivered, delta: `₵${revenue.toFixed(0)} revenue`, accent: 'var(--green)' },
  ];

  const grid = document.getElementById('stats-grid');
  if (!grid) return;
  grid.innerHTML = stats.map(s => `
    <div class="stat-card" style="--accent-color:${s.accent};">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-delta">${s.delta}</div>
    </div>
  `).join('');
}

function renderRidersStatus() {
  const container = document.getElementById('riders-status-list');
  if (!container) return;
  container.innerHTML = MOCK_RIDERS.map(rider => {
    const riderOrders = getOrders().filter(o => o.riderId === rider.id && ['active','transit'].includes(o.status));
    const statusColor = rider.online ? (riderOrders.length > 0 ? 'var(--amber)' : 'var(--green)') : 'var(--text-muted)';
    const statusText = rider.online ? (riderOrders.length > 0 ? `On delivery (${riderOrders.length})` : 'Available') : 'Offline';
    return `
      <div class="rider-status-card">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--purple));display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#fff;flex-shrink:0;">${rider.avatar}</div>
        <div class="rider-info">
          <div class="rider-name">${rider.name}</div>
          <div class="rider-sub" style="color:${statusColor};">${statusText}</div>
        </div>
        <div class="rider-status-dot" style="background:${statusColor};"></div>
      </div>
    `;
  }).join('');
}

function renderRecentOrders() {
  const tbody = document.getElementById('recent-orders-tbody');
  if (!tbody) return;
  const orders = getOrders().slice(0, 8);
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span style="font-family:var(--font-mono);color:var(--amber);">${o.id}</span></td>
      <td>${o.customerName}</td>
      <td>${o.riderName || '<span style="color:var(--text-muted);">—</span>'}</td>
      <td><span class="badge badge-${o.status}">${formatStatus(o.status)}</span></td>
      <td style="font-family:var(--font-mono);color:var(--green);">${formatMoney(o.total)}</td>
      <td style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">${timeAgo(o.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openAdminOrderDetail('${o.id}')" title="View">👁</button>
          ${o.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="assignRider('${o.id}')">Assign</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderActivityChart() {
  const chart = document.getElementById('activity-chart');
  if (!chart) return;
  const vals = [12, 19, 8, 24, 31, 15, 22];
  const max = Math.max(...vals);
  chart.innerHTML = vals.map((v, i) => `
    <div class="chart-bar" style="height:${(v / max * 100)}%;background:${i === 6 ? 'var(--amber)' : 'rgba(245,158,11,0.3)'};" title="Day ${i+1}: ${v} orders"></div>
  `).join('');
}

function updatePendingBadge() {
  const badge = document.getElementById('pending-badge');
  if (badge) badge.textContent = getOrders().filter(o => o.status === 'pending').length;
}

function showDashPage(page, btnEl) {
  currentPage = page;
  const pages = ['overview', 'orders', 'map', 'riders', 'customers', 'settings'];
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.style.display = p === page ? 'block' : 'none';
  });
  // Update sidebar active state
  if (btnEl) {
    document.querySelectorAll('.dash-nav-item').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  // Init page-specific content
  if (page === 'orders') renderAllOrders();
  if (page === 'map') initAdminMap();
  if (page === 'riders') renderRidersPage();
  if (page === 'customers') renderCustomersPage();
}

function renderAllOrders() {
  allOrdersCache = getOrders();
  filterOrders();
  const el = document.getElementById('orders-count-text');
  if (el) el.textContent = `${allOrdersCache.length} total orders`;

  // Populate rider filter
  const riderFilter = document.getElementById('filter-rider');
  if (riderFilter) {
    const current = riderFilter.value;
    const opts = ['<option value="">All Riders</option>'];
    MOCK_RIDERS.forEach(r => opts.push(`<option value="${r.id}" ${current===r.id?'selected':''}>${r.name}</option>`));
    riderFilter.innerHTML = opts.join('');
  }
}

function filterOrders() {
  const search = (document.getElementById('order-search')?.value || '').toLowerCase();
  const status = document.getElementById('filter-status')?.value || '';
  const rider = document.getElementById('filter-rider')?.value || '';
  const pkg = document.getElementById('filter-pkg')?.value || '';

  let orders = allOrdersCache;
  if (search) orders = orders.filter(o =>
    o.id.toLowerCase().includes(search) ||
    o.customerName.toLowerCase().includes(search) ||
    (o.riderName || '').toLowerCase().includes(search) ||
    o.pickup.name.toLowerCase().includes(search) ||
    o.destination.name.toLowerCase().includes(search)
  );
  if (status) orders = orders.filter(o => o.status === status);
  if (rider) orders = orders.filter(o => o.riderId === rider);
  if (pkg) orders = orders.filter(o => o.pkgType === pkg);

  const tbody = document.getElementById('all-orders-tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted);">No orders match your filters</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span style="font-family:var(--font-mono);color:var(--amber);">${o.id}</span></td>
      <td>${o.customerName}</td>
      <td style="font-size:0.8rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.pickup.name}</td>
      <td style="font-size:0.8rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.destination.name}</td>
      <td>${o.riderName || '<span style="color:var(--text-muted);">Unassigned</span>'}</td>
      <td><span class="chip">${o.pkgType}</span></td>
      <td><span class="badge badge-${o.status}">${formatStatus(o.status)}</span></td>
      <td style="font-family:var(--font-mono);color:var(--green);">${formatMoney(o.total)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openAdminOrderDetail('${o.id}')" title="View">👁</button>
          ${o.status === 'pending' ? `<button class="btn btn-teal btn-sm" onclick="assignRider('${o.id}')">Assign</button>` : ''}
          ${['pending','active','transit'].includes(o.status) ? `<button class="btn btn-danger btn-sm" onclick="adminCancelOrder('${o.id}')">Cancel</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function clearFilters() {
  const ids = ['order-search', 'filter-status', 'filter-rider', 'filter-pkg'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  filterOrders();
}

function assignRider(orderId) {
  const availableRiders = MOCK_RIDERS.filter(r => r.online && r.status === 'available');
  if (availableRiders.length === 0) {
    showToast('No available riders online', 'warning');
    return;
  }
  const rider = availableRiders[Math.floor(Math.random() * availableRiders.length)];
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    orders[idx].riderId = rider.id;
    orders[idx].riderName = rider.name;
    orders[idx].status = 'active';
    orders[idx].updatedAt = new Date().toISOString();
    saveOrders(orders);
    allOrdersCache = orders;
    showToast(`${rider.name} assigned to ${orderId} ✅`, 'success');
    renderStats();
    renderRecentOrders();
    renderAllOrders();
    updatePendingBadge();
  }
}

function adminCancelOrder(orderId) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    orders[idx].status = 'cancelled';
    orders[idx].updatedAt = new Date().toISOString();
    saveOrders(orders);
    allOrdersCache = orders;
    showToast(`Order ${orderId} cancelled`, 'warning');
    renderStats();
    renderRecentOrders();
    renderAllOrders();
    updatePendingBadge();
  }
}

function openAdminOrderDetail(orderId) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;
  const modal = document.getElementById('admin-order-modal');
  const content = document.getElementById('admin-order-modal-content');
  if (!modal || !content) return;

  const rider = MOCK_RIDERS.find(r => r.id === order.riderId);

  content.innerHTML = `
    <h2 style="font-size:1.1rem;margin-bottom:1.25rem;">Order ${order.id}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
      <div class="card card-sm">
        <div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:0.3rem;">Customer</div>
        <div style="font-weight:600;">${order.customerName}</div>
      </div>
      <div class="card card-sm">
        <div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:0.3rem;">Status</div>
        <span class="badge badge-${order.status}">${formatStatus(order.status)}</span>
      </div>
      <div class="card card-sm">
        <div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:0.3rem;">Rider</div>
        <div style="font-weight:600;">${order.riderName || 'Unassigned'}</div>
      </div>
      <div class="card card-sm">
        <div style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:0.3rem;">Amount</div>
        <div style="font-weight:700;color:var(--amber);font-family:var(--font-mono);">${formatMoney(order.total)}</div>
      </div>
    </div>
    <div class="card card-sm" style="margin-bottom:1rem;">
      <div class="route-point" style="margin-bottom:0.5rem;"><span class="route-icon pickup">◆</span><div><div style="font-size:0.72rem;color:var(--text-muted);">PICKUP</div><div style="font-weight:600;">${order.pickup.name}</div></div></div>
      <div class="route-connector" style="margin-left:9px;margin-bottom:0.5rem;height:16px;"></div>
      <div class="route-point"><span class="route-icon dest">●</span><div><div style="font-size:0.72rem;color:var(--text-muted);">DESTINATION</div><div style="font-weight:600;">${order.destination.name}</div></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:1.25rem;">
      <div class="card card-sm" style="text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-muted);">Type</div>
        <div style="font-weight:700;margin-top:0.2rem;">${order.pkgType}</div>
      </div>
      <div class="card card-sm" style="text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-muted);">Distance</div>
        <div style="font-weight:700;margin-top:0.2rem;">${order.distance}km</div>
      </div>
      <div class="card card-sm" style="text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-muted);">Weight</div>
        <div style="font-weight:700;margin-top:0.2rem;">${order.weight}kg</div>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
      ${order.status === 'pending' ? `<button class="btn btn-teal btn-sm" onclick="assignRider('${order.id}');document.getElementById('admin-order-modal').classList.add('hidden')">Assign Rider</button>` : ''}
      ${['pending','active','transit'].includes(order.status) ? `<button class="btn btn-danger btn-sm" onclick="adminCancelOrder('${order.id}');document.getElementById('admin-order-modal').classList.add('hidden')">Cancel Order</button>` : ''}
    </div>
    <div style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);margin-top:1rem;">
      Created: ${new Date(order.createdAt).toLocaleString()} · Updated: ${new Date(order.updatedAt).toLocaleString()}
    </div>
  `;
  modal.classList.remove('hidden');
}

// Admin Map
function initAdminMap() {
  const mapEl = document.getElementById('admin-map');
  if (!mapEl) return;
  if (!adminMap) {
    adminMap = L.map('admin-map').setView([5.6037, -0.1870], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(adminMap);
  }
  updateAdminMapMarkers();
}

function updateAdminMapMarkers() {
  if (!adminMap) return;
  adminMarkers.forEach(m => m.remove());
  adminMarkers = [];

  // Active orders
  const activeOrders = getOrders().filter(o => ['active', 'transit'].includes(o.status));
  activeOrders.forEach(order => {
    const m1 = L.marker([order.pickup.lat, order.pickup.lng], { icon: makeIcon('#f59e0b', '📍') })
      .addTo(adminMap)
      .bindPopup(`<b>Pickup</b><br>${order.id}<br>${order.pickup.name}<br><span class="badge badge-${order.status}">${formatStatus(order.status)}</span>`);
    const m2 = L.marker([order.destination.lat, order.destination.lng], { icon: makeIcon('#14b8a6', '🏁') })
      .addTo(adminMap)
      .bindPopup(`<b>Destination</b><br>${order.id}<br>${order.destination.name}`);
    const route = L.polyline([[order.pickup.lat, order.pickup.lng], [order.destination.lat, order.destination.lng]], {
      color: '#f59e0b', weight: 2, dashArray: '6,4', opacity: 0.6
    }).addTo(adminMap);
    adminMarkers.push(m1, m2, route);
  });

  // Online riders
  MOCK_RIDERS.filter(r => r.online).forEach(rider => {
    const m = L.marker([rider.lat, rider.lng], { icon: makeIcon('#22c55e', '🏍️') })
      .addTo(adminMap)
      .bindPopup(`<b>${rider.name}</b><br>${rider.vehicle}<br>⭐ ${rider.rating} · ${rider.deliveries} deliveries`);
    adminMarkers.push(m);
  });
}

// Riders management page
function renderRidersPage() {
  const container = document.getElementById('riders-cards');
  if (!container) return;
  container.innerHTML = MOCK_RIDERS.map(rider => {
    const riderOrders = getOrders().filter(o => o.riderId === rider.id);
    const completedOrders = riderOrders.filter(o => o.status === 'delivered');
    const earnings = completedOrders.reduce((s, o) => s + (o.total * 0.7), 0);
    const statusColor = rider.online ? 'var(--green)' : 'var(--text-muted)';

    return `
      <div class="card" style="transition:all var(--transition);">
        <div style="display:flex;align-items:center;gap:0.875rem;margin-bottom:1rem;">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--purple));display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;">${rider.avatar}</div>
          <div>
            <div style="font-weight:700;">${rider.name}</div>
            <div style="font-size:0.78rem;color:${statusColor};font-family:var(--font-mono);">● ${rider.online ? 'Online' : 'Offline'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1rem;">
          <div style="background:var(--glass);border-radius:8px;padding:0.625rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:800;font-family:var(--font-display);">${rider.deliveries + completedOrders.length}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">Deliveries</div>
          </div>
          <div style="background:var(--glass);border-radius:8px;padding:0.625rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:800;font-family:var(--font-display);color:var(--amber);">⭐${rider.rating}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">Rating</div>
          </div>
        </div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.5rem;">
          <iconify-icon icon="mdi:motorbike"></iconify-icon> ${rider.vehicle}
        </div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem;">
          📞 ${rider.phone}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.75rem;border-top:1px solid var(--navy-border);">
          <span style="font-size:0.78rem;color:var(--text-muted);">Earnings</span>
          <span style="font-weight:700;font-family:var(--font-mono);color:var(--green);">${formatMoney(earnings)}</span>
        </div>
        <button class="btn btn-ghost btn-sm btn-full" style="margin-top:0.75rem;" onclick="toggleRiderStatus('${rider.id}')">
          ${rider.online ? 'Set Offline' : 'Set Online'}
        </button>
      </div>
    `;
  }).join('');
}

function toggleRiderStatus(riderId) {
  const rider = MOCK_RIDERS.find(r => r.id === riderId);
  if (rider) {
    rider.online = !rider.online;
    showToast(`${rider.name} is now ${rider.online ? 'online' : 'offline'}`, 'info');
    renderRidersPage();
    renderRidersStatus();
  }
}

function renderCustomersPage() {
  const tbody = document.getElementById('customers-tbody');
  if (!tbody) return;
  tbody.innerHTML = MOCK_USERS.map(user => {
    const userOrders = getOrders().filter(o => o.customerId === user.id);
    const spent = userOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
    return `
      <tr>
        <td style="display:flex;align-items:center;gap:0.625rem;">
          <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--amber),var(--teal));display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#000;">${user.avatar}</div>
          ${user.name}
        </td>
        <td>${user.email}</td>
        <td style="font-family:var(--font-mono);font-size:0.8rem;">${user.phone}</td>
        <td><span style="font-weight:700;">${userOrders.length}</span></td>
        <td style="font-family:var(--font-mono);color:var(--green);">${formatMoney(spent)}</td>
        <td style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">${user.joined}</td>
      </tr>
    `;
  }).join('');
}

function formatStatus(status) {
  const map = { pending: 'Pending', active: 'Active', transit: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled' };
  return map[status] || status;
}

window.initDashboard = initDashboard;
window.showDashPage = showDashPage;
window.filterOrders = filterOrders;
window.clearFilters = clearFilters;
window.openAdminOrderDetail = openAdminOrderDetail;
window.assignRider = assignRider;
window.adminCancelOrder = adminCancelOrder;
window.simulateNewOrder = simulateNewOrder;
window.toggleRiderStatus = toggleRiderStatus;

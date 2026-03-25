let categoryChart = null;
let expiryChart = null;

async function loadStats() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  document.getElementById('total-products').textContent = data.total_products;
  document.getElementById('expiring-soon').textContent = data.expiring_soon;
  document.getElementById('total-stock').textContent = data.total_stock;
}

async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  const tbody = document.getElementById('products-table');
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No products found</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  products.forEach(p => {
    const today = new Date();
    const expiry = new Date(p.expiry_date);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    let status = '';
    if (daysLeft <= 0) {
      status = '<span class="tag warn">Expired</span>';
    } else if (daysLeft <= 7) {
      status = `<span class="tag warn">⚠️ ${daysLeft} days left</span>`;
    } else {
      status = '<span class="tag ok">✅ Good</span>';
    }
    tbody.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.quantity}</td>
        <td>${p.expiry_date}</td>
        <td>${status}</td>
        <td>
          <button class="btn-delete" onclick="deleteProduct(${p.id})">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `;
  });
}

async function loadAlerts() {
  const res = await fetch('/api/alerts');
  const alerts = await res.json();
  const alertsList = document.getElementById('alerts-list');
  const alertCount = document.getElementById('alert-count');
  alertCount.textContent = alerts.length;
  if (alerts.length === 0) {
    alertsList.innerHTML = '<p class="empty">No expiry alerts 🎉</p>';
    return;
  }
  alertsList.innerHTML = '';
  alerts.forEach(a => {
    alertsList.innerHTML += `
      <div class="alert-item">
        <div>
          <div class="alert-name">⚠️ ${a.name}</div>
          <div class="alert-date">Expiry: ${a.expiry_date} | Qty: ${a.quantity}</div>
        </div>
        <span class="tag warn">${a.category}</span>
      </div>
    `;
  });
}

async function addProduct() {
  const name = document.getElementById('name').value;
  const category = document.getElementById('category').value;
  const quantity = document.getElementById('quantity').value;
  const expiry_date = document.getElementById('expiry_date').value;
  if (!name || !quantity || !expiry_date) {
    alert('⚠️ எல்லா fields-உம் fill பண்ணுங்க!');
    return;
  }
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, quantity, expiry_date })
  });
  const data = await res.json();
  alert(data.message);
  document.getElementById('name').value = '';
  document.getElementById('quantity').value = '';
  document.getElementById('expiry_date').value = '';
  loadStats();
  loadProducts();
  loadAlerts();
  loadCharts();
}

async function deleteProduct(id) {
  if (!confirm('Delete பண்ணணுமா?')) return;
  const res = await fetch(`/api/products/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  alert(data.message);
  loadStats();
  loadProducts();
  loadAlerts();
  loadCharts();
}

async function sendAlerts() {
  const email = document.getElementById('alert-email').value;
  if (!email) {
    alert('⚠️ Email address enter பண்ணுங்க!');
    return;
  }
  try {
    const res = await fetch('/api/send-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    const data = await res.json();
    alert(data.message);
  } catch(err) {
    alert('❌ Error: ' + err.message);
  }
}

async function loadCharts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    const categories = {};
    products.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });
    let good = 0, warning = 0, expired = 0;
    products.forEach(p => {
      const today = new Date();
      const expiry = new Date(p.expiry_date);
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) expired++;
      else if (daysLeft <= 7) warning++;
      else good++;
    });
    if (categoryChart) categoryChart.destroy();
    const ctx1 = document.getElementById('categoryChart');
    categoryChart = new Chart(ctx1, {
      type: 'pie',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: ['#00d4aa','#0097ff','#ff6b35','#8b5cf6','#ec4899'],
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: '#f0f4ff' } }
        }
      }
    });
    if (expiryChart) expiryChart.destroy();
    const ctx2 = document.getElementById('expiryChart');
    expiryChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Good', 'Expiring Soon', 'Expired'],
        datasets: [{
          label: 'Products',
          data: [good, warning, expired],
          backgroundColor: ['#00d4aa', '#0097ff', '#ff6b35'],
          borderRadius: 8,
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: '#f0f4ff' } }
        },
        scales: {
          x: { ticks: { color: '#7a8899' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#7a8899' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  } catch(err) {
    console.error("Chart error:", err);
  }
}

window.onload = function() {
  loadStats();
  loadProducts();
  loadAlerts();
  loadCharts();
}
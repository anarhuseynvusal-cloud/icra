const units = [
  ...Array.from({ length: 12 }, (_, i) => `Şöbə ${i + 1}`),
  'AzScienceNet',
  'Tədris-İnnovasiya Mərkəzi',
  'Multimedia Texnologiyaları Mərkəzi'
];

const key = 'task_control_data_v1';
let tasks = JSON.parse(localStorage.getItem(key) || '[]');

const els = {
  form: document.getElementById('task-form'),
  editId: document.getElementById('edit-id'),
  unit: document.getElementById('unit'),
  manager: document.getElementById('manager'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  assignedDate: document.getElementById('assignedDate'),
  dueDate: document.getElementById('dueDate'),
  status: document.getElementById('status'),
  body: document.getElementById('task-body'),
  resetBtn: document.getElementById('reset-btn'),
  reportBtn: document.getElementById('report-btn'),
  reportPanel: document.getElementById('report-panel'),
  reportContent: document.getElementById('report-content'),
  statsBtn: document.getElementById('stats-btn'),
  statsPanel: document.getElementById('stats-panel'),
  canvas: document.getElementById('stats-canvas'),
  toast: document.getElementById('toast')
};

function initUnits() {
  units.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    els.unit.appendChild(opt);
  });
}

function save() {
  localStorage.setItem(key, JSON.stringify(tasks));
}

function daysLeft(dueDate) {
  const now = new Date();
  now.setHours(0,0,0,0);
  const due = new Date(dueDate);
  due.setHours(0,0,0,0);
  return Math.ceil((due - now) / (1000 * 3600 * 24));
}

function rowClass(task) {
  if (task.status === 'completed') return 'green';
  const diff = daysLeft(task.dueDate);
  if (diff < 0) return 'red';
  if (diff <= 2) return 'yellow';
  return '';
}

function statusLabel(val) {
  return val === 'completed' ? 'İcra olunub' : val === 'not_completed' ? 'İcra olunmayıb' : 'İcrada';
}

function render() {
  els.body.innerHTML = '';
  tasks.forEach((task) => {
    const tr = document.createElement('tr');
    tr.className = rowClass(task);
    tr.innerHTML = `
      <td>${task.unit}</td>
      <td>${task.manager}</td>
      <td>${task.title}<br/><small>${task.description}</small></td>
      <td>${task.assignedDate}</td>
      <td>${task.dueDate}</td>
      <td>${statusLabel(task.status)}</td>
      <td>
        <button class="small-btn" data-action="edit" data-id="${task.id}">Redaktə</button>
        <button class="small-btn" data-action="delete" data-id="${task.id}">Sil</button>
      </td>
    `;
    els.body.appendChild(tr);
  });

  showWarnings();
}

function resetForm() {
  els.form.reset();
  els.editId.value = '';
}

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    id: els.editId.value || crypto.randomUUID(),
    unit: els.unit.value,
    manager: els.manager.value.trim(),
    title: els.title.value.trim(),
    description: els.description.value.trim(),
    assignedDate: els.assignedDate.value,
    dueDate: els.dueDate.value,
    status: els.status.value
  };

  if (new Date(data.dueDate) < new Date(data.assignedDate)) {
    alert('Son tarix verilmə tarixindən əvvəl ola bilməz.');
    return;
  }

  const idx = tasks.findIndex((t) => t.id === data.id);
  if (idx >= 0) tasks[idx] = data;
  else tasks.push(data);

  save();
  render();
  resetForm();
});

els.resetBtn.addEventListener('click', resetForm);

els.body.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  if (action === 'edit') {
    els.editId.value = task.id;
    els.unit.value = task.unit;
    els.manager.value = task.manager;
    els.title.value = task.title;
    els.description.value = task.description;
    els.assignedDate.value = task.assignedDate;
    els.dueDate.value = task.dueDate;
    els.status.value = task.status;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (action === 'delete') {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
  }
});

els.reportBtn.addEventListener('click', () => {
  els.reportPanel.classList.toggle('hidden');
  const map = {};
  units.forEach((u) => map[u] = { total: 0, completed: 0, overdue: 0 });

  tasks.forEach((t) => {
    map[t.unit].total += 1;
    if (t.status === 'completed') map[t.unit].completed += 1;
    if (daysLeft(t.dueDate) < 0 && t.status !== 'completed') map[t.unit].overdue += 1;
  });

  els.reportContent.innerHTML = '<ul>' + Object.entries(map).map(([u, v]) =>
    `<li><strong>${u}</strong>: Ümumi ${v.total}, İcra olunmuş ${v.completed}, Vaxtı keçmiş ${v.overdue}</li>`
  ).join('') + '</ul>';
});

els.statsBtn.addEventListener('click', () => {
  els.statsPanel.classList.toggle('hidden');
  drawChart();
});

function drawChart() {
  const ctx = els.canvas.getContext('2d');
  const counts = {
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    not_completed: tasks.filter(t => t.status === 'not_completed').length,
    overdue: tasks.filter(t => daysLeft(t.dueDate) < 0 && t.status !== 'completed').length
  };

  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  const bars = [
    { label: 'İcra olunub', value: counts.completed, color: '#16a34a' },
    { label: 'İcrada', value: counts.pending, color: '#2563eb' },
    { label: 'İcra olunmayıb', value: counts.not_completed, color: '#dc2626' },
    { label: 'Vaxtı keçib', value: counts.overdue, color: '#f59e0b' }
  ];

  const max = Math.max(1, ...bars.map(b => b.value));
  const w = 120;
  bars.forEach((b, i) => {
    const x = 40 + i * 160;
    const h = (b.value / max) * 180;
    const y = 240 - h;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#111827';
    ctx.fillText(b.label, x, 260);
    ctx.fillText(String(b.value), x + 50, y - 8);
  });
}

function showWarnings() {
  const expired = tasks.filter((t) => daysLeft(t.dueDate) < 0 && t.status !== 'completed');
  if (!expired.length) {
    els.toast.classList.add('hidden');
    return;
  }
  const txt = `Xəbərdarlıq: ${expired.length} tapşırığın vaxtı bitib!`;
  els.toast.textContent = txt;
  els.toast.classList.remove('hidden');
}

initUnits();
render();

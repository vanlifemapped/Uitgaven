let pieChartInstance = null;
let barChartInstance = null;

// === INITIALISATIE ===
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('datum').valueAsDate = new Date();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('maand-select').value = currentMonthStr;

  initYearSelect(now.getFullYear());
  checkAndCopyFixedExpenses();
  loadRecentExpenses();
});

// === LOCALSTORAGE HELPERS ===
function getExpenses() {
  return JSON.parse(localStorage.getItem('reis_uitgaven') || '[]');
}

function saveExpensesToStorage(expenses) {
  localStorage.setItem('reis_uitgaven', JSON.stringify(expenses));
}

function getFixedTemplates() {
  return JSON.parse(localStorage.getItem('reis_vaste_lasten') || '[]');
}

function saveFixedTemplatesToStorage(templates) {
  localStorage.setItem('reis_vaste_lasten', JSON.stringify(templates));
}

// === TAB NAVIGATIE ===
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  event.currentTarget.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');

  if (tabName === 'invoer') loadRecentExpenses();
  if (tabName === 'maand') loadMonthOverview();
  if (tabName === 'jaar') loadYearOverview();
  if (tabName === 'grafieken') loadCharts();
  if (tabName === 'vaste-lasten') loadFixedTemplates();
}

// === AUTOMATISCH VASTE LASTEN KOPIËREN ===
function checkAndCopyFixedExpenses() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const firstOfMonth = `${yearMonth}-01`;

  const key = `fixed_applied_${yearMonth}`;
  if (localStorage.getItem(key)) return;

  const templates = getFixedTemplates();
  if (templates.length === 0) return;

  const currentExpenses = getExpenses();

  templates.forEach(t => {
    currentExpenses.push({
      id: Date.now() + Math.random(),
      datum: firstOfMonth,
      bedrag: parseFloat(t.bedrag),
      categorie: 'Vaste lasten',
      omschrijving: t.omschrijving
    });
  });

  saveExpensesToStorage(currentExpenses);
  localStorage.setItem(key, 'true');
}

// === UITGAVEN INVOEREN ===
function saveExpense(e) {
  e.preventDefault();

  const datum = document.getElementById('datum').value;
  const bedrag = parseFloat(document.getElementById('bedrag').value);
  const categorie = document.getElementById('categorie').value;
  const omschrijving = document.getElementById('omschrijving').value;

  const newExpense = {
    id: Date.now(),
    datum,
    bedrag,
    categorie,
    omschrijving
  };

  const expenses = getExpenses();
  expenses.push(newExpense);
  saveExpensesToStorage(expenses);

  document.getElementById('expense-form').reset();
  document.getElementById('datum').valueAsDate = new Date();
  loadRecentExpenses();
  alert('Uitgave opgeslagen!');
}

function loadRecentExpenses() {
  const expenses = getExpenses();
  expenses.sort((a, b) => new Date(b.datum) - new Date(a.datum));

  const ul = document.getElementById('recent-expenses-ul');
  ul.innerHTML = '';

  const recent = expenses.slice(0, 5);

  if (recent.length === 0) {
    ul.innerHTML = '<li style="color: #718096;">Nog geen uitgaven ingevoerd.</li>';
    return;
  }

  recent.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.categorie}</strong> - ${item.omschrijving || 'Geen notitie'}<br>
        <small style="color: #718096;">${item.datum}</small>
      </div>
      <strong>€ ${parseFloat(item.bedrag).toFixed(2)}</strong>
    `;
    ul.appendChild(li);
  });
}

// === MAAND OVERZICHT ===
function loadMonthOverview() {
  const selectedMonth = document.getElementById('maand-select').value;
  if (!selectedMonth) return;

  const expenses = getExpenses();
  const monthExpenses = expenses.filter(e => e.datum.startsWith(selectedMonth));

  let total = 0;
  const catTotals = {};

  monthExpenses.forEach(item => {
    const bedrag = parseFloat(item.bedrag);
    total += bedrag;
    catTotals[item.categorie] = (catTotals[item.categorie] || 0) + bedrag;
  });

  document.getElementById('maand-totaal-bedrag').innerText = `€ ${total.toFixed(2)}`;

  const catList = document.getElementById('maand-categories-list');
  catList.innerHTML = '';

  const categories = Object.keys(catTotals).sort();
  if (categories.length === 0) {
    catList.innerHTML = '<div class="row-item"><span>Geen gegevens voor deze maand.</span></div>';
    return;
  }

  categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `<span>${cat}</span><strong>€ ${catTotals[cat].toFixed(2)}</strong>`;
    catList.appendChild(div);
  });
}

// === JAAR OVERZICHT ===
function initYearSelect(currentYear) {
  const select = document.getElementById('jaar-select');
  select.innerHTML = '';
  for (let y = currentYear; y >= currentYear - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.innerText = y;
    select.appendChild(opt);
  }
}

function loadYearOverview() {
  const selectedYear = document.getElementById('jaar-select').value;
  if (!selectedYear) return;

  const expenses = getExpenses();
  const yearExpenses = expenses.filter(e => e.datum.startsWith(selectedYear));

  let total = 0;
  const catTotals = {};
  const monthTotals = Array(12).fill(0);

  yearExpenses.forEach(item => {
    const bedrag = parseFloat(item.bedrag);
    total += bedrag;
    catTotals[item.categorie] = (catTotals[item.categorie] || 0) + bedrag;

    const monthIndex = parseInt(item.datum.split('-')[1], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      monthTotals[monthIndex] += bedrag;
    }
  });

  document.getElementById('jaar-totaal-bedrag').innerText = `€ ${total.toFixed(2)}`;

  const catList = document.getElementById('jaar-categories-list');
  catList.innerHTML = '';
  const categories = Object.keys(catTotals).sort();

  if (categories.length === 0) {
    catList.innerHTML = '<div class="row-item"><span>Geen gegevens voor dit jaar.</span></div>';
  } else {
    categories.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'row-item';
      div.innerHTML = `<span>${cat}</span><strong>€ ${catTotals[cat].toFixed(2)}</strong>`;
      catList.appendChild(div);
    });
  }

  const monthNames = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  const mList = document.getElementById('jaar-months-list');
  mList.innerHTML = '';

  monthNames.forEach((name, idx) => {
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `<span>${name}</span><strong>€ ${monthTotals[idx].toFixed(2)}</strong>`;
    mList.appendChild(div);
  });
}

// === GRAFIEKEN ===
function loadCharts() {
  const selectedMonth = document.getElementById('maand-select').value || new Date().toISOString().slice(0, 7);
  const selectedYear = document.getElementById('jaar-select').value || new Date().getFullYear().toString();

  const expenses = getExpenses();

  // 1. Cirkeldiagram (Categorieën Huidige Maand)
  const monthExpenses = expenses.filter(e => e.datum.startsWith(selectedMonth));
  const catTotals = {};
  monthExpenses.forEach(item => {
    catTotals[item.categorie] = (catTotals[item.categorie] || 0) + parseFloat(item.bedrag);
  });

  const pieLabels = Object.keys(catTotals);
  const pieData = Object.values(catTotals);

  const ctxPie = document.getElementById('categoryPieChart').getContext('2d');
  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: pieLabels.length ? pieLabels : ['Geen data'],
      datasets: [{
        data: pieData.length ? pieData : [1],
        backgroundColor: [
          '#3182ce', '#e53e3e', '#dd6b20', '#38a169', 
          '#805ad5', '#d69e2e', '#319795', '#b83280', '#4a5568'
        ]
      }]
    },
    options: { responsive: true }
  });

  // 2. Staafdiagram (Verloop per Maand dit Jaar)
  const yearExpenses = expenses.filter(e => e.datum.startsWith(selectedYear));
  const monthTotals = Array(12).fill(0);

  yearExpenses.forEach(item => {
    const m = parseInt(item.datum.split('-')[1], 10) - 1;
    if (m >= 0 && m < 12) monthTotals[m] += parseFloat(item.bedrag);
  });

  const ctxBar = document.getElementById('monthlyBarChart').getContext('2d');
  if (barChartInstance) barChartInstance.destroy();

  barChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
      datasets: [{
        label: `Totaal Kosten ${selectedYear}`,
        data: monthTotals,
        backgroundColor: '#3182ce'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// === EXCEL EXPORT ===
function exportToExcel() {
  const expenses = getExpenses();
  if (expenses.length === 0) {
    alert('Er zijn geen gegevens om te exporteren.');
    return;
  }

  // Sorteer op datum
  expenses.sort((a, b) => new Date(a.datum) - new Date(b.datum));

  // Maak nette rijen voor Excel
  const excelData = expenses.map(e => ({
    Datum: e.datum,
    Categorie: e.categorie,
    Omschrijving: e.omschrijving || '',
    'Bedrag (€)': parseFloat(e.bedrag)
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kosten');

  // Genereer het bestand en download het op je telefoon
  const filename = `Reis_Kosten_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// === VASTE LASTEN BEHEER ===
function saveFixedTemplate(e) {
  e.preventDefault();

  const omschrijving = document.getElementById('fixed-omschrijving').value;
  const bedrag = parseFloat(document.getElementById('fixed-bedrag').value);

  const templates = getFixedTemplates();
  templates.push({ id: Date.now(), omschrijving, bedrag });
  saveFixedTemplatesToStorage(templates);

  document.getElementById('fixed-form').reset();
  loadFixedTemplates();
  alert('Vaste last toegevoegd!');
}

function loadFixedTemplates() {
  const templates = getFixedTemplates();
  const ul = document.getElementById('fixed-templates-ul');
  ul.innerHTML = '';

  if (templates.length === 0) {
    ul.innerHTML = '<li style="color: #718096;">Nog geen vaste lasten ingesteld.</li>';
    return;
  }

  templates.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.omschrijving}</strong><br>
        <small style="color: #718096;">€ ${parseFloat(item.bedrag).toFixed(2)} p/m</small>
      </div>
      <button class="btn-delete" onclick="deleteFixedTemplate(${item.id})">Verwijder</button>
    `;
    ul.appendChild(li);
  });
}

function deleteFixedTemplate(id) {
  if (!confirm('Weet je zeker dat je deze vaste last wilt verwijderen?')) return;

  let templates = getFixedTemplates();
  templates = templates.filter(t => t.id !== id);
  saveFixedTemplatesToStorage(templates);

  loadFixedTemplates();
}

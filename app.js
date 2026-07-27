let pieChartInstance = null;
let barChartInstance = null;

// Categorieën per type
const CATEGORIES = {
  uitgave: ['Brandstof', 'Tol', 'Wassen', 'Kingsley', 'Terras', 'Boodschappen', 'Kleding', 'Diversen', 'Vaste lasten'],
  inkomst: ['Salaris', 'Verhuur', 'Freelance', 'Rendement', 'Diversen inkomsten']
};

let currentType = 'uitgave';

// === INITIALISATIE ===
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('datum').valueAsDate = new Date();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('maand-select').value = currentMonthStr;

  initYearSelect(now.getFullYear());
  updateCategoryOptions();
  checkAndCopyFixedExpenses();
  loadRecentExpenses();
});

// Switch tussen Uitgave & Inkomst in het formulier
function toggleType(type) {
  currentType = type;
  document.getElementById('type-uitgave-label').classList.toggle('active', type === 'uitgave');
  document.getElementById('type-inkomst-label').classList.toggle('active', type === 'inkomst');
  
  const btn = document.getElementById('save-btn');
  if (type === 'uitgave') {
    btn.innerText = 'Uitgave Opslaan';
    btn.style.backgroundColor = '#3182ce';
  } else {
    btn.innerText = 'Inkomst Opslaan';
    btn.style.backgroundColor = '#38a169';
  }

  updateCategoryOptions();
}

function updateCategoryOptions() {
  const select = document.getElementById('categorie');
  if (!select) return;

  select.innerHTML = '';
  
  const categoriesToLoad = CATEGORIES[currentType] || CATEGORIES['uitgave'];

  categoriesToLoad.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.innerText = cat;
    select.appendChild(opt);
  });
}

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

  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(
    btn => btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabName}'`)
  );
  if (activeBtn) activeBtn.classList.add('active');

  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) activeTab.classList.add('active');

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
      type: 'uitgave',
      datum: firstOfMonth,
      bedrag: parseFloat(t.bedrag),
      categorie: 'Vaste lasten',
      omschrijving: t.omschrijving
    });
  });

  saveExpensesToStorage(currentExpenses);
  localStorage.setItem(key, 'true');
}

// === TRANSACTIE INVOEREN ===
function saveTransaction(e) {
  e.preventDefault();

  const datum = document.getElementById('datum').value;
  const bedrag = parseFloat(document.getElementById('bedrag').value);
  const categorie = document.getElementById('categorie').value;
  const omschrijving = document.getElementById('omschrijving').value;

  const newTransaction = {
    id: Date.now(),
    type: currentType, // 'uitgave' of 'inkomst'
    datum,
    bedrag,
    categorie,
    omschrijving
  };

  const expenses = getExpenses();
  expenses.push(newTransaction);
  saveExpensesToStorage(expenses);

  document.getElementById('expense-form').reset();
  document.getElementById('datum').valueAsDate = new Date();
  toggleType('uitgave'); // Terug naar uitgave als standaard
  loadRecentExpenses();
  alert(`${currentType === 'uitgave' ? 'Uitgave' : 'Inkomst'} opgeslagen!`);
}

function loadRecentExpenses() {
  const expenses = getExpenses();
  expenses.sort((a, b) => new Date(b.datum) - new Date(a.datum));

  const ul = document.getElementById('recent-expenses-ul');
  if (!ul) return;
  ul.innerHTML = '';

  const recent = expenses.slice(0, 5);

  if (recent.length === 0) {
    ul.innerHTML = '<li style="color: #718096;">Nog geen mutaties ingevoerd.</li>';
    return;
  }

  recent.forEach(item => {
    const isInk = item.type === 'inkomst';
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.categorie}</strong> - ${item.omschrijving || 'Geen notitie'}<br>
        <small style="color: #718096;">${item.datum}</small>
      </div>
      <strong class="${isInk ? 'tag-inkomst' : 'tag-uitgave'}">
        ${isInk ? '+' : '-'} € ${parseFloat(item.bedrag).toFixed(2)}
      </strong>
    `;
    ul.appendChild(li);
  });
}

// === MAAND OVERZICHT ===
function loadMonthOverview() {
  const selectedMonth = document.getElementById('maand-select').value;
  if (!selectedMonth) return;

  const expenses = getExpenses();
  const monthItems = expenses.filter(e => e.datum && e.datum.startsWith(selectedMonth));

  let totIncome = 0;
  let totExpense = 0;
  const catTotals = {};

  monthItems.forEach(item => {
    const bedrag = parseFloat(item.bedrag);
    const itemType = item.type || 'uitgave';

    if (itemType === 'inkomst') {
      totIncome += bedrag;
    } else {
      totExpense += bedrag;
      catTotals[item.categorie] = (catTotals[item.categorie] || 0) + bedrag;
    }
  });

  const saldo = totIncome - totExpense;

  document.getElementById('maand-inkomsten-bedrag').innerText = `€ ${totIncome.toFixed(2)}`;
  document.getElementById('maand-uitgaven-bedrag').innerText = `€ ${totExpense.toFixed(2)}`;
  document.getElementById('maand-saldo-bedrag').innerText = `€ ${saldo.toFixed(2)}`;

  const catList = document.getElementById('maand-categories-list');
  catList.innerHTML = '';

  const categories = Object.keys(catTotals).sort();
  if (categories.length === 0) {
    catList.innerHTML = '<div class="row-item"><span>Geen uitgaven deze maand.</span></div>';
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
  if (!select) return;
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
  const yearItems = expenses.filter(e => e.datum && e.datum.startsWith(selectedYear));

  let totIncome = 0;
  let totExpense = 0;
  const catTotals = {};
  const monthNetTotals = Array(12).fill(0);

  yearItems.forEach(item => {
    const bedrag = parseFloat(item.bedrag);
    const itemType = item.type || 'uitgave';

    const monthIndex = parseInt(item.datum.split('-')[1], 10) - 1;

    if (itemType === 'inkomst') {
      totIncome += bedrag;
      if (monthIndex >= 0 && monthIndex < 12) monthNetTotals[monthIndex] += bedrag;
    } else {
      totExpense += bedrag;
      catTotals[item.categorie] = (catTotals[item.categorie] || 0) + bedrag;
      if (monthIndex >= 0 && monthIndex < 12) monthNetTotals[monthIndex] -= bedrag;
    }
  });

  const saldo = totIncome - totExpense;

  document.getElementById('jaar-inkomsten-bedrag').innerText = `€ ${totIncome.toFixed(2)}`;
  document.getElementById('jaar-uitgaven-bedrag').innerText = `€ ${totExpense.toFixed(2)}`;
  document.getElementById('jaar-saldo-bedrag').innerText = `€ ${saldo.toFixed(2)}`;

  // Categorieën
  const catList = document.getElementById('jaar-categories-list');
  catList.innerHTML = '';
  const categories = Object.keys(catTotals).sort();

  if (categories.length === 0) {
    catList.innerHTML = '<div class="row-item"><span>Geen uitgaven voor dit jaar.</span></div>';
  } else {
    categories.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'row-item';
      div.innerHTML = `<span>${cat}</span><strong>€ ${catTotals[cat].toFixed(2)}</strong>`;
      catList.appendChild(div);
    });
  }

  // Maanden (Netto verloop)
  const monthNames = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  const mList = document.getElementById('jaar-months-list');
  mList.innerHTML = '';

  monthNames.forEach((name, idx) => {
    const val = monthNetTotals[idx];
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `
      <span>${name}</span>
      <strong style="color: ${val >= 0 ? '#276749' : '#c53030'}">
        ${val >= 0 ? '+' : ''}€ ${val.toFixed(2)}
      </strong>
    `;
    mList.appendChild(div);
  });
}

// === GRAFIEKEN ===
function loadCharts() {
  const selectedMonth = document.getElementById('maand-select').value || new Date().toISOString().slice(0, 7);
  const selectedYear = document.getElementById('jaar-select').value || new Date().getFullYear().toString();

  const expenses = getExpenses();

  // 1. Cirkeldiagram (Uitgaven Categorieën Huidige Maand)
  const monthExpenses = expenses.filter(e => e.datum && e.datum.startsWith(selectedMonth) && (e.type || 'uitgave') === 'uitgave');
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

  // 2. Staafdiagram (Inkomsten vs Uitgaven per Maand dit Jaar)
  const yearItems = expenses.filter(e => e.datum && e.datum.startsWith(selectedYear));
  const incTotals = Array(12).fill(0);
  const expTotals = Array(12).fill(0);

  yearItems.forEach(item => {
    const m = parseInt(item.datum.split('-')[1], 10) - 1;
    if (m >= 0 && m < 12) {
      if ((item.type || 'uitgave') === 'inkomst') {
        incTotals[m] += parseFloat(item.bedrag);
      } else {
        expTotals[m] += parseFloat(item.bedrag);
      }
    }
  });

  const ctxBar = document.getElementById('monthlyBarChart').getContext('2d');
  if (barChartInstance) barChartInstance.destroy();

  barChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
      datasets: [
        {
          label: 'Inkomsten',
          data: incTotals,
          backgroundColor: '#38a169'
        },
        {
          label: 'Uitgaven',
          data: expTotals,
          backgroundColor: '#e53e3e'
        }
      ]
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

  expenses.sort((a, b) => new Date(a.datum) - new Date(b.datum));

  const excelData = expenses.map(e => ({
    Type: (e.type || 'uitgave').toUpperCase(),
    Datum: e.datum,
    Categorie: e.categorie,
    Omschrijving: e.omschrijving || '',
    'Bedrag (€)': parseFloat(e.bedrag)
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kosten_en_Inkomsten');

  const filename = `Reis_Budget_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
  if (!ul) return;
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

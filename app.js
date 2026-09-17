let pieChartInstance = null;
let barChartInstance = null;

const CATEGORIES = {
  uitgave: ['Brandstof', 'Autokosten', 'Wassen', 'Kingsley', 'Terras', 'Boodschappen', 'Kleding', 'Overnachtingen', 'Uitstapjes', 'Diversen', 'Vaste lasten'],
  inkomst: ['Salaris', 'Verhuur', 'Freelance', 'Rendement', 'Diversen inkomsten']
};

let currentType = 'uitgave';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('datum').valueAsDate = new Date();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('maand-select').value = currentMonthStr;

  initYearSelect(now.getFullYear());
  updateCategoryOptions();
  checkAndCopyFixedExpenses();
  loadRecentExpenses();
  loadMonthBudgetSetting();
});

// Switch tussen Uitgave & Inkomst
function toggleType(type) {
  currentType = type;
  document.getElementById('type-uitgave-label').classList.toggle('active', type === 'uitgave');
  document.getElementById('type-inkomst-label').classList.toggle('active', type === 'inkomst');
  
  const btn = document.getElementById('save-btn');
  const quickCats = document.getElementById('quick-cats-container');
  
  if (type === 'uitgave') {
    btn.innerText = 'Uitgave Opslaan';
    btn.style.backgroundColor = 'var(--danger)';
    if (quickCats) quickCats.style.display = 'block';
  } else {
    btn.innerText = 'Inkomst Opslaan';
    btn.style.backgroundColor = 'var(--success)';
    if (quickCats) quickCats.style.display = 'none';
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

function selectQuickCat(catName) {
  const select = document.getElementById('categorie');
  if (select) {
    select.value = catName;
  }
}

// Wisselen valuta modus
function toggleCurrencyMode() {
  const isChecked = document.getElementById('use-foreign-currency').checked;
  const fields = document.getElementById('foreign-currency-fields');
  fields.style.display = isChecked ? 'block' : 'none';
  calculateCurrency();
}

function calculateCurrency() {
  const isChecked = document.getElementById('use-foreign-currency').checked;
  if (!isChecked) return;

  const vreemdBedrag = parseFloat(document.getElementById('vreemd-bedrag').value) || 0;
  const koers = parseFloat(document.getElementById('wisselkoers').value) || 0;

  if (vreemdBedrag > 0 && koers > 0) {
    const euroBedrag = vreemdBedrag / koers;
    document.getElementById('bedrag').value = euroBedrag.toFixed(2);
  }
}

// LocalStorage helpers
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

// Tab navigatie
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
  if (tabName === 'maand') {
    loadMonthBudgetSetting();
    loadMonthOverview();
  }
  if (tabName === 'jaar') loadYearOverview();
  if (tabName === 'grafieken') loadCharts();
  if (tabName === 'vaste-lasten') loadFixedTemplates();
}

// Automatisch vaste lasten kopiëren
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

// Transactie opslaan
function saveTransaction(e) {
  e.preventDefault();

  const datum = document.getElementById('datum').value;
  const bedrag = parseFloat(document.getElementById('bedrag').value);
  const categorie = document.getElementById('categorie').value;
  const omschrijving = document.getElementById('omschrijving').value;

  const newTransaction = {
    id: Date.now(),
    type: currentType,
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
  document.getElementById('use-foreign-currency').checked = false;
  document.getElementById('foreign-currency-fields').style.display = 'none';
  toggleType('uitgave');
  loadRecentExpenses();
  alert(`${currentType === 'uitgave' ? 'Uitgave' : 'Inkomst'} opgeslagen!`);
}

function deleteTransaction(id) {
  if (!confirm('Weet je zeker dat je deze post wilt verwijderen?')) return;

  let expenses = getExpenses();
  expenses = expenses.filter(item => item.id !== id);
  saveExpensesToStorage(expenses);

  loadRecentExpenses();
  loadMonthOverview();
  closeCategoryModal(); 
}

function loadRecentExpenses() {
  const expenses = getExpenses();
  expenses.sort((a, b) => new Date(b.datum) - new Date(a.datum));

  const ul = document.getElementById('recent-expenses-ul');
  if (!ul) return;
  ul.innerHTML = '';

  const recent = expenses.slice(0, 5);

  if (recent.length === 0) {
    ul.innerHTML = '<li style="color: var(--text-muted);">Nog geen mutaties ingevoerd.</li>';
    return;
  }

  recent.forEach(item => {
    const isInk = item.type === 'inkomst';
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.categorie}</strong> - ${item.omschrijving || 'Geen notitie'}<br>
        <small style="color: var(--text-muted);">${item.datum}</small>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <strong class="${isInk ? 'tag-inkomst' : 'tag-uitgave'}">
          ${isInk ? '+' : '-'} € ${parseFloat(item.bedrag).toFixed(2)}
        </strong>
        <button class="btn-delete" onclick="deleteTransaction(${item.id})">🗑️</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function saveMonthBudget() {
  const selectedMonth = document.getElementById('maand-select').value;
  const budgetVal = parseFloat(document.getElementById('maand-budget-input').value) || 0;
  if (!selectedMonth) return;

  localStorage.setItem(`budget_${selectedMonth}`, budgetVal);
  loadMonthOverview();
}

function loadMonthBudgetSetting() {
  const selectedMonth = document.getElementById('maand-select').value;
  if (!selectedMonth) return;

  const savedBudget = localStorage.getItem(`budget_${selectedMonth}`) || '';
  document.getElementById('maand-budget-input').value = savedBudget;
}

function loadMonthOverview() {
  const selectedMonth = document.getElementById('maand-select').value;
  if (!selectedMonth) return;

  loadMonthBudgetSetting();

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

  const maxBudget = parseFloat(localStorage.getItem(`budget_${selectedMonth}`)) || 0;
  const statusText = document.getElementById('budget-status-text');
  const progressBar = document.getElementById('budget-progress-bar');

  if (maxBudget > 0) {
    const percentage = Math.min(Math.round((totExpense / maxBudget) * 100), 100);
    statusText.innerText = `€ ${totExpense.toFixed(2)} / € ${maxBudget.toFixed(2)} (${percentage}%)`;
    progressBar.style.width = `${percentage}%`;

    if (percentage >= 90) {
      progressBar.style.backgroundColor = 'var(--danger)';
    } else if (percentage >= 75) {
      progressBar.style.backgroundColor = '#d97706';
    } else {
      progressBar.style.backgroundColor = 'var(--success)';
    }
  } else {
    statusText.innerText = `€ ${totExpense.toFixed(2)} (Geen budget)`;
    progressBar.style.width = '0%';
  }

  const catList = document.getElementById('maand-categories-list');
  catList.innerHTML = '';

  const categories = Object.keys(catTotals).sort();
  if (categories.length === 0) {
    catList.innerHTML = '<div class="row-item"><span style="color:var(--text-muted);">Geen uitgaven deze maand.</span></div>';
  } else {
    categories.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'row-item clickable-category';
      div.setAttribute('title', 'Klik om posten te bekijken');
      div.onclick = () => showCategoryDetails(selectedMonth, cat);
      div.innerHTML = `<span>📂 ${cat} 🔍</span><strong>€ ${catTotals[cat].toFixed(2)}</strong>`;
      catList.appendChild(div);
    });
  }

  loadMonthTransactionsList(monthItems);
}

function showCategoryDetails(yearMonth, categoryName) {
  const expenses = getExpenses();
  const filtered = expenses.filter(e => e.datum && e.datum.startsWith(yearMonth) && e.categorie === categoryName && (e.type || 'uitgave') === 'uitgave');
  
  filtered.sort((a, b) => new Date(b.datum) - new Date(a.datum));

  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.innerText = `${categoryName} (${yearMonth})`;
  
  if (filtered.length === 0) {
    modalBody.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Geen posten gevonden.</p>';
  } else {
    let html = '<ul class="modal-items-list">';
    filtered.forEach(item => {
      html += `
        <li>
          <div>
            <strong>${item.omschrijving || 'Geen notitie'}</strong><br>
            <small style="color: var(--text-muted);">📅 ${item.datum}</small>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <strong class="tag-uitgave">- € ${parseFloat(item.bedrag).toFixed(2)}</strong>
            <button class="btn-delete" onclick="deleteTransaction(${item.id})">🗑️</button>
          </div>
        </li>
      `;
    });
    html += '</ul>';
    modalBody.innerHTML = html;
  }

  document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
}

function loadMonthTransactionsList(monthItems) {
  let listContainer = document.getElementById('maand-items-list');
  
  if (!listContainer) {
    const catBreakdown = document.querySelector('#tab-maand .category-breakdown');
    if (catBreakdown) {
      const section = document.createElement('div');
      section.className = 'recent-list';
      section.style.marginTop = '24px';
      section.innerHTML = '<h3>Alle posten deze maand</h3><ul id="maand-items-ul"></ul>';
      catBreakdown.after(section);
      listContainer = document.getElementById('maand-items-ul');
    }
  } else {
    listContainer = document.getElementById('maand-items-ul');
  }

  if (!listContainer) return;
  listContainer.innerHTML = '';

  monthItems.sort((a, b) => new Date(b.datum) - new Date(a.datum));

  if (monthItems.length === 0) {
    listContainer.innerHTML = '<li style="color: var(--text-muted);">Geen posten gevonden voor deze maand.</li>';
    return;
  }

  monthItems.forEach(item => {
    const isInk = item.type === 'inkomst';
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.categorie}</strong> - ${item.omschrijving || 'Geen notitie'}<br>
        <small style="color: var(--text-muted);">${item.datum}</small>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <strong class="${isInk ? 'tag-inkomst' : 'tag-uitgave'}">
          ${isInk ? '+' : '-'} € ${parseFloat(item.bedrag).toFixed(2)}
        </strong>
        <button class="btn-delete" onclick="deleteTransaction(${item.id})">🗑️</button>
      </div>
    `;
    listContainer.appendChild(li);
  });
}

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

  const catList = document.getElementById('jaar-categories-list');
  catList.innerHTML = '';
  const categories = Object.keys(catTotals).sort();

  if (categories.length === 0) {
    catList.innerHTML = '<div class="row-item"><span style="color:var(--text-muted);">Geen uitgaven voor dit jaar.</span></div>';
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
    const val = monthNetTotals[idx];
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `
      <span>${name}</span>
      <strong style="color: ${val >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${val >= 0 ? '+' : ''}€ ${val.toFixed(2)}
      </strong>
    `;
    mList.appendChild(div);
  });
}

function loadCharts() {
  const selectedMonth = document.getElementById('maand-select').value || new Date().toISOString().slice(0, 7);
  const selectedYear = document.getElementById('jaar-select').value || new Date().getFullYear().toString();

  const expenses = getExpenses();

  const monthExpenses = expenses.filter(e => e.datum && e.datum.startsWith(selectedMonth) && (e.type || 'uitgave') === 'uitgave');
  const catTotals = {};
  
  CATEGORIES.uitgave.forEach(cat => catTotals[cat] = 0);
  
  monthExpenses.forEach(item => {
    catTotals[item.categorie] = (catTotals[item.categorie] || 0) + parseFloat(item.bedrag);
  });

  const barCatLabels = Object.keys(catTotals);
  const barCatData = Object.values(catTotals);

  const ctxPie = document.getElementById('categoryPieChart').getContext('2d');
  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(ctxPie, {
    type: 'bar',
    data: {
      labels: barCatLabels,
      datasets: [{
        label: 'Uitgaven in €',
        data: barCatData,
        backgroundColor: '#dc2626', // Rood voor uitgaven grafiek
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: function(value) { return '€ ' + value; } }
        },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });

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
        { label: 'Inkomsten', data: incTotals, backgroundColor: '#16a34a', borderRadius: 4 }, // Groen
        { label: 'Uitgaven', data: expTotals, backgroundColor: '#dc2626', borderRadius: 4 }  // Rood
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: function(value) { return '€ ' + value; } }
        }
      }
    }
  });
}

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

function exportJSONBackup() {
  const data = {
    expenses: getExpenses(),
    templates: getFixedTemplates(),
    exportDate: new Date().toISOString()
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ReisBudget_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJSONBackup() {
  const fileInput = document.getElementById('import-file');
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Selecteer eerst een backupbestand.');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        if (confirm('Weet je zeker dat je deze backup wilt terugzetten? Huidige gegevens op dit apparaat worden overschreven.')) {
          localStorage.setItem('reis_uitgaven', JSON.stringify(parsed.expenses));
          if (parsed.templates) {
            localStorage.setItem('reis_vaste_lasten', JSON.stringify(parsed.templates));
          }
          alert('Backup succesvol teruggezet!');
          loadRecentExpenses();
          loadMonthOverview();
        }
      } else {
        alert('Ongeldig backupbestand.');
      }
    } catch (err) {
      alert('Fout bij het lezen van het bestand.');
    }
  };
  reader.readAsText(file);
}

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
    ul.innerHTML = '<li style="color: var(--text-muted);">Nog geen vaste lasten ingesteld.</li>';
    return;
  }

  templates.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.omschrijving}</strong><br>
        <small style="color: var(--text-muted);">€ ${parseFloat(item.bedrag).toFixed(2)} p/m</small>
      </div>
      <button class="btn-delete" onclick="deleteFixedTemplate(${item.id})">🗑️</button>
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

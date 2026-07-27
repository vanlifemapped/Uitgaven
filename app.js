// === INITIALISATIE ===
document.addEventListener('DOMContentLoaded', () => {
  // Vul de datum standaard in op vandaag
  document.getElementById('datum').valueAsDate = new Date();

  // Stel standaard maand in op huidige maand (YYYY-MM)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('maand-select').value = currentMonthStr;

  // Vul het jaar-keuzemenu in
  initYearSelect(now.getFullYear());

  // Controleer en kopieer automatisch de vaste lasten voor de huidige maand
  checkAndCopyFixedExpenses();

  // Laad de laatste uitgaven op het hoofdscherm
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
  if (tabName === 'vaste-lasten') loadFixedTemplates();
}

// === AUTOMATISCH VASTE LASTEN KOPIËREN ===
function checkAndCopyFixedExpenses() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const firstOfMonth = `${yearMonth}-01`;

  // Sleutel om te onthouden of we DEZE maand al gekopieerd hebben
  const key = `fixed_applied_${yearMonth}`;
  if (localStorage.getItem(key)) return; // Al verwerkt voor deze maand!

  const templates = getFixedTemplates();
  if (templates.length === 0) return;

  const currentExpenses = getExpenses();

  // Koppel elke vaste last als nieuwe uitgave voor de 1e van de maand
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
  localStorage.setItem(key, 'true'); // Markeer als verwerkt
}

// === UITGAVEN INVOEREN & OMSLAAN ===
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
  // Sorteer op meest recente datum
  expenses.sort((a, b) => new Date(b.datum) - new Date(a.datum));

  const ul = document.getElementById('recent-expenses-ul');
  ul.innerHTML = '';

  const recent = expenses.slice(0, 5); // Toon laatste 5

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
  const selectedMonth = document.getElementById('maand-select').value; // Formaat: YYYY-MM
  if (!selectedMonth) return;

  const expenses = getExpenses();
  
  // Filter uitgaven die beginnen met YYYY-MM
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
  const selectedYear = document.getElementById('jaar-select').value; // YYYY
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

    // Haal maandindex op (00..11)
    const monthIndex = parseInt(item.datum.split('-')[1], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      monthTotals[monthIndex] += bedrag;
    }
  });

  document.getElementById('jaar-totaal-bedrag').innerText = `€ ${total.toFixed(2)}`;

  // Categorieënlijst
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

  // Maandenlijst
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

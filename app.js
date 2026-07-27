// === SUPABASE CONFIGURATIE ===
const SUPABASE_URL = 'JOUW_SUPABASE_URL_HIER';
const SUPABASE_KEY = 'JOUW_SUPABASE_ANON_KEY_HIER';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// === INITIALISATIE ===
document.addEventListener('DOMContentLoaded', () => {
  // Vul de datum in op vandaag
  document.getElementById('datum').valueAsDate = new Date();

  // Stel standaard maand in op huidige maand
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('maand-select').value = currentMonthStr;

  // Vul jaarselectie in
  initYearSelect(now.getFullYear());

  // Controleer en kopieer vaste lasten voor de huidige maand
  checkAndCopyFixedExpenses();

  // Laad eerste gegevens
  loadRecentExpenses();
});

// === TAB NAVIGATIE ===
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  event.currentTarget.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');

  if (tabName === 'maand') loadMonthOverview();
  if (tabName === 'jaar') loadYearOverview();
  if (tabName === 'vaste-lasten') loadFixedTemplates();
}

// === VASTE LASTEN AUTOMATISEREN ===
async function checkAndCopyFixedExpenses() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const firstOfMonth = `${yearMonth}-01`;

  const key = `fixed_applied_${yearMonth}`;
  if (localStorage.getItem(key)) return; // Al verwerkt deze maand

  if (!supabase) return;

  // Haal actieve vaste lasten templates op
  const { data: templates, error: tErr } = await supabase
    .from('vaste_lasten_template')
    .select('*');

  if (tErr || !templates || templates.length === 0) return;

  // Voeg templates toe aan uitgaven tabel
  const toInsert = templates.map(t => ({
    datum: firstOfMonth,
    bedrag: t.bedrag,
    categorie: 'Vaste lasten',
    omschrijving: t.omschrijving
  }));

  const { error: iErr } = await supabase.from('uitgaven').insert(toInsert);

  if (!iErr) {
    localStorage.setItem(key, 'true');
    console.log(`Vaste lasten automatisch gekopieerd voor ${yearMonth}`);
  }
}

// === UITGAVEN INVOEREN & OPSLAAN ===
async function saveExpense(e) {
  e.preventDefault();

  const datum = document.getElementById('datum').value;
  const bedrag = parseFloat(document.getElementById('bedrag').value);
  const categorie = document.getElementById('categorie').value;
  const omschrijving = document.getElementById('omschrijving').value;

  if (!supabase) {
    alert('Supabase is nog niet geconfigureerd.');
    return;
  }

  const { error } = await supabase
    .from('uitgaven')
    .insert([{ datum, bedrag, categorie, omschrijving }]);

  if (error) {
    alert('Fout bij opslaan: ' + error.message);
  } else {
    document.getElementById('expense-form').reset();
    document.getElementById('datum').valueAsDate = new Date();
    loadRecentExpenses();
    alert('Uitgave opgeslagen!');
  }
}

async function loadRecentExpenses() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('uitgaven')
    .select('*')
    .order('datum', { ascending: false })
    .limit(5);

  const ul = document.getElementById('recent-expenses-ul');
  ul.innerHTML = '';

  if (data) {
    data.forEach(item => {
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
}

// === MAAND OVERZICHT ===
async function loadMonthOverview() {
  const selectedMonth = document.getElementById('maand-select').value; // YYYY-MM
  if (!selectedMonth || !supabase) return;

  const startDate = `${selectedMonth}-01`;
  const endDate = `${selectedMonth}-31`;

  const { data, error } = await supabase
    .from('uitgaven')
    .select('*')
    .gte('datum', startDate)
    .lte('datum', endDate);

  if (error) return;

  let total = 0;
  const catTotals = {};

  data.forEach(item => {
    const bedrag = parseFloat(item.bedrag);
    total += bedrag;
    catTotals[item.categorie] = (catTotals[item.categorie] || 0) + bedrag;
  });

  document.getElementById('maand-totaal-bedrag').innerText = `€ ${total.toFixed(2)}`;

  const catList = document.getElementById('maand-categories-list');
  catList.innerHTML = '';

  Object.keys(catTotals).sort().forEach(cat => {
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

async function loadYearOverview() {
  const year = document.getElementById('jaar-select').value;
  if (!year || !supabase) return;

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('uitgaven')
    .select('*')
    .gte('datum', startDate)
    .lte('datum', endDate);

  if (error) return;

  let total = 0;
  const catTotals = {};
  const monthTotals = Array(12).fill(0);

  data.forEach(item => {
    const bedrag = parseFloat(item.bedrag);
    total += bedrag;
    catTotals[item.categorie] = (catTotals[item.categorie] || 0) + bedrag;

    const m = new Date(item.datum).getMonth(); // 0-11
    monthTotals[m] += bedrag;
  });

  document.getElementById('jaar-totaal-bedrag').innerText = `€ ${total.toFixed(2)}`;

  // Categorieën
  const catList = document.getElementById('jaar-categories-list');
  catList.innerHTML = '';
  Object.keys(catTotals).sort().forEach(cat => {
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `<span>${cat}</span><strong>€ ${catTotals[cat].toFixed(2)}</strong>`;
    catList.appendChild(div);
  });

  // Maanden
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

// === VASTE LASTEN TEMPLATES BEHEER ===
async function saveFixedTemplate(e) {
  e.preventDefault();

  const omschrijving = document.getElementById('fixed-omschrijving').value;
  const bedrag = parseFloat(document.getElementById('fixed-bedrag').value);

  if (!supabase) return;

  const { error } = await supabase
    .from('vaste_lasten_template')
    .insert([{ omschrijving, bedrag }]);

  if (error) {
    alert('Fout: ' + error.message);
  } else {
    document.getElementById('fixed-form').reset();
    loadFixedTemplates();
  }
}

async function loadFixedTemplates() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('vaste_lasten_template')
    .select('*');

  const ul = document.getElementById('fixed-templates-ul');
  ul.innerHTML = '';

  if (data) {
    data.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <strong>${item.omschrijving}</strong><br>
          <small>€ ${parseFloat(item.bedrag).toFixed(2)} p/m</small>
        </div>
        <button class="btn-delete" onclick="deleteFixedTemplate(${item.id})">Verwijder</button>
      `;
      ul.appendChild(li);
    });
  }
}

async function deleteFixedTemplate(id) {
  if (!confirm('Weet je zeker dat je deze vaste last wilt verwijderen?')) return;

  const { error } = await supabase
    .from('vaste_lasten_template')
    .delete()
    .eq('id', id);

  if (!error) loadFixedTemplates();
}

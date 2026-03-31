/* ============================================
   MY RECIPE BOOK — app.js
   All data saved to localStorage (no server needed)
   ============================================ */

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let recipes       = [];
let shoppingItems = [];
let currentFilter = 'all';
let currentSearch = '';
let editingId     = null;
let viewingId     = null;
let baseServings  = 4;
let curServings   = 4;

const CATEGORY_COLORS = {
  breakfast: '#FF8C00',
  lunch:     '#00AEEF',
  dinner:    '#9B5DE5',
  snack:     '#00C896',
  dessert:   '#FF6B9D',
};

const CATEGORY_LABELS = {
  breakfast: '🌅 Breakfast',
  lunch:     '☀️ Lunch',
  dinner:    '🌙 Dinner',
  snack:     '🍿 Snack',
  dessert:   '🍰 Dessert',
};

const DEFAULT_EMOJIS = {
  breakfast: '🥞',
  lunch:     '🥗',
  dinner:    '🍝',
  snack:     '🍿',
  dessert:   '🍰',
};

// ─────────────────────────────────────────────
// LOAD / SAVE
// ─────────────────────────────────────────────
function loadData() {
  try {
    recipes       = JSON.parse(localStorage.getItem('recipebook_recipes') || '[]');
    shoppingItems = JSON.parse(localStorage.getItem('recipebook_shopping') || '[]');
  } catch(e) {
    recipes = []; shoppingItems = [];
  }
}

function saveData() {
  localStorage.setItem('recipebook_recipes', JSON.stringify(recipes));
  localStorage.setItem('recipebook_shopping', JSON.stringify(shoppingItems));
}

// ─────────────────────────────────────────────
// RENDER RECIPES
// ─────────────────────────────────────────────
function renderRecipes() {
  const grid  = document.getElementById('recipe-grid');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('recipe-count');

  let filtered = recipes.filter(r => {
    const matchFilter =
      currentFilter === 'all'       ? true :
      currentFilter === 'favourite' ? r.favourite :
      r.category === currentFilter;

    const q = currentSearch.toLowerCase().trim();
    const matchSearch = !q ||
      r.name.toLowerCase().includes(q) ||
      (r.desc || '').toLowerCase().includes(q) ||
      (r.ingredients || []).some(i => i.toLowerCase().includes(q)) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q));

    return matchFilter && matchSearch;
  });

  count.textContent = `${filtered.length} recipe${filtered.length !== 1 ? 's' : ''}`;

  // Remove old cards (keep empty state)
  grid.querySelectorAll('.recipe-card').forEach(c => c.remove());

  if (!filtered.length) {
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  filtered.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.setProperty('--card-color', CATEGORY_COLORS[r.category] || '#FF8C00');
    card.onclick = () => openView(r.id);

    const tagsHtml = (r.tags || []).slice(0,3).map(t =>
      `<span class="tag">${escHtml(t)}</span>`
    ).join('');

    card.innerHTML = `
      <div class="card-top">
        <span class="card-emoji">${r.emoji || DEFAULT_EMOJIS[r.category] || '🍽'}</span>
        <button class="card-fav" onclick="event.stopPropagation(); quickFav('${r.id}')" title="${r.favourite ? 'Remove favourite' : 'Add favourite'}">
          ${r.favourite ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="card-name">${escHtml(r.name)}</div>
      ${r.desc ? `<div class="card-desc">${escHtml(r.desc)}</div>` : ''}
      <div class="card-meta">
        ${r.prep ? `<span>⏱ ${escHtml(r.prep)}</span>` : ''}
        ${r.cook ? `<span>🔥 ${escHtml(r.cook)}</span>` : ''}
        ${r.servings ? `<span>🍽 ${r.servings}</span>` : ''}
      </div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    `;
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────
// FILTER + SEARCH
// ─────────────────────────────────────────────
function setFilter(btn, filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRecipes();
}

function filterRecipes() {
  currentSearch = document.getElementById('search-input').value;
  renderRecipes();
}

// ─────────────────────────────────────────────
// ADD / EDIT MODAL
// ─────────────────────────────────────────────
function openAddModal(prefillId) {
  editingId = prefillId || null;
  document.getElementById('modal-title').textContent = editingId ? '✏️ Edit Recipe' : '✨ New Recipe';

  if (editingId) {
    const r = recipes.find(x => x.id === editingId);
    if (r) {
      document.getElementById('f-name').value        = r.name || '';
      document.getElementById('f-category').value    = r.category || 'dinner';
      document.getElementById('f-prep').value        = r.prep || '';
      document.getElementById('f-cook').value        = r.cook || '';
      document.getElementById('f-servings').value    = r.servings || 4;
      document.getElementById('f-desc').value        = r.desc || '';
      document.getElementById('f-ingredients').value = (r.ingredients || []).join('\n');
      document.getElementById('f-steps').value       = (r.steps || []).join('\n');
      document.getElementById('f-tags').value        = (r.tags || []).join(', ');
      document.getElementById('f-emoji').value       = r.emoji || '';
    }
  } else {
    document.getElementById('f-name').value        = '';
    document.getElementById('f-category').value    = 'dinner';
    document.getElementById('f-prep').value        = '';
    document.getElementById('f-cook').value        = '';
    document.getElementById('f-servings').value    = 4;
    document.getElementById('f-desc').value        = '';
    document.getElementById('f-ingredients').value = '';
    document.getElementById('f-steps').value       = '';
    document.getElementById('f-tags').value        = '';
    document.getElementById('f-emoji').value       = '';
  }

  openModal('add-modal');
  setTimeout(() => document.getElementById('f-name').focus(), 100);
}

function saveRecipe() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) {
    document.getElementById('f-name').focus();
    document.getElementById('f-name').style.borderColor = 'var(--tomato)';
    setTimeout(() => document.getElementById('f-name').style.borderColor = '', 1500);
    return;
  }

  const recipe = {
    id:          editingId || Date.now().toString(),
    name,
    category:    document.getElementById('f-category').value,
    prep:        document.getElementById('f-prep').value.trim(),
    cook:        document.getElementById('f-cook').value.trim(),
    servings:    parseInt(document.getElementById('f-servings').value) || 4,
    desc:        document.getElementById('f-desc').value.trim(),
    ingredients: document.getElementById('f-ingredients').value.split('\n').map(s => s.trim()).filter(Boolean),
    steps:       document.getElementById('f-steps').value.split('\n').map(s => s.trim()).filter(Boolean),
    tags:        document.getElementById('f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    emoji:       document.getElementById('f-emoji').value.trim() || DEFAULT_EMOJIS[document.getElementById('f-category').value] || '🍽',
    favourite:   editingId ? (recipes.find(r => r.id === editingId)?.favourite || false) : false,
    createdAt:   editingId ? (recipes.find(r => r.id === editingId)?.createdAt || Date.now()) : Date.now(),
  };

  if (editingId) {
    const idx = recipes.findIndex(r => r.id === editingId);
    if (idx !== -1) recipes[idx] = recipe;
  } else {
    recipes.unshift(recipe);
  }

  saveData();
  closeModal('add-modal');
  renderRecipes();

  if (editingId && viewingId === editingId) {
    openView(editingId);
  }
}

// ─────────────────────────────────────────────
// VIEW MODAL
// ─────────────────────────────────────────────
function openView(id) {
  const r = recipes.find(x => x.id === id);
  if (!r) return;
  viewingId    = id;
  baseServings = r.servings || 4;
  curServings  = baseServings;

  document.getElementById('view-emoji').textContent    = r.emoji || DEFAULT_EMOJIS[r.category] || '🍽';
  document.getElementById('view-name').textContent     = r.name;
  document.getElementById('view-prep').textContent     = r.prep ? `⏱ ${r.prep}` : '';
  document.getElementById('view-cook').textContent     = r.cook ? `🔥 ${r.cook}` : '';
  document.getElementById('view-servings').textContent = curServings;
  document.getElementById('view-desc').textContent     = r.desc || '';

  const badge = document.getElementById('view-category-badge');
  badge.textContent   = CATEGORY_LABELS[r.category] || r.category;
  badge.style.background = (CATEGORY_COLORS[r.category] || '#FF8C00') + '22';
  badge.style.color      = CATEGORY_COLORS[r.category] || '#FF8C00';

  const favBtn = document.getElementById('fav-btn');
  favBtn.textContent = r.favourite ? '❤️' : '🤍';
  favBtn.classList.toggle('active', !!r.favourite);

  renderIngredients(r.ingredients || [], 1);
  renderSteps(r.steps || []);

  const tagsEl = document.getElementById('view-tags');
  tagsEl.innerHTML = (r.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');

  openModal('view-modal');
}

function renderIngredients(ingredients, multiplier) {
  const ul = document.getElementById('view-ingredients');
  ul.innerHTML = ingredients.map((ing, i) => {
    const scaled = scaleIngredient(ing, multiplier);
    return `
      <li id="ing-${i}" onclick="toggleCheck('ing-${i}')">
        <span class="check-box"></span>
        <span>${escHtml(scaled)}</span>
      </li>
    `;
  }).join('');
}

function renderSteps(steps) {
  const ol = document.getElementById('view-steps');
  ol.innerHTML = steps.map((step, i) => `
    <li id="step-${i}" onclick="toggleCheck('step-${i}')">
      <span class="step-num">${i + 1}</span>
      <span>${escHtml(step)}</span>
    </li>
  `).join('');
}

function toggleCheck(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('checked');
}

// ─────────────────────────────────────────────
// SERVINGS SCALER
// ─────────────────────────────────────────────
function changeServings(delta) {
  const newVal = Math.max(1, curServings + delta);
  if (newVal === curServings) return;
  curServings = newVal;
  document.getElementById('view-servings').textContent = curServings;

  const r = recipes.find(x => x.id === viewingId);
  if (r) {
    const multiplier = curServings / baseServings;
    renderIngredients(r.ingredients || [], multiplier);
  }
}

function scaleIngredient(text, multiplier) {
  if (multiplier === 1) return text;
  return text.replace(/(\d+(\.\d+)?)/g, (match, num) => {
    const scaled = parseFloat(num) * multiplier;
    // Return nice fraction-ish number
    if (scaled % 1 === 0) return scaled.toString();
    return parseFloat(scaled.toFixed(2)).toString();
  });
}

// ─────────────────────────────────────────────
// FAVOURITES
// ─────────────────────────────────────────────
function toggleFavourite() {
  const r = recipes.find(x => x.id === viewingId);
  if (!r) return;
  r.favourite = !r.favourite;
  saveData();
  const btn = document.getElementById('fav-btn');
  btn.textContent = r.favourite ? '❤️' : '🤍';
  btn.classList.toggle('active', r.favourite);
  renderRecipes();
}

function quickFav(id) {
  const r = recipes.find(x => x.id === id);
  if (!r) return;
  r.favourite = !r.favourite;
  saveData();
  renderRecipes();
}

// ─────────────────────────────────────────────
// EDIT / DELETE
// ─────────────────────────────────────────────
function editCurrentRecipe() {
  closeModal('view-modal');
  setTimeout(() => openAddModal(viewingId), 150);
}

function deleteCurrentRecipe() {
  if (!confirm('Delete this recipe? This cannot be undone.')) return;
  recipes = recipes.filter(r => r.id !== viewingId);
  saveData();
  closeModal('view-modal');
  renderRecipes();
}

// ─────────────────────────────────────────────
// SHOPPING LIST
// ─────────────────────────────────────────────
function openShopping() {
  renderShoppingList();
  openModal('shopping-modal');
}

function addAllToShopping() {
  const r = recipes.find(x => x.id === viewingId);
  if (!r) return;
  const multiplier = curServings / baseServings;
  (r.ingredients || []).forEach(ing => {
    const scaled = scaleIngredient(ing, multiplier);
    if (!shoppingItems.find(s => s.text.toLowerCase() === scaled.toLowerCase())) {
      shoppingItems.push({ id: Date.now() + Math.random(), text: scaled, checked: false });
    }
  });
  saveData();
  updateShoppingBadge();
  showToast(`Added ${r.ingredients.length} ingredients to shopping list!`);
}

function addShoppingItem() {
  const input = document.getElementById('shopping-input');
  const text  = input.value.trim();
  if (!text) return;
  shoppingItems.push({ id: Date.now().toString(), text, checked: false });
  input.value = '';
  saveData();
  renderShoppingList();
  updateShoppingBadge();
}

function shoppingKeydown(e) {
  if (e.key === 'Enter') addShoppingItem();
}

function toggleShoppingItem(id) {
  const item = shoppingItems.find(s => s.id == id);
  if (item) { item.checked = !item.checked; saveData(); renderShoppingList(); updateShoppingBadge(); }
}

function deleteShoppingItem(id) {
  shoppingItems = shoppingItems.filter(s => s.id != id);
  saveData();
  renderShoppingList();
  updateShoppingBadge();
}

function clearShopping() {
  if (!shoppingItems.length) return;
  if (!confirm('Clear entire shopping list?')) return;
  shoppingItems = [];
  saveData();
  renderShoppingList();
  updateShoppingBadge();
}

function renderShoppingList() {
  const ul    = document.getElementById('shopping-list');
  const empty = document.getElementById('shopping-empty');
  ul.innerHTML = '';

  if (!shoppingItems.length) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  // Show unchecked first
  const sorted = [...shoppingItems].sort((a, b) => a.checked - b.checked);
  sorted.forEach(item => {
    const li = document.createElement('li');
    if (item.checked) li.classList.add('checked');
    li.innerHTML = `
      <span class="shopping-check" onclick="toggleShoppingItem('${item.id}')">${item.checked ? '✓' : ''}</span>
      <span style="flex:1">${escHtml(item.text)}</span>
      <button class="shopping-del" onclick="deleteShoppingItem('${item.id}')">✕</button>
    `;
    ul.appendChild(li);
  });
}

function updateShoppingBadge() {
  const badge = document.getElementById('shopping-count');
  const remaining = shoppingItems.filter(s => !s.checked).length;
  if (remaining > 0) {
    badge.textContent = remaining;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOutside(event, id) {
  if (event.target === document.getElementById(id)) closeModal(id);
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:2rem; left:50%; transform:translateX(-50%) translateY(20px);
      background:#1A1208; color:white; padding:10px 20px; border-radius:999px;
      font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif;
      opacity:0; pointer-events:none; transition:all 0.3s; z-index:9999; white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2800);
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['view-modal','add-modal','shopping-modal'].forEach(id => closeModal(id));
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search-input').focus();
  }
});

// ─────────────────────────────────────────────
// SAMPLE RECIPES (only added if no data exists)
// ─────────────────────────────────────────────
function addSampleRecipes() {
  recipes = [
    {
      id: 'sample-1',
      name: 'Classic Spaghetti Bolognese',
      category: 'dinner',
      emoji: '🍝',
      prep: '15 mins',
      cook: '45 mins',
      servings: 4,
      desc: 'A rich, hearty Italian classic that everyone loves.',
      ingredients: [
        '400g spaghetti',
        '500g beef mince',
        '1 onion, diced',
        '3 garlic cloves, minced',
        '2 cans chopped tomatoes',
        '2 tbsp tomato paste',
        '1 tsp dried oregano',
        '1 tsp dried basil',
        'Salt and pepper to taste',
        'Parmesan to serve',
      ],
      steps: [
        'Heat oil in a large pan over medium heat',
        'Fry onion for 5 mins until soft, add garlic and cook 1 min',
        'Add mince and brown for 8 mins, breaking it up',
        'Stir in tomato paste, cook 2 mins',
        'Add chopped tomatoes, herbs, salt and pepper',
        'Simmer on low heat for 30 mins, stirring occasionally',
        'Cook spaghetti according to packet instructions',
        'Serve sauce over pasta with parmesan',
      ],
      tags: ['italian', 'classic', 'family favourite'],
      favourite: true,
      createdAt: Date.now(),
    },
    {
      id: 'sample-2',
      name: 'Fluffy Pancakes',
      category: 'breakfast',
      emoji: '🥞',
      prep: '5 mins',
      cook: '20 mins',
      servings: 2,
      desc: 'Light, fluffy pancakes perfect for a lazy weekend morning.',
      ingredients: [
        '1 cup plain flour',
        '1 tbsp sugar',
        '1 tsp baking powder',
        '1/2 tsp baking soda',
        'Pinch of salt',
        '3/4 cup buttermilk',
        '1 egg',
        '2 tbsp melted butter',
        'Butter for frying',
      ],
      steps: [
        'Mix flour, sugar, baking powder, baking soda, and salt in a bowl',
        'Whisk buttermilk, egg, and melted butter together',
        'Pour wet ingredients into dry and mix until just combined (lumps are fine!)',
        'Heat a pan over medium heat and add a small knob of butter',
        'Pour 1/4 cup batter per pancake, cook until bubbles form on top',
        'Flip and cook another minute until golden',
        'Serve with maple syrup and fresh berries',
      ],
      tags: ['breakfast', 'quick', 'sweet'],
      favourite: false,
      createdAt: Date.now() - 1000,
    },
  ];
  saveData();
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
loadData();
if (recipes.length === 0) addSampleRecipes();
renderRecipes();
updateShoppingBadge();

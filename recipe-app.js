/* ============================================
   MY RECIPE BOOK — recipe-app.js
   All data saved to localStorage
   ============================================ */

let recipes       = [];
let shoppingItems = [];
let currentFilter = 'all';
let currentSearch = '';
let editingId     = null;
let viewingId     = null;
let baseServings  = 4;
let curServings   = 4;

const CATEGORY_LABELS = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack', dessert:'Dessert' };

function loadData() {
  try {
    recipes       = JSON.parse(localStorage.getItem('recipebook_recipes') || '[]');
    shoppingItems = JSON.parse(localStorage.getItem('recipebook_shopping') || '[]');
  } catch(e) { recipes = []; shoppingItems = []; }
}

function saveData() {
  localStorage.setItem('recipebook_recipes', JSON.stringify(recipes));
  localStorage.setItem('recipebook_shopping', JSON.stringify(shoppingItems));
}

function renderRecipes() {
  const grid  = document.getElementById('recipe-grid');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('recipe-count');

  let filtered = recipes.filter(r => {
    const matchFilter = currentFilter === 'all' ? true : currentFilter === 'favourite' ? r.favourite : r.category === currentFilter;
    const q = currentSearch.toLowerCase().trim();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || (r.desc||'').toLowerCase().includes(q) || (r.ingredients||[]).some(i=>i.toLowerCase().includes(q)) || (r.tags||[]).some(t=>t.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  count.textContent = `${filtered.length} recipe${filtered.length!==1?'s':''}`;
  grid.querySelectorAll('.recipe-card').forEach(c=>c.remove());

  if (!filtered.length) { empty.style.display='flex'; return; }
  empty.style.display = 'none';

  filtered.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = () => openView(r.id);

    const tagsHtml = (r.tags||[]).slice(0,3).map(t=>`<span class="tag">${escHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="card-category">${CATEGORY_LABELS[r.category]||r.category}</div>
      <div class="card-top">
        <div class="card-name">${escHtml(r.name)}</div>
        <button class="card-fav${r.favourite?' active':''}" onclick="event.stopPropagation();quickFav('${r.id}')" title="Favourite">&#9825;</button>
      </div>
      ${r.desc?`<div class="card-desc">${escHtml(r.desc)}</div>`:''}
      <div class="card-meta">
        ${r.prep?`<span>${escHtml(r.prep)} prep</span>`:''}
        ${r.cook?`<span>${escHtml(r.cook)} cook</span>`:''}
        ${r.servings?`<span>Serves ${r.servings}</span>`:''}
      </div>
      ${tagsHtml?`<div class="card-tags">${tagsHtml}</div>`:''}
    `;
    grid.appendChild(card);
  });
}

function setFilter(btn, filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderRecipes();
}

function filterRecipes() {
  currentSearch = document.getElementById('search-input').value;
  renderRecipes();
}

function openAddModal(prefillId) {
  editingId = prefillId || null;
  document.getElementById('modal-title').textContent = editingId ? 'Edit Recipe' : 'New Recipe';

  if (editingId) {
    const r = recipes.find(x=>x.id===editingId);
    if (r) {
      document.getElementById('f-name').value        = r.name||'';
      document.getElementById('f-category').value    = r.category||'dinner';
      document.getElementById('f-prep').value        = r.prep||'';
      document.getElementById('f-cook').value        = r.cook||'';
      document.getElementById('f-servings').value    = r.servings||4;
      document.getElementById('f-desc').value        = r.desc||'';
      document.getElementById('f-ingredients').value = (r.ingredients||[]).join('\n');
      document.getElementById('f-steps').value       = (r.steps||[]).join('\n');
      document.getElementById('f-tags').value        = (r.tags||[]).join(', ');
    }
  } else {
    ['f-name','f-prep','f-cook','f-desc','f-ingredients','f-steps','f-tags'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('f-category').value = 'dinner';
    document.getElementById('f-servings').value = 4;
  }

  openModal('add-modal');
  setTimeout(()=>document.getElementById('f-name').focus(), 100);
}

function saveRecipe() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) {
    document.getElementById('f-name').style.borderColor = '#b05050';
    document.getElementById('f-name').focus();
    setTimeout(()=>document.getElementById('f-name').style.borderColor='', 1500);
    return;
  }

  const recipe = {
    id:          editingId || Date.now().toString(),
    name,
    category:    document.getElementById('f-category').value,
    prep:        document.getElementById('f-prep').value.trim(),
    cook:        document.getElementById('f-cook').value.trim(),
    servings:    parseInt(document.getElementById('f-servings').value)||4,
    desc:        document.getElementById('f-desc').value.trim(),
    ingredients: document.getElementById('f-ingredients').value.split('\n').map(s=>s.trim()).filter(Boolean),
    steps:       document.getElementById('f-steps').value.split('\n').map(s=>s.trim()).filter(Boolean),
    tags:        document.getElementById('f-tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    favourite:   editingId?(recipes.find(r=>r.id===editingId)?.favourite||false):false,
    createdAt:   editingId?(recipes.find(r=>r.id===editingId)?.createdAt||Date.now()):Date.now(),
  };

  if (editingId) { const idx=recipes.findIndex(r=>r.id===editingId); if(idx!==-1) recipes[idx]=recipe; }
  else recipes.unshift(recipe);

  saveData();
  closeModal('add-modal');
  renderRecipes();
  if (editingId && viewingId===editingId) openView(editingId);
}

function openView(id) {
  const r = recipes.find(x=>x.id===id);
  if (!r) return;
  viewingId    = id;
  baseServings = r.servings||4;
  curServings  = baseServings;

  document.getElementById('view-name').textContent     = r.name;
  document.getElementById('view-prep').textContent     = r.prep ? `Prep: ${r.prep}` : '';
  document.getElementById('view-cook').textContent     = r.cook ? `Cook: ${r.cook}` : '';
  document.getElementById('view-servings').textContent = curServings;
  document.getElementById('view-desc').textContent     = r.desc||'';
  document.getElementById('view-category-badge').textContent = CATEGORY_LABELS[r.category]||r.category;

  const favBtn = document.getElementById('fav-btn');
  favBtn.innerHTML = r.favourite ? '&#9829;' : '&#9825;';
  favBtn.classList.toggle('active', !!r.favourite);

  renderIngredients(r.ingredients||[], 1);
  renderSteps(r.steps||[]);

  const tagsEl = document.getElementById('view-tags');
  tagsEl.innerHTML = (r.tags||[]).map(t=>`<span class="tag">${escHtml(t)}</span>`).join('');

  openModal('view-modal');
}

function renderIngredients(ingredients, multiplier) {
  document.getElementById('view-ingredients').innerHTML = ingredients.map((ing,i)=>`
    <li id="ing-${i}" onclick="toggleCheck('ing-${i}')">
      <span class="check-box"></span>
      <span>${escHtml(scaleIngredient(ing,multiplier))}</span>
    </li>`).join('');
}

function renderSteps(steps) {
  document.getElementById('view-steps').innerHTML = steps.map((step,i)=>`
    <li id="step-${i}" onclick="toggleCheck('step-${i}')">
      <span class="step-num">${i+1}</span>
      <span>${escHtml(step)}</span>
    </li>`).join('');
}

function toggleCheck(id) { const el=document.getElementById(id); if(el) el.classList.toggle('checked'); }

function changeServings(delta) {
  const nv = Math.max(1, curServings+delta);
  if (nv===curServings) return;
  curServings = nv;
  document.getElementById('view-servings').textContent = curServings;
  const r = recipes.find(x=>x.id===viewingId);
  if (r) renderIngredients(r.ingredients||[], curServings/baseServings);
}

function scaleIngredient(text, multiplier) {
  if (multiplier===1) return text;
  return text.replace(/(\d+(\.\d+)?)/g, (m,n) => {
    const s = parseFloat(n)*multiplier;
    return s%1===0 ? s.toString() : parseFloat(s.toFixed(2)).toString();
  });
}

function toggleFavourite() {
  const r = recipes.find(x=>x.id===viewingId);
  if (!r) return;
  r.favourite = !r.favourite;
  saveData();
  const btn = document.getElementById('fav-btn');
  btn.innerHTML = r.favourite ? '&#9829;' : '&#9825;';
  btn.classList.toggle('active', r.favourite);
  renderRecipes();
}

function quickFav(id) {
  const r = recipes.find(x=>x.id===id);
  if (!r) return;
  r.favourite = !r.favourite;
  saveData(); renderRecipes();
}

function editCurrentRecipe() { closeModal('view-modal'); setTimeout(()=>openAddModal(viewingId), 150); }

function deleteCurrentRecipe() {
  if (!confirm('Delete this recipe? This cannot be undone.')) return;
  recipes = recipes.filter(r=>r.id!==viewingId);
  saveData(); closeModal('view-modal'); renderRecipes();
}

function openShopping() { renderShoppingList(); openModal('shopping-modal'); }

function addAllToShopping() {
  const r = recipes.find(x=>x.id===viewingId);
  if (!r) return;
  const multiplier = curServings/baseServings;
  (r.ingredients||[]).forEach(ing => {
    const scaled = scaleIngredient(ing, multiplier);
    if (!shoppingItems.find(s=>s.text.toLowerCase()===scaled.toLowerCase()))
      shoppingItems.push({ id: Date.now()+Math.random(), text: scaled, checked: false });
  });
  saveData(); updateShoppingBadge();
  showToast(`Added ${r.ingredients.length} ingredients to your shopping list`);
}

function addShoppingItem() {
  const input = document.getElementById('shopping-input');
  const text = input.value.trim();
  if (!text) return;
  shoppingItems.push({ id: Date.now().toString(), text, checked: false });
  input.value = '';
  saveData(); renderShoppingList(); updateShoppingBadge();
}

function shoppingKeydown(e) { if(e.key==='Enter') addShoppingItem(); }

function toggleShoppingItem(id) {
  const item = shoppingItems.find(s=>s.id==id);
  if (item) { item.checked=!item.checked; saveData(); renderShoppingList(); updateShoppingBadge(); }
}

function deleteShoppingItem(id) {
  shoppingItems = shoppingItems.filter(s=>s.id!=id);
  saveData(); renderShoppingList(); updateShoppingBadge();
}

function clearShopping() {
  if (!shoppingItems.length||!confirm('Clear entire shopping list?')) return;
  shoppingItems=[]; saveData(); renderShoppingList(); updateShoppingBadge();
}

function renderShoppingList() {
  const ul    = document.getElementById('shopping-list');
  const empty = document.getElementById('shopping-empty');
  ul.innerHTML = '';
  if (!shoppingItems.length) { empty.style.display='block'; return; }
  empty.style.display = 'none';
  [...shoppingItems].sort((a,b)=>a.checked-b.checked).forEach(item => {
    const li = document.createElement('li');
    if (item.checked) li.classList.add('checked');
    li.innerHTML = `
      <span class="shopping-check" onclick="toggleShoppingItem('${item.id}')"></span>
      <span style="flex:1">${escHtml(item.text)}</span>
      <button class="shopping-del" onclick="deleteShoppingItem('${item.id}')">&#10005;</button>
    `;
    ul.appendChild(li);
  });
}

function updateShoppingBadge() {
  const badge = document.getElementById('shopping-count');
  const rem = shoppingItems.filter(s=>!s.checked).length;
  if (rem>0) { badge.textContent=rem; badge.style.display='inline-block'; }
  else badge.style.display='none';
}

function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
function closeModalOutside(e,id) { if(e.target===document.getElementById(id)) closeModal(id); }

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent=msg; toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.classList.remove('show'), 2800);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('keydown', e => {
  if (e.key==='Escape') ['view-modal','add-modal','shopping-modal'].forEach(id=>closeModal(id));
  if ((e.metaKey||e.ctrlKey)&&e.key==='k') { e.preventDefault(); document.getElementById('search-input').focus(); }
});

function addSampleRecipes() {
  recipes = [
    {
      id:'sample-1', name:'Classic Spaghetti Bolognese', category:'dinner',
      prep:'15 mins', cook:'45 mins', servings:4,
      desc:'A rich, hearty Italian classic that the whole family loves.',
      ingredients:['400g spaghetti','500g beef mince','1 onion, diced','3 garlic cloves, minced','2 cans chopped tomatoes','2 tbsp tomato paste','1 tsp dried oregano','1 tsp dried basil','Salt and pepper to taste','Parmesan to serve'],
      steps:['Heat oil in a large pan over medium heat','Fry onion 5 mins until soft, add garlic and cook 1 min','Add mince and brown for 8 mins, breaking it up','Stir in tomato paste, cook 2 mins','Add chopped tomatoes, herbs, salt and pepper','Simmer on low heat for 30 mins','Cook spaghetti per packet instructions','Serve sauce over pasta with parmesan'],
      tags:['italian','classic','family favourite'], favourite:true, createdAt:Date.now()
    },
    {
      id:'sample-2', name:'Fluffy Buttermilk Pancakes', category:'breakfast',
      prep:'5 mins', cook:'20 mins', servings:2,
      desc:'Light, pillowy pancakes perfect for a slow weekend morning.',
      ingredients:['1 cup plain flour','1 tbsp sugar','1 tsp baking powder','1/2 tsp baking soda','Pinch of salt','3/4 cup buttermilk','1 egg','2 tbsp melted butter','Butter for frying'],
      steps:['Mix flour, sugar, baking powder, baking soda and salt','Whisk buttermilk, egg and melted butter together','Pour wet into dry, mix until just combined — lumps are fine','Heat pan over medium heat with a small knob of butter','Pour 1/4 cup batter per pancake, cook until bubbles form','Flip and cook another minute until golden','Serve with maple syrup and fresh berries'],
      tags:['breakfast','quick','sweet'], favourite:false, createdAt:Date.now()-1000
    }
  ];
  saveData();
}

loadData();
if (recipes.length===0) addSampleRecipes();
renderRecipes();
updateShoppingBadge();

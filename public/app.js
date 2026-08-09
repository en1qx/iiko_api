const state = { 
  tab: 'transport', 
  action: 'organizations', 
  tokens: {}, 
  values: {}, 
  response: null, 
  view: 'friendly', 
  apiLogin: '',
  query: '',
  selectedOrg: '',
  selectedRestaurant: '',
  selectedMenu: '',
  selectedPriceCategory: '',
  terminalGroupsList: [],
  terminalGroupsMap: {},
  bases: {
    yandex: '',
    magnit: 'https://pl-magnit.oi.iikoweb.ru/api/integrations/magnit'
  },
  authData: {
    yandex: { clientId: '', clientSecret: '', baseUrl: '' },
    magnit: { clientId: '', clientSecret: '', baseUrl: 'https://pl-magnit.oi.iikoweb.ru/api/integrations/magnit' }
  },
  loginSearch: '',
  loginTab: 'transport',
  loginPage: 1,
  loginPerPage: 4,
  currentApiLogin: '',
  selectedProduct: null,
  isLoading: false
};

const $ = (selector) => document.querySelector(selector);
const actions = {
  transport: [
    ['organizations', '🏢 Организации'], 
    ['terminalGroups', '🖥️ Терминальные группы'],
    ['terminalGroupsIsAlive', '💚 Живы ли терминалы'],
    ['paymentTypes', '💳 Типы оплат'], 
    ['discounts', '🏷️ Скидки'], 
    ['externalMenus', '📋 Внешние меню'],
    ['externalMenu', '🍽️ Блюда из внешнего меню'],
    ['nomenclature', '📦 Номенклатура'], 
    ['stopLists', '⛔ Стоп-лист'],
    ['orderTypes', '📝 Типы заказов'],
  ],
  yandex: [['auth', '🔐 Авторизация'], ['restaurants', '🏪 Заведения'], ['composition', '📊 Состав меню'], ['availability', '📉 Стоп-лист'], ['promos', '🎯 Акции меню'], ['order', '📦 Заказ по ID']],
  magnit: [['auth', '🔐 Авторизация'], ['restaurants', '🏪 Заведения'], ['menu', '📖 Меню'], ['stopList', '🚫 Стоп-лист'], ['order', '📦 Заказ по ID']],
};
const labels = { transport: 'Transport', yandex: 'Яндекс Еда', magnit: 'Магнит' };
const defaults = {
  yandexBase: 'https://api-ru.iiko.services/integrations/ya',
  magnitBase: 'https://pl-magnit.oi.iikoweb.ru/api/integrations/magnit',
};

function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function title() { return actions[state.tab].find(x => x[0] === state.action)?.[1] || ''; }

function optionList(key, placeholder, selectedValue = '') {
  const list = state.values[key] || [];
  if (list.length === 0) {
    return `<select name="${key}" disabled style="width: 100%;"><option value="">Сначала получите данные выше</option></select>`;
  }
  if (list.length === 1) {
    const item = list[0];
    if (key === 'menus') state.selectedMenu = item.id;
    if (key === 'priceCategories') state.selectedPriceCategory = item.id;
    return `<input type="hidden" name="${key}" value="${esc(item.id)}">
            <span style="color: var(--muted); font-size: 13px;">✅ ${esc(item.label)}</span>`;
  }
  const options = list.map(x => `<option value="${esc(x.id)}" ${x.id === selectedValue ? 'selected' : ''}>${esc(x.label)}</option>`).join('');
  return `<select name="${key}" style="width: 100%;"><option value="">${placeholder}</option>${options}</select>`;
}

function field(name, label, type = 'text', value = '', hint = '') {
  return `<label class="field" style="margin-bottom: 8px;">${label}<input name="${name}" type="${type}" value="${esc(value)}" style="width: 100%;" required></label>${hint ? `<p class="hint">${hint}</p>` : ''}`;
}

function render() {
  $('#tabs').innerHTML = Object.entries(labels).map(([key, label]) => 
    `<button data-tab="${key}" class="${key === state.tab ? 'active' : ''}">${label}</button>`
  ).join('');
  
  const token = state.tokens[state.tab];
  let sessionHtml = `<div style="margin-bottom: 18px; color: var(--text);">
    ${token ? `<b>● Сеанс активен</b><br>Токен хранится только до перезагрузки.` : '○ Нет активного токена'}`;
  
  if (state.tab === 'transport') {
    sessionHtml += `<form id="apiLoginForm" autocomplete="off" style="margin-top: 10px;">
      <label class="field" style="margin-bottom: 8px;">
        <b>API Login</b>
        <input id="apiLoginInput" name="apiLogin" type="text" autocomplete="off" value="${esc(state.apiLogin)}" style="width: 100%;" required>
      </label>`;
    
    if (state.action !== 'organizations' && state.action !== 'externalMenus') {
      const orgs = state.values.organizations || [];
      if (orgs.length > 0) {
        sessionHtml += `<label class="field" style="margin-bottom: 8px;">
          <b>Организация</b>
          ${optionList('organizations', 'Выберите организацию', state.selectedOrg)}
        </label>`;
      } else {
        sessionHtml += `<p class="hint" style="margin: 8px 0;">Сначала получите список организаций</p>`;
      }
    }
    
    if (state.action === 'externalMenu') {
      const menus = state.values.menus || [];
      if (menus.length > 0) {
        sessionHtml += `<label class="field" style="margin-bottom: 8px;">
          <b>Внешнее меню</b>
          ${optionList('menus', 'Выберите меню', state.selectedMenu)}
        </label>`;
      } else {
        sessionHtml += `<p class="hint" style="margin: 8px 0;">Сначала получите список внешних меню</p>`;
      }
      
      const priceCategories = state.values.priceCategories || [];
      if (priceCategories.length > 0) {
        sessionHtml += `<label class="field" style="margin-bottom: 8px;">
          <b>Ценовая категория</b>
          ${optionList('priceCategories', 'Выберите ценовую категорию', state.selectedPriceCategory)}
        </label>`;
      } else {
        sessionHtml += `<p class="hint" style="margin: 8px 0;">Нет доступных ценовых категорий</p>`;
      }
    }
    
    if (state.action === 'nomenclature') {
      sessionHtml += `<label class="field" style="margin-bottom: 8px;">
        <b>Ревизия (0 — всё)</b>
        <input name="startRevision" type="number" value="0" style="width: 100%;">
      </label>`;
    }
    
    if (state.action === 'terminalGroupsIsAlive') {
      const terminals = state.terminalGroupsList || [];
      if (terminals.length > 0) {
        sessionHtml += `<label class="field" style="margin-bottom: 8px;">
          <b>Терминалы</b>
          <select name="terminalIds" style="width: 100%;" multiple size="4">
            ${terminals.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
          </select>
          <span style="font-size: 11px; color: var(--muted);">Hold Ctrl/Cmd для выбора нескольких</span>
        </label>`;
      } else {
        sessionHtml += `<p class="hint" style="margin: 8px 0;">Сначала получите список терминалов через "Терминальные группы"</p>`;
      }
    }
    
    if (state.action === 'orderTypes') {
      const orgs = state.values.organizations || [];
      if (orgs.length > 0) {
        sessionHtml += `<label class="field" style="margin-bottom: 8px;">
          <b>Организация</b>
          ${optionList('organizations', 'Выберите организацию', state.selectedOrg)}
        </label>`;
      } else {
        sessionHtml += `<p class="hint" style="margin: 8px 0;">Сначала получите список организаций</p>`;
      }
    }
    
    sessionHtml += `<button type="submit" style="width: 100%; margin-top: 8px;" ${state.isLoading ? 'disabled' : ''}>
      ${state.isLoading ? '⏳ Выполняется...' : '▶️ Выполнить запрос'}
    </button>
    <span class="shortcut-hint">Ctrl+Enter</span>
    </form>`;
  } else {
    if (state.action === 'auth') {
      const authData = state.authData[state.tab];
      sessionHtml += `<form id="apiLoginForm" autocomplete="off" style="margin-top: 10px;">
        ${field('baseUrl', 'Базовый URL', 'url', authData.baseUrl)}
        ${field('clientId', 'Client ID', 'text', authData.clientId)}
        ${field('clientSecret', 'Client Secret', 'text', authData.clientSecret)}
        <button type="submit" style="width: 100%; margin-top: 8px;" ${state.isLoading ? 'disabled' : ''}>
          ${state.isLoading ? '⏳ Выполняется...' : '▶️ Выполнить запрос'}
        </button>
        <span class="shortcut-hint">Ctrl+Enter</span>
      </form>`;
    } else {
      const restaurants = state.values[`${state.tab}Restaurants`] || [];
      sessionHtml += `<form id="apiLoginForm" autocomplete="off" style="margin-top: 10px;">
        ${restaurants.length > 0 ? `<label class="field" style="margin-bottom: 8px;">
          <b>Ресторан</b>
          <select name="${state.tab}Restaurants" style="width: 100%;">
            <option value="">Выберите ресторан</option>
            ${restaurants.map(x => `<option value="${esc(x.id)}" ${x.id === state.selectedRestaurant ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}
          </select>
        </label>` : `<p class="hint" style="margin: 8px 0;">Сначала получите список заведений</p>`}
        ${state.action === 'stopList' && state.tab === 'magnit' ? field('revision', 'Revision', 'number', '0') : ''}
        ${state.action === 'order' ? field('orderId', 'ID заказа', 'text') : ''}
        ${state.action === 'createOrder' ? `<label class="field" style="margin-bottom: 8px;">
          <b>Тело заказа (JSON)</b>
          <textarea name="requestBody" style="width: 100%; min-height: 200px;">{
  "originalOrderId": "uuid-заказа",
  "createdAt": "2025-10-21T16:58:30.7495617Z",
  "customer": { "name": "Имя", "phone": "+79990000000" },
  "expeditionType": "pickup",
  "payment": { "type": "online" },
  "personsQuantity": 1,
  "preOrder": false,
  "price": { "total": 150 },
  "products": [{ "id": "id-блюда", "name": "Блюдо", "price": 150, "quantity": 1 }],
  "pickup": { "expectedTime": "2025-10-21T16:58:30.7495617Z", "taker": "customer" }
}</textarea>
        </label>` : ''}
        <button type="submit" style="width: 100%; margin-top: 8px;" ${state.isLoading ? 'disabled' : ''}>
          ${state.isLoading ? '⏳ Выполняется...' : '▶️ Выполнить запрос'}
        </button>
        <span class="shortcut-hint">Ctrl+Enter</span>
      </form>`;
    }
  }
  
  sessionHtml += '</div>';
  $('#session').innerHTML = sessionHtml;
  
  $('#actions').innerHTML = actions[state.tab].map(([key, label]) => 
    `<button data-action="${key}" class="${key === state.action ? 'active' : ''}" title="${key}">${label}</button>`
  ).join('');
  
  $('#resultTitle').textContent = state.response ? title() : 'Готов к запросу';
  renderResult();
}

function collect(data, names) {
  const found = [], seen = new Set();
  const walk = value => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    const id = value.id || value.organizationId || value.externalMenuId || value.restaurantId;
    const name = value.name || value.organizationName || value.shortName || value.externalMenuName || value.title;
    if (id && name && names.some(n => Object.hasOwn(value, n)) && !seen.has(id)) { 
      seen.add(id); 
      found.push({ id, label: name }); 
    }
    Object.values(value).forEach(walk);
  };
  walk(data); 
  return found;
}

function saveChoices(data) {
  if (!data || typeof data !== 'object') return;
  if (state.tab === 'transport') {
    if (state.action === 'organizations') {
      state.values.organizations = collect(data, ['id','organizationId']);
      if (state.values.organizations.length > 0) {
        state.selectedOrg = state.values.organizations[0].id;
      }
    }
    if (state.action === 'terminalGroups') {
      const terminals = [];
      const map = {};
      (data.terminalGroups || []).forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          group.items.forEach(item => {
            terminals.push({ id: item.id, name: item.name });
            map[item.id] = item.name;
          });
        }
      });
      state.terminalGroupsList = terminals;
      state.terminalGroupsMap = map;
    }
    if (state.action === 'externalMenus') { 
      state.values.menus = (data.externalMenus || []).map(x => {
        const id = String(x.id);
        const cleanId = id.includes('#') ? id.split('#')[0] : id;
        return { id: cleanId, label: x.name || x.id };
      }); 
      state.values.priceCategories = (data.priceCategories || []).map(x => ({
        id: String(x.id), 
        label: x.name || x.id
      }));
      if (state.values.menus.length === 1) {
        state.selectedMenu = state.values.menus[0].id;
      }
      if (state.values.priceCategories.length === 1) {
        state.selectedPriceCategory = state.values.priceCategories[0].id;
      }
      render();
    }
  } else if (state.action === 'restaurants') {
    state.values[`${state.tab}Restaurants`] = collect(data, ['id','restaurantId']);
    if (state.values[`${state.tab}Restaurants`].length > 0) {
      state.selectedRestaurant = state.values[`${state.tab}Restaurants`][0].id;
    }
  }
}

function entriesFor(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const firstArray = Object.values(value).find(Array.isArray);
    return firstArray?.length ? firstArray : [value];
  }
  return [{ value }];
}

function hasProductModifiers(raw) {
  if (!raw || typeof raw !== 'object') return false;
  
  if (raw.itemSizes && Array.isArray(raw.itemSizes)) {
    for (const size of raw.itemSizes) {
      if (size.itemModifierGroups && Array.isArray(size.itemModifierGroups) && size.itemModifierGroups.length > 0) {
        return true;
      }
    }
  }
  
  if (raw.modifierGroups && raw.modifierGroups.length > 0) return true;
  if (raw.modifiers && raw.modifiers.length > 0) return true;
  if (raw.modifications && raw.modifications.length > 0) return true;
  
  return false;
}

function formatPrice(price) {
  if (price === null || price === undefined) return '—';
  if (typeof price === 'number') {
    return price.toFixed(2);
  }
  return String(price);
}

function cardHtml(rows) {
  if (!rows.length) return '<div class="empty">Ничего не найдено.</div>';
  return rows.map(row => {
    const raw = row.__raw;
    const display = Object.fromEntries(Object.entries(row).filter(([k]) => k !== '__raw'));
    const clickable = hasProductModifiers(raw);
    const rawId = raw && (raw.itemId || raw.id);
    return `<article class="card" style="cursor: ${clickable ? 'pointer' : 'default'};"
        ${clickable ? `onclick="openProductCard('${esc(rawId)}')" title="Кликните для просмотра модификаторов"` : ''}>
      <dl>${Object.entries(display).map(([k, v]) => {
        let displayValue = v;
        if (k === 'Цена' && v !== '—' && v !== 'null') {
          displayValue = formatPrice(parseFloat(v));
        }
        return `<dt>${esc(k)}</dt><dd>${esc(displayValue)}</dd>`;
      }).join('')}</dl>
      ${clickable ? `<div style="margin-top: 8px; color: var(--accent); font-size: 12px;">🔍 Нажмите для просмотра модификаторов</div>` : ''}
    </article>`;
  }).join('');
}

function renderProductCard(product) {
  if (!product) return '';
  
  let html = `<div style="background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin: 10px 0;">
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div style="flex: 1;">
        <h3 style="margin: 0 0 8px; color: var(--accent);">${esc(product.name || 'Без названия')}</h3>
        <div style="color: var(--muted); font-size: 13px;">
          <div><b>ID:</b> ${esc(product.itemId || product.id || '—')}</div>
          <div><b>Цена:</b> ${formatPrice(product.price ?? product.currentPrice ?? product.defaultPrice ?? null)}</div>
          ${product.code ? `<div><b>Код:</b> ${esc(product.code)}</div>` : ''}
          ${product.articleNumber ? `<div><b>Артикул:</b> ${esc(product.articleNumber)}</div>` : ''}
          ${product.sku ? `<div><b>Артикул:</b> ${esc(product.sku)}</div>` : ''}
          ${product.description ? `<div><b>Описание:</b> ${esc(product.description)}</div>` : ''}
        </div>
        ${product.images && product.images.length > 0 ? `<div style="margin-top: 8px;">
          <b style="color: var(--muted); font-size: 13px;">Фото:</b>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">
            ${product.images.map(img => `<img src="${esc(img.url || img)}" style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 1px solid var(--line);" loading="lazy" onerror="this.style.display='none'">`).join('')}
          </div>
        </div>` : ''}
        ${product.imageLinks && product.imageLinks.length > 0 ? `<div style="margin-top: 8px;">
          <b style="color: var(--muted); font-size: 13px;">Фото:</b>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">
            ${product.imageLinks.map(img => `<img src="${esc(img)}" style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 1px solid var(--line);" loading="lazy" onerror="this.style.display='none'">`).join('')}
          </div>
        </div>` : ''}
        ${product.buttonImageUrl ? `<div style="margin-top: 8px;">
          <b style="color: var(--muted); font-size: 13px;">Фото:</b>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">
            <img src="${esc(product.buttonImageUrl)}" style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 1px solid var(--line);" loading="lazy" onerror="this.style.display='none'">
          </div>
        </div>` : ''}
      </div>
      <button onclick="closeProductCard()" style="background: transparent; color: var(--text); border: 1px solid var(--line); padding: 4px 10px; cursor: pointer; font-size: 16px; flex-shrink: 0;">✕</button>
    </div>`;
  
  let modifierGroups = [];
  
  if (product.itemSizes && product.itemSizes.length > 0) {
    product.itemSizes.forEach(size => {
      if (size.itemModifierGroups && Array.isArray(size.itemModifierGroups)) {
        modifierGroups = modifierGroups.concat(size.itemModifierGroups);
      }
    });
  }
  
  if (product.modifierGroups && Array.isArray(product.modifierGroups)) {
    modifierGroups = modifierGroups.concat(product.modifierGroups);
  }
  
  if (modifierGroups.length > 0) {
    html += `<div style="margin-top: 10px;">
      <b style="color: var(--muted); font-size: 13px;">Группы модификаторов:</b>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 5px;">`;
    
    modifierGroups.forEach(group => {
      const modifiers = group.items || group.modifiers || [];
      html += `<div style="background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px;">
        <div style="font-weight: 600; color: var(--accent);">${esc(group.name || group.id || 'Группа')}</div>
        <div style="color: var(--muted); font-size: 12px;">
          ${group.restrictions?.minQuantity !== undefined ? `Мин: ${group.restrictions.minQuantity} ` : ''}
          ${group.restrictions?.maxQuantity !== undefined ? `Макс: ${group.restrictions.maxQuantity} ` : ''}
          ${group.minSelectedModifiers !== undefined ? `Мин: ${group.minSelectedModifiers} ` : ''}
          ${group.maxSelectedModifiers !== undefined ? `Макс: ${group.maxSelectedModifiers} ` : ''}
          ${group.required ? 'Обязательная' : 'Необязательная'}
        </div>`;
      
      if (modifiers.length > 0) {
        html += `<div style="margin-top: 4px; font-size: 12px; color: var(--text);">`;
        modifiers.forEach(mod => {
          let modPrice = null;
          if (mod.price !== undefined && mod.price !== null) {
            modPrice = mod.price;
          } else if (mod.amount !== undefined && mod.amount !== null) {
            modPrice = mod.amount;
          } else if (mod.prices && Array.isArray(mod.prices) && mod.prices.length > 0) {
            modPrice = mod.prices[0].price;
          }
          
          const modName = mod.name || mod.id || 'Модификатор';
          const priceDisplay = modPrice !== null && modPrice !== undefined ? formatPrice(modPrice) + '₽' : '—';
          
          html += `<div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>• ${esc(modName)}</span>
            <span style="color: var(--accent);">${priceDisplay}</span>
          </div>`;
        });
        html += `</div>`;
      }
      
      html += `</div>`;
    });
    
    html += `</div></div>`;
  }
  
  html += '</div>';
  return html;
}

function friendly(value) {
  if (state.selectedProduct) {
    return renderProductCard(state.selectedProduct);
  }
  
  const cards = entriesFor(value).map(item => {
    if (!item || typeof item !== 'object') 
      return `<article class="card"><dd>${esc(item)}</dd></article>`;
    const pairs = Object.entries(item).filter(([, v]) => v === null || ['string','number','boolean'].includes(typeof v));
    let heading = item.name || item.organizationName || item.shortName || item.title || item.id || 'Объект';
    if (item.name && item.id) {
      heading = `<strong>${esc(item.name)}</strong> (${esc(item.id)})`;
    }
    
    let hasModifiers = false;
    if (item.modifierGroups && item.modifierGroups.length > 0) hasModifiers = true;
    if (item.modifiers && item.modifiers.length > 0) hasModifiers = true;
    if (item.modifications && item.modifications.length > 0) hasModifiers = true;
    if (item.itemSizes && item.itemSizes.length > 0) {
      item.itemSizes.forEach(size => {
        if (size.itemModifierGroups && size.itemModifierGroups.length > 0) hasModifiers = true;
      });
    }
    
    const productId = item.id;
    
    return `<article class="card" style="cursor: ${hasModifiers ? 'pointer' : 'default'};" 
              ${hasModifiers ? `onclick="openProductCard('${esc(productId)}')"` : ''}
              ${hasModifiers ? `title="Кликните для просмотра модификаторов"` : ''}>
      <h3>${heading}</h3>
      <dl>${pairs.slice(0, 12).map(([k,v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${hasModifiers ? `<div style="margin-top: 8px; color: var(--accent); font-size: 12px;">🔍 Нажмите для просмотра модификаторов</div>` : ''}
    </article>`;
  }).join('');
  
  return cards ? `<div class="cards">${cards}</div>` : '<div class="empty">Пустой ответ.</div>';
}

window.openProductCard = function(productId) {
  const { data } = state.response || {};
  const d = data || state.response;
  
  if (!d) {
    console.warn('[openProductCard] No data available');
    return;
  }
  
  console.log('[openProductCard] Searching for product ID:', productId);
  
  let found = null;
  const search = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        search(item);
        if (found) return;
      }
      return;
    }
    
    const objId = obj.itemId || obj.id;
    if (objId && String(objId) === String(productId)) {
      console.log('[openProductCard] Found by ID match:', objId);
      found = obj;
      return;
    }
    
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        search(obj[key]);
        if (found) return;
      }
    }
  };
  
  search(d);
  
  if (found) {
    state.selectedProduct = found;
    renderResult();
  } else {
    console.log('[openProductCard] Not found for ID:', productId);
    alert('Модификаторы не найдены для этого блюда');
  }
};

window.closeProductCard = function() {
  state.selectedProduct = null;
  renderResult();
};

function renderError(error, details = null) {
  const el = $('#result');
  el.className = 'response';
  let html = `
    <div class="error-container">
      <h3>❌ Ошибка</h3>
      <pre>${esc(error.message || 'Неизвестная ошибка')}</pre>`;
  
  if (details) {
    html += `<details><summary>📋 Подробности</summary><pre style="color: var(--muted); font-size: 12px; white-space: pre-wrap;">${esc(details)}</pre></details>`;
  }
  
  if (error.stack) {
    html += `<details><summary>📋 Стек</summary><pre style="color: var(--muted); font-size: 12px; white-space: pre-wrap;">${esc(error.stack)}</pre></details>`;
  }
  
  html += `</div>`;
  el.innerHTML = html;
}

// Храним последние обработанные данные для поиска
let lastData = null;
let lastRows = [];
let lastJson = '';
let jsonSearchResults = [];
let currentResultIndex = -1;

function renderResult() {
  const el = $('#result');
  if (state.isLoading) {
    el.className = 'response';
    el.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span>Запрос выполняется...</span>
      </div>
    `;
    return;
  }
  
  if (!state.response) { 
    el.className = 'empty'; 
    el.textContent = 'Выбери метод слева, заполни поля и отправь запрос.'; 
    lastData = null;
    lastRows = [];
    lastJson = '';
    jsonSearchResults = [];
    currentResultIndex = -1;
    return; 
  }
  
  const { status, ok, data } = state.response;
  const d = data || state.response;
  const q = (state.query || '').toLowerCase();
  
  el.className = 'response';
  
  if (state.selectedProduct) {
    el.innerHTML = `<div style="margin-bottom: 10px;">
      <button onclick="closeProductCard()" style="background: transparent; color: var(--text); border: 1px solid var(--line); padding: 4px 12px; cursor: pointer;">← Назад к списку</button>
    </div>${renderProductCard(state.selectedProduct)}`;
    return;
  }
  
  if (typeof d === 'string' && d.includes('<!DOCTYPE html>')) {
    renderError(
      { message: 'Сервер вернул HTML-страницу ошибки (500 Internal Server Error)' },
      d.substring(0, 500) + '...'
    );
    return;
  }
  
  // Сохраняем данные для поиска
  if (d !== lastData) {
    lastData = d;
    lastRows = _rows(d);
    lastJson = JSON.stringify(d, null, 2);
    jsonSearchResults = [];
    currentResultIndex = -1;
  }
  
  const searchHtml = `<div style="margin: 15px 0; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
    <label class="field" style="margin: 0; flex: 1; min-width: 200px;">
      <span style="font-size: 12px; color: var(--muted);">🔍 Поиск в результатах</span>
      <input id="resultSearch" autocomplete="off" placeholder="Название, ID, артикул…" value="${esc(state.query)}" style="width: 100%;">
    </label>
    ${q ? `<span class="match-counter" style="font-size: 13px; color: var(--muted); white-space: nowrap;">Найдено: <span id="matchCount">0</span></span>` : ''}
    ${q ? `<span style="font-size: 13px; color: var(--muted); white-space: nowrap;">Результат: <span id="currentMatch">0/0</span></span>` : ''}
  </div>`;
  
  if (state.view === 'json') {
    // Сохраняем позиции всех совпадений
    jsonSearchResults = [];
    let jsonStr = lastJson;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let match;
      let lastIndex = 0;
      let parts = [];
      let matchIndex = 0;
      
      // Находим все совпадения и сохраняем их позиции
      const matches = [];
      let tempStr = lastJson;
      const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      while ((match = searchRegex.exec(lastJson)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[0]
        });
      }
      
      // Строим строку с подсветкой
      let highlighted = '';
      let pos = 0;
      matches.forEach((m, i) => {
        highlighted += esc(lastJson.substring(pos, m.index));
        highlighted += `<span class="json-match" data-match-index="${i}" style="background: #ffeb3b; color: #000; padding: 0 2px; border-radius: 2px; cursor: pointer;" onclick="scrollToMatch(${i})">${esc(m.text)}</span>`;
        pos = m.index + m.length;
      });
      highlighted += esc(lastJson.substring(pos));
      jsonStr = highlighted;
      jsonSearchResults = matches;
    }
    
    el.innerHTML = `<span class="status ${ok ? '' : 'bad'}">${status} ${ok ? '✅ УСПЕХ' : '❌ ОШИБКА'}</span>${searchHtml}<pre class="json" id="jsonContainer" style="white-space: pre-wrap; word-break: break-word;">${jsonStr}</pre>`;
    
    // Обновляем счетчики
    if (q) {
      document.getElementById('matchCount').textContent = jsonSearchResults.length;
      if (jsonSearchResults.length > 0) {
        currentResultIndex = 0;
        document.getElementById('currentMatch').textContent = `1/${jsonSearchResults.length}`;
        highlightCurrentMatch();
      } else {
        document.getElementById('currentMatch').textContent = `0/0`;
      }
    }
    return;
  }
  
  try {
    let rows = lastRows.filter(x => Object.entries(x).filter(([k]) => k !== '__raw').map(([, v]) => String(v)).join(' ').toLowerCase().includes(q));
    const cardHtmlStr = cardHtml(rows);
    el.innerHTML = `<span class="status ${ok ? '' : 'bad'}">${status} ${ok ? '✅ УСПЕХ' : '❌ ОШИБКА'}</span>${searchHtml}
      <div class="cards">${cardHtmlStr}</div>`;
  } catch (error) {
    renderError(error);
  }
}

// Функция для подсветки текущего совпадения
function highlightCurrentMatch() {
  const matches = document.querySelectorAll('.json-match');
  matches.forEach((el, i) => {
    if (i === currentResultIndex) {
      el.style.background = '#ff6b6b';
      el.style.color = '#fff';
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
      el.style.background = '#ffeb3b';
      el.style.color = '#000';
    }
  });
}

// Функция для перехода к совпадению
function scrollToMatch(index) {
  if (index >= 0 && index < jsonSearchResults.length) {
    currentResultIndex = index;
    highlightCurrentMatch();
    document.getElementById('currentMatch').textContent = `${currentResultIndex + 1}/${jsonSearchResults.length}`;
  }
}

// Навигация по результатам поиска
function navigateSearch(direction) {
  if (jsonSearchResults.length === 0) return;
  
  if (direction === 'next') {
    currentResultIndex = (currentResultIndex + 1) % jsonSearchResults.length;
  } else if (direction === 'prev') {
    currentResultIndex = (currentResultIndex - 1 + jsonSearchResults.length) % jsonSearchResults.length;
  }
  
  highlightCurrentMatch();
  document.getElementById('currentMatch').textContent = `${currentResultIndex + 1}/${jsonSearchResults.length}`;
}

function _rows(d) {
  let a = state.action, t = state.tab;
  
  if (t === 'transport' && a === 'organizations') 
    return (d.organizations || []).map(x => ({'Название': x.name, 'ID': x.id, 'Адрес ресторана': x.restaurantAddress || '—'}));
    
  if (t === 'transport' && a === 'terminalGroups') 
    return (d.terminalGroups || []).flatMap(x => (x.items || []).map(y => ({'Название': y.name, 'ID терминала': y.id})));
    
  if (t === 'transport' && a === 'terminalGroupsIsAlive') {
    const items = d.isAliveStatus || [];
    const map = state.terminalGroupsMap || {};
    return items.map(y => ({
      'ID': y.terminalGroupId,
      'Название': map[y.terminalGroupId] || y.terminalGroupId,
      'Жив': y.isAlive ? '✅ Да' : '❌ Нет'
    }));
  }
  
  if (t === 'transport' && a === 'discounts') 
    return (d.discounts || []).flatMap(x => (x.items || []).map(y => ({'ID': y.id, 'Название': y.name, 'Процент': y.percent ?? '—', 'Тип': y.mode || '—', 'Активна': y.isDeleted ? 'Нет' : 'Да', 'Выборочное применение': y.canBeAppliedSelectively ? 'Да' : 'Нет', 'Ручная скидка': y.isManual ? 'Да' : 'Нет'})));
    
  if (t === 'transport' && a === 'paymentTypes') {
    const items = d.paymentTypes || [];
    return items.map(y => ({'ID': y.id, 'Название': y.name, 'Код': y.code || '—', 'Тип': y.paymentTypeKind || '—', 'Активен': y.isDeleted ? 'Нет' : 'Да'}));
  }
  
  if (t === 'transport' && a === 'externalMenus') 
    return (d.externalMenus || []).map(x => ({'Название': x.name, 'ID внешнего меню': x.id}));
  
  if (t === 'transport' && a === 'externalMenu') {
    const products = [];
    
    if (d.itemCategories && Array.isArray(d.itemCategories)) {
      d.itemCategories.forEach(category => {
        if (category.items && Array.isArray(category.items)) {
          category.items.forEach(item => {
            if (item.itemSizes && Array.isArray(item.itemSizes) && item.itemSizes.length > 0) {
              item.itemSizes.forEach(size => {
                let price = null;
                if (size.prices && Array.isArray(size.prices) && size.prices.length > 0) {
                  price = size.prices[0].price;
                }
                
                products.push({
                  'Название блюда': item.name || 'Без названия',
                  'Размер': size.sizeName || size.sizeCode || 'Стандартный',
                  'Цена': price,
                  'ID': item.itemId || item.id || '—',
                  'Артикул': size.sku || item.sku || '—',
                  'Категория': category.name || '—',
                  '__raw': item
                });
              });
            } else {
              let price = null;
              if (item.prices && Array.isArray(item.prices) && item.prices.length > 0) {
                price = item.prices[0].price;
              }
              
              products.push({
                'Название блюда': item.name || 'Без названия',
                'Цена': price,
                'ID': item.itemId || item.id || '—',
                'Артикул': item.sku || '—',
                'Категория': category.name || '—',
                '__raw': item
              });
            }
          });
        }
      });
    }
    
    if (products.length === 0) {
      if (d.products && Array.isArray(d.products)) {
        d.products.forEach(item => {
          products.push({
            'Название блюда': item.name || 'Без названия',
            'Цена': item.price ?? null,
            'ID': item.id || '—',
            'Артикул': item.sku || item.articleNumber || '—',
            '__raw': item
          });
        });
      } else if (d.items && Array.isArray(d.items)) {
        d.items.forEach(item => {
          products.push({
            'Название блюда': item.name || 'Без названия',
            'Цена': item.price ?? null,
            'ID': item.id || '—',
            'Артикул': item.sku || item.articleNumber || '—',
            '__raw': item
          });
        });
      } else if (Array.isArray(d)) {
        d.forEach(item => {
          products.push({
            'Название блюда': item.name || 'Без названия',
            'Цена': item.price ?? null,
            'ID': item.id || '—',
            'Артикул': item.sku || item.articleNumber || '—',
            '__raw': item
          });
        });
      }
    }
    
    return products;
  }
  
  if (t === 'transport' && a === 'stopLists') {
    const allItems = [];
    const stopLists = d.terminalGroupStopLists || [];
    stopLists.forEach(group => {
      if (group.items && Array.isArray(group.items)) {
        group.items.forEach(item => {
          if (item.items && Array.isArray(item.items)) {
            item.items.forEach(stop => {
              allItems.push({
                'ID продукта': stop.productId,
                'Баланс': stop.balance,
                'Артикул': stop.sku || '—',
                'Дата добавления': stop.dateAdd || '—',
                'Тип': stop.type || 'Продукт'
              });
            });
          }
        });
      }
    });
    return allItems;
  }
  
  if (t === 'transport' && a === 'orderTypes') {
    const allItems = [];
    const orderTypes = d.orderTypes || [];
    orderTypes.forEach(group => {
      if (group.items && Array.isArray(group.items)) {
        group.items.forEach(item => {
          allItems.push({
            'ID': item.id,
            'Название': item.name,
            'Код': item.code || '—',
            'Тип': item.orderServiceType || '—',
            'Активен': item.isDeleted ? 'Нет' : 'Да',
            'По умолчанию': item.isDefault ? '✅ Да' : 'Нет'
          });
        });
      }
    });
    return allItems;
  }
  
  if (t === 'transport' && a === 'nomenclature') {
    const products = [];
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(walk);
        return;
      }
      if (obj.id && obj.name && (obj.price !== undefined || obj.prices !== undefined || obj.modifiers !== undefined || obj.type === 'Product')) {
        products.push(obj);
      }
      Object.values(obj).forEach(walk);
    };
    walk(d);
    return products.map(x => ({
      'Название': x.name,
      'Цена': x.price ?? null,
      'ID': x.id,
      'Модификаторы': (x.modifiers || []).map(m => m.name || m.id).join(', ') || '—',
      '__raw': x
    }));
  }
  
  let o = [];
  let w = v => { if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object') { o.push(v); Object.values(v).forEach(w) } };
  w(d);
  
  if (t === 'yandex' && a === 'composition') {
    const items = d.items || [];
    return items.map(x => ({
      'Название блюда': x.name || 'Без названия',
      'Цена': x.price ?? null,
      'ID': x.id || '—',
      'Категория': x.categoryId || '—',
      '__raw': x
    }));
  }
  
  if (t === 'yandex' && a === 'menu') {
    const items = d.items || [];
    return items.map(x => ({
      'Название блюда': x.name || 'Без названия',
      'Цена': x.price ?? null,
      'ID': x.id || '—',
      'Категория': x.categoryId || '—',
      '__raw': x
    }));
  }
  
  if (t === 'magnit' && a === 'menu') {
    const items = d.items || [];
    return items.map(x => ({
      'Название блюда': x.name || 'Без названия',
      'Цена': x.price ?? null,
      'ID': x.id || '—',
      'Категория': x.categoryId || '—',
      '__raw': x
    }));
  }
  
  let p = o.filter(x => x.id && x.name && (x.price !== undefined || x.prices || x.modifiers || x.modifications || x.type === 'Product'))
    .map(x => ({'Название блюда': x.name, 'Цена': x.price ?? null, 'Модификаторы': (x.modifiers || x.modifications || []).map(m => m.name || m.id).join(', ') || '—', 'ID': x.id, '__raw': x}));
    
  if ((t === 'transport' && a === 'externalMenu') || (t === 'magnit' && a === 'menu')) 
    return p;
    
  return entriesFor(d).filter(Boolean).map(x => typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(y => y[1] == null || ['string','number','boolean'].includes(typeof y[1]))) : {'Ответ': x});
}

async function post(url, data) {
  const response = await fetch(url, { 
    method: 'POST', 
    headers: { 'content-type': 'application/json' }, 
    body: JSON.stringify(data) 
  });
  return response.json();
}

function requestBody(action, form) {
  const org = form.get('organizations');
  
  if (action === 'organizations') return { organizationIds: [], returnAdditionalInfo: true, includeDisabled: true };
  
  if (['terminalGroups', 'paymentTypes', 'discounts', 'stopLists'].includes(action)) {
    return { organizationIds: [org] };
  }
  
  if (action === 'terminalGroupsIsAlive') {
    const terminalIds = form.getAll('terminalIds') || [];
    const ids = terminalIds.length > 0 ? terminalIds : state.terminalGroupsList.map(t => t.id);
    return { 
      organizationId: org,
      terminalGroupIds: ids 
    };
  }
  
  if (action === 'orderTypes') {
    return { organizationIds: [org] };
  }
  
  if (action === 'nomenclature') 
    return { organizationId: org, startRevision: Number(form.get('startRevision') || 0) };
  
  if (action === 'externalMenus') return {};
  
  if (action === 'externalMenu') {
    let externalMenuId = form.get('menus');
    
    if (externalMenuId && externalMenuId.includes('#')) {
      externalMenuId = externalMenuId.split('#')[0];
    }
    
    const body = {
      externalMenuId: externalMenuId,
      organizationIds: [org]
    };
    
    const priceCategories = state.values.priceCategories || [];
    if (priceCategories.length > 0) {
      const priceCategoryId = form.get('priceCategories') || priceCategories[0]?.id;
      if (priceCategoryId) {
        body.priceCategoryId = priceCategoryId;
      }
    }
    
    console.log('[REQUEST BODY] externalMenu:', body);
    return body;
  }
  
  if (action === 'createOrder') return JSON.parse(form.get('requestBody'));
  
  return undefined;
}

async function submit(form) {
  const f = new FormData(form), t = state.tab, a = state.action;
  state.response = null;
  state.selectedProduct = null;
  state.isLoading = true;
  lastData = null;
  lastRows = [];
  lastJson = '';
  jsonSearchResults = [];
  currentResultIndex = -1;
  render();
  
  try {
    let result;
    let apiLogin = f.get('apiLogin');
    apiLogin = (apiLogin && apiLogin.trim()) || state.apiLogin || '';

    if (apiLogin !== state.currentApiLogin) {
      console.log('[SUBMIT] API Login changed from:', state.currentApiLogin, 'to:', apiLogin, '- clearing token');
      state.tokens[t] = null;
      state.currentApiLogin = apiLogin;
    }
    state.apiLogin = apiLogin;
    
    if (t === 'transport') {
      if (!state.tokens[t] && apiLogin) {
        const authResult = await post('/api/auth/transport', { apiLogin });
        const token = authResult.data?.token || authResult.data?.access_token;
        if (authResult.ok && token) {
          state.tokens[t] = token;
          state.apiLogin = apiLogin;
          state.currentApiLogin = apiLogin;
        } else {
          state.response = authResult;
          state.isLoading = false;
          render();
          return;
        }
      }
      
      const values = Object.fromEntries(f);
      
      let requestBodyData;
      if (a === 'terminalGroupsIsAlive') {
        const selectedTerminals = f.getAll('terminalIds');
        const terminalIds = selectedTerminals.length > 0 ? selectedTerminals : state.terminalGroupsList.map(t => t.id);
        const orgId = f.get('organizations');
        requestBodyData = {
          organizationId: orgId,
          terminalGroupIds: terminalIds
        };
      } else {
        requestBodyData = requestBody(a, f);
      }
      
      const requestData = { 
        service: t, 
        action: a, 
        values: { 
          restaurantId: values[`${t}Restaurants`], 
          orderId: values.orderId, 
          revision: values.revision,
          terminalIds: values.terminalIds
        }, 
        token: state.tokens[t], 
        requestBody: requestBodyData
      };
      
      console.log('[REQUEST] Request data:', requestData);
      result = await post('/api/request', requestData);
      
      if (result.status === 401 && apiLogin) {
        const authResult = await post('/api/auth/transport', { apiLogin });
        const newToken = authResult.data?.token || authResult.data?.access_token;
        if (authResult.ok && newToken) {
          state.tokens[t] = newToken;
          requestData.token = newToken;
          result = await post('/api/request', requestData);
        }
      }
      
      if (result.ok) saveChoices(result.data);
      
    } else {
      if (a === 'auth') {
        const data = Object.fromEntries(f);
        state.authData[t] = { 
          clientId: data.clientId, 
          clientSecret: data.clientSecret, 
          baseUrl: data.baseUrl 
        };
        state.bases[t] = data.baseUrl;
        result = await post(`/api/auth/${t}`, data);
        const token = result.data?.token || result.data?.access_token || result.data?.accessToken;
        if (result.ok && token) {
          state.tokens[t] = token;
        }
        state.response = result;
        state.isLoading = false;
        render();
        return;
      }
      
      const values = Object.fromEntries(f);
      const baseUrl = state.bases[t] || state.authData[t]?.baseUrl;
      
      const requestData = { 
        service: t, 
        action: a, 
        values: { 
          restaurantId: values[`${t}Restaurants`], 
          orderId: values.orderId, 
          revision: values.revision 
        }, 
        token: state.tokens[t], 
        requestBody: requestBody(a, f),
        baseUrl: baseUrl
      };
      
      result = await post('/api/request', requestData);
      
      if (result.status === 401 && state.authData[t].clientId) {
        const authResult = await post(`/api/auth/${t}`, {
          baseUrl: state.authData[t].baseUrl,
          clientId: state.authData[t].clientId,
          clientSecret: state.authData[t].clientSecret
        });
        const newToken = authResult.data?.token || authResult.data?.access_token || authResult.data?.accessToken;
        if (authResult.ok && newToken) {
          state.tokens[t] = newToken;
          requestData.token = newToken;
          result = await post('/api/request', requestData);
        }
      }
      
      if (result.ok) saveChoices(result.data);
    }
    
    state.response = result; 
  } catch (error) { 
    state.response = { ok: false, status: '—', data: { error: error.message, stack: error.stack } }; 
  } finally {
    state.isLoading = false;
    render();
  }
}

function exportJson() {
  const data = state.response?.data || state.response;
  if (!data) {
    alert('Нет данных для выгрузки. Сначала выполните запрос.');
    return;
  }
  
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `iiko_${state.tab}_${state.action}_${timestamp}.json`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function saved() { 
  try {
    return JSON.parse(localStorage.getItem('iiko-api-logins') || '[]');
  } catch {
    return [];
  }
}

function renderLogins() {
  const logins = saved();
  const search = state.loginSearch.toLowerCase();
  const filtered = logins.filter(x => 
    (x.label || '').toLowerCase().includes(search) || 
    (x.login || '').toLowerCase().includes(search) ||
    (x.clientId || '').toLowerCase().includes(search)
  );
  
  const totalPages = Math.ceil(filtered.length / state.loginPerPage);
  const start = (state.loginPage - 1) * state.loginPerPage;
  const end = start + state.loginPerPage;
  const pageItems = filtered.slice(start, end);
  
  let paginationHtml = '';
  if (totalPages > 1) {
    paginationHtml = `<div style="display: flex; gap: 4px; justify-content: center; margin-top: 10px; flex-wrap: wrap;">
      <button data-login-page="prev" ${state.loginPage <= 1 ? 'disabled style="opacity:0.5"' : ''}>◀</button>`;
    for (let i = 1; i <= totalPages; i++) {
      paginationHtml += `<button data-login-page="${i}" style="${i === state.loginPage ? 'background: var(--accent); color: #0d2b1f;' : ''}">${i}</button>`;
    }
    paginationHtml += `<button data-login-page="next" ${state.loginPage >= totalPages ? 'disabled style="opacity:0.5"' : ''}>▶</button>
    </div>`;
  }
  
  $('#savedLogins').innerHTML = pageItems.map((x) => {
    const realIndex = logins.indexOf(x);
    const typeLabel = x.type === 'yandex' ? '🔑 Яндекс Еда' : x.type === 'magnit' ? '🛒 Магнит' : '🚀 Transport';
    return `<div class="login-row">
      <div class="login-info">
        <div class="login-title">${esc(x.label || 'Без названия')}</div>
        ${x.type === 'yandex' || x.type === 'magnit' ? 
          `<div class="login-details">Client ID: ${esc(x.clientId || '—')}</div>
           <div class="login-details">Client Secret: ${esc(x.clientSecret || '—')}</div>` :
          `<div class="login-details">${esc(x.login || '—')}</div>`
        }
        <div class="login-type">${typeLabel}</div>
      </div>
      <div class="login-actions">
        <button type="button" data-use="${realIndex}">Выбрать</button>
        <button type="button" class="remove" data-remove="${realIndex}">×</button>
      </div>
    </div>`;
  }).join('') || '<p class="hint">Сохранённых логинов пока нет.</p>';
  
  const container = document.getElementById('savedLogins');
  if (container) {
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'paginationContainer';
    paginationContainer.innerHTML = paginationHtml;
    const oldPagination = document.getElementById('paginationContainer');
    if (oldPagination) oldPagination.remove();
    container.after(paginationContainer);
  }
}

function renderLoginDialog() {
  const dialog = document.getElementById('loginsDialog');
  if (!dialog) return;
  
  const tabsHtml = `
    <div class="tabs" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 10px 0;">
      <button data-login-tab="transport" class="${state.loginTab === 'transport' ? 'active' : ''}">🚀 Transport</button>
      <button data-login-tab="yandex" class="${state.loginTab === 'yandex' ? 'active' : ''}">🔑 Яндекс / Магнит</button>
    </div>
  `;
  
  let formHtml = '';
  if (state.loginTab === 'transport') {
    formHtml = `
      <label>Название / Подпись
        <input id="loginLabel" placeholder="Название">
      </label>
      <label>API-логин
        <input id="loginValue" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
      </label>
      <button id="saveLogin" type="button">Добавить</button>
    `;
  } else {
    formHtml = `
      <label>Название
        <input id="loginLabel" placeholder="Название интеграции">
      </label>
      <label>Базовый URL
        <input id="loginBaseUrl" placeholder="https://api-ru.iiko.services/integrations/ya">
      </label>
      <label>Client ID
        <input id="loginClientId" placeholder="client_id">
      </label>
      <label>Client Secret
        <input id="loginClientSecret" placeholder="client_secret">
      </label>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button type="button" id="saveLoginYandex" style="flex: 1;">Сохранить для Яндекс</button>
        <button type="button" id="saveLoginMagnit" style="flex: 1;">Сохранить для Магнит</button>
      </div>
    `;
  }
  
  const content = dialog.querySelector('form');
  if (content) {
    const existing = content.querySelector('.dialog-body');
    if (existing) {
      existing.innerHTML = `
        ${tabsHtml}
        <div id="loginFormFields" style="margin-bottom: 10px;">
          ${formHtml}
        </div>
        <hr>
        <label class="field" style="margin-bottom: 10px;">
          <span style="font-size: 12px; color: var(--muted);">Поиск по логинам</span>
          <input id="loginSearch" autocomplete="off" placeholder="Название или логин…" style="width: 100%;" value="${esc(state.loginSearch)}">
        </label>
        <div id="savedLogins"></div>
      `;
    }
  }
  
  renderLogins();
}

function renderHelp() {
  const dialog = document.getElementById('helpDialog');
  if (!dialog) return;
  
  fetch('/README.md')
    .then(response => {
      if (!response.ok) throw new Error('Файл README.md не найден');
      return response.text();
    })
    .then(markdown => {
      let html = markdown;
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
      html = html.replace(/<li>.*<\/li>/gs, '<ul>$&</ul>');
      html = html.replace(/\n/g, '<br>');
      
      document.getElementById('helpContent').innerHTML = html;
    })
    .catch(error => {
      document.getElementById('helpContent').innerHTML = `
        <div style="color: var(--muted);">
          <p>❌ Не удалось загрузить документацию: ${error.message}</p>
          <p>Создайте файл <code>README.md</code> в корневой папке проекта.</p>
        </div>
      `;
    });
  
  dialog.showModal();
}

document.addEventListener('click', event => {
  const tab = event.target.dataset.tab;
  const action = event.target.dataset.action;
  const loginTab = event.target.dataset.loginTab;
  const loginPage = event.target.dataset.loginPage;
  
  if (loginPage) {
    if (loginPage === 'prev') {
      state.loginPage = Math.max(1, state.loginPage - 1);
    } else if (loginPage === 'next') {
      const logins = saved();
      const search = state.loginSearch.toLowerCase();
      const filtered = logins.filter(x => 
        (x.label || '').toLowerCase().includes(search) || 
        (x.login || '').toLowerCase().includes(search) ||
        (x.clientId || '').toLowerCase().includes(search)
      );
      const totalPages = Math.ceil(filtered.length / state.loginPerPage);
      state.loginPage = Math.min(totalPages, state.loginPage + 1);
    } else {
      state.loginPage = Number(loginPage);
    }
    renderLogins();
    return;
  }
  
  if (loginTab) {
    state.loginTab = loginTab;
    state.loginPage = 1;
    renderLoginDialog();
    return;
  }
  
  if (tab) { 
    state.tab = tab; 
    state.action = tab === 'transport' ? 'organizations' : 'auth';
    state.response = null; 
    state.selectedProduct = null;
    state.query = '';
    lastData = null;
    lastRows = [];
    lastJson = '';
    jsonSearchResults = [];
    currentResultIndex = -1;
    const input = document.getElementById('apiLoginInput');
    if (input && input.value) {
      state.apiLogin = input.value;
      state.currentApiLogin = input.value;
    }
    render(); 
  }
  
  if (action) { 
    state.action = action; 
    state.response = null; 
    state.selectedProduct = null;
    state.query = '';
    lastData = null;
    lastRows = [];
    lastJson = '';
    jsonSearchResults = [];
    currentResultIndex = -1;
    const input = document.getElementById('apiLoginInput');
    if (input && input.value) {
      state.apiLogin = input.value;
      state.currentApiLogin = input.value;
    }
    render(); 
  }
  
  if (event.target.dataset.view) { 
    state.view = event.target.dataset.view; 
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === state.view)); 
    renderResult(); 
  }
  
  if (event.target.id === 'exportJsonButton') {
    exportJson();
  }
  
  if (event.target.id === 'helpButton') {
    renderHelp();
  }
  
  if (event.target.id === 'loginsButton') { 
    state.loginPage = 1;
    renderLoginDialog(); 
    $('#loginsDialog').showModal(); 
  }
  
  if (event.target.id === 'saveLogin') { 
    const label = $('#loginLabel').value.trim();
    const login = $('#loginValue').value.trim();
    if (label && login) { 
      const logins = saved();
      logins.push({ label, login, type: 'transport' });
      localStorage.setItem('iiko-api-logins', JSON.stringify(logins)); 
      $('#loginLabel').value = ''; 
      $('#loginValue').value = ''; 
      state.loginPage = 1;
      renderLogins(); 
    }
  }
  
  if (event.target.id === 'saveLoginYandex' || event.target.id === 'saveLoginMagnit') {
    const label = $('#loginLabel').value.trim();
    const baseUrl = $('#loginBaseUrl').value.trim() || 'https://api-ru.iiko.services/integrations/ya';
    const clientId = $('#loginClientId').value.trim();
    const clientSecret = $('#loginClientSecret').value.trim();
    const type = event.target.id === 'saveLoginYandex' ? 'yandex' : 'magnit';
    
    if (label && clientId && clientSecret) { 
      const logins = saved();
      logins.push({ label, clientId, clientSecret, baseUrl, type });
      localStorage.setItem('iiko-api-logins', JSON.stringify(logins)); 
      $('#loginLabel').value = ''; 
      $('#loginBaseUrl').value = '';
      $('#loginClientId').value = '';
      $('#loginClientSecret').value = '';
      state.loginPage = 1;
      renderLogins(); 
    }
  }
  
  if (event.target.dataset.use !== undefined) { 
    const login = saved()[event.target.dataset.use];
    if (login.type === 'transport') {
      state.apiLogin = login.login;
      state.currentApiLogin = login.login;
      state.tab = 'transport';
      state.tokens.transport = null;
      state.query = '';
      lastData = null;
      lastRows = [];
      lastJson = '';
      jsonSearchResults = [];
      currentResultIndex = -1;
      const input = document.getElementById('apiLoginInput');
      if (input) input.value = login.login;
      render();
    } else if (login.type === 'yandex' || login.type === 'magnit') {
      const loginData = {
        clientId: login.clientId,
        clientSecret: login.clientSecret,
        baseUrl: login.baseUrl
      };
      
      state.authData[login.type] = loginData;
      state.bases[login.type] = login.baseUrl || 'https://api-ru.iiko.services/integrations/ya';
      
      state.tab = login.type;
      state.action = 'auth';
      state.tokens[login.type] = null;
      state.query = '';
      lastData = null;
      lastRows = [];
      lastJson = '';
      jsonSearchResults = [];
      currentResultIndex = -1;
      render();
    }
    $('#loginsDialog').close(); 
  }
  
  if (event.target.dataset.remove !== undefined) { 
    const list = saved(); 
    list.splice(Number(event.target.dataset.remove), 1); 
    localStorage.setItem('iiko-api-logins', JSON.stringify(list)); 
    state.loginPage = 1;
    renderLogins(); 
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'loginSearch') {
    state.loginSearch = e.target.value;
    state.loginPage = 1;
    renderLogins();
  }
  
  if (e.target.id === 'resultSearch') {
    state.query = e.target.value;
    const q = state.query.toLowerCase();
    const el = $('#result');
    
    if (state.view === 'json') {
      const pre = el.querySelector('pre.json');
      if (pre && lastJson) {
        // Находим все совпадения
        jsonSearchResults = [];
        const matches = [];
        if (q) {
          const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          let match;
          while ((match = searchRegex.exec(lastJson)) !== null) {
            matches.push({
              index: match.index,
              length: match[0].length,
              text: match[0]
            });
          }
        }
        
        // Строим строку с подсветкой
        let highlighted = '';
        let pos = 0;
        matches.forEach((m, i) => {
          highlighted += esc(lastJson.substring(pos, m.index));
          highlighted += `<span class="json-match" data-match-index="${i}" style="background: #ffeb3b; color: #000; padding: 0 2px; border-radius: 2px; cursor: pointer;" onclick="scrollToMatch(${i})">${esc(m.text)}</span>`;
          pos = m.index + m.length;
        });
        highlighted += esc(lastJson.substring(pos));
        pre.innerHTML = highlighted;
        jsonSearchResults = matches;
        
        // Обновляем счетчики
        const matchCountEl = document.getElementById('matchCount');
        const currentMatchEl = document.getElementById('currentMatch');
        if (matchCountEl) {
          matchCountEl.textContent = jsonSearchResults.length;
        }
        if (currentMatchEl) {
          if (jsonSearchResults.length > 0) {
            currentResultIndex = 0;
            currentMatchEl.textContent = `1/${jsonSearchResults.length}`;
            highlightCurrentMatch();
          } else {
            currentResultIndex = -1;
            currentMatchEl.textContent = `0/0`;
          }
        }
      }
      return;
    }
    
    const cardsContainer = el.querySelector('.cards');
    if (cardsContainer) {
      let rows = lastRows.filter(x => Object.entries(x).filter(([k]) => k !== '__raw').map(([, v]) => String(v)).join(' ').toLowerCase().includes(q));
      cardsContainer.innerHTML = cardHtml(rows);
    }
    return;
  }
  
  if (e.target.id === 'apiLoginInput') {
    const newLogin = e.target.value.trim();
    if (newLogin !== state.currentApiLogin && newLogin !== '') {
      console.log('[INPUT] API Login changed to:', newLogin, '- clearing token');
      state.tokens.transport = null;
      state.currentApiLogin = newLogin;
    }
    state.apiLogin = newLogin;
  }
});

// Обработка клавиш для навигации по результатам поиска в JSON
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'resultSearch') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      navigateSearch('next');
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateSearch('prev');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // При Enter переходим к следующему результату
      if (jsonSearchResults.length > 0) {
        navigateSearch('next');
      }
    }
  }
  
  if (e.ctrlKey && e.key === 'Enter') {
    const form = document.getElementById('apiLoginForm');
    if (form && !state.isLoading) {
      form.dispatchEvent(new Event('submit'));
    }
  }
  if (e.key === 'Escape') {
    const dialog = document.getElementById('loginsDialog');
    if (dialog.open) dialog.close();
    const helpDialog = document.getElementById('helpDialog');
    if (helpDialog.open) helpDialog.close();
  }
});

document.addEventListener('submit', event => {
  if (event.target.id === 'apiLoginForm') {
    event.preventDefault();
    if (!state.isLoading) {
      submit(event.target);
    }
  }
});

render();
console.log('[INIT] App initialized. State:', state);
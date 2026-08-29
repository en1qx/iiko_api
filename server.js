const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const fs = require('node:fs/promises');
const zlib = require('node:zlib');

const PORT = Number(process.env.PORT || 3000);
const IIKO_BASE = 'https://api-ru.iiko.services';
const IIKO_APP_ID = process.env.IIKO_APP_ID;
const IIKO_CLIENT_SECRET = process.env.IIKO_CLIENT_SECRET;

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

const routes = {
  transport: {
    organizations: { method: 'POST', path: '/api/1/organizations' },
    terminalGroups: { method: 'POST', path: '/api/1/terminal_groups' },
    terminalGroupsIsAlive: { method: 'POST', path: '/api/1/terminal_groups/is_alive' },
    paymentTypes: { method: 'POST', path: '/api/1/payment_types' },
    discounts: { method: 'POST', path: '/api/1/discounts' },
    nomenclature: { method: 'POST', path: '/api/1/nomenclature' },
    stopLists: { method: 'POST', path: '/api/1/stop_lists' },
    externalMenus: { method: 'POST', path: '/api/2/menu' },
    externalMenu: { method: 'POST', path: '/api/2/menu/by_id' },
    orderTypes: { method: 'POST', path: '/api/1/deliveries/order_types' },
  },
  yandex: {
    restaurants: { method: 'GET', path: '/restaurants' },
    composition: { method: 'GET', path: '/menu/{restaurantId}/composition' },
    availability: { method: 'GET', path: '/menu/{restaurantId}/availability' },
    promos: { method: 'GET', path: '/menu/{restaurantId}/promos' },
    order: { method: 'GET', path: '/order/{orderId}' },
  },
  magnit: {
    restaurants: { method: 'GET', path: '/restaurants' },
    menu: { method: 'GET', path: '/api/v1/Menus/{restaurantId}' },
    stopList: { method: 'GET', path: '/api/v1/StopLists/{restaurantId}' },
    order: { method: 'GET', path: '/order/{orderId}' },
    createOrder: { method: 'POST', path: '/api/v1/Orders/{restaurantId}' },
  },
};

function send(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders
  });
  res.end(JSON.stringify(data));
}

async function bodyOf(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.length > 1_000_000) throw new Error('Слишком большой запрос.');
  return text ? JSON.parse(text) : {};
}

function integrationBase(value, fallback, service) {
  // Для Яндекс и Магнит - пропускаем проверку домена
  if (service === 'yandex' || service === 'magnit') {
    return (value || fallback || 'https://api-ru.iiko.services/integrations/ya').replace(/\/$/, '');
  }
  
  const url = new URL(value || fallback);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.iikoweb.ru')) {
    throw new Error('Разрешены только HTTPS-адреса интеграций *.iikoweb.ru.');
  }
  return url.toString().replace(/\/$/, '');
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (!values[key]) throw new Error(`Не заполнено поле: ${key}`);
    return encodeURIComponent(values[key]);
  });
}

async function relay(url, { method, token, json, form, headers = {} }) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'User-Agent': 'PostmanRuntime/7.51.1',
        ...headers
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    let body = null;
    if (form) {
      options.headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    } else if (json !== undefined && method !== 'GET') {
      body = JSON.stringify(json);
    }
    
    console.log('\n========== RELAY REQUEST ==========');
    console.log('URL:', url);
    console.log('Headers:', JSON.stringify(options.headers, null, 2));
    console.log('Body:', body);
    console.log('====================================\n');
    
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentEncoding = res.headers['content-encoding'] || '';
        
        console.log(`[RELAY] Status: ${res.statusCode}`);
        console.log(`[RELAY] Content-Encoding: ${contentEncoding}`);
        console.log(`[RELAY] Raw size: ${buffer.length} bytes`);
        
        let data;
        try {
          if (contentEncoding.includes('gzip')) {
            console.log('[RELAY] Decompressing gzip...');
            data = zlib.gunzipSync(buffer).toString('utf8');
          } else if (contentEncoding.includes('deflate')) {
            console.log('[RELAY] Decompressing deflate...');
            data = zlib.inflateSync(buffer).toString('utf8');
          } else if (contentEncoding.includes('br')) {
            console.log('[RELAY] Decompressing brotli...');
            data = zlib.brotliDecompressSync(buffer).toString('utf8');
          } else {
            data = buffer.toString('utf8');
          }
          
          console.log(`[RELAY] Decompressed size: ${data.length} bytes`);
          console.log(`[RELAY] Response preview: ${data.substring(0, 200)}...`);
          console.log('========== RELAY RESPONSE ==========\n');
          
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = { raw: data, error: e.message };
          }
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
        } catch (e) {
          console.error('[RELAY] Decompression error:', e.message);
          console.log('========== RELAY RESPONSE ==========\n');
          resolve({ ok: false, status: res.statusCode, data: { error: e.message } });
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('[RELAY] Request error:', e.message);
      resolve({ ok: false, status: 500, data: { error: e.message } });
    });
    
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function api(req, res) {
  const payload = await bodyOf(req);
  
  console.log('\n========== API REQUEST ==========');
  console.log('URL:', req.url);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('================================\n');
  
  if (req.url === '/api/auth/transport') {
    if (!IIKO_APP_ID || !IIKO_CLIENT_SECRET) throw new Error('На сервере не настроены IIKO_APP_ID и IIKO_CLIENT_SECRET.');
    const result = await relay(`${IIKO_BASE}/api/v2/access_token`, {
      method: 'POST', json: { apiLogin: payload.apiLogin, appId: IIKO_APP_ID, clientSecret: IIKO_CLIENT_SECRET },
    });
    return send(res, result.status, result);
  }

  if (req.url === '/api/auth/yandex' || req.url === '/api/auth/magnit') {
    const service = req.url.endsWith('yandex') ? 'yandex' : 'magnit';
    const fallback = service === 'magnit' 
      ? 'https://pl-magnit.oi.iikoweb.ru/api/integrations/magnit' 
      : 'https://api-ru.iiko.services/integrations/ya';
    const base = integrationBase(payload.baseUrl, fallback, service);
    const form = service === 'yandex'
      ? { client_id: payload.clientId, client_secret: payload.clientSecret, grant_type: 'client_credentials', scope: 'read' }
      : { client_id: payload.clientId, client_secret: payload.clientSecret };
    const result = await relay(`${base}/security/oauth/token`, { method: 'POST', form });
    return send(res, result.status, result);
  }

  if (req.url !== '/api/request') return send(res, 404, { error: 'Not found' });
  const { service, action, values = {}, token, requestBody, baseUrl } = payload;
  const route = routes[service]?.[action];
  if (!route) throw new Error('Неизвестный метод.');
  
  const base = service === 'transport'
    ? IIKO_BASE
    : integrationBase(
        baseUrl, 
        service === 'magnit' ? 'https://pl-magnit.oi.iikoweb.ru/api/integrations/magnit' : 'https://api-ru.iiko.services/integrations/ya',
        service
      );
      
  const result = await relay(`${base}${fill(route.path, values)}`, {
    method: route.method,
    token,
    json: requestBody,
    headers: service === 'magnit' && action === 'stopList' ? { revision: String(values.revision || 0) } : {},
  });
  send(res, result.status, result);
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  try {
    if (req.method === 'POST' && req.url.startsWith('/api/')) return await api(req, res);
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const file = req.url === '/' ? 'index.html' : req.url.slice(1);
    const safe = path.normalize(file).replace(/^\.\.(\/|\\|$)/, '');
    const content = await fs.readFile(path.join(__dirname, 'public', safe));
    res.writeHead(200, {
      'content-type': types[path.extname(safe)] || 'application/octet-stream',
      ...corsHeaders
    });
    res.end(content);
  } catch (error) {
    send(res, 400, { ok: false, error: error.message || 'Ошибка запроса.' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`iiko-api-panel is listening on ${PORT}`));
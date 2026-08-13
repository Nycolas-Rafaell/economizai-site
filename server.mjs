import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const offersPath = path.join(siteDirectory, 'data', 'ofertas.json');
const tokenPath = path.join(siteDirectory, '.ml_tokens.json');
const config = { ...loadEnv(path.join(siteDirectory, '.env')), ...process.env };
const port = Number(config.PORT || 3000);
let oauthAttempt;

const initialOffers = [
  { id: 'oferta-redragon', marketplace: 'mercado_livre', category: 'perifericos', title: 'Headset sem fio Redragon H510-PRO preto com luz LED', image: 'redragon-h510-pro.png', currentPrice: 333.68, originalPrice: 489.66, discountPct: 31, currency: 'BRL', freeShipping: false, publicUrl: 'https://www.mercadolivre.com.br/', affiliateUrl: 'https://meli.la/2FwH9gX', description: 'Headset gamer sem fio com iluminação LED, microfone e conexão pensada para jogos e chamadas. É uma opção para quem busca mobilidade, conforto e som imersivo nas partidas.', reviewSummary: 'As avaliações destacam a boa qualidade de som e o conforto do ajuste. A conexão sem fio e a autonomia também são citadas como pontos positivos para jogos competitivos.', rating: '4,9', reviewCount: '10.387', commentCount: '4.987', available: true },
  { id: 'oferta-lencos', marketplace: 'mercado_livre', category: 'outros', title: 'Kit com 3 Lenços Umedecidos Personalidade Baby, 100 unidades cada', image: 'lencos-personalidade-baby.png', currentPrice: 23.17, originalPrice: 26.52, discountPct: 12, currency: 'BRL', freeShipping: false, publicUrl: 'https://www.mercadolivre.com.br/', affiliateUrl: 'https://meli.la/2KGTwzC', description: 'Kit com três pacotes de lenços umedecidos Personalidade Baby, com 100 unidades cada, totalizando 300 toalhas. Possui tampa puxa-fácil, ajuda a manter a pele limpa, macia e fresca e pode ser usado por toda a família.', reviewSummary: 'O kit é muito recomendado por sua qualidade e custo-benefício. Usuários elogiam a textura macia, a fragrância agradável e a versatilidade para crianças e adultos.', rating: '4,8', reviewCount: '8', commentCount: '109', available: true },
  { id: 'oferta-microfone', marketplace: 'mercado_livre', category: 'perifericos', title: 'Microfone Gamer Profissional Condensador para PC com LED RGB', image: 'microfone-gamer-rgb.png', currentPrice: 99.50, originalPrice: 199, discountPct: 50, currency: 'BRL', freeShipping: false, publicUrl: 'https://www.mercadolivre.com.br/', affiliateUrl: 'https://meli.la/1v2nGj5', description: 'Microfone USB com captação cardioide, iluminação RGB e conexão Plug & Play. É compatível com PC, Mac e USB-C, inclui base reforçada e suporte antivibração para reduzir ruídos de teclado e mouse.', reviewSummary: 'As opiniões elogiam a qualidade de áudio e a captação clara, especialmente para lives, reuniões e jogos. O produto também é considerado um bom custo-benefício.', rating: '4,7', reviewCount: '98', commentCount: '157', available: true },
  { id: 'oferta-headset-usb', marketplace: 'mercado_livre', category: 'perifericos', title: 'Headset Gamer 7.1 USB com Microfone', image: null, currentPrice: 142.90, originalPrice: 219, discountPct: 35, currency: 'BRL', freeShipping: false, publicUrl: 'https://www.mercadolivre.com.br/', affiliateUrl: 'https://www.mercadolivre.com.br/', available: true },
  { id: 'oferta-teclado', marketplace: 'shopee', category: 'perifericos', title: 'Teclado Mecânico RGB Switch Red ABNT2', image: null, currentPrice: 179.90, originalPrice: 349.90, discountPct: 49, currency: 'BRL', freeShipping: false, publicUrl: 'https://shopee.com.br/', affiliateUrl: 'https://shopee.com.br/', available: true },
  { id: 'oferta-ssd', marketplace: 'mercado_livre', category: 'hardware', title: 'SSD NVMe 1TB Leitura 5000MB/s', image: null, currentPrice: 219.90, originalPrice: 599, discountPct: 63, currency: 'BRL', freeShipping: false, publicUrl: 'https://www.mercadolivre.com.br/', affiliateUrl: 'https://www.mercadolivre.com.br/', available: true },
  { id: 'oferta-suporte', marketplace: 'shopee', category: 'perifericos', title: 'Suporte de Mesa para Headset', image: null, currentPrice: 34.90, originalPrice: 45, discountPct: 22, currency: 'BRL', freeShipping: false, publicUrl: 'https://shopee.com.br/', affiliateUrl: 'https://shopee.com.br/', available: true },
  { id: 'oferta-cadeira', marketplace: 'mercado_livre', category: 'games', title: 'Cadeira Gamer Reclinável até 130kg', image: null, currentPrice: 579, originalPrice: 899, discountPct: 36, currency: 'BRL', freeShipping: false, publicUrl: 'https://www.mercadolivre.com.br/', affiliateUrl: 'https://www.mercadolivre.com.br/', available: true },
].map((offer) => ({ ...offer, createdAt: '2026-08-12T00:00:00.000Z', updatedAt: '2026-08-12T00:00:00.000Z' }));

class MercadoLivreError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]));
}

function send(response, status, body, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  response.end(body);
}

function sendJson(response, status, body) {
  send(response, status, JSON.stringify(body, null, 2));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function base64Url(value) {
  return value.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function oauthConfigured() {
  return Boolean(config.ML_CLIENT_ID && config.ML_CLIENT_SECRET && config.ML_REDIRECT_URI
    && !config.ML_CLIENT_ID.includes('COLE_AQUI') && !config.ML_CLIENT_SECRET.includes('COLE_AQUI')
    && config.ML_REDIRECT_URI.startsWith('https://'));
}

function readOffers() {
  try { return JSON.parse(fs.readFileSync(offersPath, 'utf8')); } catch { return []; }
}

function writeOffers(offers) {
  fs.writeFileSync(offersPath, JSON.stringify(offers, null, 2), 'utf8');
}

function getAllOffers() {
  const allOffers = new Map(initialOffers.map((offer) => [offer.id, offer]));
  readOffers().forEach((offer) => allOffers.set(offer.id, offer));
  return [...allOffers.values()];
}

function loadTokens() {
  try { return fs.existsSync(tokenPath) ? JSON.parse(fs.readFileSync(tokenPath, 'utf8')) : null; } catch { return null; }
}

function saveTokens(tokens) {
  fs.writeFileSync(tokenPath, JSON.stringify({
    user_id: tokens.user_id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    saved_at: new Date().toISOString(),
  }, null, 2), 'utf8');
}

async function refreshAccessToken(tokens) {
  if (!tokens?.refresh_token || !config.ML_CLIENT_ID || !config.ML_CLIENT_SECRET) {
    throw new MercadoLivreError('A conexão local com o Mercado Livre expirou. Será preciso autorizar a conta novamente.', 401);
  }
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: config.ML_CLIENT_ID, client_secret: config.ML_CLIENT_SECRET, refresh_token: tokens.refresh_token }),
  });
  const updatedTokens = await response.json();
  if (!response.ok) throw new MercadoLivreError(updatedTokens.message || updatedTokens.error_description || 'Não foi possível renovar a conexão com o Mercado Livre.', 401);
  saveTokens(updatedTokens);
  return updatedTokens.access_token;
}

async function getMercadoLivreItem(itemId) {
  let accessToken = loadTokens()?.access_token;
  if (!accessToken) throw new MercadoLivreError('A conta do Mercado Livre ainda não está conectada neste computador.', 401);
  let response = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  let item = await response.json();
  if (response.status === 401 || item.error === 'invalid_token') {
    accessToken = await refreshAccessToken(loadTokens());
    response = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    item = await response.json();
  }
  if (response.status === 403) {
    throw new MercadoLivreError('O Mercado Livre não autorizou este aplicativo a consultar os dados deste anúncio. Com a permissão atual, não é possível criar automaticamente cards de anúncios de outros vendedores.', 403);
  }
  if (response.status === 404) throw new MercadoLivreError('Esse código MLB parece ser de uma página de catálogo, não de um anúncio individual. Use a URL completa do anúncio com o trecho wid=MLB... ou use o modo manual.', 404);
  if (!response.ok) throw new MercadoLivreError(item.message || item.error || 'Não foi possível consultar este item no Mercado Livre.', response.status);
  return item;
}

async function getMercadoLivreProfile() {
  let accessToken = loadTokens()?.access_token;
  if (!accessToken) throw new MercadoLivreError('Nenhum token local foi encontrado.', 401);
  let response = await fetch('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  let profile = await response.json();
  if (response.status === 401 || profile.error === 'invalid_token') {
    accessToken = await refreshAccessToken(loadTokens());
    response = await fetch('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    profile = await response.json();
  }
  if (!response.ok) throw new MercadoLivreError(profile.message || profile.error || 'Não foi possível validar o token.', response.status);
  return profile;
}

function extractItemId(publicUrl) {
  const rawUrl = String(publicUrl);
  try {
    const parsed = new URL(rawUrl);
    // Em páginas de catálogo, o anúncio real pode vir no parâmetro wid=MLB... dentro da URL.
    const winnerItemId = `${parsed.search}${parsed.hash}`.toUpperCase().match(/[?&#]WID=(MLB\d{6,})/);
    if (winnerItemId?.[1]) return winnerItemId[1];
  } catch { /* a validação do link acontece em seguida */ }
  const match = rawUrl.toUpperCase().match(/MLB\d{6,}/);
  return match?.[0] ?? null;
}

function isMercadoLivreUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'meli.la' || hostname.endsWith('.mercadolivre.com.br') || hostname === 'mercadolivre.com.br';
  } catch { return false; }
}

function normalizeOffer(item, publicUrl, affiliateUrl, category) {
  const currentPrice = Number(item.price);
  const originalPrice = Number.isFinite(Number(item.original_price)) ? Number(item.original_price) : null;
  const discountPct = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  return {
    id: item.id,
    marketplace: 'mercado_livre',
    category,
    title: item.title,
    image: item.secure_thumbnail || item.thumbnail || null,
    currentPrice,
    originalPrice,
    discountPct,
    currency: item.currency_id || 'BRL',
    freeShipping: Boolean(item.shipping?.free_shipping),
    publicUrl,
    affiliateUrl,
    available: item.status === 'active' && item.available_quantity !== 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isValidUrl(value) {
  try { new URL(value); return true; } catch { return false; }
}

function normalizeManualOffer(data) {
  const currentPrice = Number(String(data.currentPrice).replace(',', '.'));
  const originalPrice = data.originalPrice === '' || data.originalPrice == null
    ? null : Number(String(data.originalPrice).replace(',', '.'));
  if (!data.title?.trim()) throw new MercadoLivreError('Informe o título do produto.', 400);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) throw new MercadoLivreError('Informe um preço atual válido.', 400);
  if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice <= 0)) throw new MercadoLivreError('Informe um preço antigo válido ou deixe-o em branco.', 400);
  if (!isValidUrl(data.publicUrl) || !isValidUrl(data.affiliateUrl)) throw new MercadoLivreError('Informe links públicos válidos para o produto e para o afiliado.', 400);
  if (data.image && !isValidUrl(data.image)) throw new MercadoLivreError('A imagem precisa ser um link válido ou ficar em branco.', 400);
  const discountPct = originalPrice && originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    marketplace: data.marketplace === 'shopee' ? 'shopee' : 'mercado_livre',
    category: String(data.category || 'outros').toLowerCase(),
    title: data.title.trim(), image: data.image?.trim() || null,
    currentPrice, originalPrice, discountPct, currency: 'BRL',
    freeShipping: Boolean(data.freeShipping), publicUrl: data.publicUrl.trim(),
    affiliateUrl: data.affiliateUrl.trim(),
    description: String(data.description || '').trim(),
    reviewSummary: String(data.reviewSummary || '').trim(),
    rating: String(data.rating || '').trim(),
    reviewCount: String(data.reviewCount || '').trim(),
    commentCount: String(data.commentCount || '').trim(),
    available: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

function saveOffer(offer) {
  const savedOffers = readOffers();
  const existingOffer = getAllOffers().find((savedOffer) => savedOffer.publicUrl === offer.publicUrl);
  const previousHistory = Array.isArray(existingOffer?.priceHistory) ? existingOffer.priceHistory : [];
  const lastPrice = previousHistory.at(-1)?.price;
  const priceHistory = lastPrice === offer.currentPrice
    ? previousHistory
    : [...previousHistory, { price: offer.currentPrice, at: new Date().toISOString() }].slice(-24);
  const finalOffer = { ...(existingOffer ? { ...offer, id: existingOffer.id, createdAt: existingOffer.createdAt } : offer), priceHistory };
  const savedIndex = savedOffers.findIndex((savedOffer) => savedOffer.id === finalOffer.id);
  if (savedIndex >= 0) savedOffers[savedIndex] = finalOffer;
  else savedOffers.unshift(finalOffer);
  writeOffers(savedOffers);
  return finalOffer;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (part) => {
      body += part;
      if (body.length > 20_000) request.destroy();
    });
    request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Dados inválidos.')); } });
    request.on('error', reject);
  });
}

function contentType(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function sendStatic(response, pathname) {
  const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const file = path.resolve(siteDirectory, `.${requested}`);
  if (!file.startsWith(siteDirectory + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  send(response, 200, fs.readFileSync(file), contentType(file));
  return true;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/ofertas') return sendJson(response, 200, getAllOffers().filter((offer) => offer.available));

    const publicOfferMatch = url.pathname.match(/^\/api\/ofertas\/([^/]+)$/);
    if (request.method === 'GET' && publicOfferMatch) {
      const offer = getAllOffers().find((savedOffer) => savedOffer.id === decodeURIComponent(publicOfferMatch[1]));
      if (!offer) return sendJson(response, 404, { message: 'Oferta não encontrada.' });
      return sendJson(response, 200, offer);
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/ofertas') return sendJson(response, 200, getAllOffers());

    if (request.method === 'GET' && url.pathname === '/api/admin/connect') {
      if (!oauthConfigured()) return sendJson(response, 400, { message: 'Configure ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REDIRECT_URI (HTTPS) no arquivo .env antes de autorizar.' });
      const state = base64Url(crypto.randomBytes(24));
      const verifier = base64Url(crypto.randomBytes(48));
      const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
      oauthAttempt = { state, verifier, createdAt: Date.now() };
      const authorizationUrl = new URL('https://auth.mercadolivre.com.br/authorization');
      authorizationUrl.search = new URLSearchParams({ response_type: 'code', client_id: config.ML_CLIENT_ID, redirect_uri: config.ML_REDIRECT_URI, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
      response.writeHead(302, { Location: authorizationUrl.toString() });
      return response.end();
    }

    if (request.method === 'GET' && url.pathname === '/api/ml/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !oauthAttempt || state !== oauthAttempt.state || Date.now() - oauthAttempt.createdAt > 10 * 60 * 1000) return send(response, 400, '<h1>Autorização inválida ou expirada.</h1><p>Volte ao painel e tente novamente.</p>', 'text/html; charset=utf-8');
      const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: config.ML_CLIENT_ID, client_secret: config.ML_CLIENT_SECRET, code, redirect_uri: config.ML_REDIRECT_URI, code_verifier: oauthAttempt.verifier }),
      });
      const tokens = await tokenResponse.json();
      oauthAttempt = undefined;
      if (!tokenResponse.ok) throw new MercadoLivreError(tokens.message || tokens.error_description || 'Não foi possível trocar o código por um token.', tokenResponse.status);
      saveTokens(tokens);
      return send(response, 200, `<!doctype html><meta charset="utf-8"><title>Conexão concluída</title><style>body{margin:0;background:#0b0b0c;color:#eee;font:16px system-ui;padding:48px}h1{color:#ffc42d}a{color:#ffc42d}</style><h1>Nova autorização concluída</h1><p>O token foi salvo somente neste computador. Você já pode voltar ao <a href="/admin.html">painel</a> e testar a adição automática.</p>`, 'text/html; charset=utf-8');
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/status') {
      const profile = await getMercadoLivreProfile();
      const tokens = loadTokens();
      return sendJson(response, 200, {
        conectado: true,
        conta: profile.nickname || String(profile.id),
        salvoEm: tokens?.saved_at || null,
        redirectConfigurado: oauthConfigured(),
        aviso: 'Token válido. Para aplicar permissões alteradas no DevCenter, faça uma nova autorização OAuth antes de testar novamente.',
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/ofertas') {
      const { publicUrl, affiliateUrl, category } = await readBody(request);
      if (!isMercadoLivreUrl(publicUrl)) return sendJson(response, 400, { message: 'Use o link público do Mercado Livre.' });
      if (!isMercadoLivreUrl(affiliateUrl)) return sendJson(response, 400, { message: 'Use o seu link de afiliado do Mercado Livre.' });
      const itemId = extractItemId(publicUrl);
      if (!itemId) return sendJson(response, 400, { message: 'Não encontrei o código MLB no link. Copie a URL completa do anúncio, incluindo o código MLB.' });
      const item = await getMercadoLivreItem(itemId);
      if (!Number.isFinite(Number(item.price))) return sendJson(response, 422, { message: 'O item não possui um preço válido para criar o card.' });
      const offer = normalizeOffer(item, publicUrl, affiliateUrl, String(category || 'outros').toLowerCase());
      return sendJson(response, 201, saveOffer(offer));
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/ofertas/manual') {
      const offer = normalizeManualOffer(await readBody(request));
      return sendJson(response, 201, saveOffer(offer));
    }

    const editMatch = url.pathname.match(/^\/api\/admin\/ofertas\/([^/]+)$/);
    if (request.method === 'PUT' && editMatch) {
      const offerId = decodeURIComponent(editMatch[1]);
      const allOffers = getAllOffers();
      const existingOffer = allOffers.find((offer) => offer.id === offerId);
      if (!existingOffer) return sendJson(response, 404, { message: 'Card não encontrado.' });
      const editedOffer = normalizeManualOffer(await readBody(request));
      const previousHistory = Array.isArray(existingOffer.priceHistory) ? existingOffer.priceHistory : [];
      const lastPrice = previousHistory.at(-1)?.price;
      const priceHistory = lastPrice === editedOffer.currentPrice
        ? previousHistory
        : [...previousHistory, { price: editedOffer.currentPrice, at: new Date().toISOString() }].slice(-24);
      const finalOffer = { ...editedOffer, id: existingOffer.id, createdAt: existingOffer.createdAt, updatedAt: new Date().toISOString(), priceHistory };
      const savedOffers = readOffers();
      const savedIndex = savedOffers.findIndex((offer) => offer.id === offerId);
      if (savedIndex >= 0) savedOffers[savedIndex] = finalOffer;
      else savedOffers.unshift(finalOffer);
      writeOffers(savedOffers);
      return sendJson(response, 200, finalOffer);
    }

    if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { message: 'Rota não encontrada.' });
    if (sendStatic(response, url.pathname)) return;
    return send(response, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  } catch (error) {
    console.error(error);
    return sendJson(response, error.status || 500, { message: error.message || 'Erro interno.' });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Economizaí local: http://localhost:${port}`));

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSupabaseOfferStore } from './supabase-store.mjs';

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const offersPath = path.join(siteDirectory, 'data', 'ofertas.json');
const tokenPath = path.join(siteDirectory, '.ml_tokens.json');
const config = { ...loadEnv(path.join(siteDirectory, '.env')), ...process.env };
const supabaseStore = createSupabaseOfferStore(config);
const port = Number(config.PORT || 3000);
const adminEmail = String(config.ADMIN_EMAIL || '').trim().toLowerCase();
let oauthAttempt;
let avatarBucketReady;

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

function send(response, status, body, contentType = 'application/json; charset=utf-8', headers = {}) {
  response.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store', ...headers });
  response.end(body);
}

function sendJson(response, status, body, headers = {}) {
  send(response, status, JSON.stringify(body, null, 2), 'application/json; charset=utf-8', headers);
}

function getCookie(request, name) {
  const entry = String(request.headers.cookie || '').split(';').map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice(name.length + 1)); } catch { return null; }
}

function getSessionToken(request) {
  const bearer = String(request.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || getCookie(request, 'economizai_admin_session');
}

async function requireUser(request) {
  if (!supabaseStore.enabled) return { ok: false, status: 503, message: 'O Supabase ainda não está configurado neste servidor.' };
  const token = getSessionToken(request);
  if (!token) return { ok: false, status: 401, message: 'Faça login para acessar o painel administrativo.' };
  const userResponse = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: config.SUPABASE_SECRET_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const user = await userResponse.json().catch(() => null);
  if (!userResponse.ok || !user?.email) return { ok: false, status: 401, message: 'Sua sessão expirou. Entre novamente.' };
  return {
    ok: true, token,
    user: {
      id: user.id,
      email: user.email,
      name: String(user.user_metadata?.full_name || '').trim(),
      displayName: String(user.user_metadata?.display_name || '').trim(),
      avatarId: /^avatar-[1-6]$/.test(String(user.user_metadata?.avatar_id || '')) ? user.user_metadata.avatar_id : 'avatar-1',
      avatarUrl: String(user.user_metadata?.avatar_url || '').trim(),
    },
  };
}

async function requireAdmin(request) {
  const authentication = await requireUser(request);
  if (!authentication.ok) return authentication;
  if (!adminEmail) return { ok: false, status: 503, message: 'Defina ADMIN_EMAIL no arquivo .env para concluir a proteção do painel.' };
  const { user } = authentication;
  if (String(user.email).toLowerCase() !== adminEmail) return { ok: false, status: 403, message: 'Esta conta não possui acesso administrativo.' };
  return { ...authentication, isAdmin: true };
}

async function loginUser(email, password) {
  if (!supabaseStore.enabled) throw Object.assign(new Error('Configure o Supabase antes de entrar.'), { status: 503 });
  const authResponse = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: config.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: String(email).trim(), password: String(password) }),
  });
  const session = await authResponse.json().catch(() => null);
  if (!authResponse.ok || !session?.access_token) {
    const authMessage = String(session?.msg || session?.message || session?.error_description || session?.error || '');
    if (/email not confirmed|email_not_confirmed/i.test(authMessage)) {
      throw Object.assign(new Error('Seu e-mail ainda não foi confirmado. Abra a mensagem enviada pelo Supabase, confirme a conta e tente entrar novamente.'), { status: 403, code: 'email_not_confirmed' });
    }
    throw Object.assign(new Error('E-mail ou senha inválidos.'), { status: 401 });
  }
  return session;
}

async function signupUser(name, email, password) {
  if (!supabaseStore.enabled) throw Object.assign(new Error('Configure o Supabase antes de criar uma conta.'), { status: 503 });
  const authResponse = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: config.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: String(email).trim(), password: String(password), data: { full_name: String(name || '').trim().slice(0, 80), display_name: String(name || '').trim().slice(0, 80), avatar_id: 'avatar-1' } }),
  });
  const payload = await authResponse.json().catch(() => null);
  if (!authResponse.ok || !payload?.user) throw Object.assign(new Error(payload?.msg || payload?.message || 'Não foi possível criar a conta.'), { status: authResponse.status || 400 });
  return payload;
}

function validPassword(password) {
  const value = String(password || '');
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

async function ensureAvatarBucket() {
  if (avatarBucketReady) return avatarBucketReady;
  avatarBucketReady = (async () => {
    const storageBase = `${String(config.SUPABASE_URL).replace(/\/$/, '')}/storage/v1/bucket`;
    const headers = { apikey: config.SUPABASE_SECRET_KEY, Authorization: `Bearer ${config.SUPABASE_SECRET_KEY}`, Accept: 'application/json' };
    const current = await fetch(`${storageBase}/avatars`, { headers });
    if (current.ok) return;
    const currentBody = await current.text();
    // Algumas versões do Storage usam HTTP 400 para informar que o bucket não existe.
    const missingBucket = current.status === 404 || /bucket.*(not found|does not exist)|not found.*bucket/i.test(currentBody);
    if (missingBucket) {
      const created = await fetch(storageBase, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'avatars', name: 'avatars', public: true, file_size_limit: 2_000_000, allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp'] }) });
      const createdBody = created.ok ? '' : await created.text();
      if (!created.ok && created.status !== 409 && !/already exists|duplicate/i.test(createdBody)) throw new Error(`Não foi possível criar o espaço de fotos de perfil (Storage ${created.status}).`);
      return;
    }
    if (current.status !== 404) throw new Error('Não foi possível preparar o espaço de fotos de perfil.');
    const created = await fetch(storageBase, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'avatars', name: 'avatars', public: true, file_size_limit: 2_000_000, allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp'] }) });
    if (!created.ok && created.status !== 409) throw new Error('Não foi possível criar o espaço de fotos de perfil.');
  })().catch((error) => { avatarBucketReady = null; throw error; });
  return avatarBucketReady;
}

async function supabaseRest(pathname, options = {}) {
  const response = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/rest/v1/${pathname}`, {
    method: options.method || 'GET',
    headers: {
      apikey: config.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${config.SUPABASE_SECRET_KEY}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload?.message || payload?.hint || payload?.details || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Supabase: ${message}`), { status: response.status });
  }
  return payload;
}

async function getFavoriteOfferIds(userId) {
  const rows = await supabaseRest(`user_favorites?select=offer_id&user_id=eq.${encodeURIComponent(userId)}`);
  if (!rows?.length) return [];
  const offerIds = rows.map((row) => row.offer_id).filter(Boolean);
  const offers = await supabaseRest(`offers?select=id,external_product_id&id=in.(${offerIds.map(encodeURIComponent).join(',')})`);
  return offers.map((offer) => offer.external_product_id).filter(Boolean);
}

async function getDatabaseOfferId(externalProductId) {
  const rows = await supabaseRest(`offers?select=id&external_product_id=eq.${encodeURIComponent(externalProductId)}&limit=1`);
  return rows?.[0]?.id || null;
}

async function getExternalOfferIds(table, userId, orderColumn = 'created_at') {
  const rows = await supabaseRest(`${table}?select=offer_id&user_id=eq.${encodeURIComponent(userId)}&order=${orderColumn}.desc`);
  const ids = rows.map((row) => row.offer_id).filter(Boolean);
  if (!ids.length) return [];
  const offers = await supabaseRest(`offers?select=id,external_product_id&id=in.(${ids.map(encodeURIComponent).join(',')})`);
  const byId = new Map(offers.map((offer) => [offer.id, offer.external_product_id]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function readApiJson(response, service = 'Mercado Livre') {
  const body = await response.text();
  try { return JSON.parse(body); }
  catch {
    const message = response.status === 403
      ? `${service} bloqueou esta consulta (HTTP 403) antes de devolver dados da API. A autorização OAuth atual não tem acesso a este recurso.`
      : `${service} respondeu com uma página inesperada (HTTP ${response.status}), e não com dados da API. Tente novamente em alguns minutos.`;
    throw new MercadoLivreError(message, response.status || 502);
  }
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

function getLocalOffers() {
  const allOffers = new Map(initialOffers.map((offer) => [offer.id, offer]));
  readOffers().forEach((offer) => allOffers.set(offer.id, offer));
  return [...allOffers.values()];
}

async function getAllOffers() {
  return supabaseStore.enabled ? supabaseStore.listOffers() : getLocalOffers();
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
  const updatedTokens = await readApiJson(response, 'A autorização do Mercado Livre');
  if (!response.ok) throw new MercadoLivreError(updatedTokens.message || updatedTokens.error_description || 'Não foi possível renovar a conexão com o Mercado Livre.', 401);
  saveTokens(updatedTokens);
  return updatedTokens.access_token;
}

async function getMercadoLivreItem(itemId) {
  const endpoint = `https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`;
  // Dados de item podem ser públicos. Tentamos a leitura pública primeiro para não
  // depender de permissões de vendedor que não se aplicam a ofertas de terceiros.
  let response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  let item = await readApiJson(response);
  if (response.ok) return item;

  // Caso a leitura pública não seja suficiente, tentamos com a conta autorizada.
  // Isto continua respeitando a política da API: não há tentativa de contornar 403.
  let accessToken = loadTokens()?.access_token;
  if (accessToken) {
    response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    item = await readApiJson(response);
    if (response.status === 401 || item.error === 'invalid_token') {
      accessToken = await refreshAccessToken(loadTokens());
      response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
      item = await readApiJson(response);
    }
    if (response.ok) return item;
  }

  if (response.status === 403) throw new MercadoLivreError('A API não liberou os dados deste anúncio. Você pode continuar no modo semi-automático e completar os campos manualmente.', 403);
  if (response.status === 404) throw new MercadoLivreError('Esse código MLB parece ser de uma página de catálogo, não de um anúncio individual. Use a URL completa do anúncio com o trecho wid=MLB... ou preencha o formulário manual.', 404);
  throw new MercadoLivreError(item.message || item.error || 'Não foi possível consultar este item no Mercado Livre.', response.status);
}

async function getMercadoLivreProfile() {
  let accessToken = loadTokens()?.access_token;
  if (!accessToken) throw new MercadoLivreError('Nenhum token local foi encontrado.', 401);
  let response = await fetch('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  let profile = await readApiJson(response);
  if (response.status === 401 || profile.error === 'invalid_token') {
    accessToken = await refreshAccessToken(loadTokens());
    response = await fetch('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    profile = await readApiJson(response);
  }
  if (!response.ok) throw new MercadoLivreError(profile.message || profile.error || 'Não foi possível validar o token.', response.status);
  return profile;
}

async function getAuthorizedMercadoLivreJson(endpoint) {
  let accessToken = loadTokens()?.access_token;
  if (!accessToken) throw new MercadoLivreError('Para consultar produtos de catálogo, primeiro autorize novamente sua conta do Mercado Livre (OAuth).', 401);
  let response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  let payload = await readApiJson(response, 'O catálogo do Mercado Livre');
  if (response.status === 401 || payload.error === 'invalid_token') {
    accessToken = await refreshAccessToken(loadTokens());
    response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    payload = await readApiJson(response, 'O catálogo do Mercado Livre');
  }
  if (!response.ok) throw new MercadoLivreError(payload.message || payload.error || 'Não foi possível consultar o catálogo do Mercado Livre.', response.status);
  return payload;
}

async function getMercadoLivreCatalogOffer(productId) {
  const encodedId = encodeURIComponent(productId);
  const [product, offers] = await Promise.all([
    getAuthorizedMercadoLivreJson(`https://api.mercadolibre.com/products/${encodedId}`),
    getAuthorizedMercadoLivreJson(`https://api.mercadolibre.com/products/${encodedId}/items`),
  ]);
  const candidates = Array.isArray(offers.results) ? offers.results : [];
  const offer = candidates.find((item) => Number.isFinite(Number(item.price)) && item.status !== 'paused' && item.status !== 'closed')
    || candidates.find((item) => Number.isFinite(Number(item.price)));
  if (!offer) throw new MercadoLivreError('O produto de catálogo foi encontrado, mas não há uma oferta com preço disponível para criar o card.', 422);
  const picture = product.pictures?.[0]?.secure_url || product.pictures?.[0]?.url || product.thumbnail || null;
  return {
    id: offer.item_id || offer.id || product.id,
    title: product.name || product.title || offer.title || 'Produto do Mercado Livre',
    secure_thumbnail: picture,
    thumbnail: picture,
    price: offer.price,
    original_price: offer.original_price ?? offer.base_price ?? null,
    currency_id: offer.currency_id || 'BRL',
    shipping: offer.shipping || {},
    status: offer.status || 'active',
    available_quantity: offer.available_quantity,
  };
}

const searchTermsByCategory = {
  perifericos: 'periféricos gamer',
  hardware: 'hardware computador',
  informatica: 'informática',
  smartphones: 'smartphone',
  'tvs-audio': 'tv áudio',
  games: 'games console',
  outros: '',
};

async function searchMercadoLivre({ category, query }) {
  const cleanCategory = String(category || 'outros').toLowerCase();
  const term = String(query || '').trim() || searchTermsByCategory[cleanCategory] || '';
  if (term.length < 2) throw new MercadoLivreError('Digite o que deseja procurar, por exemplo: headset, SSD ou câmera.', 400);
  const endpoint = new URL('https://api.mercadolibre.com/sites/MLB/search');
  endpoint.searchParams.set('q', term);
  endpoint.searchParams.set('limit', '20');
  // A busca pública é preferível. Em algumas contas/regiões o Mercado Livre exige
  // um token mesmo para esse recurso, então repetimos somente com OAuth válido.
  let apiResponse = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  let payload = await readApiJson(apiResponse, 'A busca do Mercado Livre');
  if (!apiResponse.ok && loadTokens()?.access_token) {
    let accessToken = loadTokens().access_token;
    apiResponse = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    payload = await readApiJson(apiResponse, 'A busca do Mercado Livre');
    if (apiResponse.status === 401 || payload.error === 'invalid_token') {
      accessToken = await refreshAccessToken(loadTokens());
      apiResponse = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
      payload = await readApiJson(apiResponse, 'A busca do Mercado Livre');
    }
  }
  if (!apiResponse.ok) {
    if (apiResponse.status === 403) throw new MercadoLivreError('O Mercado Livre bloqueou a busca para esta aplicação/conta (403), mesmo com OAuth. Não há como liberar isso pelo site sem autorização do Mercado Livre. Você ainda pode usar o modo manual ou semi-automático.', 403);
    throw new MercadoLivreError(payload.message || payload.error || 'Não foi possível pesquisar itens no Mercado Livre agora.', apiResponse.status);
  }
  const results = (payload.results || []).filter((item) => Number.isFinite(Number(item.price))).map((item) => {
    const price = Number(item.price);
    const originalPrice = item.original_price != null && Number.isFinite(Number(item.original_price)) ? Number(item.original_price) : null;
    return {
      id: item.id,
      title: item.title,
      image: item.secure_thumbnail || item.thumbnail || null,
      currentPrice: price,
      originalPrice,
      discountPct: originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
      publicUrl: item.permalink || `https://www.mercadolivre.com.br/${item.id}`,
      freeShipping: Boolean(item.shipping?.free_shipping),
      condition: item.condition || null,
    };
  });
  return { term, results };
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

function extractCatalogProductId(publicUrl) {
  try {
    const parsed = new URL(String(publicUrl));
    const catalogMatch = parsed.pathname.toUpperCase().match(/\/(?:P|UP)\/(MLB(?:U)?\d{6,})/);
    if (catalogMatch?.[1]) return catalogMatch[1];
  } catch { /* the regular URL validation happens later */ }
  return null;
}

function isMercadoLivreUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'meli.la' || hostname.endsWith('.mercadolivre.com.br') || hostname === 'mercadolivre.com.br';
  } catch { return false; }
}

function normalizeOffer(item, publicUrl, affiliateUrl, category) {
  const currentPrice = Number(item.price);
  const originalPrice = item.original_price != null && Number.isFinite(Number(item.original_price)) ? Number(item.original_price) : null;
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
  const specifications = Object.fromEntries(Object.entries(data.specifications || {})
    .slice(0, 8).map(([name, value]) => [String(name).slice(0, 60), String(value || '').trim().slice(0, 180)])
    .filter(([name, value]) => name && value));
  const discountPct = originalPrice && originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const availabilityStatus = ['available', 'unavailable', 'pending'].includes(data.availabilityStatus)
    ? data.availabilityStatus : (data.available === false ? 'unavailable' : 'available');
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
    subcategory: String(data.subcategory || '').trim().slice(0, 80),
    specifications,
    available: availabilityStatus === 'available',
    availabilityStatus,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

async function saveOffer(offer) {
  if (supabaseStore.enabled) {
    const existingOffer = (await getAllOffers()).find((savedOffer) => savedOffer.id === offer.id || savedOffer.publicUrl === offer.publicUrl);
    const previousHistory = Array.isArray(existingOffer?.priceHistory) ? existingOffer.priceHistory : [];
    const lastPrice = previousHistory.at(-1)?.price;
    const priceHistory = Array.isArray(offer.priceHistory) && offer.priceHistory.length
      ? offer.priceHistory
      : lastPrice === offer.currentPrice ? previousHistory : [...previousHistory, { price: offer.currentPrice, at: new Date().toISOString() }].slice(-24);
    const finalOffer = { ...(existingOffer ? { ...offer, id: existingOffer.id, createdAt: existingOffer.createdAt } : offer), priceHistory };
    return supabaseStore.saveOffer(finalOffer);
  }
  const savedOffers = readOffers();
  const existingOffer = getLocalOffers().find((savedOffer) => savedOffer.publicUrl === offer.publicUrl);
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

function appendPriceHistory(offer, price, now) {
  const history = Array.isArray(offer.priceHistory) ? offer.priceHistory : [];
  const lastPrice = history.at(-1)?.price;
  return lastPrice === price ? history : [...history, { price, at: now }].slice(-24);
}

// Updates only offers that the administrator already saved. It never discovers new
// listings, and a denied API response is recorded as "skipped" instead of changing a card.
async function refreshSavedMercadoLivreOffers() {
  const savedOffers = supabaseStore.enabled ? await getAllOffers() : readOffers();
  const report = { checked: 0, updated: 0, unchanged: 0, skipped: 0, errors: [] };
  let changed = false;
  for (const offer of savedOffers) {
    if (offer.marketplace !== 'mercado_livre') continue;
    const itemId = extractItemId(offer.publicUrl);
    if (!itemId) { report.skipped += 1; continue; }
    report.checked += 1;
    try {
      const item = await getMercadoLivreItem(itemId);
      const currentPrice = Number(item.price);
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) { report.skipped += 1; continue; }
      const originalPrice = item.original_price != null && Number.isFinite(Number(item.original_price)) ? Number(item.original_price) : null;
      const discountPct = originalPrice && originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
      const now = new Date().toISOString();
      const nextOffer = {
        ...offer,
        currentPrice,
        originalPrice,
        discountPct,
        freeShipping: Boolean(item.shipping?.free_shipping),
        available: item.status === 'active' && item.available_quantity !== 0,
        priceHistory: appendPriceHistory(offer, currentPrice, now),
        updatedAt: now,
      };
      const didChange = nextOffer.currentPrice !== offer.currentPrice || nextOffer.originalPrice !== offer.originalPrice
        || nextOffer.available !== offer.available || nextOffer.freeShipping !== offer.freeShipping
        || nextOffer.priceHistory.length !== (Array.isArray(offer.priceHistory) ? offer.priceHistory.length : 0);
      const index = savedOffers.findIndex((saved) => saved.id === offer.id);
      savedOffers[index] = nextOffer;
      changed = changed || didChange;
      report[didChange ? 'updated' : 'unchanged'] += 1;
    } catch (error) {
      if (error.status === 403 || error.status === 404) report.skipped += 1;
      else { report.skipped += 1; report.errors.push(`${offer.title}: ${error.message}`); }
    }
  }
  if (changed) {
    if (supabaseStore.enabled) await Promise.all(savedOffers.map((offer) => saveOffer(offer)));
    else writeOffers(savedOffers);
  }
  return report;
}

let databaseStartupError = null;
const databaseReady = supabaseStore.initialize(getLocalOffers)
  .then((result) => {
    if (result.enabled) console.log(`Supabase conectado${result.migrated ? `: ${result.migrated} cards migrados.` : '.'}`);
  })
  .catch((error) => {
    databaseStartupError = error;
    const detail = error.cause?.code || error.cause?.message || '';
    console.error(`Falha ao iniciar o Supabase: ${error.message}${detail ? ` (${detail})` : ''}`);
  });

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (part) => {
      body += part;
      // Arquivos de até 20 MB viram aproximadamente 27 MB ao serem enviados em base64.
      if (body.length > 30_000_000) request.destroy();
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
  const type = contentType(file);
  let body = fs.readFileSync(file);
  // O cabeçalho comum também é aplicado às páginas antigas e a páginas HTML
  // futuras, mesmo se alguém esquecer de incluir o script manualmente.
  if (type.startsWith('text/html')) {
    let html = body.toString('utf8');
    if (!/<link\s[^>]*rel=["'](?:shortcut\s+)?icon["']/i.test(html)) {
      html = html.replace(/<\/head\s*>/i, '<link rel="icon" type="image/png" href="assets/logo-economizai.png"></head>');
    }
    if (!/\bheader-ui\.css\b/.test(html)) {
      html = html.replace(/<\/head\s*>/i, '<link rel="stylesheet" href="header-ui.css"></head>');
    }
    if (!/\bpassword-visibility\.css\b/.test(html)) {
      html = html.replace(/<\/head\s*>/i, '<link rel="stylesheet" href="password-visibility.css"></head>');
    }
    if (!/\bui-feedback\.css\b/.test(html)) {
      html = html.replace(/<\/head\s*>/i, '<link rel="stylesheet" href="ui-feedback.css"></head>');
    }
    // A renovação visual especial permanece apenas na página de login.
    if (requested === '/login.html' && !/\bdesign-polish\.css\b/.test(html)) {
      html = html.replace(/<\/head\s*>/i, '<link rel="stylesheet" href="design-polish.css"></head>');
    }
    if (requested === '/conta.html' && !/\baccount-avatar\.css\b/.test(html)) {
      html = html.replace(/<\/head\s*>/i, '<link rel="stylesheet" href="account-avatar.css"></head>');
    }
    // A página inicial tem um menu próprio, ticker contínuo e subcategorias.
    // As páginas internas recebem o cabeçalho compartilhado automaticamente.
    if (requested !== '/index.html' && !/\bpage-shell\.js\b/.test(html)) html = html.replace(/<\/body\s*>/i, '<script src="page-shell.js"></script></body>');
    if (!/\bpassword-visibility\.js\b/.test(html)) html = html.replace(/<\/body\s*>/i, '<script src="password-visibility.js"></script></body>');
    if (!/\bui-feedback\.js\b/.test(html)) html = html.replace(/<\/body\s*>/i, '<script src="ui-feedback.js"></script></body>');
    body = Buffer.from(html, 'utf8');
  }
  send(response, 200, body, type);
  return true;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    await databaseReady;
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const { email, password } = await readBody(request);
      const session = await loginUser(email, password);
      const duration = Math.max(60, Math.min(Number(session.expires_in) || 3600, 3600));
      return sendJson(response, 200, { ok: true, email: session.user?.email || email }, {
        'Set-Cookie': `economizai_admin_session=${encodeURIComponent(session.access_token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${duration}`,
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/signup') {
      const { name, email, password } = await readBody(request);
      if (!validPassword(password)) return sendJson(response, 400, { message: 'A senha deve ter ao menos 8 caracteres, letra minúscula, maiúscula, número e caractere especial.' });
      const signup = await signupUser(name, email, password);
      if (!signup.session?.access_token) {
        return sendJson(response, 201, { ok: true, confirmationRequired: true, message: 'Conta criada. Confirme o e-mail enviado pelo Supabase e depois entre.' });
      }
      const duration = Math.max(60, Math.min(Number(signup.session.expires_in) || 3600, 3600));
      return sendJson(response, 201, { ok: true, confirmationRequired: false }, {
        'Set-Cookie': `economizai_admin_session=${encodeURIComponent(signup.session.access_token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${duration}`,
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      return sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'economizai_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' });
    }

    if (request.method === 'GET' && url.pathname === '/api/auth/session') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      return sendJson(response, 200, { authenticated: true, ...authentication.user, isAdmin: Boolean(adminEmail && authentication.user.email.toLowerCase() === adminEmail) });
    }

    if (request.method === 'GET' && url.pathname === '/api/favorites') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const ids = await getFavoriteOfferIds(authentication.user.id);
      return sendJson(response, 200, { ids });
    }

    const favoriteMatch = url.pathname.match(/^\/api\/favorites\/([^/]+)$/);
    if (favoriteMatch && ['POST', 'DELETE'].includes(request.method)) {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const externalProductId = decodeURIComponent(favoriteMatch[1]);
      const offerId = await getDatabaseOfferId(externalProductId);
      if (!offerId) return sendJson(response, 404, { message: 'Oferta não encontrada.' });
      if (request.method === 'POST') {
        await supabaseRest('user_favorites?on_conflict=user_id,offer_id', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: [{ user_id: authentication.user.id, offer_id: offerId }] });
        return sendJson(response, 201, { favorited: true });
      }
      await supabaseRest(`user_favorites?user_id=eq.${encodeURIComponent(authentication.user.id)}&offer_id=eq.${encodeURIComponent(offerId)}`, { method: 'DELETE', prefer: 'return=minimal' });
      return sendJson(response, 200, { favorited: false });
    }

    if (request.method === 'GET' && url.pathname === '/api/recent') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      return sendJson(response, 200, { ids: await getExternalOfferIds('user_recent_views', authentication.user.id, 'viewed_at') });
    }
    const recentMatch = url.pathname.match(/^\/api\/recent\/([^/]+)$/);
    if (request.method === 'POST' && recentMatch) {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const offerId = await getDatabaseOfferId(decodeURIComponent(recentMatch[1]));
      if (!offerId) return sendJson(response, 404, { message: 'Oferta não encontrada.' });
      await supabaseRest('user_recent_views?on_conflict=user_id,offer_id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: [{ user_id: authentication.user.id, offer_id: offerId, viewed_at: new Date().toISOString() }] });
      return sendJson(response, 201, { ok: true });
    }

    if (request.method === 'GET' && url.pathname === '/api/alerts') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const rows = await supabaseRest(`user_price_alerts?select=offer_id,target_price,is_active,triggered_at&user_id=eq.${encodeURIComponent(authentication.user.id)}&order=created_at.desc`);
      const ids = await getExternalOfferIds('user_price_alerts', authentication.user.id);
      return sendJson(response, 200, { alerts: rows.map((row, index) => ({ ...row, externalProductId: ids[index] || null })) });
    }
    const alertMatch = url.pathname.match(/^\/api\/alerts\/([^/]+)$/);
    if (alertMatch && ['POST', 'DELETE'].includes(request.method)) {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const offerId = await getDatabaseOfferId(decodeURIComponent(alertMatch[1]));
      if (!offerId) return sendJson(response, 404, { message: 'Oferta não encontrada.' });
      if (request.method === 'DELETE') { await supabaseRest(`user_price_alerts?user_id=eq.${encodeURIComponent(authentication.user.id)}&offer_id=eq.${encodeURIComponent(offerId)}`, { method: 'DELETE', prefer: 'return=minimal' }); return sendJson(response, 200, { ok: true }); }
      const { targetPrice } = await readBody(request); const target = Number(String(targetPrice).replace(',', '.'));
      if (!Number.isFinite(target) || target <= 0) return sendJson(response, 400, { message: 'Informe um preço de alerta válido.' });
      await supabaseRest('user_price_alerts?on_conflict=user_id,offer_id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: [{ user_id: authentication.user.id, offer_id: offerId, target_price: target, is_active: true, triggered_at: null }] });
      return sendJson(response, 201, { ok: true });
    }

    const reportMatch = url.pathname.match(/^\/api\/reports\/([^/]+)$/);
    if (request.method === 'POST' && reportMatch) {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const offerId = await getDatabaseOfferId(decodeURIComponent(reportMatch[1]));
      const { type, message } = await readBody(request);
      if (!offerId || !['price_changed', 'unavailable', 'broken_link', 'other'].includes(type)) return sendJson(response, 400, { message: 'Denúncia inválida.' });
      await supabaseRest('offer_reports', { method: 'POST', prefer: 'return=minimal', body: [{ user_id: authentication.user.id, offer_id: offerId, report_type: type, message: String(message || '').slice(0, 1000) }] });
      return sendJson(response, 201, { ok: true, message: 'Obrigado. Vamos verificar esta oferta.' });
    }

    if (request.method === 'POST' && url.pathname === '/api/contact') {
      const maybeUser = await requireUser(request); const data = await readBody(request);
      const name = String(data.name || '').trim().slice(0, 100), email = String(data.email || '').trim().toLowerCase(), subject = String(data.subject || '').trim().slice(0, 140), message = String(data.message || '').trim().slice(0, 4000);
      if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 2 || message.length < 5) return sendJson(response, 400, { message: 'Preencha nome, e-mail, assunto e mensagem corretamente.' });
      await supabaseRest('contact_messages', { method: 'POST', prefer: 'return=minimal', body: [{ user_id: maybeUser.ok ? maybeUser.user.id : null, name, email, phone: String(data.phone || '').trim().slice(0, 40) || null, subject, message }] });
      return sendJson(response, 201, { ok: true, message: 'Mensagem enviada. Obrigado pelo contato!' });
    }

    if (request.method === 'PATCH' && url.pathname === '/api/auth/profile') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const { name, displayName, avatarId, useCustomAvatar } = await readBody(request);
      const nextAvatarId = /^avatar-[1-6]$/.test(String(avatarId || '')) ? String(avatarId) : authentication.user.avatarId;
      const nextName = String(name || '').trim().slice(0, 80);
      const updatedName = String(displayName || '').trim().slice(0, 80);
      const profileResponse = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/user`, {
        method: 'PUT',
        headers: { apikey: config.SUPABASE_SECRET_KEY, Authorization: `Bearer ${authentication.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ data: { full_name: nextName, display_name: updatedName, avatar_id: nextAvatarId, avatar_url: useCustomAvatar ? authentication.user.avatarUrl : null } }),
      });
      if (!profileResponse.ok) return sendJson(response, 400, { message: 'Não foi possível atualizar o perfil.' });
      return sendJson(response, 200, { ok: true, name: nextName, displayName: updatedName, avatarId: nextAvatarId });
    }

    if (request.method === 'PATCH' && url.pathname === '/api/auth/email') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const { email, currentPassword } = await readBody(request);
      const nextEmail = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return sendJson(response, 400, { message: 'Informe um e-mail válido.' });
      if (!String(currentPassword || '')) return sendJson(response, 400, { message: 'Confirme sua senha atual para trocar o e-mail.' });
      let verifiedSession;
      try { verifiedSession = await loginUser(authentication.user.email, currentPassword); }
      catch { return sendJson(response, 400, { message: 'A senha atual está incorreta.' }); }
      const authResponse = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/admin/users/${authentication.user.id}`, {
        method: 'PUT', headers: { apikey: config.SUPABASE_SECRET_KEY, Authorization: `Bearer ${config.SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: nextEmail }),
      });
      if (!authResponse.ok) return sendJson(response, 400, { message: 'Não foi possível trocar o e-mail. Verifique se ele já não está em uso.' });
      return sendJson(response, 200, { ok: true, email: nextEmail, message: 'E-mail alterado com sucesso.' });
    }

    if (request.method === 'PATCH' && url.pathname === '/api/auth/password') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const { password, currentPassword } = await readBody(request);
      if (!String(currentPassword || '')) return sendJson(response, 400, { message: 'Informe sua senha atual para continuar.' });
      if (!validPassword(password)) return sendJson(response, 400, { message: 'A senha deve ter ao menos 8 caracteres, letra minúscula, maiúscula, número e caractere especial.' });
      let verifiedSession;
      try { verifiedSession = await loginUser(authentication.user.email, currentPassword); }
      catch { return sendJson(response, 400, { message: 'A senha atual está incorreta.' }); }
      const authResponse = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/user`, {
        method: 'PUT', headers: { apikey: config.SUPABASE_SECRET_KEY, Authorization: `Bearer ${verifiedSession.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ password: String(password) }),
      });
      if (!authResponse.ok) return sendJson(response, 400, { message: 'Não foi possível trocar a senha.' });
      return sendJson(response, 200, { ok: true, message: 'Senha alterada com sucesso.' });
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/avatar') {
      const authentication = await requireUser(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
      const { base64, mimeType } = await readBody(request);
      const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
      if (!allowedMimeTypes.has(mimeType) || typeof base64 !== 'string' || !/^[a-z0-9+/=]+$/i.test(base64)) return sendJson(response, 400, { message: 'Envie uma imagem PNG, JPG ou WebP válida.' });
      const image = Buffer.from(base64, 'base64');
      if (!image.length || image.length > 2_000_000) return sendJson(response, 400, { message: 'A foto deve ter no máximo 2 MB.' });
      try { await ensureAvatarBucket(); }
      catch (error) { return sendJson(response, 503, { message: error.message || 'Não foi possível preparar o espaço de fotos de perfil.' }); }
      const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const objectPath = `${authentication.user.id}/perfil.${extension}`;
      const uploaded = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/storage/v1/object/avatars/${objectPath}`, {
        method: 'PUT', headers: { apikey: config.SUPABASE_SECRET_KEY, Authorization: `Bearer ${config.SUPABASE_SECRET_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' }, body: image,
      });
      if (!uploaded.ok) return sendJson(response, 400, { message: 'Não foi possível enviar a foto de perfil.' });
      const avatarUrl = `${String(config.SUPABASE_URL).replace(/\/$/, '')}/storage/v1/object/public/avatars/${objectPath}?v=${Date.now()}`;
      const updated = await fetch(`${String(config.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/user`, {
        method: 'PUT', headers: { apikey: config.SUPABASE_SECRET_KEY, Authorization: `Bearer ${authentication.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { avatar_url: avatarUrl } }),
      });
      if (!updated.ok) return sendJson(response, 400, { message: 'A foto foi enviada, mas não foi possível atualizar o perfil.' });
      return sendJson(response, 200, { ok: true, avatarUrl });
    }

    if (request.method === 'GET' && ['/admin.html', '/reportes.html'].includes(url.pathname)) {
      const authentication = await requireAdmin(request);
      if (!authentication.ok) {
        response.writeHead(302, { Location: '/login.html', 'Cache-Control': 'no-store' });
        return response.end();
      }
    }

    if (request.method === 'GET' && url.pathname === '/conta.html') {
      const authentication = await requireUser(request);
      if (!authentication.ok) {
        response.writeHead(302, { Location: '/login.html', 'Cache-Control': 'no-store' });
        return response.end();
      }
    }

    if (url.pathname.startsWith('/api/admin/')) {
      const authentication = await requireAdmin(request);
      if (!authentication.ok) return sendJson(response, authentication.status, { message: authentication.message });
    }
    if (databaseStartupError && url.pathname.startsWith('/api/')) return sendJson(response, 503, { message: 'Não foi possível conectar ao banco Supabase. Confira SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env.' });
    if (request.method === 'GET' && url.pathname === '/api/ofertas') return sendJson(response, 200, (await getAllOffers()).filter((offer) => offer.availabilityStatus !== 'pending'));

    const publicOfferMatch = url.pathname.match(/^\/api\/ofertas\/([^/]+)$/);
    if (request.method === 'GET' && publicOfferMatch) {
      const offer = (await getAllOffers()).find((savedOffer) => savedOffer.id === decodeURIComponent(publicOfferMatch[1]));
      if (!offer) return sendJson(response, 404, { message: 'Oferta não encontrada.' });
      return sendJson(response, 200, offer);
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/ofertas') return sendJson(response, 200, await getAllOffers());

    if (request.method === 'GET' && url.pathname === '/api/admin/reportes') {
      const reports = await supabaseRest('offer_reports?select=id,report_type,message,status,created_at,offers(external_product_id,products(title))&order=created_at.desc');
      return sendJson(response, 200, { reports });
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/contatos') {
      const contacts = await supabaseRest('contact_messages?select=id,name,email,phone,subject,message,status,created_at&order=created_at.desc');
      return sendJson(response, 200, { contacts });
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/auditoria') {
      const entityType = url.searchParams.get('tipo'); const entityId = url.searchParams.get('id');
      if (!['report', 'contact'].includes(String(entityType)) || !/^[0-9a-f-]{36}$/i.test(String(entityId))) return sendJson(response, 400, { message: 'Consulta de histórico inválida.' });
      const logs = await supabaseRest(`admin_action_logs?select=previous_status,next_status,actor_name,created_at&entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&order=created_at.desc`);
      return sendJson(response, 200, { logs });
    }

    const adminReportMatch = url.pathname.match(/^\/api\/admin\/reportes\/([0-9a-f-]+)$/i);
    if (request.method === 'PATCH' && adminReportMatch) {
      const { status } = await readBody(request);
      if (!['new', 'reviewing', 'resolved', 'archived'].includes(String(status))) return sendJson(response, 400, { message: 'Status de reporte inválido.' });
      const current = await supabaseRest(`offer_reports?select=status&id=eq.${encodeURIComponent(adminReportMatch[1])}&limit=1`);
      if (!current?.[0]) return sendJson(response, 404, { message: 'Reporte não encontrado.' });
      const actor = await requireAdmin(request);
      await supabaseRest(`offer_reports?id=eq.${encodeURIComponent(adminReportMatch[1])}`, { method: 'PATCH', prefer: 'return=minimal', body: { status } });
      await supabaseRest('admin_action_logs', { method: 'POST', prefer: 'return=minimal', body: [{ entity_type: 'report', entity_id: adminReportMatch[1], previous_status: current[0].status, next_status: String(status), actor_user_id: actor.user.id, actor_email: actor.user.email, actor_name: actor.user.displayName || actor.user.name || 'Administrador' }] });
      return sendJson(response, 200, { ok: true });
    }

    const adminContactMatch = url.pathname.match(/^\/api\/admin\/contatos\/([0-9a-f-]+)$/i);
    if (request.method === 'PATCH' && adminContactMatch) {
      const { status } = await readBody(request);
      if (!['new', 'refused', 'answered', 'archived'].includes(String(status))) return sendJson(response, 400, { message: 'Status de contato inválido.' });
      const current = await supabaseRest(`contact_messages?select=status&id=eq.${encodeURIComponent(adminContactMatch[1])}&limit=1`);
      if (!current?.[0]) return sendJson(response, 404, { message: 'Contato não encontrado.' });
      const actor = await requireAdmin(request);
      await supabaseRest(`contact_messages?id=eq.${encodeURIComponent(adminContactMatch[1])}`, { method: 'PATCH', prefer: 'return=minimal', body: { status } });
      await supabaseRest('admin_action_logs', { method: 'POST', prefer: 'return=minimal', body: [{ entity_type: 'contact', entity_id: adminContactMatch[1], previous_status: current[0].status, next_status: String(status), actor_user_id: actor.user.id, actor_email: actor.user.email, actor_name: actor.user.displayName || actor.user.name || 'Administrador' }] });
      return sendJson(response, 200, { ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/atualizar-ofertas') {
      return sendJson(response, 200, await refreshSavedMercadoLivreOffers());
    }

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
      const tokens = await readApiJson(tokenResponse, 'A autorização do Mercado Livre');
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
      const productId = extractCatalogProductId(publicUrl);
      if (!itemId && !productId) return sendJson(response, 400, { message: 'Não encontrei o código do anúncio ou produto de catálogo no link. Copie a URL completa do Mercado Livre.' });
      let item;
      if (itemId) {
        try {
          item = await getMercadoLivreItem(itemId);
        } catch (error) {
          if (!productId || ![403, 404].includes(error.status)) throw error;
          item = await getMercadoLivreCatalogOffer(productId);
        }
      } else {
        item = await getMercadoLivreCatalogOffer(productId);
      }
      if (!Number.isFinite(Number(item.price))) return sendJson(response, 422, { message: 'O item não possui um preço válido para criar o card.' });
      const offer = normalizeOffer(item, publicUrl, affiliateUrl, String(category || 'outros').toLowerCase());
      return sendJson(response, 201, await saveOffer(offer));
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/ofertas/manual') {
      const offer = normalizeManualOffer(await readBody(request));
      return sendJson(response, 201, await saveOffer(offer));
    }

    const editMatch = url.pathname.match(/^\/api\/admin\/ofertas\/([^/]+)$/);
    if (request.method === 'PUT' && editMatch) {
      const offerId = decodeURIComponent(editMatch[1]);
      const allOffers = await getAllOffers();
      const existingOffer = allOffers.find((offer) => offer.id === offerId);
      if (!existingOffer) return sendJson(response, 404, { message: 'Card não encontrado.' });
      const editedOffer = normalizeManualOffer(await readBody(request));
      const previousHistory = Array.isArray(existingOffer.priceHistory) ? existingOffer.priceHistory : [];
      const lastPrice = previousHistory.at(-1)?.price;
      const priceHistory = lastPrice === editedOffer.currentPrice
        ? previousHistory
        : [...previousHistory, { price: editedOffer.currentPrice, at: new Date().toISOString() }].slice(-24);
      const finalOffer = { ...editedOffer, id: existingOffer.id, createdAt: existingOffer.createdAt, updatedAt: new Date().toISOString(), priceHistory };
      return sendJson(response, 200, await saveOffer(finalOffer));
    }

    if (request.method === 'DELETE' && editMatch) {
      const offerId = decodeURIComponent(editMatch[1]);
      if (supabaseStore.enabled) {
        const deleted = await supabaseStore.deleteOffer(offerId);
        if (!deleted) return sendJson(response, 404, { message: 'Card não encontrado.' });
        return sendJson(response, 200, { ok: true, deleted });
      }
      const savedOffers = readOffers();
      const remainingOffers = savedOffers.filter((offer) => offer.id !== offerId);
      if (remainingOffers.length === savedOffers.length) return sendJson(response, 404, { message: 'Card não encontrado.' });
      writeOffers(remainingOffers);
      return sendJson(response, 200, { ok: true, deleted: 1 });
    }

    if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { message: 'Rota não encontrada.' });
    if (sendStatic(response, url.pathname)) return;
    return send(response, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  } catch (error) {
    if (error instanceof MercadoLivreError) console.warn(`Mercado Livre [${error.status}]: ${error.message}`);
    else console.error(error);
    return sendJson(response, error.status || 500, { message: error.message || 'Erro interno.' });
  }
});

const refreshIntervalMs = 3 * 60 * 60 * 1000;
setInterval(() => {
  refreshSavedMercadoLivreOffers()
    .then((report) => console.log(`Atualização automática: ${report.checked} verificados, ${report.updated} atualizados, ${report.unchanged} sem alteração, ${report.skipped} ignorados.`))
    .catch((error) => console.error('Falha na atualização automática:', error.message));
}, refreshIntervalMs).unref();

server.listen(port, '127.0.0.1', () => console.log(`Economizaí local: http://localhost:${port} · atualização de ofertas a cada 3 horas`));

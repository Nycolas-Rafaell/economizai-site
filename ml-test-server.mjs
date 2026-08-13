import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(directory, '.env');

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const config = { ...loadEnv(configPath), ...process.env };
const port = Number(config.PORT || 3000);
let oauthAttempt;

function base64Url(value) {
  return value.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function page(title, content) {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#0b0b0c;color:#f4f4f4;font:16px system-ui,sans-serif;line-height:1.5}.box{max-width:720px;margin:72px auto;padding:32px;background:#171717;border:1px solid #303030;border-radius:16px}h1{color:#ffc52c}a,.button{color:#111;background:#ffc52c;border:0;border-radius:8px;padding:12px 16px;text-decoration:none;font-weight:700;display:inline-block}code{background:#252525;padding:2px 5px;border-radius:4px}small{color:#aaa}.error{color:#ff8b8b}</style><main class="box">${content}</main></html>`;
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(body);
}

function hasConfiguration() {
  return config.ML_CLIENT_ID && config.ML_CLIENT_SECRET && config.ML_REDIRECT_URI
    && !config.ML_CLIENT_ID.includes('COLE_AQUI') && !config.ML_CLIENT_SECRET.includes('COLE_AQUI');
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === '/') {
    const ready = hasConfiguration();
    return send(response, 200, page('Teste Mercado Livre', `
      <h1>Teste da API do Mercado Livre</h1>
      <p>${ready ? 'A configuração foi encontrada. Você pode iniciar a autorização.' : 'Falta configurar o arquivo <code>.env</code>.'}</p>
      <p><a href="/api/ml/connect">Conectar minha conta de teste</a></p>
      <small>Este servidor usa OAuth com PKCE. Sua chave secreta fica somente no arquivo .env do seu computador.</small>`));
  }

  if (requestUrl.pathname === '/api/ml/connect') {
    if (!hasConfiguration()) {
      return send(response, 400, page('Configuração pendente', '<h1>Configuração pendente</h1><p class="error">Preencha ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REDIRECT_URI no arquivo .env.</p>'));
    }
    const state = base64Url(crypto.randomBytes(24));
    const verifier = base64Url(crypto.randomBytes(48));
    const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
    oauthAttempt = { state, verifier, createdAt: Date.now() };
    const authorizationUrl = new URL('https://auth.mercadolivre.com.br/authorization');
    authorizationUrl.search = new URLSearchParams({
      response_type: 'code', client_id: config.ML_CLIENT_ID, redirect_uri: config.ML_REDIRECT_URI,
      state, code_challenge: challenge, code_challenge_method: 'S256',
    }).toString();
    response.writeHead(302, { Location: authorizationUrl.toString() });
    return response.end();
  }

  if (requestUrl.pathname === '/api/ml/callback') {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    if (!code || !oauthAttempt || state !== oauthAttempt.state || Date.now() - oauthAttempt.createdAt > 10 * 60 * 1000) {
      return send(response, 400, page('Autorização inválida', '<h1>Autorização inválida</h1><p class="error">O retorno não corresponde a uma tentativa válida ou expirou. Volte e tente novamente.</p>'));
    }
    try {
      const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'authorization_code', client_id: config.ML_CLIENT_ID, client_secret: config.ML_CLIENT_SECRET,
          code, redirect_uri: config.ML_REDIRECT_URI, code_verifier: oauthAttempt.verifier,
        }),
      });
      const token = await tokenResponse.json();
      oauthAttempt = undefined;
      if (!tokenResponse.ok) throw new Error(token.message || JSON.stringify(token));
      const profileResponse = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const profile = await profileResponse.json();
      fs.writeFileSync(path.join(directory, '.ml_tokens.json'), JSON.stringify({
        user_id: token.user_id, access_token: token.access_token, refresh_token: token.refresh_token,
        expires_in: token.expires_in, saved_at: new Date().toISOString(),
      }, null, 2));
      return send(response, 200, page('Conexão concluída', `<h1>Conta conectada com sucesso</h1><p>Conta autorizada: <strong>${escapeHtml(profile.nickname || profile.id || token.user_id)}</strong>.</p><p>O token de teste foi salvo apenas no arquivo local <code>.ml_tokens.json</code>, que está protegido no .gitignore. Não o envie a ninguém.</p>`));
    } catch (error) {
      return send(response, 502, page('Falha na conexão', `<h1>Não foi possível concluir</h1><p class="error">${escapeHtml(error.message)}</p><p>Confira se a URL de redirecionamento no DevCenter é idêntica à do .env.</p>`));
    }
  }

  return send(response, 404, page('Não encontrado', '<h1>Página não encontrada</h1><p><a href="/">Voltar ao teste</a></p>'));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Servidor de teste: http://localhost:${port}`);
});

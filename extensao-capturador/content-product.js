(() => {
  const clean = (value) => String(value || '')
    .replace(/[\u200B-\u200D\u200E\u200F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const text = (selector) => clean(document.querySelector(selector)?.textContent);
  const attr = (selector, name = 'content') => clean(document.querySelector(selector)?.getAttribute(name));

  function number(value) {
    const raw = clean(value).replace(/[^0-9,.-]/g, '');
    if (!raw) return 0;
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    return Number(normalized) || 0;
  }

  function brazilianPrice(fraction, cents) {
    const main = clean(fraction).replace(/[^0-9.]/g, '');
    if (!main) return 0;
    const decimal = clean(cents).replace(/\D/g, '').slice(0, 2).padEnd(2, '0');
    return number(`${main},${decimal}`);
  }

  function productJson() {
    const entries = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const parsed = JSON.parse(script.textContent);
        const values = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])];
        values.forEach((value) => { if (String(value?.['@type'] || '').toLowerCase().includes('product')) entries.push(value); });
      } catch { /* A página pode ter JSON-LD parcial; os seletores visíveis serão usados. */ }
    });
    return entries[0] || {};
  }

  function aiOpinionSummary() {
    const markerPattern = /resumo de opini(?:õ|o)es gerado por ia/i;
    const marker = [...document.querySelectorAll('body *')].find((element) => markerPattern.test(clean(element.textContent)) && ![...element.children].some((child) => markerPattern.test(clean(child.textContent))));
    if (!marker) return { summary: '', commentCount: '' };

    // O Mercado Livre posiciona o aviso logo depois do parágrafo produzido pela IA.
    // Procuramos o texto substancial mais próximo acima do aviso, sem trazer o título
    // da área ou o próprio rótulo da IA.
    const markerTop = marker.getBoundingClientRect().top;
    const candidates = [...document.querySelectorAll('p, [role="paragraph"], div')]
      .map((element) => ({ element, content: clean(element.innerText), rect: element.getBoundingClientRect() }))
      .filter(({ element, content, rect }) => element !== marker
        && !element.contains(marker)
        && content.length >= 55
        && content.length <= 1200
        && !markerPattern.test(content)
        && !/^opini(?:õ|o)es$/i.test(content)
        && !/^\d[\d.]*\s+coment[aá]rios?$/i.test(content)
        && rect.bottom <= markerTop + 8
        && markerTop - rect.bottom < 420)
      .sort((a, b) => b.rect.bottom - a.rect.bottom);

    const summary = candidates[0]?.content || '';
    let opinionBlock = marker.parentElement;
    for (let depth = 0; depth < 6 && opinionBlock; depth += 1, opinionBlock = opinionBlock.parentElement) {
      const blockText = clean(opinionBlock.innerText);
      const count = blockText.match(/(\d{1,3}(?:\.\d{3})*|\d+)\s+coment[aá]rios?/i)?.[1];
      if (count) return { summary, commentCount: count };
    }
    return { summary, commentCount: '' };
  }

  function marketplaceCategory() {
    const selectors = [
      '.andes-breadcrumb__item', '.ui-pdp-breadcrumb__item',
      '[class*="breadcrumb"] a', '[class*="breadcrumb"] span',
      'nav[aria-label*="readcrumb"] a'
    ];
    const parts = [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((element) => clean(element.textContent)))
      .filter((value) => value && value.length < 90 && !/in[ií]cio|mercado livre/i.test(value)))];
    return parts.slice(-5).join(' › ');
  }

  function productDescription() {
    const directSelectors = ['.ui-pdp-description__content', '.ui-pdp-description', '[data-testid="description"]', '#description'];
    const direct = directSelectors.map((selector) => clean(document.querySelector(selector)?.innerText)).find((value) => value.length > 40);
    if (direct) return direct;

    const heading = [...document.querySelectorAll('h1, h2, h3, h4, strong')]
      .find((element) => /^descri(?:ç|c)[aã]o$/i.test(clean(element.textContent)));
    if (!heading) return '';
    let section = heading.parentElement;
    for (let depth = 0; depth < 5 && section; depth += 1, section = section.parentElement) {
      const content = clean(section.innerText).replace(/^descri(?:ç|c)[aã]o\s*/i, '');
      if (content.length > 40 && content.length < 6000) return content;
    }
    return '';
  }

  function summarizeDescription(description) {
    const source = clean(description).replace(/^(descri(?:ç|c)[aã]o\s*)+/i, '');
    if (!source) return '';
    const lines = source.split(/\s*(?:\n|•|\u2022)\s*/).map(clean).filter((line) => line.length > 24);
    const textToSummarize = (lines.length ? lines.join('. ') : source).replace(/\s+/g, ' ');
    const sentences = textToSummarize.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    const chosen = [];
    for (const sentence of sentences) {
      const normalized = clean(sentence);
      if (normalized.length < 20 || /^ver mais|caracter[ií]sticas|informa[cç][oõ]es/i.test(normalized)) continue;
      if ((chosen.join(' ').length + normalized.length) > 520) break;
      chosen.push(normalized);
      if (chosen.length >= 3) break;
    }
    const summary = chosen.join(' ');
    return summary || textToSummarize.slice(0, 520).replace(/\s+\S*$/, '').trim();
  }

  function captureMercadoLivre() {
    const structured = productJson();
    const offer = Array.isArray(structured.offers) ? structured.offers[0] : (structured.offers || {});
    const aggregate = structured.aggregateRating || {};
    const currentFromPage = brazilianPrice(
      text('.ui-pdp-price__second-line .andes-money-amount__fraction') || text('.andes-money-amount__fraction'),
      text('.ui-pdp-price__second-line .andes-money-amount__cents') || text('.andes-money-amount__cents'),
    );
    const originalFromPage = brazilianPrice(
      text('.ui-pdp-price__original-value .andes-money-amount__fraction') || text('.ui-pdp-price__previous .andes-money-amount__fraction'),
      text('.ui-pdp-price__original-value .andes-money-amount__cents') || text('.ui-pdp-price__previous .andes-money-amount__cents'),
    );
    const reviewText = text('.ui-pdp-reviews__rating') || text('.ui-pdp-review__rating') || text('[class*="review"]');
    const title = clean(structured.name) || text('h1.ui-pdp-title') || text('h1') || attr('meta[property="og:title"]');
    const image = Array.isArray(structured.image) ? structured.image[0] : structured.image;
    const currentPrice = number(offer.price) || currentFromPage || number(attr('meta[itemprop="price"]'));
    const originalPrice = number(offer.highPrice) || originalFromPage;
    const rating = clean(aggregate.ratingValue) || (reviewText.match(/(?:^|\s)([0-5][,.]\d)/)?.[1] || '');
    const reviewCount = clean(aggregate.reviewCount || aggregate.ratingCount) || (reviewText.match(/\(([\d.]+)\)/)?.[1] || '');
    const productImage = clean(image) || attr('meta[property="og:image"]') || attr('figure img', 'src') || attr('img', 'src');
    const aiOpinion = aiOpinionSummary();
    const sourceCategory = marketplaceCategory();
    const description = summarizeDescription(productDescription());
    return {
      marketplace: 'mercado_livre',
      title,
      image: productImage,
      currentPrice,
      originalPrice,
      rating: rating.replace('.', ','),
      reviewCount,
      commentCount: aiOpinion.commentCount,
      reviewSummary: aiOpinion.summary,
      sourceCategory,
      description,
      publicUrl: location.href,
      availability: /pausad|indispon[ií]vel|sem estoque/i.test(document.body.innerText) ? 'unavailable' : 'pending'
    };
  }

  function shopeeVisible(element) {
    return Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  }

  function shopeeCategory() {
    const parts = [...new Set([...document.querySelectorAll('a[href*="-cat."], a[href*="category"]')]
      .filter(shopeeVisible)
      .map((element) => clean(element.textContent))
      .filter((value) => value && value.length < 90 && !/^shopee$/i.test(value)))];
    return parts.slice(0, 5).join(' › ');
  }

  function shopeeDescription() {
    const direct = [...document.querySelectorAll('[class*="product-detail"], [class*="product-description"], [data-sqe*="description"]')]
      .map((element) => clean(element.innerText))
      .find((value) => /descri(?:ç|c)[aã]o do produto/i.test(value) && value.length > 80);
    if (direct) return direct.replace(/^.*?descri(?:ç|c)[aã]o do produto\s*/i, '');

    const heading = [...document.querySelectorAll('h1, h2, h3, h4, strong, div')]
      .find((element) => /^descri(?:ç|c)[aã]o do produto$/i.test(clean(element.textContent)) && shopeeVisible(element));
    let section = heading?.parentElement;
    for (let depth = 0; depth < 7 && section; depth += 1, section = section.parentElement) {
      const content = clean(section.innerText).replace(/^descri(?:ç|c)[aã]o do produto\s*/i, '');
      if (content.length > 80 && content.length < 10000) return content;
    }
    return '';
  }

  function shopeePrices() {
    const seen = new Set();
    return [...document.querySelectorAll('body *')]
      .map((element) => ({ element, content: clean(element.textContent) }))
      .filter(({ content }) => content.length <= 140)
      .flatMap(({ element, content }) => (content.match(/R\$\s*[\d.]+,\d{2}/g) || []).map((price) => ({ element, content: price })))
      .filter(({ element, content }) => {
        const rect = element.getBoundingClientRect();
        const key = `${content}:${rect.top}:${rect.left}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ element, content }) => ({
        value: number(content.split(/[-–]/)[0]),
        crossed: (() => {
          let candidate = element;
          for (let depth = 0; depth < 5 && candidate; depth += 1, candidate = candidate.parentElement) {
            if (/^(del|s)$/i.test(candidate.tagName) || /line-through/.test(getComputedStyle(candidate).textDecorationLine)) return true;
          }
          return false;
        })(),
        top: element.getBoundingClientRect().top
      }))
      .filter(({ value }) => value > 0)
      .sort((a, b) => a.top - b.top);
  }

  function shopeeImage(structured) {
    const image = Array.isArray(structured.image) ? structured.image[0] : structured.image;
    if (clean(image)) return clean(image);
    const ogImage = attr('meta[property="og:image"]');
    if (ogImage) return ogImage;
    const candidates = [...document.querySelectorAll('img')]
      .filter((element) => shopeeVisible(element) && element.naturalWidth >= 180 && element.naturalHeight >= 180)
      .map((element) => ({
        element,
        source: clean(element.currentSrc || element.src),
        rect: element.getBoundingClientRect(),
      }))
      .filter(({ source }) => /^https?:/i.test(source) && /susercontent|shopee|img/i.test(source))
      .sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height));
    return candidates[0]?.source || '';
  }

  function shopeeCompactCount(value) {
    const match = clean(value).match(/(\d+(?:[,.]\d+)?)\s*(mil|k)?/i);
    if (!match) return '';
    const amount = match[1].replace('.', ',');
    return match[2] ? `${amount} mil` : amount;
  }

  function shopeeText() {
    return clean(document.body?.innerText);
  }

  function shopeeEmbeddedData() {
    return [...document.scripts]
      .map((script) => script.textContent || '')
      .filter((source) => /(?:price_before_discount|rating_star|cmt_count|item_rating|images)/i.test(source))
      .join('\n');
  }

  function shopeeEmbeddedNumber(source, keys, divisor = 1) {
    for (const key of keys) {
      const plainPattern = new RegExp(`["']${key}["']\\s*:\\s*["']?([0-9]+(?:\\.[0-9]+)?)["']?`, 'i');
      const escapedPattern = new RegExp(`\\\\["']${key}\\\\["']\\s*:\\s*\\\\?["']?([0-9]+(?:\\.[0-9]+)?)`, 'i');
      const raw = source.match(plainPattern)?.[1] || source.match(escapedPattern)?.[1];
      if (raw) return Number(raw) / divisor;
    }
    return 0;
  }

  function shopeeEmbeddedImage(source) {
    const url = source.match(/[\\"'](?:image|image_url)[\\"']\\s*:\\s*[\\"'](https?:[^\\"']+)[\\"']/i)?.[1];
    if (url) return url.replace(/\\u002F/g, '/').replace(/\\\\\//g, '/');
    const imageId = source.match(/[\\"']image[\\"']\\s*:\\s*[\\"']([a-z0-9_-]{20,})[\\"']/i)?.[1];
    return imageId ? `https://down-br.img.susercontent.com/file/${imageId}` : '';
  }

  function shopeeCountLabel(value) {
    const amount = Number(value);
    if (!amount) return '';
    if (amount >= 1000) return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1).replace('.', ',')} mil`;
    return String(Math.round(amount));
  }

  function shopeePriceFromText(source, pattern) {
    const match = source.match(pattern);
    return match ? number(match[1]) : 0;
  }

  function shopeePriceFromElements() {
    const candidates = [...document.querySelectorAll('[class*="price" i], [data-sqe*="price" i], [aria-label*="R$"]')]
      .filter(shopeeVisible)
      .flatMap((element) => {
        const source = `${clean(element.innerText)} ${clean(element.getAttribute('aria-label'))}`;
        return [...source.matchAll(/R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)(?:\s+(\d{2}))?/g)]
          .map((match) => number(match[2] ? `${match[1]},${match[2]}` : match[1]));
      })
      .filter((value) => value > 0);
    return candidates[0] || 0;
  }

  function shopeePriceNumbers(source) {
    return [...String(source || '').matchAll(/R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)(?:\s+(\d{2}))?/g)]
      .map((match) => number(match[2] ? `${match[1]},${match[2]}` : match[1]))
      .filter((value) => value > 0);
  }

  function shopeeStruckPrice(excluded = new Set()) {
    const candidates = [...document.querySelectorAll('del, s, strike, [class*="line-through" i], [style*="line-through" i]')]
      .flatMap((element) => shopeePriceNumbers(`${element.textContent} ${element.getAttribute('aria-label') || ''}`))
      .filter((value) => value > 0 && !excluded.has(value));
    return candidates.sort((a, b) => b - a)[0] || 0;
  }

  function shopeeRangePrices(source) {
    const values = new Set();
    [...String(source || '').matchAll(/R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)\s*[-–a]\s*R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)/gi)]
      .forEach((match) => {
        values.add(number(match[1]));
        values.add(number(match[2]));
      });
    return values;
  }

  function shopeeProductContext(titleElement, pageText) {
    let container = titleElement;
    for (let depth = 0; depth < 8 && container; depth += 1, container = container.parentElement) {
      const content = clean(container.innerText);
      if (/R\s*\$\s*[\d.]+/i.test(content) && content.length <= 9000) return content;
    }
    return pageText.slice(0, 7000);
  }

  function shopeeReviewSummary(rating, reviewCount) {
    if (!rating && !reviewCount) return '';
    const count = reviewCount ? ` e ${reviewCount} avaliações` : '';
    return `Este produto tem nota ${rating || 'não informada'}/5${count} na Shopee. Confira as avaliações recentes e as variações escolhidas antes de comprar.`;
  }

  function captureShopee() {
    const structured = productJson();
    const offer = Array.isArray(structured.offers) ? structured.offers[0] : (structured.offers || {});
    const aggregate = structured.aggregateRating || {};
    const embedded = shopeeEmbeddedData();
    const titleElement = document.querySelector('main h1') || document.querySelector('h1');
    const title = clean(structured.name) || clean(titleElement?.textContent) || attr('meta[property="og:title"]');
    const prices = shopeePrices();
    const pageText = shopeeText();
    const pageMarkup = document.documentElement?.innerHTML || '';
    // Alguns blocos da Shopee usam caracteres invisíveis ou são renderizados fora do
    // fluxo visual. Mantemos também texto bruto e marcação como fontes de reserva.
    const pageSource = clean(`${pageText} ${document.body?.textContent || ''} ${pageMarkup.replace(/<[^>]*>/g, ' ')}`);
    const surroundingText = shopeeProductContext(titleElement, pageSource);
    const embeddedRating = shopeeEmbeddedNumber(embedded, ['rating_star']);
    const rating = clean(aggregate.ratingValue) || (pageText.match(/(?:avalia[cç][aã]o|nota)?\s*([0-5][,.]\d)\s*(?:de\s*5)?/i)?.[1] || '') || (embeddedRating ? String(embeddedRating) : '');
    const reviewCountRaw = clean(aggregate.reviewCount || aggregate.ratingCount) || (pageText.match(/(\d+(?:[,.]\d+)?\s*(?:mil|k)?|\d{1,3}(?:\.\d{3})*)\s*avalia[cç][õo]es/i)?.[1] || '');
    const reviewCount = shopeeCompactCount(reviewCountRaw) || shopeeCountLabel(shopeeEmbeddedNumber(embedded, ['cmt_count', 'review_count']));
    const currentFromText = shopeePriceFromText(surroundingText, /R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)\s*(?:no\s*pix|com\s*cupom|à\s*vista)/i)
      || shopeePriceFromText(pageSource, /R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)\s*(?:no\s*pix|com\s*cupom|à\s*vista)/i)
      || shopeePriceFromText(surroundingText, /R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)/i)
      || shopeePriceFromText(pageSource, /R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)/i);
    const oldFromText = shopeePriceFromText(surroundingText, /(?:de|por\s+apenas|antes)\s*R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)/i)
      || shopeePriceFromText(pageText, /(?:de|por\s+apenas|antes)\s*R\s*\$\s*([\d.]+(?:\s*[,\.]\s*\d{2})?)/i);
    const embeddedCurrentPrice = shopeeEmbeddedNumber(embedded, ['price_min', 'price'], 100000);
    const embeddedOriginalPrice = shopeeEmbeddedNumber(embedded, ['price_before_discount_min', 'price_before_discount'], 100000);
    const visibleCurrent = prices.find(({ crossed }) => !crossed);
    const markupPrices = shopeePriceNumbers(pageMarkup);
    const currentPrice = number(offer.price) || currentFromText || shopeePriceFromElements() || visibleCurrent?.value || embeddedCurrentPrice || prices[0]?.value || markupPrices[0] || number(attr('meta[itemprop="price"]'));
    const priceNumbersNearProduct = [...new Set([
      ...prices.map(({ value }) => value),
      ...shopeePriceNumbers(surroundingText),
    ])];
    // Em "R$ 56,00 - R$ 100,00", os dois valores pertencem à faixa de variações.
    // Nenhum deles pode ser confundido com o preço antigo/riscado.
    const rangePrices = new Set([
      ...shopeeRangePrices(surroundingText),
      ...shopeeRangePrices(pageSource),
    ]);
    // A Shopee também usa somente "-70%" ao lado do preço riscado, sem a palavra OFF.
    const rangeReferencePrice = /(?:%\s*off|-\s*\d{1,2}%|desconto|economize)/i.test(surroundingText)
      ? priceNumbersNearProduct.filter((value) => !rangePrices.has(value) && value > currentPrice * 1.2).sort((a, b) => b - a)[0] || 0
      : 0;
    const nearbyVisualReference = visibleCurrent
      ? prices.filter(({ value, top }) => !rangePrices.has(value) && value > currentPrice * 1.2 && Math.abs(top - visibleCurrent.top) < 420)
        .sort((a, b) => b.value - a.value)[0]?.value || 0
      : 0;
    const crossedReferencePrice = prices.find(({ crossed, value }) => crossed && !rangePrices.has(value))?.value || 0;
    const originalPrice = number(offer.highPrice) || shopeeStruckPrice(rangePrices) || crossedReferencePrice || (oldFromText !== currentPrice ? oldFromText : 0) || embeddedOriginalPrice || nearbyVisualReference || rangeReferencePrice;
    return {
      marketplace: 'shopee',
      title,
      image: shopeeImage(structured) || shopeeEmbeddedImage(embedded),
      currentPrice,
      originalPrice,
      rating: rating.replace('.', ','),
      reviewCount,
      commentCount: shopeeCompactCount(pageText.match(/(\d+(?:[,.]\d+)?\s*(?:mil|k)?|\d{1,3}(?:\.\d{3})*)\s*coment[aá]rios/i)?.[1]) || reviewCount,
      reviewSummary: shopeeReviewSummary(rating.replace('.', ','), reviewCount),
      sourceCategory: shopeeCategory(),
      description: summarizeDescription(shopeeDescription()),
      publicUrl: location.href,
      availability: /esgotado|indispon[ií]vel|produto removido|n[aã]o est[aá] dispon[ií]vel/i.test(pageText) ? 'unavailable' : 'pending'
    };
  }

  function captureProduct() {
    return captureMercadoLivre();
  }

  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  function isVisible(element) {
    if (!element || !element.getClientRects().length) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
  }

  function findGeneratedAffiliateLink() {
    const candidates = [...document.querySelectorAll('input, textarea, a[href]')]
      .filter(isVisible)
      .map((element) => clean(element.value || element.href || element.getAttribute('href')))
      .filter((value) => /^https:\/\/meli\.la\//i.test(value));
    return candidates[0] || '';
  }

  function findAffiliateShareButton() {
    const candidates = [...document.querySelectorAll('button, a, [role="button"]')]
      .filter(isVisible)
      .filter((element) => /compartilhar/i.test(clean(element.innerText || element.textContent || element.getAttribute('aria-label'))));
    // A Barra de Afiliados fica no topo. Assim evitamos usar o compartilhamento
    // comum da página do produto quando os dois estão visíveis.
    return candidates.find((element) => element.getBoundingClientRect().top < 180) || candidates[0] || null;
  }

  async function generateAffiliateLink() {
    const alreadyGenerated = findGeneratedAffiliateLink();
    if (alreadyGenerated) return { ok: true, affiliateUrl: alreadyGenerated };

    const shareButton = findAffiliateShareButton();
    if (!shareButton) {
      return {
        ok: false,
        message: 'Não encontrei o botão “Compartilhar” da Barra de Afiliados. Confirme que você está logado no Mercado Livre como afiliado.'
      };
    }

    shareButton.click();
    // A janela da Barra de Afiliados pode demorar alguns segundos para montar o
    // campo com meli.la. Fazemos várias leituras na mesma execução para que o
    // usuário não precise abrir a extensão uma segunda vez.
    for (let attempt = 0; attempt < 16; attempt += 1) {
      await wait(500);
      const generatedLink = findGeneratedAffiliateLink();
      if (generatedLink) return { ok: true, affiliateUrl: generatedLink };
    }

    return {
      ok: false,
      message: 'A janela oficial foi aberta, mas o link não apareceu após alguns segundos. Gere-o nessa janela e use o campo manual como alternativa.'
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'economizai-capture-product') {
      const capture = captureProduct();
      if (!capture.title && !capture.currentPrice) {
        sendResponse({ ok: false, message: 'Não encontrei informações suficientes nesta página. Aguarde o produto terminar de carregar e tente novamente.' });
        return;
      }
      sendResponse({ ok: true, capture });
      return;
    }
    if (message?.type === 'economizai-generate-affiliate-link') {
      generateAffiliateLink()
        .then(sendResponse)
        .catch(() => sendResponse({ ok: false, message: 'Não foi possível ler o link gerado pela Barra de Afiliados.' }));
      return true;
    }
  });
})();

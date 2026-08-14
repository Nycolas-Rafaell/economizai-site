function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'outros';
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createSupabaseOfferStore(config) {
  const projectUrl = String(config.SUPABASE_URL || '').replace(/\/$/, '');
  const secretKey = String(config.SUPABASE_SECRET_KEY || '');
  const enabled = /^https:\/\/.+\.supabase\.co$/i.test(projectUrl) && secretKey.startsWith('sb_secret_');

  async function request(path, options = {}) {
    // Uma chave nova pode chegar alguns segundos antes da sincronização do gateway.
    // Repetimos apenas essa falha transitória, sem ocultar erros reais de acesso.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${projectUrl}/rest/v1/${path}`, {
        method: options.method || 'GET',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.prefer ? { Prefer: options.prefer } : {}),
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const text = await response.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
      if (response.ok) return payload;

      const message = payload?.message || payload?.hint || payload?.details || `HTTP ${response.status}`;
      if (attempt === 0 && /jwt issued at future/i.test(message)) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
      throw new Error(`Supabase: ${message}`);
    }
  }

  async function listAll(table, query = '') {
    const results = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const separator = query ? '&' : '?';
      const page = await request(`${table}${query}${separator}offset=${offset}&limit=${pageSize}`);
      results.push(...(Array.isArray(page) ? page : []));
      if (!Array.isArray(page) || page.length < pageSize) return results;
    }
  }

  async function lookupId(table, slug) {
    const rows = await request(`${table}?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (!rows?.[0]?.id) throw new Error(`Supabase: ${table} não contém o registro “${slug}”.`);
    return rows[0].id;
  }

  async function readLastHistory(offerId) {
    const rows = await request(`price_history?select=price,recorded_at&offer_id=eq.${encodeURIComponent(offerId)}&order=recorded_at.desc&limit=1`);
    return rows?.[0] || null;
  }

  async function persistOffer(offer, { preserveHistory = false } = {}) {
    const marketplaceSlug = offer.marketplace === 'shopee' ? 'shopee' : offer.marketplace === 'amazon' ? 'amazon' : offer.marketplace === 'aliexpress' ? 'aliexpress' : 'mercado-livre';
    const marketplaceId = await lookupId('marketplaces', marketplaceSlug);
    const categorySlug = slugify(offer.category || 'outros');
    const categoryId = await lookupId('categories', categorySlug);
    const subcategorySlug = offer.subcategory ? slugify(offer.subcategory) : null;
    let subcategoryId = null;
    if (subcategorySlug) {
      try { subcategoryId = await lookupId('categories', subcategorySlug); } catch { /* tipo ainda não cadastrado */ }
    }

    const productSlug = `legacy-${slugify(offer.id)}`;
    const productRows = await request('products?on_conflict=slug', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [{
        slug: productSlug,
        title: offer.title,
        description: offer.description || null,
        review_summary: offer.reviewSummary || null,
        rating: asNumber(String(offer.rating || '').replace(',', '.')),
        review_count: Number(String(offer.reviewCount || '0').replace(/\D/g, '')) || 0,
        comment_count: Number(String(offer.commentCount || '0').replace(/\D/g, '')) || 0,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        is_published: offer.available !== false,
      }],
    });
    const product = productRows?.[0];
    if (!product?.id) throw new Error('Supabase: não foi possível salvar o produto.');

    await request(`product_images?product_id=eq.${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    if (offer.image) {
      await request('product_images', {
        method: 'POST', prefer: 'return=minimal',
        body: [{ product_id: product.id, image_url: offer.image, alt_text: offer.title, is_primary: true }],
      });
    }

    const publicationStatus = ['available', 'unavailable', 'pending'].includes(offer.availabilityStatus)
      ? offer.availabilityStatus : (offer.available === false ? 'unavailable' : 'available');
    const externalProductId = String(offer.id);
    const offerIdentity = `marketplace_id=eq.${encodeURIComponent(marketplaceId)}&external_product_id=eq.${encodeURIComponent(externalProductId)}`;
    const existingRows = await request(`offers?select=id&${offerIdentity}&order=created_at.asc`);
    const offerPayload = {
      product_id: product.id,
      marketplace_id: marketplaceId,
      external_product_id: externalProductId,
      public_url: offer.publicUrl,
      affiliate_url: offer.affiliateUrl,
      current_price: Number(offer.currentPrice),
      original_price: offer.originalPrice == null ? null : Number(offer.originalPrice),
      discount_percent: offer.discountPct == null ? null : Number(offer.discountPct),
      currency_code: offer.currency || 'BRL',
      free_shipping: Boolean(offer.freeShipping),
      availability_status: publicationStatus === 'unavailable' ? 'unavailable' : 'available',
      last_checked_at: offer.updatedAt || new Date().toISOString(),
      is_published: publicationStatus === 'available',
    };
    const offerRows = existingRows?.length
      ? await request(`offers?${offerIdentity}`, { method: 'PATCH', prefer: 'return=representation', body: offerPayload })
      : await request('offers', { method: 'POST', prefer: 'return=representation', body: [offerPayload] });
    const savedOffer = offerRows?.[0];
    if (!savedOffer?.id) throw new Error('Supabase: não foi possível salvar a oferta.');

    const history = Array.isArray(offer.priceHistory) && offer.priceHistory.length
      ? offer.priceHistory
      : [{ price: offer.currentPrice, at: offer.updatedAt || new Date().toISOString() }];
    if (preserveHistory) {
      await request('price_history', {
        method: 'POST', prefer: 'return=minimal',
        body: history.map((item) => ({
          offer_id: savedOffer.id,
          price: Number(item.price),
          original_price: offer.originalPrice == null ? null : Number(offer.originalPrice),
          recorded_at: item.at || new Date().toISOString(),
          source: 'migracao-local',
        })),
      });
    } else {
      const lastHistory = await readLastHistory(savedOffer.id);
      const latest = history.at(-1);
      if (!lastHistory || Number(lastHistory.price) !== Number(latest.price)) {
        await request('price_history', {
          method: 'POST', prefer: 'return=minimal',
          body: [{ offer_id: savedOffer.id, price: Number(latest.price), original_price: offer.originalPrice == null ? null : Number(offer.originalPrice), recorded_at: latest.at || new Date().toISOString(), source: 'painel' }],
        });
      }
    }
    // Alertas internos: uma alteração de preço pelo painel pode marcar a meta atingida
    // sem depender de e-mail, API paga ou qualquer serviço externo.
    await request(`user_price_alerts?offer_id=eq.${encodeURIComponent(savedOffer.id)}&is_active=eq.true&target_price=gte.${encodeURIComponent(Number(offer.currentPrice))}`, {
      method: 'PATCH', prefer: 'return=minimal', body: { is_active: false, triggered_at: new Date().toISOString() },
    });
    return offer;
  }

  async function listOffers() {
    const [offers, products, marketplaces, categories, images, histories] = await Promise.all([
      listAll('offers', '?select=*&order=created_at.desc'),
      listAll('products', '?select=*'),
      listAll('marketplaces', '?select=id,slug'),
      listAll('categories', '?select=id,slug,name'),
      listAll('product_images', '?select=*&order=sort_order.asc'),
      listAll('price_history', '?select=*&order=recorded_at.asc'),
    ]);
    const productsById = new Map(products.map((item) => [item.id, item]));
    const marketplacesById = new Map(marketplaces.map((item) => [item.id, item]));
    const categoriesById = new Map(categories.map((item) => [item.id, item]));
    const imagesByProductId = new Map();
    images.forEach((item) => {
      const current = imagesByProductId.get(item.product_id) || [];
      current.push(item); imagesByProductId.set(item.product_id, current);
    });
    const historyByOfferId = new Map();
    histories.forEach((item) => {
      const current = historyByOfferId.get(item.offer_id) || [];
      current.push(item); historyByOfferId.set(item.offer_id, current);
    });
    const seenOffers = new Set();
    const uniqueOffers = offers.filter((item) => {
      const key = `${item.marketplace_id}:${item.external_product_id || item.id}`;
      if (seenOffers.has(key)) return false;
      seenOffers.add(key); return true;
    });
    return uniqueOffers.map((item) => {
      const product = productsById.get(item.product_id) || {};
      const marketplace = marketplacesById.get(item.marketplace_id) || {};
      const productImages = imagesByProductId.get(product.id) || [];
      const primaryImage = productImages.find((image) => image.is_primary) || productImages[0];
      const availabilityStatus = item.is_published === false && item.availability_status !== 'unavailable'
        ? 'pending' : (item.availability_status === 'available' ? 'available' : 'unavailable');
      return {
        id: item.external_product_id || item.id,
        marketplace: String(marketplace.slug || 'mercado-livre').replaceAll('-', '_'),
        category: categoriesById.get(product.category_id)?.slug || 'outros',
        subcategory: categoriesById.get(product.subcategory_id)?.name || '',
        title: product.title || 'Produto sem título',
        image: primaryImage?.image_url || null,
        currentPrice: Number(item.current_price),
        originalPrice: item.original_price == null ? null : Number(item.original_price),
        discountPct: item.discount_percent == null ? 0 : Number(item.discount_percent),
        currency: item.currency_code || 'BRL',
        freeShipping: Boolean(item.free_shipping),
        publicUrl: item.public_url,
        affiliateUrl: item.affiliate_url,
        description: product.description || '',
        reviewSummary: product.review_summary || '',
        rating: product.rating == null ? '' : String(product.rating).replace('.', ','),
        reviewCount: product.review_count ? String(product.review_count) : '',
        commentCount: product.comment_count ? String(product.comment_count) : '',
        available: availabilityStatus === 'available',
        availabilityStatus,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        priceHistory: (historyByOfferId.get(item.id) || []).map((history) => ({ price: Number(history.price), at: history.recorded_at })),
      };
    });
  }

  async function initialize(legacyOffers) {
    if (!enabled) return { enabled: false, migrated: 0 };
    const offers = await listAll('offers', '?select=id&limit=1');
    if (offers.length) return { enabled: true, migrated: 0 };
    const legacy = legacyOffers();
    for (const offer of legacy) await persistOffer(offer, { preserveHistory: true });
    return { enabled: true, migrated: legacy.length };
  }

  async function deleteOffer(externalProductId) {
    const rows = await request(`offers?select=id&external_product_id=eq.${encodeURIComponent(String(externalProductId))}`);
    if (!rows?.length) return 0;
    await Promise.all(rows.map((row) => request(`price_history?offer_id=eq.${encodeURIComponent(row.id)}`, { method: 'DELETE', prefer: 'return=minimal' })));
    await request(`offers?external_product_id=eq.${encodeURIComponent(String(externalProductId))}`, { method: 'DELETE', prefer: 'return=minimal' });
    return rows.length;
  }

  return { enabled, initialize, listOffers, saveOffer: persistOffer, deleteOffer };
}

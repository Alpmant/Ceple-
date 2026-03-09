// ═══════════════════════════════════════════════════════
import { supabase } from './supabase.js'
//  ceple-api.js  —  Supabase Entegrasyon Katmanı
//  Her iki HTML dosyasına da import edilir:
//  <script src="ceple-api.js"></script>
// ═══════════════════════════════════════════════════════
export async function getActiveCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Supabase hata:', error)
    return []
  }

  return data
}


// ════════════════════════════════════════════════════════
//  1. İŞLETME & KAMPANYA — Kullanıcı uygulaması
// ════════════════════════════════════════════════════════

/**
 * Tüm işletmeleri çeker.
 * Ana sayfa / harita için sadece aktif kampanyası olan işletmeler kullanılır.
 * Arama tarafında ise kampanya vermeyen işletmeler de bulunabilir.
 */
function _cepleCampaignEndsAtMs(c) {
  if(!c) return 0;

  const publishMode = c.publish_mode || c.publishMode || 'once';
  const updatedAt   = c.updated_at || c.updatedAt || c.created_at || c.createdAt || null;

  if(publishMode === 'once' && updatedAt) {
    const publishedMs = new Date(updatedAt).getTime();
    if(!isNaN(publishedMs)) return publishedMs + (24 * 60 * 60 * 1000);
  }

  const rawDateEnd = c.date_end || c.dateEnd || null;
  if(rawDateEnd) {
    const useHours = c.use_hours || c.useHours || false;
    const hourEnd  = c.hour_end || c.hourEnd || '23:59';
    const [hh, mm] = String(useHours ? hourEnd : '23:59').split(':');
    const endMs = new Date(`${rawDateEnd}T${hh || '23'}:${mm || '59'}:59`).getTime();
    if(!isNaN(endMs)) return endMs;
  }

  return 0;
}

function _cepleCampaignIsActive(c) {
  if(!c) return false;
  if(String(c.status || '').toLowerCase() !== 'live') return false;

  const endMs = _cepleCampaignEndsAtMs(c);
  if(!endMs) return true;

  return Date.now() < endMs;
}

window.loadBusinessesFromDB = async function() {
  try {
    const [{ data: bizData, error: bizErr }, { data: campData, error: campErr }] = await Promise.all([
      supa.from('businesses').select('*'),
      supa.from('campaigns').select('*')
    ]);

    if(bizErr)  throw bizErr;
    if(campErr) throw campErr;

    if(typeof businesses !== 'object') {
      console.warn('⚠️ businesses objesi bulunamadı');
      return;
    }

    Object.keys(businesses).forEach(k => delete businesses[k]);

    bizData.forEach(function(b) {
      const latestActiveCampaign = (campData || [])
        .filter(c => c.business_id === b.id && _cepleCampaignIsActive(c))
        .sort((a, z) => new Date(z.updated_at || z.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0] || null;

      businesses[b.id] = {
        lat:             parseFloat(b.lat) || 0,
        lng:             parseFloat(b.lng) || 0,
        name:            b.name           || '',
        emoji:           b.emoji          || '🏪',
        heroBg:          b.hero_bg        || 'linear-gradient(135deg,#FFF0E8,#FFD8B8)',
        cat:             b.category       || '',
        open:            b.is_open !== false,
        phone:           b.phone          || '',
        whatsappEnabled: b.whatsapp       || false,
        whatsappPhone:   b.whatsapp_phone || '',
        addr:            b.address        || '',
        mapQuery:        encodeURIComponent(b.address || b.name),
        hoursSummary:    b.hours_summary  || '',
        weeklyHours:     b.weekly_hours   || {},
        photos:          b.photos         || [],
        panelCampaign: latestActiveCampaign ? {
          title:            latestActiveCampaign.title           || '',
          headline:         latestActiveCampaign.headline        || '',
          baseType:         latestActiveCampaign.base_type       || 'percent',
          percent:          latestActiveCampaign.percent         || 0,
          fixedAmount:      latestActiveCampaign.fixed_amount    || 0,
          fixedPrice:       latestActiveCampaign.fixed_price     || 0,
          fixedPriceHasOld: !!(latestActiveCampaign.fixed_price_old),
          fixedPriceOld:    latestActiveCampaign.fixed_price_old || 0,
          buyX:             latestActiveCampaign.buy_x           || 2,
          getY:             latestActiveCampaign.get_y           || 1,
          customMain:       latestActiveCampaign.custom_main     || '',
          customSub:        latestActiveCampaign.custom_sub      || '',
          description:      latestActiveCampaign.description     || '',
          dateStart:        latestActiveCampaign.date_start      || '',
          dateEnd:          latestActiveCampaign.date_end        || '',
          useHours:         latestActiveCampaign.use_hours       || false,
          hourStart:        latestActiveCampaign.hour_start      || '',
          hourEnd:          latestActiveCampaign.hour_end        || '',
          status:           latestActiveCampaign.status          || '',
          publishMode:      latestActiveCampaign.publish_mode    || 'once',
          recurringDays:    latestActiveCampaign.recurring_days  || null,
          updatedAt:        latestActiveCampaign.updated_at      || '',
          createdAt:        latestActiveCampaign.created_at      || ''
        } : null
      };
    });

    if(typeof normalizeBusinesses === 'function') normalizeBusinesses();

    const activeCount = Object.values(businesses).filter(function(b){
      return !!(b && b.panelCampaign);
    }).length;

    console.log(`✅ Ceple API: ${bizData.length} işletme, ${activeCount} aktif kampanya yüklendi`);

    if(typeof renderHome === 'function') renderHome();
    if(typeof renderUrgency === 'function') renderUrgency();
    if(typeof refreshMapMarkers === 'function' && window._mapInstance) refreshMapMarkers();

  } catch(err) {
    console.warn('⚠️ Supabase bağlantısı başarısız, yerel veri kullanılıyor:', err.message);
    if(typeof normalizeBusinesses === 'function') normalizeBusinesses();
    if(typeof renderHome === 'function') renderHome();
    if(typeof renderUrgency === 'function') renderUrgency();
    if(typeof refreshMapMarkers === 'function' && window._mapInstance) refreshMapMarkers();
  }
};


// ════════════════════════════════════════════════════════
//  2. KULLANICI AUTH
// ════════════════════════════════════════════════════════

/** Telefona OTP gönder */
window.cepleAuthSendOtp = async function(phone) {
  const { error } = await supa.auth.signInWithOtp({
    phone: '+90' + phone.replace(/^0/, '')
  });
  if(error) { console.error('OTP gönderilemedi:', error.message); return false; }
  return true;
};

/** OTP doğrula, user döner */
window.cepleAuthVerifyOtp = async function(phone, token) {
  const { data, error } = await supa.auth.verifyOtp({
    phone: '+90' + phone.replace(/^0/, ''),
    token,
    type: 'sms'
  });
  if(error) { console.error('OTP hatası:', error.message); return null; }
  return data.user;
};

/** Oturumu kapat */
window.cepleAuthSignOut = async function() {
  await supa.auth.signOut();
};

/** Giriş yapan kullanıcıyı getir */
window.cepleGetUser = async function() {
  const { data: { user } } = await supa.auth.getUser();
  return user;
};


// ════════════════════════════════════════════════════════
//  3. FAVORİLER
// ════════════════════════════════════════════════════════

/** Favorileri DB'den çek, favorites objesine doldur */
window.cepleLoadFavs = async function() {
  const user = await cepleGetUser();
  if(!user) return;

  const { data } = await supa
    .from('favorites')
    .select('business_id')
    .eq('user_id', user.id);

  if(data) data.forEach(f => { favorites[f.business_id] = true; });
};

/** Favori ekle / kaldır — true: eklendi, false: kaldırıldı */
window.cepleToggleFav = async function(bizId) {
  const user = await cepleGetUser();
  if(!user) return null;

  const { data: existing } = await supa
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', bizId)
    .maybeSingle();

  if(existing) {
    await supa.from('favorites').delete().eq('id', existing.id);
    return false;
  } else {
    await supa.from('favorites').insert({ user_id: user.id, business_id: bizId });
    return true;
  }
};


// ════════════════════════════════════════════════════════
//  4. KAMPANYA KAYDET / YAYINLA — İşletme paneli
// ════════════════════════════════════════════════════════

/** Panel'den kampanya yayınla veya taslak kaydet */
window.cepleSaveCampaign = async function(status) {
  try {
    const b = window.state?.business || {};
    const d = window.state?.draft    || {};

    // Başlık boşsa kaydetme
    if(!d.title || d.title.trim() === '') return false;

    // İşletmeyi bul veya oluştur
    const ownerEmail = _cepleOwnerEmail();
    let { data: existingBiz } = await supa
      .from('businesses')
      .select('id')
      .eq('owner_email', ownerEmail)
      .maybeSingle();

    let bizId = existingBiz?.id;

    if(!bizId) {
      const slug = (b.name || 'isletme')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 30) + '-' + Date.now().toString(36);

      const { data: newBiz, error: bizErr } = await supa
        .from('businesses')
        .insert({
          id:          slug,
          name:        b.name     || 'İşletmem',
          category:    b.category || '',
          address:     b.address  || '',
          phone:       b.phone    || '',
          lat:         37.7489,
          lng:         27.4101,
          is_open:     true,
          owner_email: ownerEmail
        })
        .select('id')
        .single();

      if(bizErr) throw bizErr;
      bizId = newBiz.id;
    }

    const payload = {
      business_id:     bizId,
      title:           d.title        || '',
      headline:        d.headline     || '',
      base_type:       d.baseType     || 'percent',
      percent:         d.percent      || null,
      fixed_amount:    d.fixedAmount  || null,
      fixed_price:     d.fixedPrice   || null,
      fixed_price_old: d.fixedPriceHasOld ? d.fixedPriceOld : null,
      buy_x:           d.buyX         || null,
      get_y:           d.getY         || null,
      custom_main:     d.customMain   || null,
      custom_sub:      d.customSub    || null,
      description:     d.description  || '',
      date_start:      d.dateStart    || null,
      date_end:        d.dateEnd      || null,
      use_hours:       d.useHours     || false,
      hour_start:      d.hourStart    || null,
      hour_end:        d.hourEnd      || null,
      status:          status,
      publish_mode:    d.publishMode  || 'once',
      recurring_days:  d.recurringDays || null,
      updated_at:      new Date().toISOString()
    };

    // Mevcut live/draft kampanya varsa güncelle, yoksa yeni ekle
    const editingId = window.state?._editingCampId || null;

    if(editingId) {
      // Düzenleme modunda — direkt o kaydı güncelle
      const { error } = await supa
        .from('campaigns')
        .update(payload)
        .eq('id', editingId);
      if(error) throw error;
    } else {
      // Yeni kampanya — aynı işletmenin mevcut live/draft'ını bul
      const { data: existing } = await supa
        .from('campaigns')
        .select('id')
        .eq('business_id', bizId)
        .in('status', ['live', 'draft'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if(existing) {
        const { error } = await supa
          .from('campaigns')
          .update(payload)
          .eq('id', existing.id);
        if(error) throw error;
      } else {
        const { error } = await supa
          .from('campaigns')
          .insert(payload);
        if(error) throw error;
      }
    }

    console.log(`✅ Ceple API: Kampanya kaydedildi [${status}]`);
    return true;

  } catch(err) {
    console.error('❌ Kampanya kayıt hatası:', err.message);
    return false;
  }
};

function _cepleOwnerEmail() {
  const type = localStorage.getItem('accountType') || 's';
  return type === 's' ? 'tek@ceple.com' :
         type === 'm' ? 'coklu@ceple.com' : 'kurumsal@ceple.com';
}


// ════════════════════════════════════════════════════════
//  5. GERÇEK ZAMANLI GÜNCELLEME
//  Kampanya yayınlanınca kullanıcı uygulaması otomatik yenilenir
// ════════════════════════════════════════════════════════

window.cepleStartRealtime = function() {
  // Gerçek zamanlı WebSocket
  supa
    .channel('ceple-live')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'campaigns'
    }, function() {
      console.log('🔄 Yeni kampanya algılandı, yenileniyor...');
      if(typeof loadBusinessesFromDB === 'function') loadBusinessesFromDB();
    })
    .subscribe();

  // Yedek: her 30 saniyede bir polling
  setInterval(function() {
    if(typeof loadBusinessesFromDB === 'function') loadBusinessesFromDB();
  }, 30000);

  console.log('🟢 Ceple API: Gerçek zamanlı güncelleme aktif (30sn polling)');
};


// ════════════════════════════════════════════════════════
//  6. FOTOĞRAF YÜKLEME — Supabase Storage
// ════════════════════════════════════════════════════════

/** Fotoğraf yükle, public URL döner */
window.cepleUploadPhoto = async function(file, bizId) {
  const ext  = file.name.split('.').pop();
  const path = `${bizId}/${Date.now()}.${ext}`;

  const { error } = await supa.storage
    .from('business-photos')
    .upload(path, file, { upsert: true });

  if(error) { console.error('Fotoğraf yükleme hatası:', error.message); return null; }

  const { data } = supa.storage.from('business-photos').getPublicUrl(path);
  return data.publicUrl;
};

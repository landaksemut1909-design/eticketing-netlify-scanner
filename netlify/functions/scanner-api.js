/**
 * Proxy privat: browser -> Netlify Function -> Google Apps Script doPost.
 * Rahasia SCANNER_API_KEY tidak pernah dikirim ke browser.
 */
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { ok: false, error: 'Metode tidak diizinkan.' });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const apiKey = process.env.SCANNER_API_KEY;
  if (!gasUrl || !apiKey) {
    return response(500, { ok: false, error: 'Konfigurasi Netlify belum lengkap. Periksa GAS_WEB_APP_URL dan SCANNER_API_KEY.' });
  }

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch (_) {
    return response(400, { ok: false, error: 'Format permintaan tidak valid.' });
  }

  const allowed = ['login', 'stats', 'checkin', 'logout'];
  if (!input || !allowed.includes(String(input.action || ''))) {
    return response(400, { ok: false, error: 'Aksi tidak dikenal.' });
  }

  const payload = {
    action: String(input.action),
    apiKey: apiKey,
    pin: String(input.pin || ''),
    token: String(input.token || ''),
    qrText: String(input.qrText || '')
  };

  try {
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const raw = await upstream.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return response(502, { ok: false, error: 'Respons Google Apps Script tidak dapat dibaca. Pastikan deployment terbaru sudah aktif dan akses Web App mengizinkan siapa saja.' });
    }
    return response(200, data);
  } catch (err) {
    return response(502, { ok: false, error: 'Tidak dapat menghubungi Google Apps Script: ' + String(err.message || err) });
  }
};

function response(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

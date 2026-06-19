// Envia mensagem de texto via Z-API.
// Variáveis necessárias: ZAPI_INSTANCE, ZAPI_TOKEN, ALARM_WHATSAPP_NUMBER
// Opcional: ZAPI_CLIENT_TOKEN (segurança extra, recomendado pelo Z-API)
async function sendWhatsApp(text, phoneOverride) {
  const instance     = (process.env.ZAPI_INSTANCE      || '').trim();
  const token        = (process.env.ZAPI_TOKEN         || '').trim();
  const clientToken  = (process.env.ZAPI_CLIENT_TOKEN  || '').trim();
  const number       = phoneOverride || (process.env.ALARM_WHATSAPP_NUMBER || '').trim();

  if (!instance || !token || !number) {
    throw new Error(
      'Z-API não configurada. Defina: ZAPI_INSTANCE, ZAPI_TOKEN, ALARM_WHATSAPP_NUMBER.'
    );
  }

  const headers = { 'Content-Type': 'application/json' };
  if (clientToken) headers['Client-Token'] = clientToken;

  const res = await fetch(
    `https://api.z-api.io/instances/${instance}/token/${token}/send-text`,
    {
      method:  'POST',
      headers,
      body:    JSON.stringify({ phone: number, message: text }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Z-API ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json().catch(() => ({}));
}

module.exports = { sendWhatsApp };

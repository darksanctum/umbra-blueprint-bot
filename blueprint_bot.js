const http = require('http');
const https = require('https');

// ============ CONFIGURACIÃ“N ============
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'umbra_verify_2026';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Page Token (no User Token)
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;
const KEYWORD = process.env.KEYWORD || 'blueprint';

// Validar configuraciÃ³n
if (!PAGE_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
  console.error('âŒ ERROR: Faltan variables de entorno:');
  console.error('   - PAGE_ACCESS_TOKEN');
  console.error('   - INSTAGRAM_USER_ID');
  process.exit(1);
}

const DM_MESSAGE = `Â¡Hola! ðŸ‘‹

Â¡Gracias por tu interÃ©s en el Blueprint!

ðŸ“˜ Es GRATIS - Los 5 principios fundamentales que el 90% ignora en el gym.

ðŸ‘‰ DescÃ¡rgalo aquÃ­:
https://umbralanding.vercel.app/#gratis

Â¿Quieres ir mÃ¡s profundo? Tenemos el Pack Completo con 4 guÃ­as por solo $997 MXN ðŸ”¥

ðŸ”— Ver todo: https://umbralanding.vercel.app`;

// ============ SERVIDOR ============
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

  // GET - VerificaciÃ³n de Meta
  if (req.method === 'GET' && url.pathname === '/webhook') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('ðŸ” VerificaciÃ³n Meta:', { mode, tokenMatch: token === VERIFY_TOKEN });

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('âœ… Webhook verificado por Meta');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
    } else {
      res.writeHead(403);
      res.end('Forbidden');
    }
    return;
  }

  // POST - Eventos de Instagram
  if (req.method === 'POST' && url.pathname === '/webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      console.log('ðŸ“¥ Evento recibido:', body.substring(0, 500));
      
      try {
        const data = JSON.parse(body);
        processInstagramEvent(data);
      } catch (e) {
        console.error('âŒ Error parsing:', e.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'EVENT_RECEIVED' }));
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Umbra Blueprint Bot' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ============ PROCESAR EVENTOS ============
function processInstagramEvent(data) {
  if (!data.entry) return;

  for (const entry of data.entry) {
    // Comentarios en posts
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'comments' && change.value) {
          const comment = change.value;
          const text = (comment.text || '').toLowerCase();
          const senderId = comment.from?.id;
          
          console.log(`ðŸ’¬ Comentario: "${comment.text}" de ID: ${senderId}`);
          
          if (text.includes(KEYWORD) && senderId) {
            console.log('ðŸŽ¯ Keyword detectada! Enviando DM a:', senderId);
            sendInstagramDM(senderId);
          }
        }
      }
    }

    // Story replies / DMs (messaging)
    if (entry.messaging) {
      for (const msg of entry.messaging) {
        const text = (msg.message?.text || '').toLowerCase();
        const senderId = msg.sender?.id;

        console.log(`ðŸ“© Mensaje recibido de ${senderId}: "${msg.message?.text}"`);

        if (text.includes(KEYWORD) && senderId) {
          console.log('ðŸŽ¯ Keyword detectada! Enviando DM...');
          sendInstagramDM(senderId);
        }
      }
    }
  }
}

// ============ ENVIAR DM VIA INSTAGRAM API ============
function sendInstagramDM(recipientId) {
  if (!recipientId) {
    console.error('âŒ No recipient ID');
    return;
  }

  const messageBody = JSON.stringify({
    recipient: { id: recipientId },
    message: { text: DM_MESSAGE }
  });

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/v18.0/${INSTAGRAM_USER_ID}/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(messageBody)
    }
  };

  console.log('ðŸ“¤ Enviando a:', options.path.split('?')[0]);

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log(`ðŸ“¨ Respuesta API (${res.statusCode}):`, data.substring(0, 200));
      if (res.statusCode === 200) {
        console.log('âœ… DM enviado exitosamente');
      } else {
        console.error('âŒ Error en respuesta:', data);
      }
    });
  });

  req.on('error', (e) => console.error('âŒ Error de red:', e.message));
  req.write(messageBody);
  req.end();
}

// ============ INICIAR ============
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('ðŸš€ UMBRA BLUEPRINT BOT');
  console.log('========================');
  console.log(`Puerto: ${PORT}`);
  console.log(`Keyword: "${KEYWORD}"`);
  console.log(`IG User ID: ${INSTAGRAM_USER_ID}`);
  console.log('========================');
  console.log('');
});

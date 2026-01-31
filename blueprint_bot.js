const http = require('http');
const https = require('https');

// ============ CONFIGURACIÃ“N (usa variables de entorno en producciÃ³n) ============
const PORT = process.env.PORT || 3847;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'umbra_verify_2026';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // REQUERIDO en producciÃ³n
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID; // REQUERIDO en producciÃ³n
const KEYWORD = process.env.KEYWORD || 'blueprint';

// Validar configuraciÃ³n crÃ­tica
if (!ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
  console.error('âŒ ERROR: Faltan variables de entorno requeridas:');
  console.error('   - ACCESS_TOKEN: Token de Instagram/Meta API');
  console.error('   - INSTAGRAM_USER_ID: ID de usuario de Instagram');
  console.error('');
  console.error('ConfigÃºralas en tu plataforma de hosting (Railway, Render, etc.)');
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
      console.log('âŒ VerificaciÃ³n fallida');
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
      console.log('ðŸ“¥ Evento recibido');
      
      try {
        const data = JSON.parse(body);
        processInstagramEvent(data);
      } catch (e) {
        console.error('âŒ Error parsing JSON:', e.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'EVENT_RECEIVED' }));
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'Umbra Blueprint Bot',
      timestamp: new Date().toISOString() 
    }));
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
          
          console.log(`ðŸ’¬ Comentario detectado con keyword check`);
          
          if (text.includes(KEYWORD)) {
            console.log('ðŸŽ¯ Keyword detectada! Enviando DM...');
            sendDM(comment.from?.id);
          }
        }
      }
    }

    // Story replies / DMs
    if (entry.messaging) {
      for (const msg of entry.messaging) {
        const text = (msg.message?.text || '').toLowerCase();
        const senderId = msg.sender?.id;
        const isStoryReply = msg.message?.reply_to?.story;

        console.log(`ðŸ“© ${isStoryReply ? 'Story reply' : 'DM'} recibido`);

        if (text.includes(KEYWORD)) {
          console.log('ðŸŽ¯ Keyword detectada! Enviando DM...');
          sendDM(senderId);
        }
      }
    }
  }
}

// ============ ENVIAR DM ============
function sendDM(recipientId) {
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
    path: `/v18.0/${INSTAGRAM_USER_ID}/messages?access_token=${ACCESS_TOKEN}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(messageBody)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`âœ… DM enviado exitosamente`);
      } else {
        console.error(`âŒ Error enviando DM (${res.statusCode})`);
      }
    });
  });

  req.on('error', (e) => {
    console.error('âŒ Error de red:', e.message);
  });

  req.write(messageBody);
  req.end();
}

// ============ INICIAR ============
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('ðŸš€ ================================');
  console.log('   UMBRA BLUEPRINT BOT');
  console.log('================================');
  console.log(`   Puerto: ${PORT}`);
  console.log(`   Keyword: "${KEYWORD}"`);
  console.log('   Tokens: âœ“ Configurados');
  console.log('================================');
  console.log('');
});

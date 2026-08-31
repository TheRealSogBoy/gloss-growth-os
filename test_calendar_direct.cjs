const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) return;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // Remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
});

async function testCalendar() {
  let google;
  try {
    ({ google } = require('googleapis'));
  } catch (e) {
    console.error('googleapis not installed:', e.message);
    process.exit(1);
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const privateKey = rawKey.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '');
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  console.log('Email:', email);
  console.log('CalendarId:', calendarId);
  console.log('Key starts with:', privateKey.substring(0, 40));

  if (!email || !privateKey || !calendarId) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);

    const event = {
      summary: '✅ Test - Gloss & Growth CRM',
      description: 'Evento de prueba de autenticación Google Calendar.',
      start: {
        dateTime: now.toISOString(),
        timeZone: 'America/Bogota',
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'America/Bogota',
      },
    };

    const res = await calendar.events.insert({ calendarId, requestBody: event });
    console.log('✅ Evento creado exitosamente!');
    console.log('🔗 Link:', res.data.htmlLink);
  } catch (err) {
    console.error('❌ Error de autenticación Google Calendar:', err.message);
    if (err.response?.data) {
      console.error('Detalle:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

testCalendar();

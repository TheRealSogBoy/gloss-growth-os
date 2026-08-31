export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, description, startDateTime, endDateTime, location } = req.body;

    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Missing required fields: title, startDateTime, endDateTime' });
    }

    // Dynamic import of googleapis (CommonJS compatibility layer for Vercel)
    const { google } = await import('googleapis');

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    // Strip surrounding quotes and convert literal \n to actual newlines
    const privateKey = rawKey.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '');
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!email || !privateKey || !calendarId) {
      return res.status(500).json({ error: 'Google Calendar credentials missing in environment' });
    }

    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: 'America/Bogota',
      },
      end: {
        dateTime: new Date(endDateTime).toISOString(),
        timeZone: 'America/Bogota',
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return res.status(200).json({ success: true, eventLink: response.data.htmlLink, eventId: response.data.id });
  } catch (err) {
    console.error('Calendar API error:', err?.message, err?.response?.data);
    return res.status(500).json({
      error: err.message,
      detail: err?.response?.data?.error || null,
    });
  }
}

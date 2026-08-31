import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, description, startDateTime, endDateTime, location } = req.body;

    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // Replace literal \n in env var with actual newlines
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!email || !privateKey || !calendarId) {
      throw new Error('Google Calendar credentials missing in environment');
    }

    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar.events']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startDateTime, // Expecting ISO string like '2026-08-31T10:00:00-05:00'
        timeZone: 'America/Bogota',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Bogota',
      }
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event
    });

    return res.status(200).json({ success: true, eventLink: response.data.htmlLink });
  } catch (error) {
    console.error('Calendar API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

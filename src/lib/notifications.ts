export const sendTelegramNotification = async (message: string, target: 'chat' | 'group' | 'both' = 'both') => {
  try {
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, target }),
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    // Silent fail to not block the UI
    return null;
  }
};

interface CalendarEventParams {
  title: string;
  description?: string;
  startDateTime: string; // ISO String
  endDateTime: string;   // ISO String
  location?: string;
}

export const createCalendarEvent = async (params: CalendarEventParams) => {
  try {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Failed to create Calendar event:', error);
    // Silent fail to not block the UI
    return null;
  }
};
export const updateCalendarEvent = async (params: CalendarEventParams & { eventId: string }) => {
  try {
    const res = await fetch('/api/calendar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
    return await res.json();
  } catch (error) {
    console.error('Failed to update Calendar event:', error);
    return null;
  }
};

export const deleteCalendarEvent = async (eventId: string) => {
  try {
    const res = await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
    return await res.json();
  } catch (error) {
    console.error('Failed to delete Calendar event:', error);
    return null;
  }
};

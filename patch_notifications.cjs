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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, target = 'both' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const groupId = process.env.TELEGRAM_GROUP_ID;

    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined');
    }

    const sendMsg = async (id) => {
      if (!id) return;
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: id,
          text: message,
          parse_mode: 'HTML'
        })
      });
      if (!response.ok) {
        console.error(`Telegram error for chat ${id}:`, await response.text());
      }
    };

    const promises = [];
    if (target === 'chat' || target === 'both') promises.push(sendMsg(chatId));
    if (target === 'group' || target === 'both') promises.push(sendMsg(groupId));

    await Promise.all(promises);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Telegram API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

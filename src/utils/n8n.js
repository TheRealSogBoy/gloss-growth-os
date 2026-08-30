export const triggerN8nWebhook = async (payload) => {
  const url = "https://ludicrous-scorpion.pikapod.net/webhook/calendario-eventos";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (error) {
    console.error("Error triggering n8n webhook:", error);
    return false;
  }
};

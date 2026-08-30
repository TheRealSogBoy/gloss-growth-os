const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const WF_ID = '9jjMVNCkfxG6ictV';
const BASE_URL = 'https://ludicrous-scorpion.pikapod.net/api/v1/workflows/' + WF_ID;

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function updateWorkflow() {
  try {
    const getRes = await fetch(BASE_URL, { headers });
    const wf = await getRes.json();

    // 1. Supabase Node Update
    const supaIndex = wf.nodes.findIndex(n => n.name === 'Supabase');
    if (supaIndex !== -1) {
        wf.nodes[supaIndex].parameters.operation = 'insert';
        wf.nodes[supaIndex].parameters.table = 'leads';
        wf.nodes[supaIndex].parameters.dataMode = 'defineBelow';
        wf.nodes[supaIndex].parameters.valuesToSend = {
            values: [
                { name: "nombre", value: "={{ $json.nombre || 'Lead sin nombre' }}" },
                { name: "email", value: "={{ $json.email || null }}" },
                { name: "telefono", value: "={{ $json.telefono || null }}" },
                { name: "estado", value: "Nuevo" },
                { name: "categoria", value: "={{ $json.categoria || 'General' }}" },
                { name: "score", value: "={{ $json.score || 50 }}" },
                { name: "detalles", value: "={{ $json.analisis_gemini || $json.body }}" }
            ]
        };
    }

    // 2. Telegram Node Update
    const tgIndex = wf.nodes.findIndex(n => n.name === 'Telegram');
    if (tgIndex !== -1) {
        wf.nodes[tgIndex].parameters.chatId = '-1004490736144';
        wf.nodes[tgIndex].parameters.text = "🔥 <b>Nuevo Lead Calificado</b>\n\n<b>Nombre:</b> {{ $json.nombre }}\n<b>Teléfono:</b> {{ $json.telefono }}\n<b>Email:</b> {{ $json.email }}\n<b>Interés:</b> {{ $json.categoria }}\n<b>Score:</b> {{ $json.score }}/100\n<b>Análisis:</b> {{ $json.analisis_gemini || 'N/A' }}";
        wf.nodes[tgIndex].parameters.additionalFields = wf.nodes[tgIndex].parameters.additionalFields || {};
        wf.nodes[tgIndex].parameters.additionalFields.parse_mode = 'HTML';
    }

    const payload = {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings || {}
    };

    const putRes = await fetch(BASE_URL, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (putRes.ok) {
      const data = await putRes.json();
      console.log("[SUCCESS] Workflow updated successfully!", data.id);
      
      // Activate the workflow
      const activateRes = await fetch(BASE_URL + '/activate', {
          method: 'POST',
          headers: headers
      });
      if (activateRes.ok) {
          console.log("[SUCCESS] Workflow activated successfully!");
      } else {
          console.error("[ERROR] Failed to activate workflow:", await activateRes.text());
      }
    } else {
      console.error("[ERROR] Failed to update workflow:", await putRes.text());
    }
  } catch (error) {
    console.error("[ERROR]", error);
  }
}

updateWorkflow();

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const WF_ID = '6oh44pqFjV2RLpYs';
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

    const calendarNodeIndex = wf.nodes.findIndex(n => n.name === 'Google Calendar');

    // Add attendees (in n8n Calendar node it is an array or list)
    wf.nodes[calendarNodeIndex].parameters.attendees = [
      "cardea285@gmail.com",
      "={{ $json.email }}"
    ];
    
    // Add sendUpdates
    wf.nodes[calendarNodeIndex].parameters.sendUpdates = "all";
    if (!wf.nodes[calendarNodeIndex].parameters.options) {
      wf.nodes[calendarNodeIndex].parameters.options = {};
    }
    wf.nodes[calendarNodeIndex].parameters.options.sendUpdates = "all";

    // Clean up response for PUT request
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
    } else {
      console.error("[ERROR] Failed to update workflow:", await putRes.text());
    }
  } catch (error) {
    console.error("[ERROR]", error);
  }
}

updateWorkflow();

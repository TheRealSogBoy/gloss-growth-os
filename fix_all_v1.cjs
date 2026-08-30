const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const BASE_URL = 'https://ludicrous-scorpion.pikapod.net/api/v1/workflows';

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function fixAll() {
  const getRes = await fetch(BASE_URL, { headers });
  const data = await getRes.json();
  const workflows = data.data;

  for (const wfStub of workflows) {
    const wfRes = await fetch(BASE_URL + '/' + wfStub.id, { headers });
    const wf = await wfRes.json();
    let changed = false;

    for (const node of wf.nodes) {
      if (node.type === 'n8n-nodes-base.supabase') {
        node.typeVersion = 1;
        if (node.parameters.table) node.parameters.tableId = node.parameters.table;
        if (node.parameters.tableId) node.parameters.table = node.parameters.tableId;
        changed = true;
      }
    }

    if (changed) {
      const payload = {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings || {}
      };
      const putRes = await fetch(BASE_URL + '/' + wf.id, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      console.log("Updated " + wf.id + " - " + wf.name, putRes.ok);
    }
  }
}
fixAll();

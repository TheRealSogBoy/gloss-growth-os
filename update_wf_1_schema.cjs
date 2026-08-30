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

    // Find the Supabase Node
    const supaIndex = wf.nodes.findIndex(n => n.name === 'Supabase' || n.type === 'n8n-nodes-base.supabase');
    
    if (supaIndex !== -1) {
        wf.nodes[supaIndex].parameters = {
            ...wf.nodes[supaIndex].parameters,
            useCustomSchema: true,
            schema: 'public',
            resource: 'row',
            operation: 'insert',
            table: 'leads',
            dataMode: 'defineBelow',
            valuesToSend: {
                values: [
                    { name: 'nombre', value: '={{ $json.nombre }}' },
                    { name: 'email', value: '={{ $json.email }}' },
                    { name: 'telefono', value: '={{ $json.telefono }}' },
                    { name: 'categoria', value: '={{ $json.categoria }}' },
                    { name: 'score', value: '={{ $json.score }}' },
                    { name: 'estado', value: 'Nuevo' }
                ]
            }
        };
    } else {
        console.error("Supabase node not found");
        return;
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
    } else {
      console.error("[ERROR] Failed to update workflow:", await putRes.text());
    }
  } catch (error) {
    console.error("[ERROR]", error);
  }
}

updateWorkflow();

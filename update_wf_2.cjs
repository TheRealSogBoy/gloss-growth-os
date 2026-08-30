const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const WF_ID = '6oh44pqFjV2RLpYs';
const BASE_URL = 'https://ludicrous-scorpion.pikapod.net/api/v1';

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function run() {
  try {
    // 1. Fetch credentials
    const credsRes = await fetch(BASE_URL + '/credentials', { headers });
    let gmailCredId = null;
    let gmailCredName = null;
    if (credsRes.ok) {
        const creds = await credsRes.json();
        const gmailCred = creds.data && creds.data.find(c => c.type === 'gmailOAuth2' || c.type === 'gmailApi');
        if (gmailCred) {
            gmailCredId = gmailCred.id;
            gmailCredName = gmailCred.name;
        }
    }

    // 2. Fetch Workflow
    const getRes = await fetch(BASE_URL + '/workflows/' + WF_ID, { headers });
    const wf = await getRes.json();

    // Update Calendar Node
    const calIndex = wf.nodes.findIndex(n => n.name === 'Google Calendar' || n.type === 'n8n-nodes-base.googleCalendar');
    if (calIndex !== -1) {
        wf.nodes[calIndex].parameters.attendees = [
            "cardea285@gmail.com",
            "santiagokansas890@gmail.com"
        ];
        wf.nodes[calIndex].parameters.sendUpdates = "all";
        wf.nodes[calIndex].parameters.options = wf.nodes[calIndex].parameters.options || {};
        wf.nodes[calIndex].parameters.options.sendUpdates = "all";
    }

    // Update Supabase Node
    const supaIndex = wf.nodes.findIndex(n => n.name === 'Supabase' || n.type === 'n8n-nodes-base.supabase');
    if (supaIndex !== -1) {
        wf.nodes[supaIndex].parameters.resource = 'row';
        wf.nodes[supaIndex].parameters.operation = 'update';
        wf.nodes[supaIndex].parameters.table = 'leads';
        wf.nodes[supaIndex].parameters.matchColumns = 'email';
        wf.nodes[supaIndex].parameters.matchValue = '={{ $json.email }}';
        wf.nodes[supaIndex].parameters.dataMode = 'defineBelow';
        wf.nodes[supaIndex].parameters.valuesToSend = {
            values: [
                { name: 'estado', value: 'Cita Agendada' }
            ]
        };
    }

    // Update Gmail Node
    const gmailIndex = wf.nodes.findIndex(n => n.name === 'Gmail' || n.type === 'n8n-nodes-base.gmail');
    if (gmailIndex !== -1) {
        wf.nodes[gmailIndex].parameters.toEmail = "cardea285@gmail.com, santiagokansas890@gmail.com";
        if (gmailCredId) {
            wf.nodes[gmailIndex].credentials = {
                gmailOAuth2: {
                    id: gmailCredId,
                    name: gmailCredName
                }
            };
        } else {
            // Mock if not found
            wf.nodes[gmailIndex].credentials = {
                gmailOAuth2: {
                    id: "YOUR_GMAIL_CRED_ID",
                    name: "Gmail account"
                }
            };
        }
    }

    const payload = {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings || {}
    };

    const putRes = await fetch(BASE_URL + '/workflows/' + WF_ID, {
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

run();

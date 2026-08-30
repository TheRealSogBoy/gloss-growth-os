const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const WF_ID = 'CEslBZYobBEqpCKM';
const BASE_URL = 'https://ludicrous-scorpion.pikapod.net/api/v1';

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function run() {
  try {
    // 1. Fetch credentials to resolve IDs dynamically
    const credsRes = await fetch(BASE_URL + '/credentials', { headers });
    const credsData = await credsRes.json();
    const credsList = credsData.data || [];
    
    const resolveCred = (nameSubstring) => {
        const c = credsList.find(x => x.name.toLowerCase().includes(nameSubstring.toLowerCase()));
        if (c) return { [c.type]: { id: c.id } };
        return undefined;
    };
    
    const credsGCal = resolveCred('Google Calendar');
    const credsSupa = resolveCred('Supabase');
    const credsTelegram = resolveCred('Telegram');

    // 2. Fetch Workflow
    const getRes = await fetch(BASE_URL + '/workflows/' + WF_ID, { headers });
    const wf = await getRes.json();

    // 3. Update Nodes
    for (let node of wf.nodes) {
        
        // --- GOOGLE CALENDAR NODES ---
        if (node.type === 'n8n-nodes-base.googleCalendar') {
            if (credsGCal) node.credentials = credsGCal;
            
            if (node.name.includes('Cita')) {
                node.parameters = {
                    operation: 'create', calendar: 'primary',
                    start: '={{ $json.fecha_inicio }}', end: '={{ $json.fecha_fin }}', summary: '={{ $json.titulo }}',
                    attendees: [ "cardea285@gmail.com", "santiagokansas890@gmail.com", "={{ $json.email_cliente }}" ]
                };
            } else if (node.name.includes('Tarea')) {
                node.parameters = {
                    operation: 'create', calendar: 'primary',
                    start: '={{ $json.fecha_inicio }}', end: '={{ $json.fecha_fin }}', summary: '=[Tarea] {{ $json.titulo }}'
                };
            } else if (node.name.includes('Cobro')) {
                node.parameters = {
                    operation: 'create', calendar: 'primary',
                    start: '={{ $json.fecha_inicio }}', end: '={{ $json.fecha_fin }}', summary: '=💰 [Cobro] {{ $json.titulo }} - ${{ $json.monto }}'
                };
            }
        }
        
        // --- SUPABASE NODES ---
        if (node.type === 'n8n-nodes-base.supabase') {
            node.typeVersion = 1; // Force v1 to avoid tableId / resourceLocator UI issues
            if (credsSupa) node.credentials = credsSupa;
            
            if (node.name.includes('Cita')) {
                node.parameters = {
                    useCustomSchema: true, schema: "public", resource: "row", operation: "update",
                    tableId: "clientes", matchColumns: "negocio_correos", matchValue: "={{ $json.email_cliente }}",
                    dataMode: "defineBelow", valuesToSend: { values: [ { name: "estado_pipeline", value: "Cita Agendada" } ] }
                };
            } else if (node.name.includes('Tarea')) {
                node.parameters = {
                    useCustomSchema: true, schema: "public", resource: "row", operation: "insert",
                    tableId: "notificaciones", dataMode: "defineBelow",
                    valuesToSend: { values: [
                        { name: "titulo", value: "={{ $json.titulo }}" },
                        { name: "tipo", value: "tarea" },
                        { name: "leido", value: false }
                    ]}
                };
            } else if (node.name.includes('Cobro')) {
                node.parameters = {
                    useCustomSchema: true, schema: "public", resource: "row", operation: "insert",
                    tableId: "notificaciones", dataMode: "defineBelow",
                    valuesToSend: { values: [
                        { name: "titulo", value: "=Cobro: {{ $json.titulo }} - ${{ $json.monto }}" },
                        { name: "tipo", value: "cobro" },
                        { name: "leido", value: false }
                    ]}
                };
            }
        }
        
        // --- TELEGRAM NODES ---
        if (node.type === 'n8n-nodes-base.telegram') {
            if (credsTelegram) node.credentials = credsTelegram;
            
            if (node.name.includes('Cita')) {
                node.parameters = {
                    chatId: "-1004490736144",
                    text: "📅 <b>Nueva Cita Agendada</b>\\n\\n<b>Título:</b> {{ $json.titulo }}\\n<b>Cliente:</b> {{ $json.email_cliente }}\\n<b>Fecha:</b> {{ $json.fecha_inicio }}",
                    additionalFields: { parse_mode: "HTML" }
                };
            } else if (node.name.includes('Tarea')) {
                node.parameters = {
                    chatId: "-1004490736144",
                    text: "📌 <b>Tarea Programada</b>\\n\\n<b>Detalle:</b> {{ $json.titulo }}\\n<b>Vence:</b> {{ $json.fecha_fin }}",
                    additionalFields: { parse_mode: "HTML" }
                };
            } else if (node.name.includes('Cobro')) {
                node.parameters = {
                    chatId: "-1004490736144",
                    text: "💰 <b>Alerta de Cobro / Facturación</b>\\n\\n<b>Concepto:</b> {{ $json.titulo }}\\n<b>Monto:</b> ${{ $json.monto }}\\n<b>Fecha Límite:</b> {{ $json.fecha_inicio }}",
                    additionalFields: { parse_mode: "HTML" }
                };
            }
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
      console.log("[SUCCESS] Workflow fully updated.");
    } else {
      console.error("[ERROR]", await putRes.text());
    }
  } catch (error) {
    console.error("[ERROR]", error);
  }
}

run();

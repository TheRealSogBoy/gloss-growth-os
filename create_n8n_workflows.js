const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const BASE_URL = 'https://ludicrous-scorpion.pikapod.net/api/v1/workflows';

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const workflows = [
  {
    "name": "CRM - 01 Captación y Calificación de Leads",
    "nodes": [
      { "name": "Webhook", "type": "n8n-nodes-base.webhook", "position": [0, 0], "parameters": { "path": "lead-capture", "httpMethod": "POST", "options": {} } },
      { "name": "Gemini AI", "type": "n8n-nodes-base.httpRequest", "position": [200, 0], "parameters": { "method": "POST", "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", "sendBody": true, "bodyParameters": { "parameters": [ { "name": "contents", "value": "={{ $json.body }}" } ] } } },
      { "name": "Supabase", "type": "n8n-nodes-base.supabase", "position": [400, 0], "parameters": { "operation": "insert", "table": "leads", "dataMode": "defineBelow", "valuesToSend": { "values": [ { "name": "nombre", "value": "={{ $json.nombre }}" }, { "name": "estado", "value": "Nuevo" }, { "name": "score", "value": 50 } ] } } },
      { "name": "Telegram", "type": "n8n-nodes-base.telegram", "position": [600, 0], "parameters": { "operation": "sendMessage", "chatId": "CHAT_ID", "text": "Nuevo Lead Recibido y calificado." } }
    ],
    "connections": {
      "Webhook": { "main": [ [ { "node": "Gemini AI", "type": "main", "index": 0 } ] ] },
      "Gemini AI": { "main": [ [ { "node": "Supabase", "type": "main", "index": 0 } ] ] },
      "Supabase": { "main": [ [ { "node": "Telegram", "type": "main", "index": 0 } ] ] }
    },
    "settings": {}
  },
  {
    "name": "CRM - 02 Sincronización y Agendamiento",
    "nodes": [
      { "name": "Webhook", "type": "n8n-nodes-base.webhook", "position": [0, 0], "parameters": { "path": "calendar-booking", "httpMethod": "POST", "options": {} } },
      { "name": "Google Calendar", "type": "n8n-nodes-base.googleCalendar", "position": [200, 0], "parameters": { "operation": "create", "calendar": "primary", "start": "={{ $json.start }}", "end": "={{ $json.end }}", "summary": "={{ $json.title }}" } },
      { "name": "Supabase", "type": "n8n-nodes-base.supabase", "position": [400, 0], "parameters": { "operation": "update", "table": "leads", "matchColumns": "id", "dataMode": "defineBelow", "valuesToSend": { "values": [ { "name": "estado", "value": "Cita Agendada" } ] } } },
      { "name": "Gmail", "type": "n8n-nodes-base.gmail", "position": [600, 0], "parameters": { "operation": "send", "message": "Confirmación de cita agendada", "subject": "Cita Confirmada", "toEmail": "={{ $json.email }}" } }
    ],
    "connections": {
      "Webhook": { "main": [ [ { "node": "Google Calendar", "type": "main", "index": 0 } ] ] },
      "Google Calendar": { "main": [ [ { "node": "Supabase", "type": "main", "index": 0 } ] ] },
      "Supabase": { "main": [ [ { "node": "Gmail", "type": "main", "index": 0 } ] ] }
    },
    "settings": {}
  },
  {
    "name": "CRM - 03 Emisión de Cotizaciones",
    "nodes": [
      { "name": "Webhook", "type": "n8n-nodes-base.webhook", "position": [0, 0], "parameters": { "path": "crear-cotizacion", "httpMethod": "POST", "options": {} } },
      { "name": "Supabase RPC", "type": "n8n-nodes-base.httpRequest", "position": [200, 0], "parameters": { "method": "POST", "url": "https://rtgfncnkdfwiazzfosms.supabase.co/rest/v1/rpc/get_next_cotizacion_number", "authentication": "headerAuth", "headerParameters": { "parameters": [ { "name": "apikey", "value": "SUPABASE_ANON_KEY" } ] } } },
      { "name": "Google Docs", "type": "n8n-nodes-base.googleDocs", "position": [400, 0], "parameters": { "operation": "create", "title": "Cotización Generada" } },
      { "name": "Gmail", "type": "n8n-nodes-base.gmail", "position": [600, 0], "parameters": { "operation": "send", "message": "Adjunto enviamos su cotización", "subject": "Cotización de Servicios", "toEmail": "={{ $json.email }}" } },
      { "name": "Telegram", "type": "n8n-nodes-base.telegram", "position": [800, 0], "parameters": { "operation": "sendMessage", "chatId": "CHAT_ID", "text": "Cotización comercial enviada correctamente." } }
    ],
    "connections": {
      "Webhook": { "main": [ [ { "node": "Supabase RPC", "type": "main", "index": 0 } ] ] },
      "Supabase RPC": { "main": [ [ { "node": "Google Docs", "type": "main", "index": 0 } ] ] },
      "Google Docs": { "main": [ [ { "node": "Gmail", "type": "main", "index": 0 } ] ] },
      "Gmail": { "main": [ [ { "node": "Telegram", "type": "main", "index": 0 } ] ] }
    },
    "settings": {}
  },
  {
    "name": "CRM - 04 Cron Diario de Seguimiento",
    "nodes": [
      { "name": "Schedule", "type": "n8n-nodes-base.scheduleTrigger", "position": [0, 0], "parameters": { "rule": { "interval": [ { "field": "cronExpression", "expression": "0 8 * * 1-5" } ] } } },
      { "name": "Supabase", "type": "n8n-nodes-base.supabase", "position": [200, 0], "parameters": { "operation": "getAll", "table": "cotizaciones" } },
      { "name": "Code", "type": "n8n-nodes-base.code", "position": [400, 0], "parameters": { "jsCode": "return [{ json: { report: 'Resumen consolidado matutino de cotizaciones...' } }];" } },
      { "name": "Telegram", "type": "n8n-nodes-base.telegram", "position": [600, 0], "parameters": { "operation": "sendMessage", "chatId": "CHAT_ID", "text": "={{ $json.report }}" } }
    ],
    "connections": {
      "Schedule": { "main": [ [ { "node": "Supabase", "type": "main", "index": 0 } ] ] },
      "Supabase": { "main": [ [ { "node": "Code", "type": "main", "index": 0 } ] ] },
      "Code": { "main": [ [ { "node": "Telegram", "type": "main", "index": 0 } ] ] }
    },
    "settings": {}
  }
];

async function createWorkflows() {
  for (const wf of workflows) {
    try {
      console.log("Creating workflow: " + wf.name);
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(wf)
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log("[SUCCESS] Workflow '" + wf.name + "' created with ID: " + data.id);
      } else {
        console.error("[ERROR] Failed to create '" + wf.name + "':", data);
      }
    } catch (error) {
      console.error("[ERROR] Network error for '" + wf.name + "':", error);
    }
  }
}

createWorkflows();

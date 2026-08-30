const fs = require('fs');
const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const BASE_URL = 'https://ludicrous-scorpion.pikapod.net/api/v1/workflows';

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const wf = {
  "name": "CRM - Sincronización Global de Calendario y Eventos",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [0, 200],
      "parameters": {
        "path": "calendario-eventos",
        "httpMethod": "POST",
        "options": {}
      }
    },
    {
      "name": "Switch Evento",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1,
      "position": [250, 200],
      "parameters": {
        "mode": "rules",
        "rules": {
          "rules": [
            { "conditions": { "string": [ { "value1": "={{$json.tipo_evento}}", "operation": "equals", "value2": "cita" } ] } },
            { "conditions": { "string": [ { "value1": "={{$json.tipo_evento}}", "operation": "equals", "value2": "tarea" } ] } },
            { "conditions": { "string": [ { "value1": "={{$json.tipo_evento}}", "operation": "equals", "value2": "cobro" } ] } }
          ]
        }
      }
    },
    // BRANCH 1: CITA
    {
      "name": "Google Calendar Cita",
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1,
      "position": [500, 0],
      "parameters": {
        "operation": "create",
        "calendar": "primary",
        "start": "={{$json.fecha_inicio}}",
        "end": "={{$json.fecha_fin}}",
        "summary": "={{$json.titulo}}",
        "description": "={{$json.descripcion}}",
        "attendees": [ "cardea285@gmail.com", "santiagokansas890@gmail.com", "={{$json.email_cliente}}" ],
        "sendUpdates": "all",
        "options": { "sendUpdates": "all" }
      }
    },
    {
      "name": "Supabase Cita",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [700, 0],
      "parameters": {
        "useCustomSchema": true, "schema": "public", "resource": "row", "operation": "update",
        "tableId": "clientes", "matchColumns": "negocio_correos", "matchValue": "={{$json.email_cliente}}",
        "dataMode": "defineBelow", "valuesToSend": { "values": [ { "name": "estado_pipeline", "value": "Cita Agendada" } ] }
      }
    },
    {
      "name": "Telegram Cita",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [900, 0],
      "parameters": {
        "chatId": "-1004490736144",
        "text": "📅 <b>Nueva cita agendada</b>\\n\\nTítulo: {{$json.titulo}}\\nCliente: {{$json.email_cliente}}",
        "additionalFields": { "parse_mode": "HTML" }
      }
    },
    // BRANCH 2: TAREA
    {
      "name": "Google Calendar Tarea",
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1,
      "position": [500, 200],
      "parameters": {
        "operation": "create", "calendar": "primary",
        "start": "={{$json.fecha_inicio}}", "end": "={{$json.fecha_fin}}",
        "summary": "[Tarea] {{$json.titulo}}", "description": "={{$json.descripcion}}"
      }
    },
    {
      "name": "Supabase Tarea",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [700, 200],
      "parameters": {
        "useCustomSchema": true, "schema": "public", "resource": "row", "operation": "insert",
        "tableId": "notificaciones", "dataMode": "defineBelow",
        "valuesToSend": { "values": [ { "name": "mensaje", "value": "Tarea asignada: {{$json.titulo}}" } ] }
      }
    },
    {
      "name": "Telegram Tarea",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [900, 200],
      "parameters": {
        "chatId": "-1004490736144",
        "text": "📝 <b>Nueva tarea</b>\\n\\nTítulo: {{$json.titulo}}\\nVencimiento: {{$json.fecha_fin}}",
        "additionalFields": { "parse_mode": "HTML" }
      }
    },
    // BRANCH 3: COBRO
    {
      "name": "Google Calendar Cobro",
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1,
      "position": [500, 400],
      "parameters": {
        "operation": "create", "calendar": "primary",
        "start": "={{$json.fecha_inicio}}", "end": "={{$json.fecha_fin}}",
        "summary": "💰 [Cobro] {{$json.titulo}} - ${{$json.monto}}", "description": "={{$json.descripcion}}",
        "options": {}
      }
    },
    {
      "name": "Telegram Cobro",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [700, 400],
      "parameters": {
        "chatId": "-1004490736144",
        "text": "💸 <b>Cobro programado</b>\\n\\nTítulo: {{$json.titulo}}\\nMonto: ${{$json.monto}}\\nFecha: {{$json.fecha_inicio}}",
        "additionalFields": { "parse_mode": "HTML" }
      }
    },
    {
      "name": "Supabase Cobro",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [900, 400],
      "parameters": {
        "useCustomSchema": true, "schema": "public", "resource": "row", "operation": "insert",
        "tableId": "notificaciones", "dataMode": "defineBelow",
        "valuesToSend": { "values": [ { "name": "mensaje", "value": "Alerta de pago programado: {{$json.titulo}} por ${{$json.monto}}" } ] }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [ [ { "node": "Switch Evento", "type": "main", "index": 0 } ] ]
    },
    "Switch Evento": {
      "main": [
        [ { "node": "Google Calendar Cita", "type": "main", "index": 0 } ],
        [ { "node": "Google Calendar Tarea", "type": "main", "index": 0 } ],
        [ { "node": "Google Calendar Cobro", "type": "main", "index": 0 } ]
      ]
    },
    "Google Calendar Cita": { "main": [ [ { "node": "Supabase Cita", "type": "main", "index": 0 } ] ] },
    "Supabase Cita": { "main": [ [ { "node": "Telegram Cita", "type": "main", "index": 0 } ] ] },
    
    "Google Calendar Tarea": { "main": [ [ { "node": "Supabase Tarea", "type": "main", "index": 0 } ] ] },
    "Supabase Tarea": { "main": [ [ { "node": "Telegram Tarea", "type": "main", "index": 0 } ] ] },
    
    "Google Calendar Cobro": { "main": [ [ { "node": "Telegram Cobro", "type": "main", "index": 0 } ] ] },
    "Telegram Cobro": { "main": [ [ { "node": "Supabase Cobro", "type": "main", "index": 0 } ] ] }
  },
  "settings": {}
};

async function run() {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(wf)
    });
    const data = await res.json();
    if (res.ok) {
      console.log("SUCCESS:", data.id);
      const act = await fetch(BASE_URL + '/' + data.id + '/activate', { method: 'POST', headers });
      console.log("Activated:", act.ok);
    } else {
      console.log("ERROR:", data);
    }
  } catch (e) {
    console.error(e);
  }
}
run();

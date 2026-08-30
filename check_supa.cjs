const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZGYzZTkyNS00MmI1LTRhMDgtOTFlMy01ZTZiYmIwOTBjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQ4YTg1ZmQtNGRhMC00YzMzLWI3MDUtNmQ0ZGI2NGQ3NjNkIiwiaWF0IjoxNzg4MDc5MDUwfQ.Mvd7fdMBd889hTtTSuS10rhoFSa1xTIJiZSrtTh5W5Q';
const WF_ID = '9jjMVNCkfxG6ictV';
const BASE_URL = 'https://ludicrous-scorpion.pikapod.net/api/v1/workflows/' + WF_ID;

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

fetch(BASE_URL, { headers }).then(r => r.json()).then(data => {
    const supaNode = data.nodes.find(n => n.type === 'n8n-nodes-base.supabase');
    console.log(JSON.stringify(supaNode, null, 2));
});

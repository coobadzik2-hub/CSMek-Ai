const textForm = document.getElementById('knowledgeTextForm');
const fileForm = document.getElementById('knowledgeFileForm');
const textStatus = document.getElementById('knowledgeTextStatus');
const fileStatus = document.getElementById('knowledgeFileStatus');

async function showResult(status, request) {
  status.className = 'knowledge-status';
  status.textContent = 'Zapisuję materiał...';
  try {
    const response = await request();
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się zapisać materiału.');
    status.className = 'knowledge-status is-success';
    status.textContent = 'Materiał został dodany do wiedzy agenta.';
    return true;
  } catch (error) {
    status.className = 'knowledge-status is-error';
    status.textContent = error.message;
    return false;
  }
}

textForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = textForm.querySelector('button');
  const content = new FormData(textForm).get('content');
  button.disabled = true;
  const saved = await showResult(textStatus, () => fetch('/api/knowledge/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  }));
  if (saved) textForm.reset();
  button.disabled = false;
});

fileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = fileForm.querySelector('button');
  const formData = new FormData(fileForm);
  button.disabled = true;
  const saved = await showResult(fileStatus, () => fetch('/api/knowledge/file', { method: 'POST', body: formData }));
  if (saved) fileForm.reset();
  button.disabled = false;
});

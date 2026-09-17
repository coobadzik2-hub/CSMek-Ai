const form = document.getElementById('studentFeedbackForm');
const result = document.getElementById('feedbackResult');
let feedbackMessageTimer;

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form));
  window.clearTimeout(feedbackMessageTimer);
  button.disabled = true;
  button.innerHTML = 'Wysyłanie...';
  result.hidden = true;

  try {
    const response = await fetch('/api/technical-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporter: 'Anonimowy student',
        contact: 'Nie podano',
        category: 'Anonimowa uwaga studenta',
        priority: 'Standardowy',
        location: values.subject,
        description: `Kierunek studiów: ${values.field_of_study}. Obszar: ${values.topic}. ${values.description}`
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się wysłać uwagi.');
    result.classList.remove('is-error');
    result.classList.add('is-success');
    result.innerHTML = `<strong>✓ Zgłoszenie zostało przyjęte przez zespół techniczny.</strong><span>Twoja anonimowa uwaga trafiła do skrzynki technicznej.</span><small>Numer zgłoszenia: ${data.report_id}</small>`;
    result.hidden = false;
    form.reset();
    feedbackMessageTimer = window.setTimeout(() => {
      result.hidden = true;
    }, 5000);
  } catch (error) {
    result.classList.remove('is-success');
    result.classList.add('is-error');
    result.textContent = error.message;
    result.hidden = false;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Wyślij anonimowo <b>→</b>';
  }
});

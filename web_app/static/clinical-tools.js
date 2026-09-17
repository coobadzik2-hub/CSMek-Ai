const numberValue = (id) => Number(document.getElementById(id)?.value || 0);
const output = (id, text) => { const element = document.getElementById(id); if (element) element.textContent = text; };

document.getElementById('bmiCalculate')?.addEventListener('click', () => {
  const height = numberValue('bmiHeight') / 100;
  const weight = numberValue('bmiWeight');
  if (!height || !weight) return output('bmiResult', 'Wprowadź wzrost i masę.');
  const bmi = weight / (height * height);
  const category = bmi < 18.5 ? 'niedowaga' : bmi < 25 ? 'zakres referencyjny' : bmi < 30 ? 'nadwaga' : 'otyłość';
  output('bmiResult', `${bmi.toFixed(1)} · ${category}`);
});

document.getElementById('gcsCalculate')?.addEventListener('click', () => {
  const total = numberValue('gcsEyes') + numberValue('gcsVerbal') + numberValue('gcsMotor');
  output('gcsResult', `${total}/15 · ${total <= 8 ? 'ciężkie zaburzenia, pilna ocena' : total <= 12 ? 'umiarkowane zaburzenia' : 'łagodne zaburzenia'}`);
});

const bandScore = (value, bands) => bands.find(([min, max, score]) => value >= min && value <= max)?.[2] || 0;
document.getElementById('newsCalculate')?.addEventListener('click', () => {
  const score = bandScore(numberValue('newsRespiratory'), [[0, 8, 3], [9, 11, 1], [12, 20, 0], [21, 24, 2], [25, 999, 3]])
    + bandScore(numberValue('newsSpo2'), [[0, 91, 3], [92, 93, 2], [94, 95, 1], [96, 100, 0]])
    + bandScore(numberValue('newsBp'), [[0, 90, 3], [91, 100, 2], [101, 110, 1], [111, 219, 0], [220, 999, 3]])
    + bandScore(numberValue('newsPulse'), [[0, 40, 3], [41, 50, 1], [51, 90, 0], [91, 110, 1], [111, 130, 2], [131, 999, 3]])
    + bandScore(numberValue('newsTemp'), [[0, 35, 3], [35.1, 36, 1], [36.1, 38, 0], [38.1, 39, 1], [39.1, 99, 2]])
    + numberValue('newsOxygen');
  output('newsResult', `${score} pkt · ${score >= 7 ? 'wysokie ryzyko' : score >= 5 ? 'zwiększona obserwacja' : 'niski wynik'} · nie zastępuje oceny klinicznej`);
});

const protocols = {
  abcde: ['A · Airway: oceń drożność i zabezpiecz odcinek szyjny.', 'B · Breathing: oddech, SpO2, wysiłek oddechowy i osłuchiwanie.', 'C · Circulation: tętno, BP, perfuzja, krwotok i dostęp naczyniowy.', 'D · Disability: świadomość, glikemia, źrenice i drgawki.', 'E · Exposure: obejrzyj pacjenta, temperaturę i zapobiegaj hipotermii.'],
  cpr: ['Bezpieczeństwo i reakcja pacjenta; wezwij pomoc.', 'Oceń oddech maksymalnie przez 10 sekund.', 'Brak prawidłowego oddechu: rozpocznij 30 uciśnięć i 2 oddechy.', 'Podłącz AED tak szybko, jak jest dostępne, i wykonuj polecenia.', 'Kontynuuj do powrotu oznak życia lub przejęcia przez zespół.'],
  triage: ['Zastosuj szybki przegląd i oceń możliwość chodzenia.', 'Priorytet czerwony: bezpośrednie zagrożenie życia i natychmiastowa pomoc.', 'Priorytet żółty: stan pilny, ale chwilowo stabilny.', 'Priorytet zielony: poszkodowany może czekać po podstawowej pomocy.', 'Priorytet czarny: brak oznak życia lub brak szans przeżycia w danych zasobach.']
};
const protocolContent = document.getElementById('protocolContent');
function renderProtocol(name = 'abcde') { if (protocolContent) protocolContent.innerHTML = `<ol>${protocols[name].map((step) => `<li>${step}</li>`).join('')}</ol><small>Materiał edukacyjny. W realnym zdarzeniu stosuj lokalne procedury i polecenia dyspozytora.</small>`; }
document.querySelectorAll('.protocol-tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('.protocol-tab').forEach((item) => item.classList.toggle('is-active', item === tab)); renderProtocol(tab.dataset.protocol); }));
renderProtocol();

const scenarioSteps = [
  { prompt: 'Pacjent jest blady, spocony i splątany. Co oceniasz jako pierwsze?', options: [['Drożność dróg oddechowych i reakcję', true], ['Wywiad rodzinny', false], ['Dokumentację szczepień', false]] },
  { prompt: 'Pacjent oddycha szybko, ale ma zachowaną drożność. Co robisz dalej?', options: [['Oceniasz oddychanie i SpO2', true], ['Podajesz doustnie płyny bez oceny', false], ['Kończysz badanie', false]] },
  { prompt: 'Po ocenie ABCDE: co powinno zostać udokumentowane?', options: [['Wyniki, czas, działania i reakcję pacjenta', true], ['Tylko nazwisko pacjenta', false], ['Nic, jeśli pacjent czuje się lepiej', false]] }
];
let scenarioIndex = 0;
let scenarioScore = 0;
function renderScenario() { const step = scenarioSteps[scenarioIndex]; const prompt = document.getElementById('scenarioPrompt'); const options = document.getElementById('scenarioOptions'); if (!prompt || !options) return; prompt.textContent = step.prompt; options.innerHTML = step.options.map(([label, correct]) => `<button type="button" data-correct="${correct}">${label}</button>`).join(''); options.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { const correct = button.dataset.correct === 'true'; document.getElementById('scenarioFeedback').textContent = correct ? 'Dobra decyzja. Przechodzimy dalej zgodnie z ABCDE.' : 'Zatrzymaj się i wróć do uporządkowanej oceny ABCDE.'; if (correct && !button.parentElement.dataset.answered) { scenarioScore += 1; button.parentElement.dataset.answered = 'true'; } document.getElementById('scenarioScore').textContent = `Wynik: ${scenarioScore}/3`; })); }
document.getElementById('scenarioNext')?.addEventListener('click', () => { scenarioIndex = (scenarioIndex + 1) % scenarioSteps.length; if (scenarioIndex === 0) { scenarioCount += 1; localStorage.setItem('csmek-scenario-count', String(scenarioCount)); updateDashboard(); } renderScenario(); document.getElementById('scenarioFeedback').textContent = ''; document.getElementById('scenarioScore').textContent = `Wynik: ${scenarioScore}/3`; });
renderScenario();

const studyCards = [
  ['Co oznacza litera C w ABCDE?', 'Krążenie: tętno, ciśnienie, perfuzja i kontrola krwotoku.'],
  ['Jaki jest cel RKO?', 'Podtrzymanie krążenia i utlenowania do czasu przywrócenia krążenia lub przyjazdu zespołu.'],
  ['Kiedy wynik NEWS2 wymaga pilnej eskalacji?', 'Wysoki wynik lub gwałtowne pogorszenie parametrów wymaga pilnej oceny zgodnie z lokalnym protokołem.'],
  ['Co obejmuje triage?', 'Szybką ocenę i przypisanie priorytetu według zagrożenia życia oraz dostępnych zasobów.']
];
let flashcardIndex = 0;
let studyCount = Number(localStorage.getItem('csmek-study-count') || 0);
let scenarioCount = Number(localStorage.getItem('csmek-scenario-count') || 0);
const flashcardQuestion = document.getElementById('flashcardQuestion');
const flashcardAnswer = document.getElementById('flashcardAnswer');
const flashcardReveal = document.getElementById('flashcardReveal');
const studyProgress = document.getElementById('studyProgress');
const learningStats = document.getElementById('learningStats');
function renderFlashcard() { const card = studyCards[flashcardIndex]; if (flashcardQuestion) flashcardQuestion.textContent = card[0]; if (flashcardAnswer) { flashcardAnswer.textContent = card[1]; flashcardAnswer.hidden = true; } if (flashcardReveal) flashcardReveal.textContent = 'Pokaż odpowiedź'; if (studyProgress) studyProgress.textContent = `Powtórzone: ${studyCount}`; if (learningStats) learningStats.textContent = `Nauka: ${studyCount} fiszek · ${scenarioCount} scenariuszy`; }
flashcardReveal?.addEventListener('click', () => { flashcardAnswer.hidden = !flashcardAnswer.hidden; flashcardReveal.textContent = flashcardAnswer.hidden ? 'Pokaż odpowiedź' : 'Ukryj odpowiedź'; });
function nextFlashcard() { studyCount += 1; localStorage.setItem('csmek-study-count', String(studyCount)); flashcardIndex = (flashcardIndex + 1) % studyCards.length; renderFlashcard(); updateDashboard(); }
document.getElementById('flashcardEasy')?.addEventListener('click', nextFlashcard);
document.getElementById('flashcardHard')?.addEventListener('click', nextFlashcard);
renderFlashcard();

document.getElementById('patientGenerate')?.addEventListener('click', () => {
  const age = document.getElementById('patientAge').value || 'nieokreślony';
  const sex = document.getElementById('patientSex').value;
  const complaint = document.getElementById('patientComplaint').value || 'brak skargi głównej';
  const priority = document.getElementById('patientPriority').value;
  const notes = document.getElementById('patientNotes').value || 'brak dodatkowych obserwacji';
  const vitals = ['patientPulse', 'patientRespiratory', 'patientSpo2', 'patientBp', 'patientTemp'].map((id) => document.getElementById(id)?.value).filter(Boolean);
  document.getElementById('patientSummary').textContent = `Pacjent: ${age} lat, ${sex}. Skarga: ${complaint}. Priorytet: ${priority}. Parametry: ${vitals.length ? vitals.join(' · ') : 'brak'}. Notatki: ${notes}.`;
  scenarioCount += 1; localStorage.setItem('csmek-scenario-count', String(scenarioCount));
  if (learningStats) learningStats.textContent = `Nauka: ${studyCount} fiszek · ${scenarioCount} scenariuszy`;
  updateDashboard();
});
document.getElementById('patientPrint')?.addEventListener('click', () => window.print());

const events = [
  ['Warsztat ABCDE', 'Ćwiczenia z uporządkowanej oceny pacjenta', 'Najbliższy termin do ustalenia'],
  ['Otwarte sale symulacyjne', 'Praca własna studentów z trenażerami', 'Sprawdź dostępność w CSM'],
  ['Debriefing zespołowy', 'Omówienie decyzji i komunikacji w zespole', 'Wydarzenie edukacyjne']
];
const eventsList = document.getElementById('eventsList');
if (eventsList) eventsList.innerHTML = events.map(([title, description, date]) => `<article class="event-item"><strong>${title}</strong><p>${description}</p><small>${date}</small></article>`).join('');

document.getElementById('contrastToggle')?.addEventListener('click', () => { document.body.classList.toggle('high-contrast'); localStorage.setItem('csmek-contrast', document.body.classList.contains('high-contrast') ? 'on' : 'off'); });
document.getElementById('fontSizeToggle')?.addEventListener('click', () => { document.body.classList.toggle('large-text'); localStorage.setItem('csmek-font-size', document.body.classList.contains('large-text') ? 'large' : 'normal'); });
if (localStorage.getItem('csmek-contrast') === 'on') document.body.classList.add('high-contrast');
if (localStorage.getItem('csmek-font-size') === 'large') document.body.classList.add('large-text');

function updateDashboard() {
  const favorites = JSON.parse(localStorage.getItem('csmek-favorite-answers') || '[]');
  const values = { flashcards: studyCount, scenarios: scenarioCount, favorites: favorites.length };
  document.getElementById('dashboardFlashcards').textContent = values.flashcards;
  document.getElementById('dashboardScenarios').textContent = values.scenarios;
  document.getElementById('dashboardFavorites').textContent = values.favorites;
  document.getElementById('dashboardProgressBar').style.width = `${Math.min(100, (values.flashcards + values.scenarios) * 5)}%`;
  document.getElementById('dashboardProgressLabel').textContent = values.flashcards + values.scenarios ? 'Dobra robota. Każda powtórka buduje regularność.' : 'Zacznij od jednej fiszki lub scenariusza.';
}
updateDashboard();
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
function renderScenario() { const step = scenarioSteps[scenarioIndex]; const prompt = document.getElementById('scenarioPrompt'); const options = document.getElementById('scenarioOptions'); if (!prompt || !options) return; prompt.textContent = step.prompt; options.innerHTML = step.options.map(([label, correct]) => `<button type="button" data-correct="${correct}">${label}</button>`).join(''); options.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { document.getElementById('scenarioFeedback').textContent = button.dataset.correct === 'true' ? 'Dobra decyzja. Przechodzimy dalej zgodnie z ABCDE.' : 'Zatrzymaj się i wróć do uporządkowanej oceny ABCDE.'; })); }
document.getElementById('scenarioNext')?.addEventListener('click', () => { scenarioIndex = (scenarioIndex + 1) % scenarioSteps.length; renderScenario(); document.getElementById('scenarioFeedback').textContent = ''; });
renderScenario();
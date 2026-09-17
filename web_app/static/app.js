const input = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const responseText = document.getElementById('responseText');
const speakBtn = document.getElementById('speakBtn');
const questionAnswerSwap = document.getElementById('questionAnswerSwap');
const questionAnswerText = document.getElementById('questionAnswerText');
const newQuestionBtn = document.getElementById('newQuestionBtn');
const expandAnswerBtn = document.getElementById('expandAnswerBtn');
const themeToggle = document.getElementById('themeToggle');
const technicalPageToggle = document.getElementById('technicalPageToggle');
const studentFeedbackToggle = document.getElementById('studentFeedbackToggle');
const systemStatusPill = document.getElementById('systemStatusPill');
const systemStatusText = document.getElementById('systemStatusText');
const factText = document.getElementById('factText');
const libraryTrigger = document.getElementById('libraryTrigger');
const libraryModal = document.getElementById('libraryModal');
const closeLibraryBtn = document.getElementById('closeLibrary');
const libraryList = document.getElementById('libraryList');
const libraryDetail = document.getElementById('libraryDetail');
const librarySearch = document.getElementById('librarySearch');
const categoryInfoModal = document.getElementById('categoryInfoModal');
const categoryInfoDetail = document.getElementById('categoryInfoDetail');
const categoryInfoTitle = document.getElementById('categoryInfoTitle');
const closeCategoryInfoBtn = document.getElementById('closeCategoryInfo');
const weatherTemperature = document.getElementById('weatherTemperature');
const weatherCondition = document.getElementById('weatherCondition');
const weatherDetails = document.getElementById('weatherDetails');
const newsFeed = document.getElementById('newsFeed');
const refreshNewsBtn = document.getElementById('refreshNewsBtn');
const suggestionsList = document.getElementById('suggestionsList');
const rerollSuggestions = document.getElementById('rerollSuggestions');
let latestAnswer = '';
const conversationHistory = [];
let suggestionCandidates = [];
const carGameModal = document.getElementById('carGameModal');
const closeCarGameBtn = document.getElementById('closeCarGame');
const startCarGameBtn = document.getElementById('startCarGame');
const carGameCanvas = document.getElementById('carGameCanvas');
const carGameOverlay = document.getElementById('carGameOverlay');
const carGameStatus = document.getElementById('carGameStatus');
const carLap = document.getElementById('carLap');
const carTime = document.getElementById('carTime');
const carContext = carGameCanvas?.getContext('2d');
let knowledgeItems = [];
const answerHistory = JSON.parse(localStorage.getItem('csmek-answer-history') || '[]');
const favoriteAnswers = JSON.parse(localStorage.getItem('csmek-favorite-answers') || '[]');
const copyAnswerBtn = document.getElementById('copyAnswerBtn');
const favoriteAnswerBtn = document.getElementById('favoriteAnswerBtn');
const personalLibraryList = document.getElementById('personalLibraryList');
const personalTabs = document.querySelectorAll('.personal-tab');

const carState = {
  running: false,
  frame: null,
  lastTime: 0,
  time: 0,
  lap: 1,
  keys: new Set(),
  car: { x: 450, y: 410, angle: -Math.PI / 2, speed: 0, steer: 0 },
  track: [],
  nextCheckpoint: 1,
  nearest: null
};

function generateCarTrack() {
  const points = [];
  const pointCount = 22;
  const centerX = 450;
  const centerY = 265;
  const radii = [
    176, 220, 290, 318, 285, 238, 190, 232, 306, 326, 278,
    210, 172, 226, 314, 337, 296, 228, 164, 198, 278, 312
  ];
  const verticalScale = [0.78, 0.86, 0.95, 1.02, 1.08, 1.02, 0.9, 0.82, 0.88, 0.96, 1.04, 1.08, 0.98, 0.84, 0.8, 0.9, 1.05, 1.12, 1.06, 0.92, 0.82, 0.78];
  for (let index = 0; index < pointCount; index += 1) {
    const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2;
    const radius = radii[index];
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius * verticalScale[index]
    });
  }
  return points;
}

function getNearestTrackPoint(x, y) {
  const track = carState.track;
  let nearest = { distance: Infinity, index: 0, x: track[0]?.x || x, y: track[0]?.y || y, t: 0 };
  for (let index = 0; index < track.length; index += 1) {
    const start = track[index];
    const end = track[(index + 1) % track.length];
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY || 1;
    const t = Math.max(0, Math.min(1, ((x - start.x) * segmentX + (y - start.y) * segmentY) / lengthSquared));
    const closestX = start.x + segmentX * t;
    const closestY = start.y + segmentY * t;
    const distance = Math.hypot(x - closestX, y - closestY);
    if (distance < nearest.distance) {
      nearest = { distance, index, x: closestX, y: closestY, t };
    }
  }
  return nearest;
}

function openCarGame() {
  if (!carGameModal) return;
  carGameModal.classList.remove('hidden');
  carGameModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('library-open');
  drawCarGame();
}

function closeCarGame() {
  if (!carGameModal) return;
  carGameModal.classList.add('hidden');
  carGameModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('library-open');
  carState.running = false;
  if (carState.frame) cancelAnimationFrame(carState.frame);
}

function drawMustangModel(car) {
  const frontWheelAngle = car.steer * 0.28;
  const drawWheel = (x, y, steerAngle = 0) => {
    carContext.save();
    carContext.translate(x, y);
    carContext.rotate(steerAngle);
    carContext.fillStyle = '#101619';
    carContext.beginPath();
    carContext.roundRect(-4.6, -8, 9.2, 16, 3.4);
    carContext.fill();
    carContext.fillStyle = '#899399';
    carContext.beginPath();
    carContext.roundRect(-2.2, -5.1, 4.4, 10.2, 1.8);
    carContext.fill();
    carContext.fillStyle = '#d8e1df';
    carContext.fillRect(-1, -3.3, 2, 6.6);
    carContext.restore();
  };

  carContext.save();
  carContext.translate(3, 7);
  carContext.fillStyle = 'rgba(0, 0, 0, 0.42)';
  carContext.filter = 'blur(3px)';
  carContext.beginPath();
  carContext.ellipse(0, 0, 18, 31, 0, 0, Math.PI * 2);
  carContext.fill();
  carContext.filter = 'none';
  carContext.restore();

  drawWheel(-14, -17, frontWheelAngle);
  drawWheel(14, -17, frontWheelAngle);
  drawWheel(-14, 17);
  drawWheel(14, 17);

  const bodyGradient = carContext.createLinearGradient(-18, 0, 18, 0);
  bodyGradient.addColorStop(0, '#721f29');
  bodyGradient.addColorStop(0.28, '#d2474f');
  bodyGradient.addColorStop(0.52, '#f06a62');
  bodyGradient.addColorStop(0.78, '#bd343f');
  bodyGradient.addColorStop(1, '#671b26');
  carContext.fillStyle = bodyGradient;
  carContext.strokeStyle = '#ffd9b5';
  carContext.lineWidth = 1.4;
  carContext.beginPath();
  carContext.moveTo(-10, -31);
  carContext.quadraticCurveTo(0, -35, 10, -31);
  carContext.lineTo(16, -18);
  carContext.quadraticCurveTo(18, -10, 17, 0);
  carContext.quadraticCurveTo(18, 12, 14, 20);
  carContext.lineTo(9, 31);
  carContext.quadraticCurveTo(0, 34, -9, 31);
  carContext.lineTo(-14, 20);
  carContext.quadraticCurveTo(-18, 10, -17, 0);
  carContext.quadraticCurveTo(-18, -10, -15, -19);
  carContext.closePath();
  carContext.fill();
  carContext.stroke();

  carContext.fillStyle = '#8e222d';
  carContext.beginPath();
  carContext.moveTo(-12, -27);
  carContext.quadraticCurveTo(0, -32, 12, -27);
  carContext.lineTo(14, -18);
  carContext.quadraticCurveTo(0, -21, -14, -18);
  carContext.closePath();
  carContext.fill();

  const glassGradient = carContext.createLinearGradient(-13, -15, 13, 14);
  glassGradient.addColorStop(0, '#bcecf0');
  glassGradient.addColorStop(0.4, '#4d8794');
  glassGradient.addColorStop(1, '#18353f');
  carContext.fillStyle = glassGradient;
  carContext.strokeStyle = '#17262e';
  carContext.lineWidth = 1.8;
  carContext.beginPath();
  carContext.moveTo(-11, -16);
  carContext.quadraticCurveTo(0, -21, 11, -16);
  carContext.lineTo(12, 4);
  carContext.quadraticCurveTo(0, 11, -12, 4);
  carContext.closePath();
  carContext.fill();
  carContext.stroke();

  carContext.strokeStyle = 'rgba(225, 249, 245, 0.6)';
  carContext.lineWidth = 1;
  carContext.beginPath();
  carContext.moveTo(-10, -4);
  carContext.quadraticCurveTo(0, -1, 10, -4);
  carContext.stroke();
  carContext.beginPath();
  carContext.moveTo(-8, -16);
  carContext.lineTo(-5, 5);
  carContext.moveTo(8, -16);
  carContext.lineTo(5, 5);
  carContext.stroke();

  carContext.fillStyle = '#f8f0c6';
  carContext.shadowColor = '#fff1a6';
  carContext.shadowBlur = 6;
  carContext.beginPath();
  carContext.roundRect(-11, -30, 6, 3, 1.2);
  carContext.roundRect(5, -30, 6, 3, 1.2);
  carContext.fill();
  carContext.shadowBlur = 0;
  carContext.fillStyle = '#751d29';
  carContext.fillRect(-10, 28, 6, 2);
  carContext.fillRect(4, 28, 6, 2);

  carContext.fillStyle = '#1a2024';
  carContext.beginPath();
  carContext.roundRect(-13, 24, 26, 3, 1);
  carContext.fill();
  carContext.fillStyle = '#e45b5b';
  [-7, 0, 7].forEach((x) => carContext.fillRect(x - 2, 24.5, 4, 1.4));

  carContext.fillStyle = '#20282c';
  carContext.beginPath();
  carContext.ellipse(-17, -14, 3, 5, -0.22, 0, Math.PI * 2);
  carContext.ellipse(17, -14, 3, 5, 0.22, 0, Math.PI * 2);
  carContext.fill();
  carContext.restore();
}

function drawCarGame() {
  if (!carContext) return;
  const { width, height } = carGameCanvas;
  carContext.clearRect(0, 0, width, height);
  carContext.fillStyle = '#102d27';
  carContext.fillRect(0, 0, width, height);

  carContext.fillStyle = '#215c3e';
  for (let y = -20; y < height + 20; y += 30) {
    carContext.fillRect(0, y, width, 15);
  }

  carContext.fillStyle = '#347650';
  [[55, 74], [820, 74], [70, 455], [822, 440], [475, 42], [290, 55], [650, 470]].forEach(([x, y], index) => {
    carContext.beginPath();
    carContext.arc(x, y, 16 + (index % 3) * 4, 0, Math.PI * 2);
    carContext.fill();
    carContext.fillStyle = '#173e31';
    carContext.beginPath();
    carContext.arc(x + 7, y - 6, 11 + (index % 2) * 3, 0, Math.PI * 2);
    carContext.fill();
    carContext.fillStyle = '#347650';
  });

  const track = carState.track;
  if (track.length > 1) {
    const drawTrackLine = (lineWidth, strokeStyle) => {
      carContext.beginPath();
      track.forEach((point, index) => {
        const next = track[(index + 1) % track.length];
        const previous = track[(index - 1 + track.length) % track.length];
        const smoothX = (previous.x + point.x * 2 + next.x) / 4;
        const smoothY = (previous.y + point.y * 2 + next.y) / 4;
        if (index === 0) carContext.moveTo(smoothX, smoothY);
        else carContext.lineTo(smoothX, smoothY);
      });
      carContext.closePath();
      carContext.lineWidth = lineWidth;
      carContext.strokeStyle = strokeStyle;
      carContext.lineJoin = 'round';
      carContext.stroke();
    };
    drawTrackLine(154, '#c2b9a0');
    drawTrackLine(142, '#f2e9d9');
    drawTrackLine(130, '#3c4448');
    drawTrackLine(3, '#e5d27c');

    track.forEach((point, index) => {
      if (index % 2 !== 0) return;
      const next = track[(index + 1) % track.length];
      const angle = Math.atan2(next.y - point.y, next.x - point.x);
      carContext.save();
      carContext.translate(point.x, point.y);
      carContext.rotate(angle);
      carContext.fillStyle = index % 4 === 0 ? '#e15c55' : '#f6e8d0';
      carContext.fillRect(-11, -5, 22, 10);
      carContext.restore();
    });

    carState.track.forEach((point, index) => {
      if (index % 3 !== 0) return;
      carContext.fillStyle = index === carState.nextCheckpoint ? '#ffd76a' : '#76837a';
      carContext.beginPath();
      carContext.arc(point.x, point.y, index === carState.nextCheckpoint ? 7 : 3, 0, Math.PI * 2);
      carContext.fill();
    });
  }

  const car = carState.car;
  carContext.save();
  carContext.translate(car.x, car.y);
  carContext.rotate(car.angle + Math.PI / 2);
  drawMustangModel(car);
  carContext.restore();
}

function startCarGame() {
  if (!carContext) return;
  carState.track = generateCarTrack();
  const start = carState.track[0];
  const next = carState.track[1];
  carState.running = true;
  carState.lastTime = performance.now();
  carState.time = 0;
  carState.lap = 1;
  carState.nextCheckpoint = 1;
  carState.car = { x: start.x, y: start.y, angle: Math.atan2(next.y - start.y, next.x - start.x), speed: 0, steer: 0 };
  carGameOverlay?.classList.add('hidden');
  carGameStatus.textContent = 'Symulacja aktywna · przyczepność i bezwładność włączone';
  carState.frame = requestAnimationFrame(updateCarGame);
}

function updateCarGame(timestamp) {
  if (!carState.running) return;
  const delta = Math.min((timestamp - carState.lastTime) / 1000, 0.04);
  carState.lastTime = timestamp;
  carState.time += delta;
  const car = carState.car;
  const throttle = carState.keys.has('w') || carState.keys.has('ArrowUp');
  const brake = carState.keys.has('s') || carState.keys.has('ArrowDown');
  const left = carState.keys.has('a') || carState.keys.has('ArrowLeft');
  const right = carState.keys.has('d') || carState.keys.has('ArrowRight');
  const steerInput = (right ? 1 : 0) - (left ? 1 : 0);
  car.speed += (throttle ? 250 : 0) * delta;
  car.speed -= (brake ? 390 : 0) * delta;
  car.speed -= 42 * delta;
  car.speed = Math.max(0, Math.min(285, car.speed));
  car.steer += (steerInput - car.steer) * Math.min(1, delta * 7);
  const steeringAngle = car.steer * 0.58;
  const wheelBase = 30;
  car.angle += (car.speed / wheelBase) * Math.tan(steeringAngle) * delta;
  car.x += Math.cos(car.angle) * car.speed * delta;
  car.y += Math.sin(car.angle) * car.speed * delta;
  carState.nearest = getNearestTrackPoint(car.x, car.y);
  const trackDistance = carState.nearest.distance;
  if (trackDistance > 66) {
    car.speed *= Math.pow(0.012, delta);
    carGameStatus.textContent = 'Poza torem · trakcja ograniczona';
  } else {
    carGameStatus.textContent = `Prędkość ${Math.round(car.speed)} km/h · przyczepność aktywna`;
  }
  const checkpoint = carState.track[carState.nextCheckpoint];
  if (checkpoint && Math.hypot(car.x - checkpoint.x, car.y - checkpoint.y) < 54) {
    carState.nextCheckpoint = (carState.nextCheckpoint + 1) % carState.track.length;
    if (carState.nextCheckpoint === 1) carState.lap += 1;
  }
  carLap.textContent = `${Math.min(carState.lap, 3)} / 3`;
  carTime.textContent = `${carState.time.toFixed(1)} s`;
  drawCarGame();
  carState.frame = requestAnimationFrame(updateCarGame);
}

startCarGameBtn?.addEventListener('click', startCarGame);
closeCarGameBtn?.addEventListener('click', closeCarGame);
carGameModal?.addEventListener('click', (event) => {
  if (event.target.dataset.closeCarGame === 'true') closeCarGame();
});
window.addEventListener('keydown', (event) => {
  if (!carGameModal || carGameModal.classList.contains('hidden')) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
    carState.keys.add(event.key.toLowerCase());
    event.preventDefault();
  }
  if (event.key === 'Escape') closeCarGame();
});
window.addEventListener('keyup', (event) => carState.keys.delete(event.key.toLowerCase()));

if (input) {
  const originalAskAssistant = askAssistant;
  askAssistant = function patchedAskAssistant(text) {
    if (String(text || '').trim().toUpperCase() === 'CSM') {
      openCarGame();
      return Promise.resolve();
    }
    return originalAskAssistant(text);
  };
}

function categoryVisual(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('anatom')) return { className: 'visual-anatomy', symbol: '骨' };
  if (normalized.includes('fizjolog')) return { className: 'visual-physiology', symbol: '♥' };
  if (normalized.includes('biochem')) return { className: 'visual-biochemistry', symbol: '✣' };
  if (normalized.includes('genety')) return { className: 'visual-genetics', symbol: 'DNA' };
  if (normalized.includes('patomorf')) return { className: 'visual-pathology', symbol: '◉' };
  if (normalized.includes('lekarski')) return { className: 'visual-medical', symbol: '＋' };
  if (normalized.includes('ratown')) return { className: 'visual-rescue', symbol: '✚' };
  if (normalized.includes('triage')) return { className: 'visual-triage', symbol: 'A' };
  if (normalized.includes('protocol')) return { className: 'visual-protocol', symbol: '▤' };
  return { className: 'visual-medical', symbol: '✚' };
}
const quizQuestion = document.getElementById('quizQuestion');
const quizOptions = document.getElementById('quizOptions');
const quizFeedback = document.getElementById('quizFeedback');
const quizNext = document.getElementById('quizNext');

const newsItems = [
  { kicker: 'Ratownictwo', title: 'Systemy emergency care wymagają ciągłej gotowości', text: 'Zintegrowana opieka przedszpitalna, SOR i szybkie przekazanie pacjenta skracają czas do właściwego leczenia.', source: 'WHO · Emergency care systems' },
  { kicker: 'Medycyna kryzysowa', title: 'ABCDE porządkuje ocenę pacjenta w stanie nagłym', text: 'Uporządkowana ocena dróg oddechowych, oddechu, krążenia, neurologii i ekspozycji ogranicza ryzyko przeoczeń.', source: 'Lokalna baza wiedzy CSMek' },
  { kicker: 'Bezpieczeństwo pacjenta', title: 'Komunikacja zespołu jest częścią skutecznej pomocy', text: 'Krótki meldunek, potwierdzenie polecenia i jasne przekazanie odpowiedzialności pomagają utrzymać ciągłość działań.', source: 'CSMek · standardy symulacji' },
  { kicker: 'Pierwsza pomoc', title: 'Wczesne rozpoznanie zagrożenia zmienia priorytet działania', text: 'Najpierw oceń bezpieczeństwo miejsca, stan świadomości i oddech, a następnie wezwij pomoc odpowiednią do sytuacji.', source: 'Lokalna baza wiedzy CSMek' },
  { kicker: 'Diagnostyka', title: 'Dane kliniczne trzeba interpretować w kontekście pacjenta', text: 'Pojedynczy objaw lub parametr nie zastępuje badania, wywiadu i oceny dynamiki stanu chorego.', source: 'CSMek · materiały edukacyjne' },
  { kicker: 'Nauka', title: 'Powtarzalne ćwiczenia wzmacniają decyzje pod presją czasu', text: 'Symulacja, omówienie i ponowne wykonanie procedury pozwalają utrwalać poprawne priorytety kliniczne.', source: 'CSMek · centrum symulacji' }
];

let newsOffset = 0;
let liveNewsItems = [...newsItems];

function renderNews({ animate = false } = {}) {
  if (!newsFeed) return;
  const visibleNews = [0, 1].map((step) => liveNewsItems[(newsOffset + step) % liveNewsItems.length]);
  const replacement = visibleNews.map((item) => `
    <article class="news-item news-item-entering${animate ? ' news-item-from-right' : ''}">
      <span class="news-kicker">${escapeHtml(item.kicker)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
      <small>Źródło: ${escapeHtml(item.source)}</small>
    </article>
  `).join('');
  if (animate && newsFeed.children.length) {
    newsFeed.classList.add('news-feed-exiting');
    window.setTimeout(() => {
      newsFeed.innerHTML = replacement;
      newsFeed.classList.remove('news-feed-exiting');
    }, 260);
  } else {
    newsFeed.innerHTML = replacement;
  }
}

async function refreshLiveNews({ animate = true } = {}) {
  try {
    const response = await fetch('/api/news', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.items) || !data.items.length) throw new Error('news unavailable');
    liveNewsItems = data.items;
  } catch (error) {
    liveNewsItems = newsItems;
  }
  newsOffset = (newsOffset + 2) % liveNewsItems.length;
  renderNews({ animate });
}

refreshNewsBtn?.addEventListener('click', () => refreshLiveNews({ animate: true }));

refreshLiveNews({ animate: false });
window.setInterval(() => refreshLiveNews({ animate: true }), 30000);

if (window.scrollY > 0) {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

if (libraryModal && libraryModal.parentElement !== document.body) {
  document.body.appendChild(libraryModal);
}

if (carGameModal && carGameModal.parentElement !== document.body) {
  document.body.appendChild(carGameModal);
}

const weatherLabels = {
  0: 'Bezchmurnie', 1: 'Przeważnie bezchmurnie', 2: 'Częściowe zachmurzenie', 3: 'Pochmurnie',
  45: 'Mgła', 48: 'Szadź i mgła', 51: 'Lekka mżawka', 53: 'Mżawka', 55: 'Silna mżawka',
  61: 'Lekki deszcz', 63: 'Deszcz', 65: 'Silny deszcz', 71: 'Lekki śnieg', 73: 'Śnieg',
  75: 'Silny śnieg', 80: 'Przelotne opady', 81: 'Przelotny deszcz', 82: 'Silne przelotne opady',
  95: 'Burza', 96: 'Burza z gradem', 99: 'Burza z silnym gradem'
};

async function loadWeather() {
  if (!weatherTemperature || !weatherCondition || !weatherDetails) return;

  try {
    const response = await fetch('/api/weather');
    const data = await response.json();
    if (data.error || data.temperature === null || data.temperature === undefined) {
      throw new Error('Weather unavailable');
    }

    weatherTemperature.textContent = `${Math.round(data.temperature)}°C`;
    weatherCondition.textContent = weatherLabels[data.weather_code] || 'Warunki zmienne';
    weatherDetails.textContent = `${data.city} · odczuwalna ${Math.round(data.apparent_temperature)}°C · wiatr ${Math.round(data.wind)} km/h · wilgotność ${data.humidity}%`;
  } catch (error) {
    weatherTemperature.textContent = '--°C';
    weatherCondition.textContent = 'Dane chwilowo niedostępne';
    weatherDetails.textContent = 'Lublin · sprawdź połączenie z internetem';
  }
}

loadWeather();
setInterval(loadWeather, 300000);

const quizQuestions = [
  {
    question: 'W ocenie ABCDE litera C oznacza przede wszystkim:',
    options: ['Stan neurologiczny', 'Krążenie i masywne krwawienie', 'Ekspozycję pacjenta', 'Drożność dróg oddechowych'],
    answer: 1,
    explanation: 'C obejmuje krążenie, perfuzję i kontrolę krytycznego krwawienia.'
  },
  {
    question: 'Który objaw wymaga natychmiastowej eskalacji pomocy?',
    options: ['Lekki ból mięśni po wysiłku', 'Nagłe zaburzenia mowy i osłabienie jednej strony ciała', 'Przejściowe pragnienie', 'Niewielkie otarcie skóry'],
    answer: 1,
    explanation: 'Nagłe objawy ogniskowe mogą wskazywać na udar. Czas ma znaczenie.'
  },
  {
    question: 'Podczas drgawek należy:',
    options: ['Włożyć przedmiot do ust pacjenta', 'Przytrzymywać kończyny siłą', 'Zabezpieczyć otoczenie i chronić głowę', 'Podać napój'],
    answer: 2,
    explanation: 'Najważniejsze jest bezpieczeństwo, ochrona głowy i ocena stanu po napadzie.'
  },
  {
    question: 'Głównym celem triage jest:',
    options: ['Ustalenie pełnej diagnozy', 'Ustalenie priorytetu pilności pomocy', 'Zastąpienie badania lekarskiego', 'Dobór antybiotyku'],
    answer: 1,
    explanation: 'Triage porządkuje pilność i kolejność pomocy, nie zastępuje diagnostyki.'
  },
  {
    question: 'Przy podejrzeniu ciężkiego krwotoku pierwszym działaniem jest:',
    options: ['Bezpośredni ucisk na ranę', 'Podanie jedzenia', 'Samodzielne usuwanie każdego ciała obcego', 'Pozostawienie pacjenta bez obserwacji'],
    answer: 0,
    explanation: 'Bezpośredni ucisk pomaga ograniczyć utratę krwi do czasu przybycia pomocy.'
  }
];

let currentQuizIndex = 0;

function renderQuiz() {
  if (!quizQuestion || !quizOptions || !quizFeedback || !quizNext) return;
  const item = quizQuestions[currentQuizIndex];
  quizQuestion.textContent = item.question;
  quizFeedback.textContent = '';
  quizFeedback.className = 'quiz-feedback';
  quizNext.hidden = true;
  quizOptions.innerHTML = '';

  item.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.textContent = option;
    button.addEventListener('click', () => {
      document.querySelectorAll('.quiz-option').forEach((optionButton) => {
        optionButton.disabled = true;
      });
      if (index === item.answer) {
        button.classList.add('correct');
        quizFeedback.textContent = `Dobrze. ${item.explanation}`;
        quizFeedback.classList.add('is-correct');
      } else {
        button.classList.add('wrong');
        document.querySelectorAll('.quiz-option')[item.answer].classList.add('correct');
        quizFeedback.textContent = `Nie tym razem. ${item.explanation}`;
        quizFeedback.classList.add('is-wrong');
      }
      quizNext.hidden = false;
    });
    quizOptions.appendChild(button);
  });
}

quizNext?.addEventListener('click', () => {
  currentQuizIndex = (currentQuizIndex + 1) % quizQuestions.length;
  renderQuiz();
});

renderQuiz();

const gameCanvas = document.getElementById('gameCanvas');
const gameStartBtn = document.getElementById('gameStartBtn');
const gameScore = document.getElementById('gameScore');
const gameStatus = document.getElementById('gameStatus');
const gameOverlay = document.getElementById('gameOverlay');
const gameContext = gameCanvas?.getContext('2d');
const laserMode = document.getElementById('laserMode');
const laserEnergy = document.getElementById('laserEnergy');
const laserEnergyBar = document.getElementById('laserEnergyBar');
const laserCooldown = document.getElementById('laserCooldown');

const gameState = {
  running: false,
  animationFrame: null,
  lastTime: 0,
  spawnTimer: 0,
  backgroundOffset: 0,
  laserUntil: 0,
  laserHit: null,
  projectiles: [],
  laserReadyAt: 0,
  laserEnergy: 100,
  score: 0,
  player: { x: 70, y: 110, radius: 15, speed: 190, velocityY: 0, tilt: 0 },
  obstacles: [],
  keys: new Set(),
  mouse: { x: 280, y: 110, inside: false, pressed: false }
};

const gameStars = Array.from({ length: 42 }, (_, index) => ({
  x: (index * 83 + 17) % 360,
  y: (index * 47 + 13) % 205,
  size: index % 5 === 0 ? 1.7 : 0.8,
  speed: 0.12 + (index % 4) * 0.06
}));

const gamePlanets = [
  { x: 285, y: 53, radius: 25, speed: 0.08, colors: ['#e4a36c', '#a64758', '#391e3e'], ring: true },
  { x: 114, y: 39, radius: 10, speed: 0.18, colors: ['#8edbd2', '#287b91', '#102d55'], ring: false },
  { x: 337, y: 166, radius: 16, speed: 0.14, colors: ['#f0c477', '#b75d55', '#48233b'], ring: false }
];

function drawGame() {
  if (!gameContext || !gameCanvas) return;
  const { width, height } = gameCanvas;
  gameContext.clearRect(0, 0, width, height);
  const background = gameContext.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#0d3445');
  background.addColorStop(0.52, '#071d2a');
  background.addColorStop(1, '#04121c');
  gameContext.fillStyle = background;
  gameContext.fillRect(0, 0, width, height);

  const glow = gameContext.createRadialGradient(width * 0.72, height * 0.2, 2, width * 0.72, height * 0.2, 150);
  glow.addColorStop(0, 'rgba(104, 220, 214, 0.2)');
  glow.addColorStop(1, 'rgba(104, 220, 214, 0)');
  gameContext.fillStyle = glow;
  gameContext.fillRect(0, 0, width, height);

  gameStars.forEach((star) => {
    const x = (star.x - gameState.backgroundOffset * star.speed * 12 + width) % width;
    const pulse = 0.5 + Math.sin(gameState.backgroundOffset * 0.7 + star.x) * 0.25;
    gameContext.globalAlpha = pulse;
    gameContext.fillStyle = '#d9ffff';
    gameContext.beginPath();
    gameContext.arc(x, star.y, star.size, 0, Math.PI * 2);
    gameContext.fill();
  });
  gameContext.globalAlpha = 1;

  if (gameState.mouse.inside) {
    const target = gameState.mouse;
    gameContext.save();
    gameContext.strokeStyle = 'rgba(255, 112, 102, 0.9)';
    gameContext.lineWidth = 1;
    gameContext.beginPath();
    gameContext.arc(target.x, target.y, 8, 0, Math.PI * 2);
    gameContext.moveTo(target.x - 13, target.y);
    gameContext.lineTo(target.x - 4, target.y);
    gameContext.moveTo(target.x + 4, target.y);
    gameContext.lineTo(target.x + 13, target.y);
    gameContext.moveTo(target.x, target.y - 13);
    gameContext.lineTo(target.x, target.y - 4);
    gameContext.moveTo(target.x, target.y + 4);
    gameContext.lineTo(target.x, target.y + 13);
    gameContext.stroke();
    gameContext.restore();
  }

  gamePlanets.forEach((planet) => {
    const x = (planet.x - gameState.backgroundOffset * planet.speed * 18 + width + 70) % (width + 70) - 35;
    const gradient = gameContext.createRadialGradient(
      x - planet.radius * 0.35,
      planet.y - planet.radius * 0.4,
      planet.radius * 0.08,
      x,
      planet.y,
      planet.radius * 1.15
    );
    gradient.addColorStop(0, planet.colors[0]);
    gradient.addColorStop(0.55, planet.colors[1]);
    gradient.addColorStop(1, planet.colors[2]);
    gameContext.save();
    gameContext.globalAlpha = 0.94;
    gameContext.shadowColor = planet.colors[1];
    gameContext.shadowBlur = 15;
    gameContext.fillStyle = gradient;
    gameContext.beginPath();
    gameContext.arc(x, planet.y, planet.radius, 0, Math.PI * 2);
    gameContext.fill();
    gameContext.shadowBlur = 0;
    if (planet.ring) {
      gameContext.strokeStyle = 'rgba(241, 205, 148, 0.62)';
      gameContext.lineWidth = 3;
      gameContext.beginPath();
      gameContext.ellipse(x, planet.y + 2, planet.radius * 1.55, planet.radius * 0.32, -0.18, 0, Math.PI * 2);
      gameContext.stroke();
    }
    gameContext.restore();
  });

  gameContext.save();
  gameContext.strokeStyle = 'rgba(104, 220, 214, 0.16)';
  gameContext.lineWidth = 1;
  const horizon = height * 0.28;
  for (let index = -1; index < 13; index += 1) {
    const progress = ((index + 1) / 13 + (gameState.backgroundOffset % 1) / 13) % 1;
    const y = horizon + (height - horizon) * progress * progress;
    gameContext.beginPath();
    gameContext.moveTo(0, y);
    gameContext.lineTo(width, y);
    gameContext.stroke();
  }
  for (let x = -width; x <= width * 2; x += 36) {
    gameContext.beginPath();
    gameContext.moveTo(width / 2, horizon);
    gameContext.lineTo(x, height);
    gameContext.stroke();
  }
  gameContext.restore();

  gameContext.fillStyle = 'rgba(5, 16, 24, 0.36)';
  gameContext.fillRect(0, 0, width, horizon);
  gameContext.fillStyle = 'rgba(240, 196, 119, 0.7)';
  gameContext.font = '700 7px Segoe UI, sans-serif';
  gameContext.letterSpacing = '1px';
  gameContext.fillText('BIO-SECURITY TRAINING DECK  //  CSMEK', 12, 16);

  gameContext.save();
  gameContext.globalAlpha = 0.45;
  gameContext.strokeStyle = 'rgba(201, 248, 247, 0.75)';
  gameContext.lineWidth = 1;
  for (let index = 0; index < 18; index += 1) {
    const x = (index * 47 + 19) % width;
    const travel = (gameState.backgroundOffset * (18 + (index % 4) * 8) + index * 29) % (height + 30);
    const y = travel - 20;
    gameContext.beginPath();
    gameContext.moveTo(x, y);
    gameContext.lineTo(x - 2, y + 10 + (index % 3) * 5);
    gameContext.stroke();
  }
  gameContext.restore();

  gameState.obstacles.forEach((obstacle) => {
    gameContext.save();
    gameContext.translate(obstacle.x, obstacle.y);
    const extrusion = Math.max(4, obstacle.radius * 0.42);
    gameContext.save();
    gameContext.globalAlpha = 0.26;
    gameContext.fillStyle = '#020910';
    for (let depth = extrusion; depth > 0; depth -= 2) {
      gameContext.save();
      gameContext.translate(depth * 0.7, depth);
      gameContext.beginPath();
      gameContext.ellipse(0, 0, obstacle.radius + 7, obstacle.radius + 3, obstacle.rotation, 0, Math.PI * 2);
      gameContext.fill();
      gameContext.restore();
    }
    gameContext.restore();
    gameContext.shadowColor = obstacle.type === 'virus' ? 'rgba(240, 138, 103, 0.65)' : 'rgba(101, 224, 160, 0.55)';
    gameContext.shadowBlur = 12;
    gameContext.fillStyle = obstacle.type === 'virus' ? '#ed755e' : '#52d896';
    gameContext.strokeStyle = obstacle.type === 'virus' ? '#ffd0a3' : '#c2ffe0';
    gameContext.lineWidth = 1.5;
    if (obstacle.type === 'virus') {
      gameContext.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12;
        const radius = i % 2 === 0 ? obstacle.radius + 6 : obstacle.radius;
        const pointX = Math.cos(angle) * radius;
        const pointY = Math.sin(angle) * radius;
        if (i === 0) gameContext.moveTo(pointX, pointY);
        else gameContext.lineTo(pointX, pointY);
      }
      gameContext.closePath();
      gameContext.fill();
      gameContext.stroke();
      gameContext.shadowBlur = 0;
      gameContext.fillStyle = 'rgba(67, 20, 36, 0.65)';
      gameContext.beginPath();
      gameContext.arc(0, 0, obstacle.radius * 0.62, 0, Math.PI * 2);
      gameContext.fill();
      gameContext.fillStyle = '#ffd7aa';
      gameContext.beginPath();
      gameContext.arc(-3, -2, 1.5, 0, Math.PI * 2);
      gameContext.arc(3, 2, 1.5, 0, Math.PI * 2);
      gameContext.fill();
    } else {
      gameContext.beginPath();
      gameContext.ellipse(0, 0, obstacle.radius + 4, obstacle.radius - 3, obstacle.rotation, 0, Math.PI * 2);
      gameContext.fill();
      gameContext.stroke();
      gameContext.fillStyle = '#0d4f4e';
      gameContext.shadowBlur = 0;
      gameContext.beginPath();
      gameContext.arc(-4, -2, 2, 0, Math.PI * 2);
      gameContext.arc(5, 2, 2, 0, Math.PI * 2);
      gameContext.fill();
    }
    gameContext.restore();
  });

  const player = gameState.player;
  gameContext.save();
  gameContext.translate(player.x, player.y);
  gameContext.rotate(player.tilt - 0.08);
  gameContext.save();
  gameContext.globalAlpha = 0.32;
  gameContext.fillStyle = '#020910';
  for (let depth = 10; depth > 0; depth -= 2) {
    gameContext.beginPath();
    gameContext.arc(depth * 0.45, depth, player.radius, 0, Math.PI * 2);
    gameContext.fill();
  }
  gameContext.restore();

  gameState.projectiles.forEach((projectile) => {
    gameContext.save();
    gameContext.resetTransform();
    projectile.trail.forEach((point, index) => {
      gameContext.globalAlpha = (index + 1) / projectile.trail.length * 0.42;
      gameContext.fillStyle = '#ff5268';
      gameContext.beginPath();
      gameContext.arc(point.x, point.y, 2 + index * 0.3, 0, Math.PI * 2);
      gameContext.fill();
    });
    gameContext.globalAlpha = 1;
    gameContext.fillStyle = '#fff8e6';
    gameContext.shadowColor = '#ff304f';
    gameContext.shadowBlur = 18;
    gameContext.beginPath();
    gameContext.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
    gameContext.fill();
    gameContext.restore();
  });

  if (gameState.laserHit && gameState.laserHit.until > performance.now()) {
    const hit = gameState.laserHit;
    gameContext.save();
    gameContext.resetTransform();
    gameContext.globalAlpha = (hit.until - performance.now()) / 260;
    gameContext.strokeStyle = '#ffd36e';
    gameContext.lineWidth = 2;
    gameContext.beginPath();
    gameContext.arc(hit.x, hit.y, hit.radius, 0, Math.PI * 2);
    gameContext.stroke();
    gameContext.restore();
  }
  gameContext.shadowColor = 'rgba(97, 217, 209, 0.7)';
  gameContext.shadowBlur = 16;
  gameContext.shadowBlur = 0;
  gameContext.strokeStyle = '#e5fffb';
  gameContext.lineWidth = 1.5;
  gameContext.lineCap = 'round';
  const flameLength = 9 + Math.sin(gameState.backgroundOffset * 4) * 3;
  gameContext.fillStyle = '#f0c477';
  gameContext.shadowColor = 'rgba(240, 196, 119, 0.9)';
  gameContext.shadowBlur = 10;
  gameContext.beginPath();
  gameContext.moveTo(-14, -3);
  gameContext.lineTo(-14 - flameLength, 0);
  gameContext.lineTo(-14, 3);
  gameContext.closePath();
  gameContext.fill();
  gameContext.shadowBlur = 0;
  gameContext.fillStyle = '#bdebea';
  gameContext.beginPath();
  gameContext.moveTo(-24, 0);
  gameContext.lineTo(-13, -3);
  gameContext.lineTo(-13, 3);
  gameContext.closePath();
  gameContext.fill();
  gameContext.stroke();

  const syringeBody = gameContext.createLinearGradient(-12, 0, 17, 0);
  syringeBody.addColorStop(0, '#197f91');
  syringeBody.addColorStop(0.45, '#d9fffa');
  syringeBody.addColorStop(0.62, '#63d9d0');
  syringeBody.addColorStop(1, '#147080');
  gameContext.fillStyle = syringeBody;
  gameContext.beginPath();
  gameContext.roundRect(-11, -7, 29, 14, 4);
  gameContext.fill();
  gameContext.stroke();

  gameContext.fillStyle = 'rgba(36, 132, 151, 0.54)';
  gameContext.fillRect(-5, -5, 15, 10);
  gameContext.strokeStyle = 'rgba(12, 79, 94, 0.7)';
  for (let mark = -1; mark < 3; mark += 1) {
    gameContext.beginPath();
    gameContext.moveTo(mark * 4 + 1, -5);
    gameContext.lineTo(mark * 4 + 1, 5);
    gameContext.stroke();
  }

  gameContext.strokeStyle = '#f4fffb';
  gameContext.lineWidth = 2;
  gameContext.beginPath();
  gameContext.moveTo(17, 0);
  gameContext.lineTo(29, 0);
  gameContext.stroke();
  gameContext.fillStyle = '#f4fffb';
  gameContext.beginPath();
  gameContext.arc(29, 0, 1.6, 0, Math.PI * 2);
  gameContext.fill();

  gameContext.strokeStyle = '#8ce8e1';
  gameContext.lineWidth = 2;
  gameContext.beginPath();
  gameContext.moveTo(-14, -9);
  gameContext.lineTo(-14, 9);
  gameContext.moveTo(-18, -9);
  gameContext.lineTo(-10, -9);
  gameContext.moveTo(-18, 9);
  gameContext.lineTo(-10, 9);
  gameContext.stroke();
  gameContext.fillStyle = '#102f3b';
  gameContext.beginPath();
  gameContext.arc(-5, -2, 2.5, 0, Math.PI * 2);
  gameContext.arc(5, -2, 2.5, 0, Math.PI * 2);
  gameContext.fill();
  gameContext.strokeStyle = '#102f3b';
  gameContext.beginPath();
  gameContext.arc(0, 3, 6, 0.15, Math.PI - 0.15);
  gameContext.stroke();
  gameContext.restore();
}

function spawnGameObstacle() {
  gameState.obstacles.push({
    x: gameCanvas.width + 20,
    y: 22 + Math.random() * (gameCanvas.height - 44),
    radius: 8 + Math.random() * 6,
    speed: 72 + Math.random() * 48 + gameState.score * 0.018,
    rotation: Math.random() * Math.PI,
    type: Math.random() > 0.48 ? 'virus' : 'bacterium'
  });
}

function endGame() {
  gameState.running = false;
  gameStartBtn.textContent = 'Zagraj ponownie';
  gameStatus.textContent = `Koniec rundy. Wynik: ${gameState.score} pkt. Omijaj przeszkody i spróbuj pobić rekord.`;
  gameOverlay.innerHTML = '<strong>Kolizja biologiczna!</strong><span>CSMek potrzebuje chwili na regenerację.</span>';
  gameOverlay.classList.remove('hidden');
  if (gameState.animationFrame) cancelAnimationFrame(gameState.animationFrame);
}

function canvasPoint(event) {
  const rect = gameCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * gameCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * gameCanvas.height
  };
}

function fireLaser() {
  if (!gameState.running || !gameCanvas) return;
  const now = performance.now();
  if (now < gameState.laserReadyAt || gameState.laserEnergy < 8) {
    if (laserMode) laserMode.textContent = gameState.laserEnergy < 8 ? 'ENERGIA LOW' : 'CHŁODZENIE';
    return;
  }
  const target = gameState.mouse;
  const origin = gameState.player;
  const angle = origin.tilt - 0.08;
  const startX = origin.x + Math.cos(angle) * 30;
  const startY = origin.y + Math.sin(angle) * 30;
  const dx = target.x - startX;
  const dy = target.y - startY;
  const distance = Math.hypot(dx, dy) || 1;

  gameState.projectiles.push({
    x: startX,
    y: startY,
    vx: (dx / distance) * 520,
    vy: (dy / distance) * 520,
    life: 900,
    trail: []
  });
  gameState.laserReadyAt = now + 95;
  gameState.laserEnergy -= 8;
  gameState.laserUntil = now + 75;
  gameStatus.textContent = 'Pocisk energetyczny wystrzelony';
}

function updateGame(timestamp) {
  if (!gameState.running) return;
  const delta = Math.min((timestamp - gameState.lastTime) / 1000, 0.05);
  gameState.lastTime = timestamp;
  gameState.backgroundOffset = (gameState.backgroundOffset + delta * 1.9) % 13;
  gameState.laserEnergy = Math.min(100, gameState.laserEnergy + delta * 9);
  const cooldownRemaining = Math.max(0, gameState.laserReadyAt - timestamp);
  if (laserEnergy) laserEnergy.textContent = `${Math.round(gameState.laserEnergy)}%`;
  if (laserEnergyBar) laserEnergyBar.style.width = `${gameState.laserEnergy}%`;
  if (laserCooldown) laserCooldown.textContent = cooldownRemaining > 0 ? `ŁADOWANIE ${(cooldownRemaining / 1000).toFixed(1)}s` : 'GOTOWY';
  if (laserMode && cooldownRemaining <= 0 && gameState.laserEnergy >= 8) laserMode.textContent = 'ARMED';
  const player = gameState.player;
  const directionX = (gameState.keys.has('ArrowRight') || gameState.keys.has('d') ? 1 : 0) - (gameState.keys.has('ArrowLeft') || gameState.keys.has('a') ? 1 : 0);
  const directionY = (gameState.keys.has('ArrowDown') || gameState.keys.has('s') ? 1 : 0) - (gameState.keys.has('ArrowUp') || gameState.keys.has('w') ? 1 : 0);
  player.x = Math.max(player.radius, Math.min(gameCanvas.width - player.radius, player.x + directionX * player.speed * delta));
  const verticalAcceleration = 900;
  const maximumVerticalSpeed = 280;
  const verticalDrag = Math.exp(-5.5 * delta);
  if (directionY) {
    player.velocityY += directionY * verticalAcceleration * delta;
  } else {
    player.velocityY *= verticalDrag;
  }
  player.velocityY = Math.max(-maximumVerticalSpeed, Math.min(maximumVerticalSpeed, player.velocityY));
  player.y += player.velocityY * delta;
  if (player.y < player.radius) {
    player.y = player.radius;
    player.velocityY = Math.max(0, player.velocityY);
  } else if (player.y > gameCanvas.height - player.radius) {
    player.y = gameCanvas.height - player.radius;
    player.velocityY = Math.min(0, player.velocityY);
  }
  const targetTilt = -directionX * 0.28 + Math.max(-0.16, Math.min(0.16, player.velocityY / 1750));
  player.tilt += (targetTilt - player.tilt) * Math.min(1, delta * 9);
  if (gameState.mouse.pressed) fireLaser();

  gameState.projectiles.forEach((projectile) => {
    projectile.trail.unshift({ x: projectile.x, y: projectile.y });
    projectile.trail = projectile.trail.slice(0, 5);
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;
    projectile.life -= delta * 1000;
  });
  gameState.projectiles = gameState.projectiles.filter((projectile) => {
    if (projectile.life <= 0) return false;
    for (let index = 0; index < gameState.obstacles.length; index += 1) {
      const obstacle = gameState.obstacles[index];
      if (Math.hypot(projectile.x - obstacle.x, projectile.y - obstacle.y) < obstacle.radius + 7) {
        gameState.obstacles.splice(index, 1);
        gameState.score += 50;
        gameState.laserHit = { x: obstacle.x, y: obstacle.y, radius: obstacle.radius + 15, until: performance.now() + 260 };
        gameStatus.textContent = 'Trafienie potwierdzone: +50 pkt · pocisk celny';
        return false;
      }
    }
    return projectile.x > -30 && projectile.x < gameCanvas.width + 30 && projectile.y > -30 && projectile.y < gameCanvas.height + 30;
  });

  gameState.spawnTimer += delta;
  if (gameState.spawnTimer > Math.max(0.42, 1.05 - gameState.score / 900)) {
    gameState.spawnTimer = 0;
    spawnGameObstacle();
  }

  gameState.obstacles.forEach((obstacle) => {
    obstacle.x -= obstacle.speed * delta;
    obstacle.rotation += delta * 2;
  });
  gameState.obstacles = gameState.obstacles.filter((obstacle) => obstacle.x > -30);
  for (const obstacle of gameState.obstacles) {
    const distance = Math.hypot(player.x - obstacle.x, player.y - obstacle.y);
    if (distance < player.radius + obstacle.radius + 3) {
      endGame();
      return;
    }
  }

  gameState.score += Math.round(delta * 10);
  gameScore.textContent = gameState.score;
  gameStatus.textContent = 'Ruch: strzałki / WASD · unikaj bakterii i wirusów';
  drawGame();
  gameState.animationFrame = requestAnimationFrame(updateGame);
}

function startGame() {
  if (!gameCanvas || !gameContext) return;
  gameState.running = true;
  gameState.lastTime = performance.now();
  gameState.spawnTimer = 0;
  gameState.score = 0;
  gameState.obstacles = [];
  gameState.projectiles = [];
  gameState.backgroundOffset = 0;
  gameState.laserUntil = 0;
  gameState.laserHit = null;
  gameState.laserReadyAt = 0;
  gameState.laserEnergy = 100;
  if (laserMode) laserMode.textContent = 'ARMED';
  if (laserEnergy) laserEnergy.textContent = '100%';
  if (laserEnergyBar) laserEnergyBar.style.width = '100%';
  if (laserCooldown) laserCooldown.textContent = 'GOTOWY';
  gameState.player.x = 70;
  gameState.player.y = gameCanvas.height / 2;
  gameState.player.velocityY = 0;
  gameState.player.tilt = 0;
  gameScore.textContent = '0';
  gameStatus.textContent = 'Ruch: strzałki / WASD · unikaj bakterii i wirusów';
  gameStartBtn.textContent = 'Restart gry';
  gameOverlay.classList.add('hidden');
  gameState.animationFrame = requestAnimationFrame(updateGame);
}

gameStartBtn?.addEventListener('click', startGame);
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
    gameState.keys.add(event.key);
    if (gameState.running) event.preventDefault();
  }
});
window.addEventListener('keyup', (event) => gameState.keys.delete(event.key));
gameCanvas?.addEventListener('pointermove', (event) => {
  gameState.mouse = { ...canvasPoint(event), inside: true };
  drawGame();
});
gameCanvas?.addEventListener('pointerdown', (event) => {
  gameState.mouse = { ...canvasPoint(event), inside: true };
  gameState.mouse.pressed = true;
  gameCanvas.setPointerCapture?.(event.pointerId);
  fireLaser();
});
gameCanvas?.addEventListener('pointerup', (event) => {
  gameState.mouse.pressed = false;
  gameCanvas.releasePointerCapture?.(event.pointerId);
});
gameCanvas?.addEventListener('pointercancel', () => {
  gameState.mouse.pressed = false;
});
gameCanvas?.addEventListener('pointerleave', () => {
  gameState.mouse.pressed = false;
  gameState.mouse.inside = false;
  drawGame();
});
gameCanvas?.addEventListener('contextmenu', (event) => event.preventDefault());
drawGame();

const medicalFacts = [
  'Ludzki mózg zużywa około 20% całkowitego tlenu organizmu.',
  'Serce dorosłego człowieka pompuje około 5 litrów krwi na minutę w spoczynku.',
  'Skóra jest największym organem ludzkiego ciała.',
  'Wątroba ma zdolność regeneracji i może odzyskać część swojej masy po uszkodzeniu.',
  'W ciągu doby ludzkie ciało wytwarza tysiące komórek krwi.',
  'Przełyk przekazuje pokarm dzięki falom perystaltycznym, które działają bez kontroli świadomej.',
  'Mięśnie potrzebują energii do pracy nawet podczas odpoczynku.',
  'Ważne jest picie odpowiedniej ilości wody, ponieważ odwodnienie wpływa na pracę mózgu i układu krążenia.'
];

function rotateMedicalFact() {
  if (!factText) return;
  const randomFact = medicalFacts[Math.floor(Math.random() * medicalFacts.length)];
  factText.textContent = randomFact;
}

rotateMedicalFact();
setInterval(rotateMedicalFact, 7000);

async function loadLibrary() {
  if (!libraryList || !libraryDetail) return;

  libraryList.innerHTML = '<p class="library-status">Ładowanie kategorii...</p>';
  libraryDetail.innerHTML = '<p class="library-status">Ładowanie treści biblioteki...</p>';

  try {
    const response = await fetch('/api/library');
    if (!response.ok) {
      throw new Error(`Library request failed: ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];
    knowledgeItems = items;

    if (!items.length) {
      libraryList.innerHTML = '<p class="library-status">Brak kategorii do wyświetlenia.</p>';
      libraryDetail.innerHTML = '<p class="library-status">Biblioteka nie zawiera jeszcze dokumentów.</p>';
      return;
    }

    libraryList.innerHTML = '';
    items.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'library-item' + (index === 0 ? ' active' : '');
      btn.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
      btn.dataset.search = `${item.summary || ''} ${(item.sections || []).map((section) => `${section.title} ${(section.text || []).join(' ')} ${(section.points || []).join(' ')}`).join(' ')}`;
      const visual = categoryVisual(item.title);
      btn.innerHTML = `<span class="category-visual ${visual.className}" aria-hidden="true"><span>${visual.symbol}</span></span><span class="category-item-copy"><strong>${escapeHtml(item.title)}</strong><small>Dokument źródłowy</small></span><span class="category-item-arrow">→</span>`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.library-item').forEach((el) => el.classList.remove('active'));
        document.querySelectorAll('.library-item').forEach((el) => el.setAttribute('aria-pressed', 'false'));
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        showLibraryDetail(item);
      });
      libraryList.appendChild(btn);
    });

  } catch (error) {
    libraryList.innerHTML = '<p class="library-status">Nie udało się załadować kategorii.</p>';
    libraryDetail.innerHTML = '<p class="library-status">Sprawdź połączenie z serwerem i spróbuj ponownie.</p>';
  }
}

librarySearch?.addEventListener('input', () => {
  const query = librarySearch.value.trim().toLocaleLowerCase('pl-PL');
  libraryList?.querySelectorAll('.library-item').forEach((item) => {
    item.hidden = query && !(item.textContent + (item.dataset.search || '')).toLocaleLowerCase('pl-PL').includes(query);
  });
});

function showLibraryDetail(item) {
  if (!categoryInfoDetail || !categoryInfoModal) return;

  const title = escapeHtml(item.title || 'Dokument');
  const summary = escapeHtml(item.summary || 'Brak podsumowania.');
  const sections = Array.isArray(item.sections) ? item.sections : [];
  const sectionMarkup = sections.map((section) => {
    const sectionTitle = escapeHtml(section.title || 'Sekcja');
    const paragraphs = (section.text || [])
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join('');
    const points = (section.points || []).length
      ? `<ul>${section.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
      : '';
    return `<article class="library-section"><h4>${sectionTitle}</h4>${paragraphs}${points}</article>`;
  }).join('');

  if (categoryInfoTitle) {
    categoryInfoTitle.textContent = item.title || 'Wybrana kategoria';
  }
  categoryInfoDetail.innerHTML = `<div class="library-intro"><h3 class="library-detail-title">${title}</h3><p>${summary}</p></div>${sectionMarkup || '<p class="library-status">Brak szczegółowych sekcji.</p>'}`;
  categoryInfoModal.classList.remove('hidden');
  categoryInfoModal.setAttribute('aria-hidden', 'false');
}

function closeCategoryInfo() {
  if (!categoryInfoModal) return;
  categoryInfoModal.classList.add('hidden');
  categoryInfoModal.setAttribute('aria-hidden', 'true');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function polishAnswerLine(value) {
  let line = String(value || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
  if (!line) return '';
  if (!/^[-*•]|^\d+[.)]|^#{1,4}\s/.test(line)) {
    line = line.charAt(0).toUpperCase() + line.slice(1);
    if (!/[.!?:;)]$/.test(line)) line += '.';
  }
  return line;
}

function formatAnswer(answer) {
  const lines = String(answer || '').replace(/\r/g, '').split('\n').map(polishAnswerLine);
  const blocks = [];
  let listItems = [];
  let priorityMode = false;

  function flushList() {
    if (!listItems.length) return;
    blocks.push(`<ul class="answer-list${priorityMode ? ' answer-priority-list' : ''}">${listItems.join('')}</ul>`);
    listItems = [];
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const listMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      listItems.push(`<li>${escapeHtml(listMatch[1])}</li>`);
      return;
    }

    flushList();
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/) || line.match(/^(.{2,70}):$/);
    const cleanLine = headingMatch ? headingMatch[1] : line;
    if (headingMatch) {
      priorityMode = /najważniejsze|priorytet|pamiętaj|co zrobić/i.test(cleanLine);
    }
    const isAlert = /(pilnie|natychmiast|alarm|zagroż|112|999|nie oddycha|silne krwawienie|duszność)/i.test(cleanLine);
    const className = headingMatch
      ? `answer-heading${priorityMode ? ' answer-summary-heading' : ''}`
      : isAlert ? 'answer-alert' : 'answer-paragraph';
    blocks.push(`<div class="${className}">${isAlert ? '<span class="answer-alert-mark">!</span>' : ''}${escapeHtml(cleanLine)}</div>`);
  });

  flushList();
  return blocks.join('') || '<div class="answer-paragraph">Brak treści odpowiedzi.</div>';
}

function openLibrary() {
  if (!libraryModal) return;
  libraryModal.classList.remove('hidden');
  libraryModal.setAttribute('aria-hidden', 'false');
  libraryTrigger?.setAttribute('aria-expanded', 'true');
  document.body.classList.add('library-open');
  loadLibrary();
}

function closeLibrary() {
  if (!libraryModal) return;
  libraryModal.classList.add('hidden');
  libraryModal.setAttribute('aria-hidden', 'true');
  libraryTrigger?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('library-open');
  closeCategoryInfo();
}

libraryTrigger?.addEventListener('click', openLibrary);
closeLibraryBtn?.addEventListener('click', closeLibrary);
closeCategoryInfoBtn?.addEventListener('click', closeCategoryInfo);
libraryModal?.addEventListener('click', (event) => {
  if (event.target.dataset.closeLibrary === 'true') {
    closeLibrary();
  }
  if (event.target.dataset.closeCategory === 'true') {
    closeCategoryInfo();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && libraryModal && !libraryModal.classList.contains('hidden')) {
    if (categoryInfoModal && !categoryInfoModal.classList.contains('hidden')) {
      closeCategoryInfo();
    } else {
      closeLibrary();
    }
  }
});

function setTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  if (themeToggle) {
    themeToggle.textContent = isDark ? 'Jasny' : 'Ciemny';
  }
  localStorage.setItem('umbot-theme', isDark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('umbot-theme');
if (savedTheme === 'dark') {
  setTheme(true);
}

themeToggle?.addEventListener('click', () => {
  const isDark = !document.body.classList.contains('dark-mode');
  setTheme(isDark);
});

technicalPageToggle?.addEventListener('click', () => {
  window.location.href = '/technical';
});

studentFeedbackToggle?.addEventListener('click', () => {
  window.location.href = '/student-feedback';
});

function updateSystemStatus() {
  const currentHour = new Date().getHours();
  const isActive = currentHour >= 7 && currentHour < 20;
  systemStatusPill?.classList.toggle('system-active', isActive);
  systemStatusPill?.classList.toggle('system-inactive', !isActive);
  if (systemStatusText) systemStatusText.textContent = isActive ? 'System aktywny' : 'System nieaktywny';
}

updateSystemStatus();
window.setInterval(updateSystemStatus, 60000);

function speakAnswer(answer) {
  if (!answer) return;
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = 'pl-PL';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

function showAnswerInQuestionPanel(answer) {
  if (!questionAnswerSwap || !questionAnswerText) return;
  questionAnswerText.innerHTML = formatAnswer(answer);
  if (favoriteAnswerBtn) favoriteAnswerBtn.textContent = favoriteAnswers.some((item) => item.answer === answer) ? '★ Ulubione' : '☆ Ulubione';
  document.querySelector('.panel-main .actions')?.classList.add('is-hidden');
  questionAnswerSwap.hidden = false;
  requestAnimationFrame(() => questionAnswerSwap.classList.add('is-visible'));
}

copyAnswerBtn?.addEventListener('click', async () => {
  if (!latestAnswer) return;
  await navigator.clipboard.writeText(latestAnswer);
  copyAnswerBtn.textContent = 'Skopiowano';
  window.setTimeout(() => { copyAnswerBtn.textContent = 'Kopiuj'; }, 1400);
});

favoriteAnswerBtn?.addEventListener('click', () => {
  if (!latestAnswer) return;
  const index = favoriteAnswers.findIndex((item) => item.answer === latestAnswer);
  if (index >= 0) favoriteAnswers.splice(index, 1);
  else favoriteAnswers.unshift({ answer: latestAnswer, savedAt: new Date().toISOString() });
  localStorage.setItem('csmek-favorite-answers', JSON.stringify(favoriteAnswers.slice(0, 30)));
  showAnswerInQuestionPanel(latestAnswer);
});

function renderPersonalLibrary(mode = 'history') {
  if (!personalLibraryList) return;
  const entries = mode === 'favorites' ? favoriteAnswers : answerHistory;
  personalLibraryList.innerHTML = entries.length ? entries.slice(0, 6).map((entry, index) => `<button class="personal-entry" data-personal-index="${index}" type="button"><strong>${escapeHtml(entry.question || 'Zapisana odpowiedź')}</strong><small>${escapeHtml((entry.answer || '').slice(0, 140))}</small></button>`).join('') : '<p class="personal-empty">Brak zapisanych materiałów.</p>';
  personalLibraryList.querySelectorAll('.personal-entry').forEach((button) => button.addEventListener('click', () => {
    const entry = entries[Number(button.dataset.personalIndex)];
    if (entry?.question) input.value = entry.question;
    if (entry?.answer) { latestAnswer = entry.answer; showAnswerInQuestionPanel(entry.answer); }
  }));
}

personalTabs.forEach((tab) => tab.addEventListener('click', () => {
  personalTabs.forEach((item) => item.classList.toggle('is-active', item === tab));
  renderPersonalLibrary(tab.dataset.personalTab);
}));
renderPersonalLibrary();

function showQuestionInput() {
  if (!questionAnswerSwap) return;
  questionAnswerSwap.classList.remove('is-visible');
  questionAnswerSwap.classList.remove('is-expanded');
  expandAnswerBtn?.setAttribute('aria-label', 'Powiększ odpowiedź');
  window.setTimeout(() => {
    questionAnswerSwap.hidden = true;
    questionAnswerText.innerHTML = '';
    input.value = '';
    document.querySelector('.panel-main .actions')?.classList.remove('is-hidden');
    input.focus();
  }, 220);
}

newQuestionBtn?.addEventListener('click', showQuestionInput);

function toggleExpandedAnswer() {
  if (!questionAnswerSwap) return;
  const expanded = questionAnswerSwap.classList.toggle('is-expanded');
  expandAnswerBtn?.setAttribute('aria-label', expanded ? 'Zmniejsz odpowiedź' : 'Powiększ odpowiedź');
  expandAnswerBtn?.setAttribute('title', expanded ? 'Zmniejsz odpowiedź' : 'Powiększ odpowiedź');
}

expandAnswerBtn?.addEventListener('click', toggleExpandedAnswer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && questionAnswerSwap?.classList.contains('is-expanded')) toggleExpandedAnswer();
});

const fallbackSuggestions = [
  { label: 'Jak przeprowadzić ocenę pacjenta według schematu ABCDE i kiedy wezwać pomoc?', question: 'Jak przeprowadzić ocenę pacjenta według schematu ABCDE i kiedy wezwać pomoc?' },
  { label: 'Jak rozpoznać objawy udaru i jakie działania podjąć w pierwszych minutach?', question: 'Jak rozpoznać objawy udaru i jakie działania podjąć w pierwszych minutach?' },
  { label: 'Jak działa triage i jak ustalać priorytet pomocy w zdarzeniu masowym?', question: 'Jak działa triage i jak ustalać priorytet pomocy w zdarzeniu masowym?' },
  { label: 'Jak zatamować masywny krwotok do czasu przyjazdu zespołu ratownictwa?', question: 'Jak zatamować masywny krwotok do czasu przyjazdu zespołu ratownictwa?' }
];

function renderSuggestions(items) {
  if (!suggestionsList) return;
  suggestionsList.innerHTML = '';
  items.forEach((item) => {
    const suggestion = document.createElement('button');
    suggestion.type = 'button';
    suggestion.className = 'suggestion-pill';
    suggestion.dataset.question = item.question;
    suggestion.textContent = item.label;
    suggestion.title = item.question;
    suggestion.addEventListener('click', () => {
      const question = suggestion.dataset.question || '';
      if (!question) return;
      input.value = question;
      askAssistant(question);
    });
    suggestionsList.appendChild(suggestion);
  });
}

async function loadSuggestions() {
  if (!suggestionsList) return;
  if (suggestionCandidates.length) {
    renderSuggestions(suggestionCandidates.slice().sort(() => Math.random() - 0.5).slice(0, 4));
    return;
  }
  try {
    const response = await fetch('/api/library');
    if (!response.ok) throw new Error(`Library request failed: ${response.status}`);
    const data = await response.json();
    knowledgeItems = Array.isArray(data.items) ? data.items : [];
    const candidates = [];
    (Array.isArray(data.items) ? data.items : []).forEach((item) => {
      (Array.isArray(item.sections) ? item.sections : []).forEach((section) => {
        const sectionTitle = String(section.title || '').trim();
        const libraryTitle = String(item.title || '').trim();
        if (!sectionTitle || !libraryTitle) return;
        candidates.push({
          label: `Jakie są najważniejsze zasady dotyczące ${sectionTitle.toLowerCase()} w temacie ${libraryTitle.toLowerCase()}?`,
          question: `Jakie są najważniejsze zasady dotyczące ${sectionTitle.toLowerCase()} w temacie ${libraryTitle.toLowerCase()}?`
        });
      });
    });
    suggestionCandidates = candidates;
    const shuffled = suggestionCandidates.slice().sort(() => Math.random() - 0.5).slice(0, 4);
    renderSuggestions(shuffled.length ? shuffled : fallbackSuggestions);
  } catch (error) {
    renderSuggestions(fallbackSuggestions);
  }
}

function buildLocalKnowledgeAnswer(question) {
  const words = new Set((question.toLowerCase().match(/[a-ząćęłńóśźż0-9]+/g) || []).filter((word) => word.length > 3));
  const matches = [];
  knowledgeItems.forEach((item) => {
    (item.sections || []).forEach((section) => {
      const text = [section.title, ...(section.text || []), ...(section.points || [])].join(' ');
      const score = [...words].reduce((total, word) => total + (text.toLowerCase().includes(word) ? 1 : 0), 0);
      if (score) {
        matches.push({
          score,
          title: section.title,
          paragraphs: section.text || [],
          points: section.points || []
        });
      }
    });
  });
  matches.sort((first, second) => second.score - first.score);
  const selected = matches.slice(0, 3).filter((match) => match.paragraphs.length || match.points.length);
  if (!selected.length) return 'Nie znalazłem wystarczająco dokładnego fragmentu w lokalnej bazie wiedzy. Spróbuj zadać pytanie inaczej.';
  const priorityPoints = selected.flatMap((match) => match.points).slice(0, 6);
  const contextParagraphs = selected.flatMap((match) => match.paragraphs).slice(0, 3);
  return [
    '### Najważniejsze informacje',
    ...priorityPoints.map((point) => `- ${polishAnswerLine(point)}`),
    ...(priorityPoints.length ? [] : contextParagraphs.slice(0, 1).map((paragraph) => `- ${polishAnswerLine(paragraph)}`)),
    '',
    '### Kontekst',
    ...contextParagraphs.map((paragraph) => polishAnswerLine(paragraph)),
    '',
    '### Bezpieczeństwo',
    'To materiał edukacyjny i nie zastępuje profesjonalnej oceny medycznej.'
  ].join('\n');
}

rerollSuggestions?.addEventListener('click', loadSuggestions);
loadSuggestions();

speakBtn?.addEventListener('click', () => {
  if (latestAnswer) speakAnswer(latestAnswer);
});

async function askAssistant(text) {
  const value = (text || '').trim();
  if (!value) return;

  showAnswerInQuestionPanel('Przygotowuję odpowiedź...');
  if (responseText) responseText.textContent = 'Oczekuję odpowiedzi...';

  try {
    const response = await Promise.race([
      fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, history: conversationHistory.slice(-6) })
      }),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('Assistant timeout')), 30000))
    ]);

    if (!response.ok) {
      throw new Error(`Assistant request failed: ${response.status}`);
    }
    const data = await response.json();
    const answer = typeof data.answer === 'string' && data.answer.trim() ? data.answer : 'Agent nie zwrócił treści odpowiedzi.';
    latestAnswer = answer;
    answerHistory.unshift({ question: value, answer, savedAt: new Date().toISOString() });
    localStorage.setItem('csmek-answer-history', JSON.stringify(answerHistory.slice(0, 30)));
    conversationHistory.push({ role: 'user', content: value }, { role: 'assistant', content: answer });
    if (conversationHistory.length > 8) conversationHistory.splice(0, conversationHistory.length - 8);
    if (responseText) responseText.innerHTML = formatAnswer(answer);
    showAnswerInQuestionPanel(answer);
    if (speakBtn) {
      speakBtn.disabled = false;
      speakBtn.classList.add('is-ready');
    }
  } catch (error) {
    const message = 'Nie udało się uzyskać odpowiedzi od agenta. Sprawdź połączenie z usługą AI i spróbuj ponownie.';
    showAnswerInQuestionPanel(message);
    if (responseText) responseText.textContent = message;
    latestAnswer = '';
    if (speakBtn) {
      speakBtn.disabled = true;
      speakBtn.classList.remove('is-ready');
    }
  }
}

sendBtn.addEventListener('click', () => {
  const value = input.value.trim();
  if (!value) return;
  askAssistant(value);
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const value = input.value.trim();
    if (value) {
      askAssistant(value);
    }
  }
});

async function requestMicrophonePermission() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    responseText.textContent = 'Ta przeglądarka nie obsługuje rozpoznawania mowy.';
    return null;
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      responseText.textContent = 'Aby używać mikrofonu, zezwól przeglądarce na dostęp do mikrofonu.';
      return null;
    }
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pl-PL';
  recognition.interimResults = false;

  recognition.onstart = () => {
    responseText.textContent = 'Słucham...';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    askAssistant(transcript);
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') {
      responseText.textContent = 'Dostęp do mikrofonu nie został przyznany.';
    } else {
      responseText.textContent = 'Nie udało się rozpoznać mowy.';
    }
  };

  recognition.start();
  return recognition;
}

micBtn.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    responseText.textContent = 'Mikrofon nie jest wspierany w tej przeglądarce.';
    return;
  }

  responseText.textContent = 'Proszę o zgodę na użycie mikrofonu...';
  await requestMicrophonePermission();
});

if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
  micBtn.textContent = 'Brak obsługi mikrofonu';
  micBtn.disabled = true;
}

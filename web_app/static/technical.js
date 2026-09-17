document.addEventListener('click', (event) => {
  const themeButton = event.target.closest('#teamThemeToggle');
  if (!themeButton) return;
  const isDay = !document.body.classList.contains('technical-day');
  setTeamTheme(isDay);
});

const serviceDetails = {
  simulators: {
    title: 'Symulatory wysokiej wierności',
    description: 'Zespół techniczny wspiera prowadzących przed zajęciami i w ich trakcie, dbając o gotowość stanowiska do realistycznej symulacji.',
    category: 'Symulator wysokiej wierności',
    subjectLabel: 'Jaki to symulator?',
    subjectPlaceholder: 'Np. SimMan 3G, ALS, poród',
    problemLabel: 'Na czym polega problem?',
    problemPlaceholder: 'Opisz, co nie działa lub co dzieje się nieprawidłowo.'
  },
  electronics: {
    title: 'Elektronika i wyposażenie',
    description: 'Pomagamy z urządzeniami i połączeniami, które są częścią stanowiska symulacyjnego lub zaplecza dydaktycznego.',
    category: 'Elektronika / urządzenie',
    subjectLabel: 'Jakiego urządzenia dotyczy problem?',
    subjectPlaceholder: 'Np. projektor, monitor, głośnik, przewód HDMI',
    problemLabel: 'Co nie działa w urządzeniu?',
    problemPlaceholder: 'Opisz objawy, komunikaty lub sytuację, w której pojawia się problem.'
  },
  rooms: {
    title: 'Gotowość sali',
    description: 'Przed zajęciami możemy sprawdzić, czy sala jest przygotowana dla grupy i czy prezentacja będzie mogła zostać wyświetlona.',
    category: 'Sala i miejsca siedzące',
    subjectLabel: 'Której sali dotyczy zgłoszenie?',
    subjectPlaceholder: 'Np. sala symulacji 2, sala debriefingu',
    problemLabel: 'Czego brakuje lub co nie działa?',
    problemPlaceholder: 'Napisz, czy chodzi o miejsca siedzące, prezentację, obraz, dźwięk lub inne wyposażenie.'
  }
};

const modal = document.getElementById('detailModal');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalList = document.getElementById('modalList');
const closeModalButton = document.getElementById('closeModal');
const modalReportButton = document.getElementById('modalReport');
const categoryModalWindow = document.getElementById('categoryModalWindow');
const simmanVisual = document.getElementById('simmanVisual');
const simulatorQuickForm = document.getElementById('simulatorQuickForm');
const simulatorQuickResult = document.getElementById('simulatorQuickResult');
const quickSubjectLabel = document.getElementById('quickSubjectLabel');
const quickSubjectInput = document.getElementById('quickSubjectInput');
const quickProblemLabel = document.getElementById('quickProblemLabel');
const quickProblemInput = document.getElementById('quickProblemInput');
let roomSelect;
const roomReadinessFields = document.getElementById('roomReadinessFields');
const equipmentStatus = document.getElementById('equipmentStatus');
const equipmentDetailsLabel = document.getElementById('equipmentDetailsLabel');
let activeServiceKey = 'simulators';
const reportForm = document.getElementById('reportForm');
const reportResult = document.getElementById('reportResult');
const checks = [...document.querySelectorAll('.check-item input')];
const readinessBadge = document.getElementById('readinessBadge');
const readinessCount = document.getElementById('readinessCount');
const readinessProgress = document.getElementById('readinessProgress');
const homePageToggle = document.getElementById('homePageToggle');
const teamThemeToggle = document.getElementById('teamThemeToggle');
const teamToggle = document.getElementById('teamToggle');
const teamPhotoPanel = document.getElementById('teamPhotoPanel');
const teamPhotoImages = [...document.querySelectorAll('.team-photo-image')];
const otherMembersButton = document.getElementById('otherMembersButton');
const teamModal = document.getElementById('teamModal');
const closeTeamButton = document.getElementById('closeTeam');
const teamList = document.getElementById('teamList');
const memberModal = document.getElementById('memberModal');
const closeMemberButton = document.getElementById('closeMember');
const memberImage = document.getElementById('memberImage');
const memberTitle = document.getElementById('memberTitle');
const memberRole = document.getElementById('memberRole');
const memberBio = document.getElementById('memberBio');
const teamPresence = document.getElementById('teamPresence');
const teamPresenceText = document.getElementById('teamPresenceText');
const inboxToggle = document.getElementById('inboxToggle');
const inboxModal = document.getElementById('inboxModal');
const closeInboxButton = document.getElementById('closeInbox');
const inboxPasswordForm = document.getElementById('inboxPasswordForm');
const inboxPassword = document.getElementById('inboxPassword');
const inboxLoginResult = document.getElementById('inboxLoginResult');
const inboxContent = document.getElementById('inboxContent');
const inboxList = document.getElementById('inboxList');
const inboxCount = document.getElementById('inboxCount');
const inboxRefresh = document.getElementById('inboxRefresh');
let inboxAccessPassword = '';

homePageToggle?.addEventListener('click', () => {
  window.location.href = '/';
});

function setTeamTheme(isDay) {
  document.body.classList.toggle('technical-day', isDay);
  document.body.classList.toggle('technical-night', !isDay);
  if (teamThemeToggle) teamThemeToggle.textContent = isDay ? 'Ciemny' : 'Jasny';
  localStorage.setItem('technical-theme', isDay ? 'day' : 'night');
}

const savedTeamTheme = localStorage.getItem('technical-theme');
setTeamTheme(savedTeamTheme === 'day');

const csmTeam = [
  ['prof. dr hab. n. med. Kamil Torres', 'Kierownik CSM', 'KT.jpg', 'Prorektor ds. Kształcenia i Dydaktyki. Kieruje Centrum Symulacji Medycznej oraz Kliniką Chirurgii Plastycznej, Rekonstrukcyjnej i Mikrochirurgii.'],
  ['dr n. med. i n. o zdr. Jan Korulczyk', 'Zastępca Kierownika CSM · obsługa techniczna i administracyjna', 'JK.jpg', 'W CSM od 2014 roku. Odpowiada za obsługę techniczną i administracyjną Centrum.'],
  ['inż. Sławomir Łakomy', 'Kierownik Sekcji Konserwacji i Zasobów Sprzętowych', 'SLa.jpg', 'Kieruje zespołem sprzętowym i wspiera zajęcia stomatologiczne. Naprawia sprzęt symulacyjny, jeśli nie wymaga on zewnętrznego serwisu.'],
  ['mgr Anna Pożarowszczyk', 'Koordynator Biura CSM', 'AP.jpg', 'Organizuje pracę Zakładu Dydaktyki i Symulacji Medycznej oraz wspiera administracyjnie nauczycieli i studentów realizujących zajęcia w CSM.'],
  ['inż. Marcin Kruszelnicki', 'Młodszy specjalista techniczny', 'MK.jpg', 'Wspiera techniczne przygotowanie i codzienne funkcjonowanie Centrum Symulacji Medycznej.'],
  ['mgr Patrycja Korulczyk', 'Starszy Referent Inżynieryjno-Techniczny', 'PK.jpg', 'Przygotowuje statystyki, sale, materiały i charakteryzację trenażerów, manekinów oraz pacjentów standaryzowanych.'],
  ['mgr Aneta Śniosek', 'Technik symulacji medycznej', 'ASn.jpg', 'Wykonuje zadania pracownika technicznego w Centrum Symulacji Medycznej.'],
  ['mgr Aleksandra Kowalczuk', 'Technik', 'AK.jpg', 'Organizuje zajęcia dydaktyczne i zapewnia bieżące wsparcie administracyjno-techniczne.'],
  ['Michał Fornal', 'Technik symulacji medycznej', 'MF.jpg', 'Przygotowuje i rezerwuje sale oraz wspiera zespół, szkoląc go z obsługi sprzętu symulacyjnego.'],
  ['Grzegorz Aksamirski', 'Technik symulacji medycznej', 'GA.jpg', 'Wspiera pracę techniczną Centrum. Interesuje się nowymi technologiami, sportami motorowymi i astrofizyką.'],
  ['mgr Tomasz Wiączek', 'Technik symulacji medycznej', 'TW.jpg', 'Z CSM związany od 2016 roku. Wspiera realizację zadań technika symulacji medycznej.'],
  ['mgr Karolina Sacawa', 'Technik symulacji medycznej', 'KC.jpg', 'Przygotowuje sale, materiały i sprzęt dla studentów kierunku lekarsko-dentystycznego.'],
  ['Magdalena Niedźwiadek', 'Członek zespołu CSM', 'MN.jpg', 'Członkini zespołu CSM wymieniona w oficjalnym katalogu Zespołu Centrum.'],
  ['Jakub Dzikowski', 'Technik symulacji medycznej', 'JD.jpg', 'Wspiera techniczną realizację zajęć i przygotowanie infrastruktury symulacyjnej.'],
  ['Piotr Dolecki', 'Technik symulacji medycznej', 'PD.jpg', 'Wspiera techniczną realizację zajęć i przygotowanie infrastruktury symulacyjnej.'],
  ['mgr Marceli Łuczka', 'Technik symulacji medycznej', 'ML.jpg', 'W CSM od 2024 roku realizuje zadania pracownika technicznego.'],
  ['Tomasz Wałecki', 'Uniwersyteckie Centrum Egzaminów Medycznych', 'csm_blank.jpg', 'Osoba wymieniona w oficjalnym katalogu zespołu przy Uniwersyteckim Centrum Egzaminów Medycznych.']
];

const teamPhotoRotation = [2, 5, 8, 9, 15, 6, 7, 10, 11, 13, 14, 16, 0, 1, 3, 4, 12];
let teamPhotoOffset = 0;

function renderTeam() {
  if (!teamList) return;
  teamList.innerHTML = csmTeam.map(([name, role, image], index) => `<button class="team-member" type="button" data-member-index="${index}"><img src="https://csm.umlub.pl/assets/img/team/${image}" alt="" loading="lazy"><span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(role)}</small></span></button>`).join('');
  teamList.querySelectorAll('.team-member').forEach((member) => member.addEventListener('click', () => openMember(Number(member.dataset.memberIndex))));
}

function rotateTeamPhotos() {
  if (!teamPhotoImages.length) return;
  teamPhotoOffset = (teamPhotoOffset + 1) % teamPhotoRotation.length;
  teamPhotoImages.forEach((image, slot) => {
    const memberIndex = teamPhotoRotation[(teamPhotoOffset + slot) % teamPhotoRotation.length];
    const member = csmTeam[memberIndex];
    image.dataset.memberIndex = memberIndex;
    image.src = `https://csm.umlub.pl/assets/img/team/${member[2]}`;
    image.alt = `Otwórz profil ${member[0]}`;
  });
}

window.setInterval(rotateTeamPhotos, 120000);
otherMembersButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  rotateTeamPhotos();
});

function openMember(index) {
  const [name, role, image, bio] = csmTeam[index] || [];
  if (!name || !memberModal) return;
  memberImage.src = `https://csm.umlub.pl/assets/img/team/${image}`;
  memberImage.alt = name;
  memberTitle.textContent = name;
  memberRole.textContent = role;
  memberBio.textContent = bio;
  memberModal.classList.remove('hidden');
  memberModal.setAttribute('aria-hidden', 'false');
}

function closeMember() {
  memberModal?.classList.add('hidden');
  memberModal?.setAttribute('aria-hidden', 'true');
}

closeMemberButton?.addEventListener('click', closeMember);
memberModal?.addEventListener('click', (event) => {
  if (event.target.dataset.closeMember) closeMember();
});

function openTeam() {
  renderTeam();
  teamModal?.classList.remove('hidden');
  teamModal?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeTeam() {
  teamModal?.classList.add('hidden');
  teamModal?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

teamToggle?.addEventListener('click', openTeam);
teamPhotoPanel?.addEventListener('click', openTeam);
teamPhotoPanel?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openTeam();
  }
});
teamPhotoImages.forEach((image) => {
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  const openPhotoMember = (event) => {
    event.stopPropagation();
    openMember(Number(image.dataset.memberIndex));
  };
  image.addEventListener('click', openPhotoMember);
  image.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') openPhotoMember(event);
  });
});
closeTeamButton?.addEventListener('click', closeTeam);
teamModal?.addEventListener('click', (event) => {
  if (event.target.dataset.closeTeam) closeTeam();
});

function updateTeamPresence() {
  const currentHour = new Date().getHours();
  const isPresent = currentHour >= 7 && currentHour < 20;
  teamPresence?.classList.toggle('team-present', isPresent);
  teamPresence?.classList.toggle('team-absent', !isPresent);
  if (teamPresenceText) teamPresenceText.textContent = isPresent ? 'Zespół obecny' : 'Zespół nieobecny';
}

updateTeamPresence();
window.setInterval(updateTeamPresence, 60000);

function openInbox() {
  inboxModal?.classList.remove('hidden');
  inboxModal?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  inboxPassword?.focus();
}

function closeInbox() {
  inboxModal?.classList.add('hidden');
  inboxModal?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderInbox(reports) {
  inboxCount.textContent = `${reports.length} ${reports.length === 1 ? 'zgłoszenie' : 'zgłoszeń'}`;
  if (!reports.length) {
    inboxList.innerHTML = '<div class="inbox-empty">Brak zapisanych zgłoszeń.</div>';
    return;
  }
  const grouped = reports.reduce((groups, report) => {
    const category = report.category || 'Inne zgłoszenia';
    (groups[category] ||= []).push(report);
    return groups;
  }, {});
  inboxList.innerHTML = Object.entries(grouped).map(([category, categoryReports]) => `<section class="inbox-category-group"><div class="inbox-category-heading"><span>${escapeHtml(category)}</span><strong>${categoryReports.length}</strong></div>${categoryReports.map((report) => {
    const completed = Boolean(report.completed);
    return `<article class="inbox-item${completed ? ' is-completed' : ''}"><div class="inbox-item-top"><span class="inbox-category">${escapeHtml(report.category)}</span><strong>${escapeHtml(report.id)}</strong></div><div class="inbox-item-meta"><span>${escapeHtml(report.location)}</span><span>${escapeHtml(report.priority)}</span><time>${escapeHtml(report.created_at)}</time></div><p>${escapeHtml(report.description)}</p><small>Zgłaszający: ${escapeHtml(report.reporter)} · Kontakt: ${escapeHtml(report.contact)}</small><label class="completion-toggle"><input type="checkbox" data-report-id="${escapeHtml(report.id)}" ${completed ? 'checked' : ''}><span class="completion-track"><i></i></span><span class="completion-label">${completed ? 'Zrealizowane' : 'Do realizacji'}</span></label></article>`;
  }).join('')}</section>`).join('');
  inboxList.querySelectorAll('.completion-toggle input').forEach((toggle) => {
    toggle.addEventListener('change', () => updateReportStatus(toggle));
  });
}

async function updateReportStatus(toggle) {
  const item = toggle.closest('.inbox-item');
  const label = toggle.closest('.completion-toggle')?.querySelector('.completion-label');
  toggle.disabled = true;
  try {
    const response = await fetch('/api/technical-reports/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: inboxAccessPassword, report_id: toggle.dataset.reportId, completed: toggle.checked })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się zmienić statusu.');
    item?.classList.toggle('is-completed', data.completed);
    if (label) label.textContent = data.completed ? 'Zrealizowane' : 'Do realizacji';
  } catch (error) {
    toggle.checked = !toggle.checked;
    if (inboxLoginResult) {
      inboxLoginResult.textContent = error.message;
      inboxLoginResult.hidden = false;
    }
  } finally {
    toggle.disabled = false;
  }
}

async function loadInbox() {
  inboxLoginResult.hidden = true;
  try {
    const response = await fetch('/api/technical-reports/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: inboxAccessPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się otworzyć skrzynki.');
    renderInbox(data.reports || []);
    inboxContent.classList.remove('hidden');
    inboxPasswordForm.classList.add('hidden');
  } catch (error) {
    inboxLoginResult.textContent = error.message;
    inboxLoginResult.hidden = false;
    inboxPassword.select();
  }
}

inboxToggle?.addEventListener('click', openInbox);
closeInboxButton?.addEventListener('click', closeInbox);
inboxModal?.addEventListener('click', (event) => {
  if (event.target.dataset.closeInbox) closeInbox();
});
inboxPasswordForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  inboxAccessPassword = inboxPassword.value;
  loadInbox();
});
inboxRefresh?.addEventListener('click', loadInbox);

function openDetails(key) {
  const detail = serviceDetails[key];
  if (!detail || !modal) return;
  activeServiceKey = key;
  categoryModalWindow?.classList.remove('category-simulators', 'category-electronics', 'category-rooms');
  categoryModalWindow?.classList.add(`category-${key}`);
  simmanVisual?.classList.toggle('hidden', key !== 'simulators');
  modalTitle.textContent = detail.title;
  modalDescription.textContent = detail.description;
  modalList.innerHTML = '';
  modalList.classList.add('hidden');
  if (quickSubjectLabel) quickSubjectLabel.firstChild.textContent = detail.subjectLabel;
  if (quickSubjectInput) quickSubjectInput.placeholder = detail.subjectPlaceholder;
  if (key === 'rooms') {
    if (!roomSelect) {
      roomSelect = document.createElement('select');
      roomSelect.id = 'roomSelect';
      roomSelect.name = 'subject';
      roomSelect.required = true;
      roomSelect.setAttribute('aria-label', 'Wybierz numer sali');
      const roomOptions = (start, end, format = (number) => number) => Array.from({ length: end - start + 1 }, (_, index) => `<option>Sala ${format(start + index)}</option>`).join('');
      roomSelect.innerHTML = `<option value="">Wybierz numer sali</option><optgroup label="Parter / poziom 0">${roomOptions(6, 9, (number) => String(number).padStart(2, '0'))}${roomOptions(10, 22, (number) => String(number).padStart(3, '0'))}</optgroup><optgroup label="Piętro 1">${roomOptions(107, 155)}</optgroup><optgroup label="Piętro 2">${roomOptions(203, 232)}</optgroup><optgroup label="Piętro 3">${roomOptions(306, 319)}</optgroup><optgroup label="Piętro 4">${roomOptions(403, 417)}</optgroup><option>Nie znam numeru / inne miejsce</option>`;
      quickSubjectInput.parentElement.appendChild(roomSelect);
    }
    quickSubjectInput.required = false;
    quickSubjectInput.classList.add('hidden');
    roomSelect.classList.remove('hidden');
  } else {
    quickSubjectInput.required = true;
    quickSubjectInput.classList.remove('hidden');
    roomSelect?.classList.add('hidden');
    if (roomSelect) roomSelect.required = false;
  }
  if (quickProblemLabel) quickProblemLabel.firstChild.textContent = detail.problemLabel;
  if (quickProblemInput) quickProblemInput.placeholder = detail.problemPlaceholder;
  simulatorQuickForm?.classList.remove('hidden');
  modalReportButton?.classList.add('hidden');
  roomReadinessFields?.classList.toggle('hidden', key !== 'rooms');
  if (key !== 'rooms') {
    equipmentStatus.value = 'jest';
    equipmentDetailsLabel?.classList.add('hidden');
  }
  if (simulatorQuickResult) simulatorQuickResult.hidden = true;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDetails() {
  modal?.classList.add('hidden');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('.service-window').forEach((button) => {
  button.addEventListener('click', () => openDetails(button.dataset.window));
});
closeModalButton?.addEventListener('click', closeDetails);
modal?.addEventListener('click', (event) => {
  if (event.target.dataset.closeModal) closeDetails();
});
modalReportButton?.addEventListener('click', () => {
  closeDetails();
  document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' });
  document.querySelector('[name="category"]')?.focus();
});

equipmentStatus?.addEventListener('change', () => {
  equipmentDetailsLabel?.classList.toggle('hidden', equipmentStatus.value !== 'brak');
});

simulatorQuickForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = simulatorQuickForm.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(simulatorQuickForm));
  submitButton.disabled = true;
  submitButton.innerHTML = 'Zapisywanie...';
  simulatorQuickResult.hidden = true;

  try {
    const readinessSummary = activeServiceKey === 'rooms'
      ? `Miejsca siedzące: ${values.seating === 'jest' ? 'są' : 'brakuje'}; prezentacja: ${values.presentation === 'jest' ? 'możliwa' : 'niemożliwa'}; sprzęt: ${values.equipment === 'jest' ? 'jest dostępny' : `brakuje (${values.equipment_details || 'nie podano'})`}.`
      : '';
    const response = await fetch('/api/technical-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporter: 'Prowadzący',
        contact: 'Kontakt do uzupełnienia',
        category: serviceDetails[activeServiceKey].category,
        priority: 'Standardowy',
        location: values.subject,
        description: `${readinessSummary} ${values.problem}`.trim()
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się zapisać zgłoszenia.');
    simulatorQuickResult.textContent = `Zgłoszenie ${data.report_id} zapisane. Zespół techniczny otrzyma opis problemu.`;
    simulatorQuickResult.hidden = false;
    simulatorQuickForm.reset();
  } catch (error) {
    simulatorQuickResult.textContent = error.message;
    simulatorQuickResult.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Wyślij zgłoszenie <span>→</span>';
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDetails();
});

function updateReadiness() {
  const completed = checks.filter((check) => check.checked).length;
  const percentage = (completed / checks.length) * 100;
  if (readinessCount) readinessCount.textContent = `${completed} z ${checks.length} sprawdzone`;
  if (readinessProgress) readinessProgress.style.width = `${percentage}%`;
  if (readinessBadge) readinessBadge.textContent = completed === checks.length ? 'GOTOWA' : completed === 0 ? 'DO SPRAWDZENIA' : 'W TOKU';
}
checks.forEach((check) => check.addEventListener('change', updateReadiness));
updateReadiness();

reportForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = reportForm.querySelector('button[type="submit"]');
  const formData = Object.fromEntries(new FormData(reportForm));
  submitButton.disabled = true;
  submitButton.innerHTML = 'Wysyłanie...';
  reportResult.hidden = true;

  try {
    const response = await fetch('/api/technical-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się zapisać zgłoszenia.');
    reportResult.innerHTML = `<strong>Zgłoszenie ${data.report_id} zostało zapisane.</strong> Zespół techniczny otrzymał opis problemu. Zachowaj ten numer do kontaktu.`;
    reportResult.hidden = false;
    reportForm.reset();
  } catch (error) {
    reportResult.innerHTML = `<strong>Nie udało się wysłać zgłoszenia.</strong> ${error.message}`;
    reportResult.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Wyślij zgłoszenie <span>→</span>';
  }
});

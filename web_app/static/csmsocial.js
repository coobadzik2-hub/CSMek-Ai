const socialForm = document.getElementById('socialPostForm');
const socialFeed = document.getElementById('socialFeed');
const socialStatus = document.getElementById('socialFormStatus');
const refreshSocial = document.getElementById('refreshSocial');
const activeMembers = document.getElementById('activeMembers');
const socialThemeToggle = document.getElementById('socialThemeToggle');
const socialPhotoForm = document.getElementById('socialPhotoForm');
const photoFeed = document.getElementById('photoFeed');
const photoStatus = document.getElementById('photoFormStatus');
const tabButtons = document.querySelectorAll('.social-tab');
const tabPanels = document.querySelectorAll('.social-tab-panel');
const socialClientId = getSocialClientId();

function setSocialTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  if (socialThemeToggle) {
    const isLight = theme === 'light';
    socialThemeToggle.innerHTML = `${isLight ? '☾' : '☼'} <span>${isLight ? 'Ciemny' : 'Jasny'}</span>`;
    socialThemeToggle.setAttribute('aria-label', isLight ? 'Włącz ciemny tryb' : 'Włącz jasny tryb');
  }
  localStorage.setItem('csmSocialTheme', theme);
}

function getSocialClientId() {
  const key = 'csmSocialClientId';
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, value);
  }
  return value;
}

setSocialTheme(localStorage.getItem('csmSocialTheme') || 'dark');
socialThemeToggle?.addEventListener('click', () => {
  setSocialTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
});

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function renderPosts(posts) {
  if (!posts.length) {
    socialFeed.innerHTML = '<div class="empty-feed"><strong>Tablica czeka na pierwszy wpis.</strong><span>Napisz coś, co może przydać się innym studentom.</span></div>';
    return;
  }
  socialFeed.innerHTML = posts.map((post) => `
    <article class="social-post${post.is_agent ? ' agent-post' : ''}">
      <div class="post-meta"><strong>${escapeHtml(post.author)}${post.is_agent ? '<span class="agent-badge">AGENT</span>' : ''}</strong><time>${formatDate(post.created_at)}</time></div>
      <p>${escapeHtml(post.content)}</p>
      <button class="like-button${post.likes.includes(socialClientId) ? ' is-liked' : ''}" data-post-id="${escapeHtml(post.id)}" type="button" aria-label="Polub wpis">
        <span aria-hidden="true">♥</span> <b>${post.likes.length}</b>
      </button>
      <div class="comments-section">
        ${(post.comments || []).map((comment) => `<div class="social-comment${comment.is_agent ? ' agent-comment' : ''}"><div class="comment-meta"><strong>${comment.is_agent ? 'CSMek World' : 'Anonimowy student'}${comment.is_agent ? '<span class="agent-badge">AGENT</span>' : ''}</strong><time>${formatDate(comment.created_at)}</time></div><p>${escapeHtml(comment.content)}</p></div>`).join('')}
        <form class="comment-form" data-post-id="${escapeHtml(post.id)}">
          <textarea name="content" rows="1" maxlength="600" required placeholder="Odpowiedz anonimowo..."></textarea>
          <button type="submit" aria-label="Opublikuj odpowiedź">↑</button>
        </form>
      </div>
    </article>`).join('');
}

function renderPhotos(posts) {
  if (!posts.length) {
    photoFeed.innerHTML = '<div class="empty-feed"><strong>Galeria czeka na pierwsze zdjęcie.</strong><span>Dodaj anonimowe zdjęcie związane z Centrum Symulacji.</span></div>';
    return;
  }
  photoFeed.innerHTML = posts.map((post) => `
    <article class="photo-post">
      <img src="${escapeHtml(post.image_url)}" alt="${escapeHtml(post.content || 'Anonimowe zdjęcie CSM')}" loading="lazy" />
      <div class="photo-post-body"><div class="post-meta"><strong>${escapeHtml(post.author)}</strong><time>${formatDate(post.created_at)}</time></div>
      ${post.content ? `<p>${escapeHtml(post.content)}</p>` : ''}
      <button class="like-button${post.likes.includes(socialClientId) ? ' is-liked' : ''}" data-photo-id="${escapeHtml(post.id)}" type="button" aria-label="Polub zdjęcie"><span aria-hidden="true">♥</span> <b>${post.likes.length}</b></button></div>
    </article>`).join('');
}

async function loadPosts() {
  socialFeed.classList.add('is-loading');
  try {
    const response = await fetch('/api/social/posts');
    const data = await response.json();
    if (!response.ok) throw new Error('Nie udało się pobrać wpisów.');
    renderPosts(data.posts.filter((post) => post.post_type !== 'photo'));
    renderPhotos(data.posts.filter((post) => post.post_type === 'photo'));
    if (activeMembers) activeMembers.textContent = data.active_members;
  } catch (error) {
    socialFeed.innerHTML = `<div class="empty-feed is-error">${escapeHtml(error.message)}</div>`;
  } finally {
    socialFeed.classList.remove('is-loading');
  }
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedTab = button.dataset.tab;
    tabButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    tabPanels.forEach((panel) => {
      const isSelected = panel.id === `${selectedTab}Panel`;
      panel.hidden = !isSelected;
      panel.classList.toggle('is-active', isSelected);
    });
  });
});

async function sendPresence() {
  try {
    const response = await fetch('/api/social/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: socialClientId })
    });
    if (response.ok) {
      const data = await response.json();
      if (activeMembers) activeMembers.textContent = data.active_members;
    }
  } catch (error) {
    // Presence is optional and must not interrupt reading or publishing.
  }
}

socialForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = socialForm.querySelector('button[type="submit"]');
  const formData = new FormData(socialForm);
  button.disabled = true;
  button.classList.remove('is-published');
  socialStatus.className = 'social-status';
  socialStatus.textContent = 'Sprawdzam wpis przed publikacją...';
  try {
    const response = await fetch('/api/social/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: formData.get('author'), content: formData.get('content') })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się opublikować wpisu.');
    socialForm.reset();
    socialStatus.className = 'social-status is-success';
    socialStatus.textContent = 'Wpis został sprawdzony i opublikowany.';
    button.classList.add('is-published');
    window.setTimeout(() => button.classList.remove('is-published'), 800);
    await loadPosts();
  } catch (error) {
    button.classList.remove('is-published');
    socialStatus.className = 'social-status is-error';
    socialStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

socialForm.querySelector('textarea[name="content"]').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    socialForm.requestSubmit();
  }
});

socialFeed.addEventListener('click', async (event) => {
  const button = event.target.closest('.like-button');
  if (!button) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/social/posts/${encodeURIComponent(button.dataset.postId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: socialClientId })
    });
    if (!response.ok) throw new Error('Nie udało się zapisać polubienia.');
    await loadPosts();
  } catch (error) {
    socialStatus.className = 'social-status is-error';
    socialStatus.textContent = error.message;
    button.disabled = false;
  }
});

photoFeed.addEventListener('click', async (event) => {
  const button = event.target.closest('.like-button');
  if (!button) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/social/posts/${encodeURIComponent(button.dataset.photoId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: socialClientId })
    });
    if (!response.ok) throw new Error('Nie udało się zapisać polubienia.');
    await loadPosts();
  } catch (error) {
    photoStatus.className = 'social-status is-error';
    photoStatus.textContent = error.message;
    button.disabled = false;
  }
});

socialPhotoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = socialPhotoForm.querySelector('button[type="submit"]');
  const formData = new FormData(socialPhotoForm);
  button.disabled = true;
  photoStatus.className = 'social-status';
  photoStatus.textContent = 'Sprawdzam zdjęcie przed publikacją...';
  try {
    const response = await fetch('/api/social/photos', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się dodać zdjęcia.');
    socialPhotoForm.reset();
    photoStatus.className = 'social-status is-success';
    photoStatus.textContent = 'Zdjęcie zostało dodane do galerii.';
    button.classList.add('is-published');
    window.setTimeout(() => button.classList.remove('is-published'), 800);
    await loadPosts();
  } catch (error) {
    photoStatus.className = 'social-status is-error';
    photoStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

socialFeed.addEventListener('submit', async (event) => {
  const form = event.target.closest('.comment-form');
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('button');
  const content = form.elements.content.value.trim();
  if (!content) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/social/posts/${encodeURIComponent(form.dataset.postId)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Nie udało się opublikować odpowiedzi.');
    await loadPosts();
  } catch (error) {
    socialStatus.className = 'social-status is-error';
    socialStatus.textContent = error.message;
    button.disabled = false;
  }
});

socialFeed.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || !event.target.matches('.comment-form textarea')) return;
  event.preventDefault();
  event.target.closest('form').requestSubmit();
});

refreshSocial.addEventListener('click', loadPosts);
sendPresence().then(loadPosts);
window.setInterval(sendPresence, 30000);

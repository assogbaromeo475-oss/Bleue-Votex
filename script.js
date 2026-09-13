const mediaDatabase = [
    { id: 1, title: 'Cyberpunk Odyssey', category: 'movies', genre: 'Sci-Fi', year: 2026, rating: 4.9, poster: 'https://placehold.co/400x600/14243a/00bfff?text=Cyberpunk', synopsis: "Un hacker découvre une faille qui pourrait réinitialiser le monde entier.", videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { id: 2, title: 'Shadow Hunter', category: 'series', genre: 'Action', year: 2025, rating: 4.7, poster: 'https://placehold.co/400x600/14243a/00bfff?text=Shadow+Hunter', synopsis: "Une brigade spéciale traque des entités mystérieuses dans les grandes métropoles.", videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    { id: 3, title: 'Tokyo Blade Chronicle', category: 'animes', genre: 'Animation', year: 2026, rating: 4.9, poster: 'https://placehold.co/400x600/14243a/00bfff?text=Tokyo+Blade', synopsis: "Un jeune épéiste se dresse contre l'empire des spectres.", videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { id: 4, title: 'Interstellar Horizon', category: 'movies', genre: 'Sci-Fi', year: 2024, rating: 4.8, poster: 'https://placehold.co/400x600/14243a/00bfff?text=Interstellar', synopsis: "Un équipage traverse un trou de ver à la recherche d'une planète habitable.", videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
    { id: 5, title: 'Kingdom of Dragons', category: 'series', genre: 'Drame', year: 2025, rating: 4.6, poster: 'https://placehold.co/400x600/14243a/00bfff?text=Kingdom', synopsis: "Des dynasties rivales s'affrontent dans un monde dominé par les dragons.", videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
    { id: 6, title: 'Neon Alchemist', category: 'animes', genre: 'Action', year: 2026, rating: 4.8, poster: 'https://placehold.co/400x600/14243a/00bfff?text=Alchemist', synopsis: "L'alchimie moderne fusionne avec la cybernétique dans une cité futuriste.", videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4' }
];

let activeDownloads = [];
let currentMedia = null;
let privateMedia = JSON.parse(localStorage.getItem('bleueVotexPrivateMedia') || '[]');
const ownerPin = '4899';
const privateVideoDatabase = 'bleueVotexVideoStorage';

async function renderPublicVideos() {
    const grid = $('#publicVideoGrid');
    try {
        const response = await fetch('/api/public-videos');
        if (!response.ok) throw new Error('Chargement impossible');
        const videos = await response.json();
        grid.innerHTML = videos.length ? videos.map(video => `<article class="public-video-card"><video src="/uploads/${encodeURIComponent(video.storedName || video.name)}" controls preload="metadata"></video><div class="public-video-info"><strong>${video.name}</strong><button class="remove-public" type="button" data-remove-public="${video.id}" aria-label="Supprimer ${video.name}"><i class="fa-solid fa-trash"></i></button></div></article>`).join('') : '<p class="empty-public-library">Aucune vidéo publique ajoutée pour le moment.</p>';
    } catch {
        grid.innerHTML = '<p class="empty-public-library">Le serveur n’est pas disponible.</p>';
    }
}

function setupPublicVideos() {
    $('#publicVideoFile').addEventListener('change', event => {
        const files = Array.from(event.target.files).filter(file => file.type.startsWith('video/'));
        if (!files.length) return;
        const formData = new FormData();
        files.forEach(file => formData.append('videos', file));
        fetch('/api/public-videos', { method: 'POST', body: formData }).then(response => {
            if (!response.ok) throw new Error('Téléversement impossible');
            event.target.value = '';
            renderPublicVideos();
            showToast(`${files.length} vidéo(s) publiée(s) sur le site.`);
        }).catch(() => showToast('Impossible de téléverser les vidéos.'));
    });
}

function openPrivateVideoDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(privateVideoDatabase, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function savePrivateVideo(file) {
    const database = await openPrivateVideoDatabase();
    await new Promise((resolve, reject) => {
        const transaction = database.transaction('videos', 'readwrite');
        transaction.objectStore('videos').add({ name: file.name, type: file.type, blob: file, createdAt: Date.now() });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
}

async function getPrivateVideos() {
    const database = await openPrivateVideoDatabase();
    const videos = await new Promise((resolve, reject) => {
        const request = database.transaction('videos', 'readonly').objectStore('videos').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    database.close();
    return videos;
}

async function deletePrivateVideo(id) {
    const database = await openPrivateVideoDatabase();
    await new Promise((resolve, reject) => {
        const transaction = database.transaction('videos', 'readwrite');
        transaction.objectStore('videos').delete(id);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
}

async function clearPrivateVideos() {
    const database = await openPrivateVideoDatabase();
    await new Promise((resolve, reject) => {
        const transaction = database.transaction('videos', 'readwrite');
        transaction.objectStore('videos').clear();
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
}

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

function switchView(viewId) {
    $$('.view-section').forEach(view => view.classList.toggle('hidden', view.id !== `view-${viewId}`));
    $$('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mediaCard(media) {
    return `<article class="media-card"><img class="poster" src="${media.poster}" alt="Affiche de ${media.title}"><div class="card-body"><small>${media.genre} · ${media.year} · ★ ${media.rating}</small><h3>${media.title}</h3><div class="card-actions"><button type="button" data-detail="${media.id}">Lire</button><button type="button" data-download="${media.id}">Téléch.</button></div></div></article>`;
}

function renderGrid(elementId, media) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = media.length ? media.map(mediaCard).join('') : '<p>Aucun résultat trouvé.</p>';
}

function renderCatalog() {
    renderGrid('moviesGrid', mediaDatabase.filter(media => media.category === 'movies'));
    renderGrid('seriesGrid', mediaDatabase.filter(media => media.category === 'series'));
    renderGrid('animesGrid', mediaDatabase.filter(media => media.category === 'animes'));
}

function openDetail(id) {
    currentMedia = mediaDatabase.find(media => media.id === id);
    if (!currentMedia) return;
    $('#detailTitle').textContent = currentMedia.title;
    $('#detailGenre').textContent = `${currentMedia.genre} · ${currentMedia.year} · ★ ${currentMedia.rating}`;
    $('#detailSynopsis').textContent = currentMedia.synopsis;
    const player = $('#mainVideo');
    player.src = currentMedia.videoUrl;
    player.load();
    switchView('detail');
}

function addDownload(media) {
    if (activeDownloads.some(download => download.id === media.id)) {
        showToast(`${media.title} est déjà dans vos téléchargements.`);
        return;
    }
    activeDownloads.push({ id: media.id, title: media.title, progress: 0 });
    renderDownloads();
    showToast(`Téléchargement de « ${media.title} » lancé.`);
    const timer = setInterval(() => {
        const download = activeDownloads.find(item => item.id === media.id);
        if (!download) return clearInterval(timer);
        download.progress = Math.min(download.progress + 10, 100);
        renderDownloads();
        if (download.progress === 100) {
            clearInterval(timer);
            showToast(`${media.title} est terminé.`);
        }
    }, 700);
}

function renderDownloads() {
    const list = $('#downloadsList');
    $('#downloadBadge').textContent = activeDownloads.length;
    $('#downloadBadge').classList.toggle('hidden', activeDownloads.length === 0);
    list.innerHTML = activeDownloads.length ? activeDownloads.map(download => `<div class="download-row"><div><strong>${download.title}</strong><div class="progress"><span style="width:${download.progress}%"></span></div></div><span>${download.progress}%</span><button class="secondary-btn" type="button" data-remove-download="${download.id}"><i class="fa-solid fa-trash"></i></button></div>`).join('') : '<p>Aucun téléchargement actif pour le moment.</p>';
}

function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function renderPrivateMedia() {
    const list = $('#privateMediaList');
    list.innerHTML = privateMedia.length ? privateMedia.map((media, index) => `<div class="private-media-item"><div><strong>${media.title}</strong><small>${media.type}</small>${media.url && media.isLocal ? `<video src="${media.url}" controls preload="metadata"></video>` : ''}</div><button class="remove-private" type="button" data-remove-private="${index}" aria-label="Supprimer ${media.title}"><i class="fa-solid fa-trash"></i></button></div>`).join('') : '<p>Aucun contenu privé ajouté.</p>';
}

async function renderStoredVideos() {
    const list = $('#privateMediaList');
    const videos = await getPrivateVideos();
    list.querySelectorAll('.stored-video-item').forEach(item => item.remove());
    const storedVideoMarkup = videos.map(video => `<div class="private-media-item stored-video-item"><div><strong>${video.name}</strong><small>Vidéo enregistrée dans votre espace privé</small><video data-stored-video="${video.id}" controls preload="metadata"></video></div><button class="remove-private" type="button" data-remove-stored-video="${video.id}" aria-label="Supprimer ${video.name}"><i class="fa-solid fa-trash"></i></button></div>`).join('');
    list.insertAdjacentHTML('afterbegin', storedVideoMarkup);
    videos.forEach(video => {
        const player = document.querySelector(`[data-stored-video="${video.id}"]`);
        if (player) player.src = URL.createObjectURL(video.blob);
    });
}

function setupPrivateLibrary() {
    const pinInput = $('#ownerPin');
    const accessButton = $('#privateAccessBtn');
    const login = $('#privateLogin');
    const panel = $('#privatePanel');

    accessButton.addEventListener('click', () => {
        const pin = pinInput.value.trim();
        if (pin !== ownerPin) {
            showToast('Code propriétaire incorrect.');
            return;
        }
        login.classList.add('hidden');
        panel.classList.remove('hidden');
        renderPrivateMedia();
        renderStoredVideos();
    });

    $('#privateMediaForm').addEventListener('submit', event => {
        event.preventDefault();
        privateMedia.push({ title: $('#privateTitle').value.trim(), type: $('#privateType').value, url: $('#privateUrl').value.trim() });
        localStorage.setItem('bleueVotexPrivateMedia', JSON.stringify(privateMedia));
        event.target.reset();
        renderPrivateMedia();
        showToast('Contenu ajouté à votre bibliothèque privée.');
    });

    $('#privateVideoFile').addEventListener('change', event => {
        Promise.all(Array.from(event.target.files).filter(file => file.type.startsWith('video/')).map(savePrivateVideo)).then(() => {
            event.target.value = '';
            renderStoredVideos();
            showToast('Vidéo enregistrée dans votre espace privé.');
        }).catch(() => showToast('Impossible d’enregistrer cette vidéo.'));
    });

    $('#clearPrivateVideos').addEventListener('click', () => {
        clearPrivateVideos().then(() => {
            renderStoredVideos();
            showToast('Toutes les vidéos privées ont été supprimées.');
        });
    });
}

function setupSettings() {
    $('#settingsBtn').addEventListener('click', () => { $('#settingsModal').hidden = false; });
    $('#closeSettings').addEventListener('click', () => { $('#settingsModal').hidden = true; });
    $('#settingsModal').addEventListener('click', event => { if (event.target.id === 'settingsModal') $('#settingsModal').hidden = true; });
    $$('.tab-btn').forEach(button => button.addEventListener('click', () => {
        $$('.tab-btn').forEach(tab => { const selected = tab === button; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', selected); });
        $$('.tab-content').forEach(content => { content.hidden = content.id !== button.dataset.tab; content.classList.toggle('active', content.id === button.dataset.tab); });
    }));
}

document.addEventListener('click', event => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { event.preventDefault(); switchView(viewButton.dataset.view); }
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton) openDetail(Number(detailButton.dataset.detail));
    const downloadButton = event.target.closest('[data-download]');
    if (downloadButton) addDownload(mediaDatabase.find(media => media.id === Number(downloadButton.dataset.download)));
    const removeButton = event.target.closest('[data-remove-download]');
    if (removeButton) { activeDownloads = activeDownloads.filter(download => download.id !== Number(removeButton.dataset.removeDownload)); renderDownloads(); }
    const removePrivateButton = event.target.closest('[data-remove-private]');
    if (removePrivateButton) {
        privateMedia.splice(Number(removePrivateButton.dataset.removePrivate), 1);
        localStorage.setItem('bleueVotexPrivateMedia', JSON.stringify(privateMedia));
        renderPrivateMedia();
    }
    const removeStoredButton = event.target.closest('[data-remove-stored-video]');
    if (removeStoredButton) {
        deletePrivateVideo(Number(removeStoredButton.dataset.removeStoredVideo)).then(() => {
            renderStoredVideos();
            showToast('Vidéo privée supprimée.');
        });
    }
    const removePublicButton = event.target.closest('[data-remove-public]');
    if (removePublicButton) {
        fetch(`/api/public-videos/${removePublicButton.dataset.removePublic}`, { method: 'DELETE' }).then(response => {
            if (!response.ok) throw new Error('Suppression impossible');
            renderPublicVideos();
            showToast('Vidéo publique supprimée.');
        }).catch(() => showToast('Impossible de supprimer cette vidéo.'));
    }
});

$('#searchInput').addEventListener('input', event => {
    const query = event.target.value.toLowerCase().trim();
    renderGrid('moviesGrid', mediaDatabase.filter(media => media.category === 'movies' && `${media.title} ${media.genre}`.toLowerCase().includes(query)));
    switchView('home');
});

$('#genreFilter').addEventListener('change', event => renderGrid('moviesGrid', mediaDatabase.filter(media => media.category === 'movies' && (event.target.value === 'all' || media.genre === event.target.value))));
$('#backBtn').addEventListener('click', () => switchView('home'));
$('#detailDownload').addEventListener('click', () => { if (currentMedia) addDownload(currentMedia); });
$('#clearDownloads').addEventListener('click', () => { activeDownloads = []; renderDownloads(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') $('#settingsModal').hidden = true; });

renderCatalog();
renderDownloads();
renderPublicVideos();
setupSettings();
setupPrivateLibrary();
setupPublicVideos();

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const gallery = document.getElementById('gallery');
    const safeGallery = document.getElementById('safe-gallery');
    const safeFolderButton = document.getElementById('safe-folder-button');
    const hideButton = document.getElementById('hide-button');
    const deleteButton = document.getElementById('delete-button');
    const passwordPrompt = document.getElementById('password-prompt');
    const passwordInput = document.getElementById('password-input');
    const submitPasswordButton = document.getElementById('submit-password');

    const safeFolderPassword = '27112004';
    let selectedFiles = [];

    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        const categorizedFiles = categorizeFiles(files);
        displayFiles(categorizedFiles);
        cacheFiles(files); // Store files offline
    });

    gallery.addEventListener('click', (event) => {
        if (event.target.tagName === 'IMG' || event.target.tagName === 'VIDEO') {
            const src = event.target.src;
            openLightbox(src);
        }
    });

    gallery.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (event.target.tagName === 'IMG' || event.target.tagName === 'VIDEO') {
            toggleSelection(event.target);
        }
    });

    hideButton.addEventListener('click', hideSelectedFiles);
    deleteButton.addEventListener('click', deleteSelectedFiles);

    safeFolderButton.addEventListener('click', () => {
        passwordPrompt.style.display = 'flex';
    });

    submitPasswordButton.addEventListener('click', () => {
        if (passwordInput.value === safeFolderPassword) {
            passwordPrompt.style.display = 'none';
            document.getElementById('safe-folder').style.display = 'block';
            loadSafeFolder();
        } else {
            alert('Incorrect password');
        }
    });

    loadStoredFiles(); // Load cached files on startup

    // Register service worker for offline capability
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => {
                console.log('Service Worker Registered');
            })
            .catch(error => {
                console.error('Service Worker Registration Failed:', error);
            });
    }
});

function categorizeFiles(files) {
    const categorized = {};

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const date = new Date(file.lastModified);
        const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;

        if (!categorized[monthYear]) {
            categorized[monthYear] = [];
        }

        categorized[monthYear].push(file);
    }

    return categorized;
}

function displayFiles(categorizedFiles) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    for (const [date, files] of Object.entries(categorizedFiles)) {
        const section = document.createElement('div');
        section.className = 'gallery-section';

        const header = document.createElement('h2');
        header.innerText = date;
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'gallery-grid';

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let mediaElement;
                if (file.type.startsWith('image/')) {
                    mediaElement = document.createElement('img');
                } else if (file.type.startsWith('video/')) {
                    mediaElement = document.createElement('video');
                    mediaElement.controls = true;
                }
                if (mediaElement) {
                    mediaElement.src = e.target.result;
                    mediaElement.dataset.name = file.name;
                    mediaElement.addEventListener('contextmenu', (event) => {
                        event.preventDefault();
                        toggleSelection(mediaElement);
                    });
                    grid.appendChild(mediaElement);
                }
            };
            reader.readAsDataURL(file);
        });

        section.appendChild(grid);
        gallery.appendChild(section);
    }
}

function openLightbox(src) {
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.innerHTML = `<img src="${src}" style="max-width: 90%; max-height: 90%;">`;

    lightbox.addEventListener('click', () => {
        document.body.removeChild(lightbox);
    });

    document.body.appendChild(lightbox);
}

function toggleSelection(element) {
    if (element.classList.contains('selected')) {
        element.classList.remove('selected');
        selectedFiles = selectedFiles.filter(file => file.src !== element.src);
    } else {
        element.classList.add('selected');
        selectedFiles.push(element);
    }

    const hasSelectedFiles = selectedFiles.length > 0;
    document.getElementById('hide-button').style.display = hasSelectedFiles ? 'inline-block' : 'none';
    document.getElementById('delete-button').style.display = hasSelectedFiles ? 'inline-block' : 'none';
}

function cacheFiles(files) {
    if ('caches' in window) {
        caches.open('gallery-cache').then(cache => {
            for (let file of files) {
                const blob = new Blob([file], { type: file.type });
                const url = URL.createObjectURL(blob);
                cache.add(url);
            }
        });
    }
}

function loadStoredFiles() {
    if ('caches' in window) {
        caches.open('gallery-cache').then(cache => {
            cache.keys().then(keys => {
                const files = keys.map(request => {
                    return fetch(request).then(response => {
                        return response.blob().then(blob => {
                            return new File([blob], 'cached-file', { type: blob.type, lastModified: Date.now() });
                        });
                    });
                });

                Promise.all(files).then(files => {
                    const categorizedFiles = categorizeFiles(files);
                    displayFiles(categorizedFiles);
                });
            });
        });
    }
}

function loadSafeFolder() {
    const safeGallery = document.getElementById('safe-gallery');
    const hiddenFiles = JSON.parse(localStorage.getItem('hiddenFiles')) || [];

    safeGallery.innerHTML = '';

    hiddenFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            let mediaElement;
            if (file.type.startsWith('image/')) {
                mediaElement = document.createElement('img');
            } else if (file.type.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.controls = true;
            }
            if (mediaElement) {
                mediaElement.src = e.target.result;
                safeGallery.appendChild(mediaElement);
            }
        };
        reader.readAsDataURL(new File([new Blob([file.data], { type: file.type })], file.name, { type: file.type }));
    });
}

function hideSelectedFiles() {
    const hiddenFiles = JSON.parse(localStorage.getItem('hiddenFiles')) || [];
    selectedFiles.forEach(file => {
        hiddenFiles.push({
            name: file.dataset.name,
            type: file.tagName === 'IMG' ? 'image/jpeg' : 'video/mp4',
            data: file.src.split(',')[1]
        });
        file.remove();
    });
    localStorage.setItem('hiddenFiles', JSON.stringify(hiddenFiles));
    selectedFiles = [];
    document.getElementById('hide-button').style.display = 'none';
    document.getElementById('delete-button').style.display = 'none';
}

function deleteSelectedFiles() {
    selectedFiles.forEach(file => {
        file.remove();
    });
    selectedFiles = [];
    document.getElementById('hide-button').style.display = 'none';
    document.getElementById('delete-button').style.display = 'none';
}

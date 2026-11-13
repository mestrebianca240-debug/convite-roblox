// =========================================================================
// COLE AQUI AS CREDENCIAIS DO SEU PROJETO FIREBASE (veja o arquivo LEIA-ME.txt)
// =========================================================================
const firebaseConfig = {
    apiKey: "COLE_SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:000000000000"
};

// Inicializa o Firebase apenas se você já tiver substituído a configuração acima
let db = null;
const isConfigured = firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI";

if (isConfigured && typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
}

const stepName = document.getElementById('step-name');
const stepInvite = document.getElementById('step-invite');
const stepSaved = document.getElementById('step-saved');

const playerNameInput = document.getElementById('player-name');
const btnStart = document.getElementById('btn-start');
const errorMsg = document.getElementById('error-msg');
const displayName = document.getElementById('display-name');
const confirmedName = document.getElementById('confirmed-name');
const syncStatus = document.getElementById('sync-status');

const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');
const savedList = document.getElementById('saved-list');
const btnReset = document.getElementById('btn-reset');

let currentPlayer = '';

// Se você abrir o site colocando ?admin=1 no final do link, ele abre direto na lista de respostas!
if (window.location.search.includes('admin=1')) {
    stepName.classList.add('hidden');
    stepSaved.classList.remove('hidden');
    confirmedName.textContent = 'Admin';
    syncStatus.textContent = 'Modo visualização em tempo real ativado.';
    listenToResponses();
}

function goToInvite() {
    const name = playerNameInput.value.trim();
    if (!name) {
        errorMsg.classList.remove('hidden');
        return;
    }
    errorMsg.classList.add('hidden');
    currentPlayer = name;
    displayName.textContent = currentPlayer;
    playerNameInput.blur();

    stepName.classList.add('hidden');
    stepInvite.classList.remove('hidden');
}

btnStart.addEventListener('click', goToInvite);
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') goToInvite();
});

// Faz o botão "Não" fugir pelo ecrã inteiro (PC e Celular)
function moveNoButton() {
    btnNo.style.position = 'fixed';
    const padding = 16;
    const viewportW = document.documentElement.clientWidth;
    const viewportH = document.documentElement.clientHeight;
    const btnW = btnNo.offsetWidth;
    const btnH = btnNo.offsetHeight;

    const yesRect = btnYes.getBoundingClientRect();

    let randomX = padding;
    let randomY = padding;
    let attempts = 0;

    do {
        const maxX = Math.max(padding, viewportW - btnW - padding);
        const maxY = Math.max(padding, viewportH - btnH - padding);

        randomX = Math.floor(Math.random() * (maxX - padding + 1)) + padding;
        randomY = Math.floor(Math.random() * (maxY - padding + 1)) + padding;
        attempts++;
    } while (
        attempts < 25 &&
        randomX < yesRect.right + 12 &&
        randomX + btnW > yesRect.left - 12 &&
        randomY < yesRect.bottom + 12 &&
        randomY + btnH > yesRect.top - 12
    );

    btnNo.style.left = `${randomX}px`;
    btnNo.style.top = `${randomY}px`;
}

btnNo.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') moveNoButton();
});
btnNo.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    moveNoButton();
});
btnNo.addEventListener('touchstart', (e) => {
    e.preventDefault();
    moveNoButton();
}, { passive: false });
btnNo.addEventListener('click', (e) => {
    e.preventDefault();
    moveNoButton();
});

window.addEventListener('resize', () => {
    if (btnNo.style.position === 'fixed' && !stepInvite.classList.contains('hidden')) {
        moveNoButton();
    }
});

// Quando clica em "Sim", envia para o Firebase em tempo real
btnYes.addEventListener('click', () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const entry = {
        jogador: currentPlayer,
        resposta: 'Sim! Bora jogar',
        data: formattedDate,
        timestamp: Date.now()
    };

    confirmedName.textContent = currentPlayer;
    stepInvite.classList.add('hidden');
    stepSaved.classList.remove('hidden');

    if (db) {
        db.ref('respostas_roblox').push(entry)
            .then(() => {
                syncStatus.textContent = 'Resposta salva na nuvem! Agora é só abrir o Roblox.';
            })
            .catch(() => {
                syncStatus.textContent = 'Erro ao conectar com o servidor. Verifique as regras do Firebase.';
            });
        listenToResponses();
    } else {
        syncStatus.textContent = 'Aviso: Firebase ainda não configurado no script.js (salvo apenas localmente).';
        const localData = JSON.parse(localStorage.getItem('roblox_respostas')) || [];
        localData.unshift(entry);
        localStorage.setItem('roblox_respostas', JSON.stringify(localData));
        renderList(localData);
    }
});

// Ouve todas as respostas do Firebase em tempo real
function listenToResponses() {
    if (!db) return;
    db.ref('respostas_roblox').orderByChild('timestamp').on('value', (snapshot) => {
        const items = [];
        snapshot.forEach((child) => {
            items.unshift(child.val()); // Mais recentes primeiro
        });
        renderList(items);
    });
}

function renderList(items) {
    savedList.innerHTML = '';
    if (items.length === 0) {
        savedList.innerHTML = '<li style="color:#94a3b8; font-size:0.85rem; text-align:center;">Nenhuma resposta ainda.</li>';
        return;
    }
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'saved-item';
        li.innerHTML = `
            <span class="saved-player">🎮 ${escapeHTML(item.jogador)}</span>
            <span class="saved-meta">✔ ${item.resposta}<br><small>${item.data}</small></span>
        `;
        savedList.appendChild(li);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

btnReset.addEventListener('click', () => {
    playerNameInput.value = '';
    btnNo.style.position = 'static';
    stepSaved.classList.add('hidden');
    stepName.classList.remove('hidden');
});

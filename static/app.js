let subscriptions = [];
let currentFilter = 'Все';
let isLoading = false;
let loadError = '';

function parseLocalDate(dateString) {
    const [year, month, day] = String(dateString).split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addPeriod(date, period) {
    const next = new Date(date.getTime());
    if (period === 'month') {
        next.setMonth(next.getMonth() + 1);
    } else {
        next.setFullYear(next.getFullYear() + 1);
    }
    return next;
}

// --- Статус-сообщения ---

function setStatus(message = '', tone = 'default') {
    const status = document.getElementById('status-message');
    if (!message) {
        status.className = 'hidden card p-4 rounded-2xl text-sm text-slate-300 mb-4';
        status.textContent = '';
        return;
    }

    const toneClasses = tone === 'error'
        ? 'border-red-500/50 text-red-200'
        : 'text-slate-300';

    status.className = `card p-4 rounded-2xl text-sm mb-4 ${toneClasses}`;
    status.textContent = message;
}

function createIconButton(icon, label, onClick, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i>`;
    button.addEventListener('click', onClick);
    return button;
}

// --- Загрузка данных ---

async function fetchSubs() {
    isLoading = true;
    loadError = '';
    render();

    try {
        const res = await fetch('/api/subscriptions');
        if (!res.ok) {
            throw new Error('Не удалось загрузить подписки.');
        }
        subscriptions = await res.json();
    } catch (error) {
        subscriptions = [];
        loadError = error.message || 'Не удалось загрузить подписки.';
    } finally {
        isLoading = false;
        render();
    }
}

// --- Фильтры ---

function setFilter(category) {
    currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.innerText === category) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    render();
}

function handleWheel(e) {
    const container = document.getElementById('category-filters-container');
    if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
    }
}

function scrollFilters(amount) {
    const container = document.getElementById('category-filters-container');
    container.scrollBy({ left: amount, behavior: 'smooth' });
}

// --- Отрисовка ---

function render() {
    const list = document.getElementById('subs-list');
    list.innerHTML = '';

    let monthlyTotal = 0;
    let yearlyTotal = 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filtered = currentFilter === 'Все'
        ? subscriptions
        : subscriptions.filter(sub => sub.category === currentFilter);

    filtered.sort((a, b) => parseLocalDate(a.next_date) - parseLocalDate(b.next_date));

    if (isLoading) {
        setStatus('Загрузка подписок...');
    } else if (loadError) {
        setStatus(loadError, 'error');
    } else if (filtered.length === 0) {
        setStatus(
            currentFilter === 'Все'
                ? 'Подписок пока нет. Добавьте первую подписку.'
                : 'В выбранной категории подписок нет.'
        );
    } else {
        setStatus('');
    }

    if (isLoading || loadError) {
        document.getElementById('monthly-total').innerText = '—';
        document.getElementById('yearly-total').innerText = '—';
        lucide.createIcons();
        return;
    }

    filtered.forEach(sub => {
        const price = parseFloat(sub.price);
        if (sub.period === 'month') {
            monthlyTotal += price;
            yearlyTotal += price * 12;
        } else {
            monthlyTotal += price / 12;
            yearlyTotal += price;
        }

        const nextDate = parseLocalDate(sub.next_date);
        const diffDays = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
        const isUrgent = diffDays <= 3 && diffDays >= 0;
        const isExpired = diffDays < 0;
        const dateStr = nextDate.toLocaleDateString('ru-RU');

        const card = document.createElement('div');
        card.className = `card p-5 rounded-2xl shadow-md flex justify-between items-center transition-all ${isUrgent ? 'card-urgent' : ''}`;

        const content = document.createElement('div');
        content.className = 'flex-1';

        const titleRow = document.createElement('div');
        titleRow.className = 'flex items-center gap-2 mb-1';

        const title = document.createElement('h3');
        title.className = 'font-semibold text-lg';
        title.textContent = sub.name;

        const badge = document.createElement('span');
        badge.className = 'category-badge';
        badge.textContent = sub.category || 'Другое';

        titleRow.appendChild(title);
        titleRow.appendChild(badge);

        const priceText = document.createElement('p');
        priceText.className = 'text-slate-400 text-sm';
        priceText.textContent = `${sub.price} ₽ / ${sub.period === 'month' ? 'мес.' : 'год'}`;

        const dateText = document.createElement('p');
        dateText.className = `text-xs mt-1 ${isUrgent ? 'text-red-400 font-bold' : 'text-slate-500'}`;
        dateText.textContent = `${isExpired ? 'Срок истек:' : 'Списание:'} ${dateStr}${isUrgent ? ' (Скоро!)' : ''}`;

        content.appendChild(titleRow);
        content.appendChild(priceText);
        content.appendChild(dateText);

        if (isExpired) {
            const renewButton = document.createElement('button');
            renewButton.type = 'button';
            renewButton.className = 'mt-2 text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-400/30 hover:bg-blue-600/40';
            renewButton.textContent = 'Продлить';
            renewButton.addEventListener('click', () => renewSub(sub.id));
            content.appendChild(renewButton);
        }

        const actions = document.createElement('div');
        actions.className = 'flex gap-1';
        actions.appendChild(createIconButton('edit-2', 'Редактировать подписку', () => editSub(sub.id), 'p-2 text-slate-400 hover:text-blue-400 transition-colors'));
        actions.appendChild(createIconButton('trash-2', 'Удалить подписку', () => deleteSub(sub.id), 'p-2 text-slate-400 hover:text-red-400 transition-colors'));

        card.appendChild(content);
        card.appendChild(actions);
        list.appendChild(card);
    });

    document.getElementById('monthly-total').innerText = `${Math.round(monthlyTotal).toLocaleString()} ₽`;
    document.getElementById('yearly-total').innerText = `${Math.round(yearlyTotal).toLocaleString()} ₽`;
    lucide.createIcons();
}

// --- Продление истёкшей подписки ---

async function renewSub(id) {
    const sub = subscriptions.find(item => item.id === id);
    if (!sub) return;

    let nextDate = parseLocalDate(sub.next_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (nextDate < today) {
        nextDate = addPeriod(nextDate, sub.period);
    }

    const updatedSub = { ...sub, next_date: formatLocalDate(nextDate) };

    try {
        const res = await fetch(`/api/subscriptions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSub)
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Не удалось продлить подписку.');
        }
        await fetchSubs();
    } catch (error) {
        setStatus(error.message || 'Не удалось продлить подписку.', 'error');
    }
}

// --- Модальное окно ---

function openModal(subId = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('sub-form');
    const title = document.getElementById('modal-title');

    setStatus('');

    if (subId) {
        const sub = subscriptions.find(s => s.id === subId);
        if (!sub) return;

        title.innerText = 'Редактировать';
        document.getElementById('sub-id').value = sub.id;
        document.getElementById('name').value = sub.name;
        document.getElementById('price').value = sub.price;
        document.getElementById('period').value = sub.period;
        document.getElementById('category').value = sub.category || 'Другое';
        document.getElementById('next_date').value = sub.next_date;
    } else {
        title.innerText = 'Добавить подписку';
        form.reset();
        document.getElementById('sub-id').value = '';
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

async function saveSub(e) {
    e.preventDefault();
    const id = document.getElementById('sub-id').value;
    const subData = {
        name: document.getElementById('name').value.trim(),
        price: parseFloat(document.getElementById('price').value),
        period: document.getElementById('period').value,
        category: document.getElementById('category').value,
        next_date: document.getElementById('next_date').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/subscriptions/${id}` : '/api/subscriptions';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subData)
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Не удалось сохранить подписку.');
        }

        closeModal();
        await fetchSubs();
    } catch (error) {
        setStatus(error.message || 'Не удалось сохранить подписку.', 'error');
    }
}

async function deleteSub(id) {
    if (!confirm('Удалить эту подписку?')) {
        return;
    }

    try {
        const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Не удалось удалить подписку.');
        }
        await fetchSubs();
    } catch (error) {
        setStatus(error.message || 'Не удалось удалить подписку.', 'error');
    }
}

function editSub(id) {
    openModal(id);
}

fetchSubs();
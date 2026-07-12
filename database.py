

import sqlite3

DB_FILE = 'subscriptions.db'


def get_connection():
    """Открывает соединение с БД с доступом к колонкам по имени."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Создаёт таблицу при первом запуске и наполняет примерами."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            period TEXT NOT NULL,
            next_date TEXT NOT NULL,
            category TEXT DEFAULT 'Другое'
        )
        '''
    )

    cursor.execute('SELECT COUNT(*) FROM subscriptions')
    has_rows = cursor.fetchone()[0] > 0

    if not has_rows:
        example_data = [
            ('Netflix', 799, 'month', '2026-07-20', 'Развлечения'),
            ('Spotify', 299, 'month', '2026-07-25', 'Музыка'),
            ('Спортзал', 25000, 'year', '2026-12-10', 'Здоровье'),
        ]
        cursor.executemany(
            'INSERT INTO subscriptions (name, price, period, next_date, category) '
            'VALUES (?, ?, ?, ?, ?)',
            example_data,
        )

    conn.commit()
    conn.close()


def row_to_dict(row):
    """Преобразует строку БД в словарь для JSON-ответа."""
    return {
        'id': row['id'],
        'name': row['name'],
        'price': row['price'],
        'period': row['period'],
        'next_date': row['next_date'],
        'category': row['category'],
    }


def get_all_subscriptions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM subscriptions ORDER BY next_date ASC, id ASC')
    subs = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return subs


def create_subscription(data):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO subscriptions (name, price, period, next_date, category) '
        'VALUES (?, ?, ?, ?, ?)',
        (data['name'], data['price'], data['period'], data['next_date'], data['category']),
    )
    conn.commit()
    sub_id = cursor.lastrowid
    conn.close()
    return sub_id


def subscription_exists(sub_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM subscriptions WHERE id = ?', (sub_id,))
    found = cursor.fetchone() is not None
    conn.close()
    return found


def update_subscription(sub_id, data):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE subscriptions SET name = ?, price = ?, period = ?, '
        'next_date = ?, category = ? WHERE id = ?',
        (data['name'], data['price'], data['period'],
         data['next_date'], data['category'], sub_id),
    )
    conn.commit()
    conn.close()


def delete_subscription(sub_id):
    """Удаляет подписку. Возвращает True, если строка была удалена."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM subscriptions WHERE id = ?', (sub_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    return deleted > 0
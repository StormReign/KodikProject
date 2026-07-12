"""Валидация входных данных подписок."""

from datetime import datetime

ALLOWED_PERIODS = {'month', 'year'}
DEFAULT_CATEGORY = 'Другое'


def validate_subscription(data):
    """Проверяет и нормализует данные подписки.

    Возвращает очищенный словарь с полями подписки
    или бросает ValueError с понятным сообщением.
    """
    if not isinstance(data, dict):
        raise ValueError('Ожидался JSON-объект.')

    name = str(data.get('name', '')).strip()
    if not name:
        raise ValueError('Название обязательно.')

    try:
        price = float(data.get('price'))
    except (TypeError, ValueError):
        raise ValueError('Стоимость должна быть числом.')

    if price < 0:
        raise ValueError('Стоимость не может быть отрицательной.')

    period = data.get('period')
    if period not in ALLOWED_PERIODS:
        raise ValueError('Недопустимый период оплаты.')

    next_date = str(data.get('next_date', '')).strip()
    try:
        datetime.strptime(next_date, '%Y-%m-%d')
    except ValueError as exc:
        raise ValueError('Дата должна быть в формате YYYY-MM-DD.') from exc

    category = str(data.get('category') or DEFAULT_CATEGORY).strip() or DEFAULT_CATEGORY

    return {
        'name': name,
        'price': price,
        'period': period,
        'next_date': next_date,
        'category': category,
    }
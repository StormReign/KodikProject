"""Точка входа приложения «Трекер подписок».

Запускает HTTP-сервер. Вся логика вынесена в отдельные модули:
- database.py   — работа с БД
- handler.py    — обработка HTTP-запросов
- validators.py — валидация данных
"""

import socketserver

import database
from handler import SubscriptionHandler

PORT = 5000


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True


def main():
    database.init_db()
    with ThreadingHTTPServer(('', PORT), SubscriptionHandler) as httpd:
        print(f'Сервер запущен на http://localhost:{PORT}')
        httpd.serve_forever()

if __name__ == '__main__':
    main()
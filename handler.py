"""HTTP-обработчик запросов.

Отвечает только за разбор запроса и формирование ответа.
Работа с БД — в database.py, проверка данных — в validators.py.
"""

import http.server
import json

import database
from validators import validate_subscription

API_PATH = '/api/subscriptions'


class SubscriptionHandler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b''
        try:
            return json.loads(raw_body.decode('utf-8') or '{}')
        except json.JSONDecodeError as exc:
            raise ValueError('Некорректный JSON.') from exc

    def get_subscription_id(self):
        try:
            return int(self.path.rstrip('/').split('/')[-1])
        except (ValueError, IndexError):
            raise ValueError('Некорректный идентификатор подписки.')

    # --- GET ---
    def do_GET(self):
        if self.path == '/':
            self.path = 'templates/index.html'
            return super().do_GET()

        if self.path == API_PATH:
            return self.send_json(200, database.get_all_subscriptions())

        # отдаём статические файлы (static/app.js и т.п.)
        return super().do_GET()

    # --- POST ---
    def do_POST(self):
        if self.path != API_PATH:
            return self.send_json(404, {'error': 'Маршрут не найден.'})

        try:
            data = validate_subscription(self.read_json_body())
        except ValueError as exc:
            return self.send_json(400, {'error': str(exc)})

        sub_id = database.create_subscription(data)
        return self.send_json(201, {'id': sub_id, **data})

    # --- PUT ---
    def do_PUT(self):
        if not self.path.startswith(API_PATH + '/'):
            return self.send_json(404, {'error': 'Маршрут не найден.'})

        try:
            sub_id = self.get_subscription_id()
            data = validate_subscription(self.read_json_body())
        except ValueError as exc:
            return self.send_json(400, {'error': str(exc)})

        if not database.subscription_exists(sub_id):
            return self.send_json(404, {'error': 'Подписка не найдена.'})

        database.update_subscription(sub_id, data)
        return self.send_json(200, {'id': sub_id, **data})

    # --- DELETE ---
    def do_DELETE(self):
        if not self.path.startswith(API_PATH + '/'):
            return self.send_json(404, {'error': 'Маршрут не найден.'})

        try:
            sub_id = self.get_subscription_id()
        except ValueError as exc:
            return self.send_json(400, {'error': str(exc)})

        if not database.delete_subscription(sub_id):
            return self.send_json(404, {'error': 'Подписка не найдена.'})

        self.send_response(204)
        self.end_headers()
import sqlite3
from pathlib import Path
from datetime import datetime

class ImageDatabase:
    def __init__(self, db_path="images.db"):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    original_path TEXT NOT NULL,
                    starless_path TEXT NOT NULL,
                    mask_path TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()

    def save_image_paths(self, original_path: str, starless_path: str, mask_path: str) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO images (original_path, starless_path, mask_path)
                VALUES (?, ?, ?)
            ''', (str(original_path), str(starless_path), str(mask_path)))
            conn.commit()
            return cursor.lastrowid

    def get_image_paths(self, image_id: int):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT original_path, starless_path, mask_path, created_at
                FROM images
                WHERE id = ?
            ''', (image_id,))
            return cursor.fetchone()

    def get_all_images(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, original_path, starless_path, mask_path, created_at
                FROM images
                ORDER BY created_at DESC
            ''')
            return cursor.fetchall()

    def get_paginated_images(self, page: int, per_page: int):
        offset = (page - 1) * per_page
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, original_path, starless_path, mask_path, created_at
                FROM images
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (per_page, offset))
            return cursor.fetchall()

    def get_total_images(self) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM images')
            return cursor.fetchone()[0]

    def delete_image(self, image_id: int) -> None:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM images WHERE id = ?', (image_id,))
            conn.commit() 
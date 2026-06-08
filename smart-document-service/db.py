import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT")
    )

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Doküman tablosunu oluştur
    cur.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            uploaded_text TEXT,
            detected_type VARCHAR(100),
            expiration_date DATE,
            status VARCHAR(50) DEFAULT 'UPLOADED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    cur.close()
    conn.close()
    print("Smart Document database initialized.")
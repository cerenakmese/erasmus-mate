import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "residence_permit_db"),
        user=os.getenv("DB_USER", "admin"),
        password=os.getenv("DB_PASSWORD", "adminpassword"),
        port=os.getenv("DB_PORT", "5432")
    )

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS residence_permits (
            id SERIAL PRIMARY KEY,
            student_id INT NOT NULL,
            country VARCHAR(100) NOT NULL,
            application_status VARCHAR(50) DEFAULT 'PENDING',
            appointment_date DATE,
            submission_deadline DATE NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    cur.close()
    conn.close()

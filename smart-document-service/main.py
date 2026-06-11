from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import uvicorn
import re
import spacy
from datetime import date, datetime
from db import init_db, get_db_connection
import pika
import json
import os
import grpc
import student_profile_pb2
import student_profile_pb2_grpc
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
app = FastAPI(title="Smart Document Service", description="AI-ready document processor")

def publish_expiration_event(student_id, file_name, expiration_date):
    # gRPC ile Öğrenci Profilini Çek
    student_id_str = str(student_id)
    grpc_target = os.getenv('GRPC_STUDENT_TARGET', 'localhost:50052')
    try:
        channel = grpc.insecure_channel(grpc_target)
        stub = student_profile_pb2_grpc.StudentServiceStub(channel)
        req = student_profile_pb2.GetStudentRequest(student_id=int(student_id_str))
        profile_resp = stub.GetStudentProfile(req)
        student_name = f"{profile_resp.first_name} {profile_resp.last_name}"
    except Exception as e:
        print(f"gRPC Error: Could not fetch student profile: {e}")
        student_name = "Student"

    # RabbitMQ'ya Event Gönder
    try:
        rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://localhost:5672')
        connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
        channel_mq = connection.channel()
        channel_mq.queue_declare(queue='notification_queue', durable=True)

        event_data = {
            "student_id": int(student_id_str),
            "type": "DocumentExpiringSoon",
            "message": f"Hello {student_name}, please be aware that your document '{file_name}' is expiring in exactly 30 days ({expiration_date})."
        }
        channel_mq.basic_publish(
            exchange='',
            routing_key='notification_queue',
            body=json.dumps(event_data),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        print(f"Published DocumentExpiringSoon for {file_name}")
        connection.close()
    except Exception as e:
        print(f"RabbitMQ Error: {e}")

def check_expiring_documents():
    print("Scheduler running: Checking for documents expiring in 30 days...")
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Tam 30 gün sonra süresi dolacak belgeleri bul
        cur.execute("""
            SELECT student_id, file_name, expiration_date 
            FROM documents 
            WHERE expiration_date = CURRENT_DATE + INTERVAL '30 days'
        """)
        expiring_docs = cur.fetchall()
        for doc in expiring_docs:
            publish_expiration_event(student_id=doc[0], file_name=doc[1], expiration_date=doc[2])
    except Exception as e:
        print(f"Scheduler DB Error: {e}")
    finally:
        cur.close()
        conn.close()

# Uygulama başlarken veritabanı tablolarını kontrol et
@app.on_event("startup")
def startup_event():
    init_db()
    # Scheduler'ı başlat
    scheduler = BackgroundScheduler()
    # Not: Gerçek senaryoda günde 1 kez çalışması için trigger='cron', hour=9 vb. kullanılır. 
    # Ancak test edebilmeniz için şu an her 1 dakikada bir kontrol edecek şekilde ayarlandı.
    scheduler.add_job(check_expiring_documents, IntervalTrigger(minutes=1))
    scheduler.start()

# İstemciden gelecek veri modeli
class DocumentRequest(BaseModel):
    file_name: str
    uploaded_text: str

# Gelecekte bir Makine Öğrenmesi modeliyle değiştirilecek olan "Akıllı" analiz fonksiyonları
def normalize_expiration_date(text: str) -> Optional[str]:
    # YYYY-MM-DD veya YYYY-M-D biçimlerini destekle
    match = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if not match:
        return None

    year, month, day = match.groups()
    try:
        parsed = datetime(int(year), int(month), int(day)).date()
        return parsed.isoformat()
    except ValueError:
        return None


def analyze_document(file_name: str, text: str):
    combined_text = f"{file_name} {text}"
    nlp = spacy.load("en_core_web_sm")
    # Metni SpaCy'nin yapay zeka modeline veriyoruz
    doc = nlp(combined_text)
    
    # 1. TÜR TESPİTİ (Lemmatization - Kelime Kökü Analizi)
    # Metindeki tüm kelimeleri köklerine ayırıp küçük harfe çeviriyoruz (örn: "insurances" -> "insurance")
    lemmas = [token.lemma_.lower() for token in doc]
    
    doc_type = "UNKNOWN_DOCUMENT"
    if "insurance" in lemmas or "health" in lemmas:
        doc_type = "HEALTH_INSURANCE"
    elif "passport" in lemmas:
        doc_type = "PASSPORT"
    elif "agreement" in lemmas and "learning" in lemmas:
        doc_type = "LEARNING_AGREEMENT"
    elif "acceptance" in lemmas or "admission" in lemmas:
        doc_type = "ACCEPTANCE_LETTER"

    # 2. TARİH ÇIKARMA (NER - Named Entity Recognition)
    exp_date = None
    
    for ent in doc.ents:
        if ent.label_ == "DATE":
            exp_date = normalize_expiration_date(ent.text)
            if exp_date:
                break

    if not exp_date:
        exp_date = normalize_expiration_date(text)

    return doc_type, exp_date


@app.get("/health")
def health_check():
    return {"status": "Smart Document Service is UP (Python/FastAPI)"}


@app.get("/api/documents")
def get_all_documents(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: User ID missing")
        
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM documents WHERE student_id = %s ORDER BY id ASC", (x_user_id,))
        # Sütun isimleriyle birlikte verileri sözlük (dict) formatına çeviriyoruz
        columns = [desc[0] for desc in cur.description]
        documents = [dict(zip(columns, row)) for row in cur.fetchall()]
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/documents/expiring-soon")
def get_expiring_documents(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: User ID missing")
        
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT * FROM documents 
            WHERE student_id = %s 
            AND expiration_date IS NOT NULL 
            AND expiration_date <= CURRENT_DATE + INTERVAL '90 days'
            ORDER BY expiration_date ASC
        """, (x_user_id,))
        columns = [desc[0] for desc in cur.description]
        documents = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        return {
            "message": "Documents expiring within the next 90 days",
            "documents": documents
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/documents/upload")
def process_and_upload_document(doc: DocumentRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: Gateway did not provide User ID")
    
    # 1. Dokümanı analiz et (Tür ve Tarih çıkarımı)
    doc_type, exp_date = analyze_document(doc.file_name, doc.uploaded_text)

    # 2. Veritabanına kaydet
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """INSERT INTO documents (student_id, file_name, uploaded_text, detected_type, expiration_date) 
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (x_user_id, doc.file_name, doc.uploaded_text, doc_type, exp_date)
        )
        new_doc_id = cur.fetchone()[0]
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

    # 3. gRPC ile Öğrenci Profilini Çek (Bağlam için)
    student_id_str = str(x_user_id)
    grpc_target = os.getenv('GRPC_STUDENT_TARGET', 'localhost:50052')
    try:
        channel = grpc.insecure_channel(grpc_target)
        stub = student_profile_pb2_grpc.StudentServiceStub(channel)
        req = student_profile_pb2.GetStudentRequest(student_id=int(student_id_str))
        profile_resp = stub.GetStudentProfile(req)
        student_name = f"{profile_resp.first_name} {profile_resp.last_name}"
    except Exception as e:
        print(f"gRPC Error: Could not fetch student profile: {e}")
        student_name = "Student"

    # 4. RabbitMQ ile Notification Service'e Event Gönder
    try:
        rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://localhost:5672')
        connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
        channel_mq = connection.channel()
        channel_mq.queue_declare(queue='notification_queue', durable=True)

        event_data = {
            "student_id": int(student_id_str),
            "type": "DocumentUploaded",
            "message": f"Hello {student_name}, your document '{doc.file_name}' ({doc_type}) was successfully processed."
        }
        channel_mq.basic_publish(
            exchange='',
            routing_key='notification_queue',
            body=json.dumps(event_data),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        print("Published DocumentUploaded event to RabbitMQ.")

        if exp_date:
            try:
                expiration_date = datetime.fromisoformat(exp_date).date()
                days_until = (expiration_date - date.today()).days
                if 0 <= days_until <= 30:
                    exp_event_data = {
                        "student_id": int(student_id_str),
                        "type": "DocumentExpiringSoon",
                        "message": f"Hello {student_name}, your document '{doc.file_name}' is expiring in {days_until} days on {expiration_date}."
                    }
                    channel_mq.basic_publish(
                        exchange='',
                        routing_key='notification_queue',
                        body=json.dumps(exp_event_data),
                        properties=pika.BasicProperties(delivery_mode=2)
                    )
                    print("Published DocumentExpiringSoon event to RabbitMQ.")
            except Exception as exp_err:
                print(f"Expiration date parse error: {exp_err}")

        connection.close()
    except Exception as e:
        print(f"RabbitMQ Error: {e}")

    return {
        "message": "Document processed successfully",
        "document_id": new_doc_id,
        "detected_type": doc_type,
        "expiration_date": exp_date
    }

# Servisi 3003 portundan başlat
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3003, reload=True)
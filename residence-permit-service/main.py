from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import uvicorn
import pika
import json
import os
import grpc
from datetime import date, datetime
from db import init_db, get_db_connection
import student_profile_pb2
import student_profile_pb2_grpc

app = FastAPI(title="Residence Permit Service")

@app.on_event("startup")
def startup_event():
    init_db()

class ResidencePermitRequest(BaseModel):
    country: str
    submission_deadline: date
    application_status: str = 'PENDING'
    appointment_date: Optional[date] = None
    notes: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "Residence Permit Service is running (Python/FastAPI)"}

@app.post("/api/residence-permits")
def create_permit(permit: ResidencePermitRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO residence_permits (student_id, country, application_status, appointment_date, submission_deadline, notes)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (x_user_id, permit.country, permit.application_status, permit.appointment_date, permit.submission_deadline, permit.notes)
        )
        new_permit = cur.fetchone()
        conn.commit()
        
        # Determine if deadline is approaching (e.g. <= 30 days)
        delta = (permit.submission_deadline - date.today()).days
        if 0 <= delta <= 30:
            # Publish event to RabbitMQ
            publish_deadline_event(x_user_id, permit.country, permit.submission_deadline)
            
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
        
    return {"message": "Residence permit application created successfully", "id": new_permit[0]}

def publish_deadline_event(student_id, country, deadline):
    # Call gRPC to get student name
    grpc_target = os.getenv('GRPC_STUDENT_TARGET', 'localhost:50052')
    student_name = "Student"
    try:
        channel = grpc.insecure_channel(grpc_target)
        stub = student_profile_pb2_grpc.StudentServiceStub(channel)
        req = student_profile_pb2.GetStudentRequest(student_id=int(student_id))
        profile_resp = stub.GetStudentProfile(req)
        student_name = f"{profile_resp.first_name} {profile_resp.last_name}"
    except Exception as e:
        print(f"gRPC Error: {e}")

    # Publish to RabbitMQ
    try:
        rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://localhost:5672')
        connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
        channel_mq = connection.channel()
        channel_mq.queue_declare(queue='notification_queue', durable=True)
        
        event_data = {
            "student_id": int(student_id),
            "type": "ResidenceDeadlineApproaching",
            "message": f"Hello {student_name}, your residence permit deadline for {country} is approaching on {deadline}."
        }
        channel_mq.basic_publish(
            exchange='',
            routing_key='notification_queue',
            body=json.dumps(event_data),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
    except Exception as e:
        print(f"RabbitMQ Error: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3002, reload=True)

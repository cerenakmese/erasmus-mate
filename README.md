# ErasmusMate - Microservice Architecture Project

ErasmusMate is an API-first microservice platform designed to support Erasmus and international students during their mobility process. The system helps students manage their profile, travel plans, smart documents, residence permit applications, university announcements and notifications.

The project follows a microservice-oriented architecture where each domain is implemented as an independent service with its own responsibility and, where applicable, its own PostgreSQL database. The services are accessed through an API Gateway protected with JWT authentication.

---

## 1. Main Features

The current implementation includes the following features:

* Student registration and login
* JWT-based authentication
* API Gateway routing
* Travel planning management
* Smart document upload and classification
* Document expiration date detection
* Notification management
* Residence permit application management
* University announcement management
* PostgreSQL database integration
* REST-based communication through the API Gateway
* Event-driven logic prepared with RabbitMQ
* gRPC integration prepared between selected services
* Postman collection for testing the main API flow

---

## 2. Architecture Overview

The system is composed of the following services:

| Service                     | Port | Technology        | Main Responsibility                                      |
| --------------------------- | ---: | ----------------- | -------------------------------------------------------- |
| API Gateway                 | 3000 | Node.js / Express | Single entry point, JWT validation and request routing   |
| Student Profile Service     | 3001 | Node.js / Express | Student registration, login and profile management       |
| Residence Permit Service    | 3002 | Python / FastAPI  | Residence permit applications and upcoming deadlines     |
| Smart Document Service      | 3003 | Python / FastAPI  | Document upload, classification and expiration detection |
| Travel Planning Service     | 3004 | Node.js / Express | Erasmus trip planning                                    |
| Notification Service        | 3005 | Node.js / Express | Student notifications and document expiration alerts     |
| University Services Service | 3006 | Node.js / Express | University announcements                                 |

---

## 3. Technologies Used

* Node.js
* Express.js
* Python
* FastAPI
* Uvicorn
* PostgreSQL
* JWT authentication
* API Gateway pattern
* REST APIs
* gRPC integration prepared between selected services
* RabbitMQ integration prepared for event-driven communication
* Socket.io support in Notification Service
* Postman
* Docker files included for containerization support

---

## 4. Project Structure

```text
erasmus-mate/
│
├── api-gateway/
├── student-profile-service/
├── travel-planning-service/
├── smart-document-service/
├── notification-service/
├── residence-permit-service/
├── university-services-service/
│
├── docker-compose.yml
├── init-dbs.sql
├── ErasmusMate.postman_collection.json
├── ErasmusMate_Proposal.pdf
└── README.md
```

---

## 5. Local Requirements

Before running the project locally, make sure the following tools are installed:

* Node.js
* npm
* Python 3
* pip3
* PostgreSQL
* Postman

PostgreSQL must be running locally. The project uses separate databases for the services.

Some services are implemented with Node.js/Express, while others are implemented with Python/FastAPI.

---

## 6. Databases

The project uses the following PostgreSQL databases:

```text
student_profile_db
residence_permit_db
smart_document_db
travel_planning_db
notification_service_db
university_service_db
```

These databases can be created manually or by using the provided `init-dbs.sql` file.

---

## 7. Environment Variables

Each service requires a local `.env` file. These files are not included in the repository for security reasons.

### API Gateway `.env`

```env
PORT=3000
JWT_SECRET=erasmusmate_secret_key

STUDENT_URL=http://localhost:3001
TRAVEL_URL=http://localhost:3004
DOCUMENT_URL=http://localhost:3003
NOTIFICATION_URL=http://localhost:3005
RESIDENCE_URL=http://localhost:3002
UNIVERSITY_URL=http://localhost:3006
```

### Student Profile Service `.env`

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=student_profile_db
DB_PASSWORD=postgres
DB_PORT=5432
PORT=3001
JWT_SECRET=erasmusmate_secret_key
```

### Residence Permit Service `.env`

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=residence_permit_db
DB_PASSWORD=postgres
DB_PORT=5432
PORT=3002
RABBITMQ_URL=amqp://localhost:5672
GRPC_STUDENT_TARGET=localhost:50052
```

### Smart Document Service `.env`

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=smart_document_db
DB_PASSWORD=postgres
DB_PORT=5432
PORT=3003
RABBITMQ_URL=amqp://localhost:5672
GRPC_STUDENT_TARGET=localhost:50052
```

### Travel Planning Service `.env`

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=travel_planning_db
DB_PASSWORD=postgres
DB_PORT=5432
PORT=3004
```

### Notification Service `.env`

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=notification_service_db
DB_PASSWORD=postgres
DB_PORT=5432
PORT=3005
```

### University Services Service `.env`

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=university_service_db
DB_PASSWORD=postgres
DB_PORT=5432
PORT=3006
STUDENT_API_URL=http://localhost:3001/api/students
RABBITMQ_URL=amqp://localhost:5672
```

---

## 8. How to Run the Project Locally

Open a separate terminal for each service.

### 1. Start Student Profile Service

```bash
cd student-profile-service
npm install
npm run dev
```

Expected port:

```text
3001
```

This service also starts the Student Profile gRPC server used by some Python services.

---

### 2. Start Residence Permit Service

```bash
cd residence-permit-service
pip3 install -r requirements.txt
python3 main.py
```

Expected port:

```text
3002
```

Residence Permit Service is implemented with Python/FastAPI. It receives the authenticated student ID from the API Gateway through the `x-user-id` header.

If RabbitMQ is not running locally, RabbitMQ warnings may appear, but the main REST endpoints can still be tested.

---

### 3. Start Smart Document Service

```bash
cd smart-document-service
pip3 install -r requirements.txt
python3 main.py
```

Expected port:

```text
3003
```

Smart Document Service is implemented with Python/FastAPI and includes AI-ready document processing logic.

Note: this service may require additional Python NLP dependencies such as spaCy depending on the local environment. If spaCy installation causes issues locally, the rest of the system can still be tested through the API Gateway using the other services.

---

### 4. Start Travel Planning Service

```bash
cd travel-planning-service
npm install
npm run dev
```

Expected port:

```text
3004
```

---

### 5. Start Notification Service

```bash
cd notification-service
npm install
npm install socket.io
npm run dev
```

Expected port:

```text
3005
```

The additional `socket.io` installation is required if it is not already installed in the local `node_modules`.

---

### 6. Start University Services Service

```bash
cd university-services-service
npm install
npm start
```

Expected port:

```text
3006
```

The University Service may show RabbitMQ connection warnings if RabbitMQ is not running locally. The REST endpoints can still be tested.

---

### 7. Start API Gateway

```bash
cd api-gateway
npm install
node index.js
```

Expected port:

```text
3000
```

The API Gateway should be started after the backend services are running.

---

## 9. API Gateway

The API Gateway runs on:

```text
http://localhost:3000
```

It validates JWT tokens and routes requests to the corresponding microservices.

The health endpoint is public:

```http
GET http://localhost:3000/health
```

Student registration and login are also accessible without a token:

```http
POST http://localhost:3000/api/students/register
POST http://localhost:3000/api/students/login
```

All other routes require a Bearer Token.

The API Gateway injects the authenticated student ID into protected requests through the `x-user-id` header. This is used by services such as Residence Permit Service and Smart Document Service.

---

## 10. Main API Endpoints

### Student Profile

```http
POST /api/students/register
POST /api/students/login
```

### Travel Planning

```http
POST /api/travel/trips
GET /api/travel/trips
```

### Smart Documents

```http
POST /api/documents/upload
GET /api/documents
GET /api/documents/expiring-soon
```

### Notifications

```http
POST /api/notifications
GET /api/notifications
GET /api/notifications/student/:studentId
PUT /api/notifications/:id/read
POST /api/notifications/document-expiration
```

### Residence Permits

```http
POST /api/residence-permits
GET /api/residence-permits
GET /api/residence-permits/student/:studentId
GET /api/residence-permits/upcoming-deadlines
```

### University Services

```http
GET /api/university/announcements
POST /api/university/announcements
```

---

## 11. Suggested Demo Flow

A complete demo can be performed through Postman using the API Gateway.

### Step 1: Check API Gateway health

```http
GET http://localhost:3000/health
```

Expected response:

```json
{
  "status": "API Gateway is running and secured with JWT"
}
```

---

### Step 2: Register a student

```http
POST http://localhost:3000/api/students/register
```

Example body:

```json
{
  "first_name": "Ceren",
  "last_name": "Akmeşe",
  "email": "ceren@example.com",
  "password": "mysecretpassword",
  "home_university": "Gazi University",
  "host_university": "Politecnico di Milano"
}
```

---

### Step 3: Login and get JWT token

```http
POST http://localhost:3000/api/students/login
```

Example body:

```json
{
  "email": "ceren@example.com",
  "password": "mysecretpassword"
}
```

The returned token must be used as a Bearer Token for the next requests.

---

### Step 4: Create a trip

```http
POST http://localhost:3000/api/travel/trips
```

Example body:

```json
{
  "student_id": 1,
  "destination": "Rome, Italy",
  "departure_date": "2026-06-10",
  "return_date": "2026-06-15"
}
```

---

### Step 5: Get all trips

```http
GET http://localhost:3000/api/travel/trips
```

This validates that the API Gateway, JWT authentication and Travel Planning Service are working correctly.

---

### Step 6: Upload a smart document

```http
POST http://localhost:3000/api/documents/upload
```

Example body:

```json
{
  "file_name": "health_insurance.pdf",
  "uploaded_text": "Health Insurance Certificate valid until 2026-08-15"
}
```

The student ID is provided by the API Gateway through the authenticated JWT token.

---

### Step 7: Check expiring documents

```http
GET http://localhost:3000/api/documents/expiring-soon
```

---

### Step 8: Create a document expiration notification

```http
POST http://localhost:3000/api/notifications/document-expiration
```

Example body:

```json
{
  "student_id": 1,
  "document_name": "health_insurance.pdf",
  "expiration_date": "2026-08-15"
}
```

---

### Step 9: Mark a notification as read

```http
PUT http://localhost:3000/api/notifications/1/read
```

---

### Step 10: Create a residence permit application

```http
POST http://localhost:3000/api/residence-permits
```

Example body:

```json
{
  "country": "Turkey",
  "application_status": "PENDING",
  "appointment_date": "2026-06-20",
  "submission_deadline": "2026-06-25",
  "notes": "Student must submit passport copy, health insurance and university acceptance letter."
}
```

The student ID is injected by the API Gateway using the authenticated JWT token.

---

### Step 11: Check upcoming residence permit deadlines

```http
GET http://localhost:3000/api/residence-permits/upcoming-deadlines
```

---

### Step 12: Create a university announcement

```http
POST http://localhost:3000/api/university/announcements
```

Example body:

```json
{
  "title": "Exam Schedule Update",
  "content": "The university has published an updated exam schedule for Erasmus students."
}
```

---

### Step 13: Get university announcements

```http
GET http://localhost:3000/api/university/announcements
```

---

## 12. Postman Collection

The repository includes a Postman collection:

```text
ErasmusMate.postman_collection.json
```

This collection contains the main API requests used to test the system.

Recommended usage:

1. Import the collection into Postman.
2. Start PostgreSQL.
3. Start the backend services locally.
4. Start the API Gateway.
5. Run login to generate a JWT token.
6. Add the token to the protected requests.
7. Execute the demo flow through the API Gateway.

The saved requests in Postman include the method, URL and request body. However, the JWT token may need to be regenerated before testing protected endpoints.

---

## 13. Notes About RabbitMQ and Event-Driven Logic

Some services include RabbitMQ logic prepared for event-driven communication, especially University Services, Smart Document Service and Residence Permit Service.

For local testing, RabbitMQ is not strictly required to validate the main REST flow. If RabbitMQ is not running, some services may show connection warnings, but the core REST endpoints can still be tested through the API Gateway.

This can be presented as an event-driven extension prepared for future integration with the Notification Service.

---

## 14. Notes About Smart Document Service

Smart Document Service includes an AI-ready Python/FastAPI implementation for document classification and expiration-date extraction.

The current implementation is designed to support smart processing of uploaded documents such as:

* Health insurance documents
* Passports
* Learning agreements
* Acceptance letters
* Visa documents

Depending on the local Python environment, installing NLP dependencies such as spaCy may require additional setup. If this service causes local dependency issues, the rest of the system can still be demonstrated using Student Profile, Travel Planning, Notification, Residence Permit and University Services through the API Gateway.

---

## 15. Current Status

The current version of ErasmusMate provides a functional backend prototype based on microservices. The system includes several independently deployable services, an API Gateway, JWT authentication and PostgreSQL persistence.

Most services can be tested locally through the API Gateway using the provided Postman collection. Student Profile, Travel Planning, Notification, Residence Permit and University Services are part of the main tested demo flow.

Smart Document Service includes an AI-ready Python/FastAPI implementation for document classification and expiration-date extraction. Depending on the local Python environment, additional NLP dependencies may be required to run the full Smart Document pipeline.

The project demonstrates:

* Service decomposition
* API Gateway routing
* JWT authentication
* Independent service databases
* RESTful communication
* Python/FastAPI services
* Node.js/Express services
* Smart document processing
* Notification handling
* Residence permit deadline tracking
* University announcement management
* Event-driven communication prepared with RabbitMQ
* gRPC integration prepared between selected services

---

## 16. Authors

* Ceren Akmeşe
* Yago Rodríguez de Pauli

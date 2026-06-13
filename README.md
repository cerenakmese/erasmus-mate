# ErasmusMate - Microservice Architecture Project

ErasmusMate is an **API-first microservice platform** designed to support Erasmus and international students during their mobility period. The system helps students manage their profile, travel plans, smart documents, residence permit applications, university announcements, notifications, and real-time messaging with other students.

The project follows a **microservice-oriented architecture** where each domain is implemented as an independent service with its own responsibility and, where applicable, its own PostgreSQL database. All services are accessed through an **API Gateway** protected with JWT authentication.

## 1. Main Features

- Student registration and login
- JWT-based authentication
- API Gateway routing
- Travel planning management
- Smart document upload and classification
- Document expiration date detection
- Notification management
- Residence permit application management
- University announcement management
- Real-time student-to-student messaging (**Chatting Service**)
- PostgreSQL database integration
- REST-based communication through the API Gateway
- Event-driven logic with RabbitMQ
- Real-time socket notifications via RabbitMQ
- gRPC integration prepared between selected services
- Postman collection for testing the main API flow

## 2. Architecture Overview

| Service                        | Port  | Technology          | Main Responsibility |
|-------------------------------|-------|---------------------|---------------------|
| **API Gateway**               | 3000  | Node.js / Express   | Single entry point, JWT validation and routing |
| **Student Profile Service**   | 3001  | Node.js / Express   | Student registration, login and profile management |
| **Residence Permit Service**  | 3002  | Python / FastAPI    | Residence permit applications and upcoming deadlines |
| **Smart Document Service**    | 3003  | Python / FastAPI    | Document upload, classification and expiration detection |
| **Travel Planning Service**   | 3004  | Node.js / Express   | Erasmus trip planning |
| **Notification Service**      | 3005  | Node.js / Express   | Student notifications, document alerts, and Socket.io |
| **University Services Service**| 3006 | Node.js / Express   | University announcements |
| **Chatting Service**          | 3007  | Node.js / Express   | Real-time student messaging and chat history |

## 3. Technologies Used

- Node.js + Express.js
- Python + FastAPI + Uvicorn
- PostgreSQL
- JWT Authentication
- API Gateway Pattern
- REST APIs
- gRPC (prepared)
- RabbitMQ (event-driven communication)
- Socket.io (centralized)
- Docker & Docker Compose
- Postman

## 4. Project Structure

```bash
erasmus-mate/
├── api-gateway/
├── student-profile-service/
├── residence-permit-service/
├── smart-document-service/
├── travel-planning-service/
├── notification-service/
├── university-services-service/
├── chatting-service/
├── docker-compose.yml
├── init-dbs.sql
├── ErasmusMate.postman_collection.json
├── ErasmusMate_Proposal.pdf
└── README.md


Readme sections 5 6 7 · MD
## 5. Local Requirements
 
Before running the project locally, make sure the following tools are installed:
 
- Node.js + npm
- Python 3 + pip
- PostgreSQL
- RabbitMQ (required for Notifications and Chatting Service)
- Postman (for API testing)
PostgreSQL must be running locally. The project uses **separate databases** for each service. Some services are built with Node.js/Express, while others use Python/FastAPI.
 
---
 
## 6. Databases
 
The project uses the following PostgreSQL databases:
 
- `student_profile_db`
- `residence_permit_db`
- `smart_document_db`
- `travel_planning_db`
- `notification_service_db`
- `university_service_db`
- `chatting_db`
These databases can be created manually or automatically using the provided `init-dbs.sql` file.
 
---
 
## 7. Environment Variables
 
Each service requires its own `.env` file (not included in the repository for security reasons).
 
**API Gateway `.env` example:**
 
```env
PORT=3000
JWT_SECRET=erasmusmate_secret_key
STUDENT_URL=http://localhost:3001
TRAVEL_URL=http://localhost:3004
DOCUMENT_URL=http://localhost:3003
NOTIFICATION_URL=http://localhost:3005
RESIDENCE_URL=http://localhost:3002
UNIVERSITY_URL=http://localhost:3006
CHATTING_URL=http://localhost:3007
```
 
> If running with Docker Compose, replace `localhost` with the container service names (e.g., `http://student-profile-service:3001`).
 
**Chatting Service `.env` example:**
 
```env
PORT=3007
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatting_db
RABBITMQ_URL=amqp://localhost:5672
```
 
All other services follow the same pattern — use their respective `DB_NAME` and `PORT` values.

## 8. How to Run the Project Locally (Docker Compose Recommended)
 
Since the project architecture has grown with message brokers (RabbitMQ) and multiple databases, the most stable way to run the entire project is using Docker Compose:
 
```bash
docker compose up -d --build
```
 
If you prefer to run services manually, open a separate terminal for each service:
 
**Node.js services:**
```bash
npm install
npm start
```
 
**Python services:**
```bash
pip install -r requirements.txt
python main.py
```
 
> Make sure **RabbitMQ** and **PostgreSQL** are running locally before starting services manually.
 
---
 
## 9. API Gateway
 
The API Gateway runs at:
 
```
http://localhost:3000
```
 
It validates JWT tokens and routes requests to the corresponding microservices. The authenticated student ID is injected into protected requests via the `x-user-id` header. This completely prevents IDOR vulnerabilities (e.g., users fetching other students' chat history).
 
---
 
## 10. Main API Endpoints
 
### Student Profile
 
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/students/register` |
| `POST` | `/api/students/login` |
| `GET`  | `/api/students` |
 
### Chatting Service (Real-time Messaging)
 
| Method | Endpoint |
|--------|----------|
| `GET`  | `/api/chat/students` |
| `POST` | `/api/chat/messages` |
| `GET`  | `/api/chat/messages` |
 
### Notifications & WebSockets
 
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/notifications` |
| `GET`  | `/api/notifications` |
| `GET`  | `/api/notifications/student/:studentId` |
| `PUT`  | `/api/notifications/:id/read` |
 
> WebSocket connections are handled via the Notification Service on port `3005` with JWT handshake.
 
### Travel Planning
 
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/travel/trips` |
| `GET`  | `/api/travel/trips` |
 
### Smart Documents
 
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/documents/upload` |
| `GET`  | `/api/documents` |
| `GET`  | `/api/documents/expiring-soon` |
 
### Residence Permits
 
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/residence-permits` |
| `GET`  | `/api/residence-permits` |
| `GET`  | `/api/residence-permits/upcoming-deadlines` |
 
### University Services
 
| Method | Endpoint |
|--------|----------|
| `GET`  | `/api/university/announcements` |
| `POST` | `/api/university/announcements` |
 
---
 
## 11. Suggested Demo Flow (Chatting & Notifications)
 
1. **Login** — `POST http://localhost:3000/api/students/login` to get the JWT token.
2. **Connect to Socket** — Open Postman, create a Socket.IO request to:
```
   http://localhost:3005?token=YOUR_JWT_TOKEN
```
3. **Listen for Events** — Add a listener for `receive_notification`.
4. **Fetch Students** — `GET http://localhost:3000/api/chat/students` to see available peers.
5. **Send a Message** — `POST http://localhost:3000/api/chat/messages` with body:
```json
   { "receiverId": "STUDENT_ID", "content": "Hello!" }
```
6. **Observe Real-Time** — The RabbitMQ broker will instantly push the `NEW_CHAT_MESSAGE` event to the receiver's Socket.IO connection.
---
 
## 12. Notes About RabbitMQ and Event-Driven Logic
 
The Notification Service acts as the central hub for all real-time events. Services like Chatting Service and Smart Document Service do not implement their own WebSockets. Instead, they produce messages to the `notification_queue` via RabbitMQ. The Notification Service consumes these messages and broadcasts them via Socket.io. This decoupling ensures high scalability and prevents WebSocket connection scattering.
 
---
 
## 13. Current Status
 
The current version of ErasmusMate provides a functional, event-driven backend prototype based on microservices. The system includes several independently deployable services, an API Gateway, JWT authentication, PostgreSQL persistence, and RabbitMQ message brokering.
 
The project successfully demonstrates:
 
- Service decomposition & API Gateway routing
- Secure JWT authentication (header injection via `x-user-id`)
- Event-driven architecture with RabbitMQ
- Centralized WebSocket management (Socket.io)
- Independent service databases (PostgreSQL)
- RESTful and gRPC communication between services
---
 
## 14. Authors
 
- Ceren Akmeşe
- Yago Rodríguez de Pauli

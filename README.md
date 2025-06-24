# TankManage

## Overview

**TankManage** is a robust, full-stack IoT dashboard for real-time water tank monitoring and management. It is designed for both lab and production use, supporting:
- User registration, email verification, and admin approval
- Dashboard creation with customizable fields and widgets
- Real-time data ingestion via MQTT and HTTP/HTTPS
- Secure authentication (JWT)
- Admin and user roles
- Email notifications (verification, approval, dashboard assignment)
- Modern React frontend with beautiful UI
- Cloudflare-protected public domains for both frontend and backend
- Fully containerized with Docker Compose

---


## Architecture

```mermaid
graph TD
  A[ESP8266/IoT Device] -- MQTT/HTTP --> B[MQTT Broker (Mosquitto)]
  A -- HTTP/HTTPS --> C[FastAPI Backend]
  B -- MQTT Data --> C
  C -- REST API --> D[MongoDB]
  C -- REST API --> E[React Frontend]
  E -- HTTPS --> C
  E -- HTTPS --> D
  F[Cloudflare Tunnel/Proxy] -- HTTPS --> E
  F -- HTTPS --> C
```

---

## Features

### User Management
- **Registration:** Users sign up with email, username, and password. Google reCAPTCHA prevents bots.
- **Email Verification:** Users must verify their email before logging in.
- **Admin Approval:** Admins must approve users before they can access dashboards.
- **Roles:** Admins can manage users, dashboards, and data. Regular users can view and manage their assigned dashboards.

### Dashboard Management
- **Create Dashboards:** Admins can create dashboards with custom fields (e.g., Temp, Level, pH) and assign them to users.
- **Widgets:** Add widgets (charts, gauges, etc.) to visualize data for each field.
- **API Key:** Each dashboard has a unique API key for secure data uploads.

### Data Ingestion
- **MQTT:** Devices (e.g., ESP8266/ESP32) publish sensor data to topics like `tankmanage/<dashboard_id>/<field>`.
- **HTTP/HTTPS:** Devices can also POST data directly to the backend API.
- **Real-Time Updates:** Data is stored in MongoDB and visualized instantly on the frontend.

### Visualization & Analytics
- **Live Charts:** Real-time and historical data visualization for each field.
- **Widgets:** Line charts, bar charts, numeric displays, and more.
- **Last Updated:** Each field shows the last time data was received.

### Notifications
- **Email:**
  - Verification email on registration
  - Approval/rejection email from admin
  - Dashboard assignment notification
- **Configurable SMTP:** Set up your own SMTP server in `.env.docker`.

### Security
- **JWT Authentication:** All API endpoints require a valid token.
- **Password Hashing:** Secure password storage.
- **CORS:** Only allowed origins can access the API.
- **Google reCAPTCHA:** Prevents bot registrations.
- **Email Verification:** Users must verify email before login.
- **Admin Approval:** Admin must approve users before access.
- **API Key:** Required for device data uploads.

### Cloudflare & Domains
- **Frontend Domain:** `https://tankmanage.teamskrn.xyz`
- **Backend Domain:** `https://api.teamskrn.xyz`
- **Cloudflare Tunnel:** Securely exposes local services to the public internet.
- **SSL:** Managed by Cloudflare.

### Dockerized Infrastructure
- **All services are containerized.**
- **Services:** `mongo`, `mosquitto`, `backend`, `frontend`
- **Network:** All containers share the `waternet` bridge network.

---

## Directory Structure

```
water-dashboard/
  app/                # FastAPI backend
  frontend/           # React frontend
  mongo-init.js       # MongoDB init script
  docker-compose.yml  # Multi-service orchestration
  mosquitto.conf      # MQTT broker config
  password_file       # MQTT user/passwords
  requirements.txt    # Backend Python deps
  ...
```

---

## Data Flow

1. **User registers** → verifies email → admin approves
2. **Admin creates dashboard** → assigns to user → user receives email
3. **Device sends data** (MQTT or HTTP) → backend validates API key → stores in MongoDB
4. **Frontend fetches data** → displays live/historical charts and widgets

---

## Backend (FastAPI)

- **Location:** `app/`
- **Main entry:** `app/main.py`
- **API:** RESTful, JWT-protected, CORS-enabled
- **Key endpoints:**
  - `/api/v1/users/register` - Register user
  - `/api/v1/users/login` - Login
  - `/api/v1/users/approve` - Admin approval
  - `/api/v1/dashboards/` - CRUD dashboards
  - `/api/v1/data/` - Data ingestion (HTTP POST)
- **Email:** SMTP config in `.env.docker`
- **MQTT:** Consumes data from Mosquitto broker
- **MongoDB:** Stores users, dashboards, data points

### Backend Setup

```sh
# Local development
cd app
python -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
uvicorn app.main:app --reload
```

---

## Frontend (React + Vite + MUI)

- **Location:** `frontend/`
- **Main entry:** `frontend/src/pages/`
- **Features:** Modern UI, stepper registration, Google reCAPTCHA, dashboard widgets, admin/user separation
- **API URL:** Set in `frontend/.env.production` as `VITE_API_URL=https://api.teamskrn.xyz/api/v1`

### Frontend Setup

```sh
cd frontend
npm install
npm run dev         # For development
npm run build       # For production build
```

---

## MQTT Broker (Mosquitto)

- **Location:** Docker service, config in `mosquitto.conf`
- **Ports:** 1883 (MQTT), 9001 (WebSocket)
- **Auth:** User/password in `password_file`
- **Usage:** Devices publish to topics like `tankmanage/<dashboard_id>/<field>`

---

## MongoDB

- **Location:** Docker service
- **Port:** 27017
- **Init script:** `mongo-init.js` (creates DB, user, collections, indexes)
- **Credentials:** Set in `docker-compose.yml` and `mongo-init.js`

---

## Docker & Docker Compose

- **All services are containerized.**
- **Services:** `mongo`, `mosquitto`, `backend`, `frontend`
- **Network:** All containers share the `waternet` bridge network.

### Build & Run

```sh
docker-compose build
docker-compose up -d
```

- **Frontend:** http://localhost:5174 (or your public domain)
- **Backend:** http://localhost:8001 (or your public domain)
- **MongoDB:** localhost:27017
- **MQTT:** localhost:1883

---

## Cloudflare & Domains

- **Frontend Domain:** `https://tankmanage.teamskrn.xyz`
- **Backend Domain:** `https://api.teamskrn.xyz`
- **Cloudflare Tunnel:** Used to expose local services to the public internet securely.
- **DNS:** CNAME records point to Cloudflare Pages/Workers or your server.
- **SSL:** Managed by Cloudflare.

### Cloudflare Setup

1. Create a Cloudflare account and add your domain.
2. Set up Cloudflare Tunnel for backend and frontend.
3. Configure DNS records as CNAME to your tunnel/Pages.
4. Enable SSL (Full/Strict).
5. (Optional) Use Cloudflare Workers for API proxying.

---

## IoT Device Integration (ESP8266/ESP32)

- **MQTT:** Devices publish sensor data to `tankmanage/<dashboard_id>/<field>`
- **HTTP:** Devices can POST data to `/api/v1/data/`
- **API Key:** Each dashboard has a unique API key for authentication.
- **Example code:** See `ESP8266_SETUP_FINAL.md` for full setup and troubleshooting.

---

## Email Notifications

- **Verification:** Sent on registration.
- **Approval:** Sent when admin approves/rejects.
- **Dashboard Assignment:** Sent when a dashboard is assigned to a user.
- **Config:** SMTP settings in `.env.docker` and `app/core/config.py`.

---

## Security

- **JWT Authentication:** All API endpoints require a valid token.
- **Password Hashing:** All passwords are securely hashed.
- **CORS:** Only allowed origins can access the API.
- **Google reCAPTCHA:** Prevents bot registrations.
- **Email Verification:** Users must verify email before login.
- **Admin Approval:** Admin must approve users before access.
- **API Key:** Required for device data uploads.
- **HTTPS:** All public endpoints are served over HTTPS via Cloudflare.
- **Role Separation:** Admin and user roles are strictly enforced in the backend.

---

## Environment Variables

- **Backend:** `.env.docker`
  - `MONGO_URI`, `MQTT_BROKER`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, etc.
- **Frontend:** `.env.production`
  - `VITE_API_URL=https://api.teamskrn.xyz/api/v1`

---

## Common Commands

### Local Development

```sh
# Backend
cd app
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Docker (all services)
docker-compose up --build
```

### Production Build

```sh
docker-compose build
docker-compose up -d
```

---

## Troubleshooting

- **CORS errors:** Check allowed origins in backend.
- **API errors:** Check backend logs and API URL in frontend.
- **MQTT issues:** Ensure broker is running and credentials are correct.
- **MongoDB issues:** Check container logs and credentials.
- **Email not sent:** Check SMTP config and logs.
- **Cloudflare issues:** Check DNS, SSL, and tunnel status.

---

## Useful Links

- **Frontend:** https://tankmanage.teamskrn.xyz
- **Backend:** https://api.teamskrn.xyz
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **FastAPI:** https://fastapi.tiangolo.com/
- **React:** https://react.dev/
- **Mosquitto:** https://mosquitto.org/
- **MongoDB:** https://www.mongodb.com/
- **ESP8266/ESP32:** https://randomnerdtutorials.com/

---

## Contributors

- TeamSKRN

---

## Additional Notes & Best Practices

### User Roles & Permissions
- **Admin:** Can manage all users, approve/reject, create/assign dashboards, view all data.
- **User:** Can view and manage only their assigned dashboards, see their own data.

### Dashboard & Data Management
- **Dashboards:** Each dashboard is a logical channel for a tank or sensor group. Fields are customizable (e.g., Temp, Level, pH).
- **Widgets:** Visualize each field with a chart, gauge, or numeric display. Widgets are configurable per dashboard.
- **Data Points:** Every data update is timestamped and stored for historical analysis.

### Data Flow & Security
- **Device → MQTT/HTTP → Backend:** Devices must use the correct API key and topic/endpoint.
- **Backend → MongoDB:** All data is validated and stored securely.
- **Frontend → Backend:** All API calls are authenticated and CORS-protected.
- **Cloudflare:** All public traffic is routed through Cloudflare for DDoS protection and SSL.

### Extending the System
- **Add new widgets:** Extend the frontend `components/widgets/` directory.
- **Add new device types:** Update backend ingestion logic to support new data formats.
- **Integrate with other clouds:** Use Cloudflare Workers or API gateways for advanced routing.

---

**For detailed device setup, see `ESP8266_SETUP_FINAL.md`. For deployment, see `DEPLOYMENT.md`.**

---

## Advanced Docker & Containerization

### Multi-Stage Builds
- **Frontend:** Uses a multi-stage Dockerfile. First, Node.js builds the static site, then Nginx serves the optimized build.
- **Backend:** Python image with only production dependencies for minimal attack surface.

### Health Checks
- **Nginx:** `/health` endpoint returns 200 for container health monitoring.
- **Docker Compose:** All services are orchestrated and can be restarted automatically on failure.

### Volumes & Persistence
- **MongoDB:** Data is persisted via Docker volumes (see `docker-compose.yml`).
- **Mosquitto:** Persists messages and logs for reliability and debugging.

### Logs & Debugging
- **Nginx:** Logs access and errors to `/var/log/nginx/`.
- **Mosquitto:** Logs to `/mosquitto/log/mosquitto.log`.
- **Backend:** Logs to stdout (view with `docker logs backend`).

### Troubleshooting
- Use `docker-compose logs <service>` to view logs for any service.
- Use `docker-compose exec <service> sh` to get a shell inside a container for debugging.
- Use `docker stats` to monitor resource usage.

---

## Nginx & Mosquitto Configuration Highlights

### Nginx (Frontend)
- **API Proxy:** Forwards `/api/` requests to the backend container.
- **Rate Limiting:** Limits API requests to prevent abuse (`limit_req_zone`).
- **Security Headers:**
  - `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`.
- **Cache Control:**
  - Static files are cached for 1 year (`Cache-Control: public, max-age=31536000, immutable`).
  - Main HTML is not cached for instant updates.
- **Gzip Compression:** Reduces bandwidth for static assets.
- **React Router Support:** All unknown routes serve `index.html` for SPA routing.
- **Health Endpoint:** `/health` returns 200 for uptime checks.

### Mosquitto (MQTT Broker)
- **Password Protection:** Only authenticated users can publish/subscribe (`password_file`).
- **WebSocket Support:** MQTT over WebSockets on port 9001 for browser or advanced client support.
- **Logging:** All MQTT activity is logged for auditing and debugging.
- **Persistence:** Retains messages and state across restarts.
- **Security:**
  - No anonymous access.
  - Limits on inflight and queued messages.
  - Connection and message limits for DDoS protection.

---

## Domain, DNS, and Cloudflare Best Practices

### DNS & Domains
- **Frontend:** CNAME `tankmanage.teamskrn.xyz` → Cloudflare Pages or your server.
- **Backend:** CNAME `api.teamskrn.xyz` → Cloudflare Tunnel or your server.
- **MQTT:** If public MQTT is needed, use a subdomain (e.g., `mqtt.teamskrn.xyz`) and secure with TLS.

### Cloudflare
- **SSL:** Always use Full (Strict) mode for end-to-end encryption.
- **Caching:** Static assets are cached globally for performance.
- **DDoS Protection:** All public endpoints are protected by Cloudflare's WAF and rate limiting.
- **Custom Rules:** You can add page rules for redirects, cache busting, or security.
- **Analytics:** Use Cloudflare Analytics for traffic and security insights.

### Troubleshooting Domains
- **DNS Propagation:** Changes can take up to 24 hours.
- **SSL Issues:** Ensure backend supports HTTPS if using Full (Strict) mode.
- **CORS:** Always allow your frontend domain in backend CORS settings.
- **API Proxy:** If using a reverse proxy, ensure headers are forwarded correctly.

---

## Feature Highlights & Extensibility

### Security & Rate Limiting
- **Frontend:** Nginx and Cloudflare both enforce rate limits and security headers.
- **Backend:** JWT, CORS, and API key validation for all sensitive endpoints.
- **MQTT:** Passwords, no anonymous access, and connection/message limits.

### Health & Monitoring
- **Health Endpoints:** `/health` on frontend for uptime checks.
- **Logs:** All services log to files or stdout for easy monitoring.
- **Cloudflare Analytics:** Monitor traffic, threats, and performance.

### Extending the Platform
- **Add New Widgets:** Extend React components in `frontend/src/components/widgets/`.
- **Add New Device Types:** Update backend ingestion logic to support new data formats or protocols.
- **Integrate with Other Clouds:** Use Cloudflare Workers, API gateways, or serverless functions for advanced routing or integrations.
- **Custom Email Templates:** Edit `app/services/email_service.py` for branded notifications.

### Operational Tips
- **Scaling:** Use Docker Swarm or Kubernetes for horizontal scaling.
- **Backups:** Regularly back up MongoDB data volume.
- **Secrets Management:** Use Docker secrets or environment variables for sensitive data.
- **Updates:** Rebuild Docker images after any dependency or config change.
- **Zero Downtime Deploys:** Use rolling updates with Docker Compose or your orchestrator.

---
## ⚠️ Where to Add Your Own Keys, Secrets, and Credentials

This project requires you to set several unique keys and credentials for security and correct operation. **Replace all default/example values with your own!**

### 1. Google reCAPTCHA Site Key
- **Where:** `frontend/src/pages/Register.tsx`
- **What to do:** Replace `"YOUR_RECAPTCHA_SITE_KEY"` with your actual site key from the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin).
- **Why:** This key is required for the reCAPTCHA widget to work and protect your registration form from bots.

### 2. Gmail/SMTP Credentials (Email Sending)
- **Where:** `.env.docker` (and referenced in `app/core/config.py`)
- **What to do:** Set these environment variables with your real SMTP server details:
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASSWORD=your-app-password
  EMAIL_FROM=your-email@gmail.com
  EMAIL_FROM_NAME=TankManage
  ```
- **Why:** These are used by the backend to send verification, approval, and notification emails. **Never commit real passwords to public repos.**

### 3. JWT Secret Key
- **Where:** `.env.docker` (and referenced in `app/core/config.py`)
- **What to do:** Set a strong, random value for:
  ```env
  JWT_SECRET=your-very-secret-key
  ```
- **Why:** This key is used to sign and verify JWT tokens for authentication. It must be kept secret.

### 4. MongoDB Credentials
- **Where:** `.env.docker` and `mongo-init.js`
- **What to do:** Set your own MongoDB username and password:
  ```env
  MONGO_URI=mongodb://app_user:app_password@mongo:27017/thingspeak_clone
  ```
  And in `mongo-init.js`:
  ```js
  db.createUser({
    user: 'app_user',
    pwd: 'app_password',
    ...
  })
  ```
- **Why:** These credentials are used by the backend to connect to MongoDB. Change them for security.

### 5. MQTT User/Password
- **Where:** `password_file` (used by Mosquitto)
- **What to do:** Use `mosquitto_passwd` to generate a new user/password hash and update this file.
- **Why:** Only authenticated devices should be able to publish/subscribe to MQTT topics.

### 6. Cloudflare Tunnel Secret (if used)
- **Where:** Cloudflare Tunnel configuration (not in repo, but in your Cloudflare dashboard or tunnel config file)
- **What to do:** Use your own Cloudflare account and tunnel secret for secure public access.
- **Why:** This secures your public endpoints and domains.

### 7. Frontend API URL
- **Where:** `frontend/.env.production`
- **What to do:** Set the correct backend API URL:
  ```env
  VITE_API_URL=https://api.teamskrn.xyz/api/v1
  ```
- **Why:** Ensures the frontend talks to the correct backend.

---

### Summary Table

| Purpose                | File/Location                        | What to Replace                        |
|------------------------|--------------------------------------|----------------------------------------|
| reCAPTCHA Site Key     | frontend/src/pages/Register.tsx      | YOUR_RECAPTCHA_SITE_KEY                |
| Gmail/SMTP             | .env.docker, app/core/config.py      | SMTP_HOST, SMTP_USER, SMTP_PASSWORD    |
| JWT Secret             | .env.docker, app/core/config.py      | JWT_SECRET                             |
| MongoDB Credentials    | .env.docker, mongo-init.js           | MONGO_URI, db.createUser()             |
| MQTT User/Password     | password_file                        | mqtt_user/password                     |
| Cloudflare Tunnel      | Cloudflare dashboard/config           | Tunnel secret/token                    |
| Frontend API URL       | frontend/.env.production             | VITE_API_URL                           |

**Always keep these values secret and never commit real credentials to public repositories!**

---


**For detailed device setup, see `ESP8266_SETUP_FINAL.md`. For deployment, see `DEPLOYMENT.md`.**
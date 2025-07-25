# BlueDrop Deployment Guide (E2E Networks VPS)

## Prerequisites

- VPS IP: 216.48.176.193
- Domains:
  - Frontend: https://dashboard.bluedrop.shop
  - Backend: https://api.bluedrop.shop
- Docker & Docker Compose installed on VPS
- DNS A records for both domains pointing to VPS IP

## Step 1: Clone the Repository

```sh
git clone https://github.com/JoeMarian/bluedropwithcloudlfare.git
cd bluedropwithcloudlfare
```

## Step 2: Environment Variables

- Backend: Edit `.env.docker` as needed (Mongo, SMTP, JWT, etc.)
- Frontend: `frontend/.env.production` should have:
  ```env
  VITE_API_URL=https://api.bluedrop.shop/api/v1
  ```

## Step 3: Build & Run with Docker Compose

```sh
docker-compose build
docker-compose up -d
```

- Frontend: http://216.48.176.193:5174 (or https://dashboard.bluedrop.shop after DNS/SSL)
- Backend: http://216.48.176.193:8001 (or https://api.bluedrop.shop after DNS/SSL)

## Step 4: Nginx Reverse Proxy & SSL

- Use Nginx to serve both frontend and backend with SSL (Let's Encrypt recommended).
- Example Nginx configs are provided in `nginx.conf` and `frontend/nginx.conf`.
- Use Certbot to generate SSL certificates for both domains.

## Step 5: Systemd Service (Optional)

- Use `setup.sh` to install as a systemd service for auto-startup.

## Step 6: Access

- Visit https://dashboard.bluedrop.shop for the frontend.
- API is at https://api.bluedrop.shop/api/v1

## Troubleshooting

- Use `docker-compose logs` to debug services.
- Check Nginx and Certbot logs for proxy/SSL issues.

---

# Old Cloudflare/teamskrn.xyz instructions removed. 
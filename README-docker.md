# Docker Compose Instructions

The docker-compose configuration is located in the `backend/docker` folder.

To start your services, either:
1. Change directory:
   ```
   cd backend/docker
   docker compose up --build -d
   ```
2. Or use the `-f` flag from the backend folder:
   ```
   docker compose -f docker/docker-compose.yml up --build -d
   ```

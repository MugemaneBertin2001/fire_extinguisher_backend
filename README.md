# FireTrack360 Documentation

## Project Overview
FireTrack360 is a private NestJS-based application.

## Prerequisites
- Node.js (recommended version 18.x or later)
- pnpm
- Docker (optional, for containerized deployment)
- Access to the private repository

## Repository Access
This is a private repository. Ensure you have:
- Been granted access by the project administrator
- Set up SSH keys or personal access token for GitHub/GitLab
- Proper authentication configured for private repository cloning

### Cloning the Repository
```bash
git clone https://github.com/satorrwanda/FireTrack360-backend.git
# or use the specific private repository URL provided to you
cd firetrack360
```

## Local Setup

### 1. Environment Configuration
1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` and replace the placeholder values with your actual configuration:
- `DATABASE_URL`: Connection string for your database
- `JWT_SECRET`: A strong, unique secret key for authentication
- `REDIS_HOST`: Redis server host
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email service credentials
- Any other environment-specific variables

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Database Setup
Ensure your database is running and the connection details in `.env` are correct.

### 4. Start the Development Server
```bash
pnpm dev
# or
pnpm start:dev
```

The application will be available at `http://localhost:3000/graphql`

## Docker Deployment

### 1. Prerequisites
- Docker
- Docker Compose

### 2. Environment Configuration
1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in the `.env` file with appropriate values

### 3. Build and Run with Docker
```bash
docker-compose up --build
```

### 4. Stopping the Docker Deployment
```bash
docker-compose down
```

## Additional Commands

### Running Tests
```bash
pnpm test
```

### Production Build
```bash
pnpm build
```

## Development Guidelines

### Sensitive Information
- Never commit sensitive information to the repository
- Use `.env` for local configurations
- Refer to `.env.example` for required environment variables
- Ensure `.env` is added to `.gitignore`

### Access Control
- Contact the project administrator for:
  - Repository access
  - Environment configuration details
  - Deployment credentials

## Troubleshooting
- Ensure all environment variables are correctly set
- Verify you have the necessary access rights
- Check Docker and Node.js versions
- Verify network ports are not in use
- If experiencing dependency issues:
  ```bash
  pnpm install --frozen-lockfile
  ```

## Support
For any issues or questions, please contact:
- Project Administrator
- Technical Lead
- DevOps Team
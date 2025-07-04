# Staff Portal Project

## Overview
This project is a full-stack web application with a React frontend and an Express.js backend, connected to a PostgreSQL database. It provides a staff management portal with API-driven functionality.

## Prerequisites
- **Node.js**: Ensure Node.js is installed on your system.
- **PostgreSQL**: A running PostgreSQL database instance on port `5432`.
    - Database name: `staff_portal`
    - Owned by user: `appagent`
    - Password: Configured in the backend's `.env` file.

## Setup Instructions

### Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure the `.env` file is configured with the PostgreSQL credentials (e.g., `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`).
4. Initialize the database with seed data:
    - Use the supplementary `.csv` files to populate non-empty tables/models.
    - Import the `.csv` files into the `staff_portal` database using a PostgreSQL client or script.
5. Start the backend server (runs on port `5000`):
   ```bash
   npm start
   ```
   The backend accepts API requests at `http://localhost:5000`.

### Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server (runs on port `3000`):
   ```bash
   npm start
   ```
   The frontend was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) and is accessible at `http://localhost:3000`.

## Notes
- Ensure the PostgreSQL database is running and accessible before starting the backend.
- The backend relies on the `.env` file for database configuration. Verify the credentials match the `appagent` user and `staff_portal` database.
- Seed `.csv` files should be used to initialize the database tables with necessary data before running the application.
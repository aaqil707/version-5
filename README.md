# Tool Management Application

## Setup Instructions

### Step 1: Set up the Database

1. Open XAMPP Control Panel
2. Start Apache and MySQL
3. Open phpMyAdmin (http://localhost/phpmyadmin)
4. Create a new database named `tool_management`
5. Click on the database and go to "Import" tab
6. Import the file: `backend/database.sql`

### Step 2: Start the Backend (PHP)

1. Open terminal in the project folder:
    ```
    cd C:\xampp\htdocs\new project
    ```
2. Start PHP built-in server:
    ```
    C:\xampp\php\php.exe -S localhost:8080 router.php
    ```

### Step 3: Start the Frontend (React)

1. Open a new terminal in the `frontend` folder:
    ```
    cd C:\xampp\htdocs\new project\frontend
    ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the React app:
   ```
   npm start
   ```

### Step 4: Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

## Login Credentials

Default admin account (auto-created on first run):
- **Email**: admin@example.com
- **Password**: Admin@123

Or register a new account from the signup page (requires @vdartinc.com or @vdartdigital.com email).

## Features

- Login/Signup authentication with OTP verification
- Dashboard with sidebar navigation
- Tool Management with full CRUD operations
- Filter tools by status (All/Active Only/Inactive Only)
- Export to CSV
- Tools expiring/renewed this month summary
- Portal Analytics with charts and KPIs
- Email notifications for tool renewals
- Admin can manage email settings

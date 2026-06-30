# 📝 Notes App Backend

A secure and scalable RESTful API for the Notes Application built with **Node.js**, **Express.js**, and **MongoDB**. The backend provides user authentication and CRUD operations for managing personal notes while ensuring data security.

## Features

- User Registration & Login
- firebase Authentication & Authorization
- Create, Read, Update, Share and Delete Notes
- Search Notes
- User-Specific Notes Management
- Password Hashing using bcrypt
- RESTful API Architecture
- Input Validation & Error Handling
- MongoDB Integration
- Fast and Lightweight Express Server

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Authentication:** JSON Web Token (JWT)
- **Password Hashing:** bcryptjs
- **Environment Variables:** dotenv
- **CORS:** cors
- **Development:** Nodemon

---

## 📁 Project Structure

```
notes-backend/
│── config/
│── controllers/
│── middleware/
│── models/
│── routes/
│── services/
│── utils/
│── .env
│── server.js
│── package.json
│── README.md
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/notes-backend.git
```

### 2. Navigate to the Project

```bash
cd notes-backend
```

### 3. Install Dependencies

```bash
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000

MONGODB_URI=mongodb://localhost:27017/notes-app

JWT_SECRET=your_jwt_secret_key

JWT_EXPIRES_IN=7d
```

---

## ▶️ Run the Development Server

```bash
npm run dev
```

The server will start at:

```
http://localhost:5000
```

---

## Build & Start

For production:

```bash
npm start
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login user |

### Notes

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/notes` | Get all notes |
| GET | `/api/notes/:id` | Get note by ID |
| POST | `/api/notes` | Create a note |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |

---

## Authentication

Protected routes require a JWT token.

Example:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Available Scripts

```bash
npm run dev      # Start development server
npm start        # Start production server
```

---

## API Testing

You can test the API using:

- Thunder Client (VS Code)

---

## Future Enhancements

- 📂 Categories & Tags
- ⭐ Favorite Notes
- 🗑️ Trash & Restore
- 📌 Pin Notes
- ⏰ Reminders

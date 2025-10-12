# 🎬 Movie Ticket Booking System

## 📖 Overview
The **Movie Ticket Booking System** is a full-stack web application that enables users to browse movies, select show timings, choose seats, and book tickets online.  
It is designed to simplify the movie ticket reservation process with a smooth, responsive, and user-friendly interface.

---

## 🚀 Features
- 🎞️ Browse available movies with details (title, genre, duration, poster, etc.)
- 🕒 Choose show date and time
- 💺 Interactive seat selection grid
- 🧾 Instant booking confirmation
- 🔐 User login and registration
- 🗄️ Admin panel to manage movies, shows, and bookings
- 📊 Responsive frontend built with HTML, CSS, and JavaScript

---

## 🧰 Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend** | Python (Flask) |
| **Database** | MySQL |
| **Tools** | XAMPP / MySQL Workbench, VS Code |

---

## ⚙️ Installation and Setup

### 
1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/movie-ticket-booking.git
cd movie-ticket-booking

2️⃣**Create and Activate Virtual Environment**
python -m venv venv
venv\Scripts\activate     # For Windows
# OR
source venv/bin/activate  # For Mac/Linux

# **Install Dependencies**
pip install Flask Flask-CORS 

4️⃣ **Configure the Database**

Open MySQL and create a new database named movie_db

Import the provided SQL file:

mysql -u root -p movie_db < database.sql

Update database credentials in config.py (or inside the Flask app file):

app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'yourpassword'
app.config['MYSQL_DB'] = 'movie_db'

5️⃣ Run the Application
python app.py

6️⃣ Open in Browser
http://127.0.0.1:5000/
git clone https://github.com/your-username/movie-ticket-booking.git
cd movie-ticket-booking

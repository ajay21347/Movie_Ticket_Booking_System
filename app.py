from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)

DB_FILE = "movies.db"

# Initialize database if not exists
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Create movies table
    c.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            genre TEXT,
            duration TEXT,
            price INTEGER
        )
    ''')

    # Create bookings table
    c.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER,
            movie_title TEXT,
            date TEXT,
            time TEXT,
            seats TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            total INTEGER,
            status TEXT
        )
    ''')

    # Insert movies if table is empty
    c.execute("SELECT COUNT(*) FROM movies")
    if c.fetchone()[0] == 0:
        movies = [
            (1, "Inception", "Sci-Fi", "148 min", 250),
            (2, "The Dark Knight", "Action", "152 min", 250),
            (3, "Interstellar", "Sci-Fi", "169 min", 300),
            (4, "Avengers: Endgame", "Action", "181 min", 300),
            (5, "The Shawshank Redemption", "Drama", "142 min", 200),
            (6, "Pulp Fiction", "Crime", "154 min", 200)
        ]
        c.executemany("INSERT INTO movies (id, title, genre, duration, price) VALUES (?, ?, ?, ?, ?)", movies)

    conn.commit()
    conn.close()

# Call init_db manually
init_db()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/movies')
def get_movies():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT * FROM movies")
    movies = [{"id": row[0], "title": row[1], "genre": row[2], "duration": row[3], "price": row[4]} for row in c.fetchall()]
    conn.close()
    return jsonify(movies)

@app.route('/api/book', methods=['POST'])
def book_ticket():
    data = request.json
    movie_id = data.get("movie_id")
    movie_title = data.get("movie_title")
    date = data.get("date")
    time = data.get("time")
    seats = ",".join(map(str, data.get("seats")))
    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    total = data.get("total")
    status = "Confirmed"

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO bookings (movie_id, movie_title, date, time, seats, name, email, phone, total, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (movie_id, movie_title, date, time, seats, name, email, phone, total, status))
    conn.commit()
    conn.close()

    return jsonify({"message": "Booking confirmed successfully!"})

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    search = request.args.get("search", "").lower()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    if search:
        c.execute("SELECT * FROM bookings WHERE LOWER(email) LIKE ? OR phone LIKE ?", (f"%{search}%", f"%{search}%"))
    else:
        c.execute("SELECT * FROM bookings")
    bookings = []
    for row in c.fetchall():
        bookings.append({
            "id": row[0],
            "movie_id": row[1],
            "movie_title": row[2],
            "date": row[3],
            "time": row[4],
            "seats": row[5].split(","),
            "name": row[6],
            "email": row[7],
            "phone": row[8],
            "total": row[9],
            "status": row[10]
        })
    conn.close()
    return jsonify(bookings)

if __name__ == '__main__':
    app.run(debug=True)

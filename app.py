from flask import Flask, render_template, request, jsonify
import sqlite3
import heapq

app = Flask(__name__)
DB_FILE = "movies.db"

# ------------------ DSA Functions ------------------

# Binary Search (movies list must be sorted by id)
def binary_search_movie(movies, movie_id):
    left, right = 0, len(movies) - 1
    while left <= right:
        mid = (left + right) // 2
        if movies[mid]['id'] == movie_id:
            return movies[mid]
        elif movies[mid]['id'] < movie_id:
            left = mid + 1
        else:
            right = mid - 1
    return None

# Quick Sort for movies
def quick_sort_movies(arr, key):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr)//2]
    left = [x for x in arr if x[key] < pivot[key]]
    middle = [x for x in arr if x[key] == pivot[key]]
    right = [x for x in arr if x[key] > pivot[key]]
    return quick_sort_movies(left, key) + middle + quick_sort_movies(right, key)

# Heap-based seat optimization
def heap_optimize_seats(movie_id, date, time, num_seats):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT seats FROM bookings WHERE movie_id=? AND date=? AND time=?", (movie_id, date, time))
    booked = []
    for row in c.fetchall():
        booked += list(map(int, row[0].split(',')))
    conn.close()

    total_seats = 50
    available = [i for i in range(1, total_seats+1) if i not in booked]

    # Min-heap based on distance from center
    mid = total_seats // 2
    heap = [(abs(seat - mid), seat) for seat in available]
    heapq.heapify(heap)

    assigned = []
    while len(assigned) < num_seats and heap:
        assigned.append(heapq.heappop(heap)[1])
    return sorted(assigned)

# ------------------ Database Initialization ------------------
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            genre TEXT,
            duration TEXT,
            price INTEGER
        )
    ''')
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

init_db()

# ------------------ Routes ------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/movies')
def get_movies():
    genre = request.args.get("genre", "").lower()
    sort_by = request.args.get("sort_by", "")

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT * FROM movies")
    movies = [{"id": row[0], "title": row[1], "genre": row[2], "duration": row[3], "price": row[4]} for row in c.fetchall()]
    conn.close()

    # Filter by genre
    if genre:
        movies = [m for m in movies if m['genre'].lower() == genre]

    # Sort using Quick Sort
    if sort_by in ["price", "title", "duration"]:
        movies = quick_sort_movies(movies, sort_by)

    return jsonify(movies)

@app.route('/api/book', methods=['POST'])
def book_ticket():
    data = request.json
    movie_id = int(data.get("movie_id"))
    date = data.get("date")
    time = data.get("time")
    seats = data.get("seats") or []
    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")

    # Fetch all movies sorted by id for binary search
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT * FROM movies ORDER BY id")
    movies = [{"id": row[0], "title": row[1], "genre": row[2], "duration": row[3], "price": row[4]} for row in c.fetchall()]
    conn.close()

    movie = binary_search_movie(movies, movie_id)
    if not movie:
        return jsonify({"message": "Movie not found"}), 404

    # Total price
    total = len(seats) * movie['price'] if seats else movie['price']

    # Optimize seats if not selected
    if not seats:
        seats = heap_optimize_seats(movie_id, date, time, 1)
        total = len(seats) * movie['price']

    seats_str = ",".join(map(str, seats))

    # Insert booking
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO bookings (movie_id, movie_title, date, time, seats, name, email, phone, total, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (movie_id, movie['title'], date, time, seats_str, name, email, phone, total, "Confirmed"))
    conn.commit()
    conn.close()

    return jsonify({"message": "Booking confirmed!", "seats": seats})

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
    analytics = {"total_bookings_per_movie": {}, "total_revenue_per_movie": {}}
    for row in c.fetchall():
        b = {
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
        }
        bookings.append(b)
        # Analytics
        analytics["total_bookings_per_movie"][b["movie_title"]] = analytics["total_bookings_per_movie"].get(b["movie_title"], 0) + len(b["seats"])
        analytics["total_revenue_per_movie"][b["movie_title"]] = analytics["total_revenue_per_movie"].get(b["movie_title"], 0) + b["total"]
    
    conn.close()
    return jsonify({"bookings": bookings, "analytics": analytics})

if __name__ == '__main__':
    app.run(debug=True)

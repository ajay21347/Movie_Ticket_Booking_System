from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3
import heapq

app = Flask(__name__)
app.secret_key = "cinebook_secret"
DB_FILE = "movies.db"


# ------------------ DSA Functions ------------------


# Binary Search (movies list must be sorted by id)
def binary_search_movie(movies, movie_id):
    left, right = 0, len(movies) - 1
    while left <= right:
        mid = (left + right) // 2
        if movies[mid]["id"] == movie_id:
            return movies[mid]
        elif movies[mid]["id"] < movie_id:
            left = mid + 1
        else:
            right = mid - 1
    return None


# Quick Sort for movies
def quick_sort_movies(arr, key):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x[key] < pivot[key]]
    middle = [x for x in arr if x[key] == pivot[key]]
    right = [x for x in arr if x[key] > pivot[key]]
    return quick_sort_movies(left, key) + middle + quick_sort_movies(right, key)


# Heap-based seat optimization
def heap_optimize_seats(movie_id, date, time, num_seats):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "SELECT seats FROM bookings WHERE movie_id=? AND date=? AND time=?",
        (movie_id, date, time),
    )
    booked = []
    for row in c.fetchall():
        booked += list(map(int, row[0].split(",")))
    conn.close()

    total_seats = 50
    available = [i for i in range(1, total_seats + 1) if i not in booked]

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

    # Create movies table
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            genre TEXT,
            duration TEXT,
            price INTEGER
        )
    """
    )

    # Create bookings table
    c.execute(
        """
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
    """
    )

    # Create users table
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT CHECK(role IN ('admin','user'))
        )
    """
    )

    # Add default admin account if none exists
    c.execute("SELECT COUNT(*) FROM users WHERE role='admin'")
    if c.fetchone()[0] == 0:
        c.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            ("admin", "admin123", "admin"),
        )

    c.execute("SELECT COUNT(*) FROM movies")
    if c.fetchone()[0] == 0:
        movies = [
            (1, "Inception", "Sci-Fi", "148 min", 250),
            (2, "The Dark Knight", "Action", "152 min", 250),
            (3, "Interstellar", "Sci-Fi", "169 min", 300),
            (4, "Avengers: Endgame", "Action", "181 min", 300),
            (5, "The Shawshank Redemption", "Drama", "142 min", 200),
            (6, "Pulp Fiction", "Crime", "154 min", 200),
        ]
        c.executemany(
            "INSERT INTO movies (id, title, genre, duration, price) VALUES (?, ?, ?, ?, ?)",
            movies,
        )
    conn.commit()
    conn.close()


init_db()


# ------------------ Authentication Routes ------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.json
        username = data.get("username")
        password = data.get("password")

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute(
            "SELECT id, role FROM users WHERE username=? AND password=?",
            (username, password),
        )
        row = c.fetchone()
        conn.close()

        if row:
            session["user"] = username
            session["id"] = row[0]
            session["role"] = row[1]
            if row[1] == "admin":
                return jsonify({"redirect": "/admin"})
            else:
                return jsonify({"redirect": "/"})
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    return render_template("login.html")


@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    try:
        c.execute(
            "INSERT INTO users (username,password,role)VALUES(?,?,?)",
            (username, password, "user"),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400
    finally:
        conn.close()

    return jsonify({"message": "Registration successful! Please login."})


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# ------------------ Routes ------------------


@app.route("/")
def index():
    if "role" not in session or session["role"] != "user":
        return redirect("/login")
    return render_template("index.html")


@app.route("/admin")
def admin_dashboard():
    if "role" not in session or session["role"] != "admin":
        return redirect("/login")
    return render_template("admin.html")


@app.route("/api/movies")
def get_movies():
    genre = request.args.get("genre", "").lower()
    sort_by = request.args.get("sort_by", "")

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT * FROM movies")
    movies = [
        {
            "id": row[0],
            "title": row[1],
            "genre": row[2],
            "duration": row[3],
            "price": row[4],
        }
        for row in c.fetchall()
    ]
    conn.close()

    # Filter by genre
    if genre:
        movies = [m for m in movies if m["genre"].lower() == genre]

    # Sort using Quick Sort
    if sort_by in ["price", "title", "duration"]:
        movies = quick_sort_movies(movies, sort_by)

    return jsonify(movies)


@app.route("/api/book", methods=["POST"])
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
    movies = [
        {
            "id": row[0],
            "title": row[1],
            "genre": row[2],
            "duration": row[3],
            "price": row[4],
        }
        for row in c.fetchall()
    ]
    conn.close()

    movie = binary_search_movie(movies, movie_id)
    if not movie:
        return jsonify({"message": "Movie not found"}), 404

    # Total price
    total = len(seats) * movie["price"] if seats else movie["price"]

    # Optimize seats if not selected
    if not seats:
        seats = heap_optimize_seats(movie_id, date, time, 1)
        total = len(seats) * movie["price"]

    seats_str = ",".join(map(str, seats))

    # Insert booking
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO bookings (movie_id, movie_title, date, time, seats, name, email, phone, total, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (
            movie_id,
            movie["title"],
            date,
            time,
            seats_str,
            name,
            email,
            phone,
            total,
            "Confirmed",
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Booking confirmed!", "seats": seats})


@app.route("/api/bookings", methods=["GET"])
def get_bookings():
    search = request.args.get("search", "").lower()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    if search:
        c.execute(
            "SELECT * FROM bookings WHERE LOWER(email) LIKE ? OR phone LIKE ?",
            (f"%{search}%", f"%{search}%"),
        )
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
            "status": row[10],
        }
        bookings.append(b)
        # Analytics
        analytics["total_bookings_per_movie"][b["movie_title"]] = analytics[
            "total_bookings_per_movie"
        ].get(b["movie_title"], 0) + len(b["seats"])
        analytics["total_revenue_per_movie"][b["movie_title"]] = (
            analytics["total_revenue_per_movie"].get(b["movie_title"], 0) + b["total"]
        )

    conn.close()
    return jsonify({"bookings": bookings, "analytics": analytics})


@app.route("/api/cancel_booking/<int:booking_id>", methods=["DELETE"])
def cancel_booking(booking_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Check if booking exists
    c.execute("SELECT status FROM bookings WHERE id=?", (booking_id,))
    result = c.fetchone()
    if not result:
        conn.close()
        return jsonify({"error": "Booking not found"}), 404

    status = result[0]
    if status == "Cancelled":
        conn.close()
        return jsonify({"message": "Booking is already cancelled."}), 200

    # Mark booking as cancelled
    c.execute("UPDATE bookings SET status='Cancelled' WHERE id=?", (booking_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Booking cancelled successfully!"})


# ------------------ Admin API Routes ------------------


@app.route("/api/admin/add_movie", methods=["POST"])
def add_movie():
    # Allow only admin role
    if "role" not in session or session["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    title = data.get("title")
    genre = data.get("genre")
    duration = data.get("duration")
    price = data.get("price")

    # Validation
    if not title or not genre or not duration or not price:
        return jsonify({"error": "All fields are required"}), 400

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO movies (title, genre, duration, price) VALUES (?, ?, ?, ?)",
        (title, genre, duration, price),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": f'Movie "{title}" added successfully!'})


if __name__ == "__main__":
    app.run(debug=True)

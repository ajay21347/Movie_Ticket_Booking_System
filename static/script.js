let movies = [];
const showtimes = ["10:00 AM", "01:00 PM", "04:00 PM", "07:00 PM", "10:00 PM"];
const totalSeats = 50;
let selectedSeats = [];
let bookedSeats = {}; // Store booked seats for each movie-date-time

document.addEventListener("DOMContentLoaded", () => {
    fetchMovies();
    setMinDate();
});

// ------------------ Fetch & Display Movies ------------------
function fetchMovies(sort_by = "") {
    fetch(`/api/movies?sort_by=${sort_by}`)
        .then(res => res.json())
        .then(data => {
            movies = data;
            displayMovies();
            populateMovieSelect();
        });
}

// Display movies on homepage
function displayMovies() {
    const grid = document.getElementById('moviesGrid');
    grid.innerHTML = movies.map(m => `
        <div class="movie-card" onclick="selectMovie(${m.id})">
            <div class="movie-poster">🎬</div>
            <div class="movie-info">
                <div class="movie-title">${m.title}</div>
                <div class="movie-details">${m.genre} • ${m.duration}</div>
                <div class="movie-details" style="color: #667eea; font-weight: 600; margin-top: 5px;">₹${m.price} per ticket</div>
            </div>
        </div>
    `).join('');
}

// Populate movie dropdown in booking form
function populateMovieSelect() {
    const select = document.getElementById('movieSelect');
    select.innerHTML = '<option value="">Select a movie</option>';
    movies.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.title} - ₹${m.price}`;
        select.appendChild(opt);
    });
}

// ------------------ Sorting ------------------
function sortMoviesBy(field) {
    fetchMovies(field); // backend quicksort handles sorting
}

// ------------------ Date & Movie Selection ------------------
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateSelect').min = today;
    document.getElementById('dateSelect').value = today;
}

function selectMovie(id) {
    document.getElementById('movieSelect').value = id;
    showTab('booking');
    updateShowtimes();
}

// Show selected tab
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Update showtimes based on movie & date selection
function updateShowtimes() {
    const movieId = document.getElementById('movieSelect').value;
    const date = document.getElementById('dateSelect').value;
    const select = document.getElementById('showtimeSelect');

    select.innerHTML = '<option value="">Choose a showtime</option>';
    if (movieId && date) {
        showtimes.forEach(time => {
            const opt = document.createElement('option');
            opt.value = time;
            opt.textContent = time;
            select.appendChild(opt);
        });
    }

    document.getElementById('seatsContainer').style.display = 'none';
    selectedSeats = [];
}

// ------------------ Seat Handling ------------------
function loadSeats(autoAssign = false) {
    const movieId = document.getElementById('movieSelect').value;
    const date = document.getElementById('dateSelect').value;
    const time = document.getElementById('showtimeSelect').value;
    if (!movieId || !date || !time) return;

    const key = `${movieId}-${date}-${time}`;

    fetch(`/api/bookings?search=`)
        .then(res => res.json())
        .then(data => {
            bookedSeats[key] = [];
            data.bookings.forEach(b => {
                if (b.movie_id == movieId && b.date == date && b.time == time) {
                    bookedSeats[key] = bookedSeats[key].concat(b.seats.map(Number));
                }
            });

            renderSeats(key, autoAssign);
        });
}

// Render seat grid
function renderSeats(key, autoAssign = false) {
    const grid = document.getElementById('seatsGrid');
    grid.innerHTML = '';
    const booked = bookedSeats[key] || [];
    selectedSeats = [];

    for (let i = 1; i <= totalSeats; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.textContent = i;
        seat.dataset.seat = i;

        if (booked.includes(i)) {
            seat.classList.add('booked');
        } else {
            seat.onclick = () => toggleSeat(i, key);
        }

        grid.appendChild(seat);
    }

    // Auto-assign best available seat using heap logic
    if (autoAssign) {
        fetch(`/api/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_id: document.getElementById('movieSelect').value, date: document.getElementById('dateSelect').value, time: document.getElementById('showtimeSelect').value, seats: [] })
        })
        .then(res => res.json())
        .then(data => {
            selectedSeats = data.seats;
            selectedSeats.forEach(s => {
                const seatEl = document.querySelector(`[data-seat="${s}"]`);
                if (seatEl) seatEl.classList.add('selected');
            });
            updateSummary();
        });
    }

    document.getElementById('seatsContainer').style.display = 'block';
    updateSummary();
}

// Toggle seat selection
function toggleSeat(seatNum, key) {
    const idx = selectedSeats.indexOf(seatNum);
    const seatEl = document.querySelector(`[data-seat="${seatNum}"]`);

    if (idx > -1) {
        selectedSeats.splice(idx, 1);
        seatEl.classList.remove('selected');
    } else {
        selectedSeats.push(seatNum);
        seatEl.classList.add('selected');
    }

    updateSummary();
}

// ------------------ Booking Summary ------------------
function updateSummary() {
    const movieId = document.getElementById('movieSelect').value;
    const date = document.getElementById('dateSelect').value;
    const time = document.getElementById('showtimeSelect').value;

    if (selectedSeats.length > 0 && movieId) {
        const movie = movies.find(m => m.id == movieId);
        const total = selectedSeats.length * movie.price;

        document.getElementById('summaryMovie').textContent = movie.title;
        document.getElementById('summaryDateTime').textContent = `${date} at ${time}`;
        document.getElementById('summarySeats').textContent = selectedSeats.sort((a,b)=>a-b).join(', ');
        document.getElementById('summaryTickets').textContent = selectedSeats.length;
        document.getElementById('summaryTotal').textContent = `₹${total}`;
        document.getElementById('bookingSummary').style.display = 'block';
    } else {
        document.getElementById('bookingSummary').style.display = 'none';
    }
}

// ------------------ Confirm Booking ------------------
function confirmBooking() {
    const movieId = document.getElementById('movieSelect').value;
    const date = document.getElementById('dateSelect').value;
    const time = document.getElementById('showtimeSelect').value;
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const phone = document.getElementById('customerPhone').value;

    if (!movieId || !date || !time) { showMessage('Please select movie, date and showtime', 'error'); return; }
    if (selectedSeats.length === 0) { showMessage('Please select at least one seat', 'error'); return; }
    if (!name || !email || !phone) { showMessage('Please fill in all customer details', 'error'); return; }

    const movie = movies.find(m => m.id == movieId);
    const total = selectedSeats.length * movie.price;

    fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId, movie_title: movie.title, date, time, seats: selectedSeats, name, email, phone, total })
    })
    .then(res => res.json())
    .then(data => {
        showMessage(data.message, 'success');
        setTimeout(resetBookingForm, 2000);
    });
}

// ------------------ Messages & Reset ------------------
function showMessage(msg, type) {
    const msgEl = document.getElementById('bookingMessage');
    msgEl.textContent = msg;
    msgEl.className = `message ${type}`;
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
}

function resetBookingForm() {
    document.getElementById('movieSelect').value = '';
    document.getElementById('dateSelect').value = new Date().toISOString().split('T')[0];
    document.getElementById('showtimeSelect').innerHTML = '<option value="">Choose a showtime</option>';
    document.getElementById('customerName').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('seatsContainer').style.display = 'none';
    document.getElementById('bookingSummary').style.display = 'none';
    selectedSeats = [];
}

// ------------------ Search Bookings ------------------
function searchBookings() {
    const search = document.getElementById('searchBooking').value.toLowerCase();
    const list = document.getElementById('bookingsList');

    if (!search) { list.innerHTML = '<p style="color:#6c757d;">Please enter email or phone to search</p>'; return; }

    fetch(`/api/bookings?search=${search}`)
        .then(res => res.json())
        .then(data => {
            const bookings = data.bookings || [];
            if (bookings.length === 0) { list.innerHTML = '<p style="color:#6c757d;">No bookings found</p>'; return; }

            list.innerHTML = bookings.map(b => `
                <div class="booking-item">
                    <div class="booking-header">
                        <span class="booking-id">Booking #${b.id}</span>
                        <span class="booking-status">${b.status}</span>
                    </div>
                    <div><strong>Movie:</strong> ${b.movie_title}</div>
                    <div><strong>Date & Time:</strong> ${b.date} at ${b.time}</div>
                    <div><strong>Seats:</strong> ${b.seats.join(', ')}</div>
                    <div><strong>Name:</strong> ${b.name}</div>
                    <div><strong>Total:</strong> ₹${b.total}</div>
                </div>
            `).join('');
        });
}

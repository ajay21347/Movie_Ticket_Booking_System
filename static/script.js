// ------------------ Global Variables ------------------
let movies = [];
const showtimes = ["10:00 AM", "01:00 PM", "04:00 PM", "07:00 PM", "10:00 PM"];
const totalSeats = 50;
let selectedSeats = [];
let bookedSeats = {};

// ------------------ Initialize ------------------
document.addEventListener("DOMContentLoaded", () => {
  fetchMovies();
  setMinDate();
});

// ------------------ Logout ------------------
function logoutUser() {
  window.location.href = "/logout";
}

// ------------------ Fetch & Display Movies ------------------
function fetchMovies(sort_by = "") {
  fetch(`/api/movies?sort_by=${sort_by}`)
    .then((res) => res.json())
    .then((data) => {
      movies = data;
      displayMovies();
      populateMovieSelect();
    })
    .catch(() => console.error("Error fetching movies."));
}

function displayMovies() {
  const grid = document.getElementById("moviesGrid");
  grid.innerHTML = movies
    .map(
      (m) => `
        <div class="movie-card" onclick="selectMovie(${m.id})">
            <div class="movie-poster">🎬</div>
            <div class="movie-info">
                <div class="movie-title">${m.title}</div>
                <div class="movie-details">${m.genre} • ${m.duration}</div>
                <div class="movie-details" style="color: #667eea; font-weight: 600; margin-top: 5px;">₹${m.price} per ticket</div>
            </div>
        </div>
    `
    )
    .join("");
}

function populateMovieSelect() {
  const select = document.getElementById("movieSelect");
  select.innerHTML = '<option value="">Select a movie</option>';
  movies.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.title} - ₹${m.price}`;
    select.appendChild(opt);
  });
}

// ------------------ Sorting ------------------
function sortMoviesBy(field) {
  fetchMovies(field);
}

// ------------------ Date & Movie Selection ------------------
function setMinDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dateSelect").min = today;
  document.getElementById("dateSelect").value = today;
}

function selectMovie(id) {
  document.getElementById("movieSelect").value = id;
  showTab("booking");
  updateShowtimes();
}

// ------------------ Tab Management ------------------
function showTab(tabId) {
  document
    .querySelectorAll(".tab")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((div) => div.classList.remove("active"));

  document
    .querySelector(`[onclick="showTab('${tabId}')"]`)
    .classList.add("active");
  document.getElementById(tabId).classList.add("active");

  if (tabId === "mybookings") loadUserBookings();
}

// ------------------ Update Showtimes ------------------
function updateShowtimes() {
  const movieId = document.getElementById("movieSelect").value;
  const date = document.getElementById("dateSelect").value;
  const select = document.getElementById("showtimeSelect");

  select.innerHTML = '<option value="">Choose a showtime</option>';
  if (movieId && date) {
    showtimes.forEach((time) => {
      const opt = document.createElement("option");
      opt.value = time;
      opt.textContent = time;
      select.appendChild(opt);
    });
  }

  document.getElementById("seatsContainer").style.display = "none";
  selectedSeats = [];
}

// ------------------ Seat Handling ------------------
function loadSeats(autoAssign = false) {
  const movieId = document.getElementById("movieSelect").value;
  const date = document.getElementById("dateSelect").value;
  const time = document.getElementById("showtimeSelect").value;
  if (!movieId || !date || !time) return;

  const key = `${movieId}-${date}-${time}`;

  fetch(`/api/bookings?search=`)
    .then((res) => res.json())
    .then((data) => {
      bookedSeats[key] = [];
      data.bookings.forEach((b) => {
        if (b.movie_id == movieId && b.date == date && b.time == time) {
          bookedSeats[key] = bookedSeats[key].concat(b.seats.map(Number));
        }
      });

      renderSeats(key, autoAssign);
    });
}

function renderSeats(key, autoAssign = false) {
  const grid = document.getElementById("seatsGrid");
  grid.innerHTML = "";
  const booked = bookedSeats[key] || [];
  selectedSeats = [];

  for (let i = 1; i <= totalSeats; i++) {
    const seat = document.createElement("div");
    seat.className = "seat";
    seat.textContent = i;
    seat.dataset.seat = i;

    if (booked.includes(i)) {
      seat.classList.add("booked");
    } else {
      seat.onclick = () => toggleSeat(i, key);
    }

    grid.appendChild(seat);
  }

  if (autoAssign) autoAssignSeats();
  document.getElementById("seatsContainer").style.display = "block";
  updateSummary();
}

function toggleSeat(seatNum, key) {
  const idx = selectedSeats.indexOf(seatNum);
  const seatEl = document.querySelector(`[data-seat="${seatNum}"]`);

  if (idx > -1) {
    selectedSeats.splice(idx, 1);
    seatEl.classList.remove("selected");
  } else {
    selectedSeats.push(seatNum);
    seatEl.classList.add("selected");
  }

  updateSummary();
}

// ------------------ Auto Assign Seats ------------------
function autoAssignSeats() {
  fetch(`/api/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      movie_id: document.getElementById("movieSelect").value,
      date: document.getElementById("dateSelect").value,
      time: document.getElementById("showtimeSelect").value,
      seats: [],
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      selectedSeats = data.seats;
      selectedSeats.forEach((s) => {
        const seatEl = document.querySelector(`[data-seat="${s}"]`);
        if (seatEl) seatEl.classList.add("selected");
      });
      updateSummary();
    });
}

// ------------------ Booking Summary ------------------
function updateSummary() {
  const movieId = document.getElementById("movieSelect").value;
  const date = document.getElementById("dateSelect").value;
  const time = document.getElementById("showtimeSelect").value;

  if (selectedSeats.length > 0 && movieId) {
    const movie = movies.find((m) => m.id == movieId);
    const total = selectedSeats.length * movie.price;

    document.getElementById("summaryMovie").textContent = movie.title;
    document.getElementById(
      "summaryDateTime"
    ).textContent = `${date} at ${time}`;
    document.getElementById("summarySeats").textContent = selectedSeats
      .sort((a, b) => a - b)
      .join(", ");
    document.getElementById("summaryTickets").textContent =
      selectedSeats.length;
    document.getElementById("summaryTotal").textContent = `₹${total}`;
    document.getElementById("bookingSummary").style.display = "block";
  } else {
    document.getElementById("bookingSummary").style.display = "none";
  }
}

// ------------------ Confirm Booking ------------------
function confirmBooking() {
  const movieId = document.getElementById("movieSelect").value;
  const date = document.getElementById("dateSelect").value;
  const time = document.getElementById("showtimeSelect").value;

  if (!movieId || !date || !time)
    return showMessage("Please select movie, date and showtime", "error");
  if (selectedSeats.length === 0)
    return showMessage("Please select at least one seat", "error");

  const movie = movies.find((m) => m.id == movieId);
  const total = selectedSeats.length * movie.price;

  fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      movie_id: movieId,
      movie_title: movie.title,
      date,
      time,
      seats: selectedSeats,
      user_id: currentUser.id,
      total,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      showMessage(data.message, "success");
      setTimeout(resetBookingForm, 2000);
    });
}

// ------------------ Messages & Reset ------------------
function showMessage(msg, type) {
  const msgEl = document.getElementById("bookingMessage");
  msgEl.textContent = msg;
  msgEl.className = `message ${type}`;
  msgEl.style.display = "block";
  setTimeout(() => {
    msgEl.style.display = "none";
  }, 5000);
}

function resetBookingForm() {
  document.getElementById("movieSelect").value = "";
  document.getElementById("dateSelect").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("showtimeSelect").innerHTML =
    '<option value="">Choose a showtime</option>';
  document.getElementById("seatsContainer").style.display = "none";
  document.getElementById("bookingSummary").style.display = "none";
  selectedSeats = [];
}

// ------------------ Load User Bookings ------------------
function loadUserBookings() {
  const filter = document.getElementById("filterStatus")?.value || "all";

  fetch(`/api/bookings?userId=${currentUser.id}`)
    .then((res) => res.json())
    .then((data) => {
      let bookings = data.bookings || [];
      const list = document.getElementById("bookingsList");
      list.innerHTML = "";

      if (bookings.length === 0)
        return (list.innerHTML = "<p>No bookings yet.</p>");

      bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (filter === "active")
        bookings = bookings.filter((b) => b.status !== "Cancelled");
      else if (filter === "cancelled")
        bookings = bookings.filter((b) => b.status === "Cancelled");
      if (bookings.length === 0)
        return (list.innerHTML = `<p>No ${filter} bookings found.</p>`);

      bookings.forEach((b) => {
        const div = document.createElement("div");
        div.className = "booking-card";
        if (b.status === "Cancelled") div.classList.add("cancelled");

        div.innerHTML = `
          <h3>${b.movie_title}</h3>
          <p><strong>Date & Time:</strong> ${b.date} at ${b.time}</p>
          <p><strong>Seats:</strong> ${b.seats.join(", ")}</p>
          <p><strong>Total:</strong> ₹${b.total}</p>
          <p><strong>Status:</strong> <span class="status">${
            b.status || "Active"
          }</span></p>
          ${
            b.status !== "Cancelled"
              ? `<button class="btn cancel-btn" onclick="cancelBooking(${b.id})">Cancel Booking</button>`
              : ""
          }
        `;
        list.appendChild(div);
      });
    })
    .catch(() => alert("Error loading bookings."));
}

// ------------------ Cancel Booking ------------------
function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  fetch(`/api/cancel_booking/${bookingId}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message || "Booking cancelled successfully!");
      loadUserBookings();
    })
    .catch(() => alert("Error cancelling booking."));
}

// ------------------- ADMIN FUNCTIONS -------------------
function addMovie() {
  const title = document.getElementById("movieTitle").value.trim();
  const duration = document.getElementById("movieDuration").value.trim();
  const price = document.getElementById("moviePrice").value.trim();

  if (!title || !duration || !price)
    return showAdminMessage("Please fill all fields!", "error");

  fetch("/api/admin/add_movie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      genre: "Unknown",
      duration,
      price: parseInt(price),
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) showAdminMessage(data.error, "error");
      else {
        showAdminMessage(data.message, "success");
        document.getElementById("movieTitle").value = "";
        document.getElementById("movieDuration").value = "";
        document.getElementById("moviePrice").value = "";
      }
    })
    .catch(() => showAdminMessage("Error adding movie.", "error"));
}

function showAdminMessage(message, type) {
  const msgBox = document.getElementById("adminMsg");
  msgBox.textContent = message;
  msgBox.className = "message " + type;
  msgBox.style.display = "block";
}

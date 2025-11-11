function showTab(tabName) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

  event.target.classList.add("active");
  document.getElementById(tabName).classList.add("active");
}

function addMovie() {
  fetch("/api/admin/add_movie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: document.getElementById("movieTitle").value,
      duration: document.getElementById("movieDuration").value,
      price: document.getElementById("moviePrice").value,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      const msg = document.getElementById("adminMsg");
      msg.textContent = data.message;
      msg.className = "message success";
      msg.style.display = "block";
    });
}

/* ✅ ADD LOGOUT FUNCTION */
function logout() {
  fetch("/logout")
    .then(() => {
      window.location.href = "/login"; // redirect to login page
    });
}

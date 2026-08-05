"use strict";

const jobsheetTitles = [
  "Introduction to Mobile Application Development",
  "Development Environment Setup",
  "Project Structure and Application Lifecycle",
  "User Interface Layout Fundamentals",
  "Text, Button and Image Components",
  "Input Form and Validation",
  "Navigation Between Screens",
  "Recycler List and Dynamic Data",
  "Responsive Mobile Interface",
  "Application Theme and Styling",
  "Local Data Storage",
  "SQLite Database Integration",
  "REST API Fundamentals",
  "Fetching Data from an API",
  "JSON Data Processing",
  "User Authentication Interface",
  "Location and Map Integration",
  "Camera and Media Access",
  "Notifications and Alerts",
  "Error Handling and Debugging",
  "Application Testing",
  "Performance and Usability Review",
  "Application Build and Deployment",
  "Final Mobile Application Project"
];

const students = {
  aiman: "Aiman",
  haziq: "Syed Amzar Haziq"
};

const params = new URLSearchParams(window.location.search);
const student = students[params.get("student")] ? params.get("student") : "aiman";
const job = Math.min(24, Math.max(1, Number(params.get("job")) || 1));
const studentName = students[student];
const number = String(job).padStart(2, "0");

function progressKey() { return `mad-jobsheet-progress-${student}`; }
function detailKey() { return `mad-jobsheet-detail-${student}-${job}`; }

function getProgress() {
  try {
    const list = JSON.parse(localStorage.getItem(progressKey()) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function setProgress(list) {
  localStorage.setItem(progressKey(), JSON.stringify(list));
}

function isCompleted() {
  return getProgress().includes(job);
}

function getDetails() {
  try {
    return JSON.parse(localStorage.getItem(detailKey()) || "{}") || {};
  } catch {
    return {};
  }
}

function render() {
  const complete = isCompleted();
  const progress = getProgress().length;
  const percentage = Math.round((progress / 24) * 100);

  document.title = `Jobsheet ${number} - ${studentName}`;
  document.getElementById("viewerTitle").textContent = `Jobsheet ${number}`;
  document.getElementById("viewerSubtitle").textContent = `${jobsheetTitles[job - 1]} · ${studentName}`;
  document.getElementById("viewerNumber").textContent = number;
  document.getElementById("detailStudent").textContent = studentName;
  document.getElementById("detailModule").textContent = jobsheetTitles[job - 1];
  document.getElementById("detailJob").textContent = `Jobsheet ${number}`;
  document.getElementById("studentProgress").textContent = `${percentage}%`;
  document.getElementById("studentCompleted").textContent = progress;
  document.getElementById("studentPending").textContent = 24 - progress;
  document.getElementById("currentItemState").textContent = complete ? "COMPLETED" : "PENDING";

  const status = document.getElementById("viewerStatus");
  status.textContent = complete ? "COMPLETED" : "PENDING";
  status.classList.toggle("completed", complete);

  const button = document.getElementById("toggleComplete");
  button.textContent = complete ? "✓ COMPLETED — CLICK TO UNMARK" : "MARK COMPLETED";
  button.classList.toggle("completed", complete);
}

function initDetails() {
  const details = getDetails();
  const link = document.getElementById("submissionLink");
  const notes = document.getElementById("submissionNotes");
  link.value = details.link || "";
  notes.value = details.notes || "";

  document.getElementById("saveDraft").addEventListener("click", () => {
    localStorage.setItem(detailKey(), JSON.stringify({
      link: link.value.trim(),
      notes: notes.value.trim(),
      updatedAt: new Date().toISOString()
    }));
    const message = document.getElementById("saveMessage");
    message.textContent = "Submission details saved in this browser.";
    setTimeout(() => message.textContent = "", 3000);
  });

  document.getElementById("openSubmission").addEventListener("click", () => {
    const url = link.value.trim();
    if (!url) {
      document.getElementById("saveMessage").textContent = "Add a valid submission link first.";
      return;
    }
    try {
      const parsed = new URL(url);
      window.open(parsed.href, "_blank", "noopener");
    } catch {
      document.getElementById("saveMessage").textContent = "The submission link is not valid.";
    }
  });

  document.getElementById("fileInput").addEventListener("change", (event) => {
    const files = [...event.target.files];
    document.getElementById("selectedFiles").innerHTML = files.length
      ? files.map((file) => `• ${file.name} (${Math.ceil(file.size / 1024)} KB)`).join("<br>")
      : "No local files selected.";
  });
}

function initCompleteButton() {
  document.getElementById("toggleComplete").addEventListener("click", () => {
    const progress = getProgress();
    const updated = progress.includes(job) ? progress.filter((item) => item !== job) : [...progress, job];
    setProgress(updated);
    render();
  });
}

function applyInteractiveLights() {
  document.querySelectorAll(".interactive-light").forEach((element) => {
    element.addEventListener("mousemove", (event) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      element.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

function initCursorLight() {
  const light = document.getElementById("cursorLight");
  let targetX = innerWidth / 2;
  let targetY = innerHeight / 2;
  let x = targetX;
  let y = targetY;
  addEventListener("mousemove", (event) => { targetX = event.clientX; targetY = event.clientY; });
  function follow() {
    x += (targetX - x) * .11;
    y += (targetY - y) * .11;
    light.style.left = `${x}px`;
    light.style.top = `${y}px`;
    requestAnimationFrame(follow);
  }
  follow();
}

function initCanvas() {
  const canvas = document.getElementById("networkCanvas");
  const context = canvas.getContext("2d");
  let width, height, dots;
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    dots = Array.from({ length: Math.min(70, Math.max(30, Math.floor(width / 20))) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * .18,
      vy: (Math.random() - .5) * .18
    }));
  }
  function draw() {
    context.clearRect(0, 0, width, height);
    dots.forEach((dot) => {
      dot.x += dot.vx; dot.y += dot.vy;
      if (dot.x < 0 || dot.x > width) dot.vx *= -1;
      if (dot.y < 0 || dot.y > height) dot.vy *= -1;
      context.fillStyle = "rgba(72,230,255,.45)";
      context.fillRect(dot.x, dot.y, 1.5, 1.5);
    });
    requestAnimationFrame(draw);
  }
  resize(); draw(); addEventListener("resize", resize);
}

function initMusic() {
  const button = document.getElementById("musicButton");
  const audio = document.getElementById("bgMusic");
  const label = document.getElementById("musicLabel");
  audio.volume = .32;
  button.addEventListener("click", async () => {
    try {
      if (audio.paused) {
        await audio.play();
        button.classList.add("playing");
        label.textContent = "MUSIC ON";
      } else {
        audio.pause();
        button.classList.remove("playing");
        label.textContent = "MUSIC OFF";
      }
    } catch {
      label.textContent = "ADD MP3 FILE";
    }
  });
}

document.getElementById("backButton").addEventListener("click", () => {
  if (document.referrer.includes(location.host)) history.back();
  else location.href = "index.html#jobsheet";
});

render();
initDetails();
initCompleteButton();
applyInteractiveLights();
initCursorLight();
initCanvas();
initMusic();

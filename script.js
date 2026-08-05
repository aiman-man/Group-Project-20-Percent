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

const studentNames = {
  aiman: "Aiman",
  haziq: "Syed Amzar Haziq"
};

let activeStudent = "aiman";
let searchTerm = "";
let statusFilter = "all";

const grid = document.getElementById("jobsheetGrid");
const currentStudentName = document.getElementById("currentStudentName");
const completedCount = document.getElementById("completedCount");
const pendingCount = document.getElementById("pendingCount");
const progressPercent = document.getElementById("progressPercent");
const progressRing = document.getElementById("progressRing");

function storageKey(student) {
  return `mad-jobsheet-progress-${student}`;
}

function getProgress(student) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(student)) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function setProgress(student, list) {
  localStorage.setItem(storageKey(student), JSON.stringify(list));
}

function toggleJob(student, jobNumber) {
  const progress = getProgress(student);
  const exists = progress.includes(jobNumber);
  const updated = exists ? progress.filter((item) => item !== jobNumber) : [...progress, jobNumber];
  setProgress(student, updated);
  renderJobsheets();
  updateHeroAnalytics();
}

function renderJobsheets() {
  if (!grid) return;

  const completed = getProgress(activeStudent);
  const filtered = jobsheetTitles
    .map((title, index) => ({ title, number: index + 1, done: completed.includes(index + 1) }))
    .filter((job) => {
      const matchesText = `${job.number} ${job.title}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || (statusFilter === "completed" ? job.done : !job.done);
      return matchesText && matchesStatus;
    });

  grid.innerHTML = "";

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">No jobsheet matches the current search or filter.</div>';
  } else {
    filtered.forEach((job) => {
      const article = document.createElement("article");
      article.className = `job-card interactive-light${job.done ? " completed" : ""}`;
      const number = String(job.number).padStart(2, "0");
      article.innerHTML = `
        <div class="job-card-top">
          <span class="job-number">${number}</span>
          <span class="job-status">${job.done ? "COMPLETED" : "PENDING"}</span>
        </div>
        <h3>Jobsheet ${number}</h3>
        <p>${job.title}</p>
        <div class="job-card-actions">
          <a class="open-job" href="viewer.html?student=${activeStudent}&job=${job.number}">
            OPEN REVIEW PAGE <span>→</span>
          </a>
          <button class="mark-button" type="button" data-job="${job.number}">
            ${job.done ? "✓ COMPLETED — CLICK TO UNMARK" : "MARK COMPLETED"}
          </button>
        </div>
      `;
      grid.appendChild(article);
    });
  }

  grid.querySelectorAll(".mark-button").forEach((button) => {
    button.addEventListener("click", () => toggleJob(activeStudent, Number(button.dataset.job)));
  });

  applyInteractiveLights(grid);
  updateStudentProgress();
}

function updateStudentProgress() {
  const completed = getProgress(activeStudent).length;
  const percentage = Math.round((completed / 24) * 100);
  currentStudentName.textContent = studentNames[activeStudent];
  completedCount.textContent = completed;
  pendingCount.textContent = 24 - completed;
  progressPercent.textContent = `${percentage}%`;
  progressRing.style.setProperty("--progress", `${percentage * 3.6}deg`);
}

function updateHeroAnalytics() {
  const aiman = getProgress("aiman").length;
  const haziq = getProgress("haziq").length;
  const overall = Math.round(((aiman + haziq) / 48) * 100);
  document.getElementById("heroAiman").textContent = `${aiman} / 24`;
  document.getElementById("heroHaziq").textContent = `${haziq} / 24`;
  document.getElementById("heroOverall").textContent = `${overall}%`;
}

function applyInteractiveLights(root = document) {
  root.querySelectorAll(".interactive-light").forEach((element) => {
    if (element.dataset.lightReady === "true") return;
    element.dataset.lightReady = "true";
    element.addEventListener("mousemove", (event) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      element.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

function initStudentSwitcher() {
  document.querySelectorAll(".student-select").forEach((button) => {
    button.addEventListener("click", () => {
      activeStudent = button.dataset.student;
      document.querySelectorAll(".student-select").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderJobsheets();
      document.querySelector(".jobsheet-dashboard").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function initSearchAndFilter() {
  document.getElementById("jobSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim();
    renderJobsheets();
  });
  document.getElementById("statusFilter").addEventListener("change", (event) => {
    statusFilter = event.target.value;
    renderJobsheets();
  });
}

function initLoader() {
  const preloader = document.getElementById("preloader");
  const bar = document.getElementById("loaderBar");
  const percent = document.getElementById("loaderPercent");
  const status = document.getElementById("loaderStatus");
  const start = performance.now();
  const duration = 2200;

  function animate(now) {
    const elapsed = now - start;
    const value = Math.min(100, Math.round((elapsed / duration) * 100));
    bar.style.width = `${value}%`;
    percent.textContent = `${value}%`;

    if (value > 28 && value < 56) status.textContent = "SCANNING STUDENT RECORDS...";
    else if (value >= 56 && value < 82) status.textContent = "SYNCHRONISING 48 SUBMISSIONS...";
    else if (value >= 82) status.textContent = "REVIEW INTERFACE READY...";

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      preloader.classList.add("show-welcome");
      setTimeout(() => preloader.classList.add("hidden"), 800);
      setTimeout(() => preloader.remove(), 1500);
    }
  }
  requestAnimationFrame(animate);
}

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.13 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function initNavigation() {
  const header = document.getElementById("siteHeader");
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  const links = [...document.querySelectorAll(".nav-link")];
  const sections = [...document.querySelectorAll("main section[id]")];

  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.textContent = open ? "✕" : "☰";
  });

  links.forEach((link) => link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.textContent = "☰";
  }));

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
    let current = "home";
    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - 180) current = section.id;
    });
    links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${current}`));
  }, { passive: true });
}

function initCursorLight() {
  const light = document.getElementById("cursorLight");
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let x = targetX;
  let y = targetY;

  window.addEventListener("mousemove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
  });

  function follow() {
    x += (targetX - x) * 0.11;
    y += (targetY - y) * 0.11;
    light.style.left = `${x}px`;
    light.style.top = `${y}px`;
    requestAnimationFrame(follow);
  }
  follow();
}

function initTilt() {
  const panel = document.querySelector("[data-tilt]");
  if (!panel || window.matchMedia("(max-width: 760px)").matches) return;
  panel.addEventListener("mousemove", (event) => {
    const rect = panel.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    panel.style.transform = `perspective(1000px) rotateY(${x * 7}deg) rotateX(${y * -7}deg)`;
  });
  panel.addEventListener("mouseleave", () => panel.style.transform = "perspective(1000px) rotateY(0) rotateX(0)");
}

function initMusic() {
  const button = document.getElementById("musicButton");
  const audio = document.getElementById("bgMusic");
  const label = document.getElementById("musicLabel");
  audio.volume = 0.32;

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

function initCanvas() {
  const canvas = document.getElementById("networkCanvas");
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let nodes = [];

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(85, Math.max(34, Math.floor(width / 18)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      radius: Math.random() * 1.5 + 0.5
    }));
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      context.beginPath();
      context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      context.fillStyle = "rgba(72,230,255,.45)";
      context.fill();
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance < 115) {
          context.beginPath();
          context.moveTo(nodes[i].x, nodes[i].y);
          context.lineTo(nodes[j].x, nodes[j].y);
          context.strokeStyle = `rgba(72,230,255,${(1 - distance / 115) * 0.11})`;
          context.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

initLoader();
initNavigation();
initReveal();
initCursorLight();
initCanvas();
initTilt();
initMusic();
initStudentSwitcher();
initSearchAndFilter();
applyInteractiveLights();
renderJobsheets();
updateHeroAnalytics();

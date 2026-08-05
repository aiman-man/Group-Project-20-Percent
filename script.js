"use strict";

/* =========================
   SELECT ELEMENTS
========================= */

const cursorDot = document.querySelector(".cursor-dot");
const cursorOutline = document.querySelector(".cursor-outline");
const mouseGlow = document.querySelector(".mouse-glow");

const menuButton = document.getElementById("menuButton");
const navMenu = document.getElementById("navMenu");

const navLinks = document.querySelectorAll(".nav-link");
const clickableElements = document.querySelectorAll(
    "a, button, .feature-card, .resource-card"
);


/* =========================
   CUSTOM CURSOR
========================= */

let mouseX = 0;
let mouseY = 0;

let outlineX = 0;
let outlineY = 0;

document.addEventListener("mousemove", (event) => {

    mouseX = event.clientX;
    mouseY = event.clientY;

    if (cursorDot) {
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
    }

    if (mouseGlow) {
        mouseGlow.style.left = `${mouseX}px`;
        mouseGlow.style.top = `${mouseY}px`;
    }

});


function animateCursorOutline() {

    outlineX += (mouseX - outlineX) * 0.15;
    outlineY += (mouseY - outlineY) * 0.15;

    if (cursorOutline) {
        cursorOutline.style.left = `${outlineX}px`;
        cursorOutline.style.top = `${outlineY}px`;
    }

    requestAnimationFrame(animateCursorOutline);
}

animateCursorOutline();


clickableElements.forEach((element) => {

    element.addEventListener("mouseenter", () => {
        cursorOutline?.classList.add("hover");
    });

    element.addEventListener("mouseleave", () => {
        cursorOutline?.classList.remove("hover");
    });

});


/* =========================
   CREATE PARTICLES
========================= */

const particlesContainer = document.getElementById("particles");

function createParticles(totalParticles = 45) {

    if (!particlesContainer) {
        return;
    }

    for (let index = 0; index < totalParticles; index++) {

        const particle = document.createElement("span");

        particle.classList.add("particle");

        const randomLeft = Math.random() * 100;
        const randomSize = Math.random() * 4 + 2;
        const randomDuration = Math.random() * 12 + 10;
        const randomDelay = Math.random() * 10;

        particle.style.left = `${randomLeft}%`;
        particle.style.width = `${randomSize}px`;
        particle.style.height = `${randomSize}px`;

        particle.style.animationDuration = `${randomDuration}s`;
        particle.style.animationDelay = `-${randomDelay}s`;

        particle.style.opacity = Math.random() * 0.8 + 0.2;

        particlesContainer.appendChild(particle);

    }

}

createParticles();


/* =========================
   MOBILE NAVIGATION
========================= */

menuButton.addEventListener("click", () => {

    navMenu.classList.toggle("open");

    const icon = menuButton.querySelector("i");

    if (navMenu.classList.contains("open")) {

        icon.classList.remove("fa-bars");
        icon.classList.add("fa-xmark");

    } else {

        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");

    }

});


navLinks.forEach((link) => {

    link.addEventListener("click", () => {

        navMenu.classList.remove("open");

        const icon = menuButton.querySelector("i");

        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");

    });

});


/* =========================
   SCROLL REVEAL ANIMATION
========================= */

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

                revealObserver.unobserve(entry.target);

            }

        });

    },
    {
        threshold: 0.15
    }
);

revealElements.forEach((element, index) => {

    element.style.transitionDelay = `${index % 4 * 0.1}s`;

    revealObserver.observe(element);

});


/* =========================
   ACTIVE NAVIGATION LINK
========================= */

const sections = document.querySelectorAll("section[id]");

window.addEventListener("scroll", () => {

    let currentSection = "";

    sections.forEach((section) => {

        const sectionTop = section.offsetTop - 130;
        const sectionHeight = section.offsetHeight;

        if (
            window.scrollY >= sectionTop &&
            window.scrollY < sectionTop + sectionHeight
        ) {
            currentSection = section.getAttribute("id");
        }

    });

    navLinks.forEach((link) => {

        link.classList.remove("active");

        if (
            link.getAttribute("href") === `#${currentSection}`
        ) {
            link.classList.add("active");
        }

    });

});


/* =========================
   PARALLAX HERO EFFECT
========================= */

const diagramCard = document.querySelector(".diagram-card");

document.addEventListener("mousemove", (event) => {

    if (!diagramCard || window.innerWidth <= 760) {
        return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const rotateY =
        ((event.clientX - centerX) / centerX) * 5;

    const rotateX =
        ((centerY - event.clientY) / centerY) * 4;

    diagramCard.style.transform = `
        rotateY(${rotateY - 5}deg)
        rotateX(${rotateX + 2}deg)
    `;

});


document.addEventListener("mouseleave", () => {

    if (!diagramCard) {
        return;
    }

    diagramCard.style.transform =
        "rotateY(-7deg) rotateX(3deg)";

});


/* =========================
   BUTTON RIPPLE EFFECT
========================= */

const buttons = document.querySelectorAll(
    ".primary-button, .secondary-button, .nav-button, .outline-button"
);

buttons.forEach((button) => {

    button.addEventListener("click", function (event) {

        const ripple = document.createElement("span");

        const buttonRectangle =
            this.getBoundingClientRect();

        const rippleSize =
            Math.max(
                buttonRectangle.width,
                buttonRectangle.height
            );

        ripple.style.position = "absolute";
        ripple.style.width = `${rippleSize}px`;
        ripple.style.height = `${rippleSize}px`;
        ripple.style.borderRadius = "50%";

        ripple.style.left =
            `${event.clientX - buttonRectangle.left - rippleSize / 2}px`;

        ripple.style.top =
            `${event.clientY - buttonRectangle.top - rippleSize / 2}px`;

        ripple.style.background =
            "rgba(255, 255, 255, 0.25)";

        ripple.style.transform = "scale(0)";
        ripple.style.opacity = "1";
        ripple.style.pointerEvents = "none";

        ripple.style.animation =
            "rippleAnimation 0.6s ease-out";

        this.style.position = "relative";
        this.style.overflow = "hidden";

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);

    });

});


/* Add ripple animation through JavaScript */

const rippleStyle = document.createElement("style");

rippleStyle.textContent = `

    @keyframes rippleAnimation {

        to {
            transform: scale(2.5);
            opacity: 0;
        }

    }

`;

document.head.appendChild(rippleStyle);
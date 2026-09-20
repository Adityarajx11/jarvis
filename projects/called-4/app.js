/* ---------- Preloader ---------- */
window.addEventListener('load', () => {
    const progress = document.querySelector('.loader .progress');
    let percent = 0;
    const interval = setInterval(() => {
        percent += 10;
        progress.style.width = percent + '%';
        if (percent >= 100) {
            clearInterval(interval);
            document.getElementById('preloader').style.opacity = '0';
            setTimeout(() => document.getElementById('preloader').remove(), 600);
        }
    }, 150);
});

/* ---------- Navbar Toggle (mobile) ---------- */
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

/* ---------- Three.js Hero ---------- */
(function () {
    if (!window.THREE) return;
    const canvas = document.getElementById('hero-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // Simple rotating torus knot
    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 150, 20);
    const material = new THREE.MeshStandardMaterial({ color: 0x00f7ff, emissive: 0x004466 });
    const knot = new THREE.Mesh(geometry, material);
    scene.add(knot);

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    const ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);

    // Mouse interaction
    const mouse = new THREE.Vector2();
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        knot.rotation.x += 0.005;
        knot.rotation.y += 0.01;
        // subtle mouse‑based rotation
        knot.rotation.x += mouse.y * 0.001;
        knot.rotation.y += mouse.x * 0.001;
        renderer.render(scene, camera);
    }
    animate();

    // Resize handling
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
})();

/* ---------- Scroll Reveal ---------- */
const revealElements = document.querySelectorAll('.section, .price-card, .feature-item, .stat-item, .gallery-item, .testimonial');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

revealElements.forEach(el => revealObserver.observe(el));

/* Add simple fade-in via CSS */
const style = document.createElement('style');
style.textContent = `
.revealed { opacity: 1; transform: translateY(0); transition: opacity .6s ease, transform .6s ease; }
.section, .price-card, .feature-item, .stat-item, .gallery-item, .testimonial { opacity: 0; transform: translateY(30px); }
`;
document.head.appendChild(style);

/* ---------- Animated Counters ---------- */
const counters = document.querySelectorAll('.counter');
counters.forEach(counter => {
    const target = +counter.getAttribute('data-target');
    const isFloat = target % 1 !== 0;
    const increment = target / 200; // speed
    let current = 0;
    const update = () => {
        current += increment;
        if ((isFloat && current >= target) || (!isFloat && Math.round(current) >= target)) {
            counter.textContent = isFloat ? target.toFixed(1) : target;
        } else {
            counter.textContent = isFloat ? current.toFixed(1) : Math.round(current);
            requestAnimationFrame(update);
        }
    };
    update();
});

/* ---------- Lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.querySelector('.lightbox-content');
document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.style.display = 'flex';
    });
});
lightbox.querySelector('.close').addEventListener('click', () => {
    lightbox.style.display = 'none';
});
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.style.display = 'none';
});

/* ---------- Testimonials Slider ---------- */
(function () {
    const slides = document.querySelectorAll('.testimonial');
    let idx = 0;
    const showSlide = (i) => {
        slides.forEach(s => s.classList.remove('active'));
        slides[i].classList.add('active');
    };
    showSlide(idx);
    setInterval(() => {
        idx = (idx + 1) % slides.length;
        showSlide(idx);
    }, 5000);
})();

/* ---------- Contact Form ---------- */
document.getElementById('contact-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const msg = this.querySelector('.form-message');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 4000);
    this.reset();
});
/* ---------- Preloader ---------- */
document.addEventListener('DOMContentLoaded', () => {
    const progress = document.querySelector('.progress');
    let loaded = 0;
    const total = 100;
    const interval = setInterval(() => {
        loaded += Math.random() * 10;
        if (loaded >= total) {
            loaded = total;
            clearInterval(interval);
            document.getElementById('preloader').classList.add('hidden');
        }
        progress.style.width = `${loaded}%`;
    }, 100);
});

/* ---------- Scroll Reveal ---------- */
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
revealElements.forEach(el => revealObserver.observe(el));

/* ---------- Counter Animation ---------- */
const counters = document.querySelectorAll('.counter');
counters.forEach(counter => {
    const target = +counter.getAttribute('data-target');
    const duration = 2000;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(progress * target);
        counter.textContent = target % 1 === 0 ? value : (progress * target).toFixed(1);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
});

/* ---------- Gallery Lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.querySelector('.lightbox-img');
document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.remove('hidden');
    });
});
lightbox.querySelector('.close').addEventListener('click', () => {
    lightbox.classList.add('hidden');
});
lightbox.addEventListener('click', e => {
    if (e.target === lightbox) lightbox.classList.add('hidden');
});

/* ---------- Testimonials Slider ---------- */
let testimonialIndex = 0;
const testimonials = document.querySelectorAll('.testimonial');
function showTestimonial(i) {
    testimonials.forEach((t, idx) => t.classList.toggle('active', idx === i));
}
function nextTestimonial() {
    testimonialIndex = (testimonialIndex + 1) % testimonials.length;
    showTestimonial(testimonialIndex);
}
setInterval(nextTestimonial, 5000);
showTestimonial(0);

/* ---------- Contact Form ---------- */
document.getElementById('contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const msg = document.getElementById('form-message');
    msg.textContent = 'Thank you! We’ll be in touch shortly.';
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 4000);
    e.target.reset();
});

/* ---------- Three.js Hero ---------- */
if (!window.THREE) {
    console.warn('Three.js not loaded');
} else {
    const canvas = document.getElementById('hero-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // Simple rotating torus knot
    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 150, 20);
    const material = new THREE.MeshStandardMaterial({ color: 0x00faff, metalness: 0.6, roughness: 0.4 });
    const knot = new THREE.Mesh(geometry, material);
    scene.add(knot);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    // Mouse interaction
    const mouse = new THREE.Vector2();
    window.addEventListener('mousemove', e => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        knot.rotation.x += 0.01;
        knot.rotation.y += 0.01;
        // subtle mouse influence
        knot.rotation.y += mouse.x * 0.001;
        knot.rotation.x += mouse.y * 0.001;
        renderer.render(scene, camera);
    }
    animate();

    // Resize handling
    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    });
}
/* ==== Preloader ==== */
document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.querySelector('#preloader .progress');
    let progress = 0;
    const interval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 20, 100);
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            document.getElementById('preloader').classList.add('hidden');
        }
    }, 150);
});

/* ==== Smooth Scroll for Nav Links ==== */
document.querySelectorAll('.navbar a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        target.scrollIntoView({ behavior: 'smooth' });
    });
});

/* ==== Three.js Hero ==== */
(() => {
    if (!window.THREE) return;
    const canvas = document.getElementById('hero-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 4;

    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 150, 20);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00bfff,
        emissive: 0x001a33,
        metalness: 0.6,
        roughness: 0.4
    });
    const knot = new THREE.Mesh(geometry, material);
    scene.add(knot);

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(5,5,5);
    scene.add(light);
    const ambient = new THREE.AmbientLight(0x222222);
    scene.add(ambient);

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', e => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        knot.rotation.x += 0.005 + mouseY * 0.02;
        knot.rotation.y += 0.01 + mouseX * 0.02;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
})();

/* ==== Scroll Reveal ==== */
const revealElements = document.querySelectorAll('.section, .feature, .plan, .counter-item, .gallery-item, .testimonial');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
revealElements.forEach(el => el.classList.add('reveal'));
revealElements.forEach(el => observer.observe(el));

/* ==== Counter Animation ==== */
const counters = document.querySelectorAll('.counter-number');
counters.forEach(counter => {
    const updateCount = () => {
        const target = +counter.dataset.target;
        const current = +counter.innerText.replace('%','');
        const increment = target / 200;
        if (current < target) {
            counter.innerText = (Math.ceil(current + increment)).toString() + (target % 1 ? '' : (target===99.9?'%':''));
            setTimeout(updateCount, 15);
        } else {
            counter.innerText = target + (target===99.9?'%':'');
        }
    };
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            updateCount();
            observer.unobserve(counter);
        }
    }, { threshold: 0.6 });
    observer.observe(counter);
});

/* ==== Gallery Lightbox ==== */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.querySelector('.lightbox-img');
document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.remove('hidden');
    });
});
document.querySelector('.lightbox .close').addEventListener('click', () => {
    lightbox.classList.add('hidden');
});
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.add('hidden');
});

/* ==== Testimonials Slider ==== */
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

/* ==== Contact Form ==== */
const form = document.getElementById('contact-form');
const successMsg = document.getElementById('form-success');
form.addEventListener('submit', e => {
    e.preventDefault();
    // Simulate async send
    setTimeout(() => {
        form.reset();
        successMsg.classList.remove('hidden');
        setTimeout(() => successMsg.classList.add('hidden'), 4000);
    }, 500);
});

/* ==== CTA Button Scroll ==== */
document.getElementById('cta-start').addEventListener('click', () => {
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
});
/* ==== Preloader ==== */
document.addEventListener('DOMContentLoaded', () => {
    const pre = document.getElementById('preloader');
    setTimeout(() => pre.classList.add('hidden'), 500); // quick fade
});
setTimeout(() => {
    const pre = document.getElementById('preloader');
    if (pre) pre.classList.add('hidden');
}, 3500);

/* ==== Smooth Scroll for Nav ==== */
document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        target.scrollIntoView({ behavior: 'smooth' });
    });
});

/* ==== Scroll Reveal ==== */
const revealEls = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
revealEls.forEach(el => revealObserver.observe(el));

/* ==== Animated Counters ==== */
const counterEls = document.querySelectorAll('.counter');
const counterObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = +el.dataset.target;
            let current = 0;
            const inc = target / 120;
            const update = () => {
                current += inc;
                if (current >= target) {
                    el.textContent = target;
                } else {
                    el.textContent = Math.floor(current);
                    requestAnimationFrame(update);
                }
            };
            update();
            obs.unobserve(el);
        }
    });
}, { threshold: 0.5 });
counterEls.forEach(el => counterObserver.observe(el));

/* ==== Gallery Lightbox (hardened: never opens empty, always closable) ==== */
(function () {
    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');
    if (!lightbox || !lbImg) return;
    lbImg.addEventListener('error', () => { lbImg.style.display = 'none'; });
    const open = src => {
        if (!src) return;
        lbImg.style.display = '';
        lbImg.setAttribute('src', src);
        lightbox.classList.remove('hidden');
    };
    document.querySelectorAll('.gallery-item img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => open(img.getAttribute('src')));
    });
    if (closeBtn) closeBtn.addEventListener('click', () => lightbox.classList.add('hidden'));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.add('hidden'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.classList.add('hidden'); });
})();

/* ==== Testimonials Slider ==== */
let testimonialIdx = 0;
const testimonials = document.querySelectorAll('.testimonial');
setInterval(() => {
    testimonials[testimonialIdx].classList.remove('active');
    testimonialIdx = (testimonialIdx + 1) % testimonials.length;
    testimonials[testimonialIdx].classList.add('active');
}, 4000);

/* ==== Signup Form ==== */
document.getElementById('signupForm').addEventListener('submit', e => {
    e.preventDefault();
    document.getElementById('signupMessage').classList.remove('hidden');
    e.target.reset();
});

/* ==== Cart Logic ==== */
let cart = [];
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCount = document.getElementById('cartCount');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutMsg = document.getElementById('checkoutMessage');

function updateCartUI() {
    cartItemsEl.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
            <span>${item.name} (${item.color}, Size ${item.size}) x ${item.qty}</span>
            <span>$${(item.price * item.qty).toFixed(2)}</span>
        `;
        cartItemsEl.appendChild(li);
        total += item.price * item.qty;
    });
    cartTotalEl.textContent = `$${total.toFixed(2)}`;
    cartCount.textContent = cart.reduce((a, i) => a + i.qty, 0);
}
cartBtn.addEventListener('click', () => cartDrawer.classList.add('open'));
closeCartBtn.addEventListener('click', () => cartDrawer.classList.remove('open'));

checkoutBtn.addEventListener('click', () => {
    cart = [];
    updateCartUI();
    checkoutMsg.classList.remove('hidden');
    setTimeout(() => {
        checkoutMsg.classList.add('hidden');
        cartDrawer.classList.remove('open');
    }, 2500);
});

/* ==== Configurator ==== */
let selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
let selectedSize = document.getElementById('sizeSelect').value;
document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = btn.dataset.color;
        document.documentElement.style.setProperty('--accent', selectedColor);
        if (shoeMaterial) shoeMaterial.color.set(selectedColor);
    });
});
document.getElementById('sizeSelect').addEventListener('change', e => {
    selectedSize = e.target.value;
});

/* ==== Add to Cart ==== */
document.getElementById('addToCartBtn').addEventListener('click', () => {
    const existing = cart.find(i => i.color === selectedColor && i.size === selectedSize);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            name: 'Air Surge',
            color: selectedColor,
            size: selectedSize,
            qty: 1,
            price: 199.99
        });
    }
    updateCartUI();
});

/* ==== Three.js 3D Hero ==== */
let shoeMaterial;
function initThree() {
    if (!window.THREE) return;
    const canvas = document.getElementById('heroCanvas');
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 450;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setSize(width, height);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 100);
    camera.position.set(0,1,3);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5,5,5);
    scene.add(light);
    const geometry = new THREE.BoxGeometry(1,0.5,2);
    shoeMaterial = new THREE.MeshStandardMaterial({ color: selectedColor });
    const shoe = new THREE.Mesh(geometry, shoeMaterial);
    scene.add(shoe);
    // Mouse reactive rotation
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', e => {
        mouseX = (e.clientX / window.innerWidth) - 0.5;
        mouseY = (e.clientY / window.innerHeight) - 0.5;
    });
    function animate() {
        requestAnimationFrame(animate);
        shoe.rotation.y = mouseX * Math.PI;
        shoe.rotation.x = mouseY * Math.PI * 0.5;
        renderer.render(scene, camera);
    }
    animate();
}
window.addEventListener('load', initThree);
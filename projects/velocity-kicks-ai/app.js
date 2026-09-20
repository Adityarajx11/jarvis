/* ---------- Preloader ---------- */
window.addEventListener('load', () => {
    const progress = document.querySelector('.progress');
    progress.style.width = '100%';
    setTimeout(() => {
        document.getElementById('preloader').classList.add('hidden');
    }, 500);
});

/* ---------- Scroll Reveal ---------- */
const revealElements = document.querySelectorAll('.section');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('reveal', 'active');
    });
}, { threshold: 0.1 });
revealElements.forEach(el => observer.observe(el));

/* ---------- Counter Animation ---------- */
const counters = document.querySelectorAll('.counter');
counters.forEach(counter => {
    const target = +counter.dataset.target;
    const duration = 2000;
    let start = 0;
    const step = target / (duration / 16);
    const update = () => {
        start += step;
        if (start < target) {
            counter.textContent = Math.floor(start);
            requestAnimationFrame(update);
        } else {
            counter.textContent = target;
        }
    };
    update();
});

/* ---------- Lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('img');
document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.remove('hidden');
    });
});
document.getElementById('closeLightboxBtn').addEventListener('click', () => {
    lightbox.classList.add('hidden');
});

/* ---------- Testimonials Slider ---------- */
let testimonialIndex = 0;
const testimonials = document.querySelectorAll('.testimonial');
const rotateTestimonials = () => {
    testimonials.forEach((t,i)=> t.classList.toggle('active', i===testimonialIndex));
    testimonialIndex = (testimonialIndex + 1) % testimonials.length;
};
setInterval(rotateTestimonials, 5000);
rotateTestimonials();

/* ---------- Signup Form ---------- */
document.getElementById('signupForm').addEventListener('submit', e => {
    e.preventDefault();
    document.getElementById('signupMessage').classList.remove('hidden');
    e.target.reset();
});

/* ---------- Cart Logic ---------- */
let cart = [];
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const checkoutMessage = document.getElementById('checkoutMessage');

const openCart = () => { cartDrawer.classList.add('open'); };
const closeCart = () => { cartDrawer.classList.remove('open'); };
cartBtn.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);

const updateCartUI = () => {
    cartItemsEl.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} - ${item.colorName} - Size ${item.size} x${item.qty}`;
        cartItemsEl.appendChild(li);
        total += item.price * item.qty;
    });
    cartTotalEl.textContent = total.toFixed(2);
    cartCountEl.textContent = cart.reduce((a,b)=>a+b.qty,0);
};

const addToCart = (colorHex, colorName) => {
    const size = document.getElementById('sizeSelect').value;
    const existing = cart.find(i=>i.colorHex===colorHex && i.size===size);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            name: 'Air Surge',
            colorHex,
            colorName,
            size,
            qty:1,
            price:199.00
        });
    }
    updateCartUI();
};

document.getElementById('addToCartHeroBtn').addEventListener('click', () => {
    const activeSwatch = document.querySelector('.swatch.active');
    const color = activeSwatch ? activeSwatch.dataset.color : '#ff6600';
    const name = activeSwatch ? activeSwatch.style.backgroundColor : 'Neon Orange';
    addToCart(color, name);
});

document.getElementById('addToCartConfigBtn').addEventListener('click', () => {
    const activeSwatch = document.querySelector('.swatch.active');
    const color = activeSwatch ? activeSwatch.dataset.color : '#ff6600';
    const name = activeSwatch ? activeSwatch.style.backgroundColor : 'Neon Orange';
    addToCart(color, name);
});

checkoutBtn.addEventListener('click', () => {
    cart = [];
    updateCartUI();
    checkoutMessage.classList.remove('hidden');
    setTimeout(()=> checkoutMessage.classList.add('hidden'), 3000);
});

/* ---------- Color Configurator ---------- */
let currentColor = '#ff6600';
const swatches = document.querySelectorAll('.swatch');
swatches.forEach(s => {
    s.addEventListener('click', () => {
        swatches.forEach(a=>a.classList.remove('active'));
        s.classList.add('active');
        currentColor = s.dataset.color;
        document.documentElement.style.setProperty('--accent-color', currentColor);
        update3DColor();
    });
});
/* Set default active */
document.querySelector('.swatch[data-color="#ff6600"]').classList.add('active');

/* ---------- 3D Hero ---------- */
if (!window.THREE) {
    console.error('Three.js not loaded');
} else {
    const canvas = document.getElementById('heroCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0,1,3);
    scene.add(camera);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5,5,5);
    scene.add(light);
    const ambient = new THREE.AmbientLight(0x404040,0.5);
    scene.add(ambient);

    // Simple shoe placeholder: a rounded box
    const geometry = new THREE.BoxGeometry(1,0.5,2);
    const material = new THREE.MeshStandardMaterial({ color: currentColor, metalness:0.3, roughness:0.4 });
    const shoe = new THREE.Mesh(geometry, material);
    shoe.castShadow = true;
    scene.add(shoe);

    const controls = {
        mouseX:0,
        mouseY:0
    };
    document.addEventListener('mousemove', e => {
        controls.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        controls.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    const update3DColor = () => {
        material.color.set(currentColor);
    };

    const animate = () => {
        requestAnimationFrame(animate);
        shoe.rotation.y += 0.005;
        shoe.rotation.x = controls.mouseY * 0.2;
        shoe.rotation.z = controls.mouseX * 0.2;
        renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    window.addEventListener('resize', () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w/h;
        camera.updateProjectionMatrix();
    });
}

/* ---------- Open Configurator from Hero ---------- */
document.getElementById('openConfiguratorBtn').addEventListener('click', () => {
    document.getElementById('configurator').scrollIntoView({behavior:'smooth'});
});
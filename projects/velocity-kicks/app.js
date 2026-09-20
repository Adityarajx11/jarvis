/* ---------- Preloader ---------- */
document.addEventListener('DOMContentLoaded', () => {
    const progress = document.querySelector('.progress');
    let load = 0;
    const interval = setInterval(() => {
        load += Math.random() * 20;
        if (load >= 100) {
            load = 100;
            clearInterval(interval);
            document.getElementById('preloader').classList.add('hidden');
        }
        progress.style.width = load + '%';
    }, 150);
});

/* ---------- Sticky Nav & Smooth Scroll ---------- */
document.querySelectorAll('#nav a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        target.scrollIntoView({behavior:'smooth'});
    });
});

/* ---------- 3D Hero ---------- */
(function(){
    if (!window.THREE) return;
    const canvasContainer = document.getElementById('hero-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    canvasContainer.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1,2,0.5);
    const material = new THREE.MeshStandardMaterial({color:0x111111});
    const shoe = new THREE.Mesh(geometry, material);
    scene.add(shoe);

    const light = new THREE.DirectionalLight(0xffffff,1);
    light.position.set(5,5,5);
    scene.add(light);
    const ambient = new THREE.AmbientLight(0x404040,0.8);
    scene.add(ambient);

    camera.position.z = 3;

    function animate(){
        requestAnimationFrame(animate);
        shoe.rotation.y += 0.01;
        shoe.rotation.x = Math.sin(Date.now()*0.001)*0.2;
        renderer.render(scene, camera);
    }
    animate();

    // Color configurator integration
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(btn=>{
        btn.addEventListener('click',()=>{
            const col = btn.dataset.color;
            material.color.set(col);
            document.documentElement.style.setProperty('--accent', col);
        });
    });
})();

/* ---------- Scroll Reveal ---------- */
const reveals = document.querySelectorAll('.section');
const observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
},{threshold:0.2});
reveals.forEach(sec=>observer.observe(sec));

/* ---------- Counter Animation ---------- */
const counters = document.querySelectorAll('.counter');
counters.forEach(counter=>{
    const target = +counter.dataset.target;
    const increment = target/200;
    let current = 0;
    const update = () => {
        current += increment;
        if(current >= target){
            counter.textContent = target;
        }else{
            counter.textContent = Math.floor(current);
            requestAnimationFrame(update);
        }
    };
    update();
});

/* ---------- Gallery Lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lbContent = lightbox.querySelector('.lb-content');
document.querySelectorAll('.gallery-item').forEach(item=>{
    item.addEventListener('click',()=>{
        const idx = item.dataset.index;
        // Simple placeholder SVG based on index
        const svgs = [
            `<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="${getComputedStyle(document.documentElement).getPropertyValue('--accent')}"/></svg>`,
            `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="${getComputedStyle(document.documentElement).getPropertyValue('--accent')}"/></svg>`,
            `<svg viewBox="0 0 200 200"><polygon points="100,10 190,190 10,190" fill="${getComputedStyle(document.documentElement).getPropertyValue('--accent')}"/></svg>`
        ];
        lbContent.innerHTML = svgs[idx] + '<span id="lb-close">&times;</span>';
        lightbox.classList.remove('hidden');
    });
});
lightbox.addEventListener('click', e=>{
    if(e.target.id === 'lb-close' || e.target === lightbox){
        lightbox.classList.add('hidden');
    }
});

/* ---------- Testimonials Slider ---------- */
let slideIndex = 0;
const slides = document.querySelectorAll('.slide');
function showSlide(i){
    slides.forEach(s=>s.classList.remove('active'));
    slides[i].classList.add('active');
}
document.getElementById('prev-slide').addEventListener('click',()=>{
    slideIndex = (slideIndex-1+slides.length)%slides.length;
    showSlide(slideIndex);
});
document.getElementById('next-slide').addEventListener('click',()=>{
    slideIndex = (slideIndex+1)%slides.length;
    showSlide(slideIndex);
});
// Auto rotate
setInterval(()=>{
    slideIndex = (slideIndex+1)%slides.length;
    showSlide(slideIndex);
},5000);

/* ---------- Signup Form ---------- */
document.getElementById('signup-form').addEventListener('submit', e=>{
    e.preventDefault();
    document.getElementById('signup-msg').classList.remove('hidden');
    e.target.reset();
});

/* ---------- Cart Functionality ---------- */
const cart = [];
const cartToggle = document.getElementById('cart-toggle');
const cartDrawer = document.getElementById('cart-drawer');
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const closeCartBtn = document.getElementById('close-cart');
const checkoutMsg = document.getElementById('checkout-msg');

function updateCartUI(){
    cartItems.innerHTML = '';
    let total = 0;
    cart.forEach((item,i)=>{
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name} (${item.color}) - Size ${item.size}</span>
                        <span>$${item.price} x ${item.qty}
                        <button data-index="${i}" class="remove-item">✕</button></span>`;
        cartItems.appendChild(li);
        total += item.price * item.qty;
    });
    cartTotal.textContent = total.toFixed(2);
    cartCount.textContent = cart.reduce((a,b)=>a+b.qty,0);
}
document.getElementById('add-to-cart').addEventListener('click',()=>{
    const selectedColor = document.querySelector('.color-swatch.active')?.dataset.color || document.querySelector('.color-swatch').dataset.color;
    const size = document.getElementById('size-select').value;
    const colorName = {
        '#111111':'Midnight Black',
        '#ff6600':'Neon Orange',
        '#00aaff':'Electric Blue'
    }[selectedColor]||'Custom';
    const existing = cart.find(i=>i.color===colorName && i.size===size);
    if(existing){
        existing.qty++;
    }else{
        cart.push({name:'Air Surge',color:colorName,size,price:199,qty:1});
    }
    updateCartUI();
    cartDrawer.classList.add('open');
});
cartToggle.addEventListener('click',()=>cartDrawer.classList.toggle('open'));
closeCartBtn.addEventListener('click',()=>cartDrawer.classList.remove('open'));
cartItems.addEventListener('click', e=>{
    if(e.target.classList.contains('remove-item')){
        const idx = e.target.dataset.index;
        cart.splice(idx,1);
        updateCartUI();
    }
});
checkoutBtn.addEventListener('click',()=>{
    if(cart.length===0)return;
    cart.length=0;
    updateCartUI();
    checkoutMsg.classList.remove('hidden');
    setTimeout(()=>{checkoutMsg.classList.add('hidden');cartDrawer.classList.remove('open');},2000);
});

/* ---------- Color Swatch Active State ---------- */
document.querySelectorAll('.color-swatch').forEach(btn=>{
    btn.addEventListener('click',()=>{
        document.querySelectorAll('.color-swatch').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
    });
});
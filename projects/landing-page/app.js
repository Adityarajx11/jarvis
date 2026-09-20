/* ---------- Preloader ---------- */
document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.querySelector('.progress');
    let progress = 0;
    const interval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 20, 100);
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            document.getElementById('preloader').style.opacity = '0';
            setTimeout(() => document.getElementById('preloader').remove(), 600);
        }
    }, 200);
});

/* ---------- Smooth Scroll ---------- */
document.querySelectorAll('#navbar a').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'smooth'});
    });
});

/* ---------- Scroll Reveal ---------- */
const revealElements = document.querySelectorAll('.section');
const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
        }
    });
}, {threshold:0.1});
revealElements.forEach(el => revealObserver.observe(el));

/* ---------- Counter Animation ---------- */
const counters = document.querySelectorAll('.counter');
counters.forEach(counter => {
    const target = +counter.dataset.target;
    const duration = 2000;
    let start = null;
    const step = timestamp => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const value = Math.min(Math.ceil((progress / duration) * target), target);
        counter.textContent = value;
        if (value < target) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
});

/* ---------- Lightbox Gallery ---------- */
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.innerHTML = '<img src="" alt="Enlarged">';
document.body.appendChild(lightbox);
document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
        lightbox.querySelector('img').src = img.src;
        lightbox.classList.add('active');
    });
});
lightbox.addEventListener('click', () => lightbox.classList.remove('active'));

/* ---------- Testimonials Slider ---------- */
let testimonialIndex = 0;
const testimonials = document.querySelectorAll('.testimonial');
setInterval(() => {
    testimonials[testimonialIndex].classList.remove('active');
    testimonialIndex = (testimonialIndex + 1) % testimonials.length;
    testimonials[testimonialIndex].classList.add('active');
}, 4000);

/* ---------- Contact Form ---------- */
document.getElementById('contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = document.getElementById('formMessage');
    msg.textContent = 'Thank you! Your message has been sent.';
    setTimeout(() => msg.textContent = '', 4000);
    e.target.reset();
});

/* ---------- 3D Hero (Jarvis Core) ---------- */
if (window.THREE) {
    const canvas = document.getElementById('hero-canvas');
    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0,0,5);
    scene.add(camera);

    // Light
    const ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);
    const point = new THREE.PointLight(0x0ff, 1, 100);
    point.position.set(5,5,5);
    scene.add(point);

    // Sphere (wireframe)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({color:0x00ffff, wireframe:true});
    const sphere = new THREE.Mesh(geometry, wireMat);
    scene.add(sphere);

    // Particle glow (simple Points)
    const particles = new THREE.Points(
        new THREE.SphereGeometry(1.02, 16, 16),
        new THREE.PointsMaterial({color:0x00ffff, size:0.02, transparent:true, opacity:0.7})
    );
    scene.add(particles);

    // HUD Ring Segments
    const hudRing = document.getElementById('hud-ring');
    const segmentCount = 12;
    for (let i=0;i<segmentCount;i++) {
        const seg = document.createElement('div');
        seg.className = 'segment';
        const angle = (i/segmentCount)*360;
        seg.style.transform = `rotate(${angle}deg) translateY(-110px)`;
        hudRing.appendChild(seg);
    }

    // Mouse drag orbit controls (simple)
    let isDragging = false, previousMouse = {x:0,y:0};
    const onMouseDown = e => {isDragging=true; previousMouse={x:e.clientX,y:e.clientY};};
    const onMouseMove = e => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousMouse.x;
        const deltaY = e.clientY - previousMouse.y;
        previousMouse={x:e.clientX,y:e.clientY};
        const rotSpeed = 0.005;
        sphere.rotation.y += deltaX * rotSpeed;
        sphere.rotation.x += deltaY * rotSpeed;
    };
    const onMouseUp = () => {isDragging=false;};
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart', e=>{isDragging=true; previousMouse={x:e.touches[0].clientX,y:e.touches[0].clientY};});
    canvas.addEventListener('touchmove', e=>{if(!isDragging)return; const deltaX = e.touches[0].clientX - previousMouse.x; const deltaY = e.touches[0].clientY - previousMouse.y; previousMouse={x:e.touches[0].clientX,y:e.touches[0].clientY}; const rotSpeed = 0.005; sphere.rotation.y += deltaX * rotSpeed; sphere.rotation.x += deltaY * rotSpeed;});
    canvas.addEventListener('touchend', ()=>{isDragging=false;});

    // Activate button pulse
    const activateBtn = document.getElementById('activateBtn');
    let pulse = false;
    activateBtn.addEventListener('click', () => {
        pulse = true;
        // Light up HUD segments sequentially
        const segs = document.querySelectorAll('.segment');
        segs.forEach((s,i)=>setTimeout(()=>s.style.opacity='1', i*100));
        setTimeout(()=>segs.forEach(s=>s.style.opacity='0'), 1500);
    });

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        // Auto-rotate
        sphere.rotation.y += 0.2 * delta;
        particles.rotation.y += 0.4 * delta;

        // Pulse effect
        if (pulse) {
            const scale = 1 + Math.sin(clock.elapsedTime * 8) * 0.1;
            sphere.scale.set(scale, scale, scale);
            particles.scale.set(scale, scale, scale);
            if (clock.elapsedTime % 0.5 < 0.02) pulse = false; // stop after short pulse
        } else {
            sphere.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
            particles.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
        }

        renderer.render(scene, camera);
    };
    animate();

    // Resize handling
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}
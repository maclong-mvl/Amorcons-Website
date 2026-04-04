const mqAosMobile = window.matchMedia('(max-width: 768px)');
const mqReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

AOS.init({
    duration: 750,
    easing: 'ease-out-cubic',
    once: true,
    offset: 90,
    delay: 0,
    disable: function () {
        if (mqReduceMotion.matches) return true;
        return mqAosMobile.matches;
    }
});

function refreshAosForViewport() {
    if (typeof AOS !== 'undefined' && AOS.refresh) AOS.refresh();
}

mqAosMobile.addEventListener('change', refreshAosForViewport);
window.addEventListener('resize', refreshAosForViewport);

// Services Hover Video play/pause
document.querySelectorAll('.srv-cell').forEach(cell => {
    const video = cell.querySelector('.srv-cell-video');
    if (video) {
        cell.addEventListener('mouseenter', () => {
            video.play().catch(e => console.error("Video play failed:", e));
        });
        cell.addEventListener('mouseleave', () => {
            video.pause();
            video.currentTime = 0;
        });
    }
});

// Timeline Switcher Logic
const timelineItems = document.querySelectorAll('.timeline-item');
const mainVideo = document.querySelector('.about-main-img');
const mainText = document.querySelector('.about-backdrop-text');
const goldBar = document.querySelector('.timeline-bar-gold');
const TIMELINE_VIDEO_FADE_MS = 420;
const TIMELINE_TEXT_FADE_MS = 380;
let timelineVideoGen = 0;

function syncTimeline(item) {
    if (!item || !goldBar) return;

    // 1. Toggle Active State
    timelineItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // 2. Change Video — crossfade: mờ → đổi src → chờ load → hiện (tránh cắt đột ngột)
    const newVideoSrc = item.getAttribute('data-video');
    if (mainVideo && newVideoSrc && mainVideo.getAttribute('src') !== newVideoSrc) {
        const gen = ++timelineVideoGen;
        const vid = mainVideo;

        vid.style.transitionDuration = `${TIMELINE_VIDEO_FADE_MS}ms`;
        vid.style.transitionTimingFunction = 'cubic-bezier(0.33, 0, 0.2, 1)';
        vid.style.opacity = '0';

        window.setTimeout(() => {
            if (gen !== timelineVideoGen) return;
            vid.src = newVideoSrc;
            vid.load();

            const showVideo = () => {
                if (gen !== timelineVideoGen) return;
                vid.play().catch(() => { });
                requestAnimationFrame(() => {
                    if (gen !== timelineVideoGen) return;
                    vid.style.opacity = '1';
                });
            };

            vid.addEventListener('canplay', showVideo, { once: true });
            vid.addEventListener('error', showVideo, { once: true });
            window.setTimeout(() => {
                if (gen === timelineVideoGen && vid.style.opacity === '0') showVideo();
            }, 4500);
        }, TIMELINE_VIDEO_FADE_MS);
    }

    // 3. Sync Mosaic Description (chậm hơn một chút, khớp nhịp với video)
    const newText = item.querySelector('.t-desc').textContent;
    if (mainText && newText && mainText.textContent !== newText) {
        mainText.style.opacity = '0';
        window.setTimeout(() => {
            mainText.textContent = newText;
            requestAnimationFrame(() => {
                mainText.style.opacity = '1';
            });
        }, Math.round(TIMELINE_TEXT_FADE_MS * 0.55));
    }

    // 4. Move and Resize Gold Bar
    function updateBar() {
        const barOuter = document.querySelector('.timeline-bar-outer');
        if (barOuter && item) {
            const barRect = barOuter.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            let relativeTop = itemRect.top - barRect.top;
            if (item.getAttribute('data-index') === "0") {
                // relativeTop += 24;
            } else {
                relativeTop -= 30;
            }
            goldBar.style.transform = `translateY(${relativeTop}px)`;
            goldBar.style.height = `${itemRect.height}px`;
        }
    }

    updateBar();
    window.setTimeout(updateBar, 100);
    window.setTimeout(updateBar, 220);
    window.setTimeout(updateBar, 520);
}

timelineItems.forEach((item) => {
    item.addEventListener('click', () => syncTimeline(item));
});

// Initial sync for active item
const initialActive = document.querySelector('.timeline-item.active');
if (initialActive) {
    // Small delay to ensure styles are loaded
    setTimeout(() => syncTimeline(initialActive), 100);
}

// Handle Mosaic Text Transition
if (mainText) {
    mainText.style.transition =
        `opacity ${TIMELINE_TEXT_FADE_MS}ms cubic-bezier(0.33, 0, 0.2, 1)`;
}

// ─── Site header: nền + blur sau khi scroll qua chiều cao header ───
const siteHeaderEl = document.querySelector('.site-header');

function getNavScrollThreshold() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 80;
}

function updateSiteHeaderScroll() {
    if (!siteHeaderEl) return;
    siteHeaderEl.classList.toggle('site-header--scrolled', window.scrollY > getNavScrollThreshold());
}

window.addEventListener('scroll', updateSiteHeaderScroll, { passive: true });
window.addEventListener('resize', updateSiteHeaderScroll);
updateSiteHeaderScroll();

// ─── Hamburger Menu Toggle ────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
const navbarEl = document.querySelector('.navbar');
const mqMobileNav = window.matchMedia('(max-width: 768px)');
const hamburgerIcon = hamburgerBtn ? hamburgerBtn.querySelector('img') : null;
const hamburgerIconOpenSrc = './images/header/header-mobile/button-open-menu.svg';
const hamburgerIconCloseSrc = './images/header/header-mobile/button-open-menu.svg';

function syncNavbarMenuSurface(isOpen) {
    if (!navbarEl) return;
    if (!mqMobileNav.matches) {
        navbarEl.style.removeProperty('background');
        return;
    }
    if (isOpen) {
        navbarEl.style.setProperty('background', 'var(--menu-surface)');
    } else {
        navbarEl.style.removeProperty('background');
    }
}

function closeMobileMenu() {
    if (!hamburgerBtn || !mobileMenu) return;
    hamburgerBtn.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (hamburgerIcon) hamburgerIcon.src = hamburgerIconOpenSrc;
    document.body.style.overflow = '';
    syncNavbarMenuSurface(false);
}

if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('open');
        hamburgerBtn.classList.toggle('open');
        hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        if (hamburgerIcon) hamburgerIcon.src = isOpen ? hamburgerIconCloseSrc : hamburgerIconOpenSrc;
        document.body.style.overflow = isOpen ? 'hidden' : '';
        syncNavbarMenuSurface(isOpen);
    });

    mqMobileNav.addEventListener('change', () => {
        if (!mqMobileNav.matches) syncNavbarMenuSurface(false);
        else syncNavbarMenuSurface(mobileMenu.classList.contains('open'));
    });

    // Close when clicking the panel edge (nav element itself, not children)
    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) closeMobileMenu();
    });

    const langBtns = mobileMenu.querySelectorAll('.mobile-menu-lang-btn');
    langBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            langBtns.forEach((b) => {
                const on = b === btn;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileMenu();
    });
}

/** Timeline Swiper — About Us + Services (cùng class .about-projects-swiper, Figma 251:2458 / mobile 289:2267) */
(function initAboutProjectsTimelineSwiper() {
    const nodes = document.querySelectorAll('.about-projects-swiper');
    if (!nodes.length || typeof Swiper === 'undefined') return;

    const swipers = [];

    nodes.forEach((el) => {
        const slidesOffsetBeforeResponsive = () =>
            window.innerWidth < 640 ? 16 : Math.round(el.offsetWidth * 0.1);

        const swiper = new Swiper(el, {
            slidesPerView: 1.08,
            spaceBetween: 14,
            slidesOffsetBefore: slidesOffsetBeforeResponsive(),
            freeMode: {
                enabled: true,
                momentum: true,
                momentumRatio: 0.88,
            },
            grabCursor: true,
            watchOverflow: false,
            simulateTouch: true,
            resistance: true,
            resistanceRatio: 0.85,
            breakpoints: {
                640: {
                    slidesPerView: 2,
                    spaceBetween: 24,
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 35,
                },
            },
            on: {
                init(sw) {
                    sw.params.slidesOffsetBefore = slidesOffsetBeforeResponsive();
                    sw.update();
                },
            },
        });

        swipers.push({ swiper, slidesOffsetBeforeResponsive });
    });

    const onLayout = () => {
        swipers.forEach(({ swiper, slidesOffsetBeforeResponsive }) => {
            swiper.params.slidesOffsetBefore = slidesOffsetBeforeResponsive();
            swiper.update();
        });
        if (typeof AOS !== 'undefined' && AOS.refresh) AOS.refresh();
    };

    window.addEventListener('load', onLayout);
    window.addEventListener('resize', onLayout);
})();

/** Services page — luxury Swiper + tổng thầu steps (Figma 223:342) */
(function initServicesPage() {
    const luxuryRoot = document.querySelector('.services-luxury-swiper');
    if (luxuryRoot && typeof Swiper !== 'undefined') {
        const swiper = new Swiper(luxuryRoot, {
            loop: true,
            speed: 700,
            autoplay: {
                delay: 5200,
                disableOnInteraction: false,
            },
            pagination: {
                el: luxuryRoot.querySelector('.services-luxury-pagination'),
                clickable: true,
            },
        });
        window.addEventListener('load', () => {
            if (typeof AOS !== 'undefined' && AOS.refresh) AOS.refresh();
            swiper.update();
        });
    }

    const turnkeyList = document.getElementById('servicesTurnkeyList');
    const turnkeyImg = document.getElementById('servicesTurnkeyImg');
    const turnkeyDesc = document.getElementById('servicesTurnkeyDesc');
    if (!turnkeyList || !turnkeyImg || !turnkeyDesc) return;

    turnkeyList.addEventListener('click', (e) => {
        const btn = e.target.closest('.services-turnkey-btn');
        if (!btn || !turnkeyList.contains(btn)) return;

        const image = btn.getAttribute('data-image');
        const alt = btn.getAttribute('data-alt') || '';
        const desc = btn.getAttribute('data-desc') || '';

        turnkeyList.querySelectorAll('.services-turnkey-item').forEach((li) => {
            li.classList.toggle('is-active', li.contains(btn));
        });
        turnkeyList.querySelectorAll('.services-turnkey-btn').forEach((b) => {
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });

        if (image) {
            turnkeyImg.src = image;
            turnkeyImg.alt = alt;
        }
        turnkeyDesc.textContent = desc;
    });
})();
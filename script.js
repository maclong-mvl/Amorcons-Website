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
        /* Trang Dịch vụ: giữ AOS trên mobile (body.body-services) — các trang khác tắt ≤768px */
        if (document.body.classList.contains('body-services')) return false;
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

const LANG_FLAG = {
    en: './images/header/header-desktop/en.svg',
    vi: './images/header/header-desktop/vn.svg',
};

function closeAllLangDropdowns() {
    document.querySelectorAll('[data-lang-dropdown].is-open').forEach((dropdown) => {
        const panel = dropdown.querySelector('.lang-dropdown-panel');
        const btn = dropdown.querySelector('.lang-btn');
        if (panel) panel.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('is-open');
    });
}

function applySiteLang(lang) {
    if (lang !== 'en' && lang !== 'vi') return;
    const isEn = lang === 'en';
    const dropdown = document.querySelector('[data-lang-dropdown]');
    if (dropdown) {
        const btn = dropdown.querySelector('.lang-btn');
        const flagImg = dropdown.querySelector('.lang-btn-flag');
        const label = dropdown.querySelector('.nav-btn-label');
        if (flagImg) flagImg.src = LANG_FLAG[lang];
        if (label) label.textContent = isEn ? 'EN' : 'VN';
        if (btn) {
            btn.setAttribute(
                'aria-label',
                isEn ? 'Chọn ngôn ngữ: English' : 'Chọn ngôn ngữ: Tiếng Việt'
            );
        }
        dropdown.querySelectorAll('.lang-dropdown-option').forEach((opt) => {
            const on = opt.getAttribute('data-lang') === lang;
            opt.classList.toggle('is-selected', on);
            opt.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }
    document.querySelectorAll('.mobile-menu-lang-btn').forEach((b) => {
        const on = b.getAttribute('data-lang') === lang;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function initDesktopLangDropdown() {
    const dropdown = document.querySelector('[data-lang-dropdown]');
    if (!dropdown) return;
    const trigger = dropdown.querySelector('.lang-btn');
    const panel = dropdown.querySelector('.lang-dropdown-panel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = panel.hidden;
        closeAllLangDropdowns();
        if (willOpen) {
            panel.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            dropdown.classList.add('is-open');
        }
    });

    dropdown.querySelectorAll('.lang-dropdown-option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = opt.getAttribute('data-lang');
            if (lang) applySiteLang(lang);
            closeAllLangDropdowns();
        });
    });
}

document.addEventListener('click', () => closeAllLangDropdowns());
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllLangDropdowns();
});
initDesktopLangDropdown();

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
            const lang = btn.getAttribute('data-lang');
            if (lang) applySiteLang(lang);
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
    const luxuryPaginationEl = document.getElementById('servicesLuxuryPagination');
    let luxurySwiper = null;

    function luxuryProgressIsHorizontal() {
        return window.matchMedia('(max-width: 900px)').matches;
    }

    function updateLuxuryProgress(swiper) {
        const fill = document.getElementById('servicesLuxuryProgressFill');
        if (!fill) return;
        const n = luxurySlideCount > 0 ? luxurySlideCount : 1;
        const i = swiper.realIndex;
        const ratio = n <= 1 ? 1 : (i + 1) / n;
        if (luxuryProgressIsHorizontal()) {
            fill.style.height = '100%';
            fill.style.width = `${ratio * 100}%`;
        } else {
            fill.style.width = '100%';
            fill.style.height = `${ratio * 100}%`;
        }
    }

    function syncLuxuryVideos(swiper) {
        const el = swiper?.el;
        if (!el) return;
        el.querySelectorAll('.swiper-slide video').forEach((v) => {
            v.pause();
        });
        const slide = swiper.slides[swiper.activeIndex];
        const vid = slide?.querySelector('video');
        if (vid) vid.play().catch(() => {});
    }

    const luxurySlideCount = luxuryRoot
        ? luxuryRoot.querySelectorAll('.swiper-wrapper > .swiper-slide').length
        : 0;

    const luxuryMidDecor =
        luxurySlideCount >= 3
            ? `<span class="services-luxury-pagination-mid" aria-hidden="true">
  <img class="services-luxury-pagination-logo" src="./images/pagination.svg" width="15" height="15" alt="" decoding="async" />
  <span class="services-luxury-pagination-track">
    <span class="services-luxury-pagination-track-fill" id="servicesLuxuryProgressFill"></span>
  </span>
</span>`
            : '';

    if (luxuryRoot && luxuryPaginationEl) {
        const paginationOpts = {
            el: luxuryPaginationEl,
            clickable: true,
        };
        if (luxurySlideCount >= 3) {
            paginationOpts.renderBullet = (index, className) => {
                const bullet = `<span class="${className}" tabindex="0" role="button"></span>`;
                return index === 1 ? bullet + luxuryMidDecor : bullet;
            };
        }

        luxurySwiper = new Swiper(luxuryRoot, {
            direction: 'vertical',
            loop: true,
            speed: 700,
            slidesPerView: 1,
            spaceBetween: 0,
            simulateTouch: false,
            autoplay: {
                delay: 3000,
                pauseOnMouseEnter: true,
            },
            pagination: paginationOpts,
            mousewheel: {
                forceToAxis: true,
                sensitivity: 1,
                releaseOnEdges: true,
            },
            on: {
                init(s) {
                    updateLuxuryProgress(s);
                    syncLuxuryVideos(s);
                },
                slideChange(s) {
                    updateLuxuryProgress(s);
                    syncLuxuryVideos(s);
                },
            },
        });

        window.addEventListener('resize', () => {
            if (luxurySwiper) updateLuxuryProgress(luxurySwiper);
        });

        luxuryRoot.addEventListener('mouseenter', () => {
            if (luxurySwiper.mousewheel) luxurySwiper.mousewheel.disable();
        });
        luxuryRoot.addEventListener('mouseleave', () => {
            if (luxurySwiper.mousewheel) luxurySwiper.mousewheel.enable();
        });
    }

    window.addEventListener('load', () => {
        if (typeof AOS !== 'undefined' && AOS.refresh) AOS.refresh();
        if (luxurySwiper) {
            luxurySwiper.update();
            syncLuxuryVideos(luxurySwiper);
        }
    });

    const turnkeyList = document.getElementById('servicesTurnkeyList');
    const turnkeyVideo = document.getElementById('servicesTurnkeyVideo');
    if (!turnkeyList || !turnkeyVideo) return;

    const turnkeyVisual = document.querySelector('.services-page-turnkey .services-turnkey-visual');
    const turnkeyFrame = turnkeyVideo.closest('.services-turnkey-frame');
    const turnkeyMobileMq = window.matchMedia('(max-width: 900px)');

    /** Mobile: đặt khung video trong .services-turnkey-item.is-active (Figma). Desktop: giữ trong .services-turnkey-visual */
    function placeTurnkeyFrameMobile() {
        if (!turnkeyFrame || !turnkeyVisual) return;
        if (turnkeyMobileMq.matches) {
            const slot = turnkeyList.querySelector('.services-turnkey-item.is-active .services-turnkey-item-video-slot');
            if (slot && !slot.contains(turnkeyFrame)) slot.appendChild(turnkeyFrame);
        } else if (!turnkeyVisual.contains(turnkeyFrame)) {
            turnkeyVisual.appendChild(turnkeyFrame);
        }
    }

    turnkeyMobileMq.addEventListener('change', placeTurnkeyFrameMobile);
    placeTurnkeyFrameMobile();

    function syncTurnkeyDescVisibility() {
        turnkeyList.querySelectorAll('.services-turnkey-item').forEach((li) => {
            const desc = li.querySelector('.services-turnkey-desc');
            if (desc) desc.hidden = !li.classList.contains('is-active');
        });
    }

    const turnkeyMotionOk = () =>
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function turnkeyRipple(btn, clientX, clientY) {
        if (!turnkeyMotionOk()) return;
        const rect = btn.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const ripple = document.createElement('span');
        ripple.className = 'services-turnkey-btn-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    turnkeyList.addEventListener('click', (e) => {
        const btn = e.target.closest('.services-turnkey-btn');
        if (!btn || !turnkeyList.contains(btn)) return;

        turnkeyRipple(btn, e.clientX, e.clientY);

        if (btn.getAttribute('aria-selected') === 'true') return;

        const videoSrc = btn.getAttribute('data-video');
        const posterSrc = btn.getAttribute('data-poster') || '';
        const alt = btn.getAttribute('data-alt') || '';

        if (turnkeyMotionOk()) {
            btn.classList.add('services-turnkey-btn--pulse');
            btn.addEventListener(
                'animationend',
                () => btn.classList.remove('services-turnkey-btn--pulse'),
                { once: true },
            );
        }

        turnkeyList.querySelectorAll('.services-turnkey-item').forEach((li) => {
            li.classList.toggle('is-active', li.contains(btn));
        });
        turnkeyList.querySelectorAll('.services-turnkey-btn').forEach((b) => {
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });

        placeTurnkeyFrameMobile();

        const applyContent = () => {
            if (videoSrc) {
                turnkeyVideo.src = videoSrc;
                if (posterSrc) turnkeyVideo.poster = posterSrc;
                turnkeyVideo.setAttribute('aria-label', alt || 'Video minh họa quy trình tổng thầu');
                turnkeyVideo.play().catch(() => {});
            }
            syncTurnkeyDescVisibility();
            const activeDesc = btn.closest('.services-turnkey-item')?.querySelector('.services-turnkey-desc');
            if (activeDesc && turnkeyMotionOk()) {
                activeDesc.classList.remove('services-turnkey-desc--enter');
                void activeDesc.offsetWidth;
                activeDesc.classList.add('services-turnkey-desc--enter');
                activeDesc.addEventListener(
                    'animationend',
                    () => activeDesc.classList.remove('services-turnkey-desc--enter'),
                    { once: true },
                );
            }
            if (turnkeyMotionOk()) {
                requestAnimationFrame(() => {
                    turnkeyVideo.classList.remove('turnkey-content--hide');
                });
            }
        };

        if (!turnkeyMotionOk()) {
            applyContent();
            return;
        }

        turnkeyVideo.classList.add('turnkey-content--hide');
        window.setTimeout(applyContent, 220);
    });
})();
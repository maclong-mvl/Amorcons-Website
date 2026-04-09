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

// Services popup (modal) open/close
(function initServicesPopup() {
    const modal = document.getElementById('srvModal');
    if (!modal) return;

    const dialog = modal.querySelector('.srv-modal-dialog');
    const imgEl = document.getElementById('srvModalImg');
    const videoEl = document.getElementById('srvModalVideo');

    let lastActiveEl = null;
    let escHandlerBound = false;

    function setModalOpen(open) {
        if (open) {
            modal.hidden = false;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        } else {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            modal.hidden = true;
            document.body.style.overflow = '';
        }
    }

    function stopModalVideo() {
        if (!videoEl) return;
        try {
            videoEl.pause();
        } catch {}
        // Reset so it doesn't keep buffering in background
        videoEl.removeAttribute('src');
        videoEl.load?.();
    }

    function openFromCell(cell) {
        lastActiveEl = document.activeElement;

        const bgImg = cell.querySelector('.srv-cell-bg');
        const bgSrc = bgImg?.getAttribute('src') || '';

        const vid = cell.querySelector('.srv-cell-video');
        const vidSrc = vid?.getAttribute('src') || '';

        if (imgEl) {
            if (bgSrc) imgEl.src = bgSrc;
            else imgEl.removeAttribute('src');
        }

        stopModalVideo();
        if (videoEl && vidSrc) {
            videoEl.src = vidSrc;
            videoEl.load();
        }

        setModalOpen(true);

        // Let layout paint before attempting to play (avoids some autoplay blocks)
        window.setTimeout(() => {
            if (videoEl && vidSrc) {
                videoEl.play().catch(() => {});
            }
            const closeBtn = modal.querySelector('.srv-modal-rail-close');
            closeBtn?.focus?.();
        }, 40);

        if (!escHandlerBound) {
            escHandlerBound = true;
            document.addEventListener('keydown', (e) => {
                if (!modal.hidden && e.key === 'Escape') closeModal();
            });
        }
    }

    function closeModal() {
        stopModalVideo();
        setModalOpen(false);
        // Restore focus
        if (lastActiveEl && typeof lastActiveEl.focus === 'function') {
            try {
                lastActiveEl.focus();
            } catch {}
        }
        lastActiveEl = null;
    }

    // Close handlers
    modal.querySelectorAll('[data-srv-modal-close]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
    });

    // Click outside dialog closes (backdrop already handled via [data-srv-modal-close])
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Open popup from each srv-cell
    document.querySelectorAll('.srv-cell').forEach((cell) => {
        cell.addEventListener('click', (e) => {
            // allow other modifiers without trapping
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault?.();
            openFromCell(cell);
        });

        // Keyboard accessibility for role="button"
        cell.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            openFromCell(cell);
        });
    });

    // Basic focus trap inside dialog
    if (dialog) {
        dialog.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const focusables = dialog.querySelectorAll(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
    }
})();

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

function navigateLangOptionUrl(rawUrl) {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return false;
    let targetHref;
    try {
        targetHref = new URL(trimmed, window.location.href).href;
    } catch {
        return false;
    }
    if (targetHref === window.location.href) return false;
    window.location.assign(trimmed);
    return true;
}

function applySiteLang(lang) {
    if (lang !== 'en' && lang !== 'vi') return;
    const isEn = lang === 'en';
    document.documentElement.setAttribute('lang', lang);

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

    // Contact form copy (placeholders / labels)
    const copy =
        lang === 'en'
            ? {
                  name: 'Name*',
                  email: 'Email*',
                  phone: 'Phone',
                  company: 'Company',
                  message: 'Message',
              }
            : {
                  name: 'Tên*',
                  email: 'Email*',
                  phone: 'Điện thoại',
                  company: 'Công ty',
                  message: 'Lời nhắn',
              };

    document.querySelectorAll('form.contact-form').forEach((form) => {
        const setField = (id, text) => {
            const input = form.querySelector(`#${id}`);
            if (input) input.setAttribute('placeholder', text);
            const labelEl = form.querySelector(`label[for="${id}"]`);
            if (labelEl) labelEl.textContent = text;
        };
        setField('name', copy.name);
        setField('email', copy.email);
        setField('phone', copy.phone);
        setField('company', copy.company);
        setField('message', copy.message);
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
            closeAllLangDropdowns();
            const url = opt.getAttribute('data-url');
            if (navigateLangOptionUrl(url)) return;
            const lang = opt.getAttribute('data-lang');
            if (lang) applySiteLang(lang);
        });
    });
}

(function syncLangFromUrlQuery() {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'vi') applySiteLang(q);
})();

document.addEventListener('click', () => closeAllLangDropdowns());
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllLangDropdowns();
});
initDesktopLangDropdown();

// ─── Hamburger Menu Toggle ────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
const navbarEl = document.querySelector('.navbar');
const mqMobileNav = window.matchMedia('(max-width: 1240px)');
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
    const turnkeyPanel = document.getElementById('servicesTurnkeyPanel');
    const turnkeyRail = turnkeyPanel ? turnkeyPanel.querySelector('.services-turnkey-rail') : null;

    function updateTurnkeyRailMetrics() {
        if (!turnkeyPanel) return;
        const panelRect = turnkeyPanel.getBoundingClientRect();
        const btnsAll = Array.from(turnkeyList.querySelectorAll('.services-turnkey-btn'));
        if (!btnsAll.length) return;

        const firstRect = btnsAll[0].getBoundingClientRect();
        const lastRect = btnsAll[btnsAll.length - 1].getBoundingClientRect();
        const firstY = (firstRect.top + firstRect.height / 2) - panelRect.top;
        const lastY = (lastRect.top + lastRect.height / 2) - panelRect.top;

        // With CSS line top fixed at 0, rail height should reach the last dot.
        // Clamp start/end to avoid negative/zero heights when layout shifts.
        const BIAS_START_PX = 20;
        const rawStart = firstY + BIAS_START_PX;
        const rawEnd = lastY;

        const end = Math.max(1, rawEnd);
        const start = Math.max(0, Math.min(rawStart, end - 1));

        turnkeyPanel.style.setProperty('--turnkey-rail-height', `${end}px`);
        turnkeyPanel.style.setProperty('--turnkey-rail-progress-start', `${start}px`);
        // left is controlled by CSS (left: 0)
    }

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
    window.addEventListener('resize', updateTurnkeyRailMetrics);
    window.addEventListener('load', updateTurnkeyRailMetrics);
    updateTurnkeyRailMetrics();

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

    function updateTurnkeyRailProgressByBtn(btn) {
        if (!turnkeyPanel || !btn) return;
        updateTurnkeyRailMetrics();
        const panelRect = turnkeyPanel.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const y = (btnRect.top + btnRect.height / 2) - panelRect.top;

        const cs = getComputedStyle(turnkeyPanel);
        const height = parseFloat(cs.getPropertyValue('--turnkey-rail-height')) || 1;
        const start = parseFloat(cs.getPropertyValue('--turnkey-rail-progress-start')) || 0;
        const denom = Math.max(1, height - start);
        const ratio = (y - start) / denom;
        const clamped = Math.max(0, Math.min(1, ratio));
        turnkeyPanel.style.setProperty('--turnkey-rail-scale', String(clamped));
    }

    function activateTurnkeyBtn(btn, opts = {}) {
        if (!btn || !turnkeyList.contains(btn)) return;
        const { withRipple = false, clientX = 0, clientY = 0 } = opts;

        if (withRipple) turnkeyRipple(btn, clientX, clientY);

        if (btn.getAttribute('aria-selected') === 'true') {
            updateTurnkeyRailProgressByBtn(btn);
            return;
        }

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

        // Mark items "done" (passed) so per-item progress line can stay visible.
        const btnsAll = Array.from(turnkeyList.querySelectorAll('.services-turnkey-btn'));
        const activeIdx = btnsAll.indexOf(btn);
        if (activeIdx >= 0) {
            turnkeyList.querySelectorAll('.services-turnkey-item').forEach((li, i) => {
                // Mark all items up to current as "done" (scrolled/passed)
                li.classList.toggle('is-done', i <= activeIdx);
            });
        }

        updateTurnkeyRailProgressByBtn(btn);
        // One more layout-synced update (active state can change heights).
        requestAnimationFrame(() => updateTurnkeyRailProgressByBtn(btn));
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
    }

    turnkeyList.addEventListener('click', (e) => {
        const btn = e.target.closest('.services-turnkey-btn');
        if (!btn || !turnkeyList.contains(btn)) return;
        activateTurnkeyBtn(btn, { withRipple: true, clientX: e.clientX, clientY: e.clientY });
    });

    // ScrollMagic: pin section + scroll-driven active step + rail progress
    if (turnkeyPanel && typeof window.ScrollMagic !== 'undefined') {
        const controller = new window.ScrollMagic.Controller();
        const btns = Array.from(turnkeyList.querySelectorAll('.services-turnkey-btn'));
        const turnkeySection = document.querySelector('.services-page-turnkey');

        // Desktop/tablet only: pin the section so user can keep scrolling to scrub steps.
        const allowPin = () => !window.matchMedia('(max-width: 900px)').matches;

        const getDuration = () => {
            // Enough scroll distance to scrub through all steps while pinned.
            // Use scrollHeight (includes expanded desc) so progress doesn't stop early.
            const base = Math.max(turnkeyList.scrollHeight, turnkeyPanel.offsetHeight);
            // Ensure enough scroll distance to reach the LAST item reliably.
            // If duration is too short, Scene progress may never hit 1.0 → last step won't activate.
            const viewportH = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
            const perStep = Math.round(viewportH * 0.55); // scroll budget per step while pinned
            const bySteps = Math.max(1, perStep * Math.max(1, btns.length - 1));
            return Math.max(1, Math.round(base * 1.25), bySteps);
        };

        const getTriggerOffsetAtSectionEnd = () => {
            // Start pinning when we reach the "end" of the section (bottom aligns with viewport bottom).
            // scrollY_at_end = sectionTop + sectionHeight - viewportHeight
            // In ScrollMagic terms, we emulate this by offsetting from the section's start.
            if (!turnkeySection) return 0;
            const viewportH = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
            return Math.max(0, Math.round(turnkeySection.offsetHeight - viewportH));
        };

        let pinScene = null;
        let progressScene = null;

        function buildScenes() {
            if (!btns.length) return;

            // Destroy old scenes if any
            try {
                pinScene?.destroy(true);
                progressScene?.destroy(true);
            } catch {}
            pinScene = null;
            progressScene = null;

            const duration = getDuration();
            const offset = getTriggerOffsetAtSectionEnd();

            if (turnkeySection && allowPin()) {
                pinScene = new window.ScrollMagic.Scene({
                    triggerElement: turnkeySection,
                    triggerHook: 0,
                    offset,
                    duration,
                })
                    .setPin(turnkeySection, { pushFollowers: true })
                    .addTo(controller);
            }

            progressScene = new window.ScrollMagic.Scene({
                triggerElement: turnkeySection || turnkeyList,
                triggerHook: 0,
                offset,
                duration,
            })
                .on('progress', (e) => {
                    const n = btns.length;
                    // map [0..1] to [0..n-1] reliably (so last index is reachable)
                    const idx = Math.min(n - 1, Math.max(0, Math.round(e.progress * (n - 1))));
                    const btn = btns[idx];
                    if (btn) activateTurnkeyBtn(btn, { withRipple: false });
                })
                .on('enter', (e) => {
                    // When entering from top, ensure first step; from bottom, ensure last step
                    const dir = e?.scrollDirection;
                    const btn = dir === 'REVERSE' ? btns[btns.length - 1] : btns[0];
                    if (btn) activateTurnkeyBtn(btn, { withRipple: false });
                })
                .on('leave', (e) => {
                    // When leaving, lock to edge step based on direction
                    const dir = e?.scrollDirection;
                    const btn = dir === 'REVERSE' ? btns[0] : btns[btns.length - 1];
                    if (btn) activateTurnkeyBtn(btn, { withRipple: false });
                })
                .addTo(controller);

            // Optional: use GSAP for smoother micro transitions when steps change.
            // (Requirement mentions GSAP; this keeps existing logic intact while adding animation polish.)
            if (typeof window.gsap !== 'undefined') {
                let lastSelected = -1;
                progressScene.off?.('progress.gsapTurnkey'); // if supported by ScrollMagic build
                progressScene.on('progress.gsapTurnkey', (e) => {
                    const n = btns.length;
                    const idx = Math.min(n - 1, Math.max(0, Math.round(e.progress * (n - 1))));
                    if (idx === lastSelected) return;
                    lastSelected = idx;
                    const activeItem = btns[idx]?.closest('.services-turnkey-item');
                    if (activeItem) {
                        window.gsap.fromTo(
                            activeItem,
                            { opacity: 0.92, y: 6 },
                            { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', overwrite: true }
                        );
                    }
                });
            }
        }

        const refresh = () => {
            buildScenes();
            controller.update(true);
        };

        window.addEventListener('resize', refresh);
        window.addEventListener('load', refresh);
        refresh();
    }

    // Ensure rail matches initial active step
    const initialBtn = turnkeyList.querySelector('.services-turnkey-btn[aria-selected="true"]');
    if (initialBtn) updateTurnkeyRailProgressByBtn(initialBtn);
})();

// ─── Contact forms: show success message (vi/en) ────────────────────────
function getCurrentLang() {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'vi') return q;
    const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (htmlLang.startsWith('en')) return 'en';
    return 'vi';
}

function getContactSuccessCopy(lang) {
    if (lang === 'en') {
        return {
            title: 'Submission successful!',
            body: "We’ve received your information and will contact you as soon as possible.",
        };
    }
    return {
        title: 'Gửi yêu cầu thành công!',
        body: 'Chúng tôi đã nhận được thông tin của bạn và sẽ liên hệ trong thời gian sớm nhất.',
    };
}

function showContactFormSuccess(form) {
    const lang = getCurrentLang();
    const copy = getContactSuccessCopy(lang);

    const host =
        form.closest('.contact-form-box') ||
        form.parentElement ||
        form;

    let toast = host.querySelector('.contact-form-success');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'contact-form-success';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        host.appendChild(toast);
    }

    toast.innerHTML = `
    <div class="contact-form-success__title">${copy.title}</div>
    <div class="contact-form-success__body">${copy.body}</div>
  `.trim();

    toast.classList.add('is-visible');

    window.clearTimeout(toast.__hideTimer);
    toast.__hideTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 4200);
}

document.querySelectorAll('form.contact-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
        // Let native validation run; if invalid, show built-in messages.
        if (!form.checkValidity()) {
            e.preventDefault();
            form.reportValidity?.();
            return;
        }

        // Valid → show success UI (no real submit for static site)
        e.preventDefault();
        showContactFormSuccess(form);
        form.reset();
    });
});
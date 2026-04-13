/**
 * main.js — shared navigation, UI utilities
 */
(function() {
  'use strict';

  /* ── Navigation active link ── */
  function setActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      // strip trailing slash for comparison
      const linkPath = href.replace(/\/$/, '');
      link.classList.toggle('active',
        linkPath && path.includes(linkPath) && linkPath !== 'index.html' && linkPath !== '../index.html' && linkPath !== '/'
      );
    });
  }

  /* ── Mobile burger menu ── */
  function initBurger() {
    const burger = document.querySelector('.nav-burger');
    const menu   = document.querySelector('.nav-menu');
    if (!burger || !menu) return;

    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!burger.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
        burger.classList.remove('open');
      }
    });
  }

  /* ── Update nav point counter ── */
  function updateNavPoints() {
    const el = document.querySelector('.nav-pts-value');
    if (el && window.Progress) {
      el.textContent = window.Progress.getTotalPoints();
    }
  }

  /* ── Toast ── */
  window.showToast = function(msg, duration = 2500) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), duration);
  };

  /* ── Fade-in on scroll ── */
  function initScrollFade() {
    const items = document.querySelectorAll('.scroll-fade');
    if (!items.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    items.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      obs.observe(el);
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    initBurger();
    updateNavPoints();
    initScrollFade();
  });

})();

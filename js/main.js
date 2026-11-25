document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll effect
  const header = document.querySelector('header');

  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      } else {
        header.style.background = 'rgba(255, 255, 255, 0.75)';
        header.style.boxShadow = 'none';
      }
    });
  }

  // Reveal elements on scroll
  const revealElements = document.querySelectorAll('.glass-card, .section-title');
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => {
      el.style.opacity = 0;
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      revealObserver.observe(el);
    });
  }
});

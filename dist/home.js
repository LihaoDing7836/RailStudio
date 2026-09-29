// Content remains visible without JS and for visitors who prefer reduced motion.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const sections=[...document.querySelectorAll('.reveal')];
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
  },{threshold:0.08,rootMargin:'0px 0px 40px 0px'});
  document.documentElement.classList.add('motion-ready');
  sections.forEach(section=>observer.observe(section));
  // Printing must not leave off-screen content transparent.
  addEventListener('beforeprint',()=>sections.forEach(section=>section.classList.add('is-visible')));
}

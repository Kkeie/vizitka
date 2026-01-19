import React from "react";
type Opts = { rootMargin?: string; once?: boolean; disabled?: boolean };
export function useReveal<T extends HTMLElement = HTMLDivElement>(opts?: Opts){
  const ref = React.useRef<T|null>(null);
  React.useEffect(()=>{
    if (opts?.disabled) return;
    const el = ref.current; if(!el) return;
    el.classList.add("reveal");
    if (typeof IntersectionObserver==="undefined"){ requestAnimationFrame(()=> el.classList.add("reveal-in")); return; }
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          el.classList.add("reveal-in");
          if (opts?.once !== false) observer.unobserve(el);
        }
      });
    }, { rootMargin: opts?.rootMargin ?? "0px 0px -10% 0px" });
    observer.observe(el); return ()=> observer.disconnect();
  },[]);
  return ref;
}

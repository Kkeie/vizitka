import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Mobile: 2 cols.
      // Tablet: 3 cols, sidebar hidden (matches styles.css `.two-column-layout` collapse at <1200).
      // Desktop: 4 cols with sidebar visible.
      if (width < 600) setBreakpoint('mobile');
      else if (width < 1200) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}
// src/components/CoursesPageScrollbar.tsx
// Apply scrollbar styling to html element on courses pages

'use client';

import { useEffect } from 'react';

export default function CoursesPageScrollbar() {
  useEffect(() => {
    // Add scrollbar class to html element (documentElement)
    // This is required for Firefox's scrollbar-color property to work
    document.documentElement.classList.add('scrollbar-dark-thumb');
    
    // Cleanup: remove class when component unmounts
    return () => {
      document.documentElement.classList.remove('scrollbar-dark-thumb');
    };
  }, []);

  return null;
}


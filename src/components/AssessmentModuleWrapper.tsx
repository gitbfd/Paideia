// src/components/AssessmentModuleWrapper.tsx
// Client component wrapper for AssessmentModule to prevent hydration mismatches

'use client';

import dynamic from 'next/dynamic';

// Dynamically import AssessmentModule with SSR disabled to prevent hydration mismatches
const AssessmentModule = dynamic(() => import('@/components/AssessmentModule'), {
  ssr: false,
});

type Props = {
  courseSlug: string;
  moduleId: string;
};

export default function AssessmentModuleWrapper({ courseSlug, moduleId }: Props) {
  return <AssessmentModule courseSlug={courseSlug} moduleId={moduleId} />;
}

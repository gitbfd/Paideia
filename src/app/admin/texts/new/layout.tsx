import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Text',
};

export default function NewTextLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


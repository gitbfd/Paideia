import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set a new password',
};

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


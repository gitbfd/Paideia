// admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr]">
      <aside className="border-r p-4">
        <nav className="space-y-2 text-sm">
          <a className="block hover:underline" href="/admin">Admin Home</a>
          <a className="block hover:underline" href="/admin/courses">Courses</a>
          <a className="block hover:underline" href="/admin/texts">Texts</a>
          <a className="block hover:underline" href="/courses">Public Courses</a>
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  );
}

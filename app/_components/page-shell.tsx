interface PageShellProps {
  leftNav?: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}

export function PageShell({ leftNav, rightNav, children }: PageShellProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <nav className="flex w-full items-center justify-between px-6 py-6">
        <div>{leftNav}</div>
        {rightNav ? (
          <div className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.2em]">
            {rightNav}
          </div>
        ) : null}
      </nav>

      {children}

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-lg items-center justify-end">
          <span className="font-mono text-[11px] text-muted-soft/60">
            {new Date().getFullYear()}_
          </span>
        </div>
      </footer>
    </div>
  );
}

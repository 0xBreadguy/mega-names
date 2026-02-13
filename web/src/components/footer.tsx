export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] shadow-[inset_0_1px_3px_rgba(25,25,26,0.04)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-label text-[var(--muted)] text-[0.6rem]">
              meganames © 2026
            </p>
            <div className="flex items-center gap-6">
              <a href="https://rabbithole.megaeth.com" target="_blank" rel="noopener noreferrer"
                className="font-label text-[var(--muted)] text-[0.6rem] hover:text-[var(--foreground)] transition-colors">
                megaeth
              </a>
              <a href="https://github.com/0xBreadguy/mega-names" target="_blank" rel="noopener noreferrer"
                className="font-label text-[var(--muted)] text-[0.6rem] hover:text-[var(--foreground)] transition-colors">
                github
              </a>
            </div>
          </div>
          <div className="text-center">
            <p className="font-label text-[var(--muted)] text-[0.55rem]">
              inspired by{' '}
              <a href="https://x.com/z0r0zzz/status/2018072557682082277" target="_blank" rel="noopener noreferrer"
                className="hover:text-[var(--foreground)] transition-colors underline">
                z0r0zzz
              </a>
              {' '}· built on{' '}
              <a href="https://github.com/z0r0z/wei-names" target="_blank" rel="noopener noreferrer"
                className="hover:text-[var(--foreground)] transition-colors underline">
                wei-names
              </a>
              {' '}· built by{' '}
              <a href="https://x.com/bread_" target="_blank" rel="noopener noreferrer"
                className="hover:text-[var(--foreground)] transition-colors underline">
                Bread
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

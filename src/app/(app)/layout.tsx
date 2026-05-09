import Navbar from "@/components/Navbar";
import AppTourShell from "@/components/AppTourShell";
import TickerTapePreference from "@/components/TickerTapePreference";
import { MobileNavProvider } from "@/components/MobileNavProvider";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppTourShell>
      <TickerTapePreference />
      <MobileNavProvider>
        {/* Desktop sidebar — fixed 88 px, hidden on mobile */}
        <Sidebar />

        <style>{`
          @media (min-width: 768px) {
            .page-shell { margin-left: var(--sidebar-w); }
          }
          /* 36px ticker (h-9) on mobile; 40px (h-10) + 52px search row on md+ */
          .app-content-below-header {
            padding-top: 36px;
          }
          @media (min-width: 768px) {
            .app-content-below-header {
              padding-top: 92px;
            }
          }
        `}</style>

        {/* Content column — offset right of sidebar on md+ */}
        <div className="flex flex-col min-h-dvh min-w-0">
          <div className="page-shell flex flex-col flex-1 min-w-0">
            <TopBar />

            <div className="flex flex-col flex-1 min-w-0 app-content-below-header">
              <div className="md:hidden">
                <Navbar />
              </div>

              <main
                className="flex-1 mx-auto max-w-7xl w-full min-w-0 px-3 sm:px-4 md:px-5
                  pb-[calc(3.75rem+env(safe-area-inset-bottom)+0.5rem)]
                  md:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              >
                {children}
              </main>

              <footer
                className="border-t py-3 sm:py-4
                  pb-[calc(4rem+env(safe-area-inset-bottom))]
                  md:pb-[max(1rem,env(safe-area-inset-bottom))]"
                style={{ borderColor: 'var(--border)' }}
              >
                <p
                  className="text-center max-w-2xl mx-auto px-3 sm:px-4 leading-snug"
                  style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
                >
                  Data and analysis are for informational purposes only and do not
                  constitute financial, investment, or legal advice.
                </p>
                <p
                  className="text-center mt-2 px-3 sm:px-4"
                  style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
                >
                  Questions?{" "}
                  <a
                    href="mailto:nbarmak09@gmail.com"
                    className="hover:underline transition-colors duration-200"
                    style={{ color: 'var(--accent)' }}
                  >
                    nbarmak09@gmail.com
                  </a>
                </p>
              </footer>
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </MobileNavProvider>
    </AppTourShell>
  );
}

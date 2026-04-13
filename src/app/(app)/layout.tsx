import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import AppTourShell from "@/components/AppTourShell";
import TickerTapePreference from "@/components/TickerTapePreference";
import { MobileNavProvider } from "@/components/MobileNavProvider";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppTourShell>
      <TickerTapePreference />
      <div className="hidden sm:block" data-gcm-ticker>
        <TickerTape />
      </div>
      <MobileNavProvider>
        <div className="flex flex-1 flex-col min-w-0 w-full">
        <Navbar />
        <div className="flex flex-1 flex-col min-w-0 w-full pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
          <main className="flex-1 mx-auto max-w-7xl w-full min-w-0 px-3 pt-4 sm:px-4 sm:pt-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
          <footer className="border-t border-border py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="text-center text-[11px] sm:text-xs text-muted max-w-2xl mx-auto px-3 sm:px-4 leading-snug">
              Data and analysis are for informational purposes only and do not
              constitute financial, investment, or legal advice.
            </p>
            <p className="text-center text-[11px] sm:text-xs text-muted mt-2 px-3 sm:px-4">
              Questions?{" "}
              <a
                href="mailto:nbarmak09@gmail.com"
                className="text-accent hover:underline cursor-pointer transition-colors duration-200"
              >
                nbarmak09@gmail.com
              </a>
            </p>
          </footer>
        </div>
        <MobileBottomNav />
        </div>
      </MobileNavProvider>
    </AppTourShell>
  );
}

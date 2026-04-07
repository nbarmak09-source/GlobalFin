import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="hidden sm:block">
        <TickerTape />
      </div>
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full min-w-0 px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
      <footer className="border-t border-border py-3 sm:py-4">
        <p className="text-center text-xs text-muted max-w-2xl mx-auto px-3 sm:px-4">
          Data and analysis are for informational purposes only and do not
          constitute financial, investment, or legal advice.
        </p>
        <p className="text-center text-xs text-muted mt-2 px-3 sm:px-4">
          Questions or concerns?{" "}
          <a
            href="mailto:nbarmak09@gmail.com"
            className="text-accent hover:underline"
          >
            nbarmak09@gmail.com
          </a>
        </p>
      </footer>
    </>
  );
}

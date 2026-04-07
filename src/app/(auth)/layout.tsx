export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-3 py-8 sm:px-4">
      {children}
    </div>
  );
}

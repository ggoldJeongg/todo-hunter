export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="!max-w-none !shadow-none !bg-transparent w-screen">
      {children}
    </div>
  );
}

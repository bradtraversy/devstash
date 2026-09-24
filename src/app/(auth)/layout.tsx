import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/components/homepage/Navbar";

// Signed-in users never see these pages, so an OAuth button here cannot link a second identity to their account.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <>
      <Navbar />
      <div className="pt-16">{children}</div>
    </>
  );
}

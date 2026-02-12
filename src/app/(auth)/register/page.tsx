import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Register - DevStash",
  description: "Create your DevStash account",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background p-4">
      <RegisterForm />
    </div>
  );
}

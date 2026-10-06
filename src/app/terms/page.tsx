import LegalPage, { legalMetadata } from "@/components/legal/legal-page";

export const metadata = legalMetadata("terms");

export default function TermsPage() {
  return <LegalPage slug="terms" />;
}

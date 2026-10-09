import Link from "next/link";
import { publicProfilePath } from "@/lib/public/paths";
import type { CollectionVisibility } from "@/lib/constants/visibility";

interface HandleLinkProps {
  handle: string;
  /** The visibility of the page showing the handle; only a Public page guarantees the profile exists. */
  visibility: CollectionVisibility;
}

export default function HandleLink({ handle, visibility }: HandleLinkProps) {
  if (visibility !== "PUBLIC") {
    return <span>@{handle}</span>;
  }
  return (
    <Link href={publicProfilePath(handle)} className="hover:text-foreground hover:underline">
      @{handle}
    </Link>
  );
}

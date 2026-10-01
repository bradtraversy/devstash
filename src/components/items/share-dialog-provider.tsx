"use client";

import { createContext, useContext, useState, useCallback } from "react";
import ShareSnippetDialog from "./share-snippet-dialog";

interface ShareDialogContextValue {
  openShareDialog: () => void;
}

const ShareDialogContext = createContext<ShareDialogContextValue | null>(null);

export function useShareDialog() {
  const context = useContext(ShareDialogContext);
  if (!context) {
    throw new Error("useShareDialog must be used within ShareDialogProvider");
  }
  return context;
}

/** Owns the one share dialog so the top bar, the mobile menu, and the palette open the same instance. */
export default function ShareDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const openShareDialog = useCallback(() => {
    // A new key per opening remounts the dialog with a blank form, so the previous link is not
    // visible flipping back to the form while the dialog animates closed.
    setSession((count) => count + 1);
    setOpen(true);
  }, []);

  return (
    <ShareDialogContext.Provider value={{ openShareDialog }}>
      {children}
      <ShareSnippetDialog key={session} open={open} onOpenChange={setOpen} />
    </ShareDialogContext.Provider>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Calendar, Mail, Key, Trash2 } from "lucide-react";
import ChangePasswordDialog from "./change-password-dialog";
import DeleteAccountDialog from "./delete-account-dialog";

interface ProfileInfoProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    hasPassword: boolean;
    createdAt: Date;
  };
}

export default function ProfileInfo({ user }: ProfileInfoProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const formattedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Avatar and Name */}
          <div className="flex items-center gap-4">
            <UserAvatar
              name={user.name}
              image={user.image}
              className="h-16 w-16 text-lg"
            />
            <div>
              <h3 className="text-lg font-semibold">
                {user.name || "No name set"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {user.image ? "Signed in with GitHub" : "Email account"}
              </p>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Member since:</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            {user.hasPassword && (
              <Button
                variant="outline"
                onClick={() => setShowChangePassword(true)}
              >
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccount(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
      <DeleteAccountDialog
        open={showDeleteAccount}
        onOpenChange={setShowDeleteAccount}
      />
    </>
  );
}

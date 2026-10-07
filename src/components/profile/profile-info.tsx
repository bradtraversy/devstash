import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Calendar, Mail } from "lucide-react";
import { describeSignInMethods } from "@/lib/auth/sign-in-copy";

interface ProfileInfoProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date;
    hasPassword: boolean;
    providers: string[];
  };
}

export default function ProfileInfo({ user }: ProfileInfoProps) {
  const formattedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
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
              {describeSignInMethods(user.hasPassword, user.providers)}
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
      </CardContent>
    </Card>
  );
}

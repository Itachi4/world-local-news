import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Mail, Calendar, Pencil, Lock, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfileProps {
  onLogout: () => void;
}

const UserProfile = ({ onLogout }: UserProfileProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setNewName(user?.user_metadata?.full_name || "");
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a display name.",
        variant: "destructive",
      });
      return;
    }

    setSavingName(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: newName.trim() },
      });

      if (error) throw error;

      setUser(data.user);
      setEditingName(false);
      toast({
        title: "Name updated",
        description: "Your display name has been updated.",
      });
    } catch (error: any) {
      console.error("Error updating name:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update name.",
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });

      onLogout();
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-lg">
              {getInitials(user.user_metadata?.full_name || user.email)}
            </AvatarFallback>
          </Avatar>
        </div>

        {editingName ? (
          <div className="flex items-center gap-2 justify-center">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-[200px] h-9 text-center"
              placeholder="Display name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdateName();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setNewName(user.user_metadata?.full_name || "");
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleUpdateName}
              disabled={savingName}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => {
                setEditingName(false);
                setNewName(user.user_metadata?.full_name || "");
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-xl">
              {user.user_metadata?.full_name || "User"}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => setEditingName(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        <CardDescription>
          Welcome to World Local News
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{user.email}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              Member since {formatDate(user.created_at)}
            </span>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="pt-4 border-t">
          {changingPassword ? (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Change Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                autoFocus
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdatePassword();
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdatePassword}
                  disabled={savingPassword || !newPassword || !confirmPassword}
                  className="flex-1"
                  size="sm"
                >
                  {savingPassword ? "Saving..." : "Update Password"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChangingPassword(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setChangingPassword(true)}
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          )}
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Mail, Calendar, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfileProps {
  onLogout: () => void;
}

const UserProfile = ({ onLogout }: UserProfileProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

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
        <CardTitle className="text-xl">
          {user.user_metadata?.full_name || "User"}
        </CardTitle>
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

          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Badge variant="secondary">
              Free User
            </Badge>
          </div>
        </div>

        <div className="pt-4 border-t">
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder, Video } from "lucide-react";

interface UserSidebarProps {
  onSelectUser: (userId: string, userName: string) => void;
  currentUserId?: string;
}

interface PublicUser {
  id: string;
  email: string;
  full_name?: string;
  analysis_count: number;
  video_count: number;
}

export const UserSidebar = ({ onSelectUser, currentUserId }: UserSidebarProps) => {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicUsers();
  }, []);

  const fetchPublicUsers = async () => {
    try {
      // Get all public analyses
      const { data: analyses, error } = await supabase
        .from('user_analyses')
        .select('user_id, video_url, is_public')
        .eq('is_public', true);

      if (error) throw error;

      // Group by user
      const userMap = new Map<string, { analysis_count: number; video_count: number }>();
      
      for (const analysis of analyses || []) {
        const userId = analysis.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, { analysis_count: 0, video_count: 0 });
        }
        const user = userMap.get(userId)!;
        user.analysis_count++;
        if (analysis.video_url) {
          user.video_count++;
        }
      }

      // Get unique user IDs
      const userIds = Array.from(userMap.keys());
      
      // Fetch user info using the database function
      const { data: userInfo, error: userError } = await (supabase.rpc as any)('get_user_display_info', { user_ids: userIds });

      if (userError) {
        console.error("Error fetching user info:", userError);
        // Fallback: use current user's info if available
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const usersWithInfo: PublicUser[] = [];
        
        for (const userId of userIds) {
          const stats = userMap.get(userId)!;
          let email = `User ${userId.substring(0, 8)}`;
          let full_name: string | undefined = undefined;

          if (currentUser && currentUser.id === userId) {
            email = currentUser.email || email;
            full_name = currentUser.user_metadata?.full_name;
          }

          usersWithInfo.push({
            id: userId,
            email,
            full_name,
            analysis_count: stats.analysis_count,
            video_count: stats.video_count,
          });
        }
        
        usersWithInfo.sort((a, b) => b.analysis_count - a.analysis_count);
        setUsers(usersWithInfo);
        return;
      }

      // Map user info to users
      const userInfoMap = new Map<string, { email: string; full_name?: string }>();
      for (const info of userInfo || []) {
        userInfoMap.set(info.user_id, {
          email: info.email || `User ${info.user_id.substring(0, 8)}`,
          full_name: info.full_name || undefined
        });
      }

      // Combine stats with user info
      const usersWithInfo: PublicUser[] = [];
      for (const userId of userIds) {
        const stats = userMap.get(userId)!;
        const info = userInfoMap.get(userId) || {
          email: `User ${userId.substring(0, 8)}`,
          full_name: undefined
        };

        usersWithInfo.push({
          id: userId,
          email: info.email,
          full_name: info.full_name,
          analysis_count: stats.analysis_count,
          video_count: stats.video_count,
        });
      }

      // Sort by analysis count (most active first)
      usersWithInfo.sort((a, b) => b.analysis_count - a.analysis_count);

      setUsers(usersWithInfo);
    } catch (error) {
      console.error("Error fetching public users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-64 p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-muted/30 p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Folder className="w-4 h-4" />
        Public Analyses
      </h3>
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No public analyses yet</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                onClick={() => onSelectUser(user.id, user.full_name || user.email)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={undefined} />
                  <AvatarFallback>
                    {(user.full_name || user.email)[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.full_name || user.email}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{user.analysis_count} {user.analysis_count === 1 ? 'analysis' : 'analyses'}</span>
                    {user.video_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {user.video_count}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

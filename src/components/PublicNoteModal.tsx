import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PublicNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteText: string;
  userId: string;
}

export const PublicNoteModal = ({ isOpen, onClose, noteText, userId }: PublicNoteModalProps) => {
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserName();
    }
  }, [isOpen, userId]);

  const fetchUserName = async () => {
    try {
      // Try to get user info from the database function
      const { data: userInfo, error } = await (supabase.rpc as any)('get_user_display_info', { user_ids: [userId] });

      if (!error && userInfo && Array.isArray(userInfo) && userInfo.length > 0) {
        const info = userInfo[0] as { user_id: string; email: string; full_name?: string };
        setUserName(info.full_name || info.email || `User ${userId.substring(0, 8)}`);
      } else {
        // Fallback: try to get from current session if it matches
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && currentUser.id === userId) {
          setUserName(currentUser.user_metadata?.full_name || currentUser.email || `User ${userId.substring(0, 8)}`);
        } else {
          setUserName(`User ${userId.substring(0, 8)}`);
        }
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
      setUserName(`User ${userId.substring(0, 8)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Public Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Written by:</div>
            <div className="font-semibold">
              {loading ? (
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              ) : (
                userName
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground mb-2">Note:</div>
            <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{noteText}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


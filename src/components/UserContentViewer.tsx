import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, FileText, Video, ChevronDown, ChevronUp } from "lucide-react";
import VideoPlayerModal from "./VideoPlayerModal";
import { Badge } from "@/components/ui/badge";

interface UserContentViewerProps {
  userId: string;
  userName: string;
  onClose: () => void;
  currentUserId?: string;
  onEdit?: (analysis: any) => void;
  onDelete?: (analysisId: string) => void;
}

interface Analysis {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  is_public: boolean;
}

export const UserContentViewer = ({ 
  userId, 
  userName: initialUserName, 
  onClose, 
  currentUserId,
  onEdit,
  onDelete 
}: UserContentViewerProps) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showVideosOnly, setShowVideosOnly] = useState(false);
  const [userName, setUserName] = useState(initialUserName);

  const isOwnProfile = currentUserId === userId;

  useEffect(() => {
    fetchUserInfo();
    fetchUserAnalyses();
  }, [userId, showVideosOnly]);

  const fetchUserInfo = async () => {
    try {
      // Try to get user info from the database function
      const { data: userInfo, error } = await (supabase.rpc as any)('get_user_display_info', { user_ids: [userId] });

      if (!error && userInfo && Array.isArray(userInfo) && userInfo.length > 0) {
        const info = userInfo[0] as { user_id: string; email: string; full_name?: string };
        setUserName(info.full_name || info.email || initialUserName);
      } else {
        // Fallback: if current user, get from auth
        if (isOwnProfile) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserName(user.user_metadata?.full_name || user.email || initialUserName);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchUserAnalyses = async () => {
    try {
      let query = supabase
        .from('user_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // If viewing own profile, show all. Otherwise, only public
      if (!isOwnProfile) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let filteredData = data || [];
      
      // Filter by videos if toggle is on
      if (showVideosOnly) {
        filteredData = filteredData.filter(a => a.video_url);
      }

      setAnalyses(filteredData);
    } catch (error) {
      console.error("Error fetching user analyses:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (analysisId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(analysisId)) {
        newSet.delete(analysisId);
      } else {
        newSet.add(analysisId);
      }
      return newSet;
    });
  };

  const handleDelete = async (analysisId: string) => {
    if (!confirm("Are you sure you want to delete this analysis?")) return;

    try {
      const { error } = await supabase
        .from('user_analyses')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
      if (onDelete) onDelete(analysisId);
    } catch (error) {
      console.error("Error deleting analysis:", error);
      alert("Failed to delete analysis");
    }
  };

  const videoCount = analyses.filter(a => a.video_url).length;

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="text-lg">
              {userName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{userName}</h2>
            <p className="text-sm text-muted-foreground">
              {isOwnProfile ? "My Analyses" : "Public Analyses"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {videoCount > 0 && (
            <Button
              variant={showVideosOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVideosOnly(!showVideosOnly)}
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Videos ({videoCount})
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading analyses...</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{showVideosOnly ? "No videos found" : "No analyses found"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map((analysis) => {
            const isExpanded = expandedCards.has(analysis.id);
            const hasVideo = !!analysis.video_url;
            
            return (
              <Card key={analysis.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg flex-1">{analysis.title}</CardTitle>
                    {!analysis.is_public && (
                      <Badge variant="secondary" className="text-xs">Private</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  {hasVideo && (
                    <div 
                      className="relative cursor-pointer group" 
                      onClick={() => setSelectedVideo(analysis.video_url!)}
                    >
                      {analysis.thumbnail_url ? (
                        <img
                          src={analysis.thumbnail_url}
                          alt={analysis.title}
                          className="w-full h-48 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center">
                          <Play className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md group-hover:bg-black/50 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-primary ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <p className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {analysis.content}
                    </p>
                    {analysis.content.length > 150 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(analysis.id)}
                        className="mt-2 p-0 h-auto text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Show more
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    
                    {isOwnProfile && (
                      <div className="flex gap-2">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(analysis)}
                            className="h-7 px-2 text-xs"
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(analysis.id)}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedVideo && (
        <VideoPlayerModal
          videoUrl={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
};

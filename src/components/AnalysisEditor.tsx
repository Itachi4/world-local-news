import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalysisEditorProps {
  userId: string;
  onSave: () => void;
  editingAnalysis?: {
    id: string;
    title: string;
    content: string;
    video_url: string | null;
    thumbnail_url: string | null;
    is_public: boolean;
  } | null;
  onCancel?: () => void;
}

// Helper function to extract video ID from YouTube/Vimeo URLs
const getVideoThumbnail = (videoUrl: string): string | null => {
  if (!videoUrl) return null;
  
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const youtubeMatch = videoUrl.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
  }
  
  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = videoUrl.match(vimeoRegex);
  if (vimeoMatch) {
    // Vimeo requires API call for thumbnail, but we can try this
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }
  
  return null;
};

export const AnalysisEditor = ({ userId, onSave, editingAnalysis, onCancel }: AnalysisEditorProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingAnalysis) {
      setTitle(editingAnalysis.title);
      setContent(editingAnalysis.content);
      setIsPublic(editingAnalysis.is_public);
      setVideoUrl(editingAnalysis.video_url || "");
      setThumbnailUrl(editingAnalysis.thumbnail_url || "");
    } else {
      // Reset form
      setTitle("");
      setContent("");
      setIsPublic(false);
      setVideoUrl("");
      setThumbnailUrl("");
    }
  }, [editingAnalysis]);

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    // Auto-generate thumbnail if it's YouTube/Vimeo
    if (url) {
      const autoThumbnail = getVideoThumbnail(url);
      if (autoThumbnail && !thumbnailUrl) {
        setThumbnailUrl(autoThumbnail);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in title and content",
        variant: "destructive",
      });
      return;
    }

    if (videoUrl && !thumbnailUrl) {
      toast({
        title: "Thumbnail required",
        description: "Please provide a thumbnail URL for the video",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const analysisData = {
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        video_url: videoUrl.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        is_public: isPublic,
      };

      if (editingAnalysis) {
        // Update existing analysis
        const { error } = await supabase
          .from('user_analyses')
          .update(analysisData)
          .eq('id', editingAnalysis.id)
          .eq('user_id', userId);

        if (error) throw error;

        toast({
          title: "Analysis updated",
          description: isPublic ? "Your analysis is now public" : "Analysis updated",
        });
      } else {
        // Create new analysis
        const { error } = await supabase
          .from('user_analyses')
          .insert(analysisData);

        if (error) throw error;

        toast({
          title: "Analysis saved",
          description: isPublic ? "Your analysis is now public" : "Analysis saved privately",
        });
      }

      // Reset form if not editing
      if (!editingAnalysis) {
        setTitle("");
        setContent("");
        setIsPublic(false);
        setVideoUrl("");
        setThumbnailUrl("");
      }
      
      onSave();
      if (onCancel) onCancel();
    } catch (error: any) {
      console.error("Error saving analysis:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save analysis",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingAnalysis ? "Edit Analysis" : "Create Expert Analysis"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter analysis title..."
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="content">Analysis Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your expert analysis here..."
            rows={10}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="videoUrl">Video URL (Optional)</Label>
          <div className="mt-1 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="pl-10"
                />
              </div>
            </div>
            {videoUrl && (
              <div className="text-xs text-muted-foreground">
                Supported: YouTube, Vimeo, or direct video links
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="thumbnailUrl">Thumbnail URL (Required if video URL provided)</Label>
          <Input
            id="thumbnailUrl"
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://example.com/thumbnail.jpg"
            className="mt-1"
          />
          {videoUrl && thumbnailUrl && (
            <div className="mt-2">
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="w-full max-w-md h-32 object-cover rounded-md border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <Label htmlFor="public">Make this analysis public</Label>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex-1"
          >
            {saving ? "Saving..." : editingAnalysis ? "Update Analysis" : "Save Analysis"}
          </Button>
          {editingAnalysis && onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

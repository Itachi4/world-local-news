import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Youtube, Save, X, Trash2, ExternalLink } from "lucide-react";

interface CommentaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoUrl: string, title: string, isPublic: boolean) => void;
  onDelete?: () => void;
  initialVideoUrl?: string;
  initialTitle?: string;
  initialIsPublic?: boolean;
  articleTitle?: string;
}

export const CommentaryModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialVideoUrl = "",
  initialTitle = "",
  initialIsPublic = false,
  articleTitle = "",
}: CommentaryModalProps) => {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasExistingCommentary = !!initialVideoUrl;

  useEffect(() => {
    if (isOpen) {
      setVideoUrl(initialVideoUrl);
      setTitle(initialTitle);
      setIsPublic(initialIsPublic);
    }
  }, [isOpen, initialVideoUrl, initialTitle, initialIsPublic]);

  const handleSave = async () => {
    if (!videoUrl.trim()) return;

    setIsSaving(true);
    try {
      await onSave(videoUrl.trim(), title.trim(), isPublic);
      onClose();
    } catch (error) {
      console.error("Error saving commentary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setVideoUrl(initialVideoUrl);
    setTitle(initialTitle);
    setIsPublic(initialIsPublic);
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm("Are you sure you want to remove this commentary? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error("Error deleting commentary:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <Youtube className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {hasExistingCommentary ? "Edit Commentary" : "Add Commentary"}
          </h3>
        </div>

        {articleTitle && (
          <div className="text-sm text-muted-foreground mb-4">
            <strong>Article:</strong> {articleTitle}
          </div>
        )}

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => window.open("https://studio.youtube.com", "_blank", "noopener,noreferrer")}
          >
            <Youtube className="w-4 h-4 mr-2" />
            Record on YouTube
            <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-60" />
          </Button>
          <p className="text-xs text-muted-foreground -mt-2">
            Record or upload your commentary in YouTube Studio, then paste the video link below.
          </p>

          <div className="space-y-2">
            <Label htmlFor="commentary-video-url">Video URL</Label>
            <Input
              id="commentary-video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentary-title">Title (optional)</Label>
            <Input
              id="commentary-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your take on this article?"
              maxLength={200}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="public-commentary"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public-commentary" className="text-sm">
              Make this commentary public
            </Label>
          </div>
          {isPublic && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <strong>Note:</strong> Public commentary can be watched by other users on this article.
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          {hasExistingCommentary && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving || isDeleting}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!videoUrl.trim() || isSaving || isDeleting}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {hasExistingCommentary ? "Update" : "Save"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentaryModal;

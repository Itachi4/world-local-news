import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StickyNote, Save, X } from "lucide-react";

interface ArticleNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteText: string, isPublic: boolean) => void;
  initialNoteText?: string;
  initialIsPublic?: boolean;
  articleTitle?: string;
}

export const ArticleNotesModal = ({
  isOpen,
  onClose,
  onSave,
  initialNoteText = "",
  initialIsPublic = false,
  articleTitle = "",
}: ArticleNotesModalProps) => {
  const [noteText, setNoteText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNoteText(initialNoteText);
      setIsPublic(initialIsPublic);
    }
  }, [isOpen, initialNoteText, initialIsPublic]);

  const handleSave = async () => {
    if (!noteText.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(noteText.trim(), isPublic);
      onClose();
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNoteText(initialNoteText);
    setIsPublic(initialIsPublic);
    onClose();
  };

  const maxLength = 1000;
  const remainingChars = maxLength - noteText.length;

  if (!isOpen) {
    return null;
  }
  
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">
              {initialNoteText ? "Edit Note" : "Add Note"}
            </h3>
          </div>
          
          {articleTitle && (
            <div className="text-sm text-muted-foreground mb-4">
              <strong>Article:</strong> {articleTitle}
            </div>
          )}
          
          <p className="text-sm text-muted-foreground mb-4">
            Add your personal notes about this article. You can make them public to share with others.
          </p>

          {/* Note Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-text">Your Note</Label>
              <Textarea
                id="note-text"
                placeholder="Write your thoughts about this article..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[120px] resize-none"
                maxLength={maxLength}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {noteText.length > 0 && remainingChars < 100 && (
                    <span className={remainingChars < 0 ? "text-destructive" : "text-amber-600"}>
                      {remainingChars} characters remaining
                    </span>
                  )}
                </span>
                <span>{noteText.length}/{maxLength}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="public-note"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public-note" className="text-sm">
                Make this note public
              </Label>
            </div>
            {isPublic && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <strong>Note:</strong> Public notes can be seen by other users. Keep this in mind when writing.
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!noteText.trim() || isSaving || noteText.length > maxLength}
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
                  {initialNoteText ? "Update" : "Save"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ArticleNotesModal;

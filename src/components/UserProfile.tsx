import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/feed/SiteHeader";
import { SiteFooter } from "@/components/feed/SiteFooter";
import { useToast } from "@/hooks/use-toast";

const FIELD_STYLE: React.CSSProperties = {
  width: "100%", height: 42, padding: "0 13px",
  border: "1px solid hsl(var(--line-2))",
  background: "hsl(var(--field))",
  borderRadius: 4, outline: "none",
  color: "hsl(var(--foreground))",
  fontFamily: "inherit", fontSize: 14.5,
  boxSizing: "border-box",
};

const SECTION_LABEL: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "hsl(var(--muted-foreground))",
  textTransform: "uppercase", letterSpacing: ".06em",
  marginBottom: 8,
};

function getInitials(str: string): string {
  return str.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

const AccountPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [showPassForm, setShowPassForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      setDisplayName(user.user_metadata?.full_name || "");
      setLoading(false);
    });
  }, [navigate]);

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });
      if (error) throw error;
      setUser(data.user);
      toast({ title: "Name updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowPassForm(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "hsl(var(--background))" }}>
        <div style={{ width: 32, height: 32, border: "2px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", animation: "sn-spin .8s linear infinite" }} />
      </div>
    );
  }

  if (!user) return null;

  const initials = getInitials(user.user_metadata?.full_name || user.email || "");
  const memberSince = user.created_at ? formatDate(user.created_at) : "";

  return (
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
      <SiteHeader
        user={user}
        onLogin={() => navigate("/auth")}
        onProfile={() => {}}
        onOpenGlobe={() => navigate("/")}
        searchOpen={false}
        onToggleSearch={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
        onFontDown={() => {}}
        onFontReset={() => {}}
        onFontUp={() => {}}
      />

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "46px 28px 80px" }}>
        <h1
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 600, fontSize: 32,
            letterSpacing: "-.015em",
            margin: "0 0 26px",
            color: "hsl(var(--foreground))",
          }}
        >
          Account
        </h1>

        {/* Profile row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 18,
            padding: 22,
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6, marginBottom: 18,
          }}
        >
          <span
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "hsl(var(--primary))",
              color: "#fff",
              display: "grid", placeItems: "center",
              fontFamily: "'Newsreader', serif",
              fontWeight: 600, fontSize: 25,
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 22, color: "hsl(var(--foreground))" }}>
              {user.user_metadata?.full_name || "Account"}
            </div>
            <div style={{ fontSize: 13.5, color: "hsl(var(--muted-foreground))" }}>
              {user.email}
              {memberSince && ` · Member since ${memberSince}`}
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6, overflow: "hidden", marginBottom: 18,
          }}
        >
          {/* Display name */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <label style={SECTION_LABEL}>Display name</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                style={{ ...FIELD_STYLE, flex: 1 }}
                placeholder="Your name"
              />
              <button
                onClick={handleUpdateName}
                disabled={savingName}
                style={{
                  height: 42, padding: "0 16px",
                  border: "1px solid hsl(var(--border))",
                  background: "transparent",
                  color: "hsl(var(--foreground))",
                  borderRadius: 4, fontFamily: "inherit",
                  fontSize: 13, fontWeight: 600,
                  cursor: savingName ? "not-allowed" : "pointer",
                  opacity: savingName ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {savingName ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Email (readonly) */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <label style={SECTION_LABEL}>Email</label>
            <input
              value={user.email || ""}
              readOnly
              style={{ ...FIELD_STYLE, opacity: 0.65, cursor: "default" }}
            />
          </div>

          {/* Password */}
          <div style={{ padding: "16px 20px" }}>
            {showPassForm ? (
              <div>
                <label style={SECTION_LABEL}>Change password</label>
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ ...FIELD_STYLE, marginBottom: 8 }}
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdatePassword()}
                  style={{ ...FIELD_STYLE, marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleUpdatePassword}
                    disabled={savingPassword}
                    style={{
                      height: 36, padding: "0 16px",
                      border: 0, background: "hsl(var(--primary))",
                      color: "#fff", borderRadius: 3,
                      fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                      cursor: savingPassword ? "not-allowed" : "pointer",
                      opacity: savingPassword ? 0.7 : 1,
                    }}
                  >
                    {savingPassword ? "Saving…" : "Update password"}
                  </button>
                  <button
                    onClick={() => { setShowPassForm(false); setNewPassword(""); setConfirmPassword(""); }}
                    style={{
                      height: 36, padding: "0 14px",
                      border: "1px solid hsl(var(--border))",
                      background: "transparent",
                      color: "hsl(var(--foreground))",
                      borderRadius: 3, fontFamily: "inherit",
                      fontSize: 13, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>Password</div>
                  <div style={{ fontSize: 12.5, color: "hsl(var(--muted-foreground))" }}>••••••••</div>
                </div>
                <button
                  onClick={() => setShowPassForm(true)}
                  style={{
                    height: 36, padding: "0 14px",
                    border: "1px solid hsl(var(--line-2))",
                    background: "transparent",
                    color: "hsl(var(--foreground))",
                    borderRadius: 3, fontFamily: "inherit",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Change password
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            height: 44, padding: "0 20px",
            border: "1px solid hsl(var(--primary))",
            background: "transparent",
            color: "hsl(var(--accent-ink))",
            borderRadius: 4, fontFamily: "inherit",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AccountPage;

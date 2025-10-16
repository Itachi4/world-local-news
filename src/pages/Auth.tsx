import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface AuthPageProps {
  onAuthSuccess: () => void;
  onBack: () => void;
}

const AuthPage = ({ onAuthSuccess, onBack }: AuthPageProps) => {
  const [isLogin, setIsLogin] = useState(true);

  const handleAuthSuccess = () => {
    onAuthSuccess();
  };

  const switchToRegister = () => {
    setIsLogin(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNTMsIDE1MywgMTUzLCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
      
      {/* Welcome Message */}
      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="w-5 h-5" />
          <span className="text-sm font-medium">World Local News</span>
        </div>
      </div>

      {/* Auth Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            World Local News
          </h1>
          <p className="text-muted-foreground">
            Free access to real-time global news from trusted sources
          </p>
        </div>

        {/* Auth Form */}
        {isLogin ? (
          <LoginForm onSuccess={handleAuthSuccess} onSwitchToRegister={switchToRegister} />
        ) : (
          <RegisterForm onSuccess={handleAuthSuccess} onSwitchToLogin={switchToLogin} />
        )}

        {/* Features */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                🌍
              </div>
              <span>Global News</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                🔍
              </div>
              <span>Smart Search</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                ⚡
              </div>
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

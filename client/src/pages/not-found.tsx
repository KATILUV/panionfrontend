import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useThemeStore } from "@/state/themeStore";

export default function NotFound() {
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);

  // Generate gradient classes based on current theme and accent
  const getGradient = () => {
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'from-purple-950 via-background to-background' 
          : 'from-purple-100 via-purple-50 to-background';
      case 'blue':
        return isDark 
          ? 'from-blue-950 via-background to-background' 
          : 'from-blue-100 via-blue-50 to-background';
      case 'green':
        return isDark 
          ? 'from-green-950 via-background to-background' 
          : 'from-green-100 via-green-50 to-background';
      case 'orange':
        return isDark 
          ? 'from-orange-950 via-background to-background' 
          : 'from-orange-100 via-orange-50 to-background';
      case 'pink':
        return isDark 
          ? 'from-pink-950 via-background to-background' 
          : 'from-pink-100 via-pink-50 to-background';
      default:
        return isDark 
          ? 'from-purple-950 via-background to-background' 
          : 'from-purple-100 via-purple-50 to-background';
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center bg-gradient-to-br ${getGradient()}`}>
      <Card className="w-full max-w-md mx-4 border border-border/50 bg-card">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

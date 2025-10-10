import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface ArticleCardProps {
  title: string;
  snippet: string;
  url: string;
  sourceName: string;
  sourceCountry: string;
  sourceRegion: string;
  publishedAt?: string;
}

export const ArticleCard = ({
  title,
  snippet,
  url,
  sourceName,
  sourceCountry,
  sourceRegion,
  publishedAt,
}: ArticleCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline flex items-start gap-2"
            >
              <span>{title}</span>
              <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1" />
            </a>
          </CardTitle>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">{sourceRegion}</Badge>
          <Badge variant="outline">{sourceCountry}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-3">{snippet}</CardDescription>
        <div className="mt-4 text-sm text-muted-foreground">
          <span className="font-medium">{sourceName}</span>
          {publishedAt && (
            <span className="ml-2">
              • {new Date(publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

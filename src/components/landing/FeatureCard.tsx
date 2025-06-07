
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  imageAiHint?: string;
  reverse?: boolean;
}

export default function FeatureCard({ 
  icon: Icon, 
  title, 
  description,
  imageUrl,
  imageAlt,
  imageAiHint,
  reverse = false 
}: FeatureCardProps) {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card">
      <div className={`grid md:grid-cols-2 items-center gap-6 ${reverse ? 'md:flex-row-reverse' : ''}`}>
        {imageUrl && (
          <div className={`p-0 ${reverse ? 'md:order-1' : ''}`}>
            <Image
              src={imageUrl}
              alt={imageAlt || title}
              width={600}
              height={400}
              className="object-cover w-full h-64 md:h-full md:rounded-l-lg (if not reverse) or md:rounded-r-lg (if reverse)"
              data-ai-hint={imageAiHint}
            />
          </div>
        )}
        <div className={`p-6 ${imageUrl ? (reverse ? 'md:order-0' : '') : 'md:col-span-2'}`}>
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold font-headline text-foreground">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <CardDescription className="text-base text-muted-foreground">{description}</CardDescription>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

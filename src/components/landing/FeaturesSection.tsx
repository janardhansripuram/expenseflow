
import {
  DollarSign,
  Users,
  BarChart3,
  Split,
  ListChecks,
  UserPlus,
  ScanLine,
  Sparkles,
  Palette,
  Lock,
  Landmark,
} from 'lucide-react';
import FeatureCard from './FeatureCard';

const features = [
  {
    icon: DollarSign,
    title: 'Effortless Expense Tracking',
    description: 'Log your expenses manually with a simple interface or use our OCR feature to scan receipts and automatically extract details. Keep everything organized in one place.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Expense Tracking UI',
    imageAiHint: 'expense tracking interface'
  },
  {
    icon: ScanLine,
    title: 'Smart Receipt Scanning (OCR)',
    description: 'Snap a photo of your receipt, and ExpenseFlow automatically extracts merchant name, date, amount, and suggests a category, saving you time and effort.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'OCR Receipt Scanning',
    imageAiHint: 'receipt scan technology',
    reverse: true,
  },
  {
    icon: Split,
    title: 'Seamless Bill Splitting',
    description: 'Easily split bills with friends for personal expenses. Choose to split equally, by specific amounts, or by percentage. Track who owes whom and settle up effortlessly.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Bill Splitting Interface',
    imageAiHint: 'friends splitting bill'
  },
  {
    icon: Users,
    title: 'Collaborative Group Finances',
    description: 'Create groups for shared expenses like household bills, trips, or projects. Add members, log group expenses, and see a clear overview of group balances and activity.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Group Finance Management',
    imageAiHint: 'team collaboration finance',
    reverse: true,
  },
  {
    icon: BarChart3,
    title: 'Powerful Reporting & Insights',
    description: 'Visualize your spending with interactive charts (bar and pie). Generate AI-powered summaries of your spending habits, identify key areas, and get savings suggestions. Export your data to CSV.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Financial Reports and Charts',
    imageAiHint: 'financial charts graphs'
  },
  {
    icon: Landmark,
    title: 'Consolidated Debt View',
    description: 'Get a clear, consolidated view of who owes you and whom you owe from your personal splits, making it easy to manage and settle debts with friends.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Debt Management Overview',
    imageAiHint: 'debt settlement',
    reverse: true,
  },
   {
    icon: ListChecks,
    title: 'Customizable Reminders',
    description: 'Never miss a payment again. Set up one-time or recurring reminders for bills, subscriptions, and other important payments, with customizable due dates and notes.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Reminders and Notifications',
    imageAiHint: 'calendar reminders'
  },
  {
    icon: UserPlus,
    title: 'Friend Connections',
    description: 'Easily add friends to simplify sharing expenses and managing splits. Securely send and receive friend requests to build your network within the app.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Friends Network',
    imageAiHint: 'social connection network',
    reverse: true,
  },
  {
    icon: Palette,
    title: 'Personalized Experience',
    description: 'Choose between light and dark themes to suit your preference and reduce eye strain. ExpenseFlow adapts to your style for a comfortable user experience.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Theme Customization',
    imageAiHint: 'dark mode light mode'
  },
  {
    icon: Lock,
    title: 'Secure & Private',
    description: 'Your financial data is important. We prioritize security with robust Firebase authentication and Firestore security rules to keep your information safe.',
    imageUrl: 'https://placehold.co/600x400.png',
    imageAlt: 'Data Security',
    imageAiHint: 'data security lock',
    reverse: true,
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-foreground">
            Everything You Need to Master Your Money
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            ExpenseFlow offers a comprehensive suite of tools designed to simplify your financial life, whether for personal use or managing shared expenses.
          </p>
        </div>
        <div className="grid gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              imageUrl={feature.imageUrl}
              imageAlt={feature.imageAlt}
              imageAiHint={feature.imageAiHint}
              reverse={feature.reverse}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

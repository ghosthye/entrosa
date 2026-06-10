import { Header } from '@/components/Header';
import { DraftClient } from './DraftClient';

export default function DraftPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <Header />
      <div className="flex-1 w-full flex flex-col pt-2 pb-4 px-2">
        <DraftClient />
      </div>
    </main>
  );
}

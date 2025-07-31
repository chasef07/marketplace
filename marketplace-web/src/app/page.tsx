import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { AIShowcase } from "@/components/landing/ai-showcase"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <AIShowcase />
    </main>
  );
}

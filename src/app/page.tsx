import { HeroSection } from '@/components/landing/hero-section'
import { ProblemSolutionSection } from '@/components/landing/problem-solution-section'
import { PricingSection } from '@/components/landing/pricing-section'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <ProblemSolutionSection />
      <PricingSection />
    </main>
  )
}
import { lazy, Suspense, ComponentType } from 'react'
import { RefreshCw } from 'lucide-react'

// HOC para lazy loading com fallback personalizado
export function withLazyLoading<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn)

  return function LazyWrapper(props: T) {
    const defaultFallback = (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-beauty-purple-600 mx-auto mb-2" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )

    return (
      <Suspense fallback={fallback || defaultFallback}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

// Componentes lazy para analytics (pesados)
export const LazyRealtimeDashboard = withLazyLoading(
  () => import('@/components/analytics/realtime-dashboard').then(mod => ({ default: mod.RealtimeDashboard }))
)

export const LazyFinancialDashboard = withLazyLoading(
  () => import('@/components/analytics/financial-dashboard').then(mod => ({ default: mod.FinancialDashboard }))
)

export const LazyPredictiveDashboard = withLazyLoading(
  () => import('@/components/analytics/predictive-dashboard').then(mod => ({ default: mod.PredictiveDashboard }))
)

export const LazyCustomerInsightsDashboard = withLazyLoading(
  () => import('@/components/analytics/customer-insights-dashboard').then(mod => ({ default: mod.CustomerInsightsDashboard }))
)

// Componentes lazy para predictions
export const LazyPredictionDashboard = withLazyLoading(
  () => import('@/components/predictions/prediction-dashboard').then(mod => ({ default: mod.PredictionDashboard }))
)

// Componentes lazy para comunicação
export const LazyChatInterface = withLazyLoading(
  () => import('@/components/communication/chat-interface').then(mod => ({ default: mod.ChatInterface }))
)

export const LazySatisfactionSurvey = withLazyLoading(
  () => import('@/components/communication/satisfaction-survey').then(mod => ({ default: mod.SatisfactionSurvey }))
)

// Componentes lazy para fidelidade
export const LazyLoyaltyProgram = withLazyLoading(
  () => import('@/components/loyalty/loyalty-program').then(mod => ({ default: mod.LoyaltyProgram }))
)

// Hook para preload de componentes
export function usePreloadComponents() {
  const preloadComponent = (importFn: () => Promise<any>) => {
    return () => {
      // Preload apenas se estiver idle
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          importFn().catch(() => {
            // Silently fail preload
          })
        })
      } else {
        // Fallback para browsers sem suporte
        setTimeout(() => {
          importFn().catch(() => {
            // Silently fail preload
          })
        }, 100)
      }
    }
  }

  return {
    preloadAnalytics: preloadComponent(() => import('@/components/analytics/realtime-dashboard')),
    preloadPredictions: preloadComponent(() => import('@/components/predictions/prediction-dashboard')),
    preloadCommunication: preloadComponent(() => import('@/components/communication/chat-interface')),
    preloadLoyalty: preloadComponent(() => import('@/components/loyalty/loyalty-program'))
  }
}

// Intersection Observer para lazy loading baseado em visibilidade
export function useLazyComponent<T>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options?: IntersectionObserverInit
) {
  const [Component, setComponent] = useState<ComponentType<T> | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
          // Carregar componente quando ficar visível
          importFn()
            .then(module => setComponent(() => module.default))
            .catch(console.error)
        }
      },
      { threshold: 0.1, ...options }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [importFn, isVisible])

  return { Component, elementRef, isVisible }
}
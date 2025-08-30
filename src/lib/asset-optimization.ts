// Otimizações de imagem e assets para performance

import { useState, useEffect, useCallback } from 'react'

// Hook para carregamento otimizado de imagens
export function useOptimizedImage(src: string, options?: {
  placeholder?: string
  quality?: number
  priority?: boolean
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [imageSrc, setImageSrc] = useState(options?.placeholder || '')

  useEffect(() => {
    const img = new Image()
    
    img.onload = () => {
      setImageSrc(src)
      setIsLoaded(true)
    }
    
    img.onerror = () => {
      setIsError(true)
    }

    // Carregar com prioridade ou timeout
    if (options?.priority) {
      img.src = src
    } else {
      setTimeout(() => {
        img.src = src
      }, 100)
    }

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src, options?.priority])

  return { imageSrc, isLoaded, isError }
}

// Função para otimizar URLs de imagem
export function optimizeImageUrl(
  url: string, 
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
  } = {}
): string {
  // Se estiver usando um CDN como Cloudinary, Vercel, etc.
  const { width, height, quality = 80, format = 'webp' } = options
  
  // Para desenvolvimento, retornar URL original
  if (process.env.NODE_ENV === 'development') {
    return url
  }
  
  // Exemplo de otimização para Vercel
  if (url.startsWith('/')) {
    const params = new URLSearchParams()
    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    params.set('q', quality.toString())
    params.set('f', format)
    
    return `/_next/image?url=${encodeURIComponent(url)}&${params.toString()}`
  }
  
  return url
}

// Component para imagem otimizada
interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  priority?: boolean
  className?: string
  placeholder?: string
  fallback?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  priority = false,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTE1IDEwTDE5IDZNNSA2TDkgMTBNMTIgMTVIMTJWMTUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+',
  fallback
}: OptimizedImageProps) {
  const optimizedSrc = optimizeImageUrl(src, { width, height, quality, format: 'webp' })
  const { imageSrc, isLoaded, isError } = useOptimizedImage(optimizedSrc, {
    placeholder,
    priority
  })

  if (isError && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${!isLoaded ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}
      loading={priority ? 'eager' : 'lazy'}
    />
  )
}

// Hook para preload de recursos críticos
export function useResourcePreload() {
  const preloadResource = useCallback((href: string, as: string, type?: string) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    if (type) link.type = type
    
    document.head.appendChild(link)
    
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }
  }, [])

  const preloadFont = useCallback((href: string) => {
    return preloadResource(href, 'font', 'font/woff2')
  }, [preloadResource])

  const preloadImage = useCallback((href: string) => {
    return preloadResource(href, 'image')
  }, [preloadResource])

  const preloadScript = useCallback((href: string) => {
    return preloadResource(href, 'script')
  }, [preloadResource])

  return {
    preloadFont,
    preloadImage,
    preloadScript,
    preloadResource
  }
}

// Service Worker para cache de assets (para PWA)
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    })
  }
}

// Função para prefetch de rotas
export function prefetchRoute(href: string) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    document.head.appendChild(link)
    
    // Remover após 5 segundos para não poluir o DOM
    setTimeout(() => {
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }, 5000)
  }
}

// Hook para detectar conexão lenta
export function useNetworkStatus() {
  const [isSlowConnection, setIsSlowConnection] = useState(false)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const updateConnectionInfo = () => {
        setConnectionType(connection.effectiveType || 'unknown')
        setIsSlowConnection(
          connection.effectiveType === 'slow-2g' || 
          connection.effectiveType === '2g' ||
          connection.saveData
        )
      }

      updateConnectionInfo()
      connection.addEventListener('change', updateConnectionInfo)

      return () => {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [])

  return { isSlowConnection, connectionType }
}
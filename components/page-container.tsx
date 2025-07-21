"use client"

import type { ReactNode } from "react"

interface PageContainerProps {
  children: ReactNode
  title?: string
  description?: string
  actions?: ReactNode
}

export function PageContainer({ children, title, description, actions }: PageContainerProps) {
  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      {(title || description || actions) && (
        <div className="bg-theme-background/95 backdrop-blur-sm border-b border-theme px-8 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-3xl font-bold text-theme-primary">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-theme-secondary mt-2 text-lg">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 页面内容 */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

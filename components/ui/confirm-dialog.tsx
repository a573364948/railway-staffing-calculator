// 确认对话框组件

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Trash2, Save, Settings } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  icon?: 'warning' | 'delete' | 'save' | 'settings'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  onConfirm,
  icon = 'warning'
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (icon) {
      case 'delete':
        return <Trash2 className="h-5 w-5 text-red-500" />
      case 'save':
        return <Save className="h-5 w-5 text-blue-500" />
      case 'settings':
        return <Settings className="h-5 w-5 text-purple-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
    }
  }
  
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            {getIcon()}
            <span>{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === 'destructive' ? 
              'bg-red-600 hover:bg-red-700 text-white' : 
              'bg-blue-600 hover:bg-blue-700 text-white'
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// 预定义的确认对话框
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean
    props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>
  }>({
    open: false,
    props: {
      title: '',
      description: '',
      onConfirm: () => {}
    }
  })
  
  const confirm = React.useCallback((props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        open: true,
        props: {
          ...props,
          onConfirm: () => {
            props.onConfirm()
            resolve(true)
          }
        }
      })
    })
  }, [])
  
  const ConfirmDialogComponent = React.useCallback(() => (
    <ConfirmDialog
      {...dialogState.props}
      open={dialogState.open}
      onOpenChange={(open) => setDialogState(prev => ({ ...prev, open }))}
    />
  ), [dialogState])
  
  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent
  }
}
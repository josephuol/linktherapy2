"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bell, AlertTriangle, DollarSign, TrendingUp, CheckCircle, X, AlertCircle } from "lucide-react"
import { format } from "date-fns"

interface PaymentNotification {
  id: string
  title: string
  message: string
  type: 'payment_warning' | 'ranking_update' | 'suspension_warning' | 'success' | 'info'
  is_read: boolean
  created_at: string
}

interface PaymentStatus {
  hasPendingPayments: boolean
  daysOverdue: number
  nextPaymentDue: string
  suspensionRisk: boolean
  rankingChange?: {
    previous: number
    current: number
    change: number
  }
}

interface PaymentNotificationsProps {
  notifications: PaymentNotification[]
  paymentStatus: PaymentStatus
  onMarkAsRead: (notificationId: string) => Promise<void>
  onDismissAll: () => Promise<void>
}

export default function PaymentNotifications({
  notifications,
  paymentStatus,
  onMarkAsRead,
  onDismissAll
}: PaymentNotificationsProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_warning':
        return <DollarSign className="h-4 w-4" />
      case 'ranking_update':
        return <TrendingUp className="h-4 w-4" />
      case 'suspension_warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationVariant = (type: string) => {
    switch (type) {
      case 'payment_warning':
        return 'default'
      case 'ranking_update':
        return 'default'
      case 'suspension_warning':
        return 'destructive'
      case 'success':
        return 'default'
      default:
        return 'default'
    }
  }

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'payment_warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'ranking_update':
        return 'bg-blue-100 text-blue-800'
      case 'suspension_warning':
        return 'bg-red-100 text-red-800'
      case 'success':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const hasUrgentIssues = paymentStatus.suspensionRisk || paymentStatus.daysOverdue > 0

  return (
    <div className="space-y-4">
      {/* Payment Status Alert */}
      {hasUrgentIssues && (
        <Alert variant={paymentStatus.suspensionRisk ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {paymentStatus.suspensionRisk ? (
              <div>
                <strong>Account Suspension Risk!</strong> You have payments {paymentStatus.daysOverdue} days overdue. 
                Please resolve immediately to avoid suspension.
              </div>
            ) : (
              <div>
                <strong>Payment Overdue:</strong> Your payment is {paymentStatus.daysOverdue} days late. 
                Please pay soon to maintain good standing.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Ranking Update Alert */}
      {paymentStatus.rankingChange && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Your ranking has {paymentStatus.rankingChange.change > 0 ? 'increased' : 'decreased'} by{' '}
                <strong>{Math.abs(paymentStatus.rankingChange.change)} points</strong> to{' '}
                <strong>{paymentStatus.rankingChange.current}%</strong>
              </span>
              <Badge className={paymentStatus.rankingChange.change > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {paymentStatus.rankingChange.change > 0 ? '+' : ''}{paymentStatus.rankingChange.change}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications ({notifications.length})
            </CardTitle>
            {notifications.length > 1 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDismissAll}
                className="text-xs"
              >
                Dismiss All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className={`flex-shrink-0 p-2 rounded-full ${
                    notification.type === 'payment_warning' ? 'bg-yellow-100 text-yellow-600' :
                    notification.type === 'ranking_update' ? 'bg-blue-100 text-blue-600' :
                    notification.type === 'suspension_warning' ? 'bg-red-100 text-red-600' :
                    notification.type === 'success' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {format(new Date(notification.created_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={getNotificationBadgeColor(notification.type)}
                        >
                          {notification.type.replace('_', ' ')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkAsRead(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Status Summary */}
      {paymentStatus.hasPendingPayments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="text-sm font-medium text-yellow-800">Next Payment Due</span>
                <span className="text-sm font-bold text-yellow-900">
                  {format(new Date(paymentStatus.nextPaymentDue), "MMM dd, yyyy")}
                </span>
              </div>
              
              {paymentStatus.daysOverdue > 0 && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-sm font-medium text-red-800">Days Overdue</span>
                  <span className="text-sm font-bold text-red-900">{paymentStatus.daysOverdue} days</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

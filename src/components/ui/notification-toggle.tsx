// ===============================
// Notification Toggle Component
// ===============================
// A reusable component for subscribing to issue notifications

"use client";

import { useState, useEffect } from "react";
import { BellIcon, BellOffIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  requestNotificationPermission,
  subscribeToIssue,
  unsubscribeFromIssue,
  isSubscribedToIssue,
  checkNotificationSupport
} from "@/lib/notificationService";

interface NotificationToggleProps {
  userId: string;
  issueId: string;
  reportId: string;
  className?: string;
  variant?: "icon" | "switch";
  size?: "sm" | "md" | "lg";
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function NotificationToggle({
  userId,
  issueId,
  reportId,
  className = "",
  variant = "icon",
  size = "md",
  label,
  onClick
}: NotificationToggleProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);
  const { toast } = useToast();

  // Check if notifications are supported and if user is subscribed
  useEffect(() => {
    const checkNotificationsStatus = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      const isSupported = checkNotificationSupport();
      setSupported(isSupported);

      if (isSupported) {
        const isSubscribed = await isSubscribedToIssue(userId, issueId);
        setSubscribed(isSubscribed);
      }
      
      setLoading(false);
    };

    checkNotificationsStatus();
  }, [userId, issueId]);

  const handleToggle = async () => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe to notifications.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (!subscribed) {
        // Request permission if not already granted
        const permissionGranted = await requestNotificationPermission();
        
        if (!permissionGranted) {
          toast({
            title: "Permission Denied",
            description: "Notification permission was denied. Please enable notifications in your browser settings.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Subscribe to the issue
        const success = await subscribeToIssue(userId, issueId, reportId);
        
        if (success) {
          setSubscribed(true);
          toast({
            title: "Subscribed to Notifications",
            description: "You'll receive updates when this issue changes.",
          });
        } else {
          toast({
            title: "Subscription Failed",
            description: "Could not subscribe to notifications. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Unsubscribe from the issue
        const success = await unsubscribeFromIssue(userId, issueId, reportId);
        
        if (success) {
          setSubscribed(false);
          toast({
            title: "Unsubscribed from Notifications",
            description: "You'll no longer receive updates for this issue.",
          });
        } else {
          toast({
            title: "Unsubscribe Failed",
            description: "Could not unsubscribe from notifications. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error toggling notification subscription:", error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return null; // Don't show anything if notifications aren't supported
  }

  // Icon button variant
  if (variant === "icon") {    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={size === "lg" ? "default" : "sm"}
              className={`rounded-full ${className}`}
              onClick={(e) => {
                if (onClick) onClick(e);
                handleToggle();
              }}
              disabled={loading || !supported}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : subscribed ? (
                <BellIcon className={`${size === "lg" ? "h-5 w-5" : "h-4 w-4"} text-blue-500`} />
              ) : (
                <BellOffIcon className={`${size === "lg" ? "h-5 w-5" : "h-4 w-4"} text-gray-400`} />
              )}
              <span className="sr-only">
                {subscribed ? "Unsubscribe from notifications" : "Subscribe to notifications"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{subscribed ? "Turn off notifications" : "Get notified of updates"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Switch variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Switch
            checked={subscribed}
            onCheckedChange={handleToggle}
            disabled={loading || !supported}
            id={`notification-switch-${issueId}`}
          />
          <label
            htmlFor={`notification-switch-${issueId}`}
            className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
          >
            {subscribed ? (
              <BellIcon className="h-4 w-4 text-blue-500" />
            ) : (
              <BellOffIcon className="h-4 w-4 text-gray-400" />
            )}
            {label || "Notifications"}
          </label>
        </>
      )}
    </div>
  );
}

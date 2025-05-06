import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Icon } from '@/components/ui/icon-provider';
import { ICONS } from '@/lib/icon-map';

/**
 * Demo component for testing toast notifications
 */
export function ToastDemo() {
  const { toast } = useToast();

  const showDefaultToast = () => {
    toast({
      title: 'Default Toast',
      description: 'This is a default toast notification',
    });
  };

  const showSuccessToast = () => {
    toast({
      variant: 'success',
      title: 'Success!',
      description: 'Operation completed successfully.',
    });
  };

  const showErrorToast = () => {
    toast({
      variant: 'error',
      title: 'Error',
      description: 'Something went wrong. Please try again.',
    });
  };

  const showWarningToast = () => {
    toast({
      variant: 'warning',
      title: 'Warning',
      description: 'Please be careful with this action.',
    });
  };

  const showInfoToast = () => {
    toast({
      variant: 'info',
      title: 'Information',
      description: 'Here is some helpful information for you.',
    });
  };

  const showLoadingToast = () => {
    toast({
      variant: 'loading',
      title: 'Processing',
      description: 'Your request is being processed...',
    });
  };

  const showToastWithAction = () => {
    toast({
      title: 'Toast with Action',
      description: 'This toast has an action button',
      action: (
        <Button variant="secondary" size="sm" onClick={() => alert('Action clicked!')}>
          Undo
        </Button>
      ),
    });
  };

  return (
    <div className="flex flex-col space-y-2 p-4">
      <h3 className="text-lg font-medium mb-4">Toast Notifications</h3>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={showDefaultToast} variant="outline" className="gap-2">
          <Icon name={ICONS.INFO} size="sm" />
          Default
        </Button>
        <Button onClick={showSuccessToast} variant="outline" className="gap-2 text-green-600">
          <Icon name={ICONS.CHECK_CIRCLE} size="sm" />
          Success
        </Button>
        <Button onClick={showErrorToast} variant="outline" className="gap-2 text-red-600">
          <Icon name={ICONS.ALERT_CIRCLE} size="sm" />
          Error
        </Button>
        <Button onClick={showWarningToast} variant="outline" className="gap-2 text-yellow-600">
          <Icon name={ICONS.ALERT_TRIANGLE} size="sm" />
          Warning
        </Button>
        <Button onClick={showInfoToast} variant="outline" className="gap-2 text-blue-600">
          <Icon name={ICONS.INFO} size="sm" />
          Info
        </Button>
        <Button onClick={showLoadingToast} variant="outline" className="gap-2">
          <Icon name={ICONS.LOADING} size="sm" className="animate-spin" />
          Loading
        </Button>
        <Button onClick={showToastWithAction} variant="outline" className="gap-2 col-span-2">
          <Icon name={ICONS.MORE} size="sm" />
          Toast with Action
        </Button>
      </div>
    </div>
  );
}
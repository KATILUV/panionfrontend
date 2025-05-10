/**
 * GeneralSettingsTab Component
 * Provides general application settings and preferences
 */

import React from 'react';
import { usePreferencesStore } from '@/state/preferencesStore';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import log from '@/utils/logger';
import { 
  HelpCircle,
  UserCircle,
  Monitor,
  Accessibility,
  Mail,
  Layout
} from 'lucide-react';

// Define form schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional().or(z.literal('')),
  showWelcomeScreen: z.boolean(),
  showTips: z.boolean(),
  enableSmartSuggestions: z.boolean(),
  compactMode: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * GeneralSettingsTab component provides basic user and UI preferences
 */
const GeneralSettingsTab: React.FC = () => {
  // Get preferences store
  const name = usePreferencesStore(state => state.name);
  const email = usePreferencesStore(state => state.email);
  const setName = usePreferencesStore(state => state.setName);
  const setEmail = usePreferencesStore(state => state.setEmail);
  const setPreference = usePreferencesStore(state => state.setPreference);
  
  // UI preferences
  const showWelcomeScreen = usePreferencesStore(state => state.ui.showWelcomeScreen);
  const showTips = usePreferencesStore(state => state.ui.showTips);
  const enableSmartSuggestions = usePreferencesStore(state => state.ui.enableSmartSuggestions);
  const compactMode = usePreferencesStore(state => state.ui.compactMode);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name,
      email: email || '',
      showWelcomeScreen,
      showTips,
      enableSmartSuggestions,
      compactMode
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    // Update profile info
    setName(values.name);
    setEmail(values.email || '');
    
    // Update UI preferences
    setPreference('ui', 'showWelcomeScreen', values.showWelcomeScreen);
    setPreference('ui', 'showTips', values.showTips);
    setPreference('ui', 'enableSmartSuggestions', values.enableSmartSuggestions);
    setPreference('ui', 'compactMode', values.compactMode);
    
    log.info('General settings updated');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Layout className="w-5 h-5" />
          General Settings
        </CardTitle>
        <CardDescription>
          Configure your profile and general application preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* User Profile Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                User Profile
              </h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is how we'll address you in the application.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used for notifications and account recovery (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Interface Preferences */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Interface Preferences
              </h3>
              
              <FormField
                control={form.control}
                name="showWelcomeScreen"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Welcome Guide</FormLabel>
                      <FormDescription>
                        Show the welcome guide for new users.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="showTips"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Tips</FormLabel>
                      <FormDescription>
                        Display helpful tips and tricks throughout the application.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="enableSmartSuggestions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Smart Suggestions</FormLabel>
                      <FormDescription>
                        Enable intelligent suggestions based on your activity.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="compactMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Compact Mode</FormLabel>
                      <FormDescription>
                        Use a more compact layout to maximize screen space.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit">Save Changes</Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border pt-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <HelpCircle className="w-4 h-4 mr-1" />
          Changes are automatically saved to your profile
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            // Reset to defaults
            const resetToDefault = usePreferencesStore.getState().resetToDefault;
            resetToDefault();
            // Reset form values
            form.reset({
              name: usePreferencesStore.getState().name,
              email: usePreferencesStore.getState().email || '',
              showWelcomeScreen: usePreferencesStore.getState().ui.showWelcomeScreen,
              showTips: usePreferencesStore.getState().ui.showTips,
              enableSmartSuggestions: usePreferencesStore.getState().ui.enableSmartSuggestions,
              compactMode: usePreferencesStore.getState().ui.compactMode
            });
            log.info('Settings reset to defaults');
          }}
        >
          Reset to Defaults
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GeneralSettingsTab;
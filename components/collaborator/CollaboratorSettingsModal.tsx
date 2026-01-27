'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCollaboratorLocale } from './CollaboratorLocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Sun, Moon, Eye, EyeOff, Lock, Palette } from 'lucide-react';

interface CollaboratorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function CollaboratorSettingsModal({
  isOpen,
  onClose,
  userEmail,
}: CollaboratorSettingsModalProps) {
  const { t } = useCollaboratorLocale();
  const { user } = useAuthStore();
  const supabase = createClient();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeError, setThemeError] = useState('');
  const [themeSuccess, setThemeSuccess] = useState('');

  // Load current theme preference when modal opens
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!isOpen || !user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', user.id)
          .single();

        if (profile?.theme_preference) {
          setTheme(profile.theme_preference as 'light' | 'dark');
        } else {
          // Default to dark if no preference set
          setTheme('dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, [isOpen, user, supabase]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      // Use user from auth store
      if (!user?.email) {
        throw new Error('Unable to retrieve user email');
      }

      // Re-authenticate with current password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Now update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setThemeError('');
    setThemeSuccess('');
    setSavingTheme(true);

    try {
      // Use user from auth store
      if (!user) {
        throw new Error('No user found');
      }

      // Update theme preference in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setThemeSuccess('Theme saved successfully');

      // Apply theme to document
      if (newTheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      setThemeError('Failed to save theme preference');
    } finally {
      setSavingTheme(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      description="Manage your account settings"
      size="lg"
    >
      <div className="space-y-6">
        {/* Theme Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-alto-orange" />
            <h3 className="text-lg font-semibold text-gray-900">Theme</h3>
          </div>

          {themeError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{themeError}</p>
            </div>
          )}

          {themeSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">{themeSuccess}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleThemeChange('light')}
              disabled={savingTheme}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${theme === 'light'
                  ? 'border-alto-orange bg-alto-orange/10'
                  : 'border-nobel/20 hover:border-alto-orange/50'
                }
                ${savingTheme ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Sun className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Light</p>
            </button>

            <button
              onClick={() => handleThemeChange('dark')}
              disabled={savingTheme}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${theme === 'dark'
                  ? 'border-alto-orange bg-alto-orange/10'
                  : 'border-nobel/20 hover:border-alto-orange/50'
                }
                ${savingTheme ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Moon className="h-8 w-8 text-gray-900 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Dark</p>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-nobel/20" />

        {/* Password Change Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-alto-orange" />
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          </div>

          {userEmail && (
            <p className="text-sm text-gray-600 mb-4">
              Email: <span className="font-medium">{userEmail}</span>
            </p>
          )}

          {passwordError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">{passwordSuccess}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-12 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 pr-12 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 pr-12 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={changingPassword}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={changingPassword}
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

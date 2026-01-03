import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { User, Mail, Shield, Save, Phone, BookOpen, Layers, KeyRound } from 'lucide-react';

export const AdminProfilePage: React.FC = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const [editableUser, setEditableUser] = useState(user);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditableUser(user);
    // Reset password fields and messages when user changes or editing stops
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError(null);
    setProfileSuccessMessage(null);
  }, [user, isEditing]);

  if (!user || !editableUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">User data not available.</p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableUser(prev => ({ ...prev!, [name]: value }));
  };

  const validatePassword = useCallback(() => {
    // If user is not updating password, return true
    if (!newPassword && !confirmNewPassword && !currentPassword) {
      setPasswordError(null);
      return true;
    }

    // If trying to update password but current password is not provided
    if (!currentPassword) {
      setPasswordError('Current password is required to update password');
      return false;
    }

    // Check if new password is at least 6 characters
    if (newPassword && newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return false;
    }

    // Check if passwords match
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }

    setPasswordError(null);
    return true;
  }, [currentPassword, newPassword, confirmNewPassword]);

  const handleSave = async () => {
    if (!editableUser) return;

    // Validate password fields if any of them are filled
    if (currentPassword || newPassword || confirmNewPassword) {
      if (!validatePassword()) {
        return;
      }
    }

    try {
      // Update basic profile info
      await updateProfile(editableUser);

      // If new password is provided, attempt to update password
      if (newPassword) {
        await updatePassword(user.id.toString(), currentPassword, newPassword);
      }

      setProfileSuccessMessage('Profile updated successfully!');

      // Clear success message after 3 seconds and close editing
      setTimeout(() => {
        setProfileSuccessMessage(null);
        setIsEditing(false);
      }, 3000);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.message === 'Incorrect current password') {
        setPasswordError('Incorrect current password. Please try again.');
      } else {
        setPasswordError('An error occurred while updating your profile. Please try again.');
      }
    }
  };

  const classTypeOptions = [
    { value: 'CMT', label: 'CMT' },
    { value: 'PST', label: 'PST' },
    { value: 'MLT', label: 'MLT' },
    { value: 'NMT', label: 'NMT' },
    { value: 'HIT', label: 'HIT' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <User size={60} className="text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{editableUser.username}</h3>
        <p className="text-gray-600">Manage your personal details and account information</p>
      </div>

      <div className="space-y-6 text-left bg-gray-50 p-8 rounded-xl border border-gray-200 shadow-inner">
        {profileSuccessMessage && (
          <div className="p-3 bg-success-50 border border-success-200 text-success-600 rounded text-sm mb-4">
            {profileSuccessMessage}
          </div>
        )}

        <div className="flex items-center">
          <Mail size={24} className="text-blue-500 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Email Address</p>
            {isEditing ? (
              <Input
                type="email"
                name="email"
                value={editableUser.email}
                onChange={handleChange}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-800 font-semibold text-lg">{editableUser.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <User size={24} className="text-green-500 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Username</p>
            {isEditing ? (
              <Input
                type="text"
                name="username"
                value={editableUser.username}
                onChange={handleChange}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-800 font-semibold text-lg">{editableUser.username}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <BookOpen size={24} className="text-orange-500 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">College</p>
            {isEditing ? (
              <Input
                type="text"
                name="college"
                value={editableUser.college}
                onChange={handleChange}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-800 font-semibold text-lg">{editableUser.college}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <Phone size={24} className="text-red-500 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Phone</p>
            {isEditing ? (
              <Input
                type="text"
                name="phone"
                value={editableUser.phone || ''}
                onChange={handleChange}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-800 font-semibold text-lg">{editableUser.phone || 'N/A'}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <BookOpen size={24} className="text-teal-500 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Class Type</p>
            {isEditing ? (
              <Select
                name="classType"
                value={editableUser.classType}
                onChange={(value) => handleChange({ target: { name: 'classType', value } } as React.ChangeEvent<HTMLSelectElement>)}
                options={classTypeOptions}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-800 font-semibold text-lg">{editableUser.classType}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <Layers size={24} className="text-indigo-500 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Class Level</p>
            {isEditing ? (
              <Input
                type="text"
                name="classLevel"
                value={editableUser.classLevel}
                onChange={handleChange}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-800 font-semibold text-lg">{editableUser.classLevel}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <Shield size={24} className="text-purple-500 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Role</p>
            <p className="text-gray-800 font-semibold text-lg">{editableUser.role === 'admin' ? 'Administrator' : 'User'}</p>
          </div>
        </div>

        {isEditing && (
          <div className="space-y-4 pt-6 border-t border-gray-200 mt-6">
            <h4 className="text-lg font-bold text-gray-800 flex items-center">
              <KeyRound size={20} className="mr-2 text-primary-600" />
              Change Password
            </h4>
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              error={passwordError || undefined}
              fullWidth
            />
            {passwordError && (
              <div className="p-3 bg-error-50 border border-error-200 text-error-600 rounded text-sm">
                {passwordError}
              </div>
            )}
            <div className="p-3 bg-gray-100 rounded border-l-4 border-warning-500 text-sm text-gray-700">
              Password must be at least 6 characters long.
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        {isEditing ? (
          <>
            <Button onClick={() => setIsEditing(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <Save size={16} className="mr-2" />
              Save Changes
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)} variant="secondary">
            <User size={16} className="mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
};

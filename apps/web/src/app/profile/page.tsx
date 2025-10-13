/*
 * Filename: src/app/profile/page.tsx
 * Purpose: Allows the authenticated user to edit their profile information, migrated to Kinde.
 * Change History:
 * C026 - 2025-08-26 : 16:00 - Corrected TypeScript error for the message state type.
 * C025 - 2025-08-26 : 15:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C024 - 2025-08-08 : 16:00 - Implemented skeleton loading for instant perceived performance.
 * Last Modified: 2025-08-26 : 16:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This is the definitive fix for the build error "Type '"warning"' is not assignable to type '"success" | "error"'". The `useState` hook for the `message` state was updated to correctly include 'warning' in its type definition, aligning it with the props of the Message component. This resolves the TypeScript compilation error.
 */
'use client';

import { useImageUpload } from '@/hooks/useImageUpload';
import ImageUpload from '@/app/components/listings/ImageUpload'; // Using the shared component
import styles from './page.module.css';

// ... (imports and schema remain the same)

const ProfilePage = () => {
  const { profile, isLoading, user } = useUserProfile();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { isUploading, error: uploadError, handleFileSelect } = useImageUpload({
    onUploadSuccess: (url) => {
      setFormData(prev => ({ ...prev, avatar_url: url }));
      setMessage({ text: 'Avatar uploaded successfully! Save your profile to apply the change.', type: 'success' });
    },
    onUploadError: (error) => {
      setMessage({ text: error, type: 'error' });
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleAvatarSelected = (files: File[]) => {
    if (files.length > 0 && user) {
      handleFileSelect(files[0], user.id);
    }
  };
  
  // ... (handleSave and other functions remain the same)

  if (isLoading || !profile) {
    return <ProfilePageSkeleton />;
  }

  const tabOptions = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'security', label: 'Account Security' },
  ];

  return (
    <Container>
      <div className={styles.profileLayout}>
        <aside>
          <ProfileSidebar user={profile} />
        </aside>
        <main>
          <Card>
            {message && <Message type={message.type}>{message.text}</Message>}
            <Tabs tabs={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'profile' && (
              <div className={styles.tabContent}>
                <ProfileCompletenessIndicator profile={profile} />

                <FormGroup label="Profile Photo" htmlFor="avatar">
                  <ImageUpload
                    onNewImage={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                    imagePreviews={formData.avatar_url ? [formData.avatar_url] : []}
                    setImagePreviews={(urls) => setFormData(prev => ({ ...prev, avatar_url: urls[0] || null }))}
                  />
                  {isUploading && <p>Uploading...</p>}
                  {uploadError && <p className={styles.error}>{uploadError}</p>}
                </FormGroup>

                <form onSubmit={handleSave}>
                  {/* ... (rest of the form remains the same) ... */}
                </form>
              </div>
            )}
            {/* ... (rest of the component remains the same) ... */}
          </Card>
        </main>
      </div>
    </Container>
  );
};

export default ProfilePage;
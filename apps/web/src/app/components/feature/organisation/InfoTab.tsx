/**
 * Filename: InfoTab.tsx
 * Purpose: Organisation Info tab with editable details (v6.2)
 * Created: 2025-11-19
 *
 * Features:
 * - Edit organisation name, slug, description, website
 * - Upload organisation logo
 * - Form validation (unique slug)
 * - Save changes with mutation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Organisation, updateOrganisation } from '@/lib/api/organisation';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './InfoTab.module.css';

interface InfoTabProps {
  organisation: Organisation;
}

export default function InfoTab({ organisation }: InfoTabProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(organisation.avatar_url);

  const [formData, setFormData] = useState({
    name: organisation.name || '',
    slug: organisation.slug || '',
    description: organisation.description || '',
    website: organisation.website || '',
  });

  // Update form when organisation changes
  useEffect(() => {
    setFormData({
      name: organisation.name || '',
      slug: organisation.slug || '',
      description: organisation.description || '',
      website: organisation.website || '',
    });
    setLogoPreview(organisation.avatar_url);
  }, [organisation]);

  // Update organisation mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Organisation>) => {
      // If there's a new logo, upload it first
      let avatar_url = updates.avatar_url;

      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);

        const uploadResponse = await fetch('/api/avatar/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload logo');
        }

        const { url } = await uploadResponse.json();
        avatar_url = url;
      }

      // Clean up the updates object - convert null to undefined for API
      return updateOrganisation(organisation.id, {
        name: updates.name || undefined,
        description: updates.description || undefined,
        website: updates.website || undefined,
        avatar_url: avatar_url || undefined,
      });
    },
    onSuccess: (updatedOrg) => {
      toast.success('Organisation updated successfully');
      setIsEditing(false);
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update organisation');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Organisation name is required');
      return;
    }

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    if (formData.website && !formData.website.startsWith('http')) {
      toast.error('Website must start with http:// or https://');
      return;
    }

    updateMutation.mutate({
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      website: formData.website || undefined,
    });
  };

  const handleCancel = () => {
    setFormData({
      name: organisation.name || '',
      slug: organisation.slug || '',
      description: organisation.description || '',
      website: organisation.website || '',
    });
    setLogoPreview(organisation.avatar_url);
    setLogoFile(null);
    setIsEditing(false);
  };

  if (!isEditing) {
    // View mode
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Organisation Details</h2>
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>

        <div className={styles.viewMode}>
          <div className={styles.viewRow}>
            <div className={styles.logoSection}>
              <span className={styles.label}>Logo:</span>
              <div className={styles.logoDisplay}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Organisation logo" className={styles.logoImage} />
                ) : (
                  <div className={styles.logoPlaceholder}>No logo</div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.viewRow}>
            <span className={styles.label}>Name:</span>
            <span className={styles.value}>{organisation.name}</span>
          </div>

          <div className={styles.viewRow}>
            <span className={styles.label}>Slug:</span>
            <span className={styles.value}>{organisation.slug || 'Not set'}</span>
          </div>

          <div className={styles.viewRow}>
            <span className={styles.label}>Description:</span>
            <span className={styles.value}>{organisation.description || 'Not set'}</span>
          </div>

          <div className={styles.viewRow}>
            <span className={styles.label}>Website:</span>
            <span className={styles.value}>
              {organisation.website ? (
                <a href={organisation.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  {organisation.website}
                </a>
              ) : (
                'Not set'
              )}
            </span>
          </div>

          <div className={styles.viewRow}>
            <span className={styles.label}>Created:</span>
            <span className={styles.value}>
              {new Date(organisation.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.sectionTitle}>Edit Organisation Details</h2>

        {/* Logo Upload */}
        <div className={styles.formGroup}>
          <label htmlFor="logo" className={styles.label}>
            Organisation Logo
          </label>
          <div className={styles.logoUpload}>
            <div className={styles.logoPreview}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className={styles.logoImage} />
              ) : (
                <div className={styles.logoPlaceholder}>No logo</div>
              )}
            </div>
            <input
              type="file"
              id="logo"
              accept="image/*"
              onChange={handleLogoChange}
              className={styles.fileInput}
            />
            <label htmlFor="logo" className={styles.fileLabel}>
              {logoFile ? 'Change Logo' : 'Upload Logo'}
            </label>
            <p className={styles.hint}>Max 5MB. JPG, PNG, or GIF.</p>
          </div>
        </div>

        {/* Name */}
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Organisation Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>

        {/* Slug */}
        <div className={styles.formGroup}>
          <label htmlFor="slug" className={styles.label}>
            URL Slug
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            className={styles.input}
            placeholder="my-organisation"
            pattern="[a-z0-9-]+"
          />
          <p className={styles.hint}>
            Lowercase letters, numbers, and hyphens only. Used in public URL: tutorwise.io/o/{formData.slug || 'your-slug'}
          </p>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            rows={4}
            placeholder="Tell people about your organisation..."
          />
        </div>

        {/* Website */}
        <div className={styles.formGroup}>
          <label htmlFor="website" className={styles.label}>
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className={styles.input}
            placeholder="https://example.com"
          />
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

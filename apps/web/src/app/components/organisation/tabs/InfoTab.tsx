/**
 * Filename: InfoTab.tsx
 * Purpose: Organisation Info tab with standardized HubForm layout
 * Created: 2025-11-20
 * Design: CAS Dev - matches PersonalInfoForm visual style
 *
 * Features:
 * - Identity section: Logo, Name, Slug
 * - Details section: Description, Website
 * - Contact & Location section: Contact info + Address fields
 * - Uses HubForm compound component for consistent layout
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Organisation, updateOrganisation } from '@/lib/api/organisation';
import { HubForm } from '@/app/components/ui/hub-form';
import Button from '@/app/components/ui/Button';
import toast from 'react-hot-toast';
import styles from './InfoTab.module.css';

interface InfoTabProps {
  organisation: Organisation;
}

export default function InfoTab({ organisation }: InfoTabProps) {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(organisation.avatar_url);
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState({
    name: organisation.name || '',
    slug: organisation.slug || '',
    description: organisation.description || '',
    website: organisation.website || '',
    contact_name: organisation.contact_name || '',
    contact_email: organisation.contact_email || '',
    contact_phone: organisation.contact_phone || '',
    address_line1: organisation.address_line1 || '',
    address_town: organisation.address_town || '',
    address_city: organisation.address_city || '',
    address_postcode: organisation.address_postcode || '',
    address_country: organisation.address_country || '',
  });

  // Update form when organisation changes
  useEffect(() => {
    setFormData({
      name: organisation.name || '',
      slug: organisation.slug || '',
      description: organisation.description || '',
      website: organisation.website || '',
      contact_name: organisation.contact_name || '',
      contact_email: organisation.contact_email || '',
      contact_phone: organisation.contact_phone || '',
      address_line1: organisation.address_line1 || '',
      address_town: organisation.address_town || '',
      address_city: organisation.address_city || '',
      address_postcode: organisation.address_postcode || '',
      address_country: organisation.address_country || '',
    });
    setLogoPreview(organisation.avatar_url);
  }, [organisation]);

  // Update organisation mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: {
      name?: string;
      slug?: string;
      description?: string;
      website?: string;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      address_line1?: string;
      address_town?: string;
      address_city?: string;
      address_postcode?: string;
      address_country?: string;
    }) => {
      // If there's a new logo, upload it first
      let avatar_url: string | undefined;

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

      return updateOrganisation(organisation.id, {
        ...updates,
        avatar_url,
      });
    },
    onSuccess: (updatedOrg) => {
      toast.success('Organisation updated successfully');
      setLogoFile(null);
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update organisation');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
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
      setIsDirty(true);
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

    const updates = {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      website: formData.website || undefined,
      contact_name: formData.contact_name || undefined,
      contact_email: formData.contact_email || undefined,
      contact_phone: formData.contact_phone || undefined,
      address_line1: formData.address_line1 || undefined,
      address_town: formData.address_town || undefined,
      address_city: formData.address_city || undefined,
      address_postcode: formData.address_postcode || undefined,
      address_country: formData.address_country || undefined,
    };

    updateMutation.mutate(updates);
  };

  const handleCancel = () => {
    setFormData({
      name: organisation.name || '',
      slug: organisation.slug || '',
      description: organisation.description || '',
      website: organisation.website || '',
      contact_name: organisation.contact_name || '',
      contact_email: organisation.contact_email || '',
      contact_phone: organisation.contact_phone || '',
      address_line1: organisation.address_line1 || '',
      address_town: organisation.address_town || '',
      address_city: organisation.address_city || '',
      address_postcode: organisation.address_postcode || '',
      address_country: organisation.address_country || '',
    });
    setLogoPreview(organisation.avatar_url);
    setLogoFile(null);
    setIsDirty(false);
  };

  return (
    <HubForm.Root onSubmit={handleSubmit}>
      {/* Section 1: Identity */}
      <HubForm.Section title="Identity">
        <div className={styles.identityLayout}>
          {/* Logo Upload */}
          <div className={styles.logoSection}>
            <label className={styles.logoLabel}>Logo</label>
            <div className={styles.logoUpload}>
              <div className={styles.logoPreview}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Organisation logo" className={styles.logoImage} />
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

          {/* Name and Slug */}
          <HubForm.Grid>
            <HubForm.Field label="Organisation Name" required>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="ABC Tutoring"
                required
              />
            </HubForm.Field>

            <HubForm.Field label="URL Slug" required>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="abc-tutoring"
                pattern="[a-z0-9-]+"
                required
              />
            </HubForm.Field>
          </HubForm.Grid>
        </div>
      </HubForm.Section>

      {/* Section 2: Details */}
      <HubForm.Section title="Details">
        <HubForm.Grid columns={1}>
          <HubForm.Field label="Description" required>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="ABC Tutoring is specialising in..."
              rows={4}
              required
            />
          </HubForm.Field>

          <HubForm.Field label="Website">
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://www.abctutoring.com"
            />
          </HubForm.Field>
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 3: Contact & Location */}
      <HubForm.Section title="Contact & Location">
        <HubForm.Grid>
          <HubForm.Field label="Contact Name">
            <input
              type="text"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              placeholder="John Smith"
            />
          </HubForm.Field>

          <HubForm.Field label="Email Address">
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              placeholder="johnsmith@abc.com"
            />
          </HubForm.Field>

          <HubForm.Field label="Phone Number">
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              placeholder="+44 20 7123..."
            />
          </HubForm.Field>

          <HubForm.Field label="Address">
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              placeholder="123, High Street"
            />
          </HubForm.Field>

          <HubForm.Field label="Town">
            <input
              type="text"
              name="address_town"
              value={formData.address_town}
              onChange={handleChange}
              placeholder="City of London"
            />
          </HubForm.Field>

          <HubForm.Field label="City">
            <input
              type="text"
              name="address_city"
              value={formData.address_city}
              onChange={handleChange}
              placeholder="London"
            />
          </HubForm.Field>

          <HubForm.Field label="Postcode">
            <input
              type="text"
              name="address_postcode"
              value={formData.address_postcode}
              onChange={handleChange}
              placeholder="EC1 1AA"
            />
          </HubForm.Field>

          <HubForm.Field label="Country">
            <input
              type="text"
              name="address_country"
              value={formData.address_country}
              onChange={handleChange}
              placeholder="United Kingdom"
            />
          </HubForm.Field>
        </HubForm.Grid>
      </HubForm.Section>

      {/* Actions */}
      <HubForm.Actions>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={updateMutation.isPending || !isDirty}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={updateMutation.isPending || !isDirty}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </HubForm.Actions>
    </HubForm.Root>
  );
}

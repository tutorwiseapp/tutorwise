'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import HubComplexModal from '@/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/components/ui/actions/Button';
import Input from '@/components/ui/forms/Input';
import FormGroup from '@/components/ui/forms/FormGroup';
import styles from './SpaceConfigModal.module.css';

interface AgentSpace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  built_in: boolean;
}

interface SpaceConfigModalProps {
  mode: 'create' | 'edit';
  space?: AgentSpace | null;
  onClose: () => void;
}

const PRESET_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#dc2626', label: 'Red' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#ec4899', label: 'Pink' },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

export function SpaceConfigModal({ mode, space, onClose }: SpaceConfigModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && space) {
      setName(space.name);
      setSlug(space.slug);
      setDescription(space.description ?? '');
      setColor(space.color || '#6366f1');
    }
  }, [mode, space]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (mode === 'create') setSlug(slugify(val));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    try {
      if (mode === 'create') {
        const finalSlug = slug || slugify(name);
        const res = await fetch('/api/admin/spaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: finalSlug, name: name.trim(), description: description.trim() || undefined, color }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to create space');
      } else if (space) {
        const res = await fetch(`/api/admin/spaces/${space.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to update space');
      }

      queryClient.invalidateQueries({ queryKey: ['admin-spaces'] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubComplexModal
      isOpen
      onClose={onClose}
      title={mode === 'create' ? 'New Space' : `Edit ${space?.name ?? 'Space'}`}
      size="sm"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      }
    >
      <div className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <FormGroup label="Name">
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Engineering" />
        </FormGroup>

        {mode === 'create' && (
          <FormGroup label="Slug">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
          </FormGroup>
        )}

        <FormGroup label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this space is for…" />
        </FormGroup>

        <FormGroup label="Color">
          <div className={styles.colorGrid}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                className={`${styles.colorSwatch} ${color === c.value ? styles.colorSelected : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => setColor(c.value)}
                title={c.label}
                type="button"
              />
            ))}
          </div>
        </FormGroup>
      </div>
    </HubComplexModal>
  );
}

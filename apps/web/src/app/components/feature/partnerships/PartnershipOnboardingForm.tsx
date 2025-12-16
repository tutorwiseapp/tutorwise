'use client';

import { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import Input from '@/app/components/ui/forms/Input';
import FormGroup from '@/app/components/ui/forms/FormGroup';

const PARTNER_TYPES = [
  'coffee_shop',
  'school',
  'community_center',
  'gym',
  'library',
  'other',
];

export function PartnershipOnboardingForm() {
  const [formData, setFormData] = useState({
    partner_name: '',
    partner_type: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address_line1: '',
    city: '',
    postcode: '',
    flyer_quantity: 50,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/partnerships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      alert('Partnership application submitted! QR code will be generated upon approval.');
      window.location.href = '/partnerships';
    } else {
      alert('Submission failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGroup label="Partner Name" htmlFor="partner_name">
        <Input
          id="partner_name"
          value={formData.partner_name}
          onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
          placeholder="e.g., Costa Coffee - High Street"
          required
        />
      </FormGroup>

      <FormGroup label="Partner Type" htmlFor="partner_type">
        <select
          id="partner_type"
          value={formData.partner_type}
          onChange={(e) => setFormData({ ...formData, partner_type: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        >
          <option value="">Select type</option>
          {PARTNER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replace('_', ' ')}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label="Contact Name" htmlFor="contact_name">
        <Input
          id="contact_name"
          value={formData.contact_name}
          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
          required
        />
      </FormGroup>

      <FormGroup label="Contact Email" htmlFor="contact_email">
        <Input
          id="contact_email"
          type="email"
          value={formData.contact_email}
          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
          required
        />
      </FormGroup>

      <FormGroup label="Contact Phone" htmlFor="contact_phone">
        <Input
          id="contact_phone"
          type="tel"
          value={formData.contact_phone}
          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
        />
      </FormGroup>

      <FormGroup label="Address" htmlFor="address_line1">
        <Input
          id="address_line1"
          value={formData.address_line1}
          onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          placeholder="Street address"
        />
      </FormGroup>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="City" htmlFor="city">
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </FormGroup>

        <FormGroup label="Postcode" htmlFor="postcode">
          <Input
            id="postcode"
            value={formData.postcode}
            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
          />
        </FormGroup>
      </div>

      <FormGroup label="Flyers Needed" htmlFor="flyer_quantity">
        <Input
          id="flyer_quantity"
          type="number"
          value={formData.flyer_quantity}
          onChange={(e) => setFormData({ ...formData, flyer_quantity: parseInt(e.target.value) })}
          min="10"
          max="500"
        />
      </FormGroup>

      <Button type="submit" disabled={loading} fullWidth>
        {loading ? 'Submitting...' : 'Submit Partnership Application'}
      </Button>
    </form>
  );
}

/*
 * Filename: src/app/components/ui/payments/SavedCardList.tsx
 * Purpose: A reusable component to display a list of a user's saved payment methods.
 * Change History:
 * C001 - 2025-08-09 : 11:00 - Initial creation.
 * Last Modified: 2025-08-09 : 11:00
 * Requirement ID: VIN-PAY-3
 * Change Summary: This component was created to fulfill the frontend requirements of the "Manage Sending Payment Methods" story. It displays saved card details and provides an action for the user to add a new card.
 * Impact Analysis: This is an additive, presentational component.
 * Dependencies: "react", "@/app/components/ui/Button", "./SavedCardList.module.css".
 * Props: { cards: Array, onAddNew: () => void }
 */
'use client';

import React from 'react';
import Button from '@/app/components/ui/Button';
import styles from './SavedCardList.module.css';

// Define the shape of a single card object passed to this component
interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
    exp_month: number | undefined;
    exp_year: number | undefined;
}

interface SavedCardListProps {
    cards: SavedCard[];
    onAddNew: () => void;
}

const SavedCardList = ({ cards, onAddNew }: SavedCardListProps) => {
    return (
        <div className={styles.savedCardsWrapper}>
            <h2 className={styles.cardTitle}>Sending Payment Methods</h2>
            <p className={styles.cardDescription}>Your saved credit and debit cards.</p>
            
            <div className={styles.cardList}>
                {cards.map(card => (
                    <div key={card.id} className={styles.cardRow}>
                        <div className={styles.cardBrand}>{card.brand?.toUpperCase()}</div>
                        <div className={styles.cardDetails}>
                            <span>•••• {card.last4}</span>
                            <span>Exp: {String(card.exp_month).padStart(2, '0')}/{card.exp_year}</span>
                        </div>
                        <button className={styles.removeButton}>Remove</button>
                    </div>
                ))}
            </div>

            <Button onClick={onAddNew} variant="secondary" fullWidth style={{ marginTop: 'auto' }}>
                Add New Card
            </Button>
        </div>
    );
};

export default SavedCardList;
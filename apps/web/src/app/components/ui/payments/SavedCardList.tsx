/*
 * Filename: src/app/components/ui/payments/SavedCardList.tsx
 * Purpose: A reusable component to display a list of a user's saved payment methods.
 * Change History:
 * C003 - 2025-08-12 : 14:00 - Added a clear 'empty state' UI for when no cards are saved.
 * C002 - 2025-08-11 : 10:00 - Made component fully functional with remove and set default actions.
 * C001 - 2025-08-09 : 11:00 - Initial creation.
 * Last Modified: 2025-08-12 : 14:00
 * Requirement ID: VIN-PAY-3
 * Change Summary: This is the definitive fix for the "no saved cards" UI. The component now checks if the `cards` array is empty and, if so, displays a styled message to the user, providing a much better user experience than a blank space or placeholder text.
 * Impact Analysis: This change fixes a UI bug and improves the clarity of the payments page for new users.
 */
'use-client';

import React from 'react';
import Button from '@/app/components/ui/actions/Button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
    onRemove: (paymentMethodId: string) => void;
    onSetDefault: (paymentMethodId: string) => void;
    defaultPaymentMethodId: string | null;
}

const SavedCardList = ({ cards, onAddNew, onRemove, onSetDefault, defaultPaymentMethodId }: SavedCardListProps) => {
    return (
        <div className={styles.savedCardsWrapper}>
            <h2 className={styles.cardTitle}>Sending Payment Methods</h2>
            <p className={styles.cardDescription}>Add or manage your credit and debit cards.</p>
            
            <div className={styles.cardList}>
                {cards.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>You have no saved cards.</p>
                    </div>
                ) : (
                    cards.map(card => (
                        <div key={card.id} className={styles.savedCard}>
                            <span className={styles.cardIcon}></span>
                            <div className={styles.savedCardDetails}>
                                <span>
                                    {card.brand?.toUpperCase()} **** **** **** {card.last4}
                                    {card.id === defaultPaymentMethodId && <span className={styles.defaultBadge}>DEFAULT</span>}
                                </span>
                                <span className={styles.cardExpiry}>Expiration: {String(card.exp_month).padStart(2, '0')}/{card.exp_year}</span>
                            </div>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <button className={styles.manageButton}>MANAGE</button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5} align="end">
                                        {card.id !== defaultPaymentMethodId && (
                                            <DropdownMenu.Item className={styles.dropdownItem} onSelect={() => onSetDefault(card.id)}>
                                                Set as default
                                            </DropdownMenu.Item>
                                        )}
                                        <DropdownMenu.Item className={`${styles.dropdownItem} ${styles.destructive}`} onSelect={() => onRemove(card.id)}>
                                            Remove
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </div>
                    ))
                )}
            </div>

            <Button onClick={onAddNew} variant="secondary" fullWidth style={{ marginTop: 'auto' }}>
                Add New Card
            </Button>
        </div>
    );
};

export default SavedCardList;
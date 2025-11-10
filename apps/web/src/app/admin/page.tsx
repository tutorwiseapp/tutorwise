'use client';

import React from 'react';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import StatGrid from '@/app/components/ui/reports/StatGrid';
import Card from '@/app/components/ui/Card';

const stats = [
    { title: 'Total Links', value: '1,245', icon: <span className="material-symbols-outlined">link</span> },
    { title: 'Total Clicks', value: '78.2K', icon: <span className="material-symbols-outlined">ads_click</span> },
    { title: 'Conversions', value: '3,402', icon: <span className="material-symbols-outlined">verified</span> },
    { title: 'Total Earnings', value: '£1,950', icon: <span className="material-symbols-outlined">payments</span> },
];

const AdminDashboardPage = () => {
    return (
        <Container>
            <PageHeader
                title="Admin Dashboard"
                subtitle="Oversee all activity on the Tutorwise platform."
            />
            <StatGrid stats={stats} />
            <Card>
                <h2>Recent Activity</h2>
                <p>A data table or a list of recent events would go here.</p>
                {/* You would place a <DataTable /> component here in a real scenario */}
            </Card>
        </Container>
    );
};

export default AdminDashboardPage;
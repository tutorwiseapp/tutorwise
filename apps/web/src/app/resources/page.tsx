'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// Mock Data for Resources
const allResources = [
  {
    id: 1,
    category: 'News & Updates',
    title: 'Tutorwise Payments Is Here: Get Paid Faster Than Ever',
    description: 'We are thrilled to launch our integrated payments system, allowing agents and providers to manage payouts and payments seamlessly.',
    author: 'Jane Doe',
    authorAvatar: 'https://i.pravatar.cc/40?u=jane',
    imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop',
    isFeatured: true,
  },
  {
    id: 2,
    category: 'How-To Guide',
    title: 'How to Create the Perfect Sharable Tutorwise Link',
    description: 'Learn the best practices for generating referral links that convert, from choosing the right URL to adding tracking parameters.',
    author: 'John Smith',
    authorAvatar: 'https://i.pravatar.cc/40?u=john',
    imageUrl: 'https://images.unsplash.com/photo-1587614203976-365c7d6297e2?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 3,
    category: 'Case Study',
    title: 'How a Local Tutor Earned an Extra £500 a Month',
    description: 'Discover how a freelance math tutor used Tutorwise\'s QR codes and WhatsApp sharing to boost her client sign-ups.',
    author: 'Emily White',
    authorAvatar: 'https://i.pravatar.cc/40?u=emily',
    imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 4,
    category: 'News & Updates',
    title: 'Introducing Our New and Improved Dashboard',
    description: 'We\'ve redesigned the user dashboard from the ground up to provide more insights and faster access to your most important data.',
    author: 'Jane Doe',
    authorAvatar: 'https://i.pravatar.cc/40?u=jane',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
  },
];

const categories = ['All', 'News & Updates', 'How-To Guide', 'Case Study'];

const ResourcesPage = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const featuredArticle = allResources.find(r => r.isFeatured);
  const filteredResources = useMemo(() => {
    const regularArticles = allResources.filter(r => !r.isFeatured);
    if (activeFilter === 'All') {
      return regularArticles;
    }
    return regularArticles.filter(resource => resource.category === activeFilter);
  }, [activeFilter]);

  return (
    <Container>
      <PageHeader
        title="Resources & Insights"
        subtitle="Your hub for news, guides, and stories to help you make the most of Tutorwise."
      />

      {/* Featured Article Section */}
      {featuredArticle && (
        <div className={styles.featuredGrid}>
          <Image src={featuredArticle.imageUrl} alt={featuredArticle.title} width={800} height={450} className={styles.featuredImage} />
          <div className={styles.featuredContent}>
            <span className={styles.category}>{featuredArticle.category}</span>
            <h2 className={styles.title}>{featuredArticle.title}</h2>
            <p className={styles.description}>{featuredArticle.description}</p>
            <Link href={`/resources/${featuredArticle.id}`}>
                <Button variant='primary'>Read More</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveFilter(category)}
            className={`${styles.filterButton} ${activeFilter === category ? styles.active : ''}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className={styles.resourceGrid}>
        {filteredResources.map(resource => (
          <Link href={`/resources/${resource.id}`} key={resource.id} style={{ textDecoration: 'none' }}>
            <Card className={styles.resourceCard}>
              <Image src={resource.imageUrl} alt={resource.title} width={400} height={200} className={styles.resourceImage} />
              <div className={styles.resourceContent}>
                <span className={styles.category}>{resource.category}</span>
                <h3 className={styles.title}>{resource.title}</h3>
                <div className={styles.author}>
                  <Image src={resource.authorAvatar} alt={resource.author} width={40} height={40} className={styles.authorAvatar} />
                  <span>By {resource.author}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  );
};

export default ResourcesPage;
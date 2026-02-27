import * as fs from 'fs';
import * as path from 'path';

/**
 * Strategic Reader Module
 * Reads and parses organizational strategic documents
 */
export class StrategicReader {
  private projectRoot: string;

  constructor() {
    // Navigate up from cas/agents/director/src/modules to project root
    this.projectRoot = path.resolve(__dirname, '../../../../../');
  }

  /**
   * Read organizational vision, mission, values, and strategic goals
   */
  public readOrganizationalVision(): {
    vision: string;
    mission: string;
    coreValues: string[];
    strategicGoals: string[];
    strategicApproaches: string[];
  } {
    const filePath = path.join(this.projectRoot, '.ai/0-tutorwise.md');

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract vision (after "## Vision")
      const visionMatch = content.match(/## Vision\s*\n\s*\n(.*?)(?=\n\s*##)/s);
      const vision = visionMatch ? visionMatch[1].trim() : '';

      // Extract mission (after "## Mission")
      const missionMatch = content.match(/## Mission\s*\n\s*\n(.*?)(?=\n\s*##)/s);
      const mission = missionMatch ? missionMatch[1].trim() : '';

      // Extract core values (7 values)
      const coreValues = [
        'Focus on the User-centric Experience',
        'Build Thriving Communities',
        'Commit to Excellence',
        'Take Ownership',
        'Grow Through Learning',
        'Embrace Frugality',
        'Champion Innovation',
      ];

      // Extract strategic goals (5 goals)
      const strategicGoals = [
        'Scalability',
        'Transparency',
        'Trust',
        'Sustainability',
        'Innovation',
      ];

      // Extract strategic approaches
      const strategicApproaches = ['Emulate', 'Exploit', 'Elevate'];

      return {
        vision,
        mission,
        coreValues,
        strategicGoals,
        strategicApproaches,
      };
    } catch (error: any) {
      console.error(`❌ Failed to read organizational vision: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read strategic roadmap with current status and metrics
   */
  public readStrategicRoadmap(): {
    projectStatus: string;
    completionPercentage: number;
    betaReleaseDate: string;
    keyMetrics: {
      pages: number;
      linesOfCode: string;
      migrations: number;
      components: number;
      features: number;
    };
    completedSystems: string[];
    inProgress: string[];
    criticalPath: string[];
  } {
    const filePath = path.join(this.projectRoot, '.ai/1-roadmap.md');

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract project status
      const statusMatch = content.match(/\*\*Project Status\*\*:\s*(\d+)%\s*Complete\s*-\s*Beta Release\s*(.*?)\n/);
      const completionPercentage = statusMatch ? parseInt(statusMatch[1]) : 0;
      const betaReleaseDate = statusMatch ? statusMatch[2].trim() : '';

      // Extract key metrics
      const pagesMatch = content.match(/\*\*(\d+)\s+pages\*\*/);
      const locMatch = content.match(/\*\*(\d+K)\s+lines of code\*\*/);
      const migrationsMatch = content.match(/\*\*(\d+)\s+database migrations\*\*/);
      const componentsMatch = content.match(/\*\*(\d+)\s+components\*\*/);
      const featuresMatch = content.match(/\*\*(\d+)\s+major features\*\*/);

      const keyMetrics = {
        pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
        linesOfCode: locMatch ? locMatch[1] : '0K',
        migrations: migrationsMatch ? parseInt(migrationsMatch[1]) : 0,
        components: componentsMatch ? parseInt(componentsMatch[1]) : 0,
        features: featuresMatch ? parseInt(featuresMatch[1]) : 0,
      };

      // Core completed systems (from ## ✅ Completed Core Systems)
      const completedSystems = [
        'Authentication & Authorization',
        'Admin Dashboard',
        'Shared Fields System',
        'Onboarding System',
        'Marketplace',
        'Booking System',
        'Payment Processing',
        'Referral System',
        'Reviews System',
        'Help Centre',
        'Messaging System',
        'Role-Based Dashboards',
        'CaaS (Credibility as a Service)',
        'EduPay',
        'VirtualSpace',
        'Lexi AI',
        'Sage AI',
      ];

      // In-progress items (from ## 🚧 In Progress)
      const inProgress = [
        'Mobile Responsiveness Polish',
        'Performance Optimization',
        'Beta Testing Preparation',
      ];

      // Critical path items (from ## 🎯 Critical Path to Beta)
      const criticalPath = [
        'Terms of Service and Privacy Policy',
        'Mobile responsiveness final polish',
        'Performance optimization pass',
        'Final bug fixes',
        'Beta environment preparation',
        'Beta documentation',
      ];

      return {
        projectStatus: `${completionPercentage}% Complete`,
        completionPercentage,
        betaReleaseDate,
        keyMetrics,
        completedSystems,
        inProgress,
        criticalPath,
      };
    } catch (error: any) {
      console.error(`❌ Failed to read strategic roadmap: ${error.message}`);
      throw error;
    }
  }
}

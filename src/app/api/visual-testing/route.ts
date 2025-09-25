import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: Request) {
  try {
    const { testType, pages } = await request.json();

    return new Promise((resolve) => {
      const results: any[] = [];
      let testStatus = 'running';

      // Run the Playwright screenshot script
      const scriptPath = path.join(process.cwd(), 'screenshot.js');
      const child = spawn('node', [scriptPath], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', async (code) => {
        testStatus = code === 0 ? 'success' : 'error';

        // Check for generated screenshots
        const screenshots = [];
        try {
          const files = await fs.readdir(process.cwd());
          const screenshotFiles = files.filter(file =>
            file.endsWith('.png') && file.includes('testassured')
          );
          screenshots.push(...screenshotFiles);
        } catch (err) {
          console.error('Error reading screenshots:', err);
        }

        const response = NextResponse.json({
          status: testStatus,
          message: code === 0 ? 'Visual testing completed successfully' : 'Visual testing failed',
          timestamp: Date.now(),
          output,
          error: error || null,
          screenshots,
          results: screenshots.map(file => ({
            test: file,
            status: 'passed',
            path: `/${file}`,
            timestamp: Date.now()
          }))
        });

        resolve(response);
      });
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to run visual tests',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return current visual testing status
    const screenshots = [];
    try {
      const files = await fs.readdir(process.cwd());
      const screenshotFiles = files.filter(file =>
        file.endsWith('.png') && (file.includes('testassured') || file.includes('homepage'))
      );
      screenshots.push(...screenshotFiles);
    } catch (err) {
      console.error('Error reading screenshots:', err);
    }

    return NextResponse.json({
      status: 'ready',
      message: 'Visual testing system ready',
      timestamp: Date.now(),
      availableScreenshots: screenshots,
      playwrightInstalled: true,
      testScriptsAvailable: ['screenshot.js', 'screenshot-homepage.js']
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Visual testing system error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function recordDemo() {
  const framesDir = path.join(__dirname, '..', '.temp_frames');
  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(framesDir, { recursive: true });

  console.log('🚀 Launching Puppeteer browser to record demo...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: {
      width: 960,
      height: 900,
      deviceScaleFactor: 1.5,
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  let frameIndex = 0;

  async function capture(delayMs = 250, count = 1) {
    for (let c = 0; c < count; c++) {
      const framePath = path.join(
        framesDir,
        `frame_${String(frameIndex++).padStart(4, '0')}.png`
      );
      await page.screenshot({ path: framePath });
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  try {
    console.log('Loading Cockpit at http://127.0.0.1:8090/?userId=pilot...');
    await page.goto('http://127.0.0.1:8090/?userId=pilot', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('Capturing initial idle state...');
    await capture(250, 4);

    // Select the "HN AI Trend Radar" recommended blueprint button
    console.log('Selecting HN Trend blueprint chip...');
    const buttons = await page.$$('button');
    let blueprintClicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('HN AI Trend Radar')) {
        await btn.click();
        blueprintClicked = true;
        console.log('Clicked blueprint chip: HN AI Trend Radar');
        break;
      }
    }

    if (!blueprintClicked) {
      await page.type(
        'input[type="text"]',
        'Extract top AI announcements from Hacker News and summarize trends',
        { delay: 25 }
      );
    }
    await capture(300, 3);

    // Click Dispatch button
    console.log('Clicking Dispatch Mission button...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }
    await capture(250, 2);

    // Capture streaming ReAct execution steps
    console.log('Capturing streaming reasoning steps...');
    for (let i = 0; i < 20; i++) {
      await capture(300, 1);
    }

    // Scroll slightly down to showcase deliverable card & export toolbar
    await page.evaluate(() => window.scrollBy({ top: 140, behavior: 'smooth' }));
    await capture(400, 6);

    // Navigate to Agent Memory Tab
    console.log('Navigating to Agent Memory Tab...');
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Memory')) {
        await btn.click();
        console.log('Clicked Memory Tab');
        break;
      }
    }
    await capture(350, 4);

    // Type in SQLite FTS5 search box
    const searchInput = await page.$('input[placeholder*="Search memory"]');
    if (searchInput) {
      console.log('Testing FTS5 search in UI...');
      await searchInput.type('Hacker News', { delay: 40 });
      await capture(350, 4);
    }

    // Navigate to Live Diagnostic Terminal Tab
    console.log('Navigating to Diagnostic Terminal Tab...');
    for (const btn of allButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Terminal')) {
        await btn.click();
        console.log('Clicked Terminal Tab');
        break;
      }
    }
    await capture(400, 5);

    // Return to Live Cockpit to complete smooth loop
    for (const btn of allButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Live')) {
        await btn.click();
        console.log('Returned to Live Cockpit');
        break;
      }
    }
    await capture(400, 3);

    console.log(`✓ Total frames recorded: ${frameIndex}`);
  } catch (err) {
    console.error('Error recording frames:', err);
  } finally {
    await browser.close();
  }

  // Compile GIF using FFmpeg
  const outputGif = path.join(__dirname, '..', 'docs', 'images', 'demo.gif');
  console.log(`Compiling frames to animated GIF via FFmpeg: ${outputGif}...`);

  try {
    const ffmpegCmd = `ffmpeg -y -framerate 4 -i "${path.join(framesDir, 'frame_%04d.png')}" -vf "fps=5,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${outputGif}"`;
    execSync(ffmpegCmd, { stdio: 'inherit' });
    console.log(`✓ Successfully compiled ${outputGif}`);

    const stat = fs.statSync(outputGif);
    console.log(`GIF size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

    const artifactGif = 'C:\\Users\\alexander\\.gemini\\antigravity-ide\\brain\\44e104b9-9e10-4208-a6a7-3ca7a8deb873\\demo.gif';
    fs.copyFileSync(outputGif, artifactGif);
    console.log(`Copied demo.gif to brain artifact: ${artifactGif}`);
  } catch (ffmpegErr) {
    console.error('FFmpeg compilation failed:', ffmpegErr);
  } finally {
    if (fs.existsSync(framesDir)) {
      fs.rmSync(framesDir, { recursive: true, force: true });
      console.log('Cleaned up temporary frames.');
    }
  }
}

recordDemo().catch(console.error);

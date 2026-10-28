const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ ok: true, message: "RAMIM X OTP Automation Backend is Running Perfectly!" });
});

app.post('/api/manual-otp-login', async (req, res) => {
    const { phone, otp, proxy } = req.body;
    
    if (!phone || !otp) {
        return res.status(400).json({ ok: false, error: "Phone and OTP are required!" });
    }

    console.log(`[Automation Start] Phone: ${phone}, OTP: ${otp}, Proxy: ${proxy || 'None'}`);

    let browser = null;
    try {
        // Puppeteer launch configuration for Render environment
        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        };

        // If proxy is provided, add it to puppeteer arguments
        if (proxy) {
            // Expected format: host:port or host:port:user:pass
            const parts = proxy.split(':');
            if (parts.length >= 2) {
                launchOptions.args.push(`--proxy-server=${parts[0]}:${parts[1]}`);
            }
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Set mobile viewport to match m.facebook.com nicely
        await page.setViewport({ width: 360, height: 800 });

        // Handle proxy authentication if username and password are provided
        if (proxy) {
            const parts = proxy.split(':');
            if (parts.length >= 4) {
                await page.authenticate({ username: parts[2], password: parts[3] });
            }
        }

        // Step 1: Go to Facebook mobile login page
        console.log("[Browser] Navigating to m.facebook.com...");
        await page.goto('https://m.facebook.com/login', { waitUntil: 'networkidle2', timeout: 60000 });

        // Helper function to perform login attempt
        async function attemptLogin(loginIdentifier) {
            console.log(`[Login Attempt] Using identifier: ${loginIdentifier}`);
            
            // Clear fields first if any data exists
            await page.waitForSelector('input[name="email"]', { visible: true });
            await page.click('input[name="email"]', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type('input[name="email"]', loginIdentifier, { delay: 50 });

            await page.waitForSelector('input[name="pass"]', { visible: true });
            await page.click('input[name="pass"]', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type('input[name="pass"]', otp, { delay: 50 });

            // Click login button
            await Promise.all([
                page.click('button[name="login"], input[name="login"], button[type="submit"]'),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})
            ]);
        }

        // Extract UID and Cookies helper function
        async function getSessionData() {
            const cookies = await page.cookies();
            let cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            let cUserCookie = cookies.find(c => c.name === 'c_user');
            let uid = cUserCookie ? cUserCookie.value : null;
            return { uid, cookieString };
        }

        // Try login with phone/username first (or you can try UID if extracted)
        // Since 'phone' can act as the account identifier or we can try phone directly
        await attemptLogin(phone);

        let currentUrl = page.url();
        console.log(`[Current URL after login]: ${currentUrl}`);

        // Check if login failed due to wrong credentials / not found / checkpoint
        let { uid, cookieString } = await getSessionData();

        if (!uid || currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
            console.log("[Fallback] First attempt failed or checkpointed. Trying alternative login method...");
            // Go back to login page and retry cleanly
            await page.goto('https://m.facebook.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Retry with phone number explicitly
            await attemptLogin(phone);
            
            // Re-check session data
            const secondTrySession = await getSessionData();
            uid = secondTrySession.uid;
            cookieString = secondTrySession.cookieString;
            currentUrl = page.url();
        }

        await browser.close();
        browser = null;

        if (uid && cookieString && cookieString.includes('c_user')) {
            console.log(`[Success] Account Live! UID: ${uid}`);
            return res.json({
                ok: true,
                message: "Auto-login successful",
                uid: uid,
                cookie: cookieString,
                live_status: "Active"
            });
        } else {
            return res.status(400).json({
                ok: false,
                error: "Account login failed, suspended, or verification required."
            });
        }

    } catch (error) {
        console.error(`[Automation Error]:`, error.message);
        if (browser) await browser.close();
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RAMIM X OTP Backend Server is running on port ${PORT}`);
});

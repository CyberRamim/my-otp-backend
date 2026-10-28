const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ ok: true, message: "RAMIM X OTP Automation Backend is Running Perfectly!" });
});

app.post('/api/manual-otp-login', async (req, res) => {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
        return res.status(400).json({ ok: false, error: "Phone and OTP are required!" });
    }

    console.log(`[Automation Start] Phone: ${phone}, OTP: ${otp} (Without Proxy)`);

    let browser = null;
    try {
        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ]
        };

        console.log("[Browser] Launching Puppeteer...");
        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        await page.setViewport({ width: 360, height: 800 });
        page.setDefaultNavigationTimeout(120000); // Timeout 120 seconds

        console.log("[Browser] Navigating directly to m.facebook.com...");
        await page.goto('https://m.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 90000 });

        async function attemptLogin(loginIdentifier) {
            console.log(`[Login Attempt] Typing identifier: ${loginIdentifier}`);
            await page.waitForSelector('input[name="email"]', { visible: true, timeout: 40000 });
            await page.click('input[name="email"]', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type('input[name="email"]', loginIdentifier, { delay: 20 });

            console.log(`[Login Attempt] Typing OTP as password...`);
            await page.waitForSelector('input[name="pass"]', { visible: true, timeout: 40000 });
            await page.click('input[name="pass"]', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type('input[name="pass"]', otp, { delay: 20 });

            console.log(`[Login Attempt] Clicking login button...`);
            await Promise.all([
                page.click('button[name="login"], input[name="login"], button[type="submit"]'),
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
            ]);
        }

        async function getSessionData() {
            const cookies = await page.cookies();
            let cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            let cUserCookie = cookies.find(c => c.name === 'c_user');
            let uid = cUserCookie ? cUserCookie.value : null;
            return { uid, cookieString };
        }

        // Try login directly with phone/UID
        await attemptLogin(phone);
        let currentUrl = page.url();
        console.log(`[Current URL]: ${currentUrl}`);

        let { uid, cookieString } = await getSessionData();

        // Fallback check if first try failed or redirected
        if (!uid || currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
            console.log("[Fallback] Retrying login...");
            await page.goto('https://m.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await attemptLogin(phone);
            
            const secondTry = await getSessionData();
            uid = secondTry.uid;
            cookieString = secondTry.cookieString;
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
                error: "Login failed or account suspended / checkpoint."
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

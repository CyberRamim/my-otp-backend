const express = require('express');
const app = express();
app.use(express.json());

// টেস্ট করার জন্য রুট রাউট
app.get('/', (req, res) => {
    res.json({ ok: true, message: "RAMIM X Backend is Running!" });
});

// ওটিপি কনফার্মেশন এন্ডপয়েন্ট
app.post('/api/manual-otp-login', async (req, res) => {
    const { phone, otp, proxy } = req.body;
    
    try {
        // এখানে তোমার ব্যাকএন্ড লজিক বা ফেসবুক রিকোয়েস্ট হ্যান্ডেল করার কোড হবে
        console.log(`Received OTP ${otp} for phone ${phone}`);

        // সাময়িকভাবে টেস্ট রেসপন্স (তোমার সার্ভার সচল আছে কিনা দেখার জন্য)
        res.json({
            ok: true,
            uid: "100000000000000",
            cookie: "c_user=123456789; xs=test_cookie_string;",
            live_status: "Active"
        });
        
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

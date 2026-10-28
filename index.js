const express = require('express');
const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// Root test route to verify server is online
app.get('/', (req, res) => {
    res.json({ 
        ok: true, 
        message: "RAMIM X OTP Backend API is Running Successfully!",
        timestamp: new Date().toISOString()
    });
});

// Main OTP Login endpoint that receives requests from your panel
app.post('/api/manual-otp-login', async (req, res) => {
    try {
        const { phone, otp, proxy } = req.body;
        
        // Log incoming request details for debugging in Render logs
        console.log(`[OTP Request Received] Phone: ${phone}, OTP: ${otp}`);

        // Input validation check
        if (!phone || !otp) {
            return res.status(400).json({
                ok: false,
                error: "Phone number and OTP are required!"
            });
        }

        // TODO: Ekhane tomar Facebook automation ba request handling logic add korbe
        // Ekhon test-er jonno successful response pathano hocche:

        return res.json({
            ok: true,
            message: "OTP processed successfully",
            uid: "100000000000000",
            cookie: "c_user=123456789; xs=test_cookie_string_active;",
            live_status: "Active"
        });

    } catch (error) {
        console.error(`[Error] Failed to process OTP:`, error.message);
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

// Server port configuration (Render automatic port allocation)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running and listening on port ${PORT}`);
});

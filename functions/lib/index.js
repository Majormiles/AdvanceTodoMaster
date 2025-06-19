"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.send2FAEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors");
const emailTemplates_1 = require("./templates/emailTemplates");
admin.initializeApp();
// Initialize CORS middleware with more permissive options for development
const corsHandler = cors({
    origin: true,
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true,
});
// Create test account for development
const createTestAccount = async () => {
    const testAccount = await nodemailer.createTestAccount();
    return {
        user: testAccount.user,
        pass: testAccount.pass,
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
    };
};
// Get email configuration from environment or functions config
const getEmailConfig = async () => {
    var _a, _b;
    // Force development mode for local testing
    const isDevelopment = true; // process.env.NODE_ENV === 'development';
    if (isDevelopment) {
        try {
            const testAccount = await createTestAccount();
            console.log('Created test email account:', testAccount);
            return testAccount;
        }
        catch (error) {
            console.error('Error creating test account:', error);
            throw error;
        }
    }
    try {
        const config = {
            user: (_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.user,
            pass: (_b = functions.config().email) === null || _b === void 0 ? void 0 : _b.pass,
        };
        if (!config.user || !config.pass) {
            throw new Error('Email configuration not found');
        }
        return config;
    }
    catch (error) {
        console.warn('Email configuration not found:', error);
        throw new Error('Email configuration not found');
    }
};
// Configure nodemailer with your email service
const createTransporter = async () => {
    const emailConfig = await getEmailConfig();
    // Force development mode for local testing
    const isDevelopment = true; // process.env.NODE_ENV === 'development';
    if (isDevelopment) {
        console.log('Creating development transporter with config:', emailConfig);
        return nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            auth: {
                user: emailConfig.user,
                pass: emailConfig.pass,
            },
        });
    }
    // For production, use Gmail
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailConfig.user,
            pass: emailConfig.pass,
        },
    });
};
exports.send2FAEmail = functions.https.onRequest(async (req, res) => {
    // Enable CORS using the middleware
    return corsHandler(req, res, async () => {
        try {
            // Log the request for debugging
            console.log('Received request:', {
                method: req.method,
                headers: req.headers,
                body: req.body,
            });
            // Verify request method
            if (req.method !== 'POST') {
                res.status(405).json({ error: 'Method Not Allowed' });
                return;
            }
            // Get request data
            const { to, code, expiresAt } = req.body;
            if (!to || !code || !expiresAt) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }
            // Create transporter
            const transporter = await createTransporter();
            // Create email content
            const mailOptions = {
                from: '"Advanced Todo List" <test@example.com>',
                to,
                subject: 'Your Two-Factor Authentication Code',
                html: (0, emailTemplates_1.generate2FAEmailTemplate)(code, expiresAt),
            };
            // Send email
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info);
            // For development, include the Ethereal URL to view the email
            const isDevelopment = true; // process.env.NODE_ENV === 'development';
            if (isDevelopment && info.messageId) {
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                res.status(200).json({
                    message: 'Email sent successfully',
                    previewUrl: nodemailer.getTestMessageUrl(info)
                });
                return;
            }
            // Send success response
            res.status(200).json({ message: 'Email sent successfully' });
        }
        catch (error) {
            console.error('Error sending 2FA email:', error);
            // Send detailed error response
            res.status(500).json({
                error: 'Error sending email',
                message: error.message,
                details: true ? error : undefined,
            });
        }
    });
});
//# sourceMappingURL=index.js.map
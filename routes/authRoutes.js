const jwt = require("jsonwebtoken");
const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/authMiddleware");
const { sendOTP } = require("../utils/sendOTP");

const passwordRulesMessage = "Password must be at least 8 characters with 1 capital letter and 1 special character";
const isStrongPassword = (password = "") =>
    password.length >= 8 && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password);

const createToken = (user, firebaseUid) =>
    jwt.sign({ userId: user._id, firebaseUid }, process.env.JWT_SECRET, { expiresIn: "7d" });

const userResponse = (user, token) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    needsPasswordSetup: !user.password,
    token
});

router.post("/register",
    async (req, res) => {
        try {
            const { name, email, password } = req.body;
            if (!isStrongPassword(password)) {
                return res.status(400).json({ msg: passwordRulesMessage });
            }
            const exists = await User.findOne({ email });
            if (exists) {
                return res.status(409).json({ msg: "User exists" });
            }
            const hash = await bcrypt.hash(password, 10);
            const user = await User.create({ name, email, password: hash });
            const token = createToken(user);
            res.status(201).json(userResponse(user, token));
        }
        catch {
            res.status(500).json({ msg: "Register failed" });
        }
    }
);
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        if (!user.password) {
            return res.status(403).json({ msg: "Please login with Google and set a password first" });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ msg: "Wrong password" });
        }
        const token = createToken(user);
        res.json(userResponse(user, token));
    }
    catch {
        res.status(500).json({ msg: "Login failed" });
    }
});
router.post("/google", async (req, res) => {
    try {
        const { name, email, firebaseUid } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ name, email, firebaseUid, provider: "google" });
        }
        const token = createToken(user, firebaseUid);
        res.json(userResponse(user, token));
    }
    catch (err) {
        res.status(500).json({ msg: "Google login failed" });
    }
});

router.put("/set-password", auth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (req.user.password) {
            return res.status(400).json({ msg: "Password is already set" });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ msg: passwordRulesMessage });
        }
        req.user.password = await bcrypt.hash(newPassword, 10);
        await req.user.save();
        const token = createToken(req.user, req.user.firebaseUid);
        res.json(userResponse(req.user, token));
    }
    catch {
        res.status(500).json({ msg: "Password setup failed" });
    }
});

router.put("/change-password", auth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!req.user.password) {
            return res.status(400).json({ msg: "Set a password first" });
        }
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ msg: "Fill all fields" });
        }
        const valid = await bcrypt.compare(oldPassword, req.user.password);
        if (!valid) {
            return res.status(401).json({ msg: "Old password is incorrect" });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ msg: passwordRulesMessage });
        }
        req.user.password = await bcrypt.hash(newPassword, 10);
        await req.user.save();
        res.json({ msg: "Password changed" });
    }
    catch {
        res.status(500).json({ msg: "Password change failed" });
    }
});
router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                msg: "Email required",
            });
        }

        const otp =
            Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

        global.otpStore =
            global.otpStore || {};

        global.otpStore[email] = otp;

        await sendOTP(email, otp);

        res.json({
            msg: "OTP sent",
        });

    } catch (err) {
        console.log(err);

        res.status(500).json({
            msg: "OTP send failed",
        });
    }
});
router.post(
    "/verify-otp",
    (req, res) => {

        const {
            email,
            otp
        } = req.body;

        if (
    String(global.otpStore[email]) !==
    String(otp)
) {
            return res
                .status(400)
                .json({
                    msg:
                        "Invalid OTP"
                });

        }

        delete global.otpStore[email];

        res.json({
            msg:
                "Verified"
        });

    }
);

router.post("/forgot-password/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ msg: "Email required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        global.passwordResetStore = global.passwordResetStore || {};
        global.passwordResetStore[email] = {
            otp,
            verified: false,
            expiresAt: Date.now() + 10 * 60 * 1000
        };

        await sendOTP(email, otp);
        res.json({ msg: "OTP sent" });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ msg: "OTP send failed" });
    }
});

router.post("/forgot-password/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    const reset = global.passwordResetStore?.[email];

    if (!reset || reset.expiresAt < Date.now()) {
        return res.status(400).json({ msg: "OTP expired" });
    }

    if (String(reset.otp) !== String(otp)) {
        return res.status(400).json({ msg: "Invalid OTP" });
    }

    reset.verified = true;
    res.json({ msg: "Verified" });
});

router.put("/forgot-password/reset", async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const reset = global.passwordResetStore?.[email];

        if (!reset || reset.expiresAt < Date.now() || !reset.verified) {
            return res.status(400).json({ msg: "Verify OTP first" });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ msg: passwordRulesMessage });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        delete global.passwordResetStore[email];

        res.json({ msg: "Password reset successful" });
    }
    catch {
        res.status(500).json({ msg: "Password reset failed" });
    }
});
module.exports = router;

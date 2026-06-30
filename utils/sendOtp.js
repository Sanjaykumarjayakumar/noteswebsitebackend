const nodemailer = require("nodemailer");

async function sendOTP(email, otp) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "Verify your account",
        html: `
        <div>
            <h2>Verify your account</h2>
            <h1>${otp}</h1>
        </div>
        `,
    });
}

module.exports = { sendOTP };
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const htmlToText = require('html-to-text');

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email,
            this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = 'Yasmeen Mohamed';
    }

    // create a transporter
    newTransporter() {
        return nodemailer.createTransport({
            host: process.env.HOST,
            service: process.env.SERVICE,
            port: Number(process.env.EMAIL_PORT),
            secure: Boolean(process.env.SECURE),
            auth: {
                user: process.env.USER,
                pass: process.env.PASS,
            },
        });
    }

    // send the actual email
    async send(template, subject) {
        // 1) Read HTML content from the file
        const htmlFilePath = path.join(__dirname, `../public/html/${template}.html`);
        const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');

        // 2) Replace placeholders with actual data
        const replacedHtml = htmlContent
            .replace(/{firstName}/g, this.firstName)
            .replace(/{url}/g, this.url);

        // 3) define email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html: replacedHtml,
            text: htmlToText.convert(replacedHtml),
        };

        // 4) create a transporter and send email
        await this.newTransporter().sendMail(mailOptions);
    }

    async sendPasswordReset() {
        await this.send('passwordReset', 'Your password reset token (valid for only 10 minutes)');
    }
    async sendEmailVerification() {
        await this.send('verifyEmail', 'Your token to verify email (valid for only 10 minutes)');

    }
};

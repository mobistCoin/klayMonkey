const express = require('express');
const router = express.Router();

const nodemailer = require('nodemailer')

/* GET home page. */
router.get('/', function(req, res, next) {
    const mailer = async () => {
        let transporter = nodemailer.createTransport({
            host: 'SMTP_HOST',
            port: 587,
            secure: false,
            auth: {
                user: "SECRET_USER",
                pass: "SECRET_PASSWORD",
            },
        });

        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: `"WDMA Team" <yarang@mobist.io>`,
            to: "yarang@gmail.com",
            subject: 'WDMA Auth Number',
            text: 'generatedAuthNumber',
            html: `<b>generatedAuthNumber</b>`,
        });

        console.log('Message sent: %s', info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

        res.status(200).json({
            status: 'Success',
            code: 200,
            message: 'Sent Auth Email',
        });
    };

    mailer().catch(console.error);

    res.send('Need build function')
});

module.exports = router;

const express = require('express');
const router = express.Router();

const nodemailer = require('nodemailer')

/* GET home page. */
router.get('/', function(req, res, next) {
    const mailer = async () => {
        let transporter = nodemailer.createTransport({
            host: 'email-smtp.ap-northeast-2.amazonaws.com',
            port: 587,
            secure: false,
            auth: {
                user: "AKIA2TJ77DHVPXPKND53",
                pass: "BIBbGr8leGzH1PNPGT+754UX8PAQb88td6a5tifA2oYb",
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

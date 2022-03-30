const express = require('express');
const router = express.Router();

// 메일 기능을 사용하기 위한 모듈 호출
const nodemailer = require('nodemailer')

// 메일 전송시 호출되는 API 주소
router.get('/', function(req, res, next) {
    const mailer = async () => {
        // nodemailer 개체 호출을 위한 설정 부분.
        let transporter = nodemailer.createTransport({
            // Email 전송하는 host 주소
            host: 'email-smtp.ap-northeast-2.amazonaws.com',
            // Email PORT 번호
            port: 587,
            secure: false,
            auth: {
                // AWS mail Service 계정의 사용자 ID와 PASSWORD
                user: "AKIA2TJ77DHVPXPKND53",
                pass: "BIBbGr8leGzH1PNPGT+754UX8PAQb88td6a5tifA2oYb",
            },
        });

        // send mail with defined transport object
        let info = await transporter.sendMail({
            // 전송자의 이름 정보 넣는 부분.
            from: `"Mobist Team" <yarang@mobist.io>`,
            // Email 전송자의 메일 주소
            to: "yarang@gmail.com",
            // 메일의 제목
            subject: 'Mobist Team email: Test mail',
            // 메일의 텍스트 내용
            text: 'generatedAuthNumber',
            // 메일의 html 내용
            html: `<b>generatedAuthNumber</b>`,
        });

        console.log('Message sent: %s', info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

        // Email 전송 상태 보고용 response 내용 작성 부분
        // 200 코드를 반환하도록 한다.
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

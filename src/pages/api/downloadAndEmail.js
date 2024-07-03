// src/pages/api/downloadAndEmail.js

import fs from 'fs';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  const { pdfUrl, toEmail } = req.body;

  try {
    // Download PDF from URL
    const response = await axios({
      method: 'GET',
      url: pdfUrl,
      responseType: 'stream',
    });
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.-]/g, '');
    const fileName = `temp_${timestamp}.pdf`;
    const pdfFilePath = join(process.cwd(), 'public', 'downloads', fileName);
    const pdfWriteStream = fs.createWriteStream(pdfFilePath);

    response.data.pipe(pdfWriteStream);
    console.log(process.env.GMAIL_PASS);
    await new Promise((resolve, reject) => {
      pdfWriteStream.on('finish', resolve);
      pdfWriteStream.on('error', reject);
    });

    // Send email with PDF attachment
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: toEmail,
      subject: 'PDF Attachment',
      text: 'Here is your PDF file.',
      attachments: [{ path: pdfFilePath }],
    };

    await transporter.sendMail(mailOptions);

    // Clean up: delete temporary PDF file
    fs.unlinkSync(pdfFilePath);

    res.status(200).json({ message: 'PDF sent successfully.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to send PDF.' });
  }
}

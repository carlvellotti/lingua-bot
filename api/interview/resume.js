import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

const RESUME_SIZE_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);
const ALLOWED_RESUME_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt']);

const tempStorageRoot = path.join(os.tmpdir(), 'interview-prep');
fs.mkdirSync(tempStorageRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempStorageRoot);
  },
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: RESUME_SIZE_LIMIT_BYTES },
  fileFilter: (_req, file, cb) => {
    const mimetype = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_RESUME_MIME_TYPES.has(mimetype) || ALLOWED_RESUME_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'resume'));
    }
  }
});

async function extractTextFromResume(filePath, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  }
  if (ext === '.pdf') {
    throw new Error('PDF parsing not yet supported in serverless environment');
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }
  if (ext === '.doc') {
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(filePath);
    return extracted.getBody();
  }
  throw new Error(`Unsupported file extension: ${ext}`);
}

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'POST') {
    const singleUpload = upload.single('resume');
    singleUpload(req, res, async err => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'Resume file too large (max 5 MB).' });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(415).json({ error: 'Unsupported file type. Allowed: .pdf, .doc, .docx, .txt' });
          }
        }
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Resume upload failed.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No resume file provided.' });
      }

      try {
        const text = await extractTextFromResume(req.file.path, req.file.originalname);
        const resumeRef = path.basename(req.file.path);
        res.json({
          resumeRef,
          filename: req.file.originalname,
          text
        });
      } catch (extractErr) {
        console.error('Resume extraction error:', extractErr);
        try {
          fs.unlinkSync(req.file.path);
        } catch (_cleanupErr) {
          // ignore
        }
        res.status(422).json({ error: `Could not parse resume: ${extractErr.message}` });
      }
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// Disable bodyParser for file upload
export const config = {
  api: {
    bodyParser: false
  }
};

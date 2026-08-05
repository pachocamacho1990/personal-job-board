import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

/**
 * Where attachments live on disk.
 *
 * Anchored to the working directory, not to __dirname. Resolving it relative to
 * the module means `server/uploads/` under ts-node and `server/dist/uploads/`
 * once compiled, because the built file sits one level deeper. Nothing errors —
 * the directory is created on demand and new uploads land in the wrong place
 * quietly — so the split only shows up as a 404 on an attachment stored before
 * the last deploy. In the container, cwd is /app, which is where the real
 * uploads directory has always been.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomhex-originalname
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// File filter - allowed types
const ALLOWED_MIMETYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/gif',
    'text/plain'
];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
};

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

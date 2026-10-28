const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const archiver = require('archiver');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

// Modul bawaan Node.js untuk mengeksekusi perintah Python
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// LibreOffice untuk konversi Word ke PDF
const { execFile } = require('child_process');
const execFilePromise = util.promisify(execFile);
const SOFFICE = process.env.SOFFICE_PATH ||
  (process.platform === 'win32' ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe' : 'soffice');

const app = express();
const PORT = process.env.PORT || 3000;

// Buat folder uploads dan output secara otomatis jika belum ada
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ============================================
// ROUTE: Word to PDF (Menggunakan LibreOffice agar layout sama seperti Word)
// ============================================
app.post('/api/word-to-pdf', upload.single('file'), async (req, res) => {
  let profileDir = null;
  let generatedPdf = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.docx' && ext !== '.doc') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Format file harus .docx atau .doc' });
    }

    const pdfFileName = path.basename(req.file.originalname, ext) + '.pdf';

    // Profil LibreOffice terpisah per proses supaya aman jika ada beberapa konversi bersamaan
    profileDir = path.join(outputDir, 'lo-profile-' + Date.now() + '-' + Math.round(Math.random() * 1e9));
    const p = profileDir.replace(/\\/g, '/');
    const profileUrl = p.startsWith('/') ? 'file://' + p : 'file:///' + p;

    await execFilePromise(SOFFICE, [
      `-env:UserInstallation=${profileUrl}`,
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', outputDir,
      req.file.path
    ], { timeout: 120000 });

    generatedPdf = path.join(outputDir, path.parse(req.file.path).name + '.pdf');

    if (!fs.existsSync(generatedPdf)) {
      throw new Error('File PDF tidak terbentuk');
    }

    res.download(generatedPdf, pdfFileName, (err) => {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
      try { fs.unlinkSync(generatedPdf); } catch (e) { }
      try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) { }
    });

  } catch (error) {
    console.error('Word to PDF error:', error);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) { }
    if (generatedPdf) try { fs.unlinkSync(generatedPdf); } catch (e) { }
    if (profileDir) try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) { }
    res.status(500).json({ error: 'Gagal mengkonversi file. Pastikan LibreOffice sudah terinstall.' });
  }
});

// ============================================
// ROUTE: PDF to Word (Menggunakan Python pdf2docx)
// ============================================
app.post('/api/pdf-to-word', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf' && req.file.mimetype !== 'application/pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Format file harus .pdf' });
    }

    const docxFileName = path.basename(req.file.originalname, ext) + '.docx';
    const docxPath = path.join(outputDir, Date.now() + '-' + docxFileName);
    const pdfPath = req.file.path;

    // Menjalankan skrip Python pdf2docx secara otomatis dari Node.js
    const pythonCommand = `python -c "from pdf2docx import Converter; cv = Converter(r'${pdfPath}'); cv.convert(r'${docxPath}'); cv.close()"`;

    await execPromise(pythonCommand);

    res.download(docxPath, docxFileName, (err) => {
      try { fs.unlinkSync(pdfPath); } catch (e) { }
      try { fs.unlinkSync(docxPath); } catch (e) { }
    });

  } catch (error) {
    console.error('PDF to Word error:', error);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) { }
    res.status(500).json({ error: 'Gagal mengkonversi file. Pastikan Python dan pdf2docx sudah terinstall.' });
  }
});

// ============================================
// ROUTE: Compress File
// ============================================
app.post('/api/compress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const originalSize = req.file.size;
    const quality = req.body.quality ? parseInt(req.body.quality) : 50;
    const baseName = path.basename(req.file.originalname, ext);
    let outputPath = null;
    let outputFileName = null;

    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.gif', '.bmp'];

    if (imageExts.includes(ext)) {
      outputFileName = baseName + '_compressed' + (ext === '.bmp' ? '.jpg' : ext);
      outputPath = path.join(outputDir, Date.now() + '-' + outputFileName);

      let sharpInstance = sharp(req.file.path);

      const metadata = await sharpInstance.metadata();
      if (metadata.width > 3000 || metadata.height > 3000) {
        const scaleFactor = quality <= 30 ? 0.5 : quality <= 60 ? 0.7 : 0.85;
        sharpInstance = sharpInstance.resize(
          Math.round(metadata.width * scaleFactor),
          Math.round(metadata.height * scaleFactor),
          { fit: 'inside' }
        );
      }

      if (ext === '.jpg' || ext === '.jpeg' || ext === '.bmp') {
        await sharpInstance.jpeg({ quality: quality, mozjpeg: true }).toFile(outputPath);
      } else if (ext === '.png') {
        const compressionLevel = quality <= 30 ? 9 : quality <= 60 ? 7 : 5;
        await sharpInstance.png({ quality: quality, compressionLevel: compressionLevel, effort: 10 }).toFile(outputPath);
      } else if (ext === '.webp') {
        await sharpInstance.webp({ quality: quality }).toFile(outputPath);
      } else {
        await sharpInstance.toFile(outputPath);
      }
    } else if (ext === '.pdf') {
      outputFileName = baseName + '_compressed.pdf';
      outputPath = path.join(outputDir, Date.now() + '-' + outputFileName);

      const pdfBytes = fs.readFileSync(req.file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });
      fs.writeFileSync(outputPath, compressedPdfBytes);
    } else {
      outputFileName = baseName + '_compressed.zip';
      outputPath = path.join(outputDir, Date.now() + '-' + outputFileName);

      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.file(req.file.path, { name: req.file.originalname });
        archive.finalize();
      });
    }

    const compressedSize = fs.statSync(outputPath).size;
    const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);

    res.setHeader('X-Original-Size', originalSize);
    res.setHeader('X-Compressed-Size', compressedSize);
    res.setHeader('X-Saved-Percent', Math.max(savedPercent, 0));
    res.setHeader('Access-Control-Expose-Headers', 'X-Original-Size, X-Compressed-Size, X-Saved-Percent');

    res.download(outputPath, outputFileName, (err) => {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
      try { fs.unlinkSync(outputPath); } catch (e) { }
    });

  } catch (error) {
    console.error('Compress error:', error);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) { }
    res.status(500).json({ error: 'Gagal mengkompresi file. Silakan coba lagi.' });
  }
});

// Cleanup old files every 30 minutes
setInterval(() => {
  const dirs = ['uploads', 'output'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtimeMs;
        if (age > 30 * 60 * 1000) {
          try { fs.unlinkSync(filePath); } catch (e) { }
        }
      });
    }
  });
}, 30 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`\n🚀 FileForge server berjalan di http://localhost:${PORT}\n`);
});
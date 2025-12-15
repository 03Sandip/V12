// routes/notesRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');

const Notes = require('../models/notes');
const Department = require('../models/Department');
const User = require('../models/User'); // ✅ NEW
const authMiddleware = require('../middleware/authMiddleware'); // ✅ NEW

// ---------- MULTER (memory storage) ----------
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'file') {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'), false);
  } else if (file.fieldname === 'itemPic') {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  } else {
    cb(null, false);
  }
};
const upload = multer({ storage, fileFilter });

// ---------- simple in-memory TTL cache ----------
const ttlCache = (() => {
  const store = {};
  return {
    get(key) {
      const rec = store[key];
      if (!rec) return null;
      if (Date.now() > rec.expires) {
        delete store[key];
        return null;
      }
      return rec.value;
    },
    set(key, value, ttlMs = 60 * 1000) {
      store[key] = { value, expires: Date.now() + ttlMs };
    },
    clear(key) {
      if (key) delete store[key];
      else Object.keys(store).forEach((k) => delete store[k]);
    }
  };
})();

// ---------- helpers ----------
function escapeRegexText(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapNoteForList(n) {
  // n is a plain object (lean) or mongoose doc; normalize safely
  const id = n._id ? String(n._id) : n.id ? String(n.id) : null;
  const deptObj = n.department;
  const deptName =
    deptObj && deptObj.name
      ? deptObj.name
      : typeof n.department === 'string'
      ? n.department
      : n.dept || null;
  const departmentId =
    deptObj && deptObj._id
      ? String(deptObj._id)
      : n.department && typeof n.department === 'string'
      ? n.department
      : null;

  const op = Number(n.originalPrice || 0);
  const dp = Number(n.discountPrice || 0);
  let discountPercent = null;
  if (op > 0 && dp > 0 && dp < op)
    discountPercent = Math.round(((op - dp) / op) * 100);

  return {
    id: id,
    departmentId: departmentId,
    title: n.title,
    dept: deptName,
    sem: n.semester ?? n.sem ?? null,
    semester: n.semester ?? n.sem ?? null,
    type: n.type,
    originalPrice: op,
    discountPrice: dp,
    discountPercent,
    hasImage: !!n.itemPicContentType,
    itemPicContentType: n.itemPicContentType || null,
    previewLink: n.previewLink || null,
    createdAt: n.createdAt || n.uploadDate || null
  };
}

// ---------------- ROUTES ----------------

/**
 * GET /api/notes/departments
 * returns [{ id, name, semesters: [] }, ...]
 */
router.get('/departments', async (req, res) => {
  try {
    const cached = ttlCache.get('departments');
    if (cached) return res.json(cached);

    const depts = await Department.find()
      .select('name semesters')
      .lean()
      .catch(() => []);
    const mapped = (depts || []).map((d) => ({
      id: d._id,
      name: d.name,
      semesters: Array.isArray(d.semesters) ? d.semesters : []
    }));
    ttlCache.set('departments', mapped, 60 * 1000);
    res.json(mapped);
  } catch (err) {
    console.error('Departments fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/notes/semesters/:deptIdentifier
 * deptIdentifier may be department _id (24 hex) or department name
 * returns { semesters: [...] }
 */
router.get('/semesters/:deptIdentifier', async (req, res) => {
  try {
    const { deptIdentifier } = req.params;
    if (!deptIdentifier)
      return res.status(400).json({ message: 'Missing deptIdentifier' });

    const cacheKey = `semesters:${deptIdentifier}`;
    const cached = ttlCache.get(cacheKey);
    if (cached) return res.json({ semesters: cached });

    let dept = null;
    const isId = /^[0-9a-fA-F]{24}$/.test(String(deptIdentifier));
    if (isId) {
      dept = await Department.findById(deptIdentifier).lean().catch(() => null);
    }
    if (!dept) {
      dept = await Department.findOne({ name: deptIdentifier })
        .lean()
        .catch(() => null);
    }
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const sems = Array.isArray(dept.semesters) ? dept.semesters : [];
    ttlCache.set(cacheKey, sems, 60 * 1000);
    if (dept._id) ttlCache.set(`semesters:${String(dept._id)}`, sems, 60 * 1000);
    if (dept.name) ttlCache.set(`semesters:${dept.name}`, sems, 60 * 1000);

    res.json({ semesters: sems });
  } catch (err) {
    console.error('Semesters fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/notes/search
 * Query params:
 *  - departmentId OR department (name)
 *  - semester
 *  - stream
 *  - q (text)
 *  - mode (type)
 *  - page, limit
 */
router.get('/search', async (req, res) => {
  try {
    const {
      departmentId,
      department,
      semester,
      stream,
      q,
      mode,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortDir = 'desc'
    } = req.query;

    const query = {};
    if (mode) query.type = mode;

    // resolve department name -> id when possible (best-effort)
    if (departmentId && /^[0-9a-fA-F]{24}$/.test(String(departmentId))) {
      query.department = departmentId;
    } else if (department) {
      const deptDoc = await Department.findOne({ name: department })
        .select('_id')
        .lean()
        .catch(() => null);
      if (deptDoc && deptDoc._id) query.department = deptDoc._id;
      // else do not set filter so search is flexible
    }

    if (semester) query.semester = Number(semester);
    if (stream) query.stream = stream;

    if (q) {
      const rx = new RegExp(escapeRegexText(q), 'i');
      query.$or = [
        { title: { $regex: rx } },
        { description: { $regex: rx } },
        { originalName: { $regex: rx } }
      ];
    }

    const pg = Math.max(1, Number(page) || 1);
    let lim = Math.max(1, Number(limit) || 50);
    lim = Math.min(500, lim);
    const skip = (pg - 1) * lim;
    const sortField = String(sortBy || 'createdAt');
    const sortOrder = sortDir === 'asc' ? 1 : -1;

    const [total, notes] = await Promise.all([
      Notes.countDocuments(query).catch(() => 0),
      Notes.find(query)
        .select('-fileData -itemPicData -__v')
        .populate('department', 'name')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(lim)
        .lean()
        .catch(() => [])
    ]);

    const mapped = (notes || []).map(mapNoteForList);

    res.json({ total, page: pg, limit: lim, results: mapped });
  } catch (err) {
    console.error('Search fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/notes/upload
 * fields: file (pdf required), itemPic (optional), title, department (id or name),
 *         semester, originalPrice, discountPrice, type, previewLink (optional)
 */
router.post(
  '/upload',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'itemPic', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        title,
        department,
        semester,
        originalPrice,
        discountPrice,
        type,
        previewLink
      } = req.body;

      if (!req.files?.file?.[0]) {
        return res.status(400).json({ message: 'PDF file is required' });
      }
      if (!title || !department || !semester) {
        return res
          .status(400)
          .json({ message: 'Title, department, and semester are required' });
      }

      // resolve department
      let dept = null;
      const isId = /^[0-9a-fA-F]{24}$/.test(String(department));
      if (isId) dept = await Department.findById(department).catch(() => null);
      if (!dept)
        dept = await Department.findOne({ name: department }).catch(() => null);
      if (!dept) return res.status(404).json({ message: 'Department not found' });

      const semNum = Number(semester);
      if (!Array.isArray(dept.semesters) || !dept.semesters.includes(semNum)) {
        return res
          .status(400)
          .json({ message: 'Semester invalid for this department' });
      }

      const pdf = req.files.file[0];
      const note = new Notes({
        title,
        department: dept._id,
        semester: semNum,
        fileData: pdf.buffer,
        contentType: pdf.mimetype,
        originalName: pdf.originalname,
        size: pdf.size,
        originalPrice: Number(originalPrice) || 0,
        discountPrice: Number(discountPrice) || 0,
        type: type || 'notes',
        previewLink: previewLink ? String(previewLink).trim() : ''
      });

      if (req.files.itemPic?.[0]) {
        const pic = req.files.itemPic[0];
        note.itemPicData = pic.buffer;
        note.itemPicContentType = pic.mimetype;
        note.itemPicOriginalName = pic.originalname;
      }

      const saved = await note.save();

      // clear caches affected by new upload
      ttlCache.clear('departments');
      ttlCache.clear('semesters');
      ttlCache.clear('streams');

      // return canonical metadata so front-end can immediately show uploaded item
      return res.status(201).json({
        id: String(saved._id),
        title: saved.title,
        departmentId: String(dept._id),
        department: dept.name,
        semester: saved.semester,
        originalPrice: saved.originalPrice,
        discountPrice: saved.discountPrice,
        previewLink: saved.previewLink || null,
        hasImage: !!saved.itemPicContentType,
        itemPicContentType: saved.itemPicContentType || null,
        createdAt: saved.createdAt
      });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * GET /api/notes/
 * Backwards-compatible list. Supports departmentId OR department (name), semester, mode
 */
router.get('/', async (req, res) => {
  try {
    const { departmentId, department, semester, mode } = req.query;
    const query = {};
    if (mode) query.type = mode;

    if (departmentId && /^[0-9a-fA-F]{24}$/.test(String(departmentId))) {
      query.department = departmentId;
    } else if (department) {
      const dept = await Department.findOne({ name: department })
        .select('_id')
        .lean()
        .catch(() => null);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      query.department = dept._id;
    }

    if (semester) query.semester = Number(semester);

    const notes = await Notes.find(query)
      .select('-fileData -itemPicData -__v')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = (notes || []).map(mapNoteForList);
    return res.json(mapped);
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ✅ NEW: GET /api/notes/my-notes
 * Return all notes the logged-in user has purchased
 */
router.get('/my-notes', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'purchasedNotes',
        select: '-fileData -itemPicData -__v',
        populate: { path: 'department', select: 'name' }
      })
      .lean()
      .exec();

    const notes = (user?.purchasedNotes || []).map(mapNoteForList);

    return res.json({
      success: true,
      notes
    });
  } catch (err) {
    console.error('Fetch my-notes error:', err);
    res.status(500).json({ success: false, message: 'Cannot fetch notes' });
  }
});

/**
 * ✅ NEW: GET /api/notes/view/:id
 * Serve PDF binary inline ONLY if user has purchased the note
 */
router.get('/view/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const user = await User.findById(req.user._id)
      .select('purchasedNotes')
      .lean()
      .exec();

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User not found' });
    }

    const hasAccess = (user.purchasedNotes || []).some(
      (nid) => String(nid) === String(id)
    );

    if (!hasAccess) {
      return res
        .status(403)
        .json({ success: false, message: 'You do not have access to this note' });
    }

    const note = await Notes.findById(id)
      .select('fileData contentType originalName')
      .exec();
    if (!note || !note.fileData)
      return res.status(404).json({ message: 'Not found' });

    res.set({
      'Content-Type': note.contentType || 'application/pdf',
      'Content-Disposition': `inline; filename="${
        note.originalName || 'note.pdf'
      }"`,
      'Cache-Control': 'no-store'
    });

    return res.send(note.fileData);
  } catch (err) {
    console.error('View note error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/notes/:id/file
 * PUBLIC inline file (keep for backward compatibility / previews)
 */
router.get('/:id/file', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const note = await Notes.findById(id)
      .select('fileData contentType originalName')
      .exec();
    if (!note || !note.fileData)
      return res.status(404).json({ message: 'Not found' });

    res.set({
      'Content-Type': note.contentType || 'application/pdf',
      'Content-Disposition': `inline; filename="${
        note.originalName || 'note.pdf'
      }"`,
      'Cache-Control': 'public, max-age=86400'
    });
    return res.send(note.fileData);
  } catch (err) {
    console.error('File fetch error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/notes/:id/pic
 * Serve item picture binary inline
 */
router.get('/:id/pic', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const note = await Notes.findById(id)
      .select('itemPicData itemPicContentType itemPicOriginalName')
      .exec();
    if (!note || !note.itemPicData)
      return res.status(404).json({ message: 'Image not found' });

    res.set({
      'Content-Type': note.itemPicContentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${
        note.itemPicOriginalName || 'image'
      }"`,
      'Cache-Control': 'public, max-age=86400'
    });
    return res.send(note.itemPicData);
  } catch (err) {
    console.error('Pic fetch error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/notes/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const note = await Notes.findById(id).catch(() => null);
    if (!note) return res.status(404).json({ message: 'Not found' });

    await note.deleteOne();

    // clear caches affected by deletion
    ttlCache.clear('departments');
    ttlCache.clear('streams');
    ttlCache.clear('semesters');

    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/notes/:id
 * Update metadata and optionally file/itemPic
 */
router.put(
  '/:id',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'itemPic', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: 'Missing id' });

      const {
        title,
        department,
        semester,
        originalPrice,
        discountPrice,
        type,
        previewLink
      } = req.body;

      const note = await Notes.findById(id).exec();
      if (!note) return res.status(404).json({ message: 'Note not found' });

      // ---- UPDATE DEPARTMENT + SEMESTER (if provided) ----
      if (department || semester) {
        let deptDoc = null;
        let deptIdentifier = department || note.department;

        if (deptIdentifier) {
          const isId = /^[0-9a-fA-F]{24}$/.test(String(deptIdentifier));
          if (isId) {
            deptDoc = await Department.findById(deptIdentifier).catch(
              () => null
            );
          }
          if (!deptDoc) {
            deptDoc = await Department.findOne({ name: deptIdentifier }).catch(
              () => null
            );
          }
        }

        if (!deptDoc) {
          return res.status(404).json({ message: 'Department not found' });
        }

        const semNum = semester ? Number(semester) : note.semester;
        if (
          !Array.isArray(deptDoc.semesters) ||
          !deptDoc.semesters.includes(semNum)
        ) {
          return res
            .status(400)
            .json({ message: 'Semester invalid for this department' });
        }

        note.department = deptDoc._id;
        note.semester = semNum;
      }

      // ---- SIMPLE FIELDS ----
      if (title !== undefined) note.title = title;
      if (originalPrice !== undefined)
        note.originalPrice = Number(originalPrice) || 0;
      if (discountPrice !== undefined)
        note.discountPrice = Number(discountPrice) || 0;
      if (type !== undefined) note.type = type || 'notes';
      if (previewLink !== undefined) {
        note.previewLink = String(previewLink || '').trim();
      }

      // ---- OPTIONAL FILE UPDATE ----
      if (req.files?.file?.[0]) {
        const pdf = req.files.file[0];
        note.fileData = pdf.buffer;
        note.contentType = pdf.mimetype;
        note.originalName = pdf.originalname;
        note.size = pdf.size;
      }

      // ---- OPTIONAL IMAGE UPDATE ----
      if (req.files?.itemPic?.[0]) {
        const pic = req.files.itemPic[0];
        note.itemPicData = pic.buffer;
        note.itemPicContentType = pic.mimetype;
        note.itemPicOriginalName = pic.originalname;
      }

      const saved = await note.save();

      // clear caches
      ttlCache.clear('departments');
      ttlCache.clear('streams');
      ttlCache.clear('semesters');

      // Return mapped object like list/search
      const populated = await Notes.findById(saved._id)
        .populate('department', 'name')
        .lean()
        .catch(() => null);

      const mapped = populated ? mapNoteForList(populated) : mapNoteForList(saved);

      return res.json(mapped);
    } catch (err) {
      console.error('Update error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
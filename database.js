const Database = require("better-sqlite3");
const db = new Database("quizbot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    user_name TEXT,
    subject TEXT NOT NULL,
    quiz_date TEXT NOT NULL,
    quiz_time TEXT,
    topic TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reminded_24h INTEGER DEFAULT 0,
    reminded_1h INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS courses (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    instructor TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT,
    FOREIGN KEY (course_code) REFERENCES courses(code)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    due_time TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    description TEXT,
    course_code TEXT,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    uploaded_by TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,
    ocr_text TEXT
  );

  CREATE TABLE IF NOT EXISTS ia_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL,
    question_text TEXT NOT NULL,
    ia_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    name TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

//  Quiz functions
function addQuiz(phone, name, quizData) {
    const stmt = db.prepare(`
    INSERT INTO quizzes (user_phone, user_name, subject, quiz_date, quiz_time, topic)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    return stmt.run(
        phone,
        name,
        quizData.subject,
        quizData.date,
        quizData.time || null,
        quizData.topic || null
    );
}

function getUserQuizzes(phone) {
    return db
        .prepare(
            `
    SELECT * FROM quizzes 
    WHERE user_phone = ? AND quiz_date >= date('now')
    ORDER BY quiz_date, quiz_time
  `
        )
        .all(phone);
}

function getQuizzesForReminder(hoursAhead) {
    return db
        .prepare(
            `
    SELECT * FROM quizzes 
    WHERE datetime(quiz_date || ' ' || COALESCE(quiz_time, '09:00')) 
    BETWEEN datetime('now') AND datetime('now', '+${hoursAhead} hours')
    AND reminded_${hoursAhead}h = 0
  `
        )
        .all();
}

function markAsReminded(quizId, reminderType) {
    db.prepare(
        `UPDATE quizzes SET reminded_${reminderType}h = 1 WHERE id = ?`
    ).run(quizId);
}

function deleteQuiz(id, phone) {
    return db
        .prepare("DELETE FROM quizzes WHERE id = ? AND user_phone = ?")
        .run(id, phone);
}

// Course functions
function addCourse(code, name, instructor = null, description = null) {
    return db
        .prepare(
            `
    INSERT OR REPLACE INTO courses (code, name, instructor, description)
    VALUES (?, ?, ?, ?)
  `
        )
        .run(code.toUpperCase(), name, instructor, description);
}

function getCourseByCode(code) {
    return db
        .prepare("SELECT * FROM courses WHERE code = ? COLLATE NOCASE")
        .get(code);
}

function searchCourses(query) {
    return db
        .prepare(
            `
    SELECT * FROM courses 
    WHERE code LIKE ? OR name LIKE ? OR instructor LIKE ?
    COLLATE NOCASE
  `
        )
        .all(`%${query}%`, `%${query}%`, `%${query}%`);
}

function getAllCourses() {
    return db.prepare("SELECT * FROM courses ORDER BY code").all();
}

// Schedule functions
function addSchedule(
    courseCode,
    dayOfWeek,
    startTime,
    endTime,
    location = null
) {
    return db
        .prepare(
            `
    INSERT INTO schedule (course_code, day_of_week, start_time, end_time, location)
    VALUES (?, ?, ?, ?, ?)
  `
        )
        .run(courseCode.toUpperCase(), dayOfWeek, startTime, endTime, location);
}

function getScheduleByDay(dayOfWeek) {
    return db
        .prepare(
            `
    SELECT s.*, c.name as course_name, c.instructor
    FROM schedule s
    JOIN courses c ON s.course_code = c.code
    WHERE s.day_of_week = ? COLLATE NOCASE
    ORDER BY s.start_time
  `
        )
        .all(dayOfWeek);
}

function getScheduleByTime(dayOfWeek, time) {
    return db
        .prepare(
            `
    SELECT s.*, c.name as course_name, c.instructor
    FROM schedule s
    JOIN courses c ON s.course_code = c.code
    WHERE s.day_of_week = ? COLLATE NOCASE
    AND s.start_time <= ? AND s.end_time > ?
  `
        )
        .all(dayOfWeek, time, time);
}

function getAllSchedule() {
    return db
        .prepare(
            `
    SELECT s.*, c.name as course_name, c.instructor
    FROM schedule s
    JOIN courses c ON s.course_code = c.code
    ORDER BY 
      CASE s.day_of_week
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END, s.start_time
  `
        )
        .all();
}

// Assignment functions
function addAssignment(
    courseCode,
    title,
    dueDate,
    dueTime = null,
    description = null
) {
    return db
        .prepare(
            `
    INSERT INTO assignments (course_code, title, due_date, due_time, description)
    VALUES (?, ?, ?, ?, ?)
  `
        )
        .run(courseCode.toUpperCase(), title, dueDate, dueTime, description);
}

function getUpcomingAssignments() {
    return db
        .prepare(
            `
    SELECT a.*, c.name as course_name
    FROM assignments a
    JOIN courses c ON a.course_code = c.code
    WHERE a.due_date >= date('now') AND a.status = 'pending'
    ORDER BY a.due_date, a.due_time
  `
        )
        .all();
}

function markAssignmentComplete(id) {
    return db
        .prepare(`UPDATE assignments SET status = 'completed' WHERE id = ?`)
        .run(id);
}

// Document functions
function addDocument(
    filename,
    description,
    courseCode,
    filePath,
    mimeType,
    uploadedBy,
    tags = null,
    ocrText = null
) {
    return db
        .prepare(
            `
    INSERT INTO documents (filename, description, course_code, file_path, mime_type, uploaded_by, tags, ocr_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
        )
        .run(
            filename,
            description,
            courseCode,
            filePath,
            mimeType,
            uploadedBy,
            tags,
            ocrText
        );
}

function searchDocuments(query) {
    return db
        .prepare(
            `
    SELECT d.*, c.name as course_name
    FROM documents d
    LEFT JOIN courses c ON d.course_code = c.code
    WHERE d.filename LIKE ? OR d.description LIKE ? OR d.tags LIKE ? OR d.ocr_text LIKE ?
    COLLATE NOCASE
    ORDER BY d.uploaded_at DESC
  `
        )
        .all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
}

function getDocumentsByCourse(courseCode) {
    return db
        .prepare(
            `
    SELECT * FROM documents WHERE course_code = ? COLLATE NOCASE ORDER BY uploaded_at DESC
  `
        )
        .all(courseCode);
}

// IA Question functions
function addIAQuestion(courseCode, questionText, iaDate = null) {
    return db
        .prepare(
            `
    INSERT INTO ia_questions (course_code, question_text, ia_date)
    VALUES (?, ?, ?)
  `
        )
        .run(courseCode.toUpperCase(), questionText, iaDate);
}

function getIAQuestions(courseCode = null) {
    if (courseCode) {
        return db
            .prepare(
                `
      SELECT * FROM ia_questions WHERE course_code = ? COLLATE NOCASE ORDER BY created_at DESC
    `
            )
            .all(courseCode);
    }
    return db
        .prepare(
            `
    SELECT i.*, c.name as course_name
    FROM ia_questions i
    JOIN courses c ON i.course_code = c.code
    ORDER BY i.created_at DESC
  `
        )
        .all();
}

// User functions
function addUser(phone, name) {
    db.prepare(
        `
    INSERT INTO users (phone, name) VALUES (?, ?)
    ON CONFLICT(phone) DO UPDATE SET name = ?
  `
    ).run(phone, name, name);
}

module.exports = {
    addQuiz,
    getUserQuizzes,
    getQuizzesForReminder,
    markAsReminded,
    deleteQuiz,
    addCourse,
    getCourseByCode,
    searchCourses,
    getAllCourses,
    addSchedule,
    getScheduleByDay,
    getScheduleByTime,
    getAllSchedule,
    addAssignment,
    getUpcomingAssignments,
    markAssignmentComplete,
    addDocument,
    searchDocuments,
    getDocumentsByCourse,
    addIAQuestion,
    getIAQuestions,
    addUser,
};

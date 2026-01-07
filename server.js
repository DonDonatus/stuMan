require("dotenv").config();
const { initializeWhatsApp, sendMessage } = require("./whatsapp");
const {
    extractQuizInfo,
    analyzeImage,
    extractImportantInfo,
    parseCourseInput,
    generateStudyTip,
    answerQuestion,
} = require("./llm");
const db = require("./database");
const { startScheduler } = require("./scheduler");
const fs = require("fs").promises;
const path = require("path");

console.log("🤖 Starting AI Study Assistant Bot...\n");

// Handle text messages
async function handleMessage(message, userName) {
    const userPhone = message.from;
    const text = message.body.trim();

    db.addUser(userPhone, userName);

    // help command
    if (text.toLowerCase() === "/help" || text.toLowerCase() === "help") {
        const helpText =
            `📚 *AI Study Assistant*\n\n` +
            `*Natural Commands:*\n` +
            `• "Quiz tomorrow for Math"\n` +
            `• "What course is 405?"\n` +
            `• "What do I have on Monday at 2pm?"\n` +
            `• "Assignment for CS405 due Friday"\n` +
            `• Send images with descriptions (marking schemes, notes, etc)\n\n` +
            `*Commands:*\n` +
            `/list - Show quizzes\n` +
            `/schedule - Show weekly schedule\n` +
            `/schedule Monday - Show Monday's classes\n` +
            `/courses - List all courses\n` +
            `/assignments - Show upcoming assignments\n` +
            `/ia [course] - Show IA questions\n` +
            `/search [query] - Find documents\n` +
            `/extract - Extract info from recent messages\n` +
            `/help - This message`;

        await message.reply(helpText);
        return;
    }

    // list quizzes
    if (text.toLowerCase() === "/list") {
        const quizzes = db.getUserQuizzes(userPhone);
        if (quizzes.length === 0) {
            await message.reply("📭 No upcoming quizzes.");
            return;
        }
        let listText = `📚 *Your Upcoming Quizzes:*\n\n`;
        quizzes.forEach((q, i) => {
            listText += `${i + 1}. *${q.subject}*\n   📅 ${q.quiz_date}${
                q.quiz_time ? ` at ${q.quiz_time}` : ""
            }\n${q.topic ? `   📖 ${q.topic}\n` : ""}   🆔 ${q.id}\n\n`;
        });
        await message.reply(listText);
        return;
    }

    // schedule command
    if (text.toLowerCase().startsWith("/schedule")) {
        const parts = text.split(" ");
        if (parts.length === 1) {
            const schedule = db.getAllSchedule();
            if (schedule.length === 0) {
                await message.reply(
                    '📅 No schedule added yet. Say "Add CS405 Monday 9am-11am" to add classes!'
                );
                return;
            }
            let scheduleText = `📅 *Weekly Schedule*\n\n`;
            let currentDay = "";
            schedule.forEach((s) => {
                if (s.day_of_week !== currentDay) {
                    scheduleText += `\n*${s.day_of_week}*\n`;
                    currentDay = s.day_of_week;
                }
                scheduleText += `  ${s.start_time}-${s.end_time}: ${s.course_name} (${s.course_code})\n`;
                if (s.location) scheduleText += `  📍 ${s.location}\n`;
            });
            await message.reply(scheduleText);
        } else {
            const day = parts[1];
            const schedule = db.getScheduleByDay(day);
            if (schedule.length === 0) {
                await message.reply(`📅 No classes on ${day}.`);
                return;
            }
            let dayText = `📅 *${day}'s Schedule*\n\n`;
            schedule.forEach((s) => {
                dayText += `${s.start_time}-${s.end_time}: *${s.course_name}*\n`;
                dayText += `Code: ${s.course_code}\n`;
                if (s.instructor) dayText += `👨‍🏫 ${s.instructor}\n`;
                if (s.location) dayText += `📍 ${s.location}\n`;
                dayText += `\n`;
            });
            await message.reply(dayText);
        }
        return;
    }

    // list courses
    if (text.toLowerCase() === "/courses") {
        const courses = db.getAllCourses();
        if (courses.length === 0) {
            await message.reply(
                '📚 No courses added yet. Say "Add course CS405 Software Engineering" to add!'
            );
            return;
        }
        let courseText = `📚 *Your Courses*\n\n`;
        courses.forEach((c) => {
            courseText += `*${c.code}*: ${c.name}\n`;
            if (c.instructor) courseText += `👨‍🏫 ${c.instructor}\n`;
            courseText += `\n`;
        });
        await message.reply(courseText);
        return;
    }

    // assignments
    if (text.toLowerCase() === "/assignments") {
        const assignments = db.getUpcomingAssignments();
        if (assignments.length === 0) {
            await message.reply("📋 No upcoming assignments!");
            return;
        }
        let assignText = `📋 *Upcoming Assignments*\n\n`;
        assignments.forEach((a, i) => {
            assignText += `${i + 1}. *${a.course_name}* (${a.course_code})\n`;
            assignText += `   "${a.title}"\n`;
            assignText += `   📅 Due: ${a.due_date}${
                a.due_time ? ` at ${a.due_time}` : ""
            }\n`;
            if (a.description) assignText += `   📝 ${a.description}\n`;
            assignText += `\n`;
        });
        await message.reply(assignText);
        return;
    }

    // ia questions
    if (text.toLowerCase().startsWith("/ia")) {
        const parts = text.split(" ");
        const courseCode = parts.length > 1 ? parts[1] : null;
        const questions = db.getIAQuestions(courseCode);

        if (questions.length === 0) {
            await message.reply(
                courseCode
                    ? `📝 No IA questions for ${courseCode}.`
                    : "📝 No IA questions saved yet."
            );
            return;
        }

        let iaText = `📝 *IA Questions${
            courseCode ? ` - ${courseCode}` : ""
        }*\n\n`;
        questions.forEach((q, i) => {
            iaText += `${i + 1}. ${
                q.course_name ? `*${q.course_name}*` : q.course_code
            }\n`;
            iaText += `   ${q.question_text}\n`;
            if (q.ia_date) iaText += `   📅 ${q.ia_date}\n`;
            iaText += `\n`;
        });
        await message.reply(iaText);
        return;
    }

    // search documents
    if (text.toLowerCase().startsWith("/search ")) {
        const query = text.substring(8).trim();
        const docs = db.searchDocuments(query);

        if (docs.length === 0) {
            await message.reply(`🔍 No documents found for "${query}"`);
            return;
        }

        let searchText = `🔍 *Search Results: "${query}"*\n\n`;
        docs.slice(0, 10).forEach((d, i) => {
            searchText += `${i + 1}. ${d.filename}\n`;
            if (d.description) searchText += `   📝 ${d.description}\n`;
            if (d.course_code)
                searchText += `   📚 ${d.course_code}${
                    d.course_name ? ` - ${d.course_name}` : ""
                }\n`;
            searchText += `   📅 ${d.uploaded_at.split(" ")[0]}\n\n`;
        });
        await message.reply(searchText);
        return;
    }

    // extract info from convo
    if (text.toLowerCase() === "/extract") {
        await message.reply(
            "🔍 Analyzing recent messages for important information..."
        );
        // This would need message history - simplified for now
        await message.reply(
            '💡 Tip: Send me messages like "IA question for CS405: Explain polymorphism" or "Assignment for Math due Friday"'
        );
        return;
    }

    // NLP side

    // Check if it's a course query
    if (
        text.toLowerCase().includes("what course") ||
        text.toLowerCase().includes("which course")
    ) {
        const courseMatch = text.match(/\b([A-Z]{2,4}\s?\d{3})\b/i);
        if (courseMatch) {
            const course = db.getCourseByCode(courseMatch[1]);
            if (course) {
                let response = `📚 *${course.code}*: ${course.name}\n`;
                if (course.instructor) response += `👨‍🏫 ${course.instructor}\n`;
                if (course.description)
                    response += `📝 ${course.description}\n`;
                await message.reply(response);
                return;
            }
        }

        // Try searching by number only
        const numberMatch = text.match(/\b(\d{3})\b/);
        if (numberMatch) {
            const courses = db.searchCourses(numberMatch[1]);
            if (courses.length > 0) {
                let response = `📚 *Found ${courses.length} course(s):*\n\n`;
                courses.forEach((c) => {
                    response += `*${c.code}*: ${c.name}\n`;
                    if (c.instructor) response += `👨‍🏫 ${c.instructor}\n`;
                    response += `\n`;
                });
                await message.reply(response);
                return;
            }
        }

        await message.reply(
            "🤔 Course not found. Use /courses to see all courses."
        );
        return;
    }

    // Check if it's a schedule query
    if (
        text.toLowerCase().includes("what do i have") ||
        text.toLowerCase().includes("what class") ||
        text.toLowerCase().includes("do i have class")
    ) {
        // Extract day
        const days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ];
        const foundDay = days.find((day) => text.toLowerCase().includes(day));

        if (foundDay) {
            const capitalizedDay =
                foundDay.charAt(0).toUpperCase() + foundDay.slice(1);

            // Extract time if present
            const timeMatch = text.match(/(\d{1,2})\s*(am|pm|:)/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                const isPM = text.toLowerCase().includes("pm");

                if (isPM && hour < 12) hour += 12;
                if (!isPM && hour === 12) hour = 0;

                const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                const classes = db.getScheduleByTime(capitalizedDay, timeStr);

                if (classes.length > 0) {
                    let response = `📅 *${capitalizedDay} at ${timeMatch[0]}:*\n\n`;
                    classes.forEach((c) => {
                        response += `*${c.course_name}* (${c.course_code})\n`;
                        response += `⏰ ${c.start_time} - ${c.end_time}\n`;
                        if (c.instructor) response += `👨‍🏫 ${c.instructor}\n`;
                        if (c.location) response += `📍 ${c.location}\n`;
                    });
                    await message.reply(response);
                    return;
                } else {
                    await message.reply(
                        `📅 No classes on ${capitalizedDay} at ${timeMatch[0]}`
                    );
                    return;
                }
            }

            // Just day, no time
            const schedule = db.getScheduleByDay(capitalizedDay);
            if (schedule.length > 0) {
                let response = `📅 *${capitalizedDay}'s Schedule:*\n\n`;
                schedule.forEach((s) => {
                    response += `${s.start_time}-${s.end_time}: *${s.course_name}*\n`;
                    response += `Code: ${s.course_code}\n`;
                    if (s.instructor) response += `👨‍🏫 ${s.instructor}\n`;
                    if (s.location) response += `📍 ${s.location}\n`;
                    response += `\n`;
                });
                await message.reply(response);
                return;
            } else {
                await message.reply(
                    `📅 No classes scheduled for ${capitalizedDay}`
                );
                return;
            }
        }
    }

    // Try to extract quiz information
    const quizKeywords = ["quiz", "test", "exam", "midterm", "final"];
    if (quizKeywords.some((keyword) => text.toLowerCase().includes(keyword))) {
        await message.reply("🤔 Analyzing quiz information...");
        const quizInfo = await extractQuizInfo(text);

        if (quizInfo && quizInfo.confidence > 0.5) {
            if (quizInfo.subject && quizInfo.date) {
                db.addQuiz(userPhone, userName, {
                    subject: quizInfo.subject,
                    date: quizInfo.date,
                    time: quizInfo.time,
                    topic: quizInfo.topic,
                });

                let response = `✅ *Quiz Added!*\n\n📚 Subject: ${quizInfo.subject}\n📅 Date: ${quizInfo.date}\n`;
                if (quizInfo.time) response += `⏰ Time: ${quizInfo.time}\n`;
                if (quizInfo.topic) response += `📖 Topic: ${quizInfo.topic}\n`;
                response += `\nI'll remind you 24 hours and 1 hour before! 🔔`;

                await message.reply(response);
                return;
            }
        }

        await message.reply(
            '🤔 I couldn\'t extract complete quiz info. Try: "Quiz tomorrow for Math at 2pm on Calculus"'
        );
        return;
    }

    // Try to extract assignment information
    if (
        text.toLowerCase().includes("assignment") ||
        text.toLowerCase().includes("homework")
    ) {
        await message.reply("🤔 Analyzing assignment information...");
        const courseInfo = await parseCourseInput(text);

        if (courseInfo && courseInfo.courseCode) {
            // Extract due date
            const dateMatch = text.match(/due\s+(\w+)/i);
            if (dateMatch) {
                const dueText = dateMatch[1].toLowerCase();
                const today = new Date();
                let dueDate = today.toISOString().split("T")[0];

                if (dueText === "tomorrow") {
                    today.setDate(today.getDate() + 1);
                    dueDate = today.toISOString().split("T")[0];
                } else if (dueText === "friday" || dueText === "monday") {
                    // Simplified - would need better date parsing
                    dueDate = dueText;
                }

                // Extract title from message
                const title = text
                    .replace(/assignment|homework|due.*$/gi, "")
                    .trim();

                db.addAssignment(
                    courseInfo.courseCode,
                    title || "Assignment",
                    dueDate
                );
                await message.reply(
                    `✅ Assignment added for ${courseInfo.courseCode}!\nDue: ${dueDate}`
                );
                return;
            }
        }

        await message.reply(
            '🤔 Try: "Assignment for CS405 due Friday" or use /assignments to view all'
        );
        return;
    }

    // Try to extract IA question
    if (
        text.toLowerCase().includes("ia question") ||
        text.toLowerCase().includes("ia:")
    ) {
        const courseMatch = text.match(/\b([A-Z]{2,4}\s?\d{3})\b/i);
        if (courseMatch) {
            const questionText = text
                .replace(/ia question|ia:|for|course/gi, "")
                .replace(courseMatch[0], "")
                .trim();
            if (questionText) {
                db.addIAQuestion(courseMatch[1], questionText);
                await message.reply(
                    `✅ IA question saved for ${courseMatch[1]}!\n\n"${questionText}"\n\nUse /ia ${courseMatch[1]} to view all questions.`
                );
                return;
            }
        }

        await message.reply(
            '🤔 Try: "IA question for CS405: Explain polymorphism"'
        );
        return;
    }

    // Try to add course/schedule
    if (
        text.toLowerCase().includes("add course") ||
        text.toLowerCase().includes("new course")
    ) {
        const courseInfo = await parseCourseInput(text);

        if (courseInfo && courseInfo.courseCode && courseInfo.courseName) {
            db.addCourse(
                courseInfo.courseCode,
                courseInfo.courseName,
                courseInfo.instructor
            );
            let response = `✅ *Course Added!*\n\n📚 ${courseInfo.courseCode}: ${courseInfo.courseName}\n`;
            if (courseInfo.instructor)
                response += `👨‍🏫 ${courseInfo.instructor}\n`;
            await message.reply(response);
            return;
        }

        await message.reply(
            '🤔 Try: "Add course CS405 Software Engineering with Dr. Smith"'
        );
        return;
    }

    if (
        text.toLowerCase().includes("add") &&
        (text.toLowerCase().includes("monday") ||
            text.toLowerCase().includes("tuesday") ||
            text.toLowerCase().includes("wednesday") ||
            text.toLowerCase().includes("thursday") ||
            text.toLowerCase().includes("friday"))
    ) {
        const courseInfo = await parseCourseInput(text);

        if (
            courseInfo &&
            courseInfo.courseCode &&
            courseInfo.day &&
            courseInfo.startTime &&
            courseInfo.endTime
        ) {
            db.addSchedule(
                courseInfo.courseCode,
                courseInfo.day,
                courseInfo.startTime,
                courseInfo.endTime,
                courseInfo.location
            );
            let response = `✅ *Class Added to Schedule!*\n\n📚 ${courseInfo.courseCode}\n📅 ${courseInfo.day}\n⏰ ${courseInfo.startTime} - ${courseInfo.endTime}\n`;
            if (courseInfo.location) response += `📍 ${courseInfo.location}\n`;
            await message.reply(response);
            return;
        }

        await message.reply(
            '🤔 Try: "Add CS405 Monday 9:00 to 11:00 at Room 301"'
        );
        return;
    }

    //Conversational responses

    // Greetings
    const greetings = ["hi", "hello", "hey", "hola", "sup", "yo", "greetings"];
    if (
        greetings.some(
            (g) => text.toLowerCase() === g || text.toLowerCase() === g + "!"
        )
    ) {
        await message.reply(
            `Hey ${userName}! 👋 I'm your AI Study Assistant. How can I help you today?`
        );
        return;
    }

    // How are you / What's up
    if (
        text.toLowerCase().includes("how are you") ||
        text.toLowerCase().includes("how r u") ||
        text.toLowerCase().includes("whats up") ||
        text.toLowerCase().includes("what's up")
    ) {
        await message.reply(
            `I'm doing great, thanks for asking! 😊 Ready to help you with your studies. What do you need?`
        );
        return;
    }

    // Bot identity questions
    if (
        text.toLowerCase().includes("who are you") ||
        text.toLowerCase().includes("what are you")
    ) {
        await message.reply(
            `🤖 I'm your AI Study Assistant!\n\n` +
                `I use Groq's Llama 3.3 70B model for conversations and Llama 3.2 90B Vision for analyzing images.\n\n` +
                `I can help you:\n` +
                `• Track quizzes and assignments\n` +
                `• Manage your course schedule\n` +
                `• Store and search documents\n` +
                `• Answer questions about your studies\n\n` +
                `Just talk to me naturally! 💬`
        );
        return;
    }

    // Which AI/LLM questions
    if (
        text.toLowerCase().includes("which ai") ||
        text.toLowerCase().includes("which llm") ||
        text.toLowerCase().includes("what ai") ||
        text.toLowerCase().includes("what llm") ||
        text.toLowerCase().includes("ai service")
    ) {
        await message.reply(
            `🧠 I'm powered by Groq!\n\n` +
                `• Text AI: Llama 3.3 70B Versatile\n` +
                `• Vision AI: Llama 3.2 90B Vision\n` +
                `• Database: SQLite\n` +
                `• Platform: WhatsApp Web.js\n\n` +
                `Pretty cool stack, right? 😎`
        );
        return;
    }

    // Thanks
    if (
        text.toLowerCase().includes("thank") ||
        text.toLowerCase().includes("thanks")
    ) {
        const responses = [
            `You're welcome! 😊`,
            `Happy to help! 💪`,
            `Anytime! 🙌`,
            `No problem! 👍`,
        ];
        await message.reply(
            responses[Math.floor(Math.random() * responses.length)]
        );
        return;
    }

    // Default: Use conversational AI to answer
    // Gather context from database
    const courses = db.getAllCourses();
    const schedule = db.getAllSchedule();
    const quizzes = db.getUserQuizzes(userPhone);
    const assignments = db.getUpcomingAssignments();

    let context = "";

    if (courses.length > 0) {
        context += "Courses:\n";
        courses.forEach((c) => {
            context += `- ${c.code}: ${c.name}${
                c.instructor ? ` (${c.instructor})` : ""
            }\n`;
        });
        context += "\n";
    }

    if (schedule.length > 0) {
        context += "Weekly Schedule:\n";
        let currentDay = "";
        schedule.forEach((s) => {
            if (s.day_of_week !== currentDay) {
                context += `${s.day_of_week}:\n`;
                currentDay = s.day_of_week;
            }
            context += `  ${s.start_time}-${s.end_time}: ${s.course_name} (${
                s.course_code
            })${s.location ? ` at ${s.location}` : ""}\n`;
        });
        context += "\n";
    }

    if (quizzes.length > 0) {
        context += "Upcoming Quizzes:\n";
        quizzes.slice(0, 5).forEach((q) => {
            context += `- ${q.subject} on ${q.quiz_date}${
                q.quiz_time ? ` at ${q.quiz_time}` : ""
            }${q.topic ? ` (${q.topic})` : ""}\n`;
        });
        context += "\n";
    }

    if (assignments.length > 0) {
        context += "Upcoming Assignments:\n";
        assignments.slice(0, 5).forEach((a) => {
            context += `- ${a.course_name}: "${a.title}" due ${a.due_date}\n`;
        });
        context += "\n";
    }

    if (!context) {
        context =
            "No data in database yet. The student hasn't added any courses, schedules, quizzes, or assignments.";
    }

    // Use AI to answer the question
    await message.reply("🤔 Let me think about that...");
    const answer = await answerQuestion(text, context);
    await message.reply(answer);
}

// Handle media messages (images, documents)
async function handleMedia(message, userName, media) {
    const userPhone = message.from;
    const caption = message.body || "";

    console.log(`📎 Processing media from ${userName}...`);

    try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, "uploads");
        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir, { recursive: true });
        }

        // Generate filename
        const timestamp = Date.now();
        const extension = media.mimetype.split("/")[1] || "jpg";
        const filename = `${timestamp}_${userPhone.replace(
            /[^a-zA-Z0-9]/g,
            ""
        )}.${extension}`;
        const filePath = path.join(uploadsDir, filename);

        // Save file
        const buffer = Buffer.from(media.data, "base64");
        await fs.writeFile(filePath, buffer);

        console.log(`💾 Saved file: ${filename}`);

        // Analyze image with AI if it's an image
        let description = caption;
        let extractedText = null;
        let courseCode = null;

        if (media.mimetype.startsWith("image/")) {
            await message.reply("🔍 Analyzing image with AI...");

            // Extract course code from caption if present
            const courseMatch = caption.match(/\b([A-Z]{2,4}\s?\d{3})\b/i);
            if (courseMatch) {
                courseCode = courseMatch[1].toUpperCase();
            }

            // Analyze image content
            const analysisPrompt = `Analyze this image and provide:
1. A brief description of what it contains
2. Extract any text (OCR)
3. Identify if it's a marking scheme, notes, assignment, or other academic content

Format your response as:
DESCRIPTION: [brief description]
TEXT: [extracted text if any]
TYPE: [marking scheme/notes/assignment/other]`;

            const analysis = await analyzeImage(media.data, analysisPrompt);

            if (analysis) {
                // Parse AI response
                const descMatch = analysis.match(
                    /DESCRIPTION:\s*(.+?)(?=\nTEXT:|$)/s
                );
                const textMatch = analysis.match(/TEXT:\s*(.+?)(?=\nTYPE:|$)/s);

                if (descMatch) description = descMatch[1].trim();
                if (textMatch) extractedText = textMatch[1].trim();

                console.log(`🤖 AI Analysis: ${description}`);
            }
        }

        // Store in database
        db.addDocument(
            filename,
            description || "Uploaded document",
            courseCode,
            filePath,
            media.mimetype,
            userPhone,
            null,
            extractedText
        );

        let response = `✅ *Document Saved!*\n\n📄 ${filename}\n`;
        if (description) response += `📝 ${description}\n`;
        if (courseCode) response += `📚 Course: ${courseCode}\n`;
        response += `\n💡 Use /search to find it later!`;

        await message.reply(response);

        // Check if caption contains IA question or other info
        if (
            caption.toLowerCase().includes("ia question") ||
            caption.toLowerCase().includes("ia:")
        ) {
            if (courseCode) {
                const questionText = caption
                    .replace(/ia question|ia:|for|course/gi, "")
                    .replace(courseCode, "")
                    .trim();
                if (questionText) {
                    db.addIAQuestion(courseCode, questionText);
                    await message.reply(
                        `✅ Also saved as IA question for ${courseCode}!`
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error handling media:", error);
        await message.reply(
            "❌ Sorry, there was an error processing your file. Please try again."
        );
    }
}

// Initialize and start the bot
console.log("🔌 Initializing WhatsApp connection...\n");

initializeWhatsApp(handleMessage, handleMedia);
startScheduler();

console.log("✅ Bot is running! Waiting for messages...\n");

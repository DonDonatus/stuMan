const cron = require("node-cron");
const {
    getQuizzesForReminder,
    markAsReminded,
    getUpcomingAssignments,
} = require("./database");
const { sendMessage } = require("./whatsapp");
const { generateStudyTip } = require("./llm");

function startScheduler() {
    // This will run every hour for quiz reminders
    cron.schedule("0 * * * *", async () => {
        console.log("\n⏰ Checking for reminders...");

        // Quiz reminders (24h)
        const quizzes24h = getQuizzesForReminder(24);
        for (const quiz of quizzes24h) {
            const studyTip = await generateStudyTip(quiz.subject, quiz.topic);
            const message = `⏰ *Quiz Tomorrow!*\n\n📚 Subject: ${
                quiz.subject
            }\n📅 ${quiz.quiz_date}\n${
                quiz.quiz_time ? `⏱️ ${quiz.quiz_time}\n` : ""
            }${quiz.topic ? `📖 ${quiz.topic}\n` : ""}\n💡 ${studyTip}`;
            await sendMessage(quiz.user_phone, message);
            markAsReminded(quiz.id, 24);
        }

        // Quiz reminders (1h)
        const quizzes1h = getQuizzesForReminder(1);
        for (const quiz of quizzes1h) {
            const message = `🚨 *Quiz in 1 Hour!*\n\n📚 ${quiz.subject}\n${
                quiz.topic ? `📖 ${quiz.topic}\n` : ""
            }\nGood luck! 💪`;
            await sendMessage(quiz.user_phone, message);
            markAsReminded(quiz.id, 1);
        }

        console.log(
            `✅ Sent ${quizzes24h.length + quizzes1h.length} quiz reminders`
        );
    });

    // Daily assignment reminder (8 AM)
    cron.schedule("0 8 * * *", async () => {
        const assignments = getUpcomingAssignments();
        if (assignments.length > 0) {
            let message = `📋 *Upcoming Assignments*\n\n`;
            assignments.slice(0, 5).forEach((a) => {
                message += `• ${a.course_name} (${a.course_code})\n  "${
                    a.title
                }"\n  Due: ${a.due_date}${
                    a.due_time ? ` at ${a.due_time}` : ""
                }\n\n`;
            });
            // Send to all users (you'd need to track this)
            console.log("Assignment reminder:", message);
        }
    });

    console.log("⏰ Scheduler started - checking hourly for reminders");
}

module.exports = { startScheduler };

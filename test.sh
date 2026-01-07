

echo "🧪 Testing AI Study Assistant Bot..."
echo ""

# Test 1: Syntax validation
echo "1️⃣ Testing syntax..."
node --check server.js && \
node --check llm.js && \
node --check database.js && \
node --check whatsapp.js && \
node --check scheduler.js

if [ $? -eq 0 ]; then
    echo "✅ All files have valid syntax"
else
    echo "❌ Syntax errors found"
    exit 1
fi

echo ""

# Test 2: Check dependencies
echo "2️⃣ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "⚠️  node_modules not found, run: npm install"
fi

echo ""

# Test 3: Check environment
echo "3️⃣ Checking environment..."
if [ -f ".env" ]; then
    if grep -q "GROQ_API_KEY" .env; then
        echo "✅ GROQ_API_KEY configured"
    else
        echo "❌ GROQ_API_KEY not found in .env"
    fi
else
    echo "❌ .env file not found"
fi

echo ""

# Test 4: Check database
echo "4️⃣ Checking database..."
if [ -f "quizbot.db" ]; then
    echo "✅ Database exists"
else
    echo "⚠️  Database will be created on first run"
fi

echo ""

# Test 5: Check uploads directory
echo "5️⃣ Checking uploads directory..."
if [ -d "uploads" ]; then
    echo "✅ Uploads directory exists"
else
    echo "⚠️  Uploads directory will be created on first run"
fi

echo ""
echo "🎉 Pre-flight checks complete!"
echo ""
echo "To start the bot, run:"
echo "  node server.js"
echo ""
echo "Then scan the QR code with WhatsApp to connect."

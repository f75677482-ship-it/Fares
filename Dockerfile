# استخدام صورة أساسية تحتوي على نظام لينكس مدمج معه بيئة بايثون
FROM python:3.10-slim

# تثبيت Node.js و npm و git والأدوات الأساسية للنظام
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# تحديد مجلد العمل داخل السيرفر
WORKDIR /app

# منع تنزيل Chromium أثناء تثبيت Puppeteer داخل بيئة الاستضافة
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# نسخ ملفات الاعتماد أولاً للاستفادة من الكاش
COPY package*.json ./

# تثبيت مكتبات بايثون
RUN pip install --no-cache-dir python-telegram-bot requests

# تثبيت مكتبات Node.js من ملف القفل بشكل ثابت
RUN npm ci --omit=dev --no-audit --no-fund

# نسخ بقية ملفات المشروع بعد تثبيت التبعيات
COPY . .

# تحديد الأمر الإفتراضي عند تشغيل الحاوية
CMD ["node", "index.js"]

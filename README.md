# 🔑 Pro Keys Dashboard

## الخطوات (اتبعها بالترتيب)

### الخطوة 1 — Database Setup
1. افتح Supabase Dashboard
2. اضغط على **SQL Editor**
3. افتح ملف `supabase_schema.sql` وانسخ كل المحتوى
4. الصقه في SQL Editor واضغط **Run**

### الخطوة 2 — Create Admin User
1. في Supabase اضغط على **Authentication → Users**
2. اضغط **Add user**
3. اكتب الـ email والـ password بتاعتك
4. اضغط **Create user**
5. روح على **SQL Editor** واكتب:
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID_HERE';
```

### الخطوة 3 — Run the App
1. ضع الفولدر في `D:\Bussines\Pro Keys\Dashboard`
2. دبل كليك على **SETUP.bat** (المرة الأولى فقط)
3. المرات الجاية دبل كليك على **START.bat**
4. افتح المتصفح على **http://localhost:3000**

## ملاحظة
الـ `.env.local` جاهز بالـ API keys

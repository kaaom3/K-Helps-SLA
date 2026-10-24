# 🚀 คู่มือการนำระบบ K-Helps SLA Analytics ขึ้นออนไลน์ (GitHub + MongoDB Atlas + Vercel)

ระบบถูกอัปเกรดให้รองรับฐานข้อมูลออนไลน์ **MongoDB** ผ่าน **Vercel Serverless API (`/api/db`)** เรียบร้อยแล้ว พร้อมระบบ **Auto-Fallback** (หากเปิดไฟล์แบบออฟไลน์จะสลับไปใช้ IndexedDB อัตโนมัติ)

---

## โครงสร้างไฟล์สำหรับระบบออนไลน์
* [`api/db.js`](./api/db.js) — Vercel Serverless API เชื่อมต่อฐานข้อมูล MongoDB แยก 3 Collections อิสระ (`sessions`, `task_sla`, `call_records`)
* [`vercel.json`](./vercel.json) — ตั้งค่า Routing และ Serverless Function สำหรับ Vercel
* [`package.json`](./package.json) — รายการ Dependencies (`mongodb`, `express`, `dotenv`)
* [`server.js`](./server.js) — เซิร์ฟเวอร์สำหรับรันทดสอบในเครื่อง (`npm start`)
* [`.env.example`](./.env.example) — ตัวอย่างการตั้งค่า `MONGODB_URI`
* [`index.html`](./index.html), [`app.js`](./app.js), [`style.css`](./style.css) — หน้าเว็บ Dashboard พร้อมป้ายสถานะ `🟢 MongoDB Cloud` และปุ่ม `Sync DB`

---

## ขั้นตอนที่ 1: เตรียมฐานข้อมูล MongoDB Atlas (ฟรี)
1. เข้าไปที่ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) และสมัคร/เข้าสู่ระบบ
2. สร้าง Cluster ฟรี (**M0 Free Tier**)
3. ไปที่เมนู **Database Access** -> กด **Add New Database User**:
   * ตั้งชื่อ Username และ Password (จำรหัสผ่านไว้ใส่ใน Connection String)
   * สิทธิ์: เลือก **Read and write to any database**
4. ไปที่เมนู **Network Access** -> กด **Add IP Address**:
   * เลือก **Allow Access from Anywhere (`0.0.0.0/0`)** *(จำเป็นเพื่อให้ Vercel Serverless เชื่อมต่อได้)*
5. ไปที่เมนู **Database** -> กด **Connect** -> เลือก **Drivers** -> คัดลอก **Connection String** ซึ่งจะมีหน้าตาแบบนี้:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   *(นำรหัสผ่านจริงไปแทนที่ `<password>`)*

---

## ขั้นตอนที่ 2: นำโค้ดขึ้น GitHub
1. สร้าง Repository ใหม่บน [GitHub](https://github.com/new) (เช่น `khelps-sla-dashboard`)
2. เปิด Terminal ในโฟลเดอร์โปรเจกต์ `d:\โปรเจ็คทั้งหมด\Auu` แล้วรันคำสั่ง:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: K-Helps SLA Analytics with MongoDB & Vercel"
   git branch -M main
   git remote add origin https://github.com/<ชื่อผู้ใช้ของคุณ>/<ชื่อ-repo>.git
   git push -u origin main
   ```

---

## ขั้นตอนที่ 3: เชื่อมต่อ GitHub และ MongoDB เข้ากับ Vercel
1. เข้าไปที่ [Vercel Dashboard](https://vercel.com/dashboard) (ล็อกอินด้วยบัญชี GitHub)
2. กดปุ่ม **Add New...** -> **Project**
3. เลือก Repository `khelps-sla-dashboard` ที่เพิ่งอัปโหลด แล้วกด **Import**
4. ในหัวข้อ **Environment Variables** ให้เพิ่มตัวแปรดังนี้:
   * **Key:** `MONGODB_URI`
   * **Value:** `mongodb+srv://...` *(วาง Connection String จากขั้นตอนที่ 1)*
   * *(ตัวเลือกเสริม)* **Key:** `MONGODB_DB` / **Value:** `khelps_sla_db`
5. กดปุ่ม **Deploy**
6. เมื่อ Deploy เสร็จสิ้น เปิดลิงก์เว็บไซต์จาก Vercel จะเห็นป้ายสถานะมุมขวาบนแสดง **`🟢 MongoDB Cloud`** ทันที!
   * เมื่ออัปโหลดไฟล์ Excel หรือแก้ไขช่อง Remarks ข้อมูลจะถูกบันทึกลง MongoDB ออนไลน์ทันที
   * ทีมงานทุกคนที่เปิดลิงก์ Vercel เดียวกันจะเห็นข้อมูลชุดเดียวกัน และกดปุ่ม **Sync DB** เพื่อดึงข้อมูลล่าสุดได้ตลอดเวลา
   * การกดลบข้อมูล (Clear DB) ยังคงแยกอิสระทั้ง 3 แท็บ (`sessions`, `task_sla`, `call_records`) บน MongoDB

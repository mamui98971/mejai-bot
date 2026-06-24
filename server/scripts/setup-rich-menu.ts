import { messagingApi } from '@line/bot-sdk';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { LINE_CHANNEL_ACCESS_TOKEN, LINE_LIFF_ID } = process.env;

if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_LIFF_ID) {
  console.error('❌ Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_LIFF_ID in .env');
  process.exit(1);
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN
});

const clientBlob = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN
});

const LIFF_URL = `https://liff.line.me/${LINE_LIFF_ID}`;

// 1. วาดรูป Rich Menu ด้วย SVG
const width = 2500;
const height = 843;

const svgImage = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- พื้นหลัง -->
  <rect width="100%" height="100%" fill="#ffffff" />
  
  <!-- เส้นแบ่งตรงกลาง -->
  <line x1="1250" y1="200" x2="1250" y2="643" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round" />
  
  <!-- ปุ่มซ้าย: แชท -->
  <text x="625" y="460" font-family="Tahoma, Arial, sans-serif" font-size="140" font-weight="bold" fill="#0f172a" text-anchor="middle">แชท</text>
  
  <!-- ปุ่มขวา: หน้าหลัก -->
  <text x="1875" y="460" font-family="Tahoma, Arial, sans-serif" font-size="140" font-weight="bold" fill="#0f172a" text-anchor="middle">หน้าหลัก</text>
</svg>
`;

async function setupRichMenu() {
  try {
    console.log('🎨 กำลังแปลงโค้ด SVG เป็นรูป PNG...');
    const imageBuffer = await sharp(Buffer.from(svgImage))
      .png()
      .toBuffer();

    console.log('🛠️ กำลังสร้าง Rich Menu โครงสร้าง 2 ปุ่ม...');
    const richMenuConfig: messagingApi.RichMenuRequest = {
      size: { width: 2500, height: 843 },
      selected: true,
      name: 'Mejai Minimal Menu v2',
      chatBarText: 'เมนู ☰',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 1250, height: 843 },
          action: {
            type: 'postback',
            data: 'action=open_chat',
            inputOption: 'openKeyboard'
          }
        },
        {
          bounds: { x: 1250, y: 0, width: 1250, height: 843 },
          action: {
            type: 'uri',
            uri: LIFF_URL
          }
        }
      ]
    };

    const richMenuId = (await client.createRichMenu(richMenuConfig)).richMenuId;
    console.log(`✅ สร้างโครงสร้างสำเร็จ! (ID: ${richMenuId})`);

    console.log('📤 กำลังอัปโหลดรูปภาพขึ้นเซิร์ฟเวอร์ LINE...');
    // Create blob representing the image
    const blob = new Blob([imageBuffer as unknown as BlobPart], { type: 'image/png' });
    await clientBlob.setRichMenuImage(richMenuId, blob);
    console.log('✅ อัปโหลดรูปภาพสำเร็จ!');

    console.log('📌 กำลังตั้งค่าให้เป็นเมนู Default สำหรับทุกคน...');
    await client.setDefaultRichMenu(richMenuId);
    console.log('🎉 เสร็จสมบูรณ์! ลองเปิดแอป LINE ในมือถือเพื่อดูผลลัพธ์ได้เลยค่ะ');

  } catch (err: any) {
    console.error('❌ เกิดข้อผิดพลาด:', err.message);
    if (err.originalError) {
      console.error(err.originalError.response?.data);
    }
  }
}

setupRichMenu();

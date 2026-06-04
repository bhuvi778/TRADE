const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

const bot = new TelegramBot(token);

// Use the converted JPEG image
const photoPath = path.join(__dirname, '../assets/bot-profile.jpg');

async function main() {
  try {
    if (!fs.existsSync(photoPath)) {
      console.error(`❌ Profile picture not found at: ${photoPath}`);
      process.exit(1);
    }

    // 1. setMyDescription
    console.log("Setting bot description...");
    const descText = "Growex Capital is a Cyprus-based financial technology and digital asset trading company with over 8 years of experience in the cryptocurrency markets. Since our inception, we have focused on developing advanced trading strategies, risk management systems, and innovative investment solutions designed to capitalize on opportunities within the rapidly evolving digital asset ecosystem.";
    const descRes = await bot._request('setMyDescription', { form: { description: descText } });
    console.log("✅ setMyDescription response:", descRes);

    // 2. setMyShortDescription
    console.log("Setting bot short description...");
    const shortDescText = "Growex Capital is a Cyprus-based financial technology and digital asset trading company with 8+ years of experience.";
    const shortDescRes = await bot._request('setMyShortDescription', { form: { short_description: shortDescText } });
    console.log("✅ setMyShortDescription response:", shortDescRes);

    // 3. setMyProfilePhoto
    console.log("Setting bot profile photo...");
    const formData = {
      photo: JSON.stringify({
        type: 'static',
        photo: 'attach://photo_file'
      }),
      photo_file: {
        value: fs.createReadStream(photoPath),
        options: {
          filename: 'bot-profile.jpg',
          contentType: 'image/jpeg'
        }
      }
    };

    const photoRes = await bot._request('setMyProfilePhoto', { formData });
    console.log("✅ setMyProfilePhoto response:", photoRes);

    console.log("🎉 All updates completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during bot profile update:", error);
    process.exit(1);
  }
}

main();

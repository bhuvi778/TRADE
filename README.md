# 🤖 Telegram Crypto Trading Management Platform

A complete production-ready Telegram-based crypto trading platform built with Node.js, Express.js, MongoDB, and Telegram Bot API. Everything runs **100% inside Telegram** — no frontend website needed.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Bot Commands](#bot-commands)
- [Deployment Guide (Ubuntu VPS)](#deployment-guide-ubuntu-vps)
- [API Endpoints](#api-endpoints)
- [Security](#security)

---

## ✨ Features

### 👤 User Features
- Auto-registration on `/start`
- USDT deposit with TxHash verification
- Wallet balance tracking
- Profit history
- Withdrawal requests (TRC20)
- Full transaction history
- Referral system with bonuses
- Support messaging
- Profile & rank system

### 🔐 Admin Features
- Approve/reject deposits
- Approve/reject withdrawals
- Add profits (fixed or percentage)
- Manage user balances
- Ban/unban users
- Broadcast messages to all users
- View platform analytics
- Full admin action logging

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 16+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Bot API | node-telegram-bot-api |
| Auth | JWT + bcryptjs |
| Security | Helmet, CORS, Rate Limiting, Mongo Sanitize |
| Logging | Winston + Daily Rotate |
| Process | PM2 |
| Proxy | NGINX |

---

## 📁 Project Structure

```
project/
├── bot/
│   ├── handlers/
│   │   ├── userHandlers.js        # /start, profile, balance, referral, support
│   │   ├── depositHandlers.js     # Deposit USDT flow
│   │   ├── withdrawalHandlers.js  # Withdrawal flow
│   │   ├── profitHandlers.js      # Profit history
│   │   ├── adminHandlers.js       # All admin operations
│   │   └── transactionHandlers.js # Transaction history
│   ├── keyboards/
│   │   ├── mainKeyboard.js        # Reply keyboards
│   │   └── inlineKeyboards.js     # Inline buttons
│   ├── stateManager.js            # Conversation state machine
│   └── index.js                   # Bot initialization & event routing
├── config/
│   └── config.js                  # Centralized config
├── controllers/                   # REST API controllers
├── database/
│   └── connection.js              # MongoDB connection
├── middleware/
│   ├── auth.js                    # JWT middleware
│   ├── adminAuth.js               # Admin guard
│   └── rateLimiter.js             # Rate limiting
├── models/
│   ├── User.js
│   ├── Deposit.js
│   ├── Withdrawal.js
│   ├── Profit.js
│   ├── Transaction.js
│   ├── Referral.js
│   └── AdminLog.js
├── routes/                        # Express routes
├── services/
│   ├── notificationService.js     # Telegram notifications
│   ├── referralService.js         # Referral processing
│   └── analyticsService.js        # Platform statistics
├── utils/
│   ├── logger.js                  # Winston logger
│   ├── helpers.js                 # Utility functions
│   ├── formatters.js              # Message formatters
│   └── validators.js              # Input validators
├── logs/                          # Auto-created log files
├── .env.example                   # Environment template
├── ecosystem.config.js            # PM2 config
├── nginx.conf                     # NGINX config
└── server.js                      # Entry point
```

---

## ⚙️ Setup & Installation

### 1. Clone / Copy Project

```bash
cd /var/www
git clone https://github.com/your-repo/telegram-trading-bot.git
cd telegram-trading-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in all required values (see Configuration section below).

### 4. Run in Development

```bash
npm run dev
```

### 5. Run in Production (PM2)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔧 Configuration

Copy `.env.example` to `.env` and set these values:

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Get from @BotFather | ✅ |
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ |
| `ADMIN_TELEGRAM_IDS` | Comma-separated admin Telegram IDs | ✅ |
| `TRC20_WALLET_ADDRESS` | Your deposit wallet address | ✅ |
| `JWT_SECRET` | Random 32+ char secret | ✅ |
| `REFERRAL_BONUS_PERCENTAGE` | Referral bonus % (default: 5) | ⬜ |
| `MIN_WITHDRAWAL_AMOUNT` | Min withdrawal in USDT (default: 10) | ⬜ |
| `WITHDRAWAL_FEE_PERCENTAGE` | Withdrawal fee % (default: 1) | ⬜ |

### Getting Your Telegram ID
Send a message to [@userinfobot](https://t.me/userinfobot) on Telegram.

### Getting Bot Token
1. Open Telegram → search @BotFather
2. Send `/newbot`
3. Follow instructions
4. Copy the token

---

## 🤖 Bot Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and open main menu |
| `/help` | Show help guide |
| `/cancel` | Cancel current operation |

### Menu Buttons

| Button | Action |
|--------|--------|
| 💰 Deposit USDT | Start deposit flow |
| 📊 My Balance | View wallet balance |
| 📈 Profit History | View profit records |
| 💸 Withdraw | Request withdrawal |
| 📜 Transactions | View transaction history |
| 👥 Referral System | Get referral link & stats |
| 📞 Support | Contact support |
| ⚙️ Profile | View full profile |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/users` | List all users |
| `/deposits` | View pending deposits |
| `/withdrawals` | View pending withdrawals |
| `/profits` | Add profit to user |
| `/stats` | Platform analytics |
| `/broadcast` | Send message to all users |
| `/banuser [id]` | Ban a user |
| `/unbanuser [id]` | Unban a user |
| `/manageuser [id]` | Manage specific user |

---

## 🚀 Deployment Guide (Ubuntu VPS)

### Prerequisites
- Ubuntu 20.04+
- Node.js 16+
- MongoDB Atlas account
- Domain name (optional)

### Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### Step 2: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

### Step 3: Install PM2 & NGINX

```bash
sudo npm install -g pm2
sudo apt install -y nginx
```

### Step 4: Deploy Application

```bash
mkdir -p /var/www/trading-bot
cd /var/www/trading-bot
# Upload your files or git clone
npm install --production
cp .env.example .env
nano .env  # Fill in your values
```

### Step 5: Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp $HOME
# Run the command it outputs
```

### Step 6: Configure NGINX

```bash
sudo cp nginx.conf /etc/nginx/sites-available/trading-bot
sudo nano /etc/nginx/sites-available/trading-bot
# Replace YOUR_DOMAIN_OR_IP with your actual domain or IP

sudo ln -s /etc/nginx/sites-available/trading-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: SSL Certificate (Optional, with domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Step 8: Firewall Setup

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Monitoring

```bash
pm2 logs telegram-trading-bot  # View logs
pm2 monit                       # Real-time monitoring
pm2 status                      # Process status
```

---

## 📡 API Endpoints

All REST endpoints are secondary (bot is primary interface).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/api/users/profile` | JWT | Get user profile |
| GET | `/api/users/transactions` | JWT | Get transactions |
| GET | `/api/deposits` | JWT | Get user deposits |
| GET | `/api/withdrawals` | JWT | Get user withdrawals |
| GET | `/api/profits` | JWT | Get user profits |
| GET | `/api/admin/users` | JWT+Admin | Get all users |
| GET | `/api/admin/deposits/pending` | JWT+Admin | Pending deposits |
| GET | `/api/admin/withdrawals/pending` | JWT+Admin | Pending withdrawals |
| GET | `/api/admin/stats` | JWT+Admin | Platform statistics |
| GET | `/api/admin/logs` | JWT+Admin | Admin action logs |

---

## 🔒 Security

- **Helmet.js** — HTTP security headers
- **CORS** — Restricted origin access
- **Rate Limiting** — Per-IP request limits
- **MongoDB Sanitize** — NoSQL injection prevention
- **JWT Auth** — Stateless API authentication
- **Input Validation** — All user inputs validated
- **Admin Middleware** — Strict admin ID whitelist
- **Environment Variables** — No hardcoded secrets
- **Error Handling** — Production errors are generic

---

## 📊 Database Schema

### User
- telegramId, username, fullName
- walletBalance, totalDeposits, totalWithdrawals, totalProfits
- referralCode, referredBy, referralCount
- rank (Bronze → Diamond based on deposits)
- isBanned, isAdmin

### Deposit / Withdrawal
- userId, telegramId, amount, status
- txHash (deposits), walletAddress (withdrawals)
- approvedBy, approvedAt, rejectedReason

### Transaction
- userId, type (deposit/withdrawal/profit/referral_bonus)
- amount, direction (credit/debit)
- balanceBefore, balanceAfter

### Profit
- userId, amount, type (fixed/percentage), percentage
- description, balanceBefore, balanceAfter, addedBy

### AdminLog
- adminId, action, targetUserId, details

---

## 🆘 Troubleshooting

**Bot not responding:**
```bash
pm2 logs telegram-trading-bot --lines 50
```

**MongoDB connection error:**
- Check MONGODB_URI in .env
- Ensure IP whitelist includes your VPS IP in MongoDB Atlas

**409 Conflict error:**
- Another bot instance is running. Stop it: `pm2 delete all && pm2 start ecosystem.config.js`

---

## 📝 License

MIT License — Free to use and modify.

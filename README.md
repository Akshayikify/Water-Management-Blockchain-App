# AquaChain | Blockchain-Based Water Management System

A decentralized-inspired water management system designed for transparency and immutability. This project demonstrates how blockchain concepts (blocks, hashes, proof-of-work) can be applied to resource management.

## 🚀 Features
- **User Authentication**: Secure login for Consumers and Authority (Admin).
- **Blockchain Ledger**: Every water consumption record is mined into a block with SHA-256 hashing.
- **Proof-of-Work**: Implements a simple mining algorithm to ensure ledger integrity.
- **Real-time Analytics**: Visualizes usage trends using Chart.js.
- **Admin Panel**: Monitor usage across all users and identify over-consumption.
- **Immutability Check**: Verify the blockchain's validity in real-time.

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Chart.js, Lucide Icons.
- **Backend**: Python, Flask, Flask-SQLAlchemy.
- **Blockchain**: Custom Python implementation.
- **Database**: SQLite (local database).

## 📂 Project Structure
```text
/
├── backend/
│   └── app.py          # Flask Server & API
├── blockchain/
│   └── core.py         # Blockchain & Block classes
├── frontend/
│   ├── index.html      # UI Structure
│   ├── style.css       # Premium Design
│   └── script.js       # App Logic
├── database/           # SQLite storage
└── requirements.txt    # Python dependencies
```

## ⚙️ Setup Instructions

### 1. Prerequisites
- Python 3.8 or higher installed.

### 2. Install Dependencies
Open your terminal and run:
```bash
pip install -r requirements.txt
```

### 3. Start the Server
Navigate to the root directory and run:
```bash
python backend/app.py
```

### 4. Access the App
Open your browser and go to:
[http://localhost:5000](http://localhost:5000)

---

## 🔐 Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin_password`

---

## 📈 Sample Data for Testing
1. Register a new consumer account (e.g., `user1`).
2. Login and submit a few water usage records (e.g., `45.5L`, `120L`, `300L`).
3. Go to the **Blockchain Ledger** tab to see the blocks being mined.
4. Log in as `admin` to see the global overview.

## 🧠 How Blockchain is Used
In this system, traditional databases can be tampered with by an attacker to hide water theft or over-usage.
- **Hashing**: Each block contains a hash of its data + the previous block's hash. If a single byte in an old record is changed, all subsequent hashes become invalid.
- **Mining**: Proof-of-work (nonce hunting) makes it computationally expensive to "rewrite" history.
- **Validation**: The system continuously checks that `current_block.previous_hash == previous_block.hash` to ensure the chain is unbroken.

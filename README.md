 Collab-Editor
A real-time collaborative editor using Node.js, WebSockets, and React.

🚀 Overview
Collab-Editor allows multiple users to edit a document simultaneously in real time. It uses Node.js for the backend, WebSockets for communication, and React for the frontend — enabling seamless collaboration.

✨ Features
Real-time collaborative editing

Runs locally

Supports multiple simultaneous users

🛠️ Technologies Used
Node.js

WebSockets

React

📦 Dependencies
express

ws

cors

🧪 Getting Started

To run the project locally:

```bash
# 1. Clone the repository
git clone https://github.com/khushigoyal-11/Collab-DocEdify.git
cd Collab-DocEdify

# 2. Install dependencies
npm install express ws cors

# 3. Start the server
node server.js

Now, open multiple browser tabs/windows and go to:
http://localhost:3000
Start collaborating in real time!

⚙️ How it Works
Clients connect to the server via WebSockets.

Changes made by one user are broadcasted to all other connected users.

The React frontend updates in real-time with the new content.
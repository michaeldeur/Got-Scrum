# Team C♭ - Agile Estimation Project (Got Scrum?)

## Overview

Got Scrum? is a collaborative web application for agile teams to estimate user stories. It features real-time updates, user management, and persistent storage. Curently up to six team members join a room and are then able to partipate in creating user stories, the estimating process, and in viewing the backlog of estimated stories. 

## Team

**Team Name:** Team C♭

## Features

- **Real-time estimation:** Uses WebSockets for instant updates between users.
- **User management:** Join or leave estimation sessions, see who is connected.
- **Story queue:** Add, remove, and reorder user stories for estimation.
- **Estimation history:** View previously estimated stories.
- **Persistent storage:** Stories and cards are stored using NeDB.

## Tech Stack

- **Frontend:** React, React Router, TypeScript
- **Backend:** Express, TypeScript, WebSocket (ws)
- **Database:** NeDB (via @seald-io/nedb)
- **Build tools:** Webpack, Babel, TypeScript

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm

### Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/Team-Cb/Team-Cb.git
    cd Team-Cb
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

### Running the App

#### Development

```sh
npm run start:dev
```

### Project Structure
```sh
client/
  src/
    [index.html](http://_vscodecontentref_/0)
server/
  src/
    api/
      [main.ts](http://_vscodecontentref_/1)         # Express + WebSocket server
    db/
      [dataAccess.ts](http://_vscodecontentref_/2)   # NeDB data access layer
    js/
      [Cards.ts](http://_vscodecontentref_/3)
      [estimation.tsx](http://_vscodecontentref_/4)  # Main estimation UI
      [home.tsx](http://_vscodecontentref_/5)        # Join/Create room UI
      [index.tsx](http://_vscodecontentref_/6)       # React entry point
      [User.ts](http://_vscodecontentref_/7)
      [UserStory.ts](http://_vscodecontentref_/8)
```

### Production
 ```sh
    npm run start
 ```
The REST API will be available at http://localhost:8080
The WebSocket server runs on port 3030

### Usage
Open the app in your browser at http://localhost:8080.
Enter your name and join a room.
Add user stories to the queue.
Vote on story points using the estimation cards.
See results and estimation history in real time.

### License
MIT

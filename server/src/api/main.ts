// restful server
import path from "path";
import express, { Express, NextFunction, Request, Response } from "express"
import { UserStory } from "../js/UserStory";
import { CardDataAccess, EstimatedStoryDataAccess, StoryDataAccess } from "../db/dataAccess";
import { Card } from "../js/Cards";

import WebSocket from "ws";
import User from "../js/User";

const app: Express = express();
let canVote = true;
//WebSocket server
const WSPort = 3030;
const RESTfulPort = 8080;

const wsServer = new WebSocket.Server({ port: WSPort }, () => {
    console.log("This sever is serving! Huzzah!");
});
let refreshClients = () => {
    wsServer.clients.forEach((inClient: WebSocket) => {
        inClient.send("refresh");
    })
}

let users: User[] = new Array();
let consensus = (index: number) => {
    let isConsensus = true;
    let allNeg1 = true;
    let firstPoints = users.at(0)?.getPoints();
    if (index >= 0) {
        firstPoints = users.at(index)?.getPoints();
    } else if (users && index >= users.length) { index = 0 }
    if (firstPoints == undefined) { } else if (firstPoints >= 0) {
        users.forEach((user) => {
            isConsensus = ((user.getPoints() == firstPoints) || user.getPoints() == -1);
            allNeg1 = (user.getPoints() == -1);
        })
    } else {
        consensus(index + 1);
    }
    if (isConsensus == true && allNeg1 != true) {
        return firstPoints;
    };
}


const addUser = (messageParts: string[], socket: WebSocket) => {
    let name = messageParts[2];
    let need = true;
    let uid = messageParts[1];

    if (!uid || !name) {
        return;
    }
    users.forEach((user: User, i: number) => {
        if (user.getUID() == uid) {
            if (name == user.getName()) {
                need = false;
            } else {
                users.splice(i, 1);
            }
        }
    })
    if (need) {
        users.push(new User(uid, name));
    }
    setTimeout(() => {
        wsServer.clients.forEach((inClient: WebSocket) => {
            users.forEach((user: User) => {
                inClient.send(`add-user_${user.getUID()}_${user.getName()}`);
            })
        });
    }, 750)

}
let pong: NodeJS.Timeout;
let removeUser = (userID: string) => {
    users.forEach((user, i) => {
        if (user.getUID() == userID) {
            users.splice(i, 1)
        }
    })
    wsServer.clients.forEach((inClient: WebSocket) => {
        inClient.send(`remove_${userID}`)
    })
}
// Observer Pattern
wsServer.on("connection", (socket: WebSocket) => {
    let tm: any;
    const ping = (user: User) => {
        socket.send("ping");
        tm = setTimeout(() => {
            removeUser(user.getUID());
            clearInterval(pong);
            socket.close();
        }, 5000)

    };
    const pingPong = (user: User) => {
        pong = setInterval(ping, 6000, user);
    }
    const voted = async () => {
        let hasEveryoneVoted = true;
        users.forEach((person) => {
            if (hasEveryoneVoted) {
                hasEveryoneVoted = person.getPoints() != -2;
            }
        })

        if (hasEveryoneVoted) {
            canVote = false;
            let consensusVal = consensus(0)
            if (consensusVal) {
                const stories = await StoryDataAccess.getDataAccess().getStories();
                stories.sort((a, b) => parseInt(a.id!) - parseInt(b.id!));
                const story: UserStory = stories[0];
                if (story != null) {
                    story.storyValues = (consensusVal);
                    EstimatedStoryDataAccess.getDataAccess().addStory(story);
                    StoryDataAccess.getDataAccess().removeStory(story);
                }
            }
            console.log("Everyone voted!")
            wsServer.clients.forEach((client: WebSocket) => {
                users.forEach((user) => {
                    setTimeout(() => {
                        client.send(`voted_${user.getUID()}_${user.getPoints()}`)
                    }, 500);
                })
            });
            setTimeout(() => {
                users.forEach((user) => {
                    user.resetPoints();
                })
                canVote = true;
                wsServer.clients.forEach((client) => {
                    client.send("resetPoints")
                })
            }, 15000)

        }
    }

    console.log("Client connected...");
    let uid: string = `uid${new Date().getTime()}`;
    socket.on("message", (inMessage: string) => {
        const messageParts: string[] = String(inMessage).split("_", 3);
        const messageType = messageParts[0];
        if (messageParts[1] != null) {
            uid = messageParts[1];
        }
        let name: string;
        let need;
        switch (messageType) {
            case "pong":
                clearTimeout(tm);

                break;
            case "voted":
                setTimeout(() => {

                    if (canVote) {
                        const voteValue = messageParts[2];
                        // update user's status to have voted and their vote number
                        users.forEach(user => {
                            if (user.getUID() === uid) {
                                user.setPoints(parseInt(voteValue));
                            }
                        });
                        voted();
                    }
                }, 750)

                break;
            case "addUser":
                addUser(messageParts, socket);
                let add =setTimeout(() => {
                    refreshClients();
                }, 1000)
                break
            case "close":
                removeUser(uid);
                clearTimeout(tm);
                clearInterval(pong);
                socket.close();
                // refreshClients();
                break;
            case "connected":
                let user: User;
                addUser(messageParts, socket);
                users.forEach((currentUser: User) => {
                    socket.send(`add-user_${currentUser.getUID()}_${currentUser.getName()}`);
                    console.log(currentUser + " sent");
                    if (currentUser.getUID() === uid) {
                        user = currentUser;
                        clearInterval(pong);
                        pingPong(user);
                    }
                })
                break;
            default:
                break;
        }
    })
    // Create unique identifier to the client
    // construct connection message and return generated pid
    const message = `connected_${uid}`;

    // Send message to client through socket
    socket.send(message);
});



let storyCount = 0; app.use(express.json());
app.use("/", express.static(path.join(__dirname, "../../client/dist")));
app.use((inRequest: Request, inResponse: Response, inNext: NextFunction) => {
    inResponse.header("Access-Control-Allow-Origin", "*");
    inResponse.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    inResponse.header("Access-Control-Allow-Headers", "Origin, X-Requested-With.Content-Type,Accept");
    inNext();
});
app.get("/api/cards", async (inRequest: Request, inResponse: Response) => {
    inResponse.type("json");
    const cards: Card[] = await CardDataAccess.getDataAccess().getCards();
    inResponse.json(cards);
});

app.get("/api/storyQueue", async (inRequest: Request, inResponse: Response) => {
    inResponse.type("json");
    const stories: UserStory[] = await StoryDataAccess.getDataAccess().getStories();
    stories.forEach(story => { if (parseInt(story.id!) >= storyCount) storyCount = parseInt(story.id!) + 1 })
    inResponse.json(stories);
});
app.get("/api/estimations", async (inRequest: Request, inResponse: Response) => {
    inResponse.type("json");
    const stories: UserStory[] = await EstimatedStoryDataAccess.getDataAccess().getStories();
    stories.forEach(story => { if (parseInt(story.id!) >= storyCount) storyCount = parseInt(story.id!) + 1 })
    inResponse.json(stories);
})
app.post("/api/deleteStory", async (inRequest: Request, inResponse: Response) => {
    inResponse.type("json");
    const story: UserStory = inRequest.body;
    storyCount--;
    // for (let index = parseInt(story.id!)+1; index <= storyCount; index++) {
    //     StoryDataAccess.getDataAccess().updateID(index, index-1);
    //     console.log("here");

    // }
    StoryDataAccess.getDataAccess().removeID(parseInt(story.id!));
    const numberRemoved: number = await StoryDataAccess.getDataAccess().removeStory(story);

    refreshClients();
})
app.get("/02beb6f43de7e44d0a24.ttf", (inRequest: Request, inResponse: Response) => {
    inResponse.sendFile(path.join(__dirname, "../../../client/dist/02beb6f43de7e44d0a24.ttf"));
});
app.get("/favicon.ico", (inRequest: Request, inResponse: Response) => {
    inResponse.sendFile(path.join(__dirname, "../../../client/dist/favicon.ico"));
});
app.get("/main.js", (inRequest: Request, inResponse: Response) => {
    inResponse.sendFile(path.join(__dirname, "../../../client/dist/main.js"));
});
app.get("/*", (inRequest: Request, inResponse: Response) => {
    inResponse.sendFile(path.join(__dirname, "../../../client/dist/index.html"));
});

app.post("/api/storyQueue/", async (inRequest: Request, inResponse: Response) => {
    inResponse.type("json");
    const initStory: UserStory = inRequest.body;
    const story: UserStory = await StoryDataAccess.getDataAccess().addStory(new UserStory(initStory.name, initStory.description, storyCount + ""))
    storyCount++;
    refreshClients();
    inResponse.json(story);
});
app.post("/api/setStoryID", async (inRequest: Request, inResponse: Response) => {
    inResponse.type("json");
    const initID: number = inRequest.body[0];
    const newID: number = inRequest.body[1];
    const story: UserStory | undefined = StoryDataAccess.getDataAccess().updateID(initID, newID);
    refreshClients();
    inResponse.json(story);
});

app.listen(RESTfulPort, () => { console.log("Server at: http://localhost:" + RESTfulPort) });
